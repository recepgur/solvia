import createMiddleware from 'next-intl/middleware';
import { locales } from './config/i18n';
 
export default createMiddleware({
  locales,
  defaultLocale: 'en',
  localePrefix: 'always'
});
 
export const config = {
  matcher: [
    '/',
    '/((?!_next|_vercel|.*\\..*).*)',
  ]
};
