import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
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
        }}
      >
        <div
          style={{
            width: '60%',
            height: '60%',
            border: '4px solid #39ff8a',
            borderRadius: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 18px #39ff8a',
          }}
        >
          <span
            style={{
              fontSize: 78,
              color: '#39ff8a',
              fontWeight: 700,
              lineHeight: 1,
              textShadow: '0 0 12px #39ff8a',
            }}
          >
            Δ
          </span>
        </div>
      </div>
    ),
    { width: 192, height: 192 },
  );
}
