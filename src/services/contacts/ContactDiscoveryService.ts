import { Connection, PublicKey } from '@solana/web3.js';
import { NameRegistryState } from '@solana/spl-name-service';

export interface ContactInfo {
  publicKey: string;
  displayName?: string;
  domainName?: string;
  avatar?: string;
  lastSeen?: number;
}

export class ContactDiscoveryService {
  private connection: Connection;

  constructor(connection: Connection) {
    this.connection = connection;
  }

  async resolveNameService(domain: string): Promise<ContactInfo | null> {
    try {
      // Convert domain to bytes
      const hashedDomain = await NameRegistryState.hashedName(domain);
      
      // Find the name account
      const [nameAccountKey] = await NameRegistryState.findOwner(
        hashedDomain,
        undefined,
        new PublicKey('58PwtjSDuFHuUkYjH9BYnnQKHfwo9reZhC2zMJv9JPkx') // SNS Program ID
      );

      // Fetch the registry state
      const registry = await NameRegistryState.retrieve(
        this.connection,
        nameAccountKey
      );

      if (!registry) {
        return null;
      }

      return {
        publicKey: registry.owner.toBase58(),
        displayName: domain,
        domainName: domain,
        lastSeen: Date.now(),
      };
    } catch (error) {
      console.error('Error resolving SNS domain:', error);
      return null;
    }
  }

  async searchContacts(query: string): Promise<ContactInfo[]> {
    try {
      const contacts: ContactInfo[] = [];

      // If query looks like a domain name
      if (query.includes('.sol')) {
        const contact = await this.resolveNameService(query);
        if (contact) {
          contacts.push(contact);
        }
      }

      // If query looks like a public key
      if (query.length === 44 || query.length === 43) {
        try {
          const pubkey = new PublicKey(query);
          // Reverse lookup SNS domains for this public key
          const domains = await this.reverseLookup(pubkey);
          
          contacts.push({
            publicKey: pubkey.toBase58(),
            displayName: domains[0] || query.slice(0, 4) + '...' + query.slice(-4),
            domainName: domains[0],
            lastSeen: Date.now(),
          });
        } catch {
          // Invalid public key format
        }
      }

      return contacts;
    } catch (error) {
      console.error('Error searching contacts:', error);
      return [];
    }
  }

  private async reverseLookup(publicKey: PublicKey): Promise<string[]> {
    try {
      // Find all name accounts owned by this public key
      const nameAccounts = await this.connection.getProgramAccounts(
        new PublicKey('58PwtjSDuFHuUkYjH9BYnnQKHfwo9reZhC2zMJv9JPkx'),
        {
          filters: [
            {
              memcmp: {
                offset: 32, // Owner offset in the account data
                bytes: publicKey.toBase58(),
              },
            },
          ],
        }
      );

      return await Promise.all(
        nameAccounts.map(async (account) => {
          const registry = NameRegistryState.deserialize(account.account.data);
          return registry ? registry.name : '';
        })
      );
    } catch (error) {
      console.error('Error in reverse lookup:', error);
      return [];
    }
  }

  async getRecentContacts(limit: number = 10): Promise<ContactInfo[]> {
    try {
      // Get recent message accounts to find contacts
      const recentAccounts = await this.connection.getProgramAccounts(
        new PublicKey(process.env.NEXT_PUBLIC_PROGRAM_ID || ''),
        {
          dataSlice: { offset: 0, length: 64 }, // Only fetch sender and recipient data
          filters: [
            {
              dataSize: 1000, // Adjust based on your message account size
            },
          ],
        }
      );

      const uniqueContacts = new Map<string, ContactInfo>();

      for (const account of recentAccounts) {
        const senderPubkey = new PublicKey(account.account.data.slice(0, 32));
        const recipientPubkey = new PublicKey(account.account.data.slice(32, 64));

        for (const pubkey of [senderPubkey, recipientPubkey]) {
          if (!uniqueContacts.has(pubkey.toBase58())) {
            const domains = await this.reverseLookup(pubkey);
            uniqueContacts.set(pubkey.toBase58(), {
              publicKey: pubkey.toBase58(),
              displayName: domains[0] || pubkey.toBase58().slice(0, 4) + '...' + pubkey.toBase58().slice(-4),
              domainName: domains[0],
              lastSeen: Date.now(),
            });
          }

          if (uniqueContacts.size >= limit) {
            break;
          }
        }

        if (uniqueContacts.size >= limit) {
          break;
        }
      }

      return Array.from(uniqueContacts.values());
    } catch (error) {
      console.error('Error fetching recent contacts:', error);
      return [];
    }
  }
}
