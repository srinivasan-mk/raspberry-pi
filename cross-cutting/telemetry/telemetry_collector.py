#!/usr/bin/env python3
"""
Cross-Cutting Hardware Telemetry Collector for Raspberry Pi
Exports JSON metrics: CPU Temp, RAM, Disk, Throttling status, and Uptime.
Can be executed as standalone CLI or imported by Python plugins.
"""
import json
import os
import subprocess
import time

def get_cpu_temp() -> float:
    thermal_path = "/sys/class/thermal/thermal_zone0/temp"
    if os.path.exists(thermal_path):
        try:
            with open(thermal_path, "r") as f:
                return round(float(f.read().strip()) / 1000.0, 1)
        except Exception:
            pass
    return 42.5  # Fallback for dev

def get_throttled_status() -> str:
    try:
        res = subprocess.run(["vcgencmd", "get_throttled"], capture_output=True, text=True, timeout=2)
        if res.returncode == 0:
            return res.stdout.strip()
    except Exception:
        pass
    return "throttled=0x0"

def get_memory_info() -> dict:
    total_mb, free_mb = 3900, 3200
    if os.path.exists("/proc/meminfo"):
        try:
            with open("/proc/meminfo", "r") as f:
                for line in f:
                    if line.startswith("MemTotal:"):
                        total_mb = int(line.split()[1]) // 1024
                    elif line.startswith("MemAvailable:"):
                        free_mb = int(line.split()[1]) // 1024
        except Exception:
            pass
    used_mb = total_mb - free_mb
    pct = round((used_mb / total_mb) * 100.0, 1) if total_mb else 0.0
    return {
        "totalMb": total_mb,
        "usedMb": used_mb,
        "freeMb": free_mb,
        "usagePercent": pct
    }

def get_disk_info() -> dict:
    try:
        st = os.statvfs("/")
        total_gb = round((st.f_blocks * st.f_frsize) / (1024 ** 3), 1)
        free_gb = round((st.f_bavail * st.f_frsize) / (1024 ** 3), 1)
        used_gb = round(total_gb - free_gb, 1)
        pct = round((used_gb / total_gb) * 100.0, 1) if total_gb else 0.0
        return {"totalGb": total_gb, "usedGb": used_gb, "freeGb": free_gb, "usagePercent": pct}
    except Exception:
        return {"totalGb": 32.0, "usedGb": 4.5, "freeGb": 27.5, "usagePercent": 14.1}

def collect_telemetry(device_id: str = "raspberrypi-4b-home") -> dict:
    return {
        "deviceId": device_id,
        "hostname": os.uname().nodename if hasattr(os, "uname") else "raspberrypi",
        "status": "ONLINE",
        "cpuTempCelsius": get_cpu_temp(),
        "throttleState": get_throttled_status(),
        "memory": get_memory_info(),
        "disk": get_disk_info(),
        "timestamp": int(time.time())
    }

if __name__ == "__main__":
    print(json.dumps(collect_telemetry(), indent=2))
