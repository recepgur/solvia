'use client';

import React from 'react';
import {
  VStack,
  Box,
  Text,
  Avatar,
  HStack,
  useColorModeValue,
  Badge,
} from '@chakra-ui/react';
import { useTranslations } from 'next-intl';

interface Contact {
  publicKey: string;
  name?: string;
  lastMessage?: string;
  lastMessageTime?: number;
  unreadCount?: number;
  online?: boolean;
}

interface ContactListProps {
  contacts: Contact[];
  selectedContact?: string;
  onSelectContact: (publicKey: string) => void;
}

export const ContactList: React.FC<ContactListProps> = ({
  contacts,
  selectedContact,
  onSelectContact,
}) => {
  const t = useTranslations();
  const bgColor = useColorModeValue('white', 'gray.800');
  const hoverBgColor = useColorModeValue('gray.50', 'gray.700');
  const selectedBgColor = useColorModeValue('gray.100', 'gray.600');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  const formatTime = (timestamp?: number) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <VStack
      spacing={0}
      align="stretch"
      w="300px"
      borderRight="1px"
      borderColor={borderColor}
      bg={bgColor}
      overflowY="auto"
    >
      {contacts.length === 0 ? (
        <Box p={4} textAlign="center">
          <Text color="gray.500">{t('common.no_contacts')}</Text>
        </Box>
      ) : contacts.map((contact) => (
        <Box
          key={contact.publicKey}
          p={4}
          cursor="pointer"
          onClick={() => onSelectContact(contact.publicKey)}
          bg={contact.publicKey === selectedContact ? selectedBgColor : bgColor}
          _hover={{ bg: hoverBgColor }}
          borderBottom="1px"
          borderColor={borderColor}
          position="relative"
        >
          <HStack spacing={3}>
            <Box position="relative">
              <Avatar
                size="md"
                name={contact.name || contact.publicKey.slice(0, 4)}
                src={`https://avatars.dicebear.com/api/identicon/${contact.publicKey}.svg`}
              />
              {contact.online && (
                <Badge
                  position="absolute"
                  bottom="0"
                  right="0"
                  bg="green.500"
                  borderRadius="full"
                  boxSize="3"
                  border="2px solid white"
                />
              )}
            </Box>
            <Box flex={1}>
              <HStack justify="space-between" mb={1}>
                <Text fontWeight="bold" fontSize="sm">
                  {contact.name || `${contact.publicKey.slice(0, 4)}...${contact.publicKey.slice(-4)}`}
                </Text>
                {contact.lastMessageTime && (
                  <Text fontSize="xs" color="gray.500">
                    {formatTime(contact.lastMessageTime)}
                  </Text>
                )}
              </HStack>
              {contact.lastMessage && (
                <Text fontSize="sm" color="gray.500" noOfLines={1}>
                  {contact.lastMessage}
                </Text>
              )}
            </Box>
            {contact.unreadCount && contact.unreadCount > 0 && (
              <Badge
                colorScheme="blue"
                borderRadius="full"
                px={2}
                py={1}
                fontSize="xs"
              >
                {contact.unreadCount}
              </Badge>
            )}
          </HStack>
        </Box>
      ))}
    </VStack>
  );
};
