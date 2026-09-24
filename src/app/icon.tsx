import { ImageResponse } from 'next/og';

export const size = { width: 64, height: 64 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', flexWrap: 'wrap', background: '#171717', padding: 8 }}>
      {[0, 1, 2, 3].map((square) => (
        <div key={square} style={{ display: 'flex', width: '50%', height: '50%', background: square === 0 || square === 3 ? '#86efac' : '#334155' }} />
      ))}
    </div>,
    size,
  );
}
