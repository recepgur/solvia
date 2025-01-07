import { useCallback, useEffect, useState, useMemo } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { ContactDiscoveryService, ContactInfo } from '@/services/contacts/ContactDiscoveryService';
import { useToast } from '@chakra-ui/react';

export const useContacts = () => {
  const { connection } = useConnection();
  const [contacts, setContacts] = useState<ContactInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const contactService = useMemo(() => new ContactDiscoveryService(connection), [connection]);

  const searchContacts = useCallback(async (query: string) => {
    try {
      setLoading(true);
      setError(null);
      const results = await contactService.searchContacts(query);
      setContacts(results);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search contacts';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  }, [contactService, toast]);

  const loadRecentContacts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const recentContacts = await contactService.getRecentContacts();
      setContacts(recentContacts);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load recent contacts';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  }, [contactService, toast]);

  useEffect(() => {
    loadRecentContacts();
  }, [loadRecentContacts]);

  return {
    contacts,
    loading,
    error,
    searchContacts,
    loadRecentContacts,
  };
};
