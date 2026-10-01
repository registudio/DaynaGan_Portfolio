import { ImageResponse } from 'next/og';
import { ShareCard, ogFonts } from '@/lib/og';

export const alt = 'Dayna Gan — Robotics & Computer Engineering portfolio';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(<ShareCard />, { ...size, fonts: await ogFonts() });
}
