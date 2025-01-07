import { getRequestConfig } from 'next-intl/server';
import { locales } from '../config/i18n';

export default getRequestConfig(async ({ locale }) => {
  if (!locales.includes(locale as any)) {
    throw new Error(`Locale '${locale}' is not supported`);
  }

  return {
    messages: (await import(`@/locales/${locale}/messages.json`)).default,
    timeZone: 'UTC',
  };
});
