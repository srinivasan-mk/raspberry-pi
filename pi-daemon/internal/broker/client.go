package broker

import (
	"crypto/tls"
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"time"

	mqtt "github.com/eclipse/paho.mqtt.golang"
	"github.com/raspberry-pi-ecosystem/pi-daemon/internal/config"
	"github.com/raspberry-pi-ecosystem/pi-daemon/internal/models"
	"github.com/raspberry-pi-ecosystem/pi-daemon/internal/runner"
	"github.com/raspberry-pi-ecosystem/pi-daemon/internal/session"
)

type Client struct {
	client   mqtt.Client
	cfg      *config.Config
	runner   *runner.Runner
	sessions *session.SessionRegistry
}

func NewClient(cfg *config.Config, r *runner.Runner, s *session.SessionRegistry, lwtPayload []byte) (*Client, error) {
	c := &Client{
		cfg:      cfg,
		runner:   r,
		sessions: s,
	}

	protocol := "tcp"
	if cfg.Broker.UseTLS {
		protocol = "ssl"
	}
	brokerURI := fmt.Sprintf("%s://%s:%d", protocol, cfg.Broker.Host, cfg.Broker.Port)

	opts := mqtt.NewClientOptions().
		AddBroker(brokerURI).
		SetClientID(cfg.Broker.ClientID).
		SetUsername(cfg.Broker.Username).
		SetPassword(cfg.Broker.Password).
		SetAutoReconnect(true).
		SetConnectRetry(true).
		SetConnectRetryInterval(5 * time.Second).
		SetKeepAlive(30 * time.Second).
		SetPingTimeout(10 * time.Second).
		SetWill("pi/telemetry/health", string(lwtPayload), 1, false)

	if cfg.Broker.UseTLS {
		opts.SetTLSConfig(&tls.Config{
			InsecureSkipVerify: false,
		})
	}

	opts.SetOnConnectHandler(c.onConnect)
	opts.SetConnectionLostHandler(c.onConnectionLost)

	client := mqtt.NewClient(opts)
	c.client = client
	return c, nil
}

func (c *Client) Connect() error {
	log.Printf("[MQTT] Connecting to HiveMQ Cloud broker at %s:%d (TLS=%v)...",
		c.cfg.Broker.Host, c.cfg.Broker.Port, c.cfg.Broker.UseTLS)

	token := c.client.Connect()
	if token.Wait() && token.Error() != nil {
		return fmt.Errorf("MQTT connection failed: %w", token.Error())
	}
	log.Println("[MQTT] Successfully connected to HiveMQ Cloud!")
	return nil
}

func (c *Client) Disconnect() {
	if c.client.IsConnected() {
		c.client.Disconnect(250)
		log.Println("[MQTT] Disconnected from broker.")
	}
}

func (c *Client) onConnect(client mqtt.Client) {
	log.Println("[MQTT] Connection established/restored. Subscribing to topics...")

	// 1. Subscribe to all commands: `pi/commands/#`
	client.Subscribe("pi/commands/#", 1, c.handleCommandMessage)

	// 2. Subscribe to interactive responses: `pi/interactive/+/response`
	client.Subscribe("pi/interactive/+/response", 1, c.handleInteractiveResponse)
}

func (c *Client) onConnectionLost(client mqtt.Client, err error) {
	log.Printf("[MQTT] WARNING: Connection lost (%v). Auto-reconnecting in background...", err)
}

// handleCommandMessage routes incoming command to the on-demand runner
func (c *Client) handleCommandMessage(client mqtt.Client, msg mqtt.Message) {
	topic := msg.Topic()
	log.Printf("[MQTT] Received command on topic: %s", topic)

	var cmd models.CommandEnvelope
	if err := json.Unmarshal(msg.Payload(), &cmd); err != nil {
		log.Printf("[MQTT] ERROR: Failed to parse command JSON: %v", err)
		return
	}

	// Extract pluginId and action from topic if missing in body
	// Topic format: pi/commands/{pluginId}/{action}
	parts := strings.Split(topic, "/")
	if len(parts) >= 4 {
		if cmd.PluginId == "" {
			cmd.PluginId = parts[2]
		}
		if cmd.Action == "" {
			cmd.Action = parts[3]
		}
	}

	// Execute plugin asynchronously so MQTT loop is never blocked
	go func() {
		res := c.runner.Execute(&cmd)
		c.PublishResult(res)
	}()
}

// handleInteractiveResponse delivers OTP/confirmations to the waiting session
func (c *Client) handleInteractiveResponse(client mqtt.Client, msg mqtt.Message) {
	var resp models.InteractiveResponse
	if err := json.Unmarshal(msg.Payload(), &resp); err != nil {
		log.Printf("[MQTT] ERROR: Failed to parse interactive response JSON: %v", err)
		return
	}

	log.Printf("[MQTT] Received interactive response for session '%s'", resp.SessionId)
	if resolved := c.sessions.Resolve(resp); !resolved {
		log.Printf("[MQTT] Warning: No active session found for '%s' (may have expired)", resp.SessionId)
	}
}

// PublishResult publishes plugin execution outcome
func (c *Client) PublishResult(res *models.PluginResultEnvelope) {
	topic := fmt.Sprintf("pi/events/%s/result", res.PluginId)
	data, _ := json.Marshal(res)
	c.client.Publish(topic, 1, false, data)
	log.Printf("[MQTT] Published result for plugin '%s' (status=%s)", res.PluginId, res.Status)
}

// PublishPrompt publishes an interactive challenge (OTP required) to the bus
func (c *Client) PublishPrompt(prompt *models.InteractivePrompt) error {
	topic := fmt.Sprintf("pi/interactive/%s/prompt", prompt.SessionId)
	data, err := json.Marshal(prompt)
	if err != nil {
		return err
	}
	token := c.client.Publish(topic, 1, false, data)
	token.Wait()
	log.Printf("[MQTT] Published OTP prompt for session '%s'", prompt.SessionId)
	return token.Error()
}

// PublishTelemetry publishes periodic heartbeat
func (c *Client) PublishTelemetry(t *models.PiTelemetry) {
	topic := "pi/telemetry/health"
	data, _ := json.Marshal(t)
	c.client.Publish(topic, 0, false, data)
}
