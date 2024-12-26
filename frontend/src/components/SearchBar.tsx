import * as React from 'react';
import { Search } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface SearchBarProps {
  onSearch: (query: string) => void;
}

export function SearchBar({ onSearch }: SearchBarProps) {
  const { t } = useLanguage();
  const [query, setQuery] = React.useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    onSearch(value);
  };

  return (
    <div className="px-4 py-2 bg-white dark:bg-gray-900">
      <div className="flex items-center space-x-2 bg-[#f0f2f5] dark:bg-gray-800 rounded-lg px-4 py-2">
        <Search className="h-5 w-5 text-[#54656f] dark:text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={handleChange}
          placeholder={t('search.chats')}
          className="flex-1 bg-transparent focus:outline-none text-gray-900 dark:text-gray-100 placeholder-[#54656f] dark:placeholder-gray-400"
        />
      </div>
    </div>
  );
}
