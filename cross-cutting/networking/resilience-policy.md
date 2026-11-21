# Cross-Cutting Network Resilience Policy

## 1. Principles
Raspberry Pi edge nodes often operate on residential connections, mobile hotspots, or local Wi-Fi with intermittent connectivity.
All services must observe these core resilience rules:

## 2. Exponential Backoff Reconnection
- **Initial Retry Delay**: 1 second
- **Multiplier**: 2.0x
- **Maximum Backoff**: 60 seconds
- **Jitter**: ±20% randomized jitter to prevent connection storms on cloud brokers.

## 3. MQTT Keep-Alive and LWT (Last Will and Testament)
- **Keep-Alive Interval**: 30 seconds
- **LWT Topic**: `pi/telemetry/health`
- **LWT Payload**:
  ```json
  {"deviceId":"raspberrypi-4b-home","hostname":"rpi4b-edge","status":"OFFLINE","timestamp":0}
  ```
- **LWT Retention**: `true` (QoS 1)
- If the Pi loses power, Ethernet, or internet without a clean disconnect, the broker automatically publishes the offline state within 45 seconds.

## 4. Upstream DNS Fallback for Host Services
- While Pi-hole acts as the LAN-wide DNS sinkhole, host services (`pi-daemon`) configure a secondary fallback nameserver (`1.1.1.1` or `8.8.8.8`) in `/etc/resolv.conf` (or via `systemd-resolved`) so that during Pi-hole restarts or gravity compilation, cloud brokers remain resolvable.
