import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { THEME } from '../../theme/colors';
import { ChatModelOption } from '../../types';
import { ModelPickerModal } from './ModelPickerModal';

interface HeaderProps {
  currentModel: ChatModelOption | undefined;
  isTemporaryChat: boolean;
  availableModels: ChatModelOption[];
  onToggleDrawer: () => void;
  onSelectModel: (modelId: string) => void;
  onToggleGhostMode: () => void;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentModel,
  isTemporaryChat,
  availableModels,
  onToggleDrawer,
  onSelectModel,
  onToggleGhostMode,
  onOpenSettings,
}) => {
  const [modelPickerVisible, setModelPickerVisible] = useState(false);

  const handleSelectModel = (modelId: string) => {
    onSelectModel(modelId);
  };

  const getCurrentModelName = () => {
    if (currentModel) {
      return currentModel.name;
    }
    return 'Select Model';
  };

  return (
    <>
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          {/* Drawer Toggle */}
          <TouchableOpacity
            onPress={onToggleDrawer}
            activeOpacity={0.7}
            style={styles.iconButton}
          >
            <Text style={styles.drawerIcon}>☰</Text>
          </TouchableOpacity>

          {/* Model Selector Chip */}
          <TouchableOpacity
            onPress={() => setModelPickerVisible(true)}
            activeOpacity={0.7}
            style={styles.modelChip}
          >
            <Text style={styles.modelChipText}>{getCurrentModelName()}</Text>
            <Text style={styles.modelChipChevron}>▼</Text>
          </TouchableOpacity>

          {/* Right Action Items */}
          <View style={styles.rightActions}>
            {/* Ghost Mode Toggle */}
            <TouchableOpacity
              onPress={onToggleGhostMode}
              activeOpacity={0.7}
              style={[
                styles.iconButton,
                isTemporaryChat && styles.ghostModeActive,
              ]}
            >
              <Text style={styles.ghostIcon}>👻</Text>
            </TouchableOpacity>

            {/* Settings Button */}
            <TouchableOpacity
              onPress={onOpenSettings}
              activeOpacity={0.7}
              style={styles.iconButton}
            >
              <Text style={styles.settingsIcon}>⚙</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      {/* Model Picker Modal */}
      <ModelPickerModal
        visible={modelPickerVisible}
        selectedModel={currentModel?.id || ''}
        models={availableModels}
        onSelectModel={handleSelectModel}
        onClose={() => setModelPickerVisible(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: THEME.bgSurface,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 12,
  },
  iconButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  drawerIcon: {
    fontSize: 20,
    fontWeight: '600',
    color: THEME.textWhite,
  },
  modelChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.bgSurfaceHighlight,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  modelChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.textWhite,
  },
  modelChipChevron: {
    fontSize: 10,
    color: THEME.textSecondary,
    fontWeight: '600',
  },
  rightActions: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  ghostModeActive: {
    backgroundColor: `${THEME.warning}25`,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: THEME.warning,
  },
  ghostIcon: {
    fontSize: 18,
    fontWeight: '600',
  },
  settingsIcon: {
    fontSize: 18,
    fontWeight: '600',
    color: THEME.textWhite,
  },
});
