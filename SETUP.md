# Raspberry Pi 4B Modular Ecosystem - Complete Setup Guide

This guide provides automated and manual instructions to install and run the entire ecosystem on **Raspbian Lite 64-bit (Debian ARM64)**.

---

## 🚀 Quick Automated Setup on Raspberry Pi (Recommended)

If you have a fresh Raspbian Lite installation or need to reinstall:

1. Clone this repository on your Raspberry Pi:
   ```bash
   git clone https://github.com/your-username/raspberry-pi.git
   cd raspberry-pi
   ```
2. Run the automated setup script:
   ```bash
   sudo ./setup.sh
   ```
   *The script will automatically:*
   * Update packages and install Golang, Python 3, Node.js, and build tools.
   * Cross-compile and install the native Go daemon (`/opt/pi-daemon/pi-daemon`).
   * Create an isolated Python virtualenv and install **Playwright with headless Chromium**.
   * Compile the **multi-channel messaging plugin**.
   * Prompt for your EMQX Cloud broker details and configure `/opt/pi-daemon/config.yaml`.
   * Install and enable the `pi-daemon` systemd service for 24/7 auto-restart on boot.

---

## ☁️ Cloud Broker Setup (EMQX Cloud Serverless Free Tier)

1. Sign up at [emqx.com/en/cloud](https://www.emqx.com/en/cloud) and create a **Free Serverless Deployment**.
2. Go to the **Authentication** tab:
   * Create credentials for the Pi:
     * Username: `pi_client`
     * Password: `<YourPiPassword>`
   * Create credentials for the Web/Mobile App:
     * Username: `web_client`
     * Password: `<YourWebAppPassword>`
3. Note your Deployment Hostname:
   * **Host**: `xxxxxx.emqxsl.com`
   * **Pi Port (TLS)**: `8883`
   * **Web/Mobile Port (WebSockets WSS)**: `8084` (path: `/mqtt`)

---

## 📱 Web & Mobile App Setup (React Native & Expo)

Run from your workstation or laptop:

```bash
cd apps/mobile-web
npm install

# Option A: Run Web Dashboard in Browser
npx expo start --web

# Option B: Run on Physical Phone (Android / iOS)
npx expo start
```
* **For Mobile**: Install **Expo Go** from the App Store / Google Play Store, and scan the terminal QR code.
* In the app, tap **Broker Settings** (top-right) and enter your EMQX Cloud host, port `8084`, and `web_client` credentials.

---

## 🛠️ Service Management on the Pi

```bash
# Check service status
sudo systemctl status pi-daemon

# View live streaming journal logs
sudo journalctl -u pi-daemon -f

# Restart the service after config changes
sudo systemctl restart pi-daemon

# Edit configuration
sudo nano /opt/pi-daemon/config.yaml
```

---

## 🧪 Testing Plugins Locally on the Pi

### Test Web Scraper & Interactive OTP Handshake
```bash
cd /opt/pi-plugins/web-scraper
./venv/bin/python test_interactive_flow.py
```

### Test Messaging Dispatch
```bash
cd /opt/pi-plugins/messaging
node test_messaging.js
```

### Pair WhatsApp Web (Zero Meta Fees)
```bash
cd /opt/pi-plugins/messaging
node dist/index.js --pair
```
Scan the terminal QR code using WhatsApp on your phone (Linked Devices). Credentials are saved to `sessions/whatsapp/`.
