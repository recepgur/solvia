class WalletAuth {
    constructor() {
        this.wallet = null;
        this.publicKey = null;
    }

    async connect() {
        try {
            const wallet = window.solana;
            if (!wallet) {
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
            return {
                message,
                signature: Buffer.from(signature.signature).toString('hex'),
                publicKey: this.publicKey
            };
        } catch (err) {
            console.error('İmza hatası:', err);
            throw new Error('Mesaj imzalanırken hata oluştu');
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

            if (!response.ok) {
                throw new Error('Sunucu doğrulama hatası');
            }

            const result = await response.json();
            return result;
        } catch (err) {
            console.error('Doğrulama hatası:', err);
            throw new Error('İmza doğrulaması başarısız');
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
