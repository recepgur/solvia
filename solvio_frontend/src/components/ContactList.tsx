import { useState, useEffect } from 'react';
import { UserPlus, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface Contact {
  wallet_address: string;
  display_name?: string;
  last_seen?: string;
}

interface ContactListProps {
  walletAddress: string;
  onSelectContact: (contact: Contact) => void;
  selectedContact?: string;
}

export function ContactList({
  walletAddress,
  onSelectContact,
  selectedContact,
}: ContactListProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [newContactAddress, setNewContactAddress] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    fetchContacts();
  }, [walletAddress]);

  const fetchContacts = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/contacts/list?wallet_address=${walletAddress}`
      );
      if (response.ok) {
        const data = await response.json();
        setContacts(data);
      }
    } catch (error) {
      console.error('Failed to fetch contacts:', error);
    }
  };

  const addContact = async () => {
    if (!newContactAddress.trim()) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/contacts/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet_address: walletAddress,
          contact_address: newContactAddress,
        }),
      });

      if (response.ok) {
        setNewContactAddress('');
        setIsDialogOpen(false);
        fetchContacts();
      }
    } catch (error) {
      console.error('Failed to add contact:', error);
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Contacts</CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon">
                <UserPlus className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Contact</DialogTitle>
              </DialogHeader>
              <div className="flex gap-2">
                <Input
                  value={newContactAddress}
                  onChange={(e) => setNewContactAddress(e.target.value)}
                  placeholder="Enter wallet address"
                />
                <Button onClick={addContact}>Add</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {contacts.map((contact) => (
            <Button
              key={contact.wallet_address}
              variant={
                contact.wallet_address === selectedContact
                  ? 'default'
                  : 'ghost'
              }
              className="w-full justify-start"
              onClick={() => onSelectContact(contact)}
            >
              <User className="w-4 h-4 mr-2" />
              <span className="truncate">
                {contact.display_name || contact.wallet_address}
              </span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
