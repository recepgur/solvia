class WalletAuth {
    constructor() {
        this.wallet = null;
        this.publicKey = null;
    }

    async connect() {
        try {
            let wallet;
            if (window.solana?.isPhantom) {
                wallet = window.solana;
            } else if (window.solflare?.isSolflare) {
                wallet = window.solflare;
            } else {
                throw new Error('Lütfen Phantom veya Solflare cüzdanını yükleyin!');
            }

            const resp = await wallet.connect();
            this.wallet = wallet;
            this.publicKey = resp.publicKey.toString();

            // Sign login message for authentication
            const auth = await this.signLoginMessage();
            
            // Send to backend for verification
            await this.verifySignature(auth);

            return {
                publicKey: this.publicKey,
                status: 'connected'
            };
        } catch (err) {
            console.error('Cüzdan bağlantı hatası:', err);
            throw new Error(`Cüzdan bağlantısında hata: ${err.message}`);
        }
    }

    async signLoginMessage() {
        const message = "Solvia'ya Hoş Geldiniz - Giriş Onayı";
        const encoder = new TextEncoder();
        const messageBytes = encoder.encode(message);
        
        try {
            const signature = await this.wallet.signMessage(messageBytes, "utf8");
            // Convert signature to base58 format for backend
            return {
                message,
                signature: bs58.encode(signature.signature),
                publicKey: this.publicKey
            };
        } catch (err) {
            console.error('İmza hatası:', err);
            if (err.code === 4001) {
                throw new Error('Kullanıcı imzalamayı reddetti');
            }
            throw new Error('Mesaj imzalanırken hata oluştu. Lütfen tekrar deneyin.');
        }
    }

    async verifySignature(auth) {
        try {
            const response = await fetch('/api/auth/wallet', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(auth)
            });

            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.detail || 'Sunucu doğrulama hatası');
            }

            // Store authentication in localStorage
            localStorage.setItem('walletAuth', JSON.stringify({
                publicKey: this.publicKey,
                timestamp: Date.now()
            }));

            return result;
        } catch (err) {
            console.error('Doğrulama hatası:', err);
            throw new Error(err.message || 'İmza doğrulaması başarısız. Lütfen tekrar deneyin.');
        }
    }

    disconnect() {
        if (this.wallet) {
            this.wallet.disconnect();
            this.wallet = null;
            this.publicKey = null;
        }
    }

    isConnected() {
        return this.wallet !== null && this.publicKey !== null;
    }

    getPublicKey() {
        return this.publicKey;
    }
}

// Create global instance
window.walletAuth = new WalletAuth();
