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
            const messageId = Date.now().toString();
            const messageData = {
                id: messageId,
                type: 'chat',
                content: message,
                sender: this.walletAddress,
                timestamp: Date.now(),
                status: 'sending'
            };
            
            // If we're in a direct chat, add the target
            if (this.currentChat) {
                messageData.target = this.currentChat;
            }
            
            try {
                // Display message locally first with 'sending' status
                const displayName = this.walletAddress.slice(0, 8) + '...';
                this.displayMessage(displayName, message, true, messageId, 'sending');
                this.messageInput.value = '';

                // Store message in IPFS
                const cid = await window.decentralizedStorage.storeMessage(messageData);
                
                // Send message with IPFS reference
                const wsMessage = {
                    type: 'chat',
                    cid: cid,
                    sender: this.walletAddress,
                    target: this.currentChat,
                    messageId: messageId
                };
                
                await window.wsHandler.send(wsMessage);
                
                // Update message status to 'sent'
                this.updateMessageStatus(messageId, 'sent');
                
            } catch (error) {
                console.error('Error sending message:', error);
                this.updateMessageStatus(messageId, 'failed');
                alert('Mesaj gönderilirken bir hata oluştu. Lütfen tekrar deneyin.');
            }
        }
    }

    updateMessageStatus(messageId, status) {
        const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
        if (messageElement) {
            const statusElement = messageElement.querySelector('.message-status');
            if (statusElement) {
                statusElement.className = `message-status ${status}`;
                statusElement.innerHTML = this.getStatusIcon(status);
            }
        }
    }

    getStatusIcon(status) {
        switch (status) {
            case 'sending':
                return '<i class="fas fa-clock"></i>';
            case 'sent':
                return '<i class="fas fa-check"></i>';
            case 'delivered':
                return '<i class="fas fa-check-double"></i>';
            case 'read':
                return '<i class="fas fa-check-double" style="color: #34B7F1;"></i>';
            case 'failed':
                return '<i class="fas fa-exclamation-circle" style="color: #FF0000;"></i>';
            default:
                return '';
        }
    }

    displayMessage(sender, content, isSent = false, messageId = null, status = null) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isSent ? 'sent' : 'received'}`;
        if (messageId) {
            messageDiv.setAttribute('data-message-id', messageId);
        }
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        
        const senderSpan = document.createElement('span');
        senderSpan.className = 'sender';
        senderSpan.textContent = sender;
        
        const contentSpan = document.createElement('span');
        contentSpan.className = 'content';
        contentSpan.textContent = content;
        
        const timeSpan = document.createElement('span');
        timeSpan.className = 'message-time';
        timeSpan.textContent = new Date().toLocaleTimeString('tr-TR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        if (isSent && status) {
            const statusSpan = document.createElement('span');
            statusSpan.className = `message-status ${status}`;
            statusSpan.innerHTML = this.getStatusIcon(status);
            messageContent.appendChild(statusSpan);
        }
        
        messageContent.appendChild(senderSpan);
        messageContent.appendChild(contentSpan);
        messageContent.appendChild(timeSpan);
        
        messageDiv.appendChild(messageContent);
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
