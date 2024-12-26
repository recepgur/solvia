import * as React from 'react';
import { Search, Filter } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import type { SearchOptions } from '../types/search';

interface SearchBarProps {
  onSearch: (options: SearchOptions) => void;
}

export function SearchBar({ onSearch }: SearchBarProps) {
  const { t } = useLanguage();
  const [showFilters, setShowFilters] = React.useState(false);
  const [options, setOptions] = React.useState<SearchOptions>({
    query: '',
    mediaTypes: [],
    dateRange: {}
  });

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newOptions = { ...options, query: e.target.value };
    setOptions(newOptions);
    onSearch(newOptions);
  };

  const handleDateChange = (type: 'start' | 'end', value: string) => {
    const newOptions = {
      ...options,
      dateRange: {
        ...options.dateRange,
        [type]: value ? new Date(value) : undefined
      }
    };
    setOptions(newOptions);
    onSearch(newOptions);
  };

  const handleMediaTypeToggle = (type: 'text' | 'image' | 'video' | 'audio' | 'file') => {
    const mediaTypes = options.mediaTypes || [];
    const newMediaTypes = mediaTypes.includes(type)
      ? mediaTypes.filter((t) => t !== type)
      : [...mediaTypes, type];
    
    const newOptions = { ...options, mediaTypes: newMediaTypes };
    setOptions(newOptions);
    onSearch(newOptions);
  };

  return (
    <div className="px-4 py-2 bg-white dark:bg-gray-900">
      <div className="flex flex-col space-y-2">
        <div className="flex items-center space-x-2 bg-[#f0f2f5] dark:bg-gray-800 rounded-lg px-4 py-2">
          <Search className="h-5 w-5 text-[#54656f] dark:text-gray-400" />
          <input
            type="text"
            value={options.query}
            onChange={handleQueryChange}
            placeholder={t('search.chats')}
            className="flex-1 bg-transparent focus:outline-none text-gray-900 dark:text-gray-100 placeholder-[#54656f] dark:placeholder-gray-400"
          />
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"
          >
            <Filter className="h-5 w-5 text-[#54656f] dark:text-gray-400" />
          </button>
        </div>

        {showFilters && (
          <div className="bg-[#f0f2f5] dark:bg-gray-800 rounded-lg p-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-gray-600 dark:text-gray-300">{t('search.date_range')}</label>
              <div className="flex space-x-2">
                <input
                  type="date"
                  onChange={(e) => handleDateChange('start', e.target.value)}
                  className="flex-1 p-2 rounded bg-white dark:bg-gray-700"
                />
                <input
                  type="date"
                  onChange={(e) => handleDateChange('end', e.target.value)}
                  className="flex-1 p-2 rounded bg-white dark:bg-gray-700"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-gray-600 dark:text-gray-300">{t('search.media_types')}</label>
              <div className="flex flex-wrap gap-2">
                {(['text', 'image', 'video', 'audio', 'file'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => handleMediaTypeToggle(type)}
                    className={`px-3 py-1 rounded-full text-sm ${
                      options.mediaTypes?.includes(type)
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {t(`search.media_type.${type}`)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
