import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';

export const dynamic = 'force-dynamic';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL || 'https://suivi-taux.vercel.app'),
  title: 'Suivi-Taux | Tableau de Bord Financier Professionnel',
  description: 'Tableau de bord professionnel pour le suivi des taux et indices financiers : OAT, Inflation, €STR, CAC 40, S&P 500, EUR/USD, Or, Bitcoin et plus. Outil pédagogique pour conseillers financiers.',
  keywords: ['taux financiers', 'OAT', 'inflation', 'CAC 40', 'conseiller financier', 'indices boursiers', 'EUR/USD', 'Bitcoin', 'SCPI'],
  authors: [{ name: 'Conseiller Financier' }],
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
  openGraph: {
    title: 'Suivi-Taux | Tableau de Bord Financier Professionnel',
    description: 'Suivez les taux et indices financiers clés avec des outils de comparaison et corrélation avancés.',
    images: ['/og-image.png'],
    type: 'website',
    locale: 'fr_FR',
    siteName: 'Suivi-Taux',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Suivi-Taux | Tableau de Bord Financier',
    description: 'Tableau de bord professionnel pour le suivi des taux et indices financiers.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={`${jakarta.variable} font-sans antialiased`}>
        <Script src="https://apps.abacus.ai/chatllm/appllm-lib.js" strategy="lazyOnload" />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange={false}
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
