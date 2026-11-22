# Raspberry Pi 4B Host Platform & Cross-Cutting Infrastructure

The foundational host operating system, hardware longevity, and centralized cross-cutting infrastructure suite for **Raspberry Pi 4B (Raspbian Lite 64-bit)**.

---

## 🏛️ Architecture & Ecosystem Domain Segregation

The complete ecosystem is segregated into 3 decoupled repositories by functional boundary:

```
┌────────────────────────────────────────────────────────┐
│                   raspberry-pi/                        │
│   Host Platform, OS Hardening, Hardware Longevity,     │
│   and Centralized Cross-Cutting Infrastructure         │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │               cross-cutting/                     │  │
│  │  • hardware/    (commit=600, kernel, SD wear)    │  │
│  │  • security/    (UFW firewall, fail2ban, audit)  │  │
│  │  • logging/     (log2ram tmpfs, system logrotate)│  │
│  │  • telemetry/   (collector.go, telemetry.py)     │  │
│  │  • networking/  (dns-fallback, resilience)       │  │
│  │  • maintenance/ (system-watchdog, backup)        │  │
│  │  • contracts/   (JSON schemas, TS/Go contracts)  │  │
│  └──────────────────────────────────────────────────┘  │
└──────────────┬──────────────────────────┬──────────────┘
               │                          │
               ▼                          ▼
┌──────────────────────────────┐ ┌──────────────────────────────┐
│          pi-hole/            │ │       home-automation/       │
│  Network DNS Sinkhole &      │ │  Edge Orchestrator Daemon,   │
│  Curated Cloud List Updater  │ │  Polyglot Plugins, & Apps    │
│                              │ │                              │
│  • Curated Indian & Global   │ │  • Go Edge Daemon (MQTTS)    │
│    Blocklists                │ │  • Web Scraper (Playwright)  │
│  • Pi-hole Cloud Updater     │ │  • Messaging (TG/WA/SMS)     │
│  • FTL DB Batching           │ │  • Pi-hole MQTT Bridge       │
│  • In-RAM Gravity Cache      │ │  • React Native Mobile/Web   │
└──────────────────────────────┘ └──────────────────────────────┘
```

### 1. `raspberry-pi/` (Host Platform & Cross-Cutting Concerns)
* ⚡ **Hardware & Flash Wear (`cross-cutting/hardware/`)**: SoC thermal monitoring, `vcgencmd get_throttled` under-voltage detection, `commit=600` delayed filesystem commits, and kernel dirty writeback tuning.
* 🛡️ **Security & Hardening (`cross-cutting/security/`)**: Production UFW firewall policies, fail2ban brute-force protection, `.env` secrets template, and permission enforcement (0600).
* 📊 **Telemetry & Health (`cross-cutting/telemetry/`)**: Standardized hardware collectors (Go & Python) emitting periodic retained heartbeats to `pi/telemetry/health`.
* 📝 **Logging & Observability (`cross-cutting/logging/`)**: Unified JSON structured logging standard and `log2ram` tmpfs RAM disk for `/var/log` to eliminate MicroSD wear.
* 🌐 **Network Resilience (`cross-cutting/networking/`)**: Upstream DNS fallback and exponential backoff with jitter for cloud MQTT connections.
* 🔄 **Self-Healing & Maintenance (`cross-cutting/maintenance/`)**: System watchdog auto-restarting degraded services, and automated disaster recovery backup orchestrator.
* 📐 **Shared Contracts (`cross-cutting/contracts/`)**: Canonical JSON Schemas, TypeScript interfaces, and Go structs for commands, results, telemetry, interactive prompts, and Pi-hole events.

### 2. `home-automation/` (Edge Automation & Client Applications)
* Dedicated solution at [home-automation](https://github.com/srinivasan-mk/home-automation) featuring:
  * **Edge Orchestrator Daemon (`pi-daemon/`)**: High-performance Go daemon (~12.8 MB RAM) connected 24/7 over MQTTS TLS with Last Will & Testament.
  * **On-Demand Plugins (`plugins/`)**: Ephemeral execution (0 MB idle RAM) for Playwright web scraping with interactive OTP challenge handling, multi-channel messaging (Telegram/WhatsApp/SMS), and Pi-hole control bridge.
  * **Client Interfaces (`apps/`)**: React Native (Expo) app for Web, Android, and iOS.

### 3. `pi-hole/` (Dedicated Network DNS Sinkhole Domain)
* Dedicated solution at [pi-hole](https://github.com/srinivasan-mk/pi-hole) featuring:
  * Pi-hole Core v6.x engine (`pihole-FTL`) serving port 53 (TCP/UDP).
  * Curated blocklists (HaGeZi, India regional ads, UPI whitelists) and `pihole-cloud-updater`.
  * In-RAM gravity database cache (`vmtouch`).

---

## ⚡ Quick Start on Raspberry Pi (Host Installer)

On a fresh Raspbian Lite (Debian 64-bit) installation:

```bash
git clone https://github.com/srinivasan-mk/raspberry-pi.git
cd raspberry-pi
sudo ./setup.sh
```

The installer hardens the host, tunes ext4 filesystem commit intervals, sets kernel writeback buffers, applies UFW firewall policies, and registers the 5-minute system-watchdog cron job.

To verify host platform layout and cross-cutting schema integrity at any time:
```powershell
powershell -ExecutionPolicy Bypass -File scripts/verify-workspace.ps1
```
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
* 📊 **[docs/sd-card-io-optimization-notes.md](docs/sd-card-io-optimization-notes.md)**: Real-world host hardware telemetry & I/O benchmarks on Raspberry Pi 4B.
* 📖 **[SETUP.md](SETUP.md)**: Full setup instructions and cloud broker configuration.
* 📋 **[docs/RASPBIAN_LITE_DEPLOYMENT.md](docs/RASPBIAN_LITE_DEPLOYMENT.md)**: Step-by-step Raspbian Lite operations guide.
* 📱 **[apps/mobile-web/README.md](apps/mobile-web/README.md)**: React Native Web & Mobile app setup.
* 🎯 **[apps/flutter-ui/README.md](apps/flutter-ui/README.md)**: Guide for integrating a Flutter client.
