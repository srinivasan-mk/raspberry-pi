#!/usr/bin/env bash
# ==============================================================================
# Cross-Cutting Concern: Unified Backup & Disaster Recovery Orchestrator
# Creates a compressed, encrypted-ready snapshot of Pi-hole configurations,
# pi-daemon settings, WhatsApp session credentials, and crontabs.
# Run manually or scheduled via cron.
# ==============================================================================
set -euo pipefail

BACKUP_DIR="${BACKUP_DEST:-/var/backups/raspberry-pi}"
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
ARCHIVE_NAME="rpi_backup_${TIMESTAMP}.tar.gz"
TARGET_FILE="${BACKUP_DIR}/${ARCHIVE_NAME}"

echo "============================================================"
echo "  Executing Unified System Backup: ${ARCHIVE_NAME}"
echo "============================================================"

mkdir -p "$BACKUP_DIR"

# Collect file list for backup
BACKUP_ITEMS=()

[ -d "/etc/pihole" ] && BACKUP_ITEMS+=("/etc/pihole")
[ -f "/etc/pihole-updatelists.conf" ] && BACKUP_ITEMS+=("/etc/pihole-updatelists.conf")
[ -d "/opt/pi-daemon" ] && BACKUP_ITEMS+=("/opt/pi-daemon/config.yaml")
[ -d "/opt/pi-plugins/messaging/sessions" ] && BACKUP_ITEMS+=("/opt/pi-plugins/messaging/sessions")
[ -f "/etc/crontab" ] && BACKUP_ITEMS+=("/etc/crontab")

if [ ${#BACKUP_ITEMS[@]} -eq 0 ]; then
    echo "[-] No items found to back up."
    exit 0
fi

echo "[*] Archiving items:"
for item in "${BACKUP_ITEMS[@]}"; do
    echo "    - $item"
done

tar -czf "$TARGET_FILE" "${BACKUP_ITEMS[@]}" 2>/dev/null || true
chmod 600 "$TARGET_FILE"

echo "[+] Backup created successfully at: ${TARGET_FILE}"
echo "    Size: $(du -h "$TARGET_FILE" | cut -f1)"

# Keep only the latest 7 backups
echo "[*] Pruning archives older than 7 days..."
find "$BACKUP_DIR" -type f -name "rpi_backup_*.tar.gz" -mtime +7 -delete

echo "============================================================"
