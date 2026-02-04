import type { Metadata, Viewport } from 'next';
import { Geist_Mono, Sora } from 'next/font/google';
import './globals.css';
import { ServiceWorker } from './components/ServiceWorker';

const sora = Sora({
  variable: '--font-sora',
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
  themeColor: '#0F766E',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${sora.variable} ${geistMono.variable} antialiased`}>
        <a href="#main-content" className="skip-link">
          Pular para o conteudo principal
        </a>
        <ServiceWorker />
        <main id="main-content">{children}</main>
      </body>
    </html>
  );
}
