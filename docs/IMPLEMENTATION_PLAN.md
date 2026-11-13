# Raspberry Pi 4B Modular Service Bus Ecosystem - Final Architecture Plan

## Goal Description
Build an end-to-end, resource-optimized, polyglot edge-cloud automation system running on a **Raspberry Pi 4B (4GB RAM) with Raspbian Lite**.
The system connects to **HiveMQ Cloud (MQTT)**, consumes commands via an ultra-lightweight **Go orchestrator daemon (~6 MB RAM)**, executes **on-demand utility plugins** (exiting immediately to maintain 0 MB idle RAM), supports **interactive OTP web automation (Playwright)**, multi-channel messaging (Telegram, free WhatsApp via Baileys, free SMS via Android Gateway), and is controlled by a unified **React Native (Expo) Mobile & Web application** (with API contracts structured so a **Flutter** client can be plugged in later).

---

## User Review Required

> [!IMPORTANT]
> **Tech Stack Decisions Confirmed**:
> * **Pi Orchestrator Daemon**: **Go (Golang)** standalone binary (~6 MB RAM, 0% idle CPU, zero runtime dependencies on Raspbian Lite).
> * **Plugin Execution Model**: On-demand / ephemeral execution (Docker `--rm` or isolated sub-processes). Plugins consume **0 MB RAM when idle**.
> * **Mobile & Web UI**: **React Native with Expo** (Single TypeScript codebase for Android APK, iOS, and Web dashboard).
> * **Future Flutter Support**: Contracts and MQTT topic schemas are strictly decoupled and standard JSON, allowing a Flutter client to be added at any time.
> * **Cloud Service Bus**: **HiveMQ Cloud** (Free tier, MQTT over TLS on port 8883, WebSockets on port 8884).
> * **Web Automation**: Generic **Playwright** with state-holding **Interactive OTP Flow** via MQTT/Telegram.
> * **Zero-Cost Messaging**: Telegram Bot API + WhatsApp Web (Baileys) + Android SMS Gateway.

---

## System Architecture

```mermaid
flowchart TD
    subgraph UI_Layer["Client Applications"]
        RN_App["React Native (Expo Mobile App - Android / iOS)"]
        RN_Web["React Native (Expo Web Dashboard)"]
        Flutter_Future["Flutter Client (Future Add-on)"]
    end

    subgraph Cloud_Layer["Cloud Message Bus"]
        HiveMQ["HiveMQ Cloud Broker (Free Tier)\n• MQTTS (Port 8883 - TLS)\n• WSS (Port 8884 - WebSockets)"]
        Gateway["Optional Lightweight API Gateway (Token Auth & Bridge)"]
    end

    subgraph Pi_Layer["Raspberry Pi 4B (Raspbian Lite)"]
        GoDaemon["Go Orchestrator Daemon (~6 MB RAM)\n• 24/7 HiveMQ Client (Paho Go)\n• Plugin Lifecycle Manager\n• Interactive OTP Session Manager\n• System Health & Telemetry"]

        subgraph Plugins["Polyglot On-Demand Plugins (0 MB RAM Idle)"]
            Scraper["Web Automation Plugin (Playwright Python/Node)\n• Headless Browser Navigation\n• Dynamic Data Extraction\n• OTP Challenge Detection"]
            Messenger["Multi-Channel Messaging Plugin\n• Telegram Bot API\n• Free WhatsApp (Baileys)\n• Free SMS (Android Gateway / GSM)"]
            CustomPlugin["Future Plugins (Go / C# / Python / Node)"]
        end
    end

    RN_App <-->|WSS / TLS| HiveMQ
    RN_Web <-->|WSS / TLS| HiveMQ
    Flutter_Future -.->|WSS / TLS| HiveMQ
    RN_App -->|HTTPS| Gateway
    Gateway -->|Publish| HiveMQ

    HiveMQ <-->|MQTTS (TLS 8883)| GoDaemon

    GoDaemon -->|Spawn on Demand (`docker run --rm` or exec)| Scraper
    GoDaemon -->|Spawn on Demand (`docker run --rm` or exec)| Messenger
    GoDaemon -->|Spawn on Demand| CustomPlugin

    Scraper -.->|1. Trigger OTP Needed| GoDaemon
    GoDaemon -.->|2. Publish OTP Prompt| HiveMQ
    HiveMQ -.->|3. Push Notification / Prompt| RN_App
    RN_App -.->|4. Submit 6-digit OTP| HiveMQ
    HiveMQ -.->|5. Deliver OTP to Daemon| GoDaemon
    GoDaemon -.->|6. Resume Browser Session| Scraper
```

