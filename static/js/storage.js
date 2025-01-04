import { create } from 'ipfs-http-client';
import { Buffer } from 'buffer';

class DecentralizedStorage {
    constructor() {
        // Connect to local IPFS node or Infura IPFS gateway
        this.ipfs = create({
            host: 'ipfs.infura.io',
            port: 5001,
            protocol: 'https'
        });
        
        // Initialize encryption key from wallet
        this.initializeEncryption();
    }
    
    async initializeEncryption() {
        // Use wallet for encryption key derivation
        const walletAddress = localStorage.getItem('walletAddress');
        if (!walletAddress) return;
        
        // Create a deterministic key from wallet address
        const encoder = new TextEncoder();
        const data = encoder.encode(walletAddress);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        this.encryptionKey = await crypto.subtle.importKey(
            'raw',
            hashBuffer,
            { name: 'AES-GCM' },
            false,
            ['encrypt', 'decrypt']
        );
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
    
    async storeMessage(message) {
        try {
            // Encrypt message before storing
            const encryptedMessage = await this.encryptMessage(message);
            
            // Store encrypted message on IPFS
            const { cid } = await this.ipfs.add(JSON.stringify(encryptedMessage));
            return cid.toString();
            
        } catch (error) {
            console.error('Error storing message:', error);
            throw error;
        }
    }
    
    async retrieveMessage(cid) {
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
            console.error('Error retrieving message:', error);
            throw error;
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
