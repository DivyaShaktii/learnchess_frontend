import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Chess Learner — AI Chess Coach',
    short_name: 'Chess Learner',
    description: 'Play chess and improve with immediate AI coaching, hints, and move analysis.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0f0f0f',
    theme_color: '#1a1a1a',
    lang: 'en',
    categories: ['education', 'games'],
  };
}
