#!/usr/bin/env bash
# ==============================================================================
# Installer Script for Raspberry Pi 4B Orchestrator Daemon (Raspbian Lite)
# ==============================================================================
set -e

INSTALL_DIR="/opt/pi-daemon"
SERVICE_NAME="pi-daemon"

echo "==> Installing Raspberry Pi Orchestrator Daemon..."

if [ "$EUID" -ne 0 ]; then
  echo "Error: Please run as root (sudo ./install-service.sh)"
  exit 1
fi

mkdir -p "$INSTALL_DIR"
mkdir -p "$INSTALL_DIR/plugins"

# Check if binary exists
if [ -f "bin/pi-daemon-arm64" ]; then
  cp bin/pi-daemon-arm64 "$INSTALL_DIR/pi-daemon"
elif [ -f "pi-daemon" ]; then
  cp pi-daemon "$INSTALL_DIR/pi-daemon"
else
  echo "Error: Binary not found! Please build it first with: make build-arm64"
  exit 1
fi

chmod +x "$INSTALL_DIR/pi-daemon"

# Copy sample configuration if config.yaml does not exist
if [ ! -f "$INSTALL_DIR/config.yaml" ]; then
  if [ -f "config.example.yaml" ]; then
    cp config.example.yaml "$INSTALL_DIR/config.yaml"
    echo "Created $INSTALL_DIR/config.yaml. Please edit with your HiveMQ credentials!"
  fi
fi

# Install systemd service
cp scripts/pi-daemon.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable "$SERVICE_NAME"

echo "==> Installation complete!"
echo "To configure: sudo nano $INSTALL_DIR/config.yaml"
echo "To start:     sudo systemctl start $SERVICE_NAME"
echo "To view logs: journalctl -u $SERVICE_NAME -f"
