# Cross-Cutting Telemetry Specification

## 1. Overview
The telemetry cross-cutting concern provides unified hardware, operating system, and container health observation across the entire Raspberry Pi edge cluster.

## 2. Topic Schema
- **MQTT Topic**: `pi/telemetry/health`
- **QoS**: `1` (At least once)
- **Retained**: `true` (The broker retains the last known health state for immediate delivery to new clients)

## 3. Metrics Dictionary

| Field | Type | Description | Sample Value |
| :--- | :--- | :--- | :--- |
| `deviceId` | string | Unique host identifier | `"raspberrypi-4b-home"` |
| `hostname` | string | System hostname | `"rpi4b-edge"` |
| `status` | enum | Host reachability state | `"ONLINE" \| "OFFLINE" \| "DEGRADED"` |
| `uptimeSeconds` | int64 | Uptime in seconds | `28490` |
| `cpuTempCelsius` | float | SoC thermal sensor reading | `43.5` |
| `throttleState` | string | Raw `vcgencmd get_throttled` bitmask | `"throttled=0x0"` |
| `memory.totalMb` | int | Total physical RAM | `3896` |
| `memory.usedMb` | int | Active used RAM | `480` |
| `memory.freeMb` | int | Available RAM | `3416` |
| `memory.usagePercent`| float | Memory utilization percentage | `12.3` |
| `activePlugins` | array | List of currently enabled plugins | `["web-scraper", "messaging", "pihole"]` |
| `timestamp` | int64 | Epoch timestamp in seconds | `1731517200` |

## 4. Under-Voltage / Throttle Bitmask Reference
- `0x1`: Under-voltage detected currently
- `0x2`: Arm frequency capped currently
- `0x4`: Currently throttled
- `0x8`: Soft temperature limit reached currently
- `0x10000`: Under-voltage has occurred since boot
- `0x20000`: Arm frequency capping has occurred since boot
- `0x40000`: Throttling has occurred since boot
- `0x80000`: Soft temperature limit has occurred since boot
