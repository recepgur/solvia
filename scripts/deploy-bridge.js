import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
    // Get the contract artifact
    const contractPath = path.join(__dirname, '../src/contracts/CrossChainBridge.sol');
    const source = fs.readFileSync(contractPath, 'utf8');
    
    // Connect to the network
    const provider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    
    // Deploy the contract
    console.log('Deploying CrossChainBridge contract...');
    const factory = new ethers.ContractFactory(
        ['constructor()'],
        '0x' + require('solc').compile(source, 1).contracts[':CrossChainBridge'].bytecode,
        wallet
    );
    
    const contract = await factory.deploy();
    await contract.waitForDeployment();
    
    const address = await contract.getAddress();
    console.log('CrossChainBridge deployed to:', address);
    
    // Update .env file with bridge address
    const envPath = path.join(__dirname, '../.env');
    let envContent = fs.readFileSync(envPath, 'utf8');
    envContent += `\nBRIDGE_ADDRESS=${address}`;
    fs.writeFileSync(envPath, envContent);
    
    return address;
}

main()
    .then((address) => {
        console.log(address);
        process.exit(0);
    })
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
