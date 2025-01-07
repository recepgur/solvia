'use client';

import React from 'react';
import { VStack, Box, Text } from '@chakra-ui/react';
import { useWallet } from '@/contexts/WalletContext';

interface Message {
  id: string;
  content: string;
  sender: string;
  timestamp: number;
}

interface MessageListProps {
  messages: Message[];
}

const MessageList: React.FC<MessageListProps> = ({ messages }) => {
  const { publicKey } = useWallet();

  return (
    <VStack
      flex={1}
      w="full"
      p={4}
      spacing={4}
      overflowY="auto"
      css={{
        '&::-webkit-scrollbar': {
          width: '4px',
        },
        '&::-webkit-scrollbar-track': {
          width: '6px',
        },
        '&::-webkit-scrollbar-thumb': {
          background: 'gray.200',
          borderRadius: '24px',
        },
      }}
    >
      {messages.map((message) => (
        <Box
          key={message.id}
          alignSelf={message.sender === publicKey ? 'flex-end' : 'flex-start'}
          maxW="70%"
          bg={message.sender === publicKey ? 'blue.500' : 'gray.100'}
          color={message.sender === publicKey ? 'white' : 'black'}
          p={3}
          borderRadius="lg"
        >
          <Text>{message.content}</Text>
          <Text
            fontSize="xs"
            color={message.sender === publicKey ? 'whiteAlpha.700' : 'gray.500'}
            textAlign="right"
            mt={1}
          >
            {new Date(message.timestamp).toLocaleTimeString()}
          </Text>
        </Box>
      ))}
    </VStack>
  );
};

export default MessageList;
