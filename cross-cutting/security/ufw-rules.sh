#!/usr/bin/env bash
# ==============================================================================
# Cross-Cutting Concern: Production UFW Firewall Rules for Raspberry Pi
# Supports Pi-hole (DNS), Orchestrator Daemon (MQTT TLS), Web UI, and SSH.
# Run with root: sudo bash ufw-rules.sh
# ==============================================================================
set -euo pipefail

echo "============================================================"
echo "  Configuring Cross-Cutting UFW Firewall Rules              "
echo "============================================================"

# Ensure UFW is installed
if ! command -v ufw >/dev/null 2>&1; then
    echo "[*] Installing UFW..."
    apt-get update && apt-get install -y ufw
fi

# Reset to default secure baseline
echo "[*] Setting default firewall policies..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing

# Allow Loopback
ufw allow in on lo to any

# 1. SSH Access (port 22) - rate-limited to mitigate brute-force
echo "[*] Allowing rate-limited SSH (port 22)..."
ufw limit 22/tcp comment 'SSH rate-limited'

# 2. Pi-hole DNS Service (port 53 TCP & UDP)
echo "[*] Allowing DNS for Pi-hole (port 53 TCP/UDP)..."
ufw allow 53/tcp comment 'Pi-hole DNS TCP'
ufw allow 53/udp comment 'Pi-hole DNS UDP'

# 3. Web Dashboard / CivetWeb (port 80 HTTP, port 443 HTTPS)
# Restricted to local private network subnets (RFC 1918)
echo "[*] Allowing HTTP/HTTPS from local subnets..."
ufw allow from 192.168.0.0/16 to any port 80 proto tcp comment 'Pi-hole Web UI HTTP (Local)'
ufw allow from 192.168.0.0/16 to any port 443 proto tcp comment 'Pi-hole Web UI HTTPS (Local)'
ufw allow from 10.0.0.0/8 to any port 80 proto tcp comment 'Pi-hole Web UI HTTP (10.x.x.x)'
ufw allow from 10.0.0.0/8 to any port 443 proto tcp comment 'Pi-hole Web UI HTTPS (10.x.x.x)'

# 4. Outgoing TLS for MQTT Broker (HiveMQ / EMQX Cloud on port 8883)
# (Outbound traffic is allowed by default policy)

# Enable firewall
echo "[*] Enabling UFW..."
ufw --force enable

echo "============================================================"
echo "  UFW Status Summary:                                       "
echo "============================================================"
ufw status verbose
