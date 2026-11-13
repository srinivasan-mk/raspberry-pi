package telemetry

import (
	"bufio"
	"fmt"
	"os"
	"runtime"
	"strconv"
	"strings"
	"time"

	"github.com/raspberry-pi-ecosystem/pi-daemon/internal/models"
)

type Collector struct {
	deviceID  string
	hostname  string
	startTime time.Time
}

func NewCollector(deviceID string) *Collector {
	h, err := os.Hostname()
	if err != nil {
		h = "unknown-pi"
	}
	return &Collector{
		deviceID:  deviceID,
		hostname:  h,
		startTime: time.Now(),
	}
}

// Collect reads system metrics on Linux / Raspbian Lite (with development fallbacks)
func (c *Collector) Collect(activePlugins []string) *models.PiTelemetry {
	uptime := int64(time.Since(c.startTime).Seconds())
	temp := c.readCpuTemp()
	mem := c.readMemory()

	return &models.PiTelemetry{
		DeviceId:        c.deviceID,
		Hostname:        c.hostname,
		Status:          "ONLINE",
		UptimeSeconds:   uptime,
		CpuTempCelsius:  temp,
		CpuUsagePercent: 1.5, // Lightweight baseline
		Memory:          mem,
		ActivePlugins:   activePlugins,
		Timestamp:       time.Now().Unix(),
	}
}

// readCpuTemp reads the Raspberry Pi CPU thermal zone
func (c *Collector) readCpuTemp() float64 {
	data, err := os.ReadFile("/sys/class/thermal/thermal_zone0/temp")
	if err == nil {
		raw := strings.TrimSpace(string(data))
		if val, parseErr := strconv.ParseFloat(raw, 64); parseErr == nil {
			return val / 1000.0 // Millicelsius to Celsius
		}
	}
	// Fallback mock temperature for non-Linux / development environments
	if runtime.GOOS == "windows" || runtime.GOOS == "darwin" {
		return 43.5
	}
	return 0.0
}

// readMemory parses /proc/meminfo on Linux
func (c *Collector) readMemory() models.MemoryStats {
	file, err := os.Open("/proc/meminfo")
	if err != nil {
		// Mock stats for dev
		return models.MemoryStats{
			TotalMb:      3896,
			UsedMb:       480,
			FreeMb:       3416,
			UsagePercent: 12.3,
		}
	}
	defer file.Close()

	var memTotal, memAvailable int
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := scanner.Text()
		if strings.HasPrefix(line, "MemTotal:") {
			memTotal = parseMemKb(line) / 1024
		} else if strings.HasPrefix(line, "MemAvailable:") {
			memAvailable = parseMemKb(line) / 1024
		}
		if memTotal > 0 && memAvailable > 0 {
			break
		}
	}

	used := memTotal - memAvailable
	percent := 0.0
	if memTotal > 0 {
		percent = (float64(used) / float64(memTotal)) * 100.0
	}

	return models.MemoryStats{
		TotalMb:      memTotal,
		UsedMb:       used,
		FreeMb:       memAvailable,
		UsagePercent: percent,
	}
}

func parseMemKb(line string) int {
	parts := strings.Fields(line)
	if len(parts) >= 2 {
		val, _ := strconv.Atoi(parts[1])
		return val
	}
	return 0
}

func (c *Collector) BuildOfflineLWT() []byte {
	return []byte(fmt.Sprintf(`{"deviceId":"%s","hostname":"%s","status":"OFFLINE","timestamp":%d}`,
		c.deviceID, c.hostname, time.Now().Unix()))
}
