import { getRequestConfig } from 'next-intl/server';
import { notFound } from 'next/navigation';
 
export const locales = ['en', 'tr'] as const;
export type Locale = (typeof locales)[number];
 
export default getRequestConfig(async ({ locale }) => {
  if (!locales.includes(locale as Locale)) notFound();
 
  return {
    messages: (await import(`../locales/${locale}/messages.json`)).default
  };
});
