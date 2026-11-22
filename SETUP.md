# Raspberry Pi 4B Host Platform - Setup & Operations Guide

This guide covers operating system hardening, MicroSD card wear reduction, firewall configuration, and automated watchdogs on **Raspbian Lite 64-bit (Debian ARM64)**.

---

## 🚀 Quick Automated Host Setup

1. Clone this repository on your Raspberry Pi:
   ```bash
   git clone https://github.com/srinivasan-mk/raspberry-pi.git
   cd raspberry-pi
   ```
2. Run the automated setup script:
   ```bash
   sudo ./setup.sh
   ```
   *The script will automatically:*
   * Update packages and install core build tools.
   * Apply 24/7 MicroSD card longevity optimizations (delayed ext4 journal commit, kernel dirty writeback, swap thrashing elimination, and volatile RAM systemd journaling).
   * Apply production UFW firewall rules (limiting SSH, opening DNS 53, and restricting web UI to RFC 1918 subnets).
   * Register the 5-minute self-healing watchdog cron job (`/etc/cron.d/raspberry-pi-watchdog`).

---

## 🛠️ Cross-Cutting Concerns Management

### 1. Check Hardware Health & Diagnostics
```bash
sudo bash cross-cutting/hardware/check-hardware-health.sh
```
Checks SoC temperature, undervoltage throttling (`vcgencmd get_throttled`), RAM usage, and live disk I/O rates.

### 2. Apply MicroSD Card Longevity Profiles
```bash
# Extreme Profile (Zero-Churn: 10m kernel flush, 600s ext4 commit)
sudo bash cross-cutting/hardware/optimize-sd-card.sh -p extreme -y

# Ultra Profile (5m kernel flush, 300s commit)
sudo bash cross-cutting/hardware/optimize-sd-card.sh -p ultra -y
```

### 3. Setup In-Memory Log2Ram tmpfs
```bash
sudo bash cross-cutting/logging/log2ram-setup.sh
```

### 4. Run Host Security Audit
```bash
sudo bash cross-cutting/security/security-audit.sh
```

### 5. Execute On-Demand System Backup
```bash
sudo bash cross-cutting/maintenance/backup-system.sh
```

---

## 📦 Deploying Companion Solutions

Once the host platform is hardened:
1. **Network DNS Sinkhole**: Deploy [pi-hole](https://github.com/srinivasan-mk/pi-hole)
   ```bash
   git clone https://github.com/srinivasan-mk/pi-hole.git
   cd pi-hole
   sudo bash deploy.sh
   ```
2. **Home Automation & Edge Daemon**: Deploy [home-automation](https://github.com/srinivasan-mk/home-automation)
   ```bash
   git clone https://github.com/srinivasan-mk/home-automation.git
   cd home-automation
   sudo ./setup.sh
   ```
