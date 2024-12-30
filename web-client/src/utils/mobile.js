import { WALLET_CONFIG } from './config';
import { getMessage } from './language';

/**
 * Detect if the current device is mobile
 * @returns {boolean}
 */
export const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

/**
 * Get deep link URL for a specific wallet
 * @param {string} walletType - Type of wallet (metamask, phantom, etc.)
 * @returns {string} Deep link URL
 */
export const getWalletDeepLink = (walletType) => {
    const dappUrl = encodeURIComponent(window.location.href);
    
    switch (walletType) {
        case WALLET_CONFIG.TYPES.ETHEREUM:
            return `https://metamask.app.link/dapp/${dappUrl}`;
        case 'coinbase':
            return `https://go.cb-w.com/dapp?url=${dappUrl}`;
        case WALLET_CONFIG.TYPES.SOLANA:
            return `https://phantom.app/ul/browse/${dappUrl}`;
        case 'trust':
            return `https://link.trustwallet.com/open_url?url=${dappUrl}`;
        default:
            return null;
    }
};

/**
 * Get QR code content for wallet connection
 * @param {string} walletType - Type of wallet
 * @param {string} address - Wallet address
 * @returns {string} QR code content
 */
export const getWalletQRContent = (walletType, address) => {
    const dappUrl = encodeURIComponent(window.location.href);
    return `solvia://${walletType}/connect?address=${address}&dapp=${dappUrl}`;
};

/**
 * Get wallet store URL
 * @param {string} walletType - Type of wallet
 * @returns {string} Store URL
 */
export const getWalletStoreUrl = (walletType) => {
    if (isMobile()) {
        // Mobile store URLs
        switch (walletType) {
            case WALLET_CONFIG.TYPES.ETHEREUM:
                return isIOS() 
                    ? 'https://apps.apple.com/app/metamask/id1438144202'
                    : 'https://play.google.com/store/apps/details?id=io.metamask';
            case 'coinbase':
                return isIOS()
                    ? 'https://apps.apple.com/app/coinbase-wallet/id1278383455'
                    : 'https://play.google.com/store/apps/details?id=org.toshi';
            case WALLET_CONFIG.TYPES.SOLANA:
                return isIOS()
                    ? 'https://apps.apple.com/app/phantom-solana-wallet/id1598432977'
                    : 'https://play.google.com/store/apps/details?id=app.phantom';
            case 'trust':
                return isIOS()
                    ? 'https://apps.apple.com/app/trust-crypto-bitcoin-wallet/id1288339409'
                    : 'https://play.google.com/store/apps/details?id=com.wallet.crypto.trustapp';
            default:
                return null;
        }
    }
    return WALLET_CONFIG.LINKS[`${walletType.toUpperCase()}_DOWNLOAD`];
};

/**
 * Check if device is iOS
 * @returns {boolean}
 */
export const isIOS = () => {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
};

/**
 * Handle mobile wallet connection
 * @param {string} walletType - Type of wallet
 * @returns {Promise<void>}
 */
export const handleMobileWalletConnection = async (walletType) => {
    if (!isMobile()) return false;

    const deepLink = getWalletDeepLink(walletType);
    if (!deepLink) return false;

    // Try deep linking first
    window.location.href = deepLink;

    // Set a timeout to show QR code or store link if deep linking fails
    return new Promise((resolve) => {
        setTimeout(() => {
            const storeUrl = getWalletStoreUrl(walletType);
            if (storeUrl) {
                if (confirm(getMessage('WALLET_NOT_INSTALLED_MOBILE'))) {
                    window.location.href = storeUrl;
                }
            }
            resolve(true);
        }, 2500);
    });
};
