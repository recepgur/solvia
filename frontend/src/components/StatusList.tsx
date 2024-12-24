import * as React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Plus } from 'lucide-react';

interface Status {
  id: string;
  user: string;
  timestamp: string;
  seen: boolean;
  avatar?: string;
}

interface StatusListProps {
  className?: string;
}

export function StatusList({ className }: StatusListProps = {}) {
  const { t } = useLanguage();
  const [statuses] = React.useState<Status[]>([
    {
      id: '1',
      user: t('my.status'),
      timestamp: t('tap.to.add'),
      seen: true
    },
    {
      id: '2',
      user: 'Alice',
      timestamp: '2 minutes ago',
      seen: false
    }
  ]);

  return (
    <div className={`flex-1 overflow-y-auto bg-white dark:bg-gray-900 ${className || ''}`}>
      {/* My Status */}
      <button className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-[#f5f6f6] dark:hover:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
        <div className="relative">
          <div className="w-12 h-12 rounded-full bg-[#dfe5e7] dark:bg-gray-600 flex-shrink-0 overflow-hidden" />
          <div className="absolute bottom-0 right-0 bg-[#00a884] dark:bg-[#008069] rounded-full p-1 border-2 border-white dark:border-gray-900">
            <Plus className="h-4 w-4 text-white" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 dark:text-gray-100">
            {t('my.status')}
          </h3>
          <p className="text-sm text-[#667781] dark:text-gray-400">{t('tap.to.add')}</p>
        </div>
      </button>

      {/* Recent Updates */}
      <div className="px-4 py-2 text-sm text-[#667781] dark:text-gray-400 bg-white dark:bg-gray-900">
        {t('recent.updates')}
      </div>
      {statuses.slice(1).map((status) => (
        <button
          key={status.id}
          className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-[#f5f6f6] dark:hover:bg-gray-800 bg-white dark:bg-gray-900"
        >
          <div className="relative">
            <div className={`w-12 h-12 rounded-full bg-[#dfe5e7] dark:bg-gray-600 flex-shrink-0 ring-2 ${
              status.seen ? 'ring-[#8696a0]' : 'ring-[#00a884]'
            } overflow-hidden`}>
              {status.avatar && (
                <img 
                  src={status.avatar}
                  alt={status.user}
                  className="w-full h-full object-cover"
                />
              )}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-gray-900 dark:text-gray-100">
              {status.user}
            </h3>
            <p className="text-sm text-[#667781] dark:text-gray-400">{status.timestamp}</p>
          </div>
        </button>
      ))}
    </div>
  );
}
