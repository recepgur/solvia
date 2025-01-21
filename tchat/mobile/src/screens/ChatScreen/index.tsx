import React, { useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { useWallet } from '../../contexts/WalletContext';
import { useOfflineSync } from '../../hooks';
import { EncryptionService, ApiService } from '../../services';
import ChatInput from '../../components/ChatInput';
import ChatMessage from '../../components/ChatMessage';
import { styles } from './styles';
import type { Message } from '../../types/message';
import MediaManager from '../../utils/media';



type ChatScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Chat'>;

export default function ChatScreen() {
  const navigation = useNavigation<ChatScreenNavigationProp>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [decryptedMessages, setDecryptedMessages] = useState<Message[]>([]);
  const { wallet, loading, error, connect } = useWallet();
  const { syncMessages, syncing } = useOfflineSync();

  // Decrypt messages when they change
  // Sync offline messages when wallet connects
  useEffect(() => {
    const syncOfflineMessages = async () => {
      if (wallet && !syncing) {
        const offlineMessages = await syncMessages();
        if (offlineMessages?.length) {
          setMessages(prev => [...prev, ...offlineMessages]);
        }
      }
    };
    syncOfflineMessages();
  }, [wallet, syncMessages]);

  useEffect(() => {
    const decryptMessages = async () => {
      const decrypted = await Promise.all(
        messages.map(async (message) => {
          if (message.encryption_key && !message.decrypted_content) {
            try {
              const decrypted = await EncryptionService.decryptMessage(
                message.content,
                message.encryption_key
              );
              return { ...message, decrypted_content: decrypted };
            } catch (error) {
              console.error('Message decryption error:', error);
              return message;
            }
          }
          return message;
        })
      );
      setDecryptedMessages(decrypted);
    };

    decryptMessages();
  }, [messages]);

  const mediaManagerRef = React.useRef(new MediaManager());
  
  const handleSendMessage = async (content: string, mediaUri?: string) => {
    if (!wallet || (!content.trim() && !mediaUri)) return;

    try {
      let mediaUrl: string | undefined;
      let mediaType: string | undefined;

      if (mediaUri) {
        const mediaHash = await mediaManagerRef.current.uploadMedia(mediaUri);
        if (mediaHash) {
          mediaUrl = `ipfs://${mediaHash}`;
          // Get media type from the URI
          const extension = mediaUri.split('.').pop()?.toLowerCase();
          mediaType = extension === 'jpg' || extension === 'jpeg' ? 'image/jpeg' :
                     extension === 'png' ? 'image/png' :
                     extension === 'gif' ? 'image/gif' :
                     'image/jpeg';
        }
      }

      // Encrypt message content
      const { encrypted, key } = await EncryptionService.encryptMessage(content || '');

      const message: Message = {
        id: Date.now().toString(),
        content: encrypted,
        sender_id: wallet,
        receiver_id: 'global', // TODO: Replace with actual receiver ID
        timestamp: Date.now(),
        encryption_key: key,
        media_url: mediaUrl,
        media_type: mediaType
      };

      // TODO: Send message to backend
      setMessages(prev => [...prev, message]);

    try {
      // Encrypt message content
      const { encrypted, key } = await EncryptionService.encryptMessage(content);

      const message: Message = {
        id: Date.now().toString(),
        content: encrypted,
        sender_id: wallet,
        receiver_id: 'global', // TODO: Replace with actual receiver ID
        timestamp: Date.now(),
        encryption_key: key,
        media_url: undefined,
        media_type: undefined
      };

      // Send message to backend
      await ApiService.sendMessage(message);
      setMessages(prev => [...prev, message]);
    } catch (error) {
      console.error('Send message error:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.callButton}
          onPress={() => navigation.navigate('Call', { userId: 'test-user', isVideo: true })}
        >
          <Text style={styles.callButtonText}>Video Call</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.callButton}
          onPress={() => navigation.navigate('Call', { userId: 'test-user', isVideo: false })}
        >
          <Text style={styles.callButtonText}>Voice Call</Text>
        </TouchableOpacity>
      </View>
      {loading ? (
        <View style={styles.loadingContainer}>
          <Text>Connecting to wallet...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <>
          <FlatList
            style={styles.messageList}
            data={decryptedMessages}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <ChatMessage
                message={item.decrypted_content || item.content}
                timestamp={item.timestamp}
                isSender={item.sender_id === wallet}
                mediaUrl={item.media_url}
                mediaType={item.media_type}
              />
            )}
            ListEmptyComponent={() => (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No messages yet</Text>
              </View>
            )}
          />
          <ChatInput onSendMessage={handleSendMessage} />
        </>
      )}
    </View>
  );
}
