# Raspberry Pi 4B (Raspbian Lite) Deployment & Operations Guide

This guide walks you through deploying and operating the complete modular edge-cloud automation system on your **Raspberry Pi 4B (4GB RAM) running Raspbian Lite (Debian Bookworm 64-bit)**.

---

## 1. Prerequisites

1. **Raspberry Pi 4B**: Running **Raspbian Lite 64-bit (Debian ARM64)** with network access.
2. **HiveMQ Cloud Account**: Free serverless tier (up to 100 devices and 10 GB/month data transfer forever with zero credit card).
3. **Workstation**: PC/laptop for building binaries or cloning the repo.

---

## 2. EMQX Cloud Free Serverless Setup

1. Sign up at [emqx.com/en/cloud](https://www.emqx.com/en/cloud) and create a **Free Serverless Deployment** (1 Million connection minutes + 1 GB traffic free per month).
2. Go to the **Authentication** tab:
   * Create credentials for the Pi:
     * Username: `pi_client`
     * Password: `<ChooseAStrongPassword>`
   * Create credentials for the Web/Mobile App:
     * Username: `web_client`
     * Password: `<ChooseAStrongPassword>`
3. Note your Deployment Hostname:
   * Host: `your-deployment-id.emqx.cloud`
   * MQTTS Port (Pi Daemon): `8883` (TLS)
   * WSS Port (Web & Mobile App): `8084` (Secure WebSockets, path `/mqtt`)

---

## 3. Build & Deploy the Go Daemon to Raspberry Pi

### Step 3.1: Cross-compile the Go Daemon for ARM64
From your workstation or a Linux machine with Go installed:
```bash
cd pi-daemon
make build-arm64
```
*This generates a static native binary: `bin/pi-daemon-arm64` (only ~15 MB on disk, uses only ~6 MB RAM at runtime).*

### Step 3.2: Copy files to your Raspberry Pi
```bash
# Replace 192.168.1.100 with your Pi's actual local IP address
scp bin/pi-daemon-arm64 pi@192.168.1.100:~/
scp -r scripts config.example.yaml pi@192.168.1.100:~/
```

### Step 3.3: Install systemd service on Raspbian Lite
SSH into your Raspberry Pi:
```bash
ssh pi@192.168.1.100

# Run the installer
chmod +x scripts/install-service.sh
sudo ./scripts/install-service.sh
```

### Step 3.4: Configure HiveMQ Credentials
Edit the installed configuration file:
```bash
sudo nano /opt/pi-daemon/config.yaml
```
Update the `broker` section with your EMQX Cloud cluster details:
```yaml
broker:
  host: "your-deployment-id.emqx.cloud"
  port: 8883
  username: "pi_client"
  password: "YourSecurePassword"
  client_id: "rpi4-edge-daemon"
  use_tls: true

pi:
  device_id: "raspberrypi-4b-home"
  telemetry_interval_sec: 30
```

---

## 4. Setting up Plugins on Raspbian Lite

### 4.1 Web Scraper Plugin (`web-scraper`)

Option A: **Direct Python on Raspbian (Recommended)**:
```bash
sudo apt update && sudo apt install -y python3-pip python3-venv

# Set up virtual environment
sudo mkdir -p /opt/pi-plugins/web-scraper
sudo cp -r plugins/web-scraper/* /opt/pi-plugins/web-scraper/

cd /opt/pi-plugins/web-scraper
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
playwright install --with-deps chromium
```

Option B: **Ephemeral Docker Container**:
```bash
cd plugins/web-scraper
docker build -t pi-plugin-web-scraper:latest .
```

---

### 4.2 Messaging Plugin (`messaging`)

```bash
sudo apt install -y nodejs npm

sudo mkdir -p /opt/pi-plugins/messaging
sudo cp -r plugins/messaging/* /opt/pi-plugins/messaging/

cd /opt/pi-plugins/messaging
npm install
npm run build
```

#### WhatsApp Pairing (Scan QR Code Once):
```bash
cd /opt/pi-plugins/messaging
node dist/index.js --pair
```
*Scan the terminal QR code using WhatsApp on your phone (Linked Devices). Your credentials are saved to `sessions/whatsapp/` with zero Meta API fees!*

---

## 5. Start and Manage the Daemon

```bash
# Start the daemon
sudo systemctl start pi-daemon

# Enable auto-start on boot
sudo systemctl enable pi-daemon

# Check status
sudo systemctl status pi-daemon

# View live streaming logs
journalctl -u pi-daemon -f
```

---

## 6. Launching the Mobile & Web App

On your workstation or laptop:
```bash
cd apps/mobile-web
npm install

# Run Web Dashboard (Browser)
npx expo start --web

# Run on Physical Phone (Android / iOS)
npx expo start
```
1. Open the app in your browser or scan the terminal QR code with **Expo Go** on your mobile phone.
2. Tap **Broker Settings** (top-right) and enter your HiveMQ Cluster URL and `web_client` credentials.
3. Tap **Save & Connect**.
4. You will see:
   * **Live Pi Status**: ONLINE, live CPU temp (e.g. 43°C), RAM usage (~450 MB / 4000 MB).
   * **Plugin Trigger Center**: Trigger Jio AirFiber usage extraction or send alerts.
   * **Interactive OTP Modal**: When triggered, a popup will automatically appear to collect and submit your OTP code back to the Pi!

---

## 7. Memory & System Monitoring on the Pi

Verify that idle memory usage remains virtually zero for plugins:
```bash
# Check memory usage
free -m

# Inspect active processes (look for pi-daemon)
htop

# Check CPU temperature on Raspberry Pi
vcgencmd measure_temp
```
*The `pi-daemon` will consume only **~6 MB RAM** when idle. When a plugin runs, memory rises briefly and returns immediately to the ~6 MB baseline when the plugin terminates.*
