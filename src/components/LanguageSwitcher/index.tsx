'use client';

import React from 'react';
import { Select } from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

const LanguageSwitcher: React.FC = () => {
  const router = useRouter();
  const t = useTranslations('common');

  const handleLanguageChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const locale = event.target.value;
    router.push(`/${locale}`);
  };

  return (
    <Select
      onChange={handleLanguageChange}
      width="auto"
      size="sm"
    >
      <option value="en">English</option>
      <option value="tr">Türkçe</option>
    </Select>
  );
};

export default LanguageSwitcher;
