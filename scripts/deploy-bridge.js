import { ethers } from 'ethers';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const TIMEOUT = 60000; // 60 seconds timeout
const MAX_RETRIES = 3;
const ETH_RPC = process.env.ETHEREUM_RPC || 'https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161';
const SOL_RPC = process.env.SOLANA_RPC || 'https://api.devnet.solana.com';

async function retryWithBackoff(operation, maxRetries = MAX_RETRIES) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await operation();
        } catch (error) {
            if (i === maxRetries - 1) throw error;
            const delay = Math.min(1000 * Math.pow(2, i), 10000);
            console.log(`Attempt ${i + 1} failed, retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function withTimeout(promise, ms, operation) {
    const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`${operation} timed out after ${ms}ms`)), ms)
    );
    return Promise.race([promise, timeout]);
}

async function validateNetworkConnection(provider, network) {
    return retryWithBackoff(async () => {
        try {
            const operation = network === 'ethereum' ? 
                () => provider.getNetwork() :
                () => provider.getVersion();
            
            await withTimeout(
                operation(),
                TIMEOUT,
                `${network} connection validation`
            );
            console.log(`✓ ${network} connection validated (attempt successful)`);
            return true;
        } catch (error) {
            console.error(`✗ ${network} connection attempt failed:`, error.message);
            throw error; // Propagate error for retry mechanism
        }
    }).catch(error => {
        console.error(`✗ ${network} connection failed after all retries:`, error.message);
        return false;
    });
}

async function main() {
    try {
        console.log('Initializing network connections...');
        
        // Initialize Ethereum connection with timeout
        const provider = new ethers.providers.JsonRpcProvider(ETH_RPC);
        const solConnection = new Connection(SOL_RPC);
        
        // Validate network connections
        const [ethValid, solValid] = await Promise.all([
            validateNetworkConnection(provider, 'ethereum'),
            validateNetworkConnection(solConnection, 'solana')
        ]);
        
        if (!ethValid || !solValid) {
            throw new Error('Network validation failed');
        }
        
        // Initialize wallets
        console.log('Initializing wallets...');
        const wallet = new ethers.Wallet(process.env.PRIVATE_KEY || 'ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', provider);
        const solanaWallet = Keypair.generate();
        
        // Load contract artifact
        console.log('Loading contract artifacts...');
        const artifactPath = path.join(__dirname, '../src/contracts/abi/CrossChainBridge.json');
        const contractArtifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    
        // Deploy bridge contract with retries and timeout
        console.log('Deploying CrossChainBridge contract...');
        const factory = new ethers.ContractFactory(
            contractArtifact.abi,
            contractArtifact.bytecode,
            wallet
        );

        const bridge = await retryWithBackoff(async () => {
            console.log('Attempting contract deployment...');
            const deploymentPromise = factory.deploy(solanaWallet.publicKey.toString());
            const deployed = await withTimeout(
                deploymentPromise,
                TIMEOUT,
                'contract deployment'
            );

            console.log('Waiting for deployment confirmation...');
            await withTimeout(
                deployed.deployed(),
                TIMEOUT,
                'deployment confirmation'
            );
            return deployed;
        });

        const address = await bridge.getAddress();
        console.log('CrossChainBridge deployed to:', address);

        // Save deployment information
        const deploymentInfo = {
            ethereumBridge: address,
            solanaWallet: solanaWallet.publicKey.toString(),
            timestamp: new Date().toISOString()
        };

        // Update .env file
        const envPath = path.join(__dirname, '../.env');
        const envContent = `
BRIDGE_ADDRESS=${address}
SOLANA_WALLET_PUBKEY=${solanaWallet.publicKey.toString()}
DEPLOYMENT_TIMESTAMP=${deploymentInfo.timestamp}
`;
        fs.writeFileSync(envPath, envContent, { flag: 'a' });

        console.log('Deployment information saved to .env');
        return deploymentInfo;
    } catch (error) {
        console.error('Deployment failed:', error.message);
        throw error;
    }
}

main()
    .then((deploymentInfo) => {
        console.log('Deployment successful:', deploymentInfo);
        process.exit(0);
    })
    .catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
