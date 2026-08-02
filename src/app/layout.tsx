import type { Metadata, Viewport } from 'next';
import './globals.css';

// TODO: replace with your real production domain before deploying.
const SITE_URL = 'https://yourdomain.com';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Chess Learner — Play Chess vs a Live AI Coach',
    template: '%s | Chess Learner',
  },
  description:
    'Play chess against the computer while an AI coach gives real-time move feedback, hints, and follow-up threat previews to help you improve.',
  keywords: [
    'chess',
    'learn chess',
    'chess coach',
    'chess AI',
    'play chess online',
    'chess puzzles',
    'chess trainer',
  ],
  openGraph: {
    type: 'website',
    url: SITE_URL,
    siteName: 'Chess Learner',
    title: 'Chess Learner — Play Chess vs a Live AI Coach',
    description:
      'Play chess against the computer while an AI coach gives real-time move feedback, hints, and follow-up threat previews.',
    images: ['/og-image.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Chess Learner — Play Chess vs a Live AI Coach',
    description:
      'Play chess against the computer while an AI coach gives real-time move feedback and hints.',
    images: ['/og-image.png'],
  },
  icons: {
    icon: '/favicon.ico',
  },
};

export const viewport: Viewport = {
  themeColor: '#1a1a1a',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
