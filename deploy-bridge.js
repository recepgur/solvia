import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { ethers } from 'ethers';
import HDWalletProvider from '@truffle/hdwallet-provider';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load environment variables
const ETHEREUM_RPC = process.env.ETHEREUM_RPC || 'http://localhost:8545';
const SOLANA_RPC = process.env.SOLANA_RPC || 'http://localhost:8899';
const PRIVATE_KEY = process.env.PRIVATE_KEY || '';

async function deployBridge() {
    try {
        console.log('Initializing connections...');
        const provider = new HDWalletProvider({
            privateKeys: [PRIVATE_KEY],
            providerOrUrl: ETHEREUM_RPC
        });
        
        const ethWallet = new ethers.Wallet(PRIVATE_KEY, new ethers.providers.JsonRpcProvider(ETHEREUM_RPC));
        const solConnection = new Connection(SOLANA_RPC);
        const solWallet = Keypair.generate();
        
        console.log('Deploying Cross-Chain Bridge...');
        const bridgeArtifact = JSON.parse(
            readFileSync(join(__dirname, '../src/contracts/abi/CrossChainBridge.json'))
        );
        
        const CrossChainBridge = new ethers.ContractFactory(
            bridgeArtifact.abi,
            bridgeArtifact.bytecode,
            ethWallet
        );
        
        const bridge = await CrossChainBridge.deploy();
        await bridge.deployed();
        
        console.log('Bridge deployed successfully');
        console.log('Ethereum Bridge:', bridge.address);
        console.log('Solana Connection:', solConnection.rpcEndpoint);
        
        provider.engine.stop();
    } catch (error) {
        console.error('Deployment failed:', error);
        process.exit(1);
    }
}

deployBridge().catch(console.error);
