import React, { useEffect, useRef } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { THEME } from '../../theme/colors';
import { Message } from '../../types';
import { MessageBubble } from './MessageBubble';

interface MessageListProps {
  messages: Message[];
  isStreaming: boolean;
  onImagePress: (url: string) => void;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  isStreaming,
  onImagePress,
}) => {
  const flatListRef = useRef<FlatList<Message>>(null);

  useEffect(() => {
    if (messages.length > 0) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages.length, isStreaming]);

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <MessageBubble message={item} onImagePress={onImagePress} />
        )}
        contentContainerStyle={styles.listContent}
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={11}
        onContentSizeChange={() => {
          if (isStreaming) {
            flatListRef.current?.scrollToEnd({ animated: false });
          }
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.bgMain,
  },
  listContent: {
    paddingVertical: 12,
  },
});
