import { WALLET_CONFIG } from './config';

export const setLanguage = (language) => {
    if (language === 'en' || language === 'tr') {
        document.documentElement.setAttribute('data-language', language);
        WALLET_CONFIG.CURRENT_LANGUAGE = language;
        localStorage.setItem('language', language);
    }
};

export const getMessage = (messageKey) => {
    return WALLET_CONFIG.MESSAGES[WALLET_CONFIG.CURRENT_LANGUAGE][messageKey] || messageKey;
};

export const toggleLanguage = () => {
    const newLang = WALLET_CONFIG.CURRENT_LANGUAGE === 'tr' ? 'en' : 'tr';
    setLanguage(newLang);
    return newLang;
};
