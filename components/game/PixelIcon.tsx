/** 8×8 pixel-art icons drawn as SVG rects so they stay crisp at any size. */
const ICONS: Record<string, { rows: string[]; colors: Record<string, string> }> = {
  wrench: { rows: ['.....aa.', '....a..a', '....a.a.', '...aaa..', '..aaa...', '.aaa....', 'aaa.....', 'aa......'], colors: { a: '#cbd5e1' } },
  bolt: { rows: ['....aa..', '...aa...', '..aa....', '.aaaaaa.', '....aa..', '...aa...', '..aa....', '.a......'], colors: { a: '#e879f9' } },
  boot: { rows: ['..aa....', '..aa....', '..aa....', '..ab....', '..aaaa..', '.aaaaaa.', '.bbbbbbb', '........'], colors: { a: '#a78bfa', b: '#4c1d95' } },
  scanner: { rows: ['..aaaa..', '.a....a.', 'a..bb..a', 'a.b..b.a', 'a.b..b.a', 'a..bb..a', '.a....a.', '..aaaa..'], colors: { a: '#67e8f9', b: '#ecfeff' } },
  emp: { rows: ['...aa...', '.a....a.', 'a..bb..a', '.a.bb.a.', '.a.bb.a.', 'a..bb..a', '.a....a.', '...aa...'], colors: { a: '#a78bfa', b: '#f5f3ff' } },
  repair: { rows: ['..aaaa..', '.aaaaaa.', 'aaabbaaa', 'abbbbbba', 'abbbbbba', 'aaabbaaa', '.aaaaaa.', '..aaaa..'], colors: { a: '#34d399', b: '#ecfdf5' } },
  drone: { rows: ['aa....aa', 'a.a..a.a', '..aaaa..', '..abba..', '..aaaa..', 'a.a..a.a', 'aa....aa', '........'], colors: { a: '#c4b5fd', b: '#fde047' } },
  cat: { rows: ['a.....a.', 'aa...aa.', 'abbbbba.', 'abcbcba.', 'abbdbba.', '.abbba..', '.a.a.a..', '........'], colors: { a: '#4a3a2c', b: '#8a7560', c: '#bef264', d: '#e7a2a2' } },
  lock: { rows: ['..aaaa..', '.a....a.', '.a....a.', 'bbbbbbbb', 'bbbaabbb', 'bbbaabbb', 'bbbbbbbb', '........'], colors: { a: '#94a3b8', b: '#475569' } },
};

export default function PixelIcon({ name, size = 22 }: { name: keyof typeof ICONS | string; size?: number }) {
  const icon = ICONS[name];
  if (!icon) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 8 8" shapeRendering="crispEdges" aria-hidden>
      {icon.rows.flatMap((row, y) =>
        [...row].map((ch, x) => (ch === '.' ? null : <rect key={`${x},${y}`} x={x} y={y} width="1" height="1" fill={icon.colors[ch]} />)),
      )}
    </svg>
  );
}
