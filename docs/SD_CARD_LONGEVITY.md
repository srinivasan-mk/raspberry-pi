# Raspberry Pi 4 MicroSD Card Longevity & Storage Optimization Guide

The primary failure point of 24/7 Raspberry Pi home servers is **MicroSD card write exhaustion**. By default, Linux commits metadata, updates access times, and appends log lines constantly.

This document details the cross-cutting strategy implemented in `cross-cutting/hardware/` and `cross-cutting/logging/` to achieve **zero idle write wear** and extend MicroSD life to 5+ years.

---

## 1. Multi-Tier Wear-Leveling Architecture

```
┌────────────────────────────────────────────────────────┐
│             APPLICATIONS & SYSTEM SERVICES             │
│   (pi-daemon, pihole-FTL, systemd-journald, cron)      │
└───────────────────────────┬────────────────────────────┘
                            │ Writes
                            ▼
┌────────────────────────────────────────────────────────┐
│                   RAM DISK (tmpfs)                     │
│  • /var/log via log2ram (256 MB in RAM)                │
│  • systemd-journald in RAM (Storage=volatile)          │
│  • Pi-hole query database cached in RAM                │
└───────────────────────────┬────────────────────────────┘
                            │ Periodic Sync (Daily at 23:55)
                            ▼
┌────────────────────────────────────────────────────────┐
│             DELAYED EXT4 COMMIT CACHE                  │
│  • commit=600 (Journal commits delayed to 10 minutes)  │
│  • vm.dirty_writeback_centisecs = 60000 (10 min flush) │
│  • noatime (Zero write overhead on reads)              │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│           PHYSICAL MICROSD CARD (mmcblk0)              │
│       Target: < 10–50 physical write ops / day         │
└────────────────────────────────────────────────────────┘
```

---

## 2. Core Implemented Optimizations

### A. In-Memory Logging via Log2Ram (`cross-cutting/logging/log2ram-setup.sh`)
- Mounts `/var/log` on a 256 MB RAM tmpfs partition.
- All high-frequency log activity writes directly to RAM.
- A daily timer syncs RAM logs to disk once per day.

### B. Delayed Filesystem Commits (`cross-cutting/hardware/apply-fstab-commit.sh`)
- Modifies `/etc/fstab` root mount to use `noatime,commit=600`.
- Instead of committing every 5 seconds, filesystem changes are batched in RAM for 10 minutes.

### C. Kernel Dirty Writeback Buffering (`cross-cutting/hardware/apply-kernel-writeback.sh`)
- Sets `vm.dirty_writeback_centisecs = 60000`.
- Sets `vm.dirty_expire_centisecs = 60000`.
- Dirty pages remain buffered in RAM, collapsing redundant writes to the same disk sectors.

### D. Pi-hole FTL 24-Hour Write Batching
- In Pi-hole configuration (`/etc/pihole/pihole.toml` or `pihole-FTL.conf`):
  - `DBinterval = 86400`: FTL holds all DNS query statistics in RAM, writing to disk only once every 24 hours.
  - `maxDBdays = 1`: Keeps the database compact (< 15 MB) to avoid write bloat.

### E. 100% Gravity Domain RAM Locking (`vmtouch`)
- `pihole-gravity-ramcache.service` locks the entire `gravity.db` into physical RAM.
- Domain lookups for 9+ million blocked domains produce zero disk read operations.

---

## 3. How to Monitor Write Reduction
Run from SSH on the Raspberry Pi:
```bash
sudo bash cross-cutting/hardware/check-hardware-health.sh
```
Or check the live 30-second sector write rate:
```bash
sudo bash -c 'cat /sys/block/mmcblk0/stat; sleep 30; cat /sys/block/mmcblk0/stat'
```
Target: **0 reads, 0 writes (0.00 B/s, wa = 0%)** during normal idle operation.
