# Cross-Cutting Structured Logging Specification

## 1. Principles
- **JSON Standard**: All services, daemons, and plugins should emit structured JSON lines (`jsonl`) or clean key-value logfmt to stdout/stderr.
- **Journald Forwarding**: `systemd` captures stdout/stderr, handles timestamps, and buffers in volatile RAM.
- **MicroSD Protection**: Logs write to RAM disk (`/var/log` via `log2ram`), flushing to physical storage only once every 24 hours.

## 2. Standard JSON Log Envelope

```json
{
  "timestamp": "2026-11-21T15:30:00.123Z",
  "level": "INFO",
  "component": "pi-daemon",
  "subsystem": "runner",
  "message": "Plugin execution completed successfully",
  "correlationId": "corr_01HXYZ987654321",
  "durationMs": 450,
  "metadata": {
    "pluginId": "web-scraper",
    "exitCode": 0
  }
}
```

## 3. Log Levels
- `DEBUG`: Detailed diagnostic information (disabled in production).
- `INFO`: Normal operational milestones (service start, command received, plugin exit).
- `WARN`: Recoverable anomalies (temporary MQTT reconnect backoff, retrying DNS).
- `ERROR`: Unrecoverable errors for a specific request/command (action failure, invalid OTP).
- `FATAL`: Process-terminating events (configuration file missing, port bind failure).
