import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface TelemetryProps {
  telemetry: {
    status: 'ONLINE' | 'OFFLINE';
    hostname?: string;
    cpuTempCelsius?: number;
    memory?: {
      totalMb: number;
      usedMb: number;
      freeMb: number;
      usagePercent: number;
    };
    uptimeSeconds?: number;
    activePlugins?: string[];
  } | null;
  mqttConnected: boolean;
  onOpenSettings: () => void;
}

export const TelemetryHeader: React.FC<TelemetryProps> = ({ telemetry, mqttConnected, onOpenSettings }) => {
  const isOnline = mqttConnected && telemetry?.status === 'ONLINE';
  const statusLabel = isOnline
    ? 'ONLINE'
    : mqttConnected
    ? 'BROKER CONNECTED'
    : 'OFFLINE';

  const temp = telemetry?.cpuTempCelsius ?? 42.0;
  const tempColor = temp < 55 ? '#10b981' : temp < 70 ? '#f59e0b' : '#ef4444';

  const memPercent = telemetry?.memory?.usagePercent ?? 0;
  const memUsed = telemetry?.memory?.usedMb ?? 0;
  const memTotal = telemetry?.memory?.totalMb ?? 3896;

  const formatUptime = (seconds?: number) => {
    if (!seconds) return '--';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hrs}h ${mins}m`;
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <Text style={styles.title}>Raspberry Pi 4B</Text>
          <Text style={styles.subtitle}>{telemetry?.hostname || 'rpi-hub'}</Text>
        </View>

        <View style={styles.statusGroup}>
          <View style={[styles.badge, isOnline ? styles.badgeOnline : styles.badgeOffline]}>
            <View style={[styles.dot, isOnline ? styles.dotOnline : styles.dotOffline]} />
            <Text style={styles.badgeText}>{statusLabel}</Text>
          </View>
          <Text style={styles.settingsLink} onPress={onOpenSettings}>
            ⚙️ Broker Settings
          </Text>
        </View>
      </View>

      <View style={styles.grid}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>CPU TEMPERATURE</Text>
          <Text style={[styles.statValue, { color: tempColor }]}>{temp.toFixed(1)} °C</Text>
        </View>

        <View style={styles.statBox}>
          <Text style={styles.statLabel}>RAM USAGE</Text>
          <Text style={styles.statValue}>
            {memUsed} / {memTotal} MB
          </Text>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${Math.min(memPercent, 100)}%` }]} />
          </View>
        </View>

        <View style={styles.statBox}>
          <Text style={styles.statLabel}>UPTIME</Text>
          <Text style={styles.statValue}>{formatUptime(telemetry?.uptimeSeconds)}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleGroup: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#f8fafc',
  },
  subtitle: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 2,
  },
  statusGroup: {
    alignItems: 'flex-end',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  badgeOnline: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  badgeOffline: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  dotOnline: {
    backgroundColor: '#10b981',
  },
  dotOffline: {
    backgroundColor: '#ef4444',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#f8fafc',
  },
  settingsLink: {
    color: '#38bdf8',
    fontSize: 12,
    marginTop: 6,
    cursor: 'pointer' as any,
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 12,
    borderRadius: 10,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  progressBarBg: {
    height: 4,
    backgroundColor: '#334155',
    borderRadius: 2,
    marginTop: 6,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#38bdf8',
  },
});
