'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';

const HomeContent = dynamic(() => import('@/components/HomeContent'), {
  ssr: false,
  loading: () => <div>Loading...</div>
});

type Props = {
  params: { locale: string };
};

export default function Home({ params: { locale } }: Props) {
  const t = useTranslations('common');

  return (
    <Suspense fallback={<div>{t('loading')}</div>}>
      <HomeContent />
    </Suspense>
  );
}
