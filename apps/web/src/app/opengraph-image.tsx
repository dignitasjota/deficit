import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Déficit · Pierde peso jugando';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#0d0e16',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: 80,
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 40,
            border: '4px solid #39ff8a',
            borderRadius: 24,
            boxShadow: '0 0 60px #39ff8a inset',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 64,
            left: 80,
            fontSize: 26,
            color: '#ff66b3',
            letterSpacing: 6,
            fontWeight: 700,
          }}
        >
          ▣ SISTEMA RPG · DÉFICIT
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 48,
            zIndex: 1,
          }}
        >
          <div
            style={{
              width: 280,
              height: 280,
              border: '8px solid #39ff8a',
              borderRadius: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 60px #39ff8a',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                fontSize: 200,
                color: '#39ff8a',
                lineHeight: 1,
                fontWeight: 700,
                textShadow: '0 0 24px #39ff8a',
              }}
            >
              Δ
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                fontSize: 120,
                color: '#39ff8a',
                lineHeight: 0.9,
                fontWeight: 700,
                textShadow: '0 0 32px #39ff8a',
              }}
            >
              Pierde peso
            </div>
            <div
              style={{
                fontSize: 120,
                color: '#39ff8a',
                lineHeight: 0.9,
                fontWeight: 700,
                marginTop: 8,
                textShadow: '0 0 32px #39ff8a',
              }}
            >
              jugando.
            </div>
            <div
              style={{
                fontSize: 32,
                color: '#c8d2e8',
                marginTop: 28,
                maxWidth: 620,
              }}
            >
              XP · 9 atributos · niveles 0-80 · colchón semanal
            </div>
          </div>
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: 64,
            left: 80,
            fontSize: 24,
            color: '#7d8aa8',
          }}
        >
          deficit.app · 14 días gratis sin tarjeta
        </div>
      </div>
    ),
    { ...size },
  );
}
