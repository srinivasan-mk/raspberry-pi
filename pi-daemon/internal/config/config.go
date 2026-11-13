package config

import (
	"fmt"
	"os"
	"time"

	"gopkg.in/yaml.v3"
)

type Config struct {
	Broker  BrokerConfig            `yaml:"broker"`
	Pi      PiConfig                `yaml:"pi"`
	Plugins map[string]PluginConfig `yaml:"plugins"`
}

type BrokerConfig struct {
	Host     string `yaml:"host"`
	Port     int    `yaml:"port"`
	Username string `yaml:"username"`
	Password string `yaml:"password"`
	ClientID string `yaml:"client_id"`
	UseTLS   bool   `yaml:"use_tls"`
}

type PiConfig struct {
	DeviceID             string        `yaml:"device_id"`
	TelemetryIntervalSec time.Duration `yaml:"telemetry_interval_sec"`
}

type PluginConfig struct {
	Enabled    bool              `yaml:"enabled"`
	Mode       string            `yaml:"mode"` // "exec" or "docker"
	Command    string            `yaml:"command,omitempty"`
	Args       []string          `yaml:"args,omitempty"`
	Image      string            `yaml:"image,omitempty"`
	TimeoutSec int               `yaml:"timeout_sec"`
	WorkDir    string            `yaml:"work_dir,omitempty"`
	Env        map[string]string `yaml:"env,omitempty"`
}

func LoadConfig(path string) (*Config, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("failed to read config file %s: %w", path, err)
	}

	var cfg Config
	if err := yaml.Unmarshal(data, &cfg); err != nil {
		return nil, fmt.Errorf("failed to parse yaml config: %w", err)
	}

	// Environment variable overrides
	if host := os.Getenv("HIVEMQ_HOST"); host != "" {
		cfg.Broker.Host = host
	}
	if user := os.Getenv("HIVEMQ_USER"); user != "" {
		cfg.Broker.Username = user
	}
	if pass := os.Getenv("HIVEMQ_PASSWORD"); pass != "" {
		cfg.Broker.Password = pass
	}
	if devID := os.Getenv("PI_DEVICE_ID"); devID != "" {
		cfg.Pi.DeviceID = devID
	}

	// Defaults
	if cfg.Broker.Port == 0 {
		cfg.Broker.Port = 8883
	}
	if cfg.Broker.ClientID == "" {
		cfg.Broker.ClientID = "pi-4b-daemon"
	}
	if cfg.Pi.TelemetryIntervalSec == 0 {
		cfg.Pi.TelemetryIntervalSec = 30
	}
	if cfg.Pi.DeviceID == "" {
		hostname, _ := os.Hostname()
		cfg.Pi.DeviceID = "rpi-" + hostname
	}

	return &cfg, nil
}
