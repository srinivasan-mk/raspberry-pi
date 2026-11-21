# Raspberry Pi 4B Modular Service Bus & Edge Ecosystem

A high-performance, resource-optimized, polyglot edge automation ecosystem for **Raspberry Pi 4B (Raspbian Lite)** with clean architectural segregation between **Core Edge Orchestration**, **Pi-hole Network Services**, and centralized **Cross-Cutting Concerns**.

```
[ Mobile / Web App (React Native Expo) ]
                   │
                   ▼ (WSS WebSockets - Port 8084)
  [ EMQX / HiveMQ Cloud Serverless MQTT Broker ]
                   │
                   ▲ (MQTTS TLS - Port 8883)
[ Raspberry Pi 4B Orchestrator Daemon (Go: ~12.8 MB RAM) ]
                   │
    ┌──────────────┼──────────────┐ (Spawned on-demand, 0 MB idle)
    ▼              ▼              ▼
[Web Scraper] [Messaging]   [Pi-hole Bridge]
(Playwright)  (Telegram /   (DNS Metrics &
               WhatsApp)     Blocking Control)
```

---

## 🏛️ Architecture & Domain Segregation

The workspace is organized into clean, decoupled operational boundaries:

### 1. `pi-hole/` (Dedicated Network DNS Sinkhole Domain)
* **Ad-blocking & Privacy**: Pi-hole Core v6.x engine (`pihole-FTL`) serving port 53 (TCP/UDP).
* **Curated Blocklists**: Multi-tier blocklist strategy including HaGeZi, Indian regional filters (Jio Hotstar telemetry, Xiaomi TV, Realme/Oppo), and anti-breakage whitelists (UPI, banking, Indian shopping).
* **Automated Sync**: `pihole-updatelists` & `pihole-cloud-updater` for automated gravity updates.
* **In-RAM Gravity Cache**: `pihole-gravity-ramcache` (`vmtouch`) locks 100% of `gravity.db` into physical RAM for zero disk lookups.

### 2. `raspberry-pi/` (Core Edge Orchestrator & Application Layer)
* **Pi Orchestrator Daemon (`pi-daemon/`)**: Written in **Go** (~12.8 MB RAM idle, 0% CPU overhead, 24/7 MQTT TLS connection with Last Will & Testament).
* **Ephemeral Plugin Architecture (`plugins/`)**: Polyglot on-demand execution consuming **0 MB RAM when idle**:
  * `plugins/web-scraper`: Headless Playwright engine with state-holding interactive OTP handshake.
  * `plugins/messaging`: Telegram Bot API + Free WhatsApp Web (Baileys) + Android SMS Gateway.
  * `plugins/pihole`: Local Pi-hole bridge querying metrics, toggling ad-blocking, and triggering gravity updates over MQTT.
* **Client Interfaces (`apps/`)**: Single TypeScript codebase with **React Native (Expo)** for Web, Android, and iOS, with decoupled contracts ready for future **Flutter** integration.
* **Host Tools (`host-tools/`)**: Isolated tools such as `host-tools/kiosk-chrome` for minimal Wayland/Cage Chromium display.

### 3. `cross-cutting/` (Centralized Cross-Cutting Concerns)
* ⚡ **Hardware & Flash Wear (`cross-cutting/hardware/`)**: SoC thermal monitoring, `vcgencmd get_throttled` under-voltage detection, `commit=600` delayed filesystem commits, and kernel dirty writeback tuning.
* 🛡️ **Security & Hardening (`cross-cutting/security/`)**: Production UFW firewall policies, fail2ban brute-force protection, `.env` secrets template, and permission enforcement (0600).
* 📊 **Telemetry & Health (`cross-cutting/telemetry/`)**: Standardized hardware collectors (Go & Python) emitting periodic retained heartbeats to `pi/telemetry/health`.
* 📝 **Logging & Observability (`cross-cutting/logging/`)**: Unified JSON structured logging standard and `log2ram` tmpfs RAM disk for `/var/log` to eliminate MicroSD wear.
* 🌐 **Network Resilience (`cross-cutting/networking/`)**: Upstream DNS fallback and exponential backoff with jitter for cloud MQTT connections.
* 🔄 **Self-Healing & Maintenance (`cross-cutting/maintenance/`)**: System watchdog auto-restarting degraded services, and automated disaster recovery backup orchestrator.
* 📐 **Shared Contracts (`cross-cutting/contracts/`)**: Unified JSON Schemas, TypeScript interfaces, and Go structs for commands, results, telemetry, interactive prompts, and Pi-hole events.

---

## ⚡ Quick Start on Raspberry Pi (1-Command Installer)

On a fresh Raspbian Lite (Debian 64-bit) installation:

```bash
git clone https://github.com/srinivasan-mk/raspberry-pi.git
cd raspberry-pi
sudo ./setup.sh
```

The installer automatically compiles the Go binary, installs Chromium for Playwright, builds the messaging and Pi-hole plugins, sets up `systemd` background services, and configures the cloud broker.

To verify workspace layout and schema integrity at any time:
```powershell
powershell -ExecutionPolicy Bypass -File scripts/verify-workspace.ps1
```

---

## 📚 Architectural Runbooks & Documentation

* 🏛️ **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**: Holistic system architecture and domain segregation matrix.
* 🛡️ **[docs/CROSS_CUTTING_CONCERNS.md](docs/CROSS_CUTTING_CONCERNS.md)**: Comprehensive deep dive into all 6 cross-cutting concerns.
* 💾 **[docs/SD_CARD_LONGEVITY.md](docs/SD_CARD_LONGEVITY.md)**: MicroSD card wear-leveling and zero-write tuning guide.
* 📖 **[SETUP.md](SETUP.md)**: Full setup instructions and cloud broker configuration.
* 📋 **[docs/RASPBIAN_LITE_DEPLOYMENT.md](docs/RASPBIAN_LITE_DEPLOYMENT.md)**: Step-by-step Raspbian Lite operations guide.
* 📱 **[apps/mobile-web/README.md](apps/mobile-web/README.md)**: React Native Web & Mobile app setup.
* 🎯 **[apps/flutter-ui/README.md](apps/flutter-ui/README.md)**: Guide for integrating a Flutter client.
