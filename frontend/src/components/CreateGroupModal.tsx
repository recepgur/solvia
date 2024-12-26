import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

interface CreateGroupModalProps {
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    description?: string;
    requiredNft?: string;
    avatar?: File;
  }) => Promise<void>;
}

export function CreateGroupModal({ onClose, onSubmit }: CreateGroupModalProps) {
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [requiredNft, setRequiredNft] = useState('');
  const [avatar, setAvatar] = useState<File>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() || undefined,
        requiredNft: requiredNft.trim() || undefined,
        avatar,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <h2 className="text-2xl font-semibold mb-4">{t('group.create')}</h2>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                {t('group.name')}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('group.name.placeholder')}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00a884] dark:bg-gray-700 dark:border-gray-600"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                {t('group.description')}
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('group.description.placeholder')}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00a884] dark:bg-gray-700 dark:border-gray-600"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                {t('group.required.nft')}
              </label>
              <input
                type="text"
                value={requiredNft}
                onChange={(e) => setRequiredNft(e.target.value)}
                placeholder={t('group.required.nft.placeholder')}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00a884] dark:bg-gray-700 dark:border-gray-600"
              />
              <p className="text-sm text-gray-500 mt-1">
                {t('group.required.nft.description')}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                {t('group.avatar')}
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setAvatar(e.target.files?.[0])}
                className="w-full"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg dark:text-gray-300 dark:hover:bg-gray-700"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-[#00a884] rounded-lg hover:bg-[#06cf9c] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? t('creating') : t('create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
