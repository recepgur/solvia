import { getTranslations } from 'next-intl/server';
import dynamic from 'next/dynamic';

export function generateStaticParams() {
  return [{ locale: 'en' }, { locale: 'tr' }];
}

const HomeContent = dynamic(() => import('@/components/HomeContent'), {
  ssr: false,
  loading: () => <div>Loading...</div>
});

export default async function Home() {
  const t = await getTranslations('common');

  return <HomeContent />;
}
