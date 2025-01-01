// Removed unused React import
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { ContactList } from './ContactList';
import { Contact } from '../types/messages';

interface MobileNavProps {
  walletAddress: string;
  onSelectContact: (contact: Contact) => void;
  selectedContact?: string;
}

export function MobileNav({ walletAddress, onSelectContact, selectedContact }: MobileNavProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[80%] sm:w-[380px] p-0">
        <SheetHeader className="p-4 border-b">
          <SheetTitle>Contacts</SheetTitle>
        </SheetHeader>
        <div className="overflow-y-auto h-full">
          <ContactList
            walletAddress={walletAddress}
            onSelectContact={onSelectContact}
            selectedContact={selectedContact}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
