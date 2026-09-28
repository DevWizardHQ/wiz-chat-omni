import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Text,
  View,
} from 'react-native';
import { THEME } from '../../theme/colors';
import { useChat } from '../../context/ChatContext';
import { ImageStudioModal } from '../image-studio/ImageStudioModal';

export const InputBar: React.FC = () => {
  const [text, setText] = useState('');
  const [imageStudioVisible, setImageStudioVisible] = useState(false);
  const { sendMessage, sendImagePrompt, isStreaming, abortStream } = useChat();

  const handleSend = () => {
    if (!text.trim() || isStreaming) return;
    sendMessage(text.trim());
    setText('');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.studioButton}
          onPress={() => setImageStudioVisible(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.studioIcon}>🎨</Text>
        </TouchableOpacity>

        <TextInput
          style={styles.textInput}
          placeholder="Message..."
          placeholderTextColor={THEME.textMuted}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={4000}
        />

        {isStreaming ? (
          <TouchableOpacity
            style={[styles.sendButton, styles.stopButton]}
            onPress={abortStream}
            activeOpacity={0.7}
          >
            <Text style={styles.stopIcon}>■</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.sendButton, !text.trim() && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!text.trim()}
            activeOpacity={0.7}
          >
            <Text style={styles.sendIcon}>↑</Text>
          </TouchableOpacity>
        )}
      </View>

      <ImageStudioModal
        visible={imageStudioVisible}
        onClose={() => setImageStudioVisible(false)}
        onGenerate={(prompt, ratio) => {
          sendImagePrompt(prompt, ratio);
        }}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: THEME.bgMain,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
    gap: 8,
  },
  studioButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.bgSurface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: THEME.border,
    marginBottom: 2,
  },
  studioIcon: {
    fontSize: 18,
  },
  textInput: {
    flex: 1,
    backgroundColor: THEME.bgInput,
    color: THEME.textWhite,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 15,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  sendButtonDisabled: {
    backgroundColor: THEME.bgSurfaceHighlight,
    opacity: 0.5,
  },
  stopButton: {
    backgroundColor: THEME.danger,
  },
  sendIcon: {
    color: THEME.textWhite,
    fontSize: 20,
    fontWeight: 'bold',
  },
  stopIcon: {
    color: THEME.textWhite,
    fontSize: 14,
  },
});
