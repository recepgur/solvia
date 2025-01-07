import { getRequestConfig, unstable_setRequestLocale } from 'next-intl/server';
import { locales } from '../config/i18n';

export default getRequestConfig(async ({ locale }) => {
  unstable_setRequestLocale(locale);
  
  if (!locales.includes(locale as any)) {
    throw new Error(`Locale '${locale}' is not supported`);
  }

  return {
    locale,
    messages: (await import(`@/locales/${locale}/messages.json`)).default,
    timeZone: 'UTC',
  };
});
