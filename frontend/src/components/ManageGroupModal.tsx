import { useState } from 'react';
import { X, Shield, Ban, VolumeX } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import type { GroupMember } from '../types/group';

interface ManageGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: GroupMember;
  onPromote: (memberId: string) => Promise<void>;
  onDemote: (memberId: string) => Promise<void>;
  onMute: (duration: number) => Promise<void>;
  onBan: (memberId: string) => Promise<void>;
  isAdmin: boolean;
}

export function ManageGroupModal({
  isOpen,
  onClose,
  member,
  onPromote,
  onDemote,
  onMute,
  onBan,
  isAdmin
}: ManageGroupModalProps) {
  const { t } = useLanguage();
  const [muteDuration, setMuteDuration] = useState(3600); // Default 1 hour in seconds

  if (!isOpen) return null;

  const handleAction = async (action: 'promote' | 'demote' | 'mute' | 'ban') => {
    try {
      switch (action) {
        case 'promote':
          await onPromote(member.wallet_address);
          break;
        case 'demote':
          await onDemote(member.wallet_address);
          break;
        case 'mute':
          await onMute(muteDuration);
          break;
        case 'ban':
          await onBan(member.wallet_address);
          break;
      }
      onClose();
    } catch (error) {
      console.error(`Error performing ${action} action:`, error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg p-6 w-96">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{t('manage.member')}</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4">
          <p className="font-medium">
            {member.wallet_address.slice(0, 6)}...{member.wallet_address.slice(-4)}
          </p>
          <p className="text-sm text-gray-500">
            {t(member.role === 'admin' ? 'group.admin' : 'group.member')}
          </p>
        </div>

        {isAdmin && (
          <div className="space-y-3">
            {member.role !== 'admin' ? (
              <button
                onClick={() => handleAction('promote')}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
              >
                <Shield className="h-4 w-4" />
                <span>{t('promote.to.admin')}</span>
              </button>
            ) : (
              <button
                onClick={() => handleAction('demote')}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
              >
                <Shield className="h-4 w-4" />
                <span>{t('demote.from.admin')}</span>
              </button>
            )}

            <div className="space-y-2">
              <label className="block text-sm font-medium">
                {t('mute.duration')}
              </label>
              <select
                value={muteDuration}
                onChange={(e) => setMuteDuration(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border dark:border-gray-700 bg-white dark:bg-gray-800"
              >
                <option value={3600}>{t('1.hour')}</option>
                <option value={86400}>{t('24.hours')}</option>
                <option value={604800}>{t('7.days')}</option>
              </select>
              <button
                onClick={() => handleAction('mute')}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
              >
                <VolumeX className="h-4 w-4" />
                <span>{t('mute.member')}</span>
              </button>
            </div>

            <button
              onClick={() => handleAction('ban')}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
            >
              <Ban className="h-4 w-4" />
              <span>{t('ban.member')}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
