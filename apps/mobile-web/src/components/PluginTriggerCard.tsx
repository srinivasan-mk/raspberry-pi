import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

interface PluginTriggerProps {
  onTriggerScraper: (target: string, mobileNumber: string) => void;
  onTriggerMessaging: (channel: string, recipient: string, content: string) => void;
  onTriggerPihole?: (action: 'status' | 'enable' | 'disable' | 'update-gravity', durationSeconds?: number) => void;
}

export const PluginTriggerCard: React.FC<PluginTriggerProps> = ({
  onTriggerScraper,
  onTriggerMessaging,
  onTriggerPihole,
}) => {
  const [activeTab, setActiveTab] = useState<'scraper' | 'messaging' | 'pihole'>('scraper');

  // Scraper State
  const [scraperTarget, setScraperTarget] = useState<'jio-airfiber' | 'mock-test'>('jio-airfiber');
  const [mobileNumber, setMobileNumber] = useState('9876543210');

  // Messaging State
  const [channel, setChannel] = useState<'TELEGRAM' | 'WHATSAPP' | 'SMS' | 'MOCK'>('TELEGRAM');
  const [recipient, setRecipient] = useState('');
  const [messageContent, setMessageContent] = useState('Alert from Raspberry Pi 4B');

  // Pi-hole State
  const [piholeAction, setPiholeAction] = useState<'status' | 'enable' | 'disable' | 'update-gravity'>('status');

  return (
    <View style={styles.card}>
      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'scraper' && styles.tabActive]}
          onPress={() => setActiveTab('scraper')}
        >
          <Text style={[styles.tabText, activeTab === 'scraper' && styles.tabTextActive]}>
            🌐 Web Scraper (Playwright)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'messaging' && styles.tabActive]}
          onPress={() => setActiveTab('messaging')}
        >
          <Text style={[styles.tabText, activeTab === 'messaging' && styles.tabTextActive]}>
            💬 Messaging
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'pihole' && styles.tabActive]}
          onPress={() => setActiveTab('pihole')}
        >
          <Text style={[styles.tabText, activeTab === 'pihole' && styles.tabTextActive]}>
            🛡️ Pi-hole
          </Text>
        </TouchableOpacity>
      </View>

      {/* Scraper Tab Content */}
      {activeTab === 'scraper' && (
        <View style={styles.content}>
          <Text style={styles.description}>
            Launches on-demand headless Chromium on the Pi, handles OTP interactive challenge if
            needed, and extracts telecom/broadband usage.
          </Text>

          <Text style={styles.label}>TARGET AUTOMATION</Text>
          <View style={styles.chipRow}>
            {(['jio-airfiber', 'mock-test'] as const).map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.chip, scraperTarget === t && styles.chipActive]}
                onPress={() => setScraperTarget(t)}
              >
                <Text style={[styles.chipText, scraperTarget === t && styles.chipTextActive]}>
                  {t === 'jio-airfiber' ? 'Jio AirFiber Portal' : 'Offline Mock Test'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>MOBILE / ACCOUNT NUMBER</Text>
          <TextInput
            style={styles.input}
            value={mobileNumber}
            onChangeText={setMobileNumber}
            keyboardType="phone-pad"
            placeholder="e.g. 9876543210"
            placeholderTextColor="#64748b"
          />

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => onTriggerScraper(scraperTarget, mobileNumber)}
          >
            <Text style={styles.actionBtnText}>🚀 Trigger Web Scraper on Pi</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Messaging Tab Content */}
      {activeTab === 'messaging' && (
        <View style={styles.content}>
          <Text style={styles.description}>
            Routes alerts via Telegram Bot API, free WhatsApp Web (Baileys), or free SMS via Android
            Gateway.
          </Text>

          <Text style={styles.label}>SELECT CHANNEL</Text>
          <View style={styles.chipRow}>
            {(['TELEGRAM', 'WHATSAPP', 'SMS', 'MOCK'] as const).map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.chip, channel === c && styles.chipActive]}
                onPress={() => setChannel(c)}
              >
                <Text style={[styles.chipText, channel === c && styles.chipTextActive]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>
            {channel === 'TELEGRAM' ? 'TELEGRAM CHAT ID' : 'PHONE NUMBER (E.164)'}
          </Text>
          <TextInput
            style={styles.input}
            value={recipient}
            onChangeText={setRecipient}
            placeholder={channel === 'TELEGRAM' ? 'e.g. 123456789' : '+919876543210'}
            placeholderTextColor="#64748b"
          />

          <Text style={styles.label}>MESSAGE CONTENT</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={messageContent}
            onChangeText={setMessageContent}
            multiline
            placeholder="Type notification text..."
            placeholderTextColor="#64748b"
          />

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => onTriggerMessaging(channel, recipient, messageContent)}
          >
            <Text style={styles.actionBtnText}>📨 Dispatch Alert</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Pi-hole Tab Content */}
      {activeTab === 'pihole' && (
        <View style={styles.content}>
          <Text style={styles.description}>
            Monitor and control the local Pi-hole DNS sinkhole: fetch live blocking metrics, toggle ad-blocking, or synchronize gravity lists over MQTT.
          </Text>

          <Text style={styles.label}>SELECT ACTION</Text>
          <View style={styles.chipRow}>
            {(
              [
                { id: 'status', label: '📊 Query Metrics' },
                { id: 'disable', label: '⏸️ Disable (5m)' },
                { id: 'enable', label: '▶️ Resume Blocking' },
                { id: 'update-gravity', label: '🔄 Update Gravity' },
              ] as const
            ).map((act) => (
              <TouchableOpacity
                key={act.id}
                style={[styles.chip, piholeAction === act.id && styles.chipActive]}
                onPress={() => setPiholeAction(act.id)}
              >
                <Text
                  style={[styles.chipText, piholeAction === act.id && styles.chipTextActive]}
                >
                  {act.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#10b981' }]}
            onPress={() => {
              if (onTriggerPihole) {
                const duration = piholeAction === 'disable' ? 300 : undefined;
                onTriggerPihole(piholeAction, duration);
              }
            }}
          >
            <Text style={styles.actionBtnText}>🛡️ Dispatch Pi-hole Command</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 20,
    overflow: 'hidden',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
  tabActive: {
    backgroundColor: '#1e293b',
    borderBottomWidth: 2,
    borderBottomColor: '#38bdf8',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#38bdf8',
  },
  content: {
    padding: 20,
  },
  description: {
    fontSize: 13,
    color: '#94a3b8',
    marginBottom: 16,
    lineHeight: 18,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 6,
    marginTop: 10,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#0f172a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  chipActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderColor: '#38bdf8',
  },
  chipText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#38bdf8',
  },
  input: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    color: '#f8fafc',
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  textArea: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  actionBtn: {
    backgroundColor: '#0284c7',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 18,
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
