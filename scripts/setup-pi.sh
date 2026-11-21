#!/usr/bin/env bash
# ==============================================================================
# Automated Setup Script for Raspberry Pi 4B (Raspbian Lite 64-bit)
# Sets up Go daemon, systemd service, Python Playwright Chromium, & Messaging plugin.
# Run on Raspberry Pi: sudo ./scripts/setup-pi.sh
# ==============================================================================
set -e

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}==========================================================${NC}"
echo -e "${BLUE}  Raspberry Pi 4B Orchestrator - Full System Setup        ${NC}"
echo -e "${BLUE}==========================================================${NC}"

# 1. Check Root Privileges
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}Error: Please run as root: sudo ./scripts/setup-pi.sh${NC}"
  exit 1
fi

# Detect calling user
ACTUAL_USER="${SUDO_USER:-$(whoami)}"
USER_HOME=$(eval echo "~$ACTUAL_USER")
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo -e "${GREEN}==> Detected User: ${ACTUAL_USER} (Home: ${USER_HOME})${NC}"
echo -e "${GREEN}==> Repository Root: ${SCRIPT_DIR}${NC}"

# 2. Update System Packages
echo -e "\n${BLUE}[1/7] Updating system packages...${NC}"
apt update && apt upgrade -y

# 3. Install Core System Dependencies
echo -e "\n${BLUE}[2/7] Installing Golang, Python, Node.js, and build tools...${NC}"
apt install -y golang python3 python3-pip python3-venv nodejs npm git curl build-essential

# 4. Build Pi Orchestrator Daemon
echo -e "\n${BLUE}[3/7] Building Go Pi Daemon binary for ARM64...${NC}"
mkdir -p /opt/pi-daemon
mkdir -p /opt/pi-plugins

cd "$SCRIPT_DIR/pi-daemon"
go mod tidy
go build -ldflags="-s -w" -o bin/pi-daemon-arm64 ./cmd/daemon
cp bin/pi-daemon-arm64 /opt/pi-daemon/pi-daemon
chmod +x /opt/pi-daemon/pi-daemon
echo -e "${GREEN}✓ Daemon binary installed at /opt/pi-daemon/pi-daemon${NC}"

# 5. Setup Web Scraper Plugin with Playwright
echo -e "\n${BLUE}[4/7] Setting up Web Scraper plugin & Playwright Chromium...${NC}"
mkdir -p /opt/pi-plugins/web-scraper
cp -r "$SCRIPT_DIR/plugins/web-scraper/"* /opt/pi-plugins/web-scraper/

# Create virtualenv and install dependencies
python3 -m venv /opt/pi-plugins/web-scraper/venv
/opt/pi-plugins/web-scraper/venv/bin/pip install --upgrade pip
/opt/pi-plugins/web-scraper/venv/bin/pip install -r /opt/pi-plugins/web-scraper/requirements.txt

# Install Playwright headless Chromium & system graphic libraries
/opt/pi-plugins/web-scraper/venv/bin/playwright install --with-deps chromium

# Copy Playwright browser cache to user home directory so non-root daemon can access it
mkdir -p "$USER_HOME/.cache"
if [ -d "/root/.cache/ms-playwright" ]; then
  cp -r /root/.cache/ms-playwright "$USER_HOME/.cache/"
fi
chown -R "$ACTUAL_USER:$ACTUAL_USER" "$USER_HOME/.cache/ms-playwright"
echo -e "${GREEN}✓ Playwright and Chromium installed successfully!${NC}"

# 6. Setup Messaging Plugin
echo -e "\n${BLUE}[5/8] Setting up Messaging plugin (Telegram / WhatsApp / SMS)...${NC}"
mkdir -p /opt/pi-plugins/messaging
cp -r "$SCRIPT_DIR/plugins/messaging/"* /opt/pi-plugins/messaging/
cd /opt/pi-plugins/messaging
npm install
npm run build
echo -e "${GREEN}✓ Messaging plugin compiled!${NC}"

