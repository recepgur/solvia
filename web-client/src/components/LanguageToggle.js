import React from 'react';
import { getMessage, setLanguage } from '../utils/language';

export function LanguageToggle({ currentLanguage, onLanguageChange }) {
  const toggleLanguage = () => {
    const newLang = currentLanguage === 'tr' ? 'en' : 'tr';
    setLanguage(newLang);
    onLanguageChange(newLang);
  };

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center justify-center space-x-2 px-4 py-3 sm:py-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors duration-200 shadow-sm backdrop-blur-sm min-w-[80px] min-h-[44px] sm:min-h-[36px]"
      aria-label={getMessage('CHANGE_LANGUAGE')}
    >
      <span className="text-sm font-medium">
        {currentLanguage.toUpperCase()}
      </span>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
        />
      </svg>
    </button>
  );
}

export default LanguageToggle;
