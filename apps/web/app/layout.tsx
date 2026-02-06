import type { Metadata, Viewport } from 'next';
import { Fraunces, Geist_Mono, Manrope } from 'next/font/google';
import './globals.css';
import { ServiceWorker } from './components/ServiceWorker';

const manrope = Manrope({
  variable: '--font-manrope',
  subsets: ['latin'],
});

const fraunces = Fraunces({
  variable: '--font-fraunces',
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
  themeColor: '#E30613',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${manrope.variable} ${fraunces.variable} ${geistMono.variable} antialiased`}
      >
        <a href="#main-content" className="skip-link">
          Pular para o conteudo principal
        </a>
        <ServiceWorker />
        <main id="main-content">{children}</main>
      </body>
    </html>
  );
}
