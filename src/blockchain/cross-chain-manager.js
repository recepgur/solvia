import { ethers } from 'ethers';
import { Connection, PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import { EventEmitter } from 'events';
import { bridgeABI } from '../contracts/abi/CrossChainBridge.js';

class CrossChainManager extends EventEmitter {
    constructor(config = {}) {
        super();
        this.config = {
            ethereumRPC: config.ethereumRPC || 'https://mainnet.infura.io/v3/your-project-id',
            solanaRPC: config.solanaRPC || 'https://api.mainnet-beta.solana.com',
            bridgeAddress: config.bridgeAddress,
            ...config
        };
        
        this.initialize();
    }
    
    async initialize() {
        // Initialize Ethereum provider
        this.ethereumProvider = new ethers.JsonRpcProvider(this.config.ethereumRPC);
        
        // Initialize Solana connection
        this.solanaConnection = new Connection(this.config.solanaRPC);
        
        // Initialize bridge contract
        this.bridgeContract = new ethers.Contract(
            this.config.bridgeAddress,
            bridgeABI,
            this.ethereumProvider
        );
        
        // Listen for bridge events
        this.listenToBridgeEvents();
    }
    
    // Listen for cross-chain bridge events
    listenToBridgeEvents() {
        this.bridgeContract.on('BridgeInitiated', async (
            eventId,
            sender,
            targetChain,
            targetAddress,
            amount,
            timestamp
        ) => {
            this.emit('bridgeInitiated', {
                eventId,
                sender,
                targetChain,
                targetAddress,
                amount,
                timestamp
            });
            
            // Handle bridge event
            await this.handleBridgeEvent(
                eventId,
                sender,
                targetChain,
                targetAddress,
                amount
            );
        });
    }
    
    // Handle incoming bridge event
    async handleBridgeEvent(
        eventId,
        sender,
        targetChain,
        targetAddress,
        amount
    ) {
        try {
            switch(targetChain.toLowerCase()) {
                case 'ethereum':
                    await this.handleEthereumBridge(
                        eventId,
                        sender,
                        targetAddress,
                        amount
                    );
                    break;
                    
                case 'solana':
                    await this.handleSolanaBridge(
                        eventId,
                        sender,
                        targetAddress,
                        amount
                    );
                    break;
                    
                default:
                    throw new Error(`Unsupported chain: ${targetChain}`);
            }
            
            this.emit('bridgeCompleted', {
                eventId,
                targetChain,
                success: true
            });
        } catch (error) {
            this.emit('bridgeError', {
                eventId,
                targetChain,
                error: error.message
            });
        }
    }
    
    // Handle Ethereum bridge transfer
    async handleEthereumBridge(eventId, sender, targetAddress, amount) {
        try {
            const status = await this.getBridgeEventStatus(eventId);
            if (status.processed) {
                throw new Error('Bridge event already processed');
            }

            const tx = await this.bridgeContract.connect(this.signer).confirmBridgeEvent(
                eventId,
                'ethereum'
            );
            
            await tx.wait();
            
            return {
                success: true,
                transactionHash: tx.hash
            };
        } catch (error) {
            throw new Error(`Ethereum bridge error: ${error.message}`);
        }
    }
    
    // Handle Solana bridge transfer
    async handleSolanaBridge(eventId, sender, targetAddress, amount) {
        try {
            const recipientPubKey = new PublicKey(targetAddress);
            
            const transaction = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: this.solanaWallet.publicKey,
                    toPubkey: recipientPubKey,
                    lamports: amount
                })
            );
            
            const signature = await this.solanaConnection.sendTransaction(
                transaction,
                [this.solanaWallet]
            );
            
            await this.solanaConnection.confirmTransaction(signature);
            
            return {
                success: true,
                signature: signature
            };
        } catch (error) {
            throw new Error(`Solana bridge error: ${error.message}`);
        }
    }
    
    // Initiate cross-chain transfer
    async initiateCrossChainTransfer(
        targetChain,
        targetAddress,
        amount,
        options = {}
    ) {
        try {
            const tx = await this.bridgeContract.initiateBridge(
                targetChain,
                targetAddress,
                amount,
                options
            );
            
            const receipt = await tx.wait();
            const event = receipt.events.find(e => e.event === 'BridgeInitiated');
            
            return {
                success: true,
                eventId: event.args.eventId,
                transaction: tx.hash
            };
        } catch (error) {
            throw new Error(`Failed to initiate bridge: ${error.message}`);
        }
    }
    
    // Get bridge event status
    async getBridgeEventStatus(eventId) {
        const event = await this.bridgeContract.bridgeEvents(eventId);
        return {
            processed: event.processed,
            confirmations: await this.bridgeContract.confirmationCount(eventId),
            required: await this.bridgeContract.requiredConfirmations(event.targetChain)
        };
    }
}

export { CrossChainManager };
