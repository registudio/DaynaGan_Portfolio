import { ImageResponse } from 'next/og';
import { ogFonts } from '@/lib/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default async function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 112,
          fontWeight: 700,
          color: '#f2f3ed',
          fontFamily: 'Space Grotesk',
          background: 'linear-gradient(135deg, #1c3f73, #2f5d9e)',
        }}
      >
        D
      </div>
    ),
    { ...size, fonts: await ogFonts() },
  );
}
