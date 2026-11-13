# Raspberry Pi Orchestrator Daemon (`pi-daemon`)

The ultra-lightweight, 24/7 background consumer and plugin orchestrator running on the Raspberry Pi 4B (Raspbian Lite).

## Key Characteristics
* **Memory Footprint**: Only **~6 MB of RAM** while idling and waiting for messages.
* **CPU Usage**: Near **0% CPU** during idle state.
* **Service Bus**: Maintains persistent **TLS MQTTS** connection to **HiveMQ Cloud** (port 8883).
* **Zero Idle Plugin Waste**: Plugins are invoked **on-demand** (`docker run --rm` or direct subprocess execution) and terminate immediately upon task completion, releasing all RAM.
* **Interactive OTP Relay**: Halts scraper execution upon OTP challenge, alerts cloud bus, and delivers user OTP response back to the waiting process.
* **System Telemetry**: Reads `/sys/class/thermal/thermal_zone0/temp` and `/proc/meminfo` to publish live health stats.

---

## Building

### Cross-compiling for Raspberry Pi (ARM64)
From your workstation or CI/CD environment:
```bash
cd pi-daemon
make build-arm64
```
This produces `bin/pi-daemon-arm64`, a static binary with zero external dependencies.

---

## Installation on Raspbian Lite

1. Copy the binary and installation script to your Pi:
   ```bash
   scp bin/pi-daemon-arm64 pi@<PI_IP>:~/
   scp -r scripts config.example.yaml pi@<PI_IP>:~/
   ```
2. SSH into your Pi and run:
   ```bash
   sudo ./scripts/install-service.sh
   ```
3. Edit your HiveMQ Cloud credentials:
   ```bash
   sudo nano /opt/pi-daemon/config.yaml
   ```
4. Start the service:
   ```bash
   sudo systemctl start pi-daemon
   ```
5. Check live logs:
   ```bash
   journalctl -u pi-daemon -f
   ```
