import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { theme } from '../../constants/theme';

interface ChatMessageProps {
  message: string;
  timestamp: number;
  isSender: boolean;
  mediaUrl?: string | undefined;
  mediaType?: string | undefined;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, timestamp, isSender, mediaUrl, mediaType }) => {
  const renderMedia = () => {
    if (!mediaUrl || !mediaType) return null;
    
    if (mediaType.startsWith('image')) {
      return (
        <Image
          source={{ uri: mediaUrl.replace('ipfs://', 'http://localhost:8080/ipfs/') }}
          style={styles.mediaImage}
          resizeMode="cover"
        />
      );
    }
    return null;
  };

  return (
    <View style={[
      styles.container,
      isSender ? styles.senderContainer : styles.receiverContainer
    ]}>
      {renderMedia()}
      {message && (
        <Text style={[
          styles.messageText,
          isSender ? styles.senderText : styles.receiverText
        ]}>
          {message}
        </Text>
      )}
      <Text style={[
        styles.timestamp,
        isSender ? styles.senderTimestamp : styles.receiverTimestamp
      ]}>
        {new Date(timestamp).toLocaleTimeString()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    maxWidth: '80%',
    padding: theme.spacing.md,
    marginVertical: theme.spacing.xs,
    marginHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
  },
  senderContainer: {
    alignSelf: 'flex-end',
    backgroundColor: theme.colors.primary,
  },
  receiverContainer: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.border,
  },
  messageText: {
    fontSize: theme.typography.body.fontSize,
  },
  senderText: {
    color: theme.colors.background,
  },
  receiverText: {
    color: theme.colors.text,
  },
  timestamp: {
    fontSize: theme.typography.caption.fontSize,
    marginTop: theme.spacing.xs,
  },
  mediaImage: {
    width: '100%',
    height: 200,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
  },
  senderTimestamp: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  receiverTimestamp: {
    color: theme.colors.textSecondary,
  },
});

export default ChatMessage;
