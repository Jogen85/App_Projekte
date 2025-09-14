import React from 'react';

export type TrafficState = 'red' | 'amber' | 'green';

type Props = {
  state: TrafficState;
  className?: string;
  size?: 'sm' | 'md';
  ariaLabel?: string;
};

function lensStyle(color: 'red' | 'amber' | 'green', on: boolean): React.CSSProperties {
  // Tuned color ramps for realistic glass + emissive glow
  const cfg = {
    red:   { base: '#b91c1c', dark: '#3a0c0c', bright: '#ffd1d1', glow: 'rgba(220,38,38,0.55)' },
    amber: { base: '#f59e0b', dark: '#6a2a0e', bright: '#ffefad', glow: 'rgba(245,158,11,0.5)' },
    green: { base: '#16a34a', dark: '#063a2d', bright: '#c9fddc', glow: 'rgba(22,163,74,0.5)' }
  } as const;
  const c = cfg[color];

  // Layer 1: specular highlight (top-right glare)
  const spec = 'radial-gradient(ellipse at 62% 24%, rgba(255,255,255,0.65) 0%, rgba(255,255,255,0.25) 18%, rgba(255,255,255,0.0) 52%)';
  // Layer 2: vertical gloss strip
  const gloss = 'linear-gradient(75deg, rgba(255,255,255,0.12) 8%, rgba(255,255,255,0.0) 20% 80%, rgba(255,255,255,0.10) 92%)';
  // Layer 3: subtle diffuser texture (very light; keeps it crisp)
  const mesh = 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.0) 60%)';
  // Layer 4: base lens shading
  const base = `radial-gradient(circle at 50% 58%, ${c.bright} 0%, ${c.base} 42%, ${c.dark} 96%)`;
  // Layer 5: emissive center for active state
  const emissive = on ? `radial-gradient(circle at 50% 50%, ${c.bright} 0%, ${c.base} 36%, rgba(0,0,0,0) 70%)` : 'none';
  // Layer 6: edge vignette
  const vignette = 'radial-gradient(circle at 50% 50%, rgba(0,0,0,0) 70%, rgba(0,0,0,0.35) 100%)';

  const boxShadow = on
    ? `inset 0 2px 6px rgba(255,255,255,0.25), inset 0 -3px 8px rgba(0,0,0,0.35), 0 0 18px 4px ${c.glow}`
    : 'inset 0 2px 6px rgba(255,255,255,0.08), inset 0 -3px 10px rgba(0,0,0,0.45)';

  return {
    backgroundImage: [spec, gloss, mesh, base, emissive, vignette].filter(Boolean).join(','),
    boxShadow,
  };
}

function bezelStyle(): React.CSSProperties {
  // Slight metallic/plastic mix look with inner bevel
  return {
    backgroundImage: 'linear-gradient(180deg, #0b0f19 0%, #273244 58%, #0b1220 100%)',
    boxShadow: [
      'inset 0 2px 6px rgba(255,255,255,0.08)',
      'inset 0 -4px 10px rgba(0,0,0,0.55)',
      '0 6px 12px rgba(0,0,0,0.28)'
    ].join(', '),
  };
}

export default function TrafficLight({ state, className, size = 'sm', ariaLabel }: Props) {
  const wrap = size === 'sm' ? 'w-12 h-12 p-1.5' : 'w-14 h-14 p-2';
  const ring = size === 'sm' ? 'w-9 h-9 p-[1px]' : 'w-10 h-10 p-[2px]';
  const bezel = size === 'sm' ? 'w-8 h-8 p-[2px]' : 'w-9 h-9 p-[3px]';
  const lens = 'rounded-full w-full h-full';
  const rimShadow = 'inset 0 1px 2px rgba(255,255,255,0.06), 0 1px 3px rgba(0,0,0,0.35)';
  const ringStyle: React.CSSProperties = {
    backgroundImage: [
      'radial-gradient(circle at 50% 35%, rgba(255,255,255,0.65) 0%, rgba(255,255,255,0.0) 48%)',
      'conic-gradient(from 200deg, #cbd5e1, #f8fafc 20%, #cbd5e1 40%, #64748b 60%, #cbd5e1 80%, #f1f5f9)'
    ].join(','),
    boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.45), inset 0 -1px 1px rgba(0,0,0,0.35)'
  };

  // Choose the active lens color
  const color: TrafficState = state;

  return (
    <div className={className} role="img" aria-label={ariaLabel || `Ampel ${state}`}>
      <div className={`relative overflow-hidden rounded-xl ${wrap} flex items-center justify-center`} style={bezelStyle()}>
        {/* side gloss overlay */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(90deg, rgba(255,255,255,0.10) 8%, rgba(255,255,255,0) 35% 65%, rgba(255,255,255,0.08) 92%)' }} />

        <div className={`rounded-full ${ring}`} style={ringStyle}>
          <div className={`rounded-full ${bezel}`} style={{ background: 'linear-gradient(180deg,#101826,#0b1220)', boxShadow: rimShadow }}>
            <div className={lens} style={lensStyle(color, true)} />
          </div>
        </div>
      </div>
    </div>
  );
}
