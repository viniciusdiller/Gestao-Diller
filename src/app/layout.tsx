import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Renata Diller — Semijoias',
  description: 'Gestão financeira mobile-first para vendas, clientes e cobranças.',
  icons: {
    icon: '/logo.jpg',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#f0e9df',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="h-full bg-[#f0e9df]">
      <body className="min-h-full flex flex-col bg-[#f0e9df] text-[#2d251e] antialiased select-none font-sans">
        {children}
      </body>
    </html>
  );
}
