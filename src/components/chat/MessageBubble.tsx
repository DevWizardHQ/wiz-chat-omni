import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { THEME } from '../../theme/colors';
import { Message } from '../../types';

interface MessageBubbleProps {
  message: Message;
  onImagePress?: (url: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, onImagePress }) => {
  const isUser = message.role === 'user';

  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.assistantContainer]}>
      {!isUser && (
        <View style={styles.botAvatar}>
          <Text style={styles.botAvatarText}>⚡</Text>
        </View>
      )}

      <View
        style={[
          styles.bubble,
          isUser ? styles.userBubble : styles.assistantBubble,
          message.isError && styles.errorBubble,
        ]}
      >
        {message.is_image_result && message.image_url ? (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => onImagePress && onImagePress(message.image_url!)}
          >
            <Image
              source={{ uri: message.image_url }}
              style={styles.imageResult}
              resizeMode="cover"
            />
            <Text style={styles.imagePromptText}>{message.content}</Text>
          </TouchableOpacity>
        ) : (
          <Text
            style={[
              styles.messageText,
              isUser ? styles.userText : styles.assistantText,
              message.isError && styles.errorText,
            ]}
            selectable
          >
            {message.content}
          </Text>
        )}

        {message.isOptimistic && !message.content && !message.is_image_result && (
          <View style={styles.typingIndicator}>
            <Text style={styles.typingDot}>●</Text>
            <Text style={styles.typingDot}>●</Text>
            <Text style={styles.typingDot}>●</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginVertical: 6,
    paddingHorizontal: 12,
  },
  userContainer: {
    justifyContent: 'flex-end',
  },
  assistantContainer: {
    justifyContent: 'flex-start',
  },
  botAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: THEME.bgSurfaceHighlight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginTop: 4,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  botAvatarText: {
    fontSize: 14,
  },
  bubble: {
    maxWidth: '82%',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: THEME.primary,
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: THEME.bgSurface,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  errorBubble: {
    borderColor: THEME.danger,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userText: {
    color: THEME.textWhite,
  },
  assistantText: {
    color: THEME.textWhite,
  },
  errorText: {
    color: THEME.danger,
  },
  imageResult: {
    width: 240,
    height: 240,
    borderRadius: 12,
    marginBottom: 6,
  },
  imagePromptText: {
    color: THEME.textSecondary,
    fontSize: 12,
  },
  typingIndicator: {
    flexDirection: 'row',
    gap: 4,
    paddingVertical: 4,
  },
  typingDot: {
    color: THEME.textSecondary,
    fontSize: 10,
  },
});
