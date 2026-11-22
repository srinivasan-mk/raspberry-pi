# Cross-Cutting Concerns Architectural Guide

In an edge computing environment like a Raspberry Pi 4B running multiple continuous and on-demand workloads, **Cross-Cutting Concerns** are infrastructure and operational requirements that span across all functional domains.

This document outlines how cross-cutting concerns are organized in `cross-cutting/`.

---

## 1. Directory Layout

```
cross-cutting/
├── hardware/              # SoC sensors, under-voltage alerts, SD card write minimization
│   ├── check-hardware-health.sh
│   ├── optimize-sd-card.sh
│   ├── apply-fstab-commit.sh
│   ├── apply-kernel-writeback.sh
│   └── apply-pihole-batching.sh
├── telemetry/             # Hardware observation engine & specifications
│   ├── collector.go       # Reusable Go hardware observer (temp, RAM, throttling)
│   ├── telemetry_collector.py # Standalone Python telemetry runner
│   └── telemetry-spec.md  # Schema and metric dictionary
├── security/              # Host hardening & access controls
│   ├── ufw-rules.sh       # UFW firewall for DNS, MQTT TLS, and SSH
│   ├── fail2ban-jail.local# Brute-force protection
│   ├── secrets-template.env # Standardized secrets template
│   └── security-audit.sh  # Security posture audit script
├── logging/               # Logging standards & storage wear protection
│   ├── logrotate-system.conf # Centralized log rotation policies
│   ├── log2ram-setup.sh   # In-memory /var/log tmpfs mount script
│   └── logger-contract.md # Standard structured JSON log schema
├── networking/            # Resilience & upstream connectivity
│   ├── dns-fallback.sh    # DNS resolution fallback test
│   └── resilience-policy.md # Reconnect backoff, keepalive, and LWT
├── maintenance/           # System self-healing & disaster recovery
│   ├── system-watchdog.sh # Service health watchdog & auto-restart
│   └── backup-system.sh   # Snapshot backup for configs, DBs, and credentials
└── contracts/             # Multi-language contract definitions
    ├── schemas/           # JSON Schemas (command, result, telemetry, interactive, pihole)
    ├── types/             # TypeScript interfaces (contracts.ts)
    └── go/                # Go structs (contracts.go)
```

---

## 2. Breakdown of Concerns

### A. Hardware & Storage Wear Protection (`cross-cutting/hardware/`)
- **MicroSD Card Longevity**: Flash memory degrades under continuous write cycles. We apply:
  - `commit=600`: Ext4 journal commits delayed to 10 minutes instead of default 5 seconds.
  - `vm.dirty_writeback_centisecs = 60000`: Delayed kernel buffer flushes.
  - `log2ram`: Writes `/var/log` entirely to a 256MB RAM disk.
- **Diagnostics (`check-hardware-health.sh`)**:
  - Checks SoC thermal zone (`/sys/class/thermal/thermal_zone0/temp`).
  - Queries `vcgencmd get_throttled` for power supply undervoltage or frequency throttling.

### B. Security & Hardening (`cross-cutting/security/`)
- **Firewall Policy (`ufw-rules.sh`)**:
  - Deny all incoming by default.
  - Rate-limit SSH (port 22).
  - Open Port 53 (TCP/UDP) for local DNS resolution.
  - Restrict Web UI (ports 80/443) strictly to RFC 1918 private subnets (`192.168.0.0/16`, `10.0.0.0/8`).
- **Secrets Management (`secrets-template.env`)**:
  - No plaintext credentials committed to git.
  - File permissions strictly set to `0600` owned by `root:pi`.

### C. Unified Telemetry (`cross-cutting/telemetry/`)
- Go and Python implementations that output standard `PiTelemetry` payloads.
- Periodically published to `pi/telemetry/health` with `retained: true` on MQTT.
- Last Will and Testament (LWT) ensures broker publishes `"status": "OFFLINE"` if power or network drops.

### D. Observability & Structured Logging (`cross-cutting/logging/`)
- Single standardized JSON log envelope across Go, Python, and Node.js.
- Systemd journal captures standard output and buffers in volatile memory (`Storage=volatile`).
- Log rotation keeps at most 3 daily archives compressed, capping maximum log volume.

### E. Connectivity Resilience (`cross-cutting/networking/`)
- Exponential backoff with jitter prevents thundering herd issues when reconnecting to cloud brokers.
- DNS Fallback resolution prevents host daemons from becoming disconnected if local Pi-hole is recycling.

### F. Self-Healing & Disaster Recovery (`cross-cutting/maintenance/`)
- `system-watchdog.sh` monitors `pi-daemon` and `pihole-FTL`, auto-restarting crashed units.
- `backup-system.sh` produces timestamped `.tar.gz` snapshots of all configurations, databases, and tokens.
