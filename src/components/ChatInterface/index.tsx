'use client';

import React, { useState } from 'react';
import { Box, VStack, Input, Button, HStack, Text } from '@chakra-ui/react';
import { useTranslations } from 'next-intl';
import { useMessaging } from '../../hooks/useMessaging';
import MessageList from '../MessageList';

interface ChatInterfaceProps {
  onStartCall: () => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ onStartCall }) => {
  const [message, setMessage] = useState('');
  const { sendMessage, messages } = useMessaging();
  const t = useTranslations('common');

  const handleSend = () => {
    if (message.trim()) {
      sendMessage(message);
      setMessage('');
    }
  };

  return (
    <Box
      w="full"
      h="70vh"
      borderWidth="1px"
      borderRadius="lg"
      overflow="hidden"
      bg="white"
    >
      <VStack h="full" spacing={0}>
        <Box
          w="full"
          p={4}
          borderBottomWidth="1px"
          bg="gray.50"
          display="flex"
          justifyContent="space-between"
          alignItems="center"
        >
          <Text fontSize="lg" fontWeight="bold">
            {t('messages')}
          </Text>
          <Button
            colorScheme="blue"
            size="sm"
            onClick={onStartCall}
          >
            {t('start_call')}
          </Button>
        </Box>

        <MessageList messages={messages} />

        <HStack w="full" p={4} borderTopWidth="1px" spacing={2}>
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t('type_message')}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          />
          <Button onClick={handleSend} colorScheme="blue">
            {t('send')}
          </Button>
        </HStack>
      </VStack>
    </Box>
  );
};

export default ChatInterface;
