import type { Metadata, Viewport } from 'next';
import './globals.css';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.learnchess.live').replace(/\/$/, '');
const TITLE = 'Chess Learner — Play Chess with a Real-Time AI Coach';
const DESCRIPTION =
  'Play chess online against a computer, solve puzzles, and improve with instant move classifications, hints, and verified follow-up lines.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: '%s | Chess Learner',
  },
  description: DESCRIPTION,
  keywords: [
    'chess',
    'learn chess',
    'chess coach',
    'chess AI',
    'play chess online',
    'chess puzzles',
    'chess trainer',
    'chess move analysis',
    'online chess coach',
  ],
  alternates: { canonical: '/' },
  applicationName: 'Chess Learner',
  category: 'education',
  creator: 'Chess Learner',
  publisher: 'Chess Learner',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  openGraph: {
    type: 'website',
    url: SITE_URL,
    siteName: 'Chess Learner',
    locale: 'en_IN',
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'Chess Learner AI chess coach' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/opengraph-image'],
  },
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = {
  themeColor: '#1a1a1a',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: `${SITE_URL}/`,
        name: 'Chess Learner',
        description: DESCRIPTION,
        inLanguage: 'en',
      },
      {
        '@type': 'SoftwareApplication',
        '@id': `${SITE_URL}/#application`,
        name: 'Chess Learner',
        url: `${SITE_URL}/`,
        applicationCategory: 'GameApplication',
        applicationSubCategory: 'EducationalApplication',
        operatingSystem: 'Any modern web browser',
        description: DESCRIPTION,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
      },
    ],
  };

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }}
        />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
