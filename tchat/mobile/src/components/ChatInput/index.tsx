import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from 'react-native';
import { theme } from '../../constants/theme';
import MediaManager from '../../utils/media';

interface ChatInputProps {
  onSendMessage: (message: string, mediaUri?: string) => void;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage }) => {
  const [message, setMessage] = useState('');
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const mediaManager = React.useRef(new MediaManager()).current;

  const handleSend = () => {
    if (message.trim() || mediaUri) {
      onSendMessage(message.trim(), mediaUri || undefined);
      setMessage('');
      setMediaUri(null);
    }
  };

  const handlePickImage = async () => {
    const result = await mediaManager.pickImage();
    if (result) {
      setMediaUri(result.uri);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        value={message}
        onChangeText={setMessage}
        placeholder="Type your message..."
        placeholderTextColor={theme.colors.textSecondary}
        multiline
      />
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.mediaButton}
          onPress={handlePickImage}
        >
          <Text style={styles.mediaButtonText}>+</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sendButton, !message.trim() && !mediaUri && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!message.trim() && !mediaUri}
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    marginRight: theme.spacing.sm,
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text,
  },
  sendButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: theme.colors.border,
  },
  sendButtonText: {
    color: theme.colors.background,
    fontWeight: 'bold',
    fontSize: theme.typography.body.fontSize,
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mediaButton: {
    backgroundColor: theme.colors.secondary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  mediaButtonText: {
    color: theme.colors.background,
    fontSize: 24,
    fontWeight: 'bold',
  },
});

export default ChatInput;
