import React, { useState } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

interface OtpModalProps {
  visible: boolean;
  prompt: {
    sessionId: string;
    pluginId: string;
    message: string;
    timeoutSeconds: number;
  } | null;
  onSubmit: (sessionId: string, code: string) => void;
  onCancel: () => void;
}

export const OtpModal: React.FC<OtpModalProps> = ({ visible, prompt, onSubmit, onCancel }) => {
  const [otpCode, setOtpCode] = useState('');

  if (!prompt) return null;

  const handleSubmit = () => {
    if (otpCode.trim().length >= 4) {
      onSubmit(prompt.sessionId, otpCode.trim());
      setOtpCode('');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <View style={styles.iconCircle}>
            <Text style={styles.iconText}>🔐</Text>
          </View>

          <Text style={styles.title}>Interactive OTP Required</Text>
          <Text style={styles.pluginBadge}>Triggered by: {prompt.pluginId}</Text>
          <Text style={styles.message}>{prompt.message}</Text>

          <TextInput
            style={styles.input}
            placeholder="Enter 6-digit OTP"
            placeholderTextColor="#64748b"
            keyboardType="number-pad"
            maxLength={8}
            value={otpCode}
            onChangeText={setOtpCode}
            autoFocus
          />

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
              <Text style={styles.cancelBtnText}>Dismiss</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitBtn, otpCode.trim().length < 4 && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={otpCode.trim().length < 4}
            >
              <Text style={styles.submitBtnText}>Verify & Send to Pi</Text>
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
    maxWidth: 420,
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#38bdf8',
    alignItems: 'center',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconText: {
    fontSize: 28,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 4,
  },
  pluginBadge: {
    fontSize: 12,
    color: '#38bdf8',
    fontWeight: '600',
    marginBottom: 12,
  },
  message: {
    fontSize: 14,
    color: '#cbd5e1',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  input: {
    width: '100%',
    backgroundColor: '#0f172a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    color: '#f8fafc',
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 8,
    textAlign: 'center',
    paddingVertical: 14,
    marginBottom: 20,
  },
  actions: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#334155',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#94a3b8',
    fontWeight: '600',
  },
  submitBtn: {
    flex: 2,
    backgroundColor: '#0284c7',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitBtnDisabled: {
    backgroundColor: '#1e3a5f',
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#ffffff',
    fontWeight: '700',
  },
});
