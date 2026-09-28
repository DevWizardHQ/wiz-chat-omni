import React, { useState } from 'react';
import { SafeAreaView, StatusBar, StyleSheet, View } from 'react-native';
import { THEME } from './src/theme/colors';
import { AuthProvider } from './src/context/AuthContext';
import { ChatProvider, useChat } from './src/context/ChatContext';
import { Header } from './src/components/common/Header';
import { GhostModeBanner } from './src/components/common/GhostModeBanner';
import { MessageList } from './src/components/chat/MessageList';
import { InputBar } from './src/components/chat/InputBar';
import { SlideDrawer } from './src/components/drawer/SlideDrawer';
import { SettingsModal } from './src/components/settings/SettingsModal';
import { ImageLightboxModal } from './src/components/image-studio/ImageLightboxModal';
import { AVAILABLE_MODELS } from './src/services/omniRoute';

const MainScreen: React.FC = () => {
  const {
    messages,
    isStreaming,
    isTemporaryChat,
    selectedModel,
    setSelectedModel,
    toggleTemporaryChat,
  } = useChat();

  const [drawerVisible, setDrawerVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const currentModel =
    AVAILABLE_MODELS.find((m) => m.id === selectedModel) || AVAILABLE_MODELS[0];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.bgMain} />
      <View style={styles.container}>
        <Header
          currentModel={currentModel}
          isTemporaryChat={isTemporaryChat}
          availableModels={AVAILABLE_MODELS}
          onToggleDrawer={() => setDrawerVisible(true)}
          onSelectModel={setSelectedModel}
          onToggleGhostMode={toggleTemporaryChat}
          onOpenSettings={() => setSettingsVisible(true)}
        />

        {isTemporaryChat && <GhostModeBanner />}

        <MessageList
          messages={messages}
          isStreaming={isStreaming}
          onImagePress={(url) => setLightboxUrl(url)}
        />

        <InputBar />

        <SlideDrawer
          visible={drawerVisible}
          onClose={() => setDrawerVisible(false)}
          onOpenSettings={() => setSettingsVisible(true)}
        />

        <SettingsModal
          visible={settingsVisible}
          onClose={() => setSettingsVisible(false)}
        />

        <ImageLightboxModal
          visible={!!lightboxUrl}
          imageUrl={lightboxUrl}
          onClose={() => setLightboxUrl(null)}
        />
      </View>
    </SafeAreaView>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <ChatProvider>
        <MainScreen />
      </ChatProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.bgMain,
  },
  container: {
    flex: 1,
    backgroundColor: THEME.bgMain,
  },
});
