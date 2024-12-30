import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';

const WalletConnect = ({ onWalletConnect }) => {
    const [connectedAccount, setConnectedAccount] = useState(null);
    const [walletType, setWalletType] = useState(null);

    const connectEthereum = async () => {
        try {
            if (window.ethereum) {
                const accounts = await window.ethereum.request({
                    method: 'eth_requestAccounts'
                });
                setConnectedAccount(accounts[0]);
                setWalletType('ethereum');
                onWalletConnect('ethereum', accounts[0]);
            } else {
                alert('Please install MetaMask!');
            }
        } catch (error) {
            console.error('Error connecting to Ethereum wallet:', error);
        }
    };

    const connectSolana = async () => {
        try {
            if (window.solana) {
                const response = await window.solana.connect();
                setConnectedAccount(response.publicKey.toString());
                setWalletType('solana');
                onWalletConnect('solana', response.publicKey.toString());
            } else {
                alert('Please install Phantom wallet!');
            }
        } catch (error) {
            console.error('Error connecting to Solana wallet:', error);
        }
    };

    const disconnectWallet = () => {
        if (walletType === 'solana' && window.solana) {
            window.solana.disconnect();
        }
        setConnectedAccount(null);
        setWalletType(null);
    };

    // Listen for account changes
    useEffect(() => {
        if (window.ethereum) {
            window.ethereum.on('accountsChanged', (accounts) => {
                if (accounts.length > 0) {
                    setConnectedAccount(accounts[0]);
                } else {
                    setConnectedAccount(null);
                }
            });
        }

        if (window.solana) {
            window.solana.on('disconnect', () => {
                setConnectedAccount(null);
                setWalletType(null);
            });
        }

        return () => {
            if (window.ethereum) {
                window.ethereum.removeListener('accountsChanged', () => {});
            }
            if (window.solana) {
                window.solana.removeListener('disconnect', () => {});
            }
        };
    }, []);

    return (
        <div className="p-4 space-y-4">
            {!connectedAccount ? (
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={connectEthereum}
                        className="flex-1"
                    >
                        Connect MetaMask
                    </Button>
                    <Button
                        variant="outline"
                        onClick={connectSolana}
                        className="flex-1"
                    >
                        Connect Phantom
                    </Button>
                </div>
            ) : (
                <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                        Connected: {connectedAccount.slice(0, 6)}...{connectedAccount.slice(-4)}
                    </span>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={disconnectWallet}
                    >
                        Disconnect
                    </Button>
                </div>
            )}
        </div>
    );
};

export default WalletConnect;
