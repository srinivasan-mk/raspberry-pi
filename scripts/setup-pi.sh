#!/usr/bin/env bash
# ==============================================================================
# Automated Setup Script for Raspberry Pi 4B Host (Raspbian Lite 64-bit)
# Configures system dependencies, hardware wear reduction, UFW security, and watchdogs.
# Run on Raspberry Pi: sudo ./scripts/setup-pi.sh
# ==============================================================================
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}==========================================================${NC}"
echo -e "${BLUE}  Raspberry Pi 4B Host Platform & Cross-Cutting Setup     ${NC}"
echo -e "${BLUE}==========================================================${NC}"

# 1. Check Root Privileges
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}Error: Please run as root: sudo ./scripts/setup-pi.sh${NC}"
  exit 1
fi

ACTUAL_USER="${SUDO_USER:-$(whoami)}"
USER_HOME=$(eval echo "~$ACTUAL_USER")
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CROSS_CUTTING_DIR="$SCRIPT_DIR/cross-cutting"

echo -e "${GREEN}==> Detected User: ${ACTUAL_USER} (Home: ${USER_HOME})${NC}"
echo -e "${GREEN}==> Repository Root: ${SCRIPT_DIR}${NC}"

# 2. Update System Packages
echo -e "\n${BLUE}[1/5] Updating system packages...${NC}"
apt update && apt upgrade -y

# 3. Install Core System Dependencies
echo -e "\n${BLUE}[2/5] Installing Golang, Python, Node.js, and build tools...${NC}"
apt install -y golang python3 python3-pip python3-venv nodejs npm git curl build-essential sysstat

# 4. Apply Hardware & MicroSD Longevity Optimizations
echo -e "\n${BLUE}[3/5] Applying 24/7 MicroSD Card Longevity Optimizations...${NC}"
if [ -f "$CROSS_CUTTING_DIR/hardware/optimize-sd-card.sh" ]; then
  bash "$CROSS_CUTTING_DIR/hardware/optimize-sd-card.sh" -p extreme -y
  echo -e "${GREEN}✓ Hardware & filesystem longevity optimizations applied.${NC}"
fi

# 5. Apply UFW Firewall Security Rules
echo -e "\n${BLUE}[4/5] Applying Host Security & Firewall Rules...${NC}"
if [ -f "$CROSS_CUTTING_DIR/security/ufw-rules.sh" ]; then
  bash "$CROSS_CUTTING_DIR/security/ufw-rules.sh"
  echo -e "${GREEN}✓ UFW firewall rules configured.${NC}"
fi

# 6. Install Self-Healing System Watchdog Cron
echo -e "\n${BLUE}[5/5] Registering Self-Healing System Watchdog...${NC}"
if [ -f "$CROSS_CUTTING_DIR/maintenance/system-watchdog.sh" ]; then
  chmod +x "$CROSS_CUTTING_DIR/maintenance/system-watchdog.sh"
  CRON_JOB="*/5 * * * * root $CROSS_CUTTING_DIR/maintenance/system-watchdog.sh >/dev/null 2>&1"
  CRON_FILE="/etc/cron.d/raspberry-pi-watchdog"
  echo "$CRON_JOB" > "$CRON_FILE"
  chmod 644 "$CRON_FILE"
  echo -e "${GREEN}✓ Watchdog registered at $CRON_FILE (checks every 5 minutes).${NC}"
fi

echo -e "\n${GREEN}==========================================================${NC}"
echo -e "${GREEN}  Host Setup Complete! Platform is Hardened and Optimized! ${NC}"
echo -e "${GREEN}==========================================================${NC}"
echo -e "Next steps:"
echo -e "  • To deploy DNS Sinkhole: clone and deploy ${YELLOW}pi-hole${NC} (https://github.com/srinivasan-mk/pi-hole)"
echo -e "  • To deploy Home Edge Daemon: clone and run ${YELLOW}home-automation${NC} (https://github.com/srinivasan-mk/home-automation)"
