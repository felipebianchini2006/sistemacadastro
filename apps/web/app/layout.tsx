import type { Metadata, Viewport } from 'next';
import { Geist_Mono, Inter } from 'next/font/google';
import './globals.css';
import { ServiceWorker } from './components/ServiceWorker';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Sistema Cadastro',
  description: 'Cadastro digital com validacao e OCR',
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = {
  themeColor: '#ff6b35',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.variable} ${geistMono.variable} antialiased`}>
        <a href="#main-content" className="skip-link">
          Pular para o conteudo principal
        </a>
        <ServiceWorker />
        <main id="main-content">{children}</main>
      </body>
    </html>
  );
}
