import React, { useState } from 'react';
import {
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { THEME } from '../../theme/colors';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import { CustomModal } from '../common/CustomModal';
import { Conversation } from '../../types';

const DRAWER_WIDTH = Dimensions.get('window').width * 0.82;

interface SlideDrawerProps {
  visible: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
}

export const SlideDrawer: React.FC<SlideDrawerProps> = ({
  visible,
  onClose,
  onOpenSettings,
}) => {
  const {
    conversations,
    currentConversationId,
    searchQuery,
    setSearchQuery,
    switchConversation,
    createNewChat,
    deleteConversation,
    togglePinConversation,
    isTemporaryChat,
  } = useChat();

  const { user, isGuest, signOut } = useAuth();
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [signOutModalVisible, setSignOutModalVisible] = useState<boolean>(false);

  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pinnedList = filteredConversations.filter((c) => c.is_pinned);
  const recentList = filteredConversations.filter((c) => !c.is_pinned);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={styles.drawer}>
              {/* Header */}
              <View style={styles.drawerHeader}>
                <TouchableOpacity
                  style={styles.newChatButton}
                  onPress={() => {
                    createNewChat();
                    onClose();
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.newChatIcon}>+</Text>
                  <Text style={styles.newChatText}>New Chat</Text>
                </TouchableOpacity>
              </View>

              {/* Search Bar */}
              <View style={styles.searchContainer}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search conversations..."
                  placeholderTextColor={THEME.textMuted}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>

              {/* Chat Lists */}
              <ScrollView style={styles.scrollList}>
                {isTemporaryChat && (
                  <View style={styles.ghostNoticeCard}>
                    <Text style={styles.ghostNoticeTitle}>👻 Ghost Mode Active</Text>
                    <Text style={styles.ghostNoticeBody}>
                      History storage is disabled while temporary chat is on.
                    </Text>
                  </View>
                )}

                {pinnedList.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>PINNED</Text>
                    {pinnedList.map((conv) => (
                      <ConversationItem
                        key={conv.id}
                        conversation={conv}
                        isActive={conv.id === currentConversationId}
                        onSelect={() => {
                          switchConversation(conv.id);
                          onClose();
                        }}
                        onPin={() => togglePinConversation(conv.id)}
                        onDelete={() => setDeleteTargetId(conv.id)}
                      />
                    ))}
                  </View>
                )}

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>RECENT</Text>
                  {recentList.length === 0 ? (
                    <Text style={styles.emptyText}>No conversations found</Text>
                  ) : (
                    recentList.map((conv) => (
                      <ConversationItem
                        key={conv.id}
                        conversation={conv}
                        isActive={conv.id === currentConversationId}
                        onSelect={() => {
                          switchConversation(conv.id);
                          onClose();
                        }}
                        onPin={() => togglePinConversation(conv.id)}
                        onDelete={() => setDeleteTargetId(conv.id)}
                      />
                    ))
                  )}
                </View>
              </ScrollView>

              {/* Footer / Account */}
              <View style={styles.footer}>
                <TouchableOpacity
                  style={styles.footerRow}
                  onPress={() => {
                    onOpenSettings();
                    onClose();
                  }}
                >
                  <Text style={styles.footerIcon}>⚙</Text>
                  <Text style={styles.footerText}>Settings & API Keys</Text>
                </TouchableOpacity>

                {!isGuest && user && (
                  <TouchableOpacity
                    style={styles.footerRow}
                    onPress={() => setSignOutModalVisible(true)}
                  >
                    <Text style={styles.footerIcon}>🚪</Text>
                    <Text style={[styles.footerText, { color: THEME.danger }]}>Sign Out</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>

      {/* Delete Chat Confirmation Modal */}
      <CustomModal
        visible={!!deleteTargetId}
        title="Delete Conversation"
        message="Are you sure you want to delete this chat? This cannot be undone."
        confirmText="Delete"
        isDestructive
        onConfirm={() => {
          if (deleteTargetId) {
            deleteConversation(deleteTargetId);
            setDeleteTargetId(null);
          }
        }}
        onCancel={() => setDeleteTargetId(null)}
      />

      {/* Sign Out Confirmation Modal */}
      <CustomModal
        visible={signOutModalVisible}
        title="Sign Out"
        message="Are you sure you want to sign out of your account?"
        confirmText="Sign Out"
        isDestructive
        onConfirm={async () => {
          setSignOutModalVisible(false);
          await signOut();
          onClose();
        }}
        onCancel={() => setSignOutModalVisible(false)}
      />
    </Modal>
  );
};

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onSelect: () => void;
  onPin: () => void;
  onDelete: () => void;
}

const ConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
  isActive,
  onSelect,
  onPin,
  onDelete,
}) => {
  return (
    <TouchableOpacity
      style={[styles.itemContainer, isActive && styles.itemActive]}
      onPress={onSelect}
      activeOpacity={0.7}
    >
      <Text style={[styles.itemText, isActive && styles.itemTextActive]} numberOfLines={1}>
        {conversation.title}
      </Text>
      <View style={styles.itemActions}>
        <TouchableOpacity onPress={onPin} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.actionIcon}>{conversation.is_pinned ? '★' : '☆'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={[styles.actionIcon, { color: THEME.danger }]}>✕</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  drawer: {
    width: DRAWER_WIDTH,
    height: '100%',
    backgroundColor: THEME.bgSurface,
    borderRightWidth: 1,
    borderRightColor: THEME.border,
    paddingTop: 48,
    paddingBottom: 24,
  },
  drawerHeader: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  newChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 8,
  },
  newChatIcon: {
    color: THEME.textWhite,
    fontSize: 18,
    fontWeight: 'bold',
  },
  newChatText: {
    color: THEME.textWhite,
    fontWeight: '700',
    fontSize: 15,
  },
  searchContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  searchInput: {
    backgroundColor: THEME.bgInput,
    color: THEME.textWhite,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    fontSize: 13,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  scrollList: {
    flex: 1,
    paddingHorizontal: 12,
  },
  ghostNoticeCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: THEME.warning,
    marginBottom: 12,
  },
  ghostNoticeTitle: {
    color: THEME.warning,
    fontWeight: '700',
    fontSize: 12,
    marginBottom: 2,
  },
  ghostNoticeBody: {
    color: THEME.textSecondary,
    fontSize: 11,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.textMuted,
    marginBottom: 6,
    paddingLeft: 8,
  },
  emptyText: {
    color: THEME.textMuted,
    fontSize: 12,
    paddingLeft: 8,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 4,
  },
  itemActive: {
    backgroundColor: THEME.bgSurfaceHighlight,
  },
  itemText: {
    color: THEME.textSecondary,
    fontSize: 14,
    flex: 1,
    marginRight: 8,
  },
  itemTextActive: {
    color: THEME.textWhite,
    fontWeight: '600',
  },
  itemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionIcon: {
    color: THEME.textMuted,
    fontSize: 14,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: THEME.border,
    paddingTop: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  footerIcon: {
    fontSize: 16,
    color: THEME.textSecondary,
  },
  footerText: {
    color: THEME.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
});
