'use client';

/**
 * Architecture diagram for AI projects (no physical model): the parts as numbered blocks with
 * the data flow between them. Numbers match the component cards; hovering either side
 * highlights both. Layout for the Dreamer agent; other projects fall back to a grid.
 */
type Part = { id: string; title: string; note?: string };

const W = 680;
const H = 440;
const BW = 176;
const BH = 60;
// Model-based RL loop: units → encoder → world model → actor / critic → units; sampler feeds training.
const LAYOUT: Record<string, [number, number]> = {
  units: [100, 70],
  encoder: [400, 70],
  'world-model': [580, 220],
  replay: [100, 220],
  actor: [320, 370],
  critic: [580, 370],
};
const FLOW: [string, string, string][] = [
  ['units', 'encoder', 'observations'],
  ['encoder', 'world-model', 'latent state'],
  ['world-model', 'actor', 'imagined rollouts'],
  ['world-model', 'critic', ''],
  ['critic', 'actor', 'value'],
  ['actor', 'units', 'actions'],
  ['replay', 'world-model', 'scenarios'],
];

export default function AgentDiagram({
  parts,
  active,
  onHover,
}: {
  parts: Part[];
  active: string | null;
  onHover: (id: string | null) => void;
}) {
  const known = parts.every((p) => LAYOUT[p.id]);
  const pos = (id: string, i: number): [number, number] =>
    known ? LAYOUT[id] : [110 + (i % 3) * 230, 90 + Math.floor(i / 3) * 200];
  const at = new Map(parts.map((p, i) => [p.id, pos(p.id, i)]));

  const label = active ? parts.find((p) => p.id === active) : null;
  return (
    <div className="diagram">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Architecture diagram">
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0 10 5 0 10z" className="dg-arrowhead" />
          </marker>
        </defs>
        {known &&
          FLOW.filter(([a, b]) => at.has(a) && at.has(b)).map(([a, b, text]) => {
            const [x1, y1] = at.get(a)!;
            const [x2, y2] = at.get(b)!;
            // Start and end the line on the block edges (blocks are 176 × 60), with a small gap.
            const dx = x2 - x1;
            const dy = y2 - y1;
            const edge = Math.min(BW / 2 / Math.abs(dx || 1e-6), BH / 2 / Math.abs(dy || 1e-6));
            const gap = 6 / (Math.hypot(dx, dy) || 1);
            const t0 = edge + gap;
            const t1 = 1 - edge - gap;
            const hot = active === a || active === b;
            // Label beside the middle of the line, on its outer side.
            const len = Math.hypot(dx, dy) || 1;
            const nx = -dy / len;
            const ny = dx / len;
            const mx = (x1 + x2) / 2 + nx * 14;
            const my = (y1 + y2) / 2 + ny * 14 + 4;
            return (
              <g key={a + b} className={`dg-flow${hot ? ' hot' : ''}`}>
                <line x1={x1 + dx * t0} y1={y1 + dy * t0} x2={x1 + dx * t1} y2={y1 + dy * t1} markerEnd="url(#arrow)" />
                {text && (
                  <text x={mx} y={my} textAnchor="middle" className="dg-label">
                    {text}
                  </text>
                )}
              </g>
            );
          })}
        {parts.map((p, i) => {
          const [x, y] = at.get(p.id)!;
          return (
            <g
              key={p.id}
              className={`dg-node${active === p.id ? ' hot' : ''}`}
              transform={`translate(${x} ${y})`}
              onPointerEnter={() => onHover(p.id)}
              onPointerLeave={() => onHover(null)}
            >
              <rect x={-BW / 2} y={-BH / 2} width={BW} height={BH} rx={12} />
              <circle cx={-88} cy={-30} r={13} className="dg-no" />
              <text x={-88} y={-26} textAnchor="middle" className="dg-no-t">
                {i + 1}
              </text>
              <text y={6} textAnchor="middle" className="dg-title">
                {p.title.length > 22 ? p.title.slice(0, 21) + '…' : p.title}
              </text>
            </g>
          );
        })}
      </svg>
      {label?.note && (
        <div className="pviewer-note" role="status">
          <b>{label.title}</b>
          <span>{label.note}</span>
        </div>
      )}
    </div>
  );
}
