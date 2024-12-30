import io from 'socket.io-client';

// Environment Configuration
const isDevelopment = process.env.NODE_ENV === 'development';
const API_HOST = isDevelopment ? 'http://localhost:5001' : 'https://api.solvio.network';

// API Configuration
export const API_CONFIG = {
    BASE_URL: API_HOST,
    ENDPOINTS: {
        AUTH: {
            CHALLENGE: '/auth/challenge',
            VERIFY: '/auth/verify'
        },
        P2P: {
            STATUS: '/p2p/status'
        }
    },
    LOCAL_MODE: isDevelopment,
    TIMEOUT: 30000, // 30 seconds timeout
    RETRY: {
        attempts: 3,
        delay: 2000, // 2 seconds between retries
        backoff: 1.5 // Exponential backoff multiplier
    }
};

// WebSocket Configuration
export const SOCKET_CONFIG = {
    URL: API_HOST,
    OPTIONS: {
        transports: ['websocket', 'polling'], // Fallback to polling if websocket fails
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        autoConnect: true,
        forceNew: true,
        upgrade: true
    }
};

// Initialize socket instance
export const socket = io(SOCKET_CONFIG.URL, SOCKET_CONFIG.OPTIONS);

// Wallet Configuration
export const WALLET_CONFIG = {
    TYPES: {
        ETHEREUM: 'ethereum',
        SOLANA: 'solana'
    },
    MESSAGES: {
        tr: {
            CONNECT_SUCCESS: 'Cüzdan bağlantısı başarılı! Mesajlaşma sistemine hoş geldiniz.',
            CONNECT_ERROR: 'Cüzdan bağlantısı başarısız. Lütfen tekrar deneyin.',
            SIGNATURE_REQUEST: 'Güvenli giriş için lütfen mesajı imzalayın',
            NO_WALLET: 'Devam etmek için bir cüzdan yüklemeniz gerekmektedir',
            WRONG_NETWORK: 'Lütfen doğru ağa geçin ve tekrar deneyin',
            METAMASK_NOT_FOUND: 'MetaMask cüzdanı bulunamadı. Ethereum işlemleri için MetaMask\'ı yüklemeniz gerekmektedir.\n\nKurulum adımları:\n1. Chrome Web Store\'dan MetaMask eklentisini yükleyin\n2. Yeni bir cüzdan oluşturun veya mevcut cüzdanınızı içe aktarın\n3. Sayfayı yenileyin ve tekrar deneyin\n\nMetaMask kurulum linki: https://metamask.io/download/',
            PHANTOM_NOT_FOUND: 'Phantom cüzdanı bulunamadı. Solana işlemleri için Phantom cüzdanı yüklemeniz gerekmektedir.\n\nKurulum adımları:\n1. Chrome Web Store\'dan Phantom eklentisini yükleyin\n2. Yeni bir cüzdan oluşturun veya mevcut cüzdanınızı içe aktarın\n3. Sayfayı yenileyin ve tekrar deneyin\n\nPhantom kurulum linki: https://phantom.app/download',
            COINBASE_NOT_FOUND: 'Coinbase cüzdanı bulunamadı. Ethereum işlemleri için Coinbase cüzdanı yüklemeniz gerekmektedir.\n\nKurulum adımları:\n1. Chrome Web Store\'dan Coinbase Wallet eklentisini yükleyin\n2. Yeni bir cüzdan oluşturun veya mevcut cüzdanınızı içe aktarın\n3. Sayfayı yenileyin ve tekrar deneyin',
            TRUST_NOT_FOUND: 'Trust Wallet bulunamadı. İşlemler için Trust Wallet yüklemeniz gerekmektedir.\n\nKurulum adımları:\n1. Chrome Web Store\'dan Trust Wallet eklentisini yükleyin\n2. Yeni bir cüzdan oluşturun veya mevcut cüzdanınızı içe aktarın\n3. Sayfayı yenileyin ve tekrar deneyin',
            CONNECT_WITH_METAMASK: 'MetaMask ile Bağlan',
            CONNECT_WITH_PHANTOM: 'Phantom ile Bağlan',
            CONNECT_WITH_COINBASE: 'Coinbase ile Bağlan',
            CONNECT_WITH_TRUST: 'Trust Wallet ile Bağlan',
            METAMASK_NOT_INSTALLED: 'MetaMask Yüklü Değil',
            PHANTOM_NOT_INSTALLED: 'Phantom Yüklü Değil',
            COINBASE_NOT_INSTALLED: 'Coinbase Yüklü Değil',
            TRUST_NOT_INSTALLED: 'Trust Wallet Yüklü Değil',
            SECURE_WALLET_CONNECTION: 'Cüzdan bağlantısı güvenli bir şekilde gerçekleştirilecektir',
            IMPORTANT_WALLET_REQUIRED: 'Önemli: Cüzdan Gerekli',
            WALLET_REQUIRED_MESSAGE: 'Bu uygulamayı kullanmak için bir cüzdan yüklemeniz gerekmektedir.',
            INSTALL_METAMASK: 'MetaMask Yükle',
            INSTALL_PHANTOM: 'Phantom Yükle',
            CONNECTED: 'Bağlı',
            TOGGLE_LANGUAGE: 'Dili Değiştir',
            DISCONNECT: 'Bağlantıyı Kes',
            SOLVIA_WEB_CLIENT: 'Solvia Web İstemcisi',
            ENTER_USER_ID: 'Kullanıcı ID\'si girin',
            CONNECTED_USERS: 'Bağlı Kullanıcılar',
            SELECT_USER_TO_CHAT: 'Sohbet için bir kullanıcı seçin',
            SELECT_USER: 'Kullanıcı seçin',
            SERVICE_FEE_LABEL: 'Servis Ücreti',
            PREMIUM_LABEL: 'Premium',
            GROUP_CALL_LABEL: 'Grup Görüşmesi',
            RECORDING_LABEL: 'Kayıt',
            YOU: 'Siz',
            TYPE_YOUR_MESSAGE: 'Mesajınızı yazın'
        },
        en: {
            CONNECT_SUCCESS: 'Wallet connected successfully! Welcome to the messaging system.',
            CONNECT_ERROR: 'Wallet connection failed. Please try again.',
            SIGNATURE_REQUEST: 'Please sign the message for secure login',
            NO_WALLET: 'You need to install a wallet to continue',
            WRONG_NETWORK: 'Please switch to the correct network and try again',
            METAMASK_NOT_FOUND: 'MetaMask wallet not found. You need to install MetaMask for Ethereum transactions.\n\nInstallation steps:\n1. Install MetaMask extension from Chrome Web Store\n2. Create a new wallet or import your existing wallet\n3. Refresh the page and try again\n\nMetaMask installation link: https://metamask.io/download/',
            PHANTOM_NOT_FOUND: 'Phantom wallet not found. You need to install Phantom wallet for Solana transactions.\n\nInstallation steps:\n1. Install Phantom extension from Chrome Web Store\n2. Create a new wallet or import your existing wallet\n3. Refresh the page and try again\n\nPhantom installation link: https://phantom.app/download',
            COINBASE_NOT_FOUND: 'Coinbase wallet not found. You need to install Coinbase wallet for Ethereum transactions.\n\nInstallation steps:\n1. Install Coinbase Wallet extension from Chrome Web Store\n2. Create a new wallet or import your existing wallet\n3. Refresh the page and try again',
            TRUST_NOT_FOUND: 'Trust Wallet not found. You need to install Trust Wallet for transactions.\n\nInstallation steps:\n1. Install Trust Wallet extension from Chrome Web Store\n2. Create a new wallet or import your existing wallet\n3. Refresh the page and try again',
            CONNECT_WITH_METAMASK: 'Connect with MetaMask',
            CONNECT_WITH_PHANTOM: 'Connect with Phantom',
            CONNECT_WITH_COINBASE: 'Connect with Coinbase',
            CONNECT_WITH_TRUST: 'Connect with Trust Wallet',
            METAMASK_NOT_INSTALLED: 'MetaMask Not Installed',
            PHANTOM_NOT_INSTALLED: 'Phantom Not Installed',
            COINBASE_NOT_INSTALLED: 'Coinbase Not Installed',
            TRUST_NOT_INSTALLED: 'Trust Wallet Not Installed',
            SECURE_WALLET_CONNECTION: 'Wallet connection will be established securely',
            IMPORTANT_WALLET_REQUIRED: 'Important: Wallet Required',
            WALLET_REQUIRED_MESSAGE: 'You need to install a wallet to use this application.',
            INSTALL_METAMASK: 'Install MetaMask',
            INSTALL_PHANTOM: 'Install Phantom',
            CONNECTED: 'Connected',
            TOGGLE_LANGUAGE: 'Toggle Language',
            DISCONNECT: 'Disconnect',
            SOLVIA_WEB_CLIENT: 'Solvia Web Client',
            ENTER_USER_ID: 'Enter User ID',
            CONNECTED_USERS: 'Connected Users',
            SELECT_USER_TO_CHAT: 'Select a user to chat',
            SELECT_USER: 'Select user',
            SERVICE_FEE_LABEL: 'Service Fee',
            PREMIUM_LABEL: 'Premium',
            GROUP_CALL_LABEL: 'Group Call',
            RECORDING_LABEL: 'Recording',
            YOU: 'You',
            TYPE_YOUR_MESSAGE: 'Type your message'
        }
    },
    CURRENT_LANGUAGE: 'tr', // Default language
    LINKS: {
        METAMASK_DOWNLOAD: 'https://metamask.io/download/',
        PHANTOM_DOWNLOAD: 'https://phantom.app/download'
    }
};
