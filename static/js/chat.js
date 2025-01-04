class ChatHandler {
    constructor() {
        this.messageInput = document.getElementById('messageInput');
        this.messagesContainer = document.getElementById('messages');
    }

    sendMessage() {
        const message = this.messageInput.value.trim();
        if (message) {
            window.wsHandler.send({
                type: 'chat',
                content: message
            });
            
            this.displayMessage('Ben', message, true);
            this.messageInput.value = '';
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

    handleIncomingMessage(message) {
        if (message.type === 'chat') {
            this.displayMessage(message.sender, message.content);
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
