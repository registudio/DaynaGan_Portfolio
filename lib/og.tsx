import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { loadPortfolio } from '@/lib/load';

/** Shared artwork for the share image and the Apple touch icon (rendered by next/og). */
const font = (f: string) => readFile(join(process.cwd(), 'node_modules/@fontsource', f));

export async function ogFonts() {
  const [bold, medium, mono] = await Promise.all([
    font('space-grotesk/files/space-grotesk-latin-700-normal.woff'),
    font('space-grotesk/files/space-grotesk-latin-500-normal.woff'),
    font('ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff'),
  ]);
  return [
    { name: 'Space Grotesk', data: bold, weight: 700 as const, style: 'normal' as const },
    { name: 'Space Grotesk', data: medium, weight: 500 as const, style: 'normal' as const },
    { name: 'Plex Mono', data: mono, weight: 400 as const, style: 'normal' as const },
  ];
}

export function ShareCard({ title, line, eyebrow = 'Portfolio' }: { title?: string; line?: string; eyebrow?: string } = {}) {
  const { site, levels } = loadPortfolio();
  const kicker = levels.find((l) => l.id === 'about')?.meta.kicker ?? '';
  const grid = 'linear-gradient(rgba(169,194,234,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(169,194,234,0.08) 1px, transparent 1px)';
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '64px 72px',
        color: '#f2f3ed',
        backgroundColor: '#111412',
        backgroundImage: `radial-gradient(circle at 18% 20%, rgba(28,63,115,0.75), transparent 45%), radial-gradient(circle at 90% 95%, rgba(78,100,56,0.5), transparent 45%), ${grid}`,
        backgroundSize: '100% 100%, 100% 100%, 40px 40px, 40px 40px',
        fontFamily: 'Space Grotesk',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 36,
            fontWeight: 700,
            background: 'linear-gradient(135deg, #1c3f73, #2f5d9e)',
          }}
        >
          D
        </div>
        <span style={{ fontFamily: 'Plex Mono', fontSize: 24, letterSpacing: 4, color: '#a9c2ea', textTransform: 'uppercase' }}>
          {title ? `${site.displayName} · ${eyebrow}` : eyebrow}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <span style={{ fontSize: title ? 92 : 112, fontWeight: 700, letterSpacing: -4, lineHeight: 1 }}>{title ?? site.displayName}</span>
        {!title && <span style={{ fontSize: 40, fontWeight: 500, color: '#a9c2ea' }}>{kicker}</span>}
        <span style={{ fontSize: 28, fontWeight: 500, color: '#c9d0bf', maxWidth: 1000, lineHeight: 1.35 }}>
          {(line ?? site.tagline).slice(0, 220)}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 14, fontFamily: 'Plex Mono', fontSize: 22, color: '#94a487' }}>
        <span>Robotics</span>
        <span>·</span>
        <span>Embedded systems</span>
        <span>·</span>
        <span>CAD</span>
        <span>·</span>
        <span>Simulation</span>
      </div>
    </div>
  );
}
