/**
 * Line icons for the hobby bento, each with its own micro-animation (see .hobby-* in
 * globals.css): the skateboard wheels spin, the glove jabs, the cat blinks and flicks its
 * tail, the plane flies across, the gear turns.
 */
export function HobbyIcon({ id }: { id: string }) {
  const common = { viewBox: '0 0 64 64', className: 'hobby-icon', 'aria-hidden': true, fill: 'none', stroke: 'currentColor', strokeWidth: 3, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
  switch (id) {
    case 'skating':
      return (
        <svg {...common}>
          <path d="M8 34c4 4 44 4 48 0" />
          <path d="M18 38v4M46 38v4" />
          <g className="wheel" style={{ transformOrigin: '18px 47px' }}>
            <circle cx="18" cy="47" r="5" />
            <path d="M18 43v8" />
          </g>
          <g className="wheel" style={{ transformOrigin: '46px 47px' }}>
            <circle cx="46" cy="47" r="5" />
            <path d="M46 43v8" />
          </g>
        </svg>
      );
    case 'mma':
      return (
        <svg {...common}>
          <g className="glove">
            <path d="M16 30c0-10 6-16 16-16s18 6 18 16v6c0 6-4 10-10 10H26c-6 0-10-4-10-10z" />
            <path d="M22 26c4-3 10-3 14 0M26 46v6h16v-6" />
          </g>
          <path className="impact" d="M54 20l4-4M56 28h5M54 36l4 4" />
        </svg>
      );
    case 'xiao-hu':
      return (
        <svg {...common}>
          <path d="M14 22l4-12 8 8h12l8-8 4 12" />
          <path d="M14 22c-2 18 8 28 18 28s20-10 18-28" />
          <g className="eyes">
            <path d="M24 32h4M36 32h4" />
          </g>
          <path d="M30 38l2 2 2-2M22 40l-8 1M42 40l8 1" />
          <path className="tail" d="M50 48c8 0 10-8 6-12" style={{ transformOrigin: '50px 48px' }} />
          <path d="M24 16l2 4M38 16l-2 4" strokeWidth={2} />
        </svg>
      );
    case 'travel':
      return (
        <svg {...common}>
          <circle cx="32" cy="34" r="18" strokeDasharray="4 5" />
          <g className="plane">
            <path d="M22 26l20 6-20 6 4-6z" fill="currentColor" stroke="none" />
          </g>
        </svg>
      );
    case 'tinkering':
      return (
        <svg {...common}>
          <g className="gear" style={{ transformOrigin: '32px 32px' }}>
            <circle cx="32" cy="32" r="8" />
            <path d="M32 12v6M32 46v6M12 32h6M46 32h6M18 18l4 4M42 42l4 4M18 46l4-4M42 22l4-4" />
          </g>
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="32" cy="32" r="16" />
        </svg>
      );
  }
}
