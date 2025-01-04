import { create } from 'ipfs-http-client';
import { Buffer } from 'buffer';

class DecentralizedStorage {
    constructor() {
        // Connect to primary IPFS gateway with fallback options
        this.ipfsGateways = [
            { host: 'ipfs.infura.io', port: 5001, protocol: 'https' },
            { host: 'ipfs.io', port: 5001, protocol: 'https' },
            { host: 'dweb.link', port: 443, protocol: 'https' }
        ];
        
        this.currentGatewayIndex = 0;
        this.initializeIpfs();
        
        // Initialize encryption key from wallet
        this.initializeEncryption();
    }
    
    async initializeIpfs() {
        try {
            const gateway = this.ipfsGateways[this.currentGatewayIndex];
            this.ipfs = create(gateway);
            await this.ipfs.version(); // Test connection
        } catch (error) {
            console.error('IPFS bağlantı hatası:', error);
            if (this.currentGatewayIndex < this.ipfsGateways.length - 1) {
                this.currentGatewayIndex++;
                await this.initializeIpfs();
            } else {
                alert('IPFS ağına bağlanılamıyor. Lütfen daha sonra tekrar deneyin.');
            }
        }
    }
    
    async initializeEncryption() {
        try {
            // Try to load saved encryption key
            const savedKey = localStorage.getItem('encryptionKey');
            if (savedKey) {
                const keyData = Buffer.from(savedKey, 'base64');
                this.encryptionKey = await crypto.subtle.importKey(
                    'raw',
                    keyData,
                    { name: 'AES-GCM' },
                    true, // Make key extractable for backup
                    ['encrypt', 'decrypt']
                );
                return;
            }
            
            // Generate new key from wallet address
            const walletAddress = localStorage.getItem('walletAddress');
            if (!walletAddress) {
                alert('Cüzdan bağlantısı gerekli.');
                return;
            }
            
            // Create a deterministic key from wallet address
            const encoder = new TextEncoder();
            const data = encoder.encode(walletAddress);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            this.encryptionKey = await crypto.subtle.importKey(
                'raw',
                hashBuffer,
                { name: 'AES-GCM' },
                true, // Make key extractable for backup
                ['encrypt', 'decrypt']
            );
            
            // Save key for future use
            const exportedKey = await crypto.subtle.exportKey('raw', this.encryptionKey);
            localStorage.setItem('encryptionKey', Buffer.from(exportedKey).toString('base64'));
        } catch (error) {
            console.error('Şifreleme anahtarı oluşturma hatası:', error);
            alert('Şifreleme anahtarı oluşturulamadı. Lütfen sayfayı yenileyin.');
        }
    }
    
    async encryptMessage(message) {
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const encoder = new TextEncoder();
        const data = encoder.encode(JSON.stringify(message));
        
        const encryptedData = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            this.encryptionKey,
            data
        );
        
        return {
            data: Buffer.from(encryptedData).toString('base64'),
            iv: Buffer.from(iv).toString('base64')
        };
    }
    
    async decryptMessage(encryptedMessage) {
        const data = Buffer.from(encryptedMessage.data, 'base64');
        const iv = Buffer.from(encryptedMessage.iv, 'base64');
        
        const decryptedData = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            this.encryptionKey,
            data
        );
        
        const decoder = new TextDecoder();
        return JSON.parse(decoder.decode(decryptedData));
    }
    
    async storeMessage(message, retryCount = 3) {
        for (let i = 0; i < retryCount; i++) {
            try {
                // Encrypt message before storing
                const encryptedMessage = await this.encryptMessage(message);
                
                // Store encrypted message on IPFS
                const { cid } = await this.ipfs.add(JSON.stringify(encryptedMessage));
                return cid.toString();
                
            } catch (error) {
                console.error(`Mesaj kaydetme denemesi ${i + 1}/${retryCount} başarısız:`, error);
                
                if (i === retryCount - 1) {
                    alert('Mesaj kaydedilemedi. Lütfen internet bağlantınızı kontrol edin.');
                    throw new Error('Maksimum deneme sayısına ulaşıldı');
                }
                
                // Try next gateway
                await this.initializeIpfs();
                await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Exponential backoff
            }
        }
    }
    
    async retrieveMessage(cid, retryCount = 3) {
        for (let i = 0; i < retryCount; i++) {
            try {
                // Retrieve encrypted message from IPFS
                const stream = await this.ipfs.cat(cid);
                let data = '';
                
                for await (const chunk of stream) {
                    data += chunk.toString();
                }
                
                // Decrypt and return message
                const encryptedMessage = JSON.parse(data);
                return await this.decryptMessage(encryptedMessage);
                
            } catch (error) {
                console.error(`Mesaj alma denemesi ${i + 1}/${retryCount} başarısız:`, error);
                
                if (i === retryCount - 1) {
                    alert('Mesaj alınamadı. Lütfen internet bağlantınızı kontrol edin.');
                    throw new Error('Maksimum deneme sayısına ulaşıldı');
                }
                
                // Try next gateway
                await this.initializeIpfs();
                await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Exponential backoff
            }
        }
    }
    
    async backupEncryptionKey() {
        try {
            const exportedKey = await crypto.subtle.exportKey('raw', this.encryptionKey);
            const keyString = Buffer.from(exportedKey).toString('base64');
            
            // Create backup file
            const blob = new Blob([keyString], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            
            // Trigger download
            const a = document.createElement('a');
            a.href = url;
            a.download = 'solvia-encryption-key.txt';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            alert('Şifreleme anahtarınız başarıyla yedeklendi. Güvenli bir yerde saklayın.');
        } catch (error) {
            console.error('Anahtar yedekleme hatası:', error);
            alert('Şifreleme anahtarı yedeklenemedi.');
        }
    }
    
    async restoreEncryptionKey(keyString) {
        try {
            const keyData = Buffer.from(keyString, 'base64');
            this.encryptionKey = await crypto.subtle.importKey(
                'raw',
                keyData,
                { name: 'AES-GCM' },
                true,
                ['encrypt', 'decrypt']
            );
            
            // Save restored key
            localStorage.setItem('encryptionKey', keyString);
            alert('Şifreleme anahtarınız başarıyla geri yüklendi.');
        } catch (error) {
            console.error('Anahtar geri yükleme hatası:', error);
            alert('Şifreleme anahtarı geri yüklenemedi. Geçerli bir yedek dosyası kullandığınızdan emin olun.');
        }
    }
    
    async storeFile(file) {
        try {
            const buffer = await file.arrayBuffer();
            const { cid } = await this.ipfs.add(buffer);
            return cid.toString();
            
        } catch (error) {
            console.error('Error storing file:', error);
            throw error;
        }
    }
    
    async retrieveFile(cid) {
        try {
            const stream = await this.ipfs.cat(cid);
            const chunks = [];
            
            for await (const chunk of stream) {
                chunks.push(chunk);
            }
            
            return new Blob(chunks);
            
        } catch (error) {
            console.error('Error retrieving file:', error);
            throw error;
        }
    }
}

// Initialize storage when document is ready
document.addEventListener('DOMContentLoaded', () => {
    window.decentralizedStorage = new DecentralizedStorage();
});

export default DecentralizedStorage;
