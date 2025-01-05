class WebSocketHandler {
    constructor() {
        this.ws = null;
        this.walletAddress = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000; // Start with 1 second
        
        // Check for existing wallet connection
        const savedWallet = localStorage.getItem('walletAddress');
        if (savedWallet) {
            this.walletAddress = savedWallet;
            this.connect();
        }
    }

    connect() {
        if (!this.walletAddress) {
            console.error('Cüzdan bağlantısı gerekli');
            document.getElementById('status').innerHTML = 
                '<span class="error">Lütfen önce cüzdanınızı bağlayın</span>';
            return;
        }
        
        // Initialize chat handler with wallet address
        if (window.chatHandler) {
            window.chatHandler.walletAddress = this.walletAddress;
        }

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        // Ensure we have a valid wallet address
        if (!this.walletAddress || this.walletAddress.length < 32) {
            console.error('Geçerli bir cüzdan adresi gerekli');
            document.getElementById('status').innerHTML = 
                '<span class="error">Geçerli bir cüzdan adresi gerekli</span>';
            return;
        }

        const wsUrl = `${protocol}//${window.location.host}/ws/${this.walletAddress}`;
        console.log('Attempting WebSocket connection to:', wsUrl);
        
        // Use the dynamically constructed WebSocket URL
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
            
            // Only attempt reconnection if we have a valid wallet
            if (this.walletAddress && this.reconnectAttempts < this.maxReconnectAttempts) {
                document.getElementById('status').textContent = 
                    `Yeniden bağlanılıyor... (${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`;
                
                setTimeout(() => {
                    this.reconnectAttempts++;
                    this.reconnectDelay *= 2; // Exponential backoff
                    this.connect();
                }, this.reconnectDelay);
            } else if (!this.walletAddress) {
                document.getElementById('status').innerHTML = 
                    '<span class="error">Cüzdan bağlantısı gerekli. Lütfen cüzdanınızı bağlayın.</span>';
            } else {
                document.getElementById('status').innerHTML = 
                    '<span class="error">Bağlantı kurulamadı. Lütfen sayfayı yenileyin veya cüzdanınızı tekrar bağlayın.</span>';
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

// Initialize handlers after wallet connection
let wsHandler = null;

function initializeHandlers(walletAddress) {
    if (wsHandler) {
        // Close existing connection if any
        if (wsHandler.ws) {
            wsHandler.ws.close();
        }
    }
    
    wsHandler = new WebSocketHandler();
    wsHandler.walletAddress = walletAddress;
    wsHandler.connect();
    window.wsHandler = wsHandler;
}

// Global event listeners
window.startVideoCall = () => window.rtcHandler.startCall();
window.endCall = () => window.rtcHandler.endCall();
window.sendMessage = () => window.chatHandler.sendMessage();

// Listen for wallet connection events
document.addEventListener('walletConnected', (event) => {
    const { walletAddress } = event.detail;
    initializeHandlers(walletAddress);
});

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
