import type { MetadataRoute } from 'next';

// TODO: replace with your real production domain.
const SITE_URL = 'https://yourdomain.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
