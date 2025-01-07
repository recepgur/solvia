import { useCallback, useEffect, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { MessagingService, Message } from '@/services/messaging/MessagingService';
import { useToast } from '@chakra-ui/react';

export const useMessaging = () => {
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const messagingService = new MessagingService(
    connection,
    { publicKey, signTransaction } as any
  );

  const sendMessage = useCallback(
    async (recipientPublicKey: string, content: string) => {
      if (!publicKey) {
        toast({
          title: 'Error',
          description: 'Please connect your wallet first',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      try {
        setLoading(true);
        const signature = await messagingService.sendMessage(
          recipientPublicKey,
          content
        );

        toast({
          title: 'Message Sent',
          description: `Transaction signature: ${signature.slice(0, 8)}...`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });

        // Refresh messages
        fetchMessages();
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message || 'Failed to send message',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      } finally {
        setLoading(false);
      }
    },
    [publicKey, messagingService, toast]
  );

  const fetchMessages = useCallback(async () => {
    if (!publicKey) return;

    try {
      setLoading(true);
      const fetchedMessages = await messagingService.getMessages(
        publicKey.toString()
      );
      setMessages(fetchedMessages);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch messages',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  }, [publicKey, messagingService, toast]);

  useEffect(() => {
    if (publicKey) {
      fetchMessages();

      // Subscribe to new messages
      const subscriptionId = messagingService.subscribeToMessages((message) => {
        setMessages((prev) => [message, ...prev]);
      });

      return () => {
        // Cleanup subscription
        if (subscriptionId) {
          connection.removeAccountChangeListener(subscriptionId);
        }
      };
    }
  }, [publicKey, messagingService, connection]);

  return {
    messages,
    loading,
    sendMessage,
    refreshMessages: fetchMessages,
  };
};
