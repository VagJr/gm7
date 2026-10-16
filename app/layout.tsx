import type { Metadata, Viewport } from 'next';
import './globals.css';
import './gateway.css';
import './play.css';
import './dragons.css';
import './production-art.css';

export const metadata: Metadata = {
  title: 'Dragons and Dungeons | Valdoria',
  icons: { icon: '/art/dragons-logo.png', apple: '/art/dragons-logo.png' },
  description: 'Explore Valdoria em aventuras solo, mesas cooperativas e um mundo online compartilhado. Fantasia, masmorras e combate tático.'
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0a0d0a'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className="dark">
      <head>
        <meta name="theme-color" content="#0a0d0a" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="bg-[#0a0d0a] text-[#ede9dc] overflow-hidden select-none touch-manipulation m-0 p-0 h-[100dvh] max-h-[100dvh]">
        {children}
      </body>
    </html>
  );
}
