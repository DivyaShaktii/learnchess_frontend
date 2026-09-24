import { ImageResponse } from 'next/og';

export const alt = 'Chess Learner — real-time AI chess coaching';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(135deg, #101010, #1f2937)', padding: 90 }}>
      <div style={{ width: 360, height: 360, display: 'flex', flexWrap: 'wrap', border: '12px solid #86efac' }}>
        {Array.from({ length: 16 }, (_, square) => (
          <div key={square} style={{ display: 'flex', width: '25%', height: '25%', background: (Math.floor(square / 4) + square) % 2 === 0 ? '#86efac' : '#334155' }} />
        ))}
      </div>
      <div style={{ width: 560, display: 'flex', flexDirection: 'column', gap: 32 }}>
        <div style={{ display: 'flex', width: 500, height: 54, borderRadius: 27, background: '#86efac' }} />
        <div style={{ display: 'flex', width: 430, height: 30, borderRadius: 15, background: '#d1d5db' }} />
        <div style={{ display: 'flex', width: 360, height: 30, borderRadius: 15, background: '#64748b' }} />
      </div>
    </div>,
    size,
  );
}
