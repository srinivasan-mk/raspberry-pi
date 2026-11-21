import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
  Text,
  StatusBar,
  Platform,
} from 'react-native';
import { mqttService, DEFAULT_BROKER_CONFIG, BrokerConfig } from './src/services/mqttService';
import { TelemetryHeader } from './src/components/TelemetryHeader';
import { PluginTriggerCard } from './src/components/PluginTriggerCard';
import { OtpModal } from './src/components/OtpModal';
import { BrokerSettingsModal } from './src/components/BrokerSettingsModal';
import { ResultFeed, ResultItem } from './src/components/ResultFeed';

const getInitialBrokerConfig = (): BrokerConfig => {
  if (typeof window !== 'undefined' && window.localStorage) {
    const saved = window.localStorage.getItem('PI_BROKER_CONFIG');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
  }
  return DEFAULT_BROKER_CONFIG;
};

export default function App() {
  const [brokerConfig, setBrokerConfig] = useState<BrokerConfig>(getInitialBrokerConfig);
  const [mqttConnected, setMqttConnected] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);

  // Live Pi Telemetry
  const [telemetry, setTelemetry] = useState<any>(null);

  // Interactive OTP Prompt State
  const [otpPrompt, setOtpPrompt] = useState<{
    sessionId: string;
    pluginId: string;
    message: string;
    timeoutSeconds: number;
  } | null>(null);

  // Execution Results Stream
  const [results, setResults] = useState<ResultItem[]>([]);

  useEffect(() => {
    // 1. Configure and connect MQTT service
    mqttService.configure(brokerConfig);
    mqttService.connect(
      () => setMqttConnected(true),
      () => setMqttConnected(false)
    );

    // 2. Subscribe to incoming MQTT messages
    const unsubscribe = mqttService.subscribe((topic, payload) => {
      // Telemetry
      if (topic === 'pi/telemetry/health') {
        setTelemetry(payload);
      }

      // Interactive OTP Prompt: pi/interactive/{sessionId}/prompt
      else if (topic.startsWith('pi/interactive/') && topic.endsWith('/prompt')) {
        console.log('[App] Received interactive OTP prompt:', payload);
        setOtpPrompt({
          sessionId: payload.sessionId,
          pluginId: payload.pluginId || 'web-scraper',
          message: payload.message || 'Please enter the verification code',
          timeoutSeconds: payload.timeoutSeconds || 120,
        });
      }

      // Execution Result: pi/events/{pluginId}/result
      else if (topic.startsWith('pi/events/') && topic.endsWith('/result')) {
        console.log('[App] Received execution result:', payload);
        setResults((prev) => [payload as ResultItem, ...prev]);
      }
    });

    return () => {
      unsubscribe();
      mqttService.disconnect();
    };
  }, [brokerConfig]);

  // Handlers
  const handleTriggerScraper = (target: string, mobileNumber: string) => {
    mqttService.publishCommand('web-scraper', 'fetch-usage', {
      target,
      credentials: { mobileNumber },
      options: { mode: 'cloud' },
    });
  };

  const handleTriggerMessaging = (channel: string, recipient: string, content: string) => {
    mqttService.publishCommand('messaging', 'send', {
      channel,
      recipient,
      content,
    });
  };

  const handleTriggerPihole = (action: string, durationSeconds?: number) => {
    mqttService.publishCommand('pihole', action, {
      action,
      durationSeconds,
    });
  };

  const handleOtpSubmit = (sessionId: string, code: string) => {
    mqttService.sendInteractiveResponse(sessionId, code);
    setOtpPrompt(null);
  };

  const handleSaveSettings = (newConfig: BrokerConfig) => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('PI_BROKER_CONFIG', JSON.stringify(newConfig));
    }
    setBrokerConfig(newConfig);
    mqttService.disconnect();
    setMqttConnected(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* App Title Header */}
        <View style={styles.topBar}>
          <Text style={styles.appLogo}>⚡ Pi Orchestrator</Text>
          <Text style={styles.appSub}>Edge Service Bus Client</Text>
        </View>

        {/* Live Telemetry Card */}
        <TelemetryHeader
          telemetry={telemetry}
          mqttConnected={mqttConnected}
          onOpenSettings={() => setSettingsVisible(true)}
        />

        {/* Plugin Trigger Center */}
        <PluginTriggerCard
          onTriggerScraper={handleTriggerScraper}
          onTriggerMessaging={handleTriggerMessaging}
          onTriggerPihole={handleTriggerPihole}
        />

        {/* Results Stream */}
        <ResultFeed results={results} />
      </ScrollView>

      {/* Interactive OTP Modal */}
      <OtpModal
        visible={otpPrompt !== null}
        prompt={otpPrompt}
        onSubmit={handleOtpSubmit}
        onCancel={() => setOtpPrompt(null)}
      />

      {/* Broker Settings Modal */}
      <BrokerSettingsModal
        visible={settingsVisible}
        currentConfig={brokerConfig}
        onSave={handleSaveSettings}
        onClose={() => setSettingsVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  scrollContent: {
    padding: 16,
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
  },
  topBar: {
    marginBottom: 20,
    marginTop: Platform.OS === 'android' ? 24 : 8,
  },
  appLogo: {
    fontSize: 26,
    fontWeight: '800',
    color: '#38bdf8',
    letterSpacing: -0.5,
  },
  appSub: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
});
