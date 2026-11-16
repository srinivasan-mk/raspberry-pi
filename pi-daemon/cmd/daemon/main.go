package main

import (
	"flag"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/raspberry-pi-ecosystem/pi-daemon/internal/broker"
	"github.com/raspberry-pi-ecosystem/pi-daemon/internal/config"
	"github.com/raspberry-pi-ecosystem/pi-daemon/internal/models"
	"github.com/raspberry-pi-ecosystem/pi-daemon/internal/runner"
	"github.com/raspberry-pi-ecosystem/pi-daemon/internal/session"
	"github.com/raspberry-pi-ecosystem/pi-daemon/internal/telemetry"
)

func main() {
	configPath := flag.String("config", "config.yaml", "Path to daemon YAML config file")
	flag.Parse()

	log.Println("==================================================")
	log.Println(" Starting Raspberry Pi 4B Orchestrator Daemon     ")
	log.Println("==================================================")

	// 1. Load configuration
	cfg, err := config.LoadConfig(*configPath)
	if err != nil {
		log.Fatalf("Fatal: Configuration error: %v", err)
	}

	// 2. Initialize Telemetry Collector & LWT
	collector := telemetry.NewCollector(cfg.Pi.DeviceID)
	lwtPayload := collector.BuildOfflineLWT()

	// 3. Initialize Interactive Session Registry
	sessions := session.NewSessionRegistry()

	// 4. Initialize Broker client holder
	var mqttClient *broker.Client

	// 5. Initialize Plugin Runner
	pluginRunner := runner.NewRunner(
		cfg.Plugins,
		sessions,
		func(prompt *models.InteractivePrompt) error {
			if mqttClient != nil {
				return mqttClient.PublishPrompt(prompt)
			}
			return nil
		},
	)

	// 6. Connect to MQTT Broker
	mqttClient, err = broker.NewClient(cfg, pluginRunner, sessions, lwtPayload)
	if err != nil {
		log.Fatalf("Fatal: Failed to initialize MQTT client: %v", err)
	}

	if err := mqttClient.Connect(); err != nil {
		log.Printf("Warning: Initial connection failed (%v). Will keep retrying in background...", err)
	}
	defer mqttClient.Disconnect()

	// 7. Start Telemetry Heartbeat Ticker
	ticker := time.NewTicker(time.Duration(cfg.Pi.TelemetryIntervalSec) * time.Second)
	defer ticker.Stop()

	stopChan := make(chan os.Signal, 1)
	signal.Notify(stopChan, os.Interrupt, syscall.SIGTERM)

	// List enabled plugins
	var enabledList []string
	for id, p := range cfg.Plugins {
		if p.Enabled {
			enabledList = append(enabledList, id)
		}
	}
	log.Printf("[Daemon] Active plugins (%d): %v", len(enabledList), enabledList)

	// 8. Main Event Loop
	go func() {
		// Send initial online heartbeat immediately
		t := collector.Collect(enabledList)
		mqttClient.PublishTelemetry(t)

		for range ticker.C {
			t := collector.Collect(enabledList)
			mqttClient.PublishTelemetry(t)
		}
	}()

	log.Println("[Daemon] Orchestrator is ready and listening for cloud commands...")

	// Block until termination signal
	<-stopChan
	log.Println("[Daemon] Shutting down gracefully...")
}
