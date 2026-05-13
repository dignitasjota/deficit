import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
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
          border: '6px solid #39ff8a',
          borderRadius: 34,
          boxShadow: '0 0 24px #39ff8a',
        }}
      >
        <span
          style={{
            fontSize: 118,
            color: '#39ff8a',
            fontWeight: 700,
            lineHeight: 1,
            textShadow: '0 0 16px #39ff8a',
          }}
        >
          Δ
        </span>
      </div>
    ),
    { ...size },
  );
}
