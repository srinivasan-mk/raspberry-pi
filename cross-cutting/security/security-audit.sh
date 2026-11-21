#!/usr/bin/env bash
# ==============================================================================
# Cross-Cutting Concern: Host Security & Exposure Audit Script
# Validates permissions, sensitive files, open ports, and SSH configuration.
# Run: sudo bash security-audit.sh
# ==============================================================================
set -euo pipefail

echo "============================================================"
echo "  Raspberry Pi Host Security Audit"
echo "============================================================"

# 1. Check Default Pi User Password
echo -n "[*] Checking if default 'pi' password is still set... "
if id "pi" >/dev/null 2>&1; then
    echo "User 'pi' exists. Ensure default password has been changed!"
else
    echo "No default 'pi' user found (Good)."
fi

# 2. Check SSH Configuration Hardening
echo -e "\n[*] SSH Configuration Hardening:"
SSHD_CONFIG="/etc/ssh/sshd_config"
if [ -f "$SSHD_CONFIG" ]; then
    ROOT_LOGIN=$(grep -E '^\s*PermitRootLogin' "$SSHD_CONFIG" || echo "PermitRootLogin not explicitly configured (default usually prohibit-password)")
    PASS_AUTH=$(grep -E '^\s*PasswordAuthentication' "$SSHD_CONFIG" || echo "PasswordAuthentication not explicitly configured")
    echo "    - $ROOT_LOGIN"
    echo "    - $PASS_AUTH"
fi

# 3. Check Sensitive File Permissions
echo -e "\n[*] Sensitive File Permission Check:"
CHECK_FILES=(
    "/opt/pi-daemon/config.yaml"
    "/etc/raspberry-pi/.env"
    "/etc/pihole/pihole-FTL.conf"
    "/etc/pihole/pihole.toml"
)
for f in "${CHECK_FILES[@]}"; do
    if [ -f "$f" ]; then
        PERMS=$(stat -c "%a %U:%G" "$f")
        echo "    - $f -> $PERMS"
    else
        echo "    - $f -> Not present"
    fi
done

# 4. Check Open Listening Ports
echo -e "\n[*] Active Listening Ports on Host:"
if command -v ss >/dev/null 2>&1; then
    ss -tuln | grep -E 'LISTEN|UNCONN' | awk '{print "    " $1 " " $5}'
elif command -v netstat >/dev/null 2>&1; then
    netstat -tuln | awk 'NR>2 {print "    " $1 " " $4}'
fi

# 5. Check Firewall Status
echo -e "\n[*] Firewall (UFW) Status:"
if command -v ufw >/dev/null 2>&1; then
    ufw status | head -n 5 | sed 's/^/    /'
else
    echo "    UFW is not installed. Run ufw-rules.sh to configure."
fi

echo -e "\n============================================================"
echo "  Audit Complete."
echo "============================================================"
