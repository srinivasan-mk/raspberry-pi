# Raspberry Pi 4B Modular Service Bus Ecosystem

A high-performance, resource-optimized, polyglot edge automation system for **Raspberry Pi 4B (Raspbian Lite)** connected to **EMQX Cloud / MQTT**.

```
[ Mobile / Web App (React Native Expo) ]
                   │
                   ▼ (WSS WebSockets - Port 8084)
  [ EMQX Cloud Serverless MQTT Broker (Free Tier) ]
                   │
                   ▲ (MQTTS TLS - Port 8883)
[ Raspberry Pi 4B Orchestrator Daemon (Go: ~12.8 MB RAM) ]
                   │
    ┌──────────────┴──────────────┐ (Spawned on-demand, 0 MB idle)
    ▼                             ▼
[ Web Scraper Plugin ]    [ Messaging Plugin ]
(Playwright Headless +    (Telegram Bot + WhatsApp Baileys +
 Interactive OTP Flow)     Android SMS Gateway)
```

---

## Core Highlights

* **Pi Orchestrator Daemon**: Written in **Go** (~12.8 MB RAM idle, 0% CPU overhead, 24/7 MQTT TLS connection with Last Will & Testament).
* **Ephemeral Plugin Architecture**: Polyglot on-demand execution (Docker `--rm` / CLI sub-processes) consuming **0 MB RAM when idle**.
* **Interactive OTP Web Automation**: Headless **Playwright** engine capable of pausing browser execution, publishing challenge prompts over MQTT, and resuming upon user OTP submission.
* **Multi-Channel Messaging**: Telegram Bot API + Free WhatsApp Web (Baileys) + Free SMS via Android Gateway.
* **Unified UI**: **React Native with Expo** for Android, iOS, and Web (with decoupled contracts ready for future **Flutter** integration).

---

## ⚡ Quick Start on Raspberry Pi (1-Command Installer)

On a fresh Raspbian Lite (Debian 64-bit) installation:

```bash
git clone https://github.com/your-username/raspberry-pi.git
cd raspberry-pi
sudo ./setup.sh
```

Follow the prompts to enter your EMQX Cloud broker details. The script compiles the Go binary, installs Chromium for Playwright, builds the messaging plugin, and sets up the `systemd` background service!

---

## Documentation

* 📖 **[SETUP.md](SETUP.md)**: Full setup instructions, cloud broker configuration, and plugin testing.
* 🏛️ **[docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md)**: System architecture design, JSON message envelopes, and sequence diagrams.
* 📋 **[docs/RASPBIAN_LITE_DEPLOYMENT.md](docs/RASPBIAN_LITE_DEPLOYMENT.md)**: Step-by-step Raspbian Lite operations guide.
* 📱 **[apps/mobile-web/README.md](apps/mobile-web/README.md)**: React Native Web & Mobile app setup.
* 🎯 **[apps/flutter-ui/README.md](apps/flutter-ui/README.md)**: Guide for integrating a Flutter client.
