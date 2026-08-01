import type { MetadataRoute } from 'next';

// TODO: replace with your real production domain.
const SITE_URL = 'learnchess.live';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
  ];
}
