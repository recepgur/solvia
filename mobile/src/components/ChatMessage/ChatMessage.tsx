import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ChatMessageProps {
  message: string;
  timestamp: number;
  isSender: boolean;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, timestamp, isSender }) => {
  return (
    <View style={[
      styles.container,
      isSender ? styles.senderContainer : styles.receiverContainer
    ]}>
      <Text style={[
        styles.messageText,
        isSender ? styles.senderText : styles.receiverText
      ]}>
        {message}
      </Text>
      <Text style={styles.timestamp}>
        {new Date(timestamp).toLocaleTimeString()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    maxWidth: '80%',
    padding: 10,
    marginVertical: 5,
    marginHorizontal: 10,
    borderRadius: 10,
  },
  senderContainer: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
  },
  receiverContainer: {
    alignSelf: 'flex-start',
    backgroundColor: '#E5E5EA',
  },
  messageText: {
    fontSize: 16,
  },
  senderText: {
    color: '#FFFFFF',
  },
  receiverText: {
    color: '#000000',
  },
  timestamp: {
    fontSize: 12,
    marginTop: 5,
    color: 'rgba(0, 0, 0, 0.5)',
  },
});

export default ChatMessage;
