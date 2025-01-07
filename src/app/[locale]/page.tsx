import { getTranslations } from 'next-intl/server';
import dynamic from 'next/dynamic';
import { locales } from '@/config/i18n';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Props = {
  params: { locale: string };
};

const HomeContent = dynamic(() => import('@/components/HomeContent'), {
  ssr: false,
  loading: () => <div>Loading...</div>
});

export default async function Home({ params: { locale } }: Props) {
  const t = await getTranslations('common');

  return <HomeContent />;
}
