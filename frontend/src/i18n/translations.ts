export const translations = {
  en: {
    title: 'DCOOM Messaging',
    subtitle: 'Secure Blockchain Messaging Platform',
    placeholder: 'Type your message...',
    send: 'Send',
    verifying: 'Verifying...',
    verified: '✓ Verified on Solana',
    initialValidation: 'Initial validation...',
    transactionSimulation: 'Processing transaction...',
    confirmation: 'Confirming on blockchain...'
  },
  tr: {
    title: 'DCOOM Mesajlaşma',
    subtitle: 'Güvenli Blockchain Mesajlaşma Platformu',
    placeholder: 'Mesajınızı yazın...',
    send: 'Gönder',
    verifying: 'Doğrulanıyor...',
    verified: '✓ Solana\'da Doğrulandı',
    initialValidation: 'İlk doğrulama...',
    transactionSimulation: 'İşlem gerçekleştiriliyor...',
    confirmation: 'Blockchain\'de onaylanıyor...'
  }
};

export type Language = 'en' | 'tr';
export type TranslationKey = keyof typeof translations.en;
