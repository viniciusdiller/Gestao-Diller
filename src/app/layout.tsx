import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ToastProvider } from '@/components/ui/toast';

export const metadata: Metadata = {
  title: 'Gestão-Diller — Sistema Integrado',
  description: 'Sistema integrado de gestão financeira e operacional (Semijoias e Casa Itaúna).',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/diller.jpg', type: 'image/jpeg' },
    ],
    apple: [
      { url: '/diller.jpg', sizes: '180x180', type: 'image/jpeg' },
    ],
    shortcut: '/diller.jpg',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Gestão-Diller',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0f172a',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className="min-h-full flex flex-col bg-[var(--background)] text-[var(--foreground)] antialiased select-none font-sans transition-colors duration-300">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
