import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { locales } from '@/config/i18n';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Import HomeContent component
import HomeContent from '@/components/HomeContent';

type Props = {
  params: { locale: string };
};

export default async function Home({ params: { locale } }: Props) {
  const t = await getTranslations('common');

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HomeContent />
    </Suspense>
  );
}
