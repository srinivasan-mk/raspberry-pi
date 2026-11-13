# Raspberry Pi 4B Modular Service Bus Ecosystem

A high-performance, resource-optimized, polyglot edge automation system for **Raspberry Pi 4B (Raspbian Lite)** connected to **HiveMQ Cloud (MQTT)**.

## Core Highlights
* **Pi Orchestrator Daemon**: Written in **Go** (~6 MB RAM idle, 0% CPU overhead, 24/7 HiveMQ TLS connection).
* **Ephemeral Plugin System**: Polyglot on-demand execution (Docker `--rm` / CLI sub-processes) consuming **0 MB RAM when idle**.
* **Interactive OTP Web Automation**: Headless **Playwright** engine capable of pausing browser execution, publishing challenge prompts over MQTT, and resuming upon user OTP submission.
* **Multi-Channel Messaging**: Telegram Bot API + Free WhatsApp Web (Baileys) + Free SMS via Android Gateway.
* **Unified UI**: **React Native with Expo** for Android, iOS, and Web (with decoupled contracts ready for future **Flutter** integration).

## Full Implementation Plan & Technical Architecture
For detailed architecture diagrams, JSON message envelopes, topic hierarchies, and implementation steps, see:
👉 [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md)
