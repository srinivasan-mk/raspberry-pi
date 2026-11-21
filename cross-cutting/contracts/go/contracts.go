package contracts

// CommandEnvelope represents a standard MQTT command sent from Client to Pi
type CommandEnvelope struct {
	MessageID      string                 `json:"messageId"`
	CorrelationID  string                 `json:"correlationId,omitempty"`
	Timestamp      int64                  `json:"timestamp"`
	PluginID       string                 `json:"pluginId"`
	Action         string                 `json:"action"`
	TimeoutSeconds int                    `json:"timeoutSeconds,omitempty"`
	Payload        map[string]interface{} `json:"payload"`
}

// PluginResultEnvelope represents a completed command result sent from Pi to Client
type PluginResultEnvelope struct {
	MessageID     string                 `json:"messageId"`
	CorrelationID string                 `json:"correlationId,omitempty"`
	PluginID      string                 `json:"pluginId"`
	Action        string                 `json:"action"`
	Status        string                 `json:"status"` // SUCCESS, FAILED, TIMEOUT, CANCELLED
	DurationMs    int64                  `json:"durationMs,omitempty"`
	Data          map[string]interface{} `json:"data,omitempty"`
	Error         *PluginError           `json:"error,omitempty"`
	Timestamp     int64                  `json:"timestamp"`
}

// PluginError details an error encounter
type PluginError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Details string `json:"details,omitempty"`
}

// InteractivePrompt represents an on-the-fly challenge (e.g. OTP)
type InteractivePrompt struct {
	SessionID      string `json:"sessionId"`
	CorrelationID  string `json:"correlationId,omitempty"`
	PluginID       string `json:"pluginId"`
	PromptType     string `json:"promptType"` // OTP, CONFIRMATION, INPUT, CAPTCHA
	Message        string `json:"message"`
	TimeoutSeconds int    `json:"timeoutSeconds"`
	Timestamp      int64  `json:"timestamp"`
}

// InteractiveResponse represents the client reply resolving a challenge
type InteractiveResponse struct {
	SessionID     string                 `json:"sessionId"`
	CorrelationID string                 `json:"correlationId,omitempty"`
	Response      map[string]interface{} `json:"response"`
	Timestamp     int64                  `json:"timestamp"`
}

// MemoryStats models physical RAM status
type MemoryStats struct {
	TotalMb      int     `json:"totalMb"`
	UsedMb       int     `json:"usedMb"`
	FreeMb       int     `json:"freeMb"`
	UsagePercent float64 `json:"usagePercent"`
}

// PiTelemetry represents the periodic heartbeat sent to clients
type PiTelemetry struct {
	DeviceId        string      `json:"deviceId"`
	Hostname        string      `json:"hostname"`
	Status          string      `json:"status"` // ONLINE, OFFLINE, DEGRADED
	UptimeSeconds   int64       `json:"uptimeSeconds,omitempty"`
	CpuTempCelsius  float64     `json:"cpuTempCelsius,omitempty"`
	CpuUsagePercent float64     `json:"cpuUsagePercent,omitempty"`
	ThrottleState   string      `json:"throttleState,omitempty"`
	Memory          MemoryStats `json:"memory"`
	ActivePlugins   []string    `json:"activePlugins,omitempty"`
	Timestamp       int64       `json:"timestamp"`
}

// PiholeStatus models the DNS metrics exposed by Pi-hole
type PiholeStatus struct {
	Status           string  `json:"status"` // enabled, disabled
	DomainsBeingBlocked int64   `json:"domainsBeingBlocked"`
	DnsQueriesToday  int64   `json:"dnsQueriesToday"`
	AdsBlockedToday  int64   `json:"adsBlockedToday"`
	AdsPercentageToday float64 `json:"adsPercentageToday"`
	UniqueClients    int     `json:"uniqueClients"`
	Timestamp        int64   `json:"timestamp"`
}
