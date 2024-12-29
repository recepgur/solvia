import crypto from 'crypto'
import { EventEmitter } from 'events'
import * as ed25519 from '@noble/ed25519'
import CrossChainManager from './cross-chain-manager.js'
import { createHash } from 'crypto'
import { encode as uint8ArrayToBase64 } from 'uint8arrays/to-string'
import { decode as base64ToUint8Array } from 'uint8arrays/from-string'

class BlockchainNode extends EventEmitter {
    constructor(config = {}) {
        super()
        this.blocks = []
        this.mempool = new Map() // Pending transactions
        this.validators = new Map() // Validator stakes and info
        this.peers = new Map() // Connected peers
        this.config = {
            blockTime: 3000, // 3 seconds
            validatorCount: 21, // Number of active validators
            minStake: 100000, // Minimum stake for validator
            ethereumRPC: config.ethereumRPC,
            solanaRPC: config.solanaRPC,
            bridgeAddress: config.bridgeAddress,
            ...config
        }
        
        // Initialize cross-chain manager
        this.crossChainManager = new CrossChainManager(this.config)
        
        // Initialize cryptographic keys
        this.initializeKeys()
    }

    // Initialize node's cryptographic keys
    async initializeKeys() {
        this.privateKey = ed25519.utils.randomPrivateKey()
        this.publicKey = await ed25519.getPublicKey(this.privateKey)
        this.address = createHash('sha256')
            .update(this.publicKey)
            .digest('hex')
    }

    // Start the blockchain node
    async start() {
        // Start block production if validator
        if (this.isValidator()) {
            this.startBlockProduction()
        }
        
        // Start transaction validation
        this.startTransactionValidation()
        
        this.emit('started', {
            address: this.address,
            isValidator: this.isValidator()
        })
    }

    // Check if node is a validator
    isValidator() {
        return this.validators.has(this.address) &&
            this.validators.get(this.address).stake >= this.config.minStake
    }

    // Start block production cycle
    startBlockProduction() {
        setInterval(async () => {
            if (this.isNextBlockProducer()) {
                await this.produceBlock()
            }
        }, this.config.blockTime)
    }

    // Check if this node is the next block producer
    isNextBlockProducer() {
        const activeValidators = Array.from(this.validators.entries())
            .filter(([_, info]) => info.stake >= this.config.minStake)
            .sort((a, b) => b[1].stake - a[1].stake)
            .slice(0, this.config.validatorCount)
        
        const currentSlot = Math.floor(Date.now() / this.config.blockTime)
        const producerIndex = currentSlot % activeValidators.length
        
        return activeValidators[producerIndex][0] === this.address
    }

    // Produce new block
    async produceBlock() {
        const transactions = Array.from(this.mempool.values())
            .slice(0, 1000) // Limit transactions per block
        
        const block = {
            timestamp: Date.now(),
            previousHash: this.blocks.length > 0 
                ? this.blocks[this.blocks.length - 1].hash 
                : '0'.repeat(64),
            transactions: transactions,
            producer: this.address,
            number: this.blocks.length,
            signature: null
        }
        
        // Calculate block hash
        block.hash = this.calculateBlockHash(block)
        
        // Sign block
        block.signature = await this.signBlock(block)
        
        // Validate and add block
        if (await this.validateBlock(block)) {
            this.addBlock(block)
            this.broadcastBlock(block)
        }
    }

    // Calculate block hash
    calculateBlockHash(block) {
        const blockData = {
            timestamp: block.timestamp,
            previousHash: block.previousHash,
            transactions: block.transactions,
            producer: block.producer,
            number: block.number
        }
        
        return createHash('sha256')
            .update(JSON.stringify(blockData))
            .digest('hex')
    }

    // Sign block with producer's private key
    async signBlock(block) {
        const message = uint8ArrayFromString(block.hash)
        const signature = await ed25519.sign(message, this.privateKey)
        return uint8ArrayToBase64(signature)
    }

    // Validate block
    async validateBlock(block) {
        // Verify block producer is active validator
        if (!this.validators.has(block.producer) ||
            this.validators.get(block.producer).stake < this.config.minStake) {
            return false
        }
        
        // Verify block hash
        const calculatedHash = this.calculateBlockHash(block)
        if (calculatedHash !== block.hash) {
            return false
        }
        
        // Verify block signature
        const message = uint8ArrayFromString(block.hash)
        const signature = base64ToUint8Array(block.signature)
        const producerPublicKey = this.validators.get(block.producer).publicKey
        
        try {
            await ed25519.verify(signature, message, producerPublicKey)
        } catch {
            return false
        }
        
        // Verify transactions
        for (const tx of block.transactions) {
            if (!await this.validateTransaction(tx)) {
                return false
            }
        }
        
        return true
    }

    // Add block to chain
    addBlock(block) {
        this.blocks.push(block)
        
        // Remove included transactions from mempool
        for (const tx of block.transactions) {
            this.mempool.delete(tx.hash)
        }
        
        this.emit('newBlock', block)
    }

    // Broadcast block to peers
    broadcastBlock(block) {
        this.emit('broadcastBlock', block)
    }

    // Add transaction to mempool
    async addTransaction(transaction) {
        if (await this.validateTransaction(transaction)) {
            this.mempool.set(transaction.hash, transaction)
            this.emit('newTransaction', transaction)
            return true
        }
        return false
    }

    // Validate transaction
    async validateTransaction(transaction) {
        // Verify transaction signature
        try {
            const message = uint8ArrayFromString(transaction.hash)
            const signature = base64ToUint8Array(transaction.signature)
            await ed25519.verify(
                signature,
                message,
                transaction.senderPublicKey
            )
        } catch {
            return false
        }
        
        // Additional transaction validation logic here
        return true
    }

    // Start transaction validation cycle
    startTransactionValidation() {
        setInterval(() => {
            for (const [hash, tx] of this.mempool) {
                if (Date.now() - tx.timestamp > 3600000) { // 1 hour timeout
                    this.mempool.delete(hash)
                }
            }
        }, 60000) // Check every minute
    }

    // Add or update validator
    addValidator(address, stake, publicKey) {
        this.validators.set(address, { stake, publicKey })
        this.emit('validatorUpdate', { address, stake, publicKey })
    }

    // Remove validator
    removeValidator(address) {
        this.validators.delete(address)
        this.emit('validatorUpdate', { address, removed: true })
    }

    // Get blockchain state
    getState() {
        return {
            blocks: this.blocks.length,
            mempool: this.mempool.size,
            validators: this.validators.size,
            isValidator: this.isValidator(),
            address: this.address
        }
    }

    // Stop the blockchain node
    stop() {
        // Cleanup logic here
        this.emit('stopped', this.getState())
    }

    // Get node status for metrics
    getNodeStatus() {
        const lastBlock = this.blocks[this.blocks.length - 1]
        const previousBlock = this.blocks[this.blocks.length - 2]
        
        return {
            nodeId: this.address,
            lastBlockTime: lastBlock ? 
                (previousBlock ? (lastBlock.timestamp - previousBlock.timestamp) / 1000 : 0) : 0,
            isSynced: true, // TODO: Implement proper sync check
            peerCount: this.peers.size,
            newTransactions: this.mempool.size
        }
    }
}

export default BlockchainNode
export { BlockchainNode }
