import type { Metadata } from 'next';
import { Space_Grotesk, Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { FreighterProvider } from '@/context/FreighterProvider';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-heading',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Zakati — Your Zakat, Verified',
  description:
    'Platform zakat transparan berbasis Stellar blockchain untuk pasar Indonesia. Setiap rupiah tercatat on-chain dan dapat diverifikasi publik.',
  openGraph: {
    title: 'Zakati — Your Zakat, Verified',
    description:
      'Salurkan zakat dengan transparansi penuh di atas Stellar blockchain.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="id"
      className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        <FreighterProvider>{children}</FreighterProvider>
      </body>
    </html>
  );
}