---

## Data Models & MQTT Contracts (Shared Across Go, TypeScript, & Flutter)

### 1. Topic Hierarchy
| Topic Pattern | Direction | Description |
| :--- | :--- | :--- |
| `pi/commands/{plugin_id}/{action}` | Client ➔ Pi | Trigger a plugin action (e.g. `pi/commands/web-scraper/fetch-usage`) |
| `pi/events/{plugin_id}/status` | Pi ➔ Client | Plugin status update (`queued`, `running`, `completed`, `failed`) |
| `pi/events/{plugin_id}/result` | Pi ➔ Client | Final output payload returned by the plugin |
| `pi/interactive/{session_id}/prompt` | Pi ➔ Client | Interactive challenge prompt (e.g., OTP required) |
| `pi/interactive/{session_id}/response` | Client ➔ Pi | User response delivering the challenge resolution (e.g., OTP code) |
| `pi/telemetry/health` | Pi ➔ Client | Periodic heartbeat (CPU temp, RAM free, disk usage, active plugins) |
| `pi/admin/plugins` | Client ➔ Pi | Enable/disable plugins or query plugin status |

---

### 2. Standard JSON Schemas

#### A. Command Envelope (`pi/commands/{plugin_id}/{action}`)
```json
{
  "messageId": "msg_01HXYZ123456789",
  "correlationId": "corr_01HXYZ987654321",
  "timestamp": 1731517200,
  "pluginId": "web-scraper",
  "action": "fetch-usage",
  "timeoutSeconds": 180,
  "payload": {
    "target": "jio-airfiber",
    "credentials": {
      "mobileNumber": "9876543210"
    },
    "options": {
      "extract": ["data_balance", "validity", "plan_name"]
    }
  }
}
```

#### B. Interactive OTP Challenge Envelope (`pi/interactive/{session_id}/prompt`)
```json
{
  "sessionId": "sess_otp_98765",
  "correlationId": "corr_01HXYZ987654321",
  "pluginId": "web-scraper",
  "promptType": "OTP",
  "message": "Enter the 6-digit OTP sent to 9876543210 for Jio AirFiber",
  "timeoutSeconds": 120,
  "timestamp": 1731517210
}
```

#### C. Interactive OTP Response Envelope (`pi/interactive/{session_id}/response`)
```json
{
  "sessionId": "sess_otp_98765",
  "correlationId": "corr_01HXYZ987654321",
  "response": {
    "code": "482910"
  },
  "timestamp": 1731517225
}
```

#### D. Plugin Result Envelope (`pi/events/{plugin_id}/result`)
```json
{
  "messageId": "msg_01HXYZ999999999",
  "correlationId": "corr_01HXYZ987654321",
  "pluginId": "web-scraper",
  "action": "fetch-usage",
  "status": "SUCCESS",
  "durationMs": 14200,
  "data": {
    "planName": "AirFiber 30 Mbps Unlimited",
    "usedGb": 452.3,
    "totalGb": 1000.0,
    "validity": "2026-12-05",
    "daysRemaining": 22
  },
  "timestamp": 1731517230
}
```

#### E. Messaging Plugin Payload (`pi/commands/messaging/send`)
```json
{
  "messageId": "msg_01HXYZ111222333",
  "pluginId": "messaging",
  "action": "send",
  "payload": {
    "channel": "TELEGRAM",
    "recipient": "CHAT_ID_123456",
    "content": "Jio AirFiber Alert: 80% data consumed (800 GB / 1000 GB)",
    "attachments": []
  }
}
```

---

## Proposed Project Directory Structure

