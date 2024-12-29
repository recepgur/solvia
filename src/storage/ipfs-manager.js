import IPFS from 'ipfs-http-client'
import { create } from 'kubo-rpc-client'
import { Crypto } from '@peculiar/webcrypto'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'

class IPFSManager {
    constructor() {
        // Initialize IPFS client
        this.ipfs = create({
            host: 'localhost',
            port: 5001,
            protocol: 'http'
        })
        
        // Initialize crypto
        this.crypto = new Crypto()
    }

    // Upload file to IPFS with encryption
    async uploadFile(file, encryptionKey) {
        try {
            // Encrypt file before uploading
            const encryptedData = await this.encryptData(file, encryptionKey)
            
            // Add encrypted file to IPFS
            const result = await this.ipfs.add(encryptedData)
            
            return {
                hash: result.path,
                size: result.size
            }
        } catch (error) {
            console.error('Error uploading file to IPFS:', error)
            throw error
        }
    }

    // Download and decrypt file from IPFS
    async downloadFile(hash, encryptionKey) {
        try {
            // Get encrypted file from IPFS
            const chunks = []
            for await (const chunk of this.ipfs.cat(hash)) {
                chunks.push(chunk)
            }
            
            // Combine chunks and decrypt
            const encryptedData = new Uint8Array(
                chunks.reduce((acc, chunk) => [...acc, ...chunk], [])
            )
            
            return await this.decryptData(encryptedData, encryptionKey)
        } catch (error) {
            console.error('Error downloading file from IPFS:', error)
            throw error
        }
    }

    // Encrypt data using AES-GCM
    async encryptData(data, key) {
        try {
            const iv = crypto.getRandomValues(new Uint8Array(12))
            const encryptionKey = await this.crypto.subtle.importKey(
                'raw',
                key,
                { name: 'AES-GCM' },
                false,
                ['encrypt']
            )
            
            const encryptedData = await this.crypto.subtle.encrypt(
                {
                    name: 'AES-GCM',
                    iv: iv
                },
                encryptionKey,
                data instanceof Uint8Array ? data : uint8ArrayFromString(JSON.stringify(data))
            )
            
            // Combine IV and encrypted data
            const combined = new Uint8Array(iv.length + encryptedData.byteLength)
            combined.set(iv)
            combined.set(new Uint8Array(encryptedData), iv.length)
            
            return combined
        } catch (error) {
            console.error('Error encrypting data:', error)
            throw error
        }
    }

    // Decrypt data using AES-GCM
    async decryptData(combinedData, key) {
        try {
            // Extract IV and encrypted data
            const iv = combinedData.slice(0, 12)
            const encryptedData = combinedData.slice(12)
            
            const decryptionKey = await this.crypto.subtle.importKey(
                'raw',
                key,
                { name: 'AES-GCM' },
                false,
                ['decrypt']
            )
            
            const decryptedData = await this.crypto.subtle.decrypt(
                {
                    name: 'AES-GCM',
                    iv: iv
                },
                decryptionKey,
                encryptedData
            )
            
            return new Uint8Array(decryptedData)
        } catch (error) {
            console.error('Error decrypting data:', error)
            throw error
        }
    }

    // Upload media file (video/audio) with chunks
    async uploadMediaFile(mediaBlob, encryptionKey) {
        try {
            const chunkSize = 1024 * 1024 // 1MB chunks
            const chunks = []
            
            // Split file into chunks
            for (let i = 0; i < mediaBlob.size; i += chunkSize) {
                const chunk = mediaBlob.slice(i, i + chunkSize)
                const encryptedChunk = await this.encryptData(
                    new Uint8Array(await chunk.arrayBuffer()),
                    encryptionKey
                )
                const result = await this.ipfs.add(encryptedChunk)
                chunks.push(result.path)
            }
            
            // Create manifest file
            const manifest = {
                chunks: chunks,
                totalSize: mediaBlob.size,
                mimeType: mediaBlob.type
            }
            
            // Upload encrypted manifest
            const encryptedManifest = await this.encryptData(manifest, encryptionKey)
            const manifestResult = await this.ipfs.add(encryptedManifest)
            
            
            return {
                manifestHash: manifestResult.path,
                chunks: chunks
            }
        } catch (error) {
            console.error('Error uploading media file:', error)
            throw error
        }
    }

    // Download and reconstruct media file
    async downloadMediaFile(manifestHash, encryptionKey) {
        try {
            // Get and decrypt manifest
            const encryptedManifest = await this.downloadFile(manifestHash, encryptionKey)
            const manifest = JSON.parse(uint8ArrayToString(encryptedManifest))
            
            // Download and decrypt all chunks
            const chunks = []
            for (const chunkHash of manifest.chunks) {
                const encryptedChunk = await this.downloadFile(chunkHash, encryptionKey)
                chunks.push(encryptedChunk)
            }
            
            // Combine chunks
            const combinedData = new Uint8Array(manifest.totalSize)
            let offset = 0
            for (const chunk of chunks) {
                combinedData.set(chunk, offset)
                offset += chunk.length
            }
            
            return new Blob([combinedData], { type: manifest.mimeType })
        } catch (error) {
            console.error('Error downloading media file:', error)
            throw error
        }
    }

    // Pin content to ensure persistence
    async pinContent(hash) {
        try {
            await this.ipfs.pin.add(hash)
            return true
        } catch (error) {
            console.error('Error pinning content:', error)
            throw error
        }
    }

    // Unpin content
    async unpinContent(hash) {
        try {
            await this.ipfs.pin.rm(hash)
            return true
        } catch (error) {
            console.error('Error unpinning content:', error)
            throw error
        }
    }

    // Get content status
    async getContentStatus(hash) {
        try {
            const stats = await this.ipfs.files.stat(`/ipfs/${hash}`)
            return {
                size: stats.size,
                blocks: stats.blocks,
                isPinned: await this.isPinned(hash)
            }
        } catch (error) {
            console.error('Error getting content status:', error)
            throw error
        }
    }

    // Check if content is pinned
    async isPinned(hash) {
        try {
            const pins = await this.ipfs.pin.ls({ paths: [hash] })
            return pins.length > 0
        } catch (error) {
            return false
        }
    }
}

export default IPFSManager
