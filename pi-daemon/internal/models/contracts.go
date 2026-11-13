package models

// CommandEnvelope represents a message received on `pi/commands/{plugin_id}/{action}`
type CommandEnvelope struct {
	MessageId      string                 `json:"messageId"`
	CorrelationId  string                 `json:"correlationId,omitempty"`
	Timestamp      int64                  `json:"timestamp"`
	PluginId       string                 `json:"pluginId"`
	Action         string                 `json:"action"`
	TimeoutSeconds int                    `json:"timeoutSeconds,omitempty"`
	Payload        map[string]interface{} `json:"payload"`
}

// InteractivePrompt represents a challenge issued by a plugin (e.g., OTP needed)
type InteractivePrompt struct {
	SessionId      string `json:"sessionId"`
	CorrelationId  string `json:"correlationId,omitempty"`
	PluginId       string `json:"pluginId"`
	PromptType     string `json:"promptType"` // "OTP", "CONFIRMATION", "INPUT"
	Message        string `json:"message"`
	TimeoutSeconds int    `json:"timeoutSeconds"`
	Timestamp      int64  `json:"timestamp"`
}

// InteractiveResponse represents the user's resolution to an interactive prompt
type InteractiveResponse struct {
	SessionId     string                 `json:"sessionId"`
	CorrelationId string                 `json:"correlationId,omitempty"`
	Response      InteractiveResponseBody `json:"response"`
	Timestamp     int64                  `json:"timestamp"`
}

type InteractiveResponseBody struct {
	Code      string                 `json:"code"`
	Confirmed bool                   `json:"confirmed,omitempty"`
	Extra     map[string]interface{} `json:"extra,omitempty"`
}

// PluginResultEnvelope represents the output published to `pi/events/{plugin_id}/result`
type PluginResultEnvelope struct {
	MessageId     string                 `json:"messageId"`
	CorrelationId string                 `json:"correlationId,omitempty"`
	PluginId      string                 `json:"pluginId"`
	Action        string                 `json:"action"`
	Status        string                 `json:"status"` // "SUCCESS", "FAILED", "TIMEOUT"
	DurationMs    int64                  `json:"durationMs,omitempty"`
	Data          map[string]interface{} `json:"data,omitempty"`
	Error         *PluginError           `json:"error,omitempty"`
	Timestamp     int64                  `json:"timestamp"`
}

type PluginError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Details string `json:"details,omitempty"`
}

// PiTelemetry represents periodic telemetry published to `pi/telemetry/health`
type PiTelemetry struct {
	DeviceId        string      `json:"deviceId"`
	Hostname        string      `json:"hostname"`
	Status          string      `json:"status"` // "ONLINE", "OFFLINE"
	UptimeSeconds   int64       `json:"uptimeSeconds"`
	CpuTempCelsius  float64     `json:"cpuTempCelsius"`
	CpuUsagePercent float64     `json:"cpuUsagePercent"`
	Memory          MemoryStats `json:"memory"`
	ActivePlugins   []string    `json:"activePlugins"`
	Timestamp       int64       `json:"timestamp"`
}

type MemoryStats struct {
	TotalMb      int     `json:"totalMb"`
	UsedMb       int     `json:"usedMb"`
	FreeMb       int     `json:"freeMb"`
	UsagePercent float64 `json:"usagePercent"`
}
