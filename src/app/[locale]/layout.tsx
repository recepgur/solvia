import React from 'react';

export default function RootLayout({
  children,
  params: { locale }
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  return (
    <html lang={locale}>
      <head>
        <title>Solvio - Decentralized Messenger</title>
        <meta name="description" content="Secure, decentralized messaging platform" />
      </head>
      <body>
        <div id="app-root">
          {children}
        </div>
      </body>
    </html>
  );
}

export const dynamic = 'force-dynamic';