# 7. Setup Pi-hole Bridge Plugin
echo -e "\n${BLUE}[6/8] Setting up Pi-hole Bridge plugin...${NC}"
mkdir -p /opt/pi-plugins/pihole
cp -r "$SCRIPT_DIR/plugins/pihole/"* /opt/pi-plugins/pihole/
chmod +x /opt/pi-plugins/pihole/main.py
echo -e "${GREEN}✓ Pi-hole bridge plugin configured!${NC}"

# 8. Configure /opt/pi-daemon/config.yaml
echo -e "\n${BLUE}[7/8] Configuring /opt/pi-daemon/config.yaml...${NC}"
if [ ! -f "/opt/pi-daemon/config.yaml" ]; then
  echo -e "${YELLOW}Please enter your EMQX Cloud Broker details:${NC}"
  read -p "EMQX Broker Host (e.g. xxxxxx.emqxsl.com): " BROKER_HOST
  read -p "pi_client Username [pi_client]: " BROKER_USER
  BROKER_USER=${BROKER_USER:-pi_client}
  read -sp "pi_client Password: " BROKER_PASS
  echo ""

  cat <<EOF > /opt/pi-daemon/config.yaml
broker:
  host: "${BROKER_HOST}"
  port: 8883
  username: "${BROKER_USER}"
  password: "${BROKER_PASS}"
  client_id: "rpi4-edge-daemon"
  use_tls: true

pi:
  device_id: "raspberrypi-4b-home"
  telemetry_interval_sec: 30

plugins:
  web-scraper:
    enabled: true
    mode: "exec"
    command: "/opt/pi-plugins/web-scraper/venv/bin/python /opt/pi-plugins/web-scraper/src/main.py"
    timeout_sec: 180
    work_dir: "/opt/pi-plugins/web-scraper"
    env:
      HEADLESS: "true"

  messaging:
    enabled: true
    mode: "exec"
    command: "node /opt/pi-plugins/messaging/dist/index.js"
    timeout_sec: 60
    work_dir: "/opt/pi-plugins/messaging"
    env:
      TELEGRAM_BOT_TOKEN: ""

  pihole:
    enabled: true
    mode: "exec"
    command: "python3 /opt/pi-plugins/pihole/main.py"
    timeout_sec: 60
    work_dir: "/opt/pi-plugins/pihole"
    env:
      PIHOLE_API_URL: "http://127.0.0.1/api"
EOF
  echo -e "${GREEN}✓ Created /opt/pi-daemon/config.yaml${NC}"
else
  echo -e "${YELLOW}Existing /opt/pi-daemon/config.yaml preserved.${NC}"
fi

# 9. Set File Ownership
chown -R "$ACTUAL_USER:$ACTUAL_USER" /opt/pi-daemon
chown -R "$ACTUAL_USER:$ACTUAL_USER" /opt/pi-plugins

# 10. Configure & Start Systemd Service
echo -e "\n${BLUE}[8/8] Installing and starting systemd service...${NC}"
cat <<EOF > /etc/systemd/system/pi-daemon.service
[Unit]
Description=Raspberry Pi 4B Orchestrator Daemon
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${ACTUAL_USER}
WorkingDirectory=/opt/pi-daemon
ExecStart=/opt/pi-daemon/pi-daemon -config /opt/pi-daemon/config.yaml
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable pi-daemon
systemctl restart pi-daemon

echo -e "\n${GREEN}==========================================================${NC}"
echo -e "${GREEN}  Setup Complete! Daemon is Active and Running!            ${NC}"
echo -e "${GREEN}==========================================================${NC}"
echo -e "Check live service logs: ${YELLOW}journalctl -u pi-daemon -f${NC}"
echo -e "Check service status:    ${YELLOW}systemctl status pi-daemon${NC}"
echo -e "Edit configuration:      ${YELLOW}sudo nano /opt/pi-daemon/config.yaml${NC}"
