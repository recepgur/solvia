class ChatHandler {
    constructor() {
        this.messageInput = document.getElementById('messageInput');
        this.messagesContainer = document.getElementById('messages');
        this.currentChat = null;  // Current chat wallet address
        this.walletAddress = localStorage.getItem('walletAddress');
    }

    async sendMessage() {
        const message = this.messageInput.value.trim();
        if (message && this.walletAddress) {
            const messageData = {
                type: 'chat',
                content: message,
                sender: this.walletAddress,
                timestamp: Date.now()
            };
            
            // If we're in a direct chat, add the target
            if (this.currentChat) {
                messageData.target = this.currentChat;
            }
            
            try {
                // Store message in IPFS
                const cid = await window.decentralizedStorage.storeMessage(messageData);
                
                // Send message with IPFS reference
                const wsMessage = {
                    type: 'chat',
                    cid: cid,
                    sender: this.walletAddress,
                    target: this.currentChat
                };
                
                window.wsHandler.send(wsMessage);
                
                // Display message locally
                const displayName = this.walletAddress.slice(0, 8) + '...';
                this.displayMessage(displayName, message, true);
                this.messageInput.value = '';
                
            } catch (error) {
                console.error('Error sending message:', error);
                alert('Mesaj gönderilirken bir hata oluştu. Lütfen tekrar deneyin.');
            }
        }
    }

    displayMessage(sender, content, isSent = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isSent ? 'sent' : 'received'}`;
        
        const senderSpan = document.createElement('span');
        senderSpan.className = 'sender';
        senderSpan.textContent = sender + ': ';
        
        const contentSpan = document.createElement('span');
        contentSpan.className = 'content';
        contentSpan.textContent = content;
        
        messageDiv.appendChild(senderSpan);
        messageDiv.appendChild(contentSpan);
        
        this.messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }

    scrollToBottom() {
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    clearMessages() {
        this.messagesContainer.innerHTML = '';
    }

    async handleIncomingMessage(message) {
        if (message.type === 'chat') {
            try {
                // Only display if it's a broadcast or meant for current chat
                if (!message.target || message.target === this.walletAddress) {
                    // Retrieve full message from IPFS
                    const fullMessage = await window.decentralizedStorage.retrieveMessage(message.cid);
                    const senderDisplay = fullMessage.sender.slice(0, 8) + '...';
                    
                    // Check if message contains a file
                    if (fullMessage.fileType && fullMessage.fileCid) {
                        const file = await window.decentralizedStorage.retrieveFile(fullMessage.fileCid);
                        this.displayFileMessage(senderDisplay, file, fullMessage.fileType, fullMessage.fileName);
                    } else {
                        this.displayMessage(senderDisplay, fullMessage.content);
                    }
                    
                    // Update contact's last message if available
                    if (window.contactsManager) {
                        window.contactsManager.updateLastMessage(fullMessage.sender, fullMessage.content);
                    }
                }
            } catch (error) {
                console.error('Error handling incoming message:', error);
                this.displaySystemMessage('Mesaj alınırken bir hata oluştu.');
            }
        }
    }
    
    displayFileMessage(sender, file, fileType, fileName) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message';
        messageDiv.classList.add(sender === 'Ben' ? 'sent' : 'received');
        
        const senderDiv = document.createElement('div');
        senderDiv.className = 'sender';
        senderDiv.textContent = sender;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'content';
        
        if (fileType.startsWith('image/')) {
            const img = document.createElement('img');
            img.src = URL.createObjectURL(file);
            img.className = 'message-image';
            contentDiv.appendChild(img);
        } else {
            const fileLink = document.createElement('a');
            fileLink.href = URL.createObjectURL(file);
            fileLink.download = fileName;
            fileLink.className = 'file-attachment';
            fileLink.innerHTML = `<i class="fas fa-file"></i> ${fileName}`;
            contentDiv.appendChild(fileLink);
        }
        
        messageDiv.appendChild(senderDiv);
        messageDiv.appendChild(contentDiv);
        this.messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }
    
    displaySystemMessage(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message system';
        messageDiv.textContent = message;
        this.messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }
    
    setCurrentChat(walletAddress) {
        this.currentChat = walletAddress;
        this.clearMessages();
        
        // Update chat header
        const chatTitle = document.getElementById('currentChatTitle');
        if (chatTitle) {
            chatTitle.textContent = walletAddress ? 
                `Chat with ${walletAddress.slice(0, 8)}...` : 
                'Genel Sohbet';
        }
    }
}

window.chatHandler = new ChatHandler();

// Global event listeners
document.getElementById('messageInput').addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        window.chatHandler.sendMessage();
    }
});
