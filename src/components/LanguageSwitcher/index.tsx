'use client';

import React from 'react';
import { Select, useColorModeValue } from '@chakra-ui/react';
import { useRouter, usePathname } from 'next/navigation';
import { locales } from '@/config/i18n';

export const LanguageSwitcher: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const selectBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  const handleLanguageChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const locale = event.target.value;
    const currentPath = pathname;
    const newPath = currentPath.replace(/^\/[a-z]{2}/, '');
    router.push(`/${locale}${newPath}`);
  };

  const getCurrentLocale = () => {
    const match = pathname.match(/^\/([a-z]{2})/);
    return match ? match[1] : 'en';
  };

  return (
    <Select
      value={getCurrentLocale()}
      onChange={handleLanguageChange}
      bg={selectBg}
      borderColor={borderColor}
      w="auto"
      size="sm"
    >
      {locales.map((locale) => (
        <option key={locale} value={locale}>
          {locale.toUpperCase()}
        </option>
      ))}
    </Select>
  );
};
