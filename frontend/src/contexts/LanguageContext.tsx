import * as React from 'react';
import { createContext, useContext, useState } from 'react';

type Language = 'en' | 'tr';

type TranslationKey = 
  | 'connect.wallet'
  | 'select.nft'
  | 'loading.nfts'
  | 'loading.groups'
  | 'profile.title'
  | 'profile.description'
  | 'error.token.verification'
  | 'error.token.required'
  | 'error.wallet.not.connected'
  | 'error.ipfs.invalid'
  | 'error.ipfs.upload'
  | 'button.attach'
  | 'error.upload.failed'
  | 'media.uploading'
  | 'media.preview'
  | 'media.remove'
  | 'messages'
  | 'video.call'
  | 'private.rooms'
  | 'send.message'
  | 'type.message'
  | 'private.rooms.description'
  | 'create.room'
  | 'room.name'
  | 'required.nft'
  | 'join.room'
  | 'connect.wallet.rooms'
  | 'voice.rooms'
  | 'voice.rooms.description'
  | 'participants'
  | 'leave.room'
  | 'nft.required.error'
  | 'room.create.error'
  | 'room.join.error'
  | 'mic.on'
  | 'mic.off'
  | 'select.room'
  | 'enable.audio'
  | 'audio.device.error'
  | 'audio.permission.error'
  | 'forward'
  | 'download'
  | 'star'
  | 'reply.to.status'
  | 'status.updates'
  | 'chat.info'
  | 'group.welcome'
  | 'group.welcome.description'
  | 'group.create'
  | 'group.members'
  | 'search.members'
  | 'group.admin'
  | 'group.member'
  | 'group.name'
  | 'group.name.placeholder'
  | 'group.description'
  | 'group.description.placeholder'
  | 'group.required.nft'
  | 'group.required.nft.placeholder'
  | 'group.required.nft.description'
  | 'group.avatar'
  | 'cancel'
  | 'creating'
  | 'create'
  | 'replying.to';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey | string) => string;
}

