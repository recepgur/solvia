import Web3 from 'web3';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, createTransferInstruction } from '@solana/spl-token';
import PaymentContractABI from '../contracts/PaymentContract.json';
import { SOLANA_FEES, SOLVIO_TOKEN, PROGRAM_IDS } from './constants';

class PaymentManager {
    constructor() {
        this.web3 = null;
        this.solanaConnection = null;
        this.paymentContract = null;
        this.walletType = null;
        this.account = null;
        this.contractAddress = process.env.REACT_APP_ETH_CONTRACT_ADDRESS;
        this.tokenAddress = process.env.REACT_APP_ETH_TOKEN_ADDRESS;
    }

    async init(walletType, account) {
        this.walletType = walletType;
        this.account = account;

        if (walletType === 'ethereum') {
            this.web3 = new Web3(window.ethereum);
            this.paymentContract = new this.web3.eth.Contract(
                PaymentContractABI.abi,
                this.contractAddress
            );
        } else if (walletType === 'solana') {
            this.solanaConnection = new Connection('https://api.mainnet-beta.solana.com');
        }
    }

    async payFee(feeType) {
        if (!this.account) {
            throw new Error('Wallet not connected');
        }

        try {
            if (this.walletType === 'ethereum') {
                return await this.payEthereumFee(feeType);
            } else if (this.walletType === 'solana') {
                return await this.paySolanaFee(feeType);
            }
        } catch (error) {
            console.error('Error processing payment:', error);
            throw error;
        }
    }

    async payEthereumFee(feeType) {
        if (!this.paymentContract) {
            throw new Error('Payment contract not initialized');
        }

        try {
            // Get the fee amount from the contract
            const feeAmount = await this.paymentContract.methods.getFeeAmount(
                this.getPaymentTypeIndex(feeType)
            ).call();

            // First approve the token transfer
            const tokenContract = new this.web3.eth.Contract([
                {
                    "constant": false,
                    "inputs": [
                        {
                            "name": "_spender",
                            "type": "address"
                        },
                        {
                            "name": "_value",
                            "type": "uint256"
                        }
                    ],
                    "name": "approve",
                    "outputs": [
                        {
                            "name": "",
                            "type": "bool"
                        }
                    ],
                    "payable": false,
                    "stateMutability": "nonpayable",
                    "type": "function"
                }
            ], this.tokenAddress);

            await tokenContract.methods.approve(
                this.contractAddress,
                feeAmount
            ).send({ from: this.account });

            // Process the payment
            const result = await this.paymentContract.methods.processPayment(
                this.getPaymentTypeIndex(feeType),
                `Payment for ${feeType}`
            ).send({ from: this.account });

            return result;
        } catch (error) {
            console.error('Error processing Ethereum payment:', error);
            throw error;
        }
    }

    getPaymentTypeIndex(feeType) {
        const types = {
            'SERVICE_FEE': 0,
            'PREMIUM_SUBSCRIPTION': 1,
            'GROUP_CALL_FEE': 2,
            'RECORDING_FEE': 3,
            'CUSTOM_FEE': 4
        };
        return types[feeType];
    }

    async paySolanaFee(feeType) {
        if (!this.solanaConnection) {
            throw new Error('Solana bağlantısı başlatılmadı');
        }

        try {
            const feeAmount = SOLANA_FEES[feeType] || SOLANA_FEES.SERVICE_FEE;
            const fromPubkey = new PublicKey(this.account);
            const mintPubkey = new PublicKey(SOLVIO_TOKEN.MINT_ADDRESS);
            const tokenProgramId = new PublicKey(PROGRAM_IDS.TOKEN_PROGRAM);
            
            // Servis sağlayıcının cüzdan adresi (fee collector)
            const feePubkey = new PublicKey(PROGRAM_IDS.FEE_COLLECTOR);
            
            // Kullanıcının token hesabını al
            const fromTokenAccount = await getAssociatedTokenAddress(
                mintPubkey,
                fromPubkey,
                false,
                tokenProgramId
            );

            // Servis sağlayıcının token hesabını al
            const toTokenAccount = await getAssociatedTokenAddress(
                mintPubkey,
                feePubkey,
                false,
                tokenProgramId
            );

            // Token hesap bakiyesini kontrol et
            try {
                const balance = await this.solanaConnection.getTokenAccountBalance(fromTokenAccount);
                const currentBalance = balance.value.uiAmount;
                const requiredAmount = feeAmount / Math.pow(10, SOLVIO_TOKEN.DECIMALS);
                
                if (currentBalance < requiredAmount) {
                    throw new Error(`Yetersiz SOLV bakiyesi. Gerekli: ${requiredAmount} SOLV, Mevcut: ${currentBalance} SOLV`);
                }
            } catch (error) {
                if (error.message.includes('Yetersiz SOLV')) {
                    throw error;
                }
                console.log('Token hesabı henüz oluşturulmamış');
            }

            const transaction = new Transaction();
            const recentBlockhash = await this.solanaConnection.getRecentBlockhash();
            transaction.recentBlockhash = recentBlockhash.blockhash;
            transaction.feePayer = fromPubkey;

            // Eğer kullanıcının token hesabı yoksa oluştur
            try {
                await this.solanaConnection.getAccountInfo(fromTokenAccount);
            } catch {
                transaction.add(
                    createAssociatedTokenAccountInstruction(
                        fromPubkey,
                        fromTokenAccount,
                        fromPubkey,
                        mintPubkey,
                        tokenProgramId,
                        new PublicKey(PROGRAM_IDS.ASSOCIATED_TOKEN)
                    )
                );
            }

            // Token transfer talimatını ekle
            transaction.add(
                createTransferInstruction(
                    fromTokenAccount,
                    toTokenAccount,
                    fromPubkey,
                    feeAmount,
                    [],
                    tokenProgramId
                )
            );

            let retries = 3;
            let signature;
            
            while (retries > 0) {
                try {
                    signature = await window.solana.signAndSendTransaction(transaction);
                    const confirmation = await this.solanaConnection.confirmTransaction(
                        signature.signature,
                        'confirmed'
                    );
                    
                    if (confirmation.value.err) {
                        throw new Error('İşlem onaylanmadı');
                    }
                    
                    break;
                } catch (error) {
                    retries--;
                    if (retries === 0) {
                        throw new Error(`İşlem ${error.message} nedeniyle başarısız oldu`);
                    }
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }

            return {
                signature: signature.signature,
                feeType,
                amount: feeAmount / Math.pow(10, SOLVIO_TOKEN.DECIMALS),
                token: SOLVIO_TOKEN.SYMBOL,
                timestamp: Date.now(),
                status: 'success'
            };
        } catch (error) {
            console.error('Solana ödemesi işlenirken hata:', error);
            throw new Error(`Ödeme işlemi başarısız: ${error.message}`);
        }
    }
}

export default PaymentManager;
