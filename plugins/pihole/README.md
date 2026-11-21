# Pi-hole Bridge Plugin for Raspberry Pi Orchestrator

The **Pi-hole Bridge Plugin** connects your local Pi-hole installation to the Raspberry Pi MQTT cloud message bus, enabling real-time telemetry observation and remote control from the Mobile & Web dashboard.

## Features
- **Zero Idle Memory**: Runs on-demand upon incoming MQTT command and terminates immediately (0 MB RAM overhead).
- **DNS Metrics Query**: Returns queries blocked, block percentage, total queries, and gravity list counts.
- **Remote Blocking Control**: Temporarily or permanently disable/enable DNS ad-blocking.
- **On-Demand Gravity Sync**: Triggers `pihole -g` or `pihole-updatelists` via cloud command.

## Supported MQTT Commands
| Topic | Action | Description |
| :--- | :--- | :--- |
| `pi/commands/pihole/status` | `status` | Returns live DNS health, blocked queries count, and percentage. |
| `pi/commands/pihole/disable` | `disable` | Disables blocking (supports optional `{"durationSeconds": 300}`). |
| `pi/commands/pihole/enable` | `enable` | Resumes DNS ad-blocking. |
| `pi/commands/pihole/update-gravity` | `update-gravity` | Triggers gravity database rebuild. |

## Result Topic
Results are published to:
`pi/events/pihole/result`
