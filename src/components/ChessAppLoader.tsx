'use client';

import dynamic from 'next/dynamic';

const ChessApp = dynamic(() => import('./ChessApp'), {
  ssr: false,
});

export default function ChessAppLoader() {
  return <ChessApp />;
}
