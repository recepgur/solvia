import React, { useState, useEffect } from 'react';
import { StyleSheet, View, TextInput, FlatList, TouchableOpacity } from 'react-native';
import { Text } from 'react-native';
import { Connection, PublicKey } from '@solana/web3.js';
import * as anchor from '@project-serum/anchor';

interface Message {
  id: string;
  text: string;
  sender: string;
  timestamp: number;
}

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [wallet, setWallet] = useState<any>(null);

  useEffect(() => {
    // Phantom wallet connection
    const connectWallet = async () => {
      try {
        // @ts-ignore
        const provider = window.phantom?.solana;
        if (provider?.isPhantom) {
          const response = await provider.connect();
          setWallet(response.publicKey.toString());
        }
      } catch (error) {
        console.error('Wallet connection error:', error);
      }
    };
    connectWallet();
  }, []);

  const sendMessage = async () => {
    if (!newMessage.trim() || !wallet) return;

    try {
      const message: Message = {
        id: Date.now().toString(),
        text: newMessage,
        sender: wallet,
        timestamp: Date.now(),
      };

      // Send message to blockchain
      // TODO: Solana contract integration

      setMessages([...messages, message]);
      setNewMessage('');
    } catch (error) {
      console.error('Message sending error:', error);
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[
            styles.messageContainer,
            item.sender === wallet ? styles.sentMessage : styles.receivedMessage
          ]}>
            <Text style={styles.messageText}>{item.text}</Text>
            <Text style={styles.timestamp}>
              {new Date(item.timestamp).toLocaleTimeString()}
            </Text>
          </View>
        )}
      />
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Type your message..."
          placeholderTextColor="#666"
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  messageContainer: {
    padding: 10,
    marginVertical: 5,
    marginHorizontal: 10,
    maxWidth: '80%',
    borderRadius: 10,
  },
  sentMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
  },
  receivedMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#E5E5EA',
  },
  messageText: {
    color: '#fff',
    fontSize: 16,
  },
  timestamp: {
    color: '#rgba(255,255,255,0.7)',
    fontSize: 12,
    marginTop: 5,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  input: {
    flex: 1,
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    marginRight: 10,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 20,
    justifyContent: 'center',
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