const translations: Record<Language, Record<TranslationKey, string>> = {
  en: {
    'connect.wallet': 'Connect Wallet',
    'select.nft': 'Select NFT',
    'loading.nfts': 'Loading NFTs...',
    'profile.title': 'NFT Profile',
    'profile.description': 'Select an NFT from your wallet to use as your profile picture',
    'button.attach': 'Attach File',
    'error.upload.failed': 'Failed to upload file',
    'error.token.verification': 'Solvio token verification failed',
    'error.token.required': 'Solvio token is required to upload media',
    'error.wallet.not.connected': 'Please connect your wallet',
    'error.ipfs.upload': 'Failed to upload to IPFS',
    'error.ipfs.invalid': 'Invalid IPFS hash format',
    'media.uploading': 'Uploading media...',
    'media.preview': 'Media Preview',
    'media.remove': 'Remove Media',
    'messages': 'Messages',
    'video.call': 'Video Call',
    'private.rooms': 'Private Rooms',
    'send.message': 'Send Message',
    'type.message': 'Type a message...',
    'private.rooms.description': 'Create or join NFT-gated private chat rooms',
    'create.room': 'Create Room',
    'room.name': 'Room name',
    'required.nft': 'Required NFT address',
    'join.room': 'Join Room',
    'connect.wallet.rooms': 'Please connect your wallet to create or join private rooms',
    'voice.rooms': 'Voice Rooms',
    'voice.rooms.description': 'Create or join NFT-gated voice chat rooms',
    'participants': 'participants',
    'leave.room': 'Leave Room',
    'nft.required.error': 'You need the required NFT to access this room',
    'room.create.error': 'Error creating room. Please try again.',
    'room.join.error': 'Error joining room. Please try again.',
    'mic.on': 'Microphone On',
    'mic.off': 'Microphone Off',
    'select.room': 'Select a room to join',
    'enable.audio': 'Enable Audio',
    'audio.device.error': 'No audio device found. Please check your microphone.',
    'audio.permission.error': 'Unable to access microphone. Please grant permission.',
    'forward': 'Forward',
    'download': 'Download',
    'star': 'Star',
    'reply.to.status': 'Reply to status...',
    'status.updates': 'Status Updates',
    'chat.info': 'Chat Info',
    'group.welcome': 'Welcome to Group Chat',
    'group.welcome.description': 'Create a new group or join an existing one to start chatting',
    'group.create': 'Create Group',
    'group.members': 'Group Members',
    'search.members': 'Search members',
    'group.admin': 'Admin',
    'group.member': 'Member',
    'group.name': 'Group Name',
    'group.name.placeholder': 'Enter group name',
    'group.description': 'Group Description',
    'group.description.placeholder': 'Enter group description (optional)',
    'group.required.nft': 'Required NFT for joining',
    'group.required.nft.placeholder': 'Enter NFT contract address',
    'group.required.nft.description': 'Members must own this NFT to join the group',
    'group.avatar': 'Group Avatar',
    'cancel': 'Cancel',
    'creating': 'Creating...',
    'create': 'Create',
    'replying.to': 'Replying to',
    'loading.groups': 'Loading groups...'
  },
  tr: {
    'connect.wallet': 'Cüzdan Bağla',
    'select.nft': 'NFT Seç',
    'loading.nfts': 'NFTler Yükleniyor...',
    'profile.title': 'NFT Profili',
    'profile.description': 'Profil resmi olarak kullanmak için cüzdanınızdan bir NFT seçin',
    'button.attach': 'Dosya Ekle',
    'error.upload.failed': 'Dosya yükleme başarısız',
    'error.token.verification': 'Solvio token doğrulaması başarısız',
    'error.token.required': 'Medya yüklemek için Solvio token gerekli',
    'error.wallet.not.connected': 'Lütfen cüzdanınızı bağlayın',
    'error.ipfs.upload': 'IPFS\'e yükleme başarısız',
    'error.ipfs.invalid': 'Geçersiz IPFS hash formatı',
    'media.uploading': 'Medya yükleniyor...',
    'media.preview': 'Medya Önizleme',
    'media.remove': 'Medyayı Kaldır',
    'messages': 'Mesajlar',
    'video.call': 'Görüntülü Arama',
    'private.rooms': 'Özel Odalar',
    'send.message': 'Mesaj Gönder',
    'type.message': 'Mesaj yazın...',
    'private.rooms.description': 'NFT gerektiren özel sohbet odaları oluşturun veya katılın',
    'create.room': 'Oda Oluştur',
    'room.name': 'Oda adı',
    'required.nft': 'Gerekli NFT adresi',
    'join.room': 'Odaya Katıl',
    'connect.wallet.rooms': 'Özel odalara katılmak veya oluşturmak için cüzdanınızı bağlayın',
    'voice.rooms': 'Sesli Odalar',
    'voice.rooms.description': 'NFT gerektiren sesli sohbet odaları oluşturun veya katılın',
    'participants': 'katılımcı',
    'leave.room': 'Odadan Ayrıl',
    'nft.required.error': 'Bu odaya erişmek için gerekli NFT\'ye sahip olmanız gerekiyor',
    'room.create.error': 'Oda oluşturulurken hata oluştu. Lütfen tekrar deneyin.',
    'room.join.error': 'Odaya katılırken hata oluştu. Lütfen tekrar deneyin.',
    'mic.on': 'Mikrofon Açık',
    'mic.off': 'Mikrofon Kapalı',
    'select.room': 'Katılmak için bir oda seçin',
    'enable.audio': 'Sesi Etkinleştir',
    'audio.device.error': 'Ses cihazı bulunamadı. Lütfen mikrofonunuzu kontrol edin.',
    'audio.permission.error': 'Mikrofona erişilemiyor. Lütfen izin verin.',
    'forward': 'İlet',
    'download': 'İndir',
    'star': 'Yıldızla',
    'reply.to.status': 'Duruma yanıt ver...',
    'status.updates': 'Durum Güncellemeleri',
    'chat.info': 'Sohbet Bilgisi',
    'group.welcome': 'Grup Sohbetine Hoş Geldiniz',
    'group.welcome.description': 'Sohbete başlamak için yeni bir grup oluşturun veya mevcut bir gruba katılın',
    'group.create': 'Grup Oluştur',
    'group.members': 'Grup Üyeleri',
    'search.members': 'Üye ara',
    'group.admin': 'Yönetici',
    'group.member': 'Üye',
    'group.name': 'Grup Adı',
    'group.name.placeholder': 'Grup adını girin',
    'group.description': 'Grup Açıklaması',
    'group.description.placeholder': 'Grup açıklaması girin (isteğe bağlı)',
    'group.required.nft': 'Katılım için Gerekli NFT',
    'group.required.nft.placeholder': 'NFT kontrat adresini girin',
    'group.required.nft.description': 'Üyelerin gruba katılmak için bu NFT\'ye sahip olması gerekir',
    'group.avatar': 'Grup Avatarı',
    'cancel': 'İptal',
    'creating': 'Oluşturuluyor...',
    'create': 'Oluştur',
    'replying.to': 'Yanıtlanıyor',
    'loading.groups': 'Gruplar yükleniyor...'
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');

  const t = (key: string): string => {
    if (key in translations[language]) {
      return translations[language][key as TranslationKey];
    }
    return key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
