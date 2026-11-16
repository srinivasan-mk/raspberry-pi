import React, { useState } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { BrokerConfig } from '../services/mqttService';

interface BrokerSettingsProps {
  visible: boolean;
  currentConfig: BrokerConfig;
  onSave: (config: BrokerConfig) => void;
  onClose: () => void;
}

export const BrokerSettingsModal: React.FC<BrokerSettingsProps> = ({
  visible,
  currentConfig,
  onSave,
  onClose,
}) => {
  const [host, setHost] = useState(currentConfig.host);
  const [port, setPort] = useState(String(currentConfig.port));
  const [username, setUsername] = useState(currentConfig.username);
  const [password, setPassword] = useState(currentConfig.password);

  React.useEffect(() => {
    if (visible) {
      setHost(currentConfig.host);
      setPort(String(currentConfig.port));
      setUsername(currentConfig.username);
      setPassword(currentConfig.password);
    }
  }, [visible, currentConfig]);

  const handleSave = () => {
    onSave({
      ...currentConfig,
      host: host.trim(),
      port: Number(port.trim()) || 8084,
      username: username.trim(),
      password: password.trim(),
      useSSL: true,
    });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <Text style={styles.title}>EMQX Cloud Broker Settings</Text>
          <Text style={styles.subtitle}>Configure MQTT over WebSockets (WSS Port 8084)</Text>

          <ScrollView style={styles.form}>
            <Text style={styles.label}>CLUSTER HOST (e.g., xxx.emqx.cloud)</Text>
            <TextInput
              style={styles.input}
              value={host}
              onChangeText={setHost}
              placeholder="your-deployment.emqx.cloud"
              placeholderTextColor="#64748b"
              autoCapitalize="none"
            />

            <Text style={styles.label}>WEBSOCKETS PORT (Default: 8884)</Text>
            <TextInput
              style={styles.input}
              value={port}
              onChangeText={setPort}
              keyboardType="number-pad"
              placeholder="8884"
              placeholderTextColor="#64748b"
            />

            <Text style={styles.label}>MQTT USERNAME</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder="web_client"
              placeholderTextColor="#64748b"
              autoCapitalize="none"
            />

            <Text style={styles.label}>MQTT PASSWORD</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="••••••••"
              placeholderTextColor="#64748b"
            />
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>Save & Connect</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialog: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#94a3b8',
    marginBottom: 20,
  },
  form: {
    maxHeight: 320,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 6,
    marginTop: 10,
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
  actions: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#334155',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#94a3b8',
    fontWeight: '600',
  },
  saveBtn: {
    flex: 2,
    backgroundColor: '#0284c7',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#ffffff',
    fontWeight: '700',
  },
});
