// Cüzdan iletişim yönetimi
class ContactsManager {
    constructor() {
        this.contacts = new Set();
        this.currentChat = null;
        this.loadContacts();
        
        document.getElementById('addContactBtn').addEventListener('click', () => {
            const address = prompt('Cüzdan adresini girin:');
            if (address) {
                this.addContact(address);
            }
        });
    }
    
    loadContacts() {
        const savedContacts = localStorage.getItem('solvia_contacts');
        if (savedContacts) {
            this.contacts = new Set(JSON.parse(savedContacts));
            this.renderContacts();
        }
    }
    
    saveContacts() {
        localStorage.setItem('solvia_contacts', JSON.stringify([...this.contacts]));
    }
    
    addContact(address) {
        if (address && !this.contacts.has(address)) {
            this.contacts.add(address);
            this.saveContacts();
            this.renderContacts();
        }
    }
    
    renderContacts() {
        const contactsList = document.getElementById('contactsList');
        contactsList.innerHTML = '';
        
        this.contacts.forEach(address => {
            const contactDiv = document.createElement('div');
            contactDiv.className = 'contact-item';
            contactDiv.innerHTML = `
                <div class="wallet-address">${address.slice(0, 8)}...${address.slice(-4)}</div>
                <button class="btn primary" onclick="startChat('${address}')">
                    <i class="fas fa-comment"></i> Sohbet
                </button>
            `;
            contactsList.appendChild(contactDiv);
        });
    }
    
    setCurrentChat(address) {
        this.currentChat = address;
        const title = document.getElementById('currentChatTitle');
        title.textContent = address ? 
            `Sohbet: ${address.slice(0, 8)}...${address.slice(-4)}` : 
            'Genel Sohbet';
            
        // Mesaj geçmişini temizle ve yeni sohbet için hazırla
        document.getElementById('messages').innerHTML = '';
        // TODO: Bu cüzdan için mesaj geçmişini yükle
    }
}

// Contacts manager'ı başlat
window.contactsManager = new ContactsManager();

// Global sohbet başlatma fonksiyonu
window.startChat = (address) => {
    window.contactsManager.setCurrentChat(address);
};
