import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#0d0e16',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '2px solid #39ff8a',
          borderRadius: 6,
        }}
      >
        <span
          style={{
            fontSize: 22,
            color: '#39ff8a',
            fontWeight: 700,
            lineHeight: 1,
          }}
        >
          Δ
        </span>
      </div>
    ),
    { ...size },
  );
}
