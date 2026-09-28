import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { THEME } from '../../theme/colors';

interface GhostModeBannerProps {
  visible?: boolean;
}

export const GhostModeBanner: React.FC<GhostModeBannerProps> = ({ visible = true }) => {
  if (!visible) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.badge}>TEMPORARY CHAT</Text>
      <Text style={styles.text}>
        Messages in this session will not be saved. Toggle ghost mode off to save conversations.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: `${THEME.warning}15`,
    borderLeftWidth: 4,
    borderLeftColor: THEME.warning,
    padding: 12,
    gap: 6,
  },
  badge: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.warning,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  text: {
    fontSize: 13,
    color: THEME.textSecondary,
    lineHeight: 18,
  },
});
