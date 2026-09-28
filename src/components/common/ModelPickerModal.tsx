import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableWithoutFeedback,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { THEME } from '../../theme/colors';
import { ChatModelOption } from '../../types';

interface ModelPickerModalProps {
  visible: boolean;
  selectedModel: string;
  models: ChatModelOption[];
  onSelectModel: (modelId: string) => void;
  onClose: () => void;
}

export const ModelPickerModal: React.FC<ModelPickerModalProps> = ({
  visible,
  selectedModel,
  models,
  onSelectModel,
  onClose,
}) => {
  const handleSelectModel = (modelId: string) => {
    onSelectModel(modelId);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <SafeAreaView style={styles.container}>
              <View style={styles.header}>
                <Text style={styles.title}>Select Model</Text>
                <TouchableOpacity
                  onPress={onClose}
                  activeOpacity={0.7}
                  style={styles.closeButton}
                >
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.modelList}
                contentContainerStyle={styles.modelListContent}
                showsVerticalScrollIndicator={false}
              >
                {models.map((model) => {
                  const isSelected = model.id === selectedModel;
                  return (
                    <TouchableOpacity
                      key={model.id}
                      style={[
                        styles.modelOption,
                        isSelected && styles.modelOptionSelected,
                      ]}
                      onPress={() => handleSelectModel(model.id)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.modelInfo}>
                        <Text style={styles.modelName}>{model.name}</Text>
                        <Text style={styles.modelProvider}>{model.provider}</Text>
                        <Text style={styles.modelDescription}>
                          {model.description}
                        </Text>
                      </View>
                      {isSelected && (
                        <View style={styles.checkmark}>
                          <Text style={styles.checkmarkIcon}>✓</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </SafeAreaView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: THEME.bgMain,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    borderTopWidth: 1,
    borderTopColor: THEME.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.textWhite,
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 20,
    color: THEME.textSecondary,
    fontWeight: '600',
  },
  modelList: {
    flex: 1,
  },
  modelListContent: {
    padding: 12,
    gap: 12,
  },
  modelOption: {
    backgroundColor: THEME.bgSurface,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.border,
  },
  modelOptionSelected: {
    borderColor: THEME.primary,
    borderWidth: 2,
    backgroundColor: `${THEME.primary}10`,
  },
  modelInfo: {
    flex: 1,
    gap: 4,
  },
  modelName: {
    fontSize: 15,
    fontWeight: '600',
    color: THEME.textWhite,
  },
  modelProvider: {
    fontSize: 12,
    color: THEME.textMuted,
    fontWeight: '500',
  },
  modelDescription: {
    fontSize: 12,
    color: THEME.textSecondary,
    lineHeight: 16,
    marginTop: 4,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: THEME.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  checkmarkIcon: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.textWhite,
  },
});
