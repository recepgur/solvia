'use client';

import React from 'react';
import {
  VStack,
  Box,
  Text,
  useColorModeValue,
  Avatar,
  HStack,
} from '@chakra-ui/react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Message } from '@/services/messaging/MessagingService';
import { useTranslations } from 'next-intl';

interface MessageListProps {
  messages: Message[];
}

export const MessageList: React.FC<MessageListProps> = ({ messages }) => {
  const { publicKey } = useWallet();
  const t = useTranslations();
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <VStack
      spacing={4}
      align="stretch"
      flex={1}
      overflowY="auto"
      p={4}
      bg={bgColor}
      borderRadius="md"
      borderWidth="1px"
      borderColor={borderColor}
    >
      {messages.length === 0 ? (
        <Text textAlign="center" color="gray.500">
          {t('common.no_messages')}
        </Text>
      ) : messages.map((message, index) => {
        const isCurrentUser = message.sender === publicKey?.toString();

        return (
          <Box
            key={`${message.timestamp}-${index}`}
            alignSelf={isCurrentUser ? 'flex-end' : 'flex-start'}
            maxW="70%"
          >
            <HStack
              spacing={2}
              align="flex-start"
              flexDirection={isCurrentUser ? 'row-reverse' : 'row'}
            >
              <Avatar
                size="sm"
                name={message.sender.slice(0, 4)}
                src={`https://avatars.dicebear.com/api/identicon/${message.sender}.svg`}
              />
              <Box>
                <Box
                  bg={isCurrentUser ? 'blue.500' : 'gray.100'}
                  color={isCurrentUser ? 'white' : undefined}
                  px={4}
                  py={2}
                  borderRadius="lg"
                  position="relative"
                >
                  <Text fontSize="sm">{message.content}</Text>
                  <Text
                    fontSize="xs"
                    opacity={0.8}
                    textAlign={isCurrentUser ? 'right' : 'left'}
                    mt={1}
                  >
                    {formatTime(message.timestamp)}
                  </Text>
                </Box>
                {!isCurrentUser && (
                  <Text fontSize="xs" color="gray.500" ml={2}>
                    {message.sender.slice(0, 4)}...{message.sender.slice(-4)}
                  </Text>
                )}
              </Box>
            </HStack>
          </Box>
        );
      })}
    </VStack>
  );
};
