#!/usr/bin/env bash
# ==============================================================================
# Cross-Cutting Concern: System Watchdog & Self-Healing Script
# Checks vital edge services (pi-daemon, pihole-FTL) and restarts them if failed.
# Run via cron every 5 minutes: */5 * * * * root /opt/cross-cutting/maintenance/system-watchdog.sh
# ==============================================================================
set -euo pipefail

LOG_FILE="/var/log/system-watchdog.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# 1. Check Pi Orchestrator Daemon
if systemctl is-active --quiet pi-daemon; then
    : # All good
else
    log "[ALERT] pi-daemon service is DOWN. Attempting automatic restart..."
    systemctl restart pi-daemon || log "[ERROR] Failed to restart pi-daemon."
fi

# 2. Check Pi-hole FTL DNS Engine (if installed)
if command -v pihole >/dev/null 2>&1; then
    if systemctl is-active --quiet pihole-FTL; then
        : # All good
    else
        log "[ALERT] pihole-FTL DNS service is DOWN. Attempting automatic restart..."
        systemctl restart pihole-FTL || log "[ERROR] Failed to restart pihole-FTL."
    fi
fi

# 3. Check Thermal Limit
if [ -f "/sys/class/thermal/thermal_zone0/temp" ]; then
    TEMP_RAW=$(cat /sys/class/thermal/thermal_zone0/temp)
    TEMP_C=$(( TEMP_RAW / 1000 ))
    if [ "$TEMP_C" -gt 80 ]; then
        log "[CRITICAL] SoC Temperature is dangerously high (${TEMP_C}°C)! Investigate cooling."
    fi
fi
