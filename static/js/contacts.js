// Cüzdan iletişim yönetimi
class ContactsManager {
    constructor() {
        this.contacts = new Map(); // Map to store contact details
        this.currentChat = null;
        this.loadContacts();
        
        document.getElementById('newChatBtn').addEventListener('click', () => {
            const address = prompt('Cüzdan adresini girin:');
            if (address) {
                this.addContact(address);
            }
        });
    }
    
    loadContacts() {
        const savedContacts = localStorage.getItem('solvia_contacts');
        const savedMessages = localStorage.getItem('solvia_messages');
        
        if (savedContacts) {
            const contactsData = JSON.parse(savedContacts);
            this.contacts = new Map(contactsData.map(contact => [
                contact.address,
                {
                    address: contact.address,
                    lastMessage: contact.lastMessage || null,
                    lastMessageTime: contact.lastMessageTime || null,
                    unreadCount: contact.unreadCount || 0
                }
            ]));
        }
        
        if (savedMessages) {
            const messages = JSON.parse(savedMessages);
            Object.entries(messages).forEach(([address, msgs]) => {
                if (msgs.length > 0) {
                    const lastMsg = msgs[msgs.length - 1];
                    const contact = this.contacts.get(address) || {
                        address,
                        unreadCount: 0
                    };
                    contact.lastMessage = lastMsg.text;
                    contact.lastMessageTime = lastMsg.timestamp;
                    this.contacts.set(address, contact);
                }
            });
        }
        
        this.renderContacts();
    }
    
    saveContacts() {
        const contactsData = Array.from(this.contacts.values());
        localStorage.setItem('solvia_contacts', JSON.stringify(contactsData));
    }
    
    addContact(address) {
        if (address && !this.contacts.has(address)) {
            this.contacts.set(address, {
                address,
                lastMessage: null,
                lastMessageTime: null,
                unreadCount: 0
            });
            this.saveContacts();
            this.renderContacts();
        }
    }
    
    updateLastMessage(address, message, timestamp) {
        const contact = this.contacts.get(address);
        if (contact) {
            contact.lastMessage = message;
            contact.lastMessageTime = timestamp;
            if (address !== this.currentChat) {
                contact.unreadCount++;
            }
            this.saveContacts();
            this.renderContacts();
        }
    }
    
    formatTime(timestamp) {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        const oneDay = 24 * 60 * 60 * 1000;
        
        if (diff < oneDay && date.getDate() === now.getDate()) {
            return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
        } else if (diff < 7 * oneDay) {
            return date.toLocaleDateString('tr-TR', { weekday: 'short' });
        } else {
            return date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: '2-digit' });
        }
    }
    
    renderContacts() {
        const chatList = document.getElementById('chatList');
        chatList.innerHTML = '';
        
        // Sort contacts by last message time
        const sortedContacts = Array.from(this.contacts.values())
            .sort((a, b) => {
                if (!a.lastMessageTime) return 1;
                if (!b.lastMessageTime) return -1;
                return new Date(b.lastMessageTime) - new Date(a.lastMessageTime);
            });
        
        sortedContacts.forEach(contact => {
            const contactDiv = document.createElement('div');
            contactDiv.className = 'chat-item';
            if (contact.address === this.currentChat) {
                contactDiv.classList.add('active');
            }
            
            contactDiv.innerHTML = `
                <div class="chat-avatar">
                    <i class="fas fa-user"></i>
                </div>
                <div class="chat-info">
                    <div class="chat-header">
                        <div class="chat-name">${contact.address.slice(0, 8)}...${contact.address.slice(-4)}</div>
                        <div class="chat-time">${this.formatTime(contact.lastMessageTime)}</div>
                    </div>
                    <div class="chat-preview">
                        <div class="last-message">${contact.lastMessage || 'Yeni sohbet başlat'}</div>
                        ${contact.unreadCount > 0 ? `<div class="unread-count">${contact.unreadCount}</div>` : ''}
                    </div>
                </div>
            `;
            
            contactDiv.addEventListener('click', () => {
                const contact = this.contacts.get(contact.address);
                if (contact) {
                    contact.unreadCount = 0;
                    this.saveContacts();
                }
                this.setCurrentChat(contact.address);
                document.querySelector('.chat-screen').style.display = 'flex';
            });
            
            chatList.appendChild(contactDiv);
        });
    }
    
    setCurrentChat(address) {
        this.currentChat = address;
        const contact = this.contacts.get(address);
        if (contact) {
            contact.unreadCount = 0;
            this.saveContacts();
        }
        
        const title = document.getElementById('currentChatTitle');
        title.textContent = address ? 
            `${address.slice(0, 8)}...${address.slice(-4)}` : 
            'Genel Sohbet';
            
        document.getElementById('messagesContainer').innerHTML = '';
        this.renderContacts();
    }
}

// Contacts manager'ı başlat
window.contactsManager = new ContactsManager();

// Global sohbet başlatma fonksiyonu
window.startChat = (address) => {
    window.contactsManager.setCurrentChat(address);
};
