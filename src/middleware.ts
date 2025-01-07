import createMiddleware from 'next-intl/middleware';
 
export default createMiddleware({
  locales: ['en', 'tr'],
  defaultLocale: 'en',
  localePrefix: 'as-needed'
});
 
export const config = {
  matcher: ['/', '/(tr|en)/:path*']
};
