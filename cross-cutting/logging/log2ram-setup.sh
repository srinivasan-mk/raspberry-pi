#!/usr/bin/env bash
# ==============================================================================
# Cross-Cutting Concern: In-Memory /var/log via Log2Ram Installer
# Reduces MicroSD card write wear by writing all system & app logs to tmpfs RAM.
# Run with root: sudo bash log2ram-setup.sh
# ==============================================================================
set -euo pipefail

echo "============================================================"
echo "  Setting up Log2Ram for MicroSD Card Wear Protection       "
echo "============================================================"

if [ "$(id -u)" -ne 0 ]; then
    echo "[-] This installer must be run with sudo or as root." >&2
    exit 1
fi

if ! command -v log2ram >/dev/null 2>&1; then
    echo "[*] Adding Log2Ram APT repository..."
    echo "deb [signed-by=/usr/share/keyrings/azlux-archive-keyring.gpg] http://packages.azlux.fr/debian/ bookworm main" | tee /etc/apt/sources.list.d/azlux.list
    wget -qO - https://azlux.fr/repo.gpg.key | gpg --dearmor -o /usr/share/keyrings/azlux-archive-keyring.gpg

    echo "[*] Installing log2ram..."
    apt-get update && apt-get install -y log2ram

    # Configure 256MB RAM disk for /var/log
    sed -i 's/^SIZE=.*/SIZE=256M/' /etc/log2ram.conf
    sed -i 's/^USE_RSYNC=.*/USE_RSYNC=true/' /etc/log2ram.conf

    systemctl enable log2ram
    echo "[+] Log2ram installed and enabled. Changes will activate upon next reboot."
else
    echo "[+] Log2ram is already installed."
fi
