import { createHash } from 'crypto'
import { schnorr } from '@noble/secp256k1'
import { createEd25519PeerId } from '@libp2p/peer-id-ed25519'
import { encode as uint8ArrayToBase64 } from 'uint8arrays/to-string'
import { decode as base64ToUint8Array } from 'uint8arrays/from-string'

class IdentityManager {
    constructor() {
        this.identities = new Map()
        this.proofs = new Map()
    }

    // Generate new decentralized identity
    async createIdentity() {
        try {
            // Generate Ed25519 key pair for base identity
            const peerId = await createEd25519PeerId()
            
            // Generate Schnorr key pair for zero-knowledge proofs
            const privateKey = schnorr.utils.randomPrivateKey()
            const publicKey = schnorr.getPublicKey(privateKey)
            
            const identity = {
                did: `did:solvia:${uint8ArrayToBase64(peerId.publicKey)}`,
                peerId: peerId,
                schnorrKeys: {
                    privateKey: uint8ArrayToBase64(privateKey),
                    publicKey: uint8ArrayToBase64(publicKey)
                },
                metadata: {
                    created: Date.now(),
                    lastUpdated: Date.now()
                }
            }
            
            this.identities.set(identity.did, identity)
            return identity.did
        } catch (error) {
            console.error('Error creating identity:', error)
            throw error
        }
    }

    // Generate zero-knowledge proof of identity
    async generateProof(did, challenge) {
        try {
            const identity = this.identities.get(did)
            if (!identity) {
                throw new Error('Identity not found')
            }
            
            const privateKey = base64ToUint8Array(identity.schnorrKeys.privateKey)
            const message = createHash('sha256')
                .update(challenge)
                .digest()
            
            const signature = await schnorr.sign(message, privateKey)
            
            const proof = {
                did: did,
                challenge: challenge,
                signature: uint8ArrayToBase64(signature),
                timestamp: Date.now()
            }
            
            this.proofs.set(`${did}:${challenge}`, proof)
            return proof
        } catch (error) {
            console.error('Error generating proof:', error)
            throw error
        }
    }

    // Verify zero-knowledge proof
    async verifyProof(proof) {
        try {
            const identity = this.identities.get(proof.did)
            if (!identity) {
                return false
            }
            
            const publicKey = base64ToUint8Array(identity.schnorrKeys.publicKey)
            const message = createHash('sha256')
                .update(proof.challenge)
                .digest()
            const signature = base64ToUint8Array(proof.signature)
            
            return await schnorr.verify(signature, message, publicKey)
        } catch (error) {
            console.error('Error verifying proof:', error)
            return false
        }
    }

    // Create anonymous credential
    async createAnonymousCredential(did, attributes) {
        try {
            const identity = this.identities.get(did)
            if (!identity) {
                throw new Error('Identity not found')
            }
            
            // Create blinded version of attributes
            const blindedAttributes = await this.blindAttributes(attributes)
            
            // Generate Schnorr signature for blinded attributes
            const privateKey = base64ToUint8Array(identity.schnorrKeys.privateKey)
            const message = createHash('sha256')
                .update(JSON.stringify(blindedAttributes))
                .digest()
            
            const signature = await schnorr.sign(message, privateKey)
            
            const credential = {
                blindedAttributes: blindedAttributes,
                signature: uint8ArrayToBase64(signature),
                metadata: {
                    created: Date.now(),
                    expires: Date.now() + (30 * 24 * 60 * 60 * 1000) // 30 days
                }
            }
            
            return credential
        } catch (error) {
            console.error('Error creating anonymous credential:', error)
            throw error
        }
    }

    // Blind attributes for anonymous credentials
    async blindAttributes(attributes) {
        const blindedAttributes = {}
        for (const [key, value] of Object.entries(attributes)) {
            // Hash attribute values for privacy
            const hashedValue = createHash('sha256')
                .update(value.toString())
                .digest('base64')
            
            // Add some random noise for unlinkability
            const noise = crypto.randomBytes(32).toString('base64')
            
            blindedAttributes[key] = {
                hash: hashedValue,
                noise: noise
            }
        }
        return blindedAttributes
    }

    // Verify anonymous credential
    async verifyAnonymousCredential(credential, publicKey) {
        try {
            // Verify credential hasn't expired
            if (credential.metadata.expires < Date.now()) {
                return false
            }
            
            // Verify signature
            const message = createHash('sha256')
                .update(JSON.stringify(credential.blindedAttributes))
                .digest()
            
            const signature = base64ToUint8Array(credential.signature)
            
            return await schnorr.verify(signature, message, publicKey)
        } catch (error) {
            console.error('Error verifying anonymous credential:', error)
            return false
        }
    }

    // Create selective disclosure proof
    async createSelectiveDisclosure(did, credential, disclosedAttributes) {
        try {
            const identity = this.identities.get(did)
            if (!identity) {
                throw new Error('Identity not found')
            }
            
            const disclosure = {
                did: did,
                disclosedAttributes: {},
                proof: null
            }
            
            // Only include requested attributes
            for (const attr of disclosedAttributes) {
                if (credential.blindedAttributes[attr]) {
                    disclosure.disclosedAttributes[attr] = 
                        credential.blindedAttributes[attr]
                }
            }
            
            // Generate proof of knowledge
            const privateKey = base64ToUint8Array(identity.schnorrKeys.privateKey)
            const message = createHash('sha256')
                .update(JSON.stringify(disclosure.disclosedAttributes))
                .digest()
            
            disclosure.proof = uint8ArrayToBase64(
                await schnorr.sign(message, privateKey)
            )
            
            return disclosure
        } catch (error) {
            console.error('Error creating selective disclosure:', error)
            throw error
        }
    }

    // Verify selective disclosure
    async verifySelectiveDisclosure(disclosure) {
        try {
            const identity = this.identities.get(disclosure.did)
            if (!identity) {
                return false
            }
            
            const publicKey = base64ToUint8Array(identity.schnorrKeys.publicKey)
            const message = createHash('sha256')
                .update(JSON.stringify(disclosure.disclosedAttributes))
                .digest()
            
            const proof = base64ToUint8Array(disclosure.proof)
            
            return await schnorr.verify(proof, message, publicKey)
        } catch (error) {
            console.error('Error verifying selective disclosure:', error)
            return false
        }
    }

    // Update identity metadata
    async updateIdentityMetadata(did, metadata) {
        const identity = this.identities.get(did)
        if (!identity) {
            throw new Error('Identity not found')
        }
        
        identity.metadata = {
            ...identity.metadata,
            ...metadata,
            lastUpdated: Date.now()
        }
        
        this.identities.set(did, identity)
    }

    // Revoke identity
    async revokeIdentity(did) {
        const identity = this.identities.get(did)
        if (!identity) {
            throw new Error('Identity not found')
        }
        
        // Remove all proofs associated with this identity
        for (const [key, proof] of this.proofs.entries()) {
            if (proof.did === did) {
                this.proofs.delete(key)
            }
        }
        
        // Remove identity
        this.identities.delete(did)
    }
}

export default IdentityManager
