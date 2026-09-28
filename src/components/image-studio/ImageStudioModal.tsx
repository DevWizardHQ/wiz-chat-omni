import React, { useState } from 'react';
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

interface ImageStudioModalProps {
  visible: boolean;
  onClose: () => void;
  onGenerate: (prompt: string, aspectRatio: '1:1' | '16:9' | '9:16') => void;
}

export const ImageStudioModal: React.FC<ImageStudioModalProps> = ({
  visible,
  onClose,
  onGenerate,
}) => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '16:9' | '9:16'>('1:1');

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    onGenerate(prompt, aspectRatio);
    setPrompt('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={styles.content}>
              <Text style={styles.title}>🎨 Image Studio</Text>
              <Text style={styles.subtitle}>
                Powered by FLUX.1 / Together AI via OmniRoute
              </Text>

              <Text style={styles.label}>Prompt</Text>
              <TextInput
                style={styles.input}
                placeholder="Describe image in detail..."
                placeholderTextColor={THEME.textMuted}
                value={prompt}
                onChangeText={setPrompt}
                multiline
                numberOfLines={4}
              />

              <Text style={styles.label}>Aspect Ratio</Text>
              <View style={styles.aspectRatioRow}>
                {(['1:1', '16:9', '9:16'] as const).map((ratio) => {
                  const isSelected = aspectRatio === ratio;
                  return (
                    <TouchableOpacity
                      key={ratio}
                      style={[styles.ratioChip, isSelected && styles.ratioChipSelected]}
                      onPress={() => setAspectRatio(ratio)}
                    >
                      <Text
                        style={[
                          styles.ratioChipText,
                          isSelected && styles.ratioChipTextSelected,
                        ]}
                      >
                        {ratio}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.generateBtn, !prompt.trim() && styles.disabledBtn]}
                  onPress={handleGenerate}
                  disabled={!prompt.trim()}
                >
                  <Text style={styles.generateBtnText}>Generate</Text>
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
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: THEME.bgSurface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: THEME.textWhite,
  },
  subtitle: {
    fontSize: 12,
    color: THEME.textSecondary,
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
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    textAlignVertical: 'top',
    minHeight: 90,
    borderWidth: 1,
    borderColor: THEME.border,
    marginBottom: 16,
  },
  aspectRatioRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  ratioChip: {
    flex: 1,
    backgroundColor: THEME.bgInput,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.border,
  },
  ratioChipSelected: {
    borderColor: THEME.accentPink,
    backgroundColor: 'rgba(236, 72, 153, 0.15)',
  },
  ratioChipText: {
    color: THEME.textSecondary,
    fontWeight: '600',
  },
  ratioChipTextSelected: {
    color: THEME.accentPink,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: THEME.bgSurfaceHighlight,
  },
  cancelBtnText: {
    color: THEME.textSecondary,
    fontWeight: '600',
  },
  generateBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: THEME.accentPink,
  },
  disabledBtn: {
    opacity: 0.5,
  },
  generateBtnText: {
    color: THEME.textWhite,
    fontWeight: '700',
  },
});
