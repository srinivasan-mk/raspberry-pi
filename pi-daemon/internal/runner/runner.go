package runner

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"os/exec"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/raspberry-pi-ecosystem/pi-daemon/internal/config"
	"github.com/raspberry-pi-ecosystem/pi-daemon/internal/models"
	"github.com/raspberry-pi-ecosystem/pi-daemon/internal/session"
)

type Runner struct {
	plugins           map[string]config.PluginConfig
	sessions          *session.SessionRegistry
	publishPromptFunc func(prompt *models.InteractivePrompt) error
}

func NewRunner(plugins map[string]config.PluginConfig, sessions *session.SessionRegistry, publishPrompt func(prompt *models.InteractivePrompt) error) *Runner {
	return &Runner{
		plugins:           plugins,
		sessions:          sessions,
		publishPromptFunc: publishPrompt,
	}
}

// PromptMessageLine is emitted on stdout by a plugin when it requires interactive user input
type PromptMessageLine struct {
	Type           string `json:"type"` // "INTERACTIVE_PROMPT"
	SessionId      string `json:"sessionId"`
	PromptType     string `json:"promptType"`
	Message        string `json:"message"`
	TimeoutSeconds int    `json:"timeoutSeconds"`
}

// Execute runs the requested plugin on-demand, handling lifecycle, streaming stdout, and interactive challenges
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

	stdoutPipe, err := execCmd.StdoutPipe()
	if err != nil {
		stdinPipe.Close()
		res.Status = "FAILED"
		res.Error = &models.PluginError{
			Code:    "PIPE_ERROR",
			Message: err.Error(),
		}
		return res
	}

	var stderrBuf bytes.Buffer
	execCmd.Stderr = &stderrBuf

	log.Printf("[Runner] Launching on-demand plugin '%s' (mode=%s)...", cmd.PluginId, pCfg.Mode)
	if err := execCmd.Start(); err != nil {
		stdinPipe.Close()
		res.Status = "FAILED"
		res.Error = &models.PluginError{
			Code:    "START_FAILED",
			Message: fmt.Sprintf("failed to start plugin process: %v", err),
		}
		return res
	}

	// Send initial command envelope to plugin's stdin
	inputData, _ := json.Marshal(cmd)
	if _, err := stdinPipe.Write(append(inputData, '\n')); err != nil {
		log.Printf("[Runner] Warning: writing command to plugin stdin failed: %v", err)
	}

	// Safe concurrent writer for stdin (for subsequent interactive responses)
	var stdinMu sync.Mutex
	writeToStdin := func(data []byte) error {
		stdinMu.Lock()
		defer stdinMu.Unlock()
		_, err := stdinPipe.Write(data)
		return err
	}

	// Scan stdout line by line to intercept interactive prompts and capture output
	var outputLines []string
	var wg sync.WaitGroup
	wg.Add(1)

	go func() {
		defer wg.Done()
		scanner := bufio.NewScanner(stdoutPipe)
		for scanner.Scan() {
			line := scanner.Text()
			trimmed := strings.TrimSpace(line)
			if trimmed == "" {
				continue
			}

			// Check if line is an INTERACTIVE_PROMPT
			var promptLine PromptMessageLine
			if err := json.Unmarshal([]byte(trimmed), &promptLine); err == nil && promptLine.Type == "INTERACTIVE_PROMPT" {
				log.Printf("[Runner] Plugin '%s' requested interactive challenge (session=%s, type=%s)",
					cmd.PluginId, promptLine.SessionId, promptLine.PromptType)

				prompt := &models.InteractivePrompt{
					SessionId:      promptLine.SessionId,
					CorrelationId:  cmd.CorrelationId,
					PluginId:       cmd.PluginId,
					PromptType:     promptLine.PromptType,
					Message:        promptLine.Message,
					TimeoutSeconds: promptLine.TimeoutSeconds,
					Timestamp:      time.Now().Unix(),
				}

				// Handle challenge asynchronously so scanner keeps reading
				go func(p *models.InteractivePrompt) {
					if err := r.HandleInteractiveChallenge(p, writeToStdin); err != nil {
						log.Printf("[Runner] Interactive challenge error: %v", err)
					}
				}(prompt)
				continue
			}

			// Normal output line
			outputLines = append(outputLines, line)
		}
	}()

	// Wait for completion or context timeout
	done := make(chan error, 1)
	go func() {
		wg.Wait()
		stdinPipe.Close()
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

	// Parse final output (inspect lines in reverse to find the JSON result payload)
	var finalData map[string]interface{}
	foundJson := false
	for i := len(outputLines) - 1; i >= 0; i-- {
		line := strings.TrimSpace(outputLines[i])
		if strings.HasPrefix(line, "{") && strings.HasSuffix(line, "}") {
			if err := json.Unmarshal([]byte(line), &finalData); err == nil {
				foundJson = true
				break
			}
		}
	}

	if foundJson {
		res.Status = "SUCCESS"
		res.Data = finalData
	} else {
		res.Status = "SUCCESS"
		res.Data = map[string]interface{}{
			"rawOutput": strings.Join(outputLines, "\n"),
		}
	}

	log.Printf("[Runner] Plugin '%s' completed successfully in %dms. Memory released.", cmd.PluginId, res.DurationMs)
	return res
}

// HandleInteractiveChallenge publishes challenge to HiveMQ and delivers user response to child stdin
func (r *Runner) HandleInteractiveChallenge(prompt *models.InteractivePrompt, writeStdin func([]byte) error) error {
	if r.publishPromptFunc == nil {
		return errors.New("no prompt publisher configured")
	}

	// Publish prompt to HiveMQ Cloud so mobile app/Telegram sees it
	if err := r.publishPromptFunc(prompt); err != nil {
		return fmt.Errorf("failed to publish OTP prompt to broker: %w", err)
	}

	// Register in session registry and wait for response
	timeoutSec := prompt.TimeoutSeconds
	if timeoutSec <= 0 {
		timeoutSec = 120
	}
	timeout := time.Duration(timeoutSec) * time.Second

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
		log.Printf("[Runner] Delivering user response for session '%s' to plugin stdin", prompt.SessionId)
		respJson, _ := json.Marshal(resp.Response)
		return writeStdin(append(respJson, '\n'))

	case <-time.After(timeout):
		return errors.New("timed out waiting for OTP response")
	}
}
