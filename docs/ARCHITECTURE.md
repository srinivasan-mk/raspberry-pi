# Raspberry Pi 4B Modular Ecosystem - Holistic Architecture

This document provides the high-level system architecture and operational domain segregation across **Pi-hole (Network DNS Sinkhole)**, the **Raspberry Pi Core Orchestrator**, and **Cross-Cutting Concerns**.

---

## 1. Architectural Domains Overview

```mermaid
flowchart TD
    subgraph Clients["Client Layer"]
        MobileWeb["Mobile & Web App (React Native Expo)\n• Live Hardware Telemetry\n• Scraper & OTP Controls\n• Multi-Channel Alerts\n• Pi-hole DNS Controls"]
        FlutterFuture["Flutter Client (Future Add-on)"]
    end

    subgraph CloudBus["Cloud Message Bus"]
        MQTT["EMQX / HiveMQ Cloud Broker\n• MQTTS TLS (Port 8883)\n• WSS WebSockets (Port 8084)"]
    end

    subgraph Host["Raspberry Pi 4B Host (Raspbian Lite 64-bit)"]
        subgraph CCC["Cross-Cutting Concerns Layer (cross-cutting/)"]
            HWSens["Hardware & Flash Wear\n(Thermal, vcgencmd throttled,\nSD commit=600, log2ram)"]
            SecLayer["Security & Hardening\n(UFW Firewall, Fail2ban,\nSecrets, 0600 Perms)"]
            LogObs["Structured Logging\n(JSON standard, logrotate)"]
            NetResil["Network Resilience\n(DNS Fallback, MQTT LWT)"]
            Schemas["Shared Contracts\n(JSON Schemas, TS/Go Types)"]
            Watchdog["Self-Healing\n(Watchdog, Backup snapshots)"]
        end

        subgraph PiDaemon["Core Edge Platform (raspberry-pi/)"]
            GoDaemon["Go Orchestrator Daemon (~12MB RAM)\n• 24/7 MQTT Client with LWT\n• Session Registry & OTP Handler\n• Ephemeral Process Runner"]
            
            subgraph Plugins["Polyglot Ephemeral Plugins (0 MB RAM Idle)"]
                Scraper["Web Scraper (Playwright)\nInteractive OTP Handler"]
                Messenger["Multi-Channel Messaging\nTelegram / WhatsApp / SMS"]
                PiholeBridge["Pi-hole Controller Bridge\nMetrics query, Toggle, Gravity sync"]
            end
        end

        subgraph PiHoleDomain["Network DNS Domain (pi-hole/)"]
            FTL["Pi-hole FTL DNS Engine\n• Port 53 TCP/UDP\n• In-Memory Gravity DB (vmtouch)\n• 24h DBinterval Batching"]
            Updatelists["Automated List Updater\nJacklul / Cloud Updater Cron"]
            CuratedLists["Curated Indian & Global Blocklists\n(HaGeZi, EasyList, UPI Whitelists)"]
        end
    end

    MobileWeb <-->|WSS (Port 8084)| MQTT
    FlutterFuture -.->|WSS (Port 8084)| MQTT
    MQTT <-->|MQTTS (Port 8883)| GoDaemon

    GoDaemon -->|Spawn on Demand| Scraper
    GoDaemon -->|Spawn on Demand| Messenger
    GoDaemon -->|Spawn on Demand| PiholeBridge
    
    PiholeBridge <-->|Local API / CLI| FTL
    FTL --- CuratedLists
    FTL --- Updatelists

    CCC -.->|Governs & Protects| PiDaemon
    CCC -.->|Governs & Protects| PiHoleDomain
```

---

## 2. Domain Separation Matrix

| Concern / Responsibility | `pi-hole/` Repository / Domain | `raspberry-pi/` Repository / Domain | `cross-cutting/` Layer |
| :--- | :--- | :--- | :--- |
| **Primary Responsibility** | Network-wide ad-blocking, DNS sinkhole, and privacy protection | Hardware orchestration, event-driven automation, and cloud integration | Shared system policies, health observation, security, and contracts |
| **Network Interfaces** | Port 53 (DNS TCP/UDP), Port 80/443 (Local Web UI) | Port 8883 (MQTTS TLS), Port 8084 (WSS WebSockets) | Loopback, local subnets (RFC 1918), UFW firewall profiles |
| **Process Model** | 24/7 background system service (`pihole-FTL.service`) | 24/7 Go daemon + on-demand ephemeral plugins (0 MB idle RAM) | Periodic systemd timers and cron jobs (watchdog, log2ram, backup) |
| **Data Storage** | `/etc/pihole/gravity.db`, `/etc/pihole/pihole-FTL.db` | Stateless ephemeral execution (sessions stored in memory) | `/var/log` on tmpfs, `/etc/raspberry-pi/.env` (0600) |
| **Extensibility** | List sources, regex rules, conditional forwarding | Polyglot plugins (Python, Node.js, Go, Docker) | Language-agnostic JSON Schemas and typed SDK contracts |

---

## 3. Communication & Control Flows

### A. Pi-hole Monitoring via Cloud MQTT
1. **Client Request**: User opens mobile or web app and triggers "Query Metrics" or views the dashboard.
2. **MQTT Command**: Web client publishes to `pi/commands/pihole/status`.
3. **Daemon Dispatch**: `pi-daemon` invokes `/opt/pi-plugins/pihole/main.py` via subprocess.
4. **Local Query**: The Python script queries `http://127.0.0.1/api/stats/summary` or `pihole status`.
5. **Result Dispatch**: Output is emitted as standard JSON to stdout, packaged by the daemon into a `PluginResultEnvelope`, and published to `pi/events/pihole/result`.
6. **Execution Complete**: The Python plugin terminates immediately, returning to 0 MB idle RAM.

### B. Interactive OTP Web Automation Flow
1. **Command**: App publishes `pi/commands/web-scraper/fetch-usage`.
2. **Browser Start**: Daemon starts Playwright headless Chromium.
3. **OTP Challenge**: Site prompts for OTP. Playwright pauses, creates a session, and sends `INTERACTIVE_PROMPT` to daemon.
4. **Cloud Push**: Daemon publishes `pi/interactive/{sessionId}/prompt` to MQTT.
5. **User Input**: Mobile app displays popup modal; user submits 6-digit code.
6. **Delivery**: App publishes `pi/interactive/{sessionId}/response`.
7. **Resolution**: Daemon delivers code to paused Playwright process; authentication completes.
