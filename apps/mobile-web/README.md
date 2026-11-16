# Raspberry Pi 4B Mobile & Web Control App (`mobile-web`)

Cross-platform client built with **React Native & Expo**, providing a unified Web dashboard and native Mobile app (Android / iOS).

## Features
* **Direct HiveMQ Cloud Connection**: Communicates over secure WebSockets (`wss://`, port 8884) with automatic reconnection.
* **Live Telemetry Dashboard**: Real-time Pi 4B health monitoring (CPU temperature, RAM consumption, online/offline state).
* **Interactive OTP Challenge Modal**: Intercepts `pi/interactive/{sessionId}/prompt` challenges in real-time, allowing you to enter 6-digit OTPs directly from your phone.
* **Plugin Command Dispatcher**: One-tap triggers for Web Scraping (Jio usage) and multi-channel messaging (Telegram, WhatsApp, SMS).
* **Execution Results Feed**: Instant view of plugin output data and execution times.

---

## Quick Start

### 1. Install Dependencies
```bash
cd apps/mobile-web
npm install
```

### 2. Run as Web Dashboard (Browser)
```bash
npx expo start --web
```
Open [http://localhost:8081](http://localhost:8081) in any browser.

### 3. Run on Real Android / iOS Device
```bash
npx expo start
```
1. Install **Expo Go** from Google Play Store or Apple App Store on your phone.
2. Scan the terminal QR code using Expo Go (or Camera on iOS).
3. The app loads instantly on your physical phone with live hot-reloading!
