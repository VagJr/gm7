import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Crônicas do Vazio | RPG Digital D&D 5e',
  description: 'Explore Valdoria em uma mesa de RPG com personagens, dados, mapas e regras SRD 5.2.1.'
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0a0d0a'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className="dark">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
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