```
raspberry-pi/
├── README.md
├── docker-compose.yml              # Local testing / simulation stack
├── docs/
│   └── IMPLEMENTATION_PLAN.md      # Full architecture and implementation design
├── shared/                         # Schemas & Type definitions
│   ├── schemas/                    # JSON Schema files
│   └── types/                      # TypeScript & Go type definitions
│
├── pi-daemon/                      # Standalone Go Orchestrator (~6MB RAM)
│   ├── cmd/daemon/main.go
│   ├── internal/
│   │   ├── broker/                 # HiveMQ MQTT client (TLS, reconnect, LWT)
│   │   ├── runner/                 # Ephemeral Docker / Subprocess executor
│   │   ├── session/                # Interactive OTP session registry
│   │   ├── telemetry/              # CPU/RAM/Temp reader for Raspbian
│   │   └── config/                 # YAML configuration parser
│   ├── config.yaml.example
│   ├── Makefile                    # Cross-compile for Linux ARM64
│   └── scripts/install-service.sh  # Systemd installer for Raspbian Lite
│
├── plugins/                        # Decoupled polyglot plugin catalog
│   ├── web-scraper/                # Generic Playwright scraper
│   │   ├── Dockerfile
│   │   ├── package.json / requirements.txt
│   │   ├── src/
│   │   │   ├── index.ts / main.py
│   │   │   ├── otp_handler.py      # Intercepts OTP inputs, halts, awaits reply
│   │   │   └── sites/              # Pluggable target scrapers (Jio, etc.)
│   │   └── plugin.json             # Plugin metadata, triggers, timeout
│   │
│   └── messaging/                  # Multi-channel messaging router
│       ├── Dockerfile
│       ├── src/
│       │   ├── telegram.ts         # Telegram Bot API client
│       │   ├── whatsapp.ts         # Baileys WhatsApp Web client
│       │   └── sms_gateway.ts      # Android SMS Gateway HTTP bridge
│       └── plugin.json
│
├── apps/
│   ├── mobile-web/                 # React Native with Expo (Web + Mobile)
│   │   ├── App.tsx
│   │   ├── app.json
│   │   ├── src/
│   │   │   ├── components/         # Shared UI: Dashboard, Plugin Cards, OTP Modal
│   │   │   ├── services/mqtt.ts    # WebSockets MQTT client for HiveMQ Cloud
│   │   │   └── hooks/              # Live telemetry & message listeners
│   │   └── package.json
│   │
│   └── flutter-ui/                 # Future Flutter client playground
│       └── README.md               # Architecture guide for adding Flutter
```

---

## Verification Plan

### Automated Tests
1. **Go Daemon Contract & Mock Broker Tests**:
   * Unit tests verifying that incoming JSON commands deserialize properly and trigger the runner.
   * Session registry unit test for OTP timeout and resolution.
2. **Scraper Engine Tests**:
   * Mock HTTP test site with a simulated 2-step login + OTP form to test headless detection and prompt generation.
3. **TypeScript Contract Validation**:
   * Zod schema parsing tests in the React Native project against incoming MQTT payloads.

### Manual Verification on Raspberry Pi 4B (Raspbian Lite)
1. **Binary Compilation & Deployment**:
   * Cross-compile the Go daemon for `linux/arm64` (`GOOS=linux GOARCH=arm64 go build`).
   * Copy to Raspberry Pi, run `systemctl start pi-daemon`.
   * Verify memory usage with `htop` / `ps aux`: confirm memory is **< 10 MB RAM**.
2. **HiveMQ Cloud Connectivity**:
   * Check connection status in HiveMQ Cloud web console.
   * Unplug Pi Ethernet / disable Wi-Fi briefly to verify auto-reconnection and LWT offline status.
3. **Ephemeral Plugin Execution**:
   * Publish a test message from HiveMQ Web Client.
   * Observe Go daemon launching the plugin, executing, publishing the result, and terminating.
   * Verify RAM returns to baseline **~6 MB** immediately.
4. **Interactive OTP Test**:
   * Trigger the scraper on an OTP-gated site.
   * Confirm prompt arrives on the mobile app / web dashboard.
   * Submit OTP and verify login succeeds.
5. **React Native Expo Testing**:
   * Run `npx expo start`.
   * Open on Web (`w`) and on mobile phone via **Expo Go** QR code.
   * Verify live telemetry cards and trigger buttons.
