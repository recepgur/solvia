class WebSocketHandler {
    constructor() {
        this.ws = null;
        this.clientId = Math.random().toString(36).substr(2, 9);
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000; // Start with 1 second
        this.connect();
    }

    connect() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/${this.clientId}`;
        
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
            document.getElementById('status').textContent = 'Bağlandı';
            this.reconnectAttempts = 0;
            this.reconnectDelay = 1000;
        };
        
        this.ws.onmessage = async (event) => {
            try {
                const message = JSON.parse(event.data);
                
                switch (message.type) {
                    case 'chat':
                        window.chatHandler.handleIncomingMessage(message);
                        break;
                    case 'offer':
                        await window.rtcHandler.handleOffer(message);
                        break;
                    case 'answer':
                        await window.rtcHandler.handleAnswer(message);
                        break;
                    case 'ice-candidate':
                        await window.rtcHandler.handleIceCandidate(message);
                        break;
                    case 'call-ended':
                        window.rtcHandler.handleCallEnded();
                        break;
                    default:
                        console.warn('Bilinmeyen mesaj tipi:', message.type);
                }
            } catch (error) {
                console.error('Mesaj işleme hatası:', error);
                document.getElementById('status').innerHTML = 
                    `<span class="error">Mesaj işleme hatası: ${error.message}</span>`;
            }
        };
        
        this.ws.onclose = () => {
            document.getElementById('status').textContent = 'Bağlantı kesildi';
            
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
                setTimeout(() => {
                    this.reconnectAttempts++;
                    this.reconnectDelay *= 2; // Exponential backoff
                    this.connect();
                }, this.reconnectDelay);
            } else {
                document.getElementById('status').innerHTML = 
                    '<span class="error">Bağlantı kurulamadı. Lütfen sayfayı yenileyin.</span>';
            }
        };
        
        this.ws.onerror = (error) => {
            console.error('WebSocket hatası:', error);
            document.getElementById('status').innerHTML = 
                `<span class="error">Bağlantı hatası</span>`;
        };
    }

    send(data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        } else {
            document.getElementById('status').innerHTML = 
                '<span class="error">Bağlantı kurulamadı. Mesaj gönderilemedi.</span>';
        }
    }
}

// Initialize handlers
window.wsHandler = new WebSocketHandler();

// Global event listeners
window.startVideoCall = () => window.rtcHandler.startCall();
window.endCall = () => window.rtcHandler.endCall();
window.sendMessage = () => window.chatHandler.sendMessage();

// Initialize media devices on page load
window.addEventListener('load', async () => {
    await window.rtcHandler.initializeMediaDevices();
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        if (!window.wsHandler.ws || window.wsHandler.ws.readyState !== WebSocket.OPEN) {
            window.wsHandler = new WebSocketHandler();
        }
    }
});

// Handle beforeunload to clean up resources
window.addEventListener('beforeunload', () => {
    if (window.rtcHandler) {
        window.rtcHandler.endCall();
    }
});
