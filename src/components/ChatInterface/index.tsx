'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Input,
  HStack,
  Text,
  useColorModeValue,
  IconButton,
  Flex,
  Avatar,
  Spinner,
  useToast,
} from '@chakra-ui/react';
import { useMessaging } from '@/hooks/useMessaging';
import { CallInterface } from '@/components/CallInterface';
import { MessageList } from '@/components/MessageList';
import { ContactList } from '@/components/ContactList';

interface Contact {
  publicKey: string;
  name?: string;
  lastMessage?: string;
  lastMessageTime?: number;
  unreadCount?: number;
  online?: boolean;
}

export const ChatInterface: React.FC = () => {
  const { messages, sendMessage, loading, error } = useMessaging();
  const [newMessage, setNewMessage] = useState('');
  const [showCall, setShowCall] = useState(false);
  const [selectedContact, setSelectedContact] = useState<string | null>(null);
  const toast = useToast();
  
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  // Sample contacts data - replace with actual contacts from your system
  const contacts: Contact[] = [
    {
      publicKey: 'SAMPLE_PUBLIC_KEY',
      name: 'Sample Contact',
      lastMessage: 'Hello there!',
      lastMessageTime: Date.now() - 1000 * 60 * 5,
      unreadCount: 2,
      online: true,
    },
  ];

  useEffect(() => {
    if (error) {
      toast({
        title: 'Error',
        description: error,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  }, [error, toast]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedContact) return;

    try {
      await sendMessage(selectedContact, newMessage);
      setNewMessage('');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      toast({
        title: 'Failed to send message',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  return (
    <Box
      w="full"
      maxW="7xl"
      h="90vh"
      bg={bgColor}
      borderRadius="xl"
      borderWidth="1px"
      borderColor={borderColor}
      overflow="hidden"
    >
      <Flex h="full">
        {/* Contacts List */}
        <ContactList
          contacts={contacts}
          selectedContact={selectedContact}
          onSelectContact={setSelectedContact}
        />

        {/* Chat Area */}
        <Box flex={1} display="flex" flexDirection="column">
          {/* Chat Header */}
          <HStack
            p={4}
            borderBottom="1px"
            borderColor={borderColor}
            justify="space-between"
          >
            <HStack>
              <Avatar
                size="sm"
                name={selectedContact ? selectedContact.slice(0, 4) : 'No Contact'}
                src={selectedContact ? `https://avatars.dicebear.com/api/identicon/${selectedContact}.svg` : undefined}
              />
              <Text fontWeight="bold">
                {selectedContact
                  ? `${selectedContact.slice(0, 4)}...${selectedContact.slice(-4)}`
                  : 'Select a contact'}
              </Text>
            </HStack>
            {selectedContact && (
              <HStack>
                <IconButton
                  aria-label="Voice Call"
                  icon={<span>📞</span>}
                  onClick={() => setShowCall(true)}
                />
                <IconButton
                  aria-label="Video Call"
                  icon={<span>📹</span>}
                  onClick={() => setShowCall(true)}
                />
              </HStack>
            )}
          </HStack>

          {/* Messages Area */}
          {loading ? (
            <Flex flex={1} justify="center" align="center">
              <Spinner size="xl" />
            </Flex>
          ) : showCall ? (
            <Box flex={1} p={4}>
              <CallInterface
                recipientPublicKey={selectedContact || ''}
                onEndCall={() => setShowCall(false)}
              />
            </Box>
          ) : (
            <MessageList messages={messages} />
          )}

          {/* Message Input */}
          {selectedContact && (
            <HStack p={4} borderTop="1px" borderColor={borderColor}>
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSendMessage();
                  }
                }}
              />
              <IconButton
                aria-label="Send Message"
                icon={<span>📤</span>}
                onClick={handleSendMessage}
                isLoading={loading}
              />
            </HStack>
          )}
        </Box>
      </Flex>
    </Box>
  );
};
