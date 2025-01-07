import React from 'react';
import { Providers } from '@/app/[locale]/providers';
import { Box } from '@chakra-ui/react';

export async function generateStaticParams() {
  return [
    { locale: 'en' },
    { locale: 'tr' }
  ];
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <title>Solvio - Decentralized Messenger</title>
        <meta name="description" content="Secure, decentralized messaging platform" />
      </head>
      <body>
        <Providers>
          <Box minH="100vh" bg="gray.50">
            {children}
          </Box>
        </Providers>
      </body>
    </html>
  );
}
