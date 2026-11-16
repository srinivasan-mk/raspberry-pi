import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export interface ResultItem {
  messageId: string;
  pluginId: string;
  action: string;
  status: 'SUCCESS' | 'FAILED' | 'TIMEOUT';
  durationMs?: number;
  data?: any;
  error?: { message: string };
  timestamp: number;
}

interface ResultFeedProps {
  results: ResultItem[];
}

export const ResultFeed: React.FC<ResultFeedProps> = ({ results }) => {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Live Execution Results</Text>
      <Text style={styles.subtitle}>Stream of plugin outcomes published to `pi/events/+/result`</Text>

      {results.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No results yet. Trigger a plugin above to see live output.</Text>
        </View>
      ) : (
        results.slice(0, 5).map((item) => {
          const isSuccess = item.status === 'SUCCESS';
          return (
            <View key={item.messageId} style={styles.resultItem}>
              <View style={styles.itemHeader}>
                <View style={styles.badgeRow}>
                  <Text style={styles.pluginName}>{item.pluginId}</Text>
                  <Text style={styles.actionName}>• {item.action}</Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    isSuccess ? styles.statusSuccess : styles.statusFailed,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      isSuccess ? styles.statusTextSuccess : styles.statusTextFailed,
                    ]}
                  >
                    {item.status} ({item.durationMs || 0}ms)
                  </Text>
                </View>
              </View>

              {/* Data / Payload Preview */}
              <View style={styles.dataBox}>
                <Text style={styles.dataText}>
                  {item.error
                    ? `Error: ${item.error.message}`
                    : JSON.stringify(item.data, null, 2)}
                </Text>
              </View>
            </View>
          );
        })
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 40,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f8fafc',
  },
  subtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
    marginBottom: 16,
  },
  emptyState: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 13,
  },
  resultItem: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pluginName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#38bdf8',
  },
  actionName: {
    fontSize: 12,
    color: '#94a3b8',
    marginLeft: 6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  statusFailed: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusTextSuccess: {
    color: '#10b981',
  },
  statusTextFailed: {
    color: '#ef4444',
  },
  dataBox: {
    backgroundColor: '#020617',
    borderRadius: 8,
    padding: 10,
  },
  dataText: {
    fontFamily: 'monospace' as any,
    fontSize: 12,
    color: '#cbd5e1',
  },
});
