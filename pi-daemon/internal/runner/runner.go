package runner

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"os/exec"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/raspberry-pi-ecosystem/pi-daemon/internal/config"
	"github.com/raspberry-pi-ecosystem/pi-daemon/internal/models"
	"github.com/raspberry-pi-ecosystem/pi-daemon/internal/session"
)

type Runner struct {
	plugins  map[string]config.PluginConfig
	sessions *session.SessionRegistry
	publishPromptFunc func(prompt *models.InteractivePrompt) error
}

func NewRunner(plugins map[string]config.PluginConfig, sessions *session.SessionRegistry, publishPrompt func(prompt *models.InteractivePrompt) error) *Runner {
	return &Runner{
		plugins:           plugins,
		sessions:          sessions,
		publishPromptFunc: publishPrompt,
	}
}

// Execute runs the requested plugin on-demand, handling lifecycle, timeouts, and interactive challenges
func (r *Runner) Execute(cmd *models.CommandEnvelope) *models.PluginResultEnvelope {
	startTime := time.Now()
	res := &models.PluginResultEnvelope{
		MessageId:     "res_" + uuid.New().String(),
		CorrelationId: cmd.CorrelationId,
		PluginId:      cmd.PluginId,
		Action:        cmd.Action,
		Timestamp:     time.Now().Unix(),
	}

	pCfg, exists := r.plugins[cmd.PluginId]
	if !exists {
		res.Status = "FAILED"
		res.Error = &models.PluginError{
			Code:    "PLUGIN_NOT_FOUND",
			Message: fmt.Sprintf("plugin '%s' is not installed", cmd.PluginId),
		}
		return res
	}

	if !pCfg.Enabled {
		res.Status = "FAILED"
		res.Error = &models.PluginError{
			Code:    "PLUGIN_DISABLED",
			Message: fmt.Sprintf("plugin '%s' is currently disabled", cmd.PluginId),
		}
		return res
	}

	timeoutSec := cmd.TimeoutSeconds
	if timeoutSec <= 0 {
		timeoutSec = pCfg.TimeoutSec
	}
	if timeoutSec <= 0 {
		timeoutSec = 120
	}

	ctx, cancel := context.WithTimeout(context.Background(), time.Duration(timeoutSec)*time.Second)
	defer cancel()

	var execCmd *exec.Cmd
	if pCfg.Mode == "docker" {
		// Ephemeral container: docker run --rm -i ...
		args := []string{"run", "--rm", "-i"}
		for k, v := range pCfg.Env {
			args = append(args, "-e", fmt.Sprintf("%s=%s", k, v))
		}
		args = append(args, pCfg.Image)
		args = append(args, pCfg.Args...)
		execCmd = exec.CommandContext(ctx, "docker", args...)
	} else {
		// Direct process execution (e.g. python3 script.py)
		allArgs := append([]string{}, pCfg.Args...)
		parts := strings.Fields(pCfg.Command)
		if len(parts) == 0 {
			res.Status = "FAILED"
			res.Error = &models.PluginError{
				Code:    "INVALID_COMMAND",
				Message: "plugin command is empty",
			}
			return res
		}
		binary := parts[0]
		if len(parts) > 1 {
			allArgs = append(parts[1:], allArgs...)
		}
		execCmd = exec.CommandContext(ctx, binary, allArgs...)
	}

	if pCfg.WorkDir != "" {
		execCmd.Dir = pCfg.WorkDir
	}

	// Prepare standard IO pipes
	stdinPipe, err := execCmd.StdinPipe()
	if err != nil {
		res.Status = "FAILED"
		res.Error = &models.PluginError{
			Code:    "PIPE_ERROR",
			Message: err.Error(),
		}
		return res
	}

	var stdoutBuf, stderrBuf bytes.Buffer
	execCmd.Stdout = &stdoutBuf
	execCmd.Stderr = &stderrBuf

	log.Printf("[Runner] Launching on-demand plugin '%s' (mode=%s)...", cmd.PluginId, pCfg.Mode)
	if err := execCmd.Start(); err != nil {
		res.Status = "FAILED"
		res.Error = &models.PluginError{
			Code:    "START_FAILED",
			Message: fmt.Sprintf("failed to start plugin process: %v", err),
		}
		return res
	}

	// Serialize and write command envelope to plugin's stdin
	inputData, _ := json.Marshal(cmd)
	go func() {
		defer stdinPipe.Close()
		_, _ = stdinPipe.Write(inputData)
		_, _ = stdinPipe.Write([]byte("\n"))
	}()

	// Wait for completion or context timeout
	done := make(chan error, 1)
	go func() {
		done <- execCmd.Wait()
	}()

	select {
	case <-ctx.Done():
		res.Status = "TIMEOUT"
		res.DurationMs = time.Since(startTime).Milliseconds()
		res.Error = &models.PluginError{
			Code:    "EXECUTION_TIMEOUT",
			Message: fmt.Sprintf("plugin execution exceeded timeout of %ds", timeoutSec),
			Details: stderrBuf.String(),
		}
		return res

	case err := <-done:
		res.DurationMs = time.Since(startTime).Milliseconds()
		if err != nil {
			res.Status = "FAILED"
			res.Error = &models.PluginError{
				Code:    "PROCESS_EXIT_ERROR",
				Message: err.Error(),
				Details: stderrBuf.String(),
			}
			return res
		}
	}

	// Parse JSON output from stdout
	outputBytes := stdoutBuf.Bytes()
	var rawOutput map[string]interface{}
	if err := json.Unmarshal(outputBytes, &rawOutput); err == nil {
		res.Status = "SUCCESS"
		res.Data = rawOutput
	} else {
		// Output is plain text or partial
		res.Status = "SUCCESS"
		res.Data = map[string]interface{}{
			"rawOutput": strings.TrimSpace(stdoutBuf.String()),
		}
	}

	log.Printf("[Runner] Plugin '%s' completed successfully in %dms. Memory released.", cmd.PluginId, res.DurationMs)
	return res
}

// RelayOtpChallenge is called when a plugin requests an interactive OTP challenge
func (r *Runner) HandleInteractiveChallenge(prompt *models.InteractivePrompt, stdin io.Writer) error {
	if r.publishPromptFunc == nil {
		return errors.New("no prompt publisher configured")
	}

	// Publish prompt to HiveMQ Cloud so mobile app/Telegram sees it
	if err := r.publishPromptFunc(prompt); err != nil {
		return fmt.Errorf("failed to publish OTP prompt to broker: %w", err)
	}

	// Register in session registry and wait for response
	timeout := time.Duration(prompt.TimeoutSeconds) * time.Second
	respChan, err := r.sessions.Register(prompt.SessionId, timeout)
	if err != nil {
		return fmt.Errorf("failed to register session: %w", err)
	}

	select {
	case resp, ok := <-respChan:
		if !ok {
			return errors.New("interactive session timed out waiting for user response")
		}
		// Write the code to the plugin's stdin so Playwright can resume
		_, err := stdin.Write([]byte(resp.Response.Code + "\n"))
		return err
	case <-time.After(timeout):
		return errors.New("timed out waiting for OTP response")
	}
}
