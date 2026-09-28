import React, { useEffect, useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { THEME } from '../../theme/colors';
import { getOmniRouteConfig, saveOmniRouteConfig } from '../../services/secureStorage';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ visible, onClose }) => {
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (visible) {
      getOmniRouteConfig().then((cfg) => {
        setBaseUrl(cfg.baseUrl);
        setApiKey(cfg.apiKey);
        setIsSaved(false);
      });
    }
  }, [visible]);

  const handleSave = async () => {
    await saveOmniRouteConfig({
      baseUrl: baseUrl.trim() || 'https://api.omniroute.io/v1',
      apiKey: apiKey.trim(),
    });
    setIsSaved(true);
    setTimeout(() => {
      onClose();
    }, 600);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={styles.content}>
              <Text style={styles.title}>Settings & Gateway</Text>

              <Text style={styles.label}>OmniRoute Base URL</Text>
              <TextInput
                style={styles.input}
                value={baseUrl}
                onChangeText={setBaseUrl}
                placeholder="https://api.omniroute.io/v1"
                placeholderTextColor={THEME.textMuted}
                autoCapitalize="none"
              />

              <Text style={styles.label}>OmniRoute API Key (Stored securely)</Text>
              <TextInput
                style={styles.input}
                value={apiKey}
                onChangeText={setApiKey}
                placeholder="Bearer token or OmniRoute key"
                placeholderTextColor={THEME.textMuted}
                secureTextEntry
                autoCapitalize="none"
              />

              {isSaved && <Text style={styles.savedMessage}>✓ Configuration saved securely</Text>}

              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                  <Text style={styles.saveText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 20,
  },
  content: {
    backgroundColor: THEME.bgSurface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.textWhite,
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.textSecondary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: THEME.bgInput,
    color: THEME.textWhite,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: THEME.border,
    marginBottom: 14,
  },
  savedMessage: {
    color: THEME.primary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: THEME.bgSurfaceHighlight,
  },
  cancelText: {
    color: THEME.textSecondary,
    fontWeight: '600',
  },
  saveButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: THEME.primary,
  },
  saveText: {
    color: THEME.textWhite,
    fontWeight: '700',
  },
});
