import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { API_CONFIG, WALLET_CONFIG, socket } from '../utils/config';
import { getMessage, setLanguage } from '../utils/language';

const WalletConnect = ({ onWalletConnect }) => {
    const [currentLanguage, setCurrentLanguage] = useState('tr');
    const [connectedAccount, setConnectedAccount] = useState(null);
    const [walletType, setWalletType] = useState(null);

    // Initialize and handle language changes
    useEffect(() => {
        setLanguage(currentLanguage);
        document.documentElement.setAttribute('data-language', currentLanguage);
    }, [currentLanguage]);

    const handleLanguageToggle = () => {
        const newLang = currentLanguage === 'tr' ? 'en' : 'tr';
        setCurrentLanguage(newLang);
        setLanguage(newLang);
    };

    const isCoinbaseWalletInstalled = () => {
        return typeof window.coinbaseWalletExtension !== 'undefined';
    };

    const isTrustWalletInstalled = () => {
        return typeof window.trustwallet !== 'undefined' 
            || (typeof window.ethereum !== 'undefined' && window.ethereum.isTrust);
    };

    const connectCoinbase = async () => {
        try {
            if (!isCoinbaseWalletInstalled()) {
                alert(getMessage('COINBASE_NOT_FOUND'));
                return;
            }

            // Request account access
            const accounts = await window.coinbaseWalletExtension.request({
                method: 'eth_requestAccounts'
            });
            const address = accounts[0];

            try {
                // Get challenge from server
                const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.AUTH.CHALLENGE}?walletAddress=${address}&walletType=${WALLET_CONFIG.TYPES.ETHEREUM}`, {
                    method: 'GET'
                });

                if (!response.ok) {
                    throw new Error(getMessage('CONNECT_ERROR'));
                }

                const { challenge } = await response.json();

                // Request signature
                const signature = await window.coinbaseWalletExtension.request({
                    method: 'personal_sign',
                    params: [challenge, address]
                });

                // Handle authentication in local mode or with socket
                if (API_CONFIG.LOCAL_MODE) {
                    console.log('Local mode: Simulating Coinbase wallet authentication');
                    console.log('Wallet address:', address);
                    console.log('Authentication type: Local mode');
                    
                    setTimeout(() => {
                        setConnectedAccount(address);
                        setWalletType(WALLET_CONFIG.TYPES.ETHEREUM);
                        onWalletConnect(WALLET_CONFIG.TYPES.ETHEREUM, address);
                        console.log('Local mode: Authentication successful');
                        alert(WALLET_CONFIG.MESSAGES.CONNECT_SUCCESS);
                    }, 1000);
                } else {
                    socket.emit('authenticate', {
                        walletAddress: address,
                        walletType: WALLET_CONFIG.TYPES.ETHEREUM,
                        signature
                    });
                }

                socket.once('authentication_response', (data) => {
                    if (data.success) {
                        setConnectedAccount(address);
                        setWalletType(WALLET_CONFIG.TYPES.ETHEREUM);
                        onWalletConnect(WALLET_CONFIG.TYPES.ETHEREUM, address);
                        alert(WALLET_CONFIG.MESSAGES.CONNECT_SUCCESS);
                    } else {
                        throw new Error(data.error || WALLET_CONFIG.MESSAGES.CONNECT_ERROR);
                    }
                });

            } catch (error) {
                throw new Error(error.message || WALLET_CONFIG.MESSAGES.CONNECT_ERROR);
            }
        } catch (error) {
            console.error('Error connecting to Coinbase wallet:', error);
            alert(error.message || getMessage('CONNECT_ERROR'));
        }
    };

    const connectTrust = async () => {
        try {
            if (!isTrustWalletInstalled()) {
                alert(getMessage('TRUST_NOT_FOUND'));
                return;
            }

            // Use the appropriate provider
            const provider = window.trustwallet || window.ethereum;
            
            // Request account access
            const accounts = await provider.request({
                method: 'eth_requestAccounts'
            });
            const address = accounts[0];

            try {
                // Get challenge from server
                const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.AUTH.CHALLENGE}?walletAddress=${address}&walletType=${WALLET_CONFIG.TYPES.ETHEREUM}`, {
                    method: 'GET'
                });

                if (!response.ok) {
                    throw new Error(WALLET_CONFIG.MESSAGES.CONNECT_ERROR);
                }

                const { challenge } = await response.json();

                // Request signature
                const signature = await provider.request({
                    method: 'personal_sign',
                    params: [challenge, address]
                });

                // Handle authentication in local mode or with socket
                if (API_CONFIG.LOCAL_MODE) {
                    console.log('Local mode: Simulating Trust wallet authentication');
                    console.log('Wallet address:', address);
                    console.log('Authentication type: Local mode');
                    
                    setTimeout(() => {
                        setConnectedAccount(address);
                        setWalletType(WALLET_CONFIG.TYPES.ETHEREUM);
                        onWalletConnect(WALLET_CONFIG.TYPES.ETHEREUM, address);
                        console.log('Local mode: Authentication successful');
                        alert(WALLET_CONFIG.MESSAGES.CONNECT_SUCCESS);
                    }, 1000);
                } else {
                    socket.emit('authenticate', {
                        walletAddress: address,
                        walletType: WALLET_CONFIG.TYPES.ETHEREUM,
                        signature
                    });
                }

                socket.once('authentication_response', (data) => {
                    if (data.success) {
                        setConnectedAccount(address);
                        setWalletType(WALLET_CONFIG.TYPES.ETHEREUM);
                        onWalletConnect(WALLET_CONFIG.TYPES.ETHEREUM, address);
                        alert(WALLET_CONFIG.MESSAGES.CONNECT_SUCCESS);
                    } else {
                        throw new Error(data.error || WALLET_CONFIG.MESSAGES.CONNECT_ERROR);
                    }
                });

            } catch (error) {
                throw new Error(error.message || WALLET_CONFIG.MESSAGES.CONNECT_ERROR);
            }
        } catch (error) {
            console.error('Error connecting to Trust wallet:', error);
            alert(error.message || getMessage('CONNECT_ERROR'));
        }
    };

    const connectEthereum = async () => {
        try {
            if (!window.ethereum) {
                alert(getMessage('METAMASK_NOT_FOUND'));
                return;
            }

            // Request account access
            const accounts = await window.ethereum.request({
                method: 'eth_requestAccounts'
            });
            const address = accounts[0];

            try {
                // Get challenge from server
                const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.AUTH.CHALLENGE}?walletAddress=${address}&walletType=${WALLET_CONFIG.TYPES.ETHEREUM}`, {
                    method: 'GET'
                });

                if (!response.ok) {
                    throw new Error(WALLET_CONFIG.MESSAGES.CONNECT_ERROR);
                }

                const { challenge } = await response.json();

                // Request signature
                const signature = await window.ethereum.request({
                    method: 'personal_sign',
                    params: [challenge, address]
                });

                // Handle authentication in local mode or with socket
                if (API_CONFIG.LOCAL_MODE) {
                    console.log('Local mode: Simulating Ethereum wallet authentication');
                    console.log('Wallet address:', address);
                    console.log('Authentication type: Local mode');
                    
                    // Simulate network delay
                    setTimeout(() => {
                        setConnectedAccount(address);
                        setWalletType(WALLET_CONFIG.TYPES.ETHEREUM);
                        onWalletConnect(WALLET_CONFIG.TYPES.ETHEREUM, address);
                        console.log('Local mode: Authentication successful');
                        alert(WALLET_CONFIG.MESSAGES.CONNECT_SUCCESS);
                    }, 1000);
                } else {
                    socket.emit('authenticate', {
                        walletAddress: address,
                        walletType: WALLET_CONFIG.TYPES.ETHEREUM,
                        signature
                    });
                }

                // Listen for authentication response
                socket.once('authentication_response', (data) => {
                    if (data.success) {
                        setConnectedAccount(address);
                        setWalletType(WALLET_CONFIG.TYPES.ETHEREUM);
                        onWalletConnect(WALLET_CONFIG.TYPES.ETHEREUM, address);
                        alert(WALLET_CONFIG.MESSAGES.CONNECT_SUCCESS);
                    } else {
                        throw new Error(data.error || WALLET_CONFIG.MESSAGES.CONNECT_ERROR);
                    }
                });

            } catch (error) {
                throw new Error(error.message || WALLET_CONFIG.MESSAGES.CONNECT_ERROR);
            }
        } catch (error) {
            console.error('Error connecting to Ethereum wallet:', error);
            alert(error.message || getMessage('CONNECT_ERROR'));
        }
    };

    const connectSolana = async () => {
        try {
            if (!window.solana) {
                alert(getMessage('PHANTOM_NOT_FOUND'));
                return;
            }

            // Connect to Phantom
            const response = await window.solana.connect();
            const address = response.publicKey.toString();

            try {
                // Get challenge from server
                const challengeResponse = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.AUTH.CHALLENGE}?walletAddress=${address}&walletType=${WALLET_CONFIG.TYPES.SOLANA}`, {
                    method: 'GET'
                });

                if (!challengeResponse.ok) {
                    throw new Error(WALLET_CONFIG.MESSAGES.CONNECT_ERROR);
                }

                const { challenge } = await challengeResponse.json();

                // Request signature
                const encodedMessage = new TextEncoder().encode(challenge);
                const signedMessage = await window.solana.signMessage(encodedMessage, "utf8");

                // Handle authentication in local mode or with socket
                if (API_CONFIG.LOCAL_MODE) {
                    console.log('Local mode: Simulating Solana wallet authentication');
                    console.log('Wallet address:', address);
                    console.log('Authentication type: Local mode');
                    
                    // Simulate network delay
                    setTimeout(() => {
                        setConnectedAccount(address);
                        setWalletType(WALLET_CONFIG.TYPES.SOLANA);
                        onWalletConnect(WALLET_CONFIG.TYPES.SOLANA, address);
                        console.log('Local mode: Authentication successful');
                        alert(getMessage('CONNECT_SUCCESS'));
                    }, 1000);
                } else {
                    socket.emit('authenticate', {
                        walletAddress: address,
                        walletType: WALLET_CONFIG.TYPES.SOLANA,
                        signature: signedMessage
                    });
                }

                // Listen for authentication response
                socket.once('authentication_response', (data) => {
                    if (data.success) {
                        setConnectedAccount(address);
                        setWalletType(WALLET_CONFIG.TYPES.SOLANA);
                        onWalletConnect(WALLET_CONFIG.TYPES.SOLANA, address);
                        alert(getMessage('CONNECT_SUCCESS'));
                    } else {
                        throw new Error(data.error || getMessage('CONNECT_ERROR'));
                    }
                });

            } catch (error) {
                throw new Error(error.message || WALLET_CONFIG.MESSAGES.CONNECT_ERROR);
            }
        } catch (error) {
            console.error('Error connecting to Solana wallet:', error);
            alert(error.message || getMessage('CONNECT_ERROR'));
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
        // Initialize wallet providers
        const initializeWallets = async () => {
            // Check for MetaMask
            if (typeof window.ethereum !== 'undefined') {
                console.log('MetaMask is installed!');
            }

            // Check for Phantom
            if ('solana' in window) {
                console.log('Phantom is installed!');
            }

            // Check for Coinbase Wallet
            if (isCoinbaseWalletInstalled()) {
                console.log('Coinbase Wallet is installed!');
            }

            // Check for Trust Wallet
            if (isTrustWalletInstalled()) {
                console.log('Trust Wallet is installed!');
            }
        };

        initializeWallets();

        // Setup socket event listeners
        const handleConnect = () => {
            console.log('Connected to server');
        };

        const handleError = (error) => {
            console.error('Socket error:', error);
            alert(getMessage('CONNECT_ERROR'));
        };

        socket.on('connect', handleConnect);
        socket.on('error', handleError);

        // Setup wallet event listeners
        const handleAccountsChanged = (accounts) => {
            if (accounts.length > 0) {
                setConnectedAccount(accounts[0]);
            } else {
                setConnectedAccount(null);
                setWalletType(null);
            }
        };

        const handleDisconnect = () => {
            setConnectedAccount(null);
            setWalletType(null);
        };

        if (window.ethereum) {
            window.ethereum.on('accountsChanged', handleAccountsChanged);
            window.ethereum.on('disconnect', handleDisconnect);
        }

        if (window.solana) {
            window.solana.on('disconnect', handleDisconnect);
        }

        return () => {
            // Cleanup socket listeners
            socket.off('connect', handleConnect);
            socket.off('error', handleError);
            socket.off('authentication_response');

            // Cleanup wallet listeners
            if (window.ethereum) {
                window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
                window.ethereum.removeListener('disconnect', handleDisconnect);
            }
            if (window.solana) {
                window.solana.removeListener('disconnect', handleDisconnect);
            }
        };
    }, []);

    return (
        <div className="space-y-6">
            {!connectedAccount ? (
                <div>
                    <div className="flex flex-col gap-4">
                        <div className="flex gap-4">
                            <Button
                                variant="outline"
                                onClick={connectEthereum}
                                className="flex-1 flex items-center justify-center gap-2 relative transition-all duration-200 hover:bg-gray-50 hover:border-gray-400 focus:ring-2 focus:ring-gray-200 focus:ring-offset-2 active:scale-95"
                                disabled={!window.ethereum}
                            >
                                <img src="/assets/metamask-fox.svg" alt="MetaMask" className="w-6 h-6 transition-transform group-hover:scale-110" />
                                {window.ethereum ? (
                                    <span className="wallet-text font-medium">
                                        {getMessage('CONNECT_WITH_METAMASK')}
                                    </span>
                                ) : (
                                    <span className="text-red-500">
                                        {getMessage('METAMASK_NOT_INSTALLED')}
                                    </span>
                                )}
                            </Button>
                            <Button
                                variant="outline"
                                onClick={connectCoinbase}
                                className="flex-1 flex items-center justify-center gap-2 relative transition-all duration-200 hover:bg-gray-50 hover:border-gray-400 focus:ring-2 focus:ring-gray-200 focus:ring-offset-2 active:scale-95"
                                disabled={!isCoinbaseWalletInstalled()}
                            >
                                <img src="/assets/coinbase-icon.svg" alt="Coinbase" className="w-6 h-6 transition-transform group-hover:scale-110" />
                                {isCoinbaseWalletInstalled() ? (
                                    <span className="wallet-text font-medium">
                                        {getMessage('CONNECT_WITH_COINBASE')}
                                    </span>
                                ) : (
                                    <span className="text-red-500">
                                        {getMessage('COINBASE_NOT_INSTALLED')}
                                    </span>
                                )}
                            </Button>
                        </div>
                        <div className="flex gap-4">
                            <Button
                                variant="outline"
                                onClick={connectSolana}
                                className="flex-1 flex items-center justify-center gap-2 relative transition-all duration-200 hover:bg-gray-50 hover:border-gray-400 focus:ring-2 focus:ring-gray-200 focus:ring-offset-2 active:scale-95"
                                disabled={!window.solana}
                            >
                                <img src="/assets/phantom-icon.svg" alt="Phantom" className="w-6 h-6 transition-transform group-hover:scale-110" />
                                {window.solana ? (
                                    <span className="wallet-text font-medium">
                                        {getMessage('CONNECT_WITH_PHANTOM')}
                                    </span>
                                ) : (
                                    <span className="text-red-500">
                                        {getMessage('PHANTOM_NOT_INSTALLED')}
                                    </span>
                                )}
                            </Button>
                            <Button
                                variant="outline"
                                onClick={connectTrust}
                                className="flex-1 flex items-center justify-center gap-2 relative transition-all duration-200 hover:bg-gray-50 hover:border-gray-400 focus:ring-2 focus:ring-gray-200 focus:ring-offset-2 active:scale-95"
                                disabled={!isTrustWalletInstalled()}
                            >
                                <img src="/assets/trust-icon.svg" alt="Trust Wallet" className="w-6 h-6 transition-transform group-hover:scale-110" />
                                {isTrustWalletInstalled() ? (
                                    <span className="wallet-text font-medium">
                                        {getMessage('CONNECT_WITH_TRUST')}
                                    </span>
                                ) : (
                                    <span className="text-red-500">
                                        {getMessage('TRUST_NOT_INSTALLED')}
                                    </span>
                                )}
                            </Button>
                        </div>
                    </div>
                    <div className="mt-8 text-center space-y-6">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleLanguageToggle}
                            className="hover:bg-gray-50"
                        >
                            {getMessage('TOGGLE_LANGUAGE')}
                        </Button>
                        <p className="text-sm text-gray-500/90">
                            {getMessage('SECURE_WALLET_CONNECTION')}
                        </p>
                        
                        <div className="p-6 border rounded-lg bg-yellow-50/80">
                            <p className="text-base font-medium text-yellow-800 mb-3">
                                {getMessage('IMPORTANT_WALLET_REQUIRED')}
                            </p>
                            <p className="text-sm text-yellow-700 mb-6">
                                {getMessage('WALLET_REQUIRED_MESSAGE')}
                            </p>
                            <div className="flex justify-center space-x-4">
                                <a 
                                    href={WALLET_CONFIG.LINKS.METAMASK_DOWNLOAD} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="px-4 py-2 bg-white border border-yellow-300 rounded-md text-yellow-700 hover:bg-yellow-50 transition-colors flex items-center gap-2"
                                >
                                    <img src="/assets/metamask-fox.svg" alt="MetaMask" className="w-5 h-5" />
                                    {getMessage('INSTALL_METAMASK')}
                                </a>
                                <a 
                                    href={WALLET_CONFIG.LINKS.PHANTOM_DOWNLOAD} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="px-4 py-2 bg-white border border-yellow-300 rounded-md text-yellow-700 hover:bg-yellow-50 transition-colors flex items-center gap-2"
                                >
                                    <img src="/assets/phantom-icon.svg" alt="Phantom" className="w-5 h-5" />
                                    {getMessage('INSTALL_PHANTOM')}
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                        {getMessage('CONNECTED')}: {connectedAccount.slice(0, 6)}...{connectedAccount.slice(-4)}
                    </span>
                    <div className="flex gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleLanguageToggle}
                        >
                            {getMessage('TOGGLE_LANGUAGE')}
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={disconnectWallet}
                        >
                            {getMessage('DISCONNECT')}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WalletConnect;
