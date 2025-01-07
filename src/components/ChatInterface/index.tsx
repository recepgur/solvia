'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Input,
  Button,
  VStack,
  HStack,
  Text,
  useColorModeValue,
  IconButton,
  Flex,
  Avatar,
} from '@chakra-ui/react';
import { useMessaging } from '@/hooks/useMessaging';
import { CallInterface } from '@/components/CallInterface';
import { useWallet } from '@solana/wallet-adapter-react';

interface Message {
  sender: string;
  content: string;
  timestamp: number;
}

export const ChatInterface: React.FC = () => {
  const { publicKey } = useWallet();
  const { messages, sendMessage, loading } = useMessaging();
  const [newMessage, setNewMessage] = useState('');
  const [showCall, setShowCall] = useState(false);
  const [selectedContact, setSelectedContact] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedContact) return;

    await sendMessage(selectedContact, newMessage);
    setNewMessage('');
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
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
        <Box
          w="300px"
          borderRight="1px"
          borderColor={borderColor}
          overflowY="auto"
        >
          <VStack spacing={0} align="stretch">
            {/* Add contact list items here */}
            <Box
              p={4}
              cursor="pointer"
              _hover={{ bg: 'gray.100' }}
              onClick={() => setSelectedContact('SAMPLE_PUBLIC_KEY')}
              bg={selectedContact === 'SAMPLE_PUBLIC_KEY' ? 'gray.100' : undefined}
            >
              <HStack spacing={3}>
                <Avatar size="sm" name="Sample Contact" />
                <VStack align="start" spacing={0}>
                  <Text fontWeight="bold">Sample Contact</Text>
                  <Text fontSize="sm" color="gray.500">
                    Last message...
                  </Text>
                </VStack>
              </HStack>
            </Box>
          </VStack>
        </Box>

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
              <Avatar size="sm" name="Current Contact" />
              <Text fontWeight="bold">Current Contact</Text>
            </HStack>
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
          </HStack>

          {/* Messages Area */}
          {showCall ? (
            <Box flex={1} p={4}>
              <CallInterface
                recipientPublicKey={selectedContact || ''}
                onEndCall={() => setShowCall(false)}
              />
            </Box>
          ) : (
            <VStack flex={1} p={4} overflowY="auto" spacing={4} align="stretch">
              {messages.map((msg, index) => (
                <Box
                  key={index}
                  alignSelf={
                    msg.sender === publicKey?.toString() ? 'flex-end' : 'flex-start'
                  }
                  maxW="70%"
                >
                  <Box
                    bg={
                      msg.sender === publicKey?.toString()
                        ? 'blue.500'
                        : useColorModeValue('gray.100', 'gray.700')
                    }
                    color={
                      msg.sender === publicKey?.toString() ? 'white' : undefined
                    }
                    p={3}
                    borderRadius="lg"
                  >
                    <Text>{msg.content}</Text>
                    <Text fontSize="xs" textAlign="right" mt={1} opacity={0.8}>
                      {formatTime(msg.timestamp)}
                    </Text>
                  </Box>
                </Box>
              ))}
              <div ref={messagesEndRef} />
            </VStack>
          )}

          {/* Message Input */}
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
        </Box>
      </Flex>
    </Box>
  );
};
