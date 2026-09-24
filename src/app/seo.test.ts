import { describe, expect, it } from 'vitest';

import { metadata } from './layout';
import robots from './robots';
import sitemap from './sitemap';
import manifest from './manifest';

describe('SEO foundation', () => {
  it('uses the production canonical origin and indexable metadata', () => {
    expect(metadata.metadataBase?.origin).toBe('https://www.learnchess.live');
    expect(metadata.alternates).toEqual({ canonical: '/' });
    expect(metadata.robots).toMatchObject({ index: true, follow: true });
  });

  it('advertises the canonical sitemap while excluding private routes', () => {
    expect(robots().sitemap).toBe('https://www.learnchess.live/sitemap.xml');
    expect(JSON.stringify(robots().rules)).toContain('/api/');
    expect(sitemap()[0].url).toBe('https://www.learnchess.live');
  });

  it('publishes installable application metadata', () => {
    expect(manifest()).toMatchObject({ short_name: 'Chess Learner', start_url: '/', display: 'standalone' });
  });
});
