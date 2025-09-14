import React from 'react';

export type TrafficState = 'red' | 'amber' | 'green';

type Props = {
  state: TrafficState;
  className?: string;
  size?: 'sm' | 'md';
  ariaLabel?: string;
};

function lensStyle(color: 'red' | 'amber' | 'green', on: boolean): React.CSSProperties {
  // Pre-tuned color ramps for realistic glass + glow
  const cfg = {
    red: {
      base: '#b91c1c', dark: '#450a0a', bright: '#fecaca', glow: 'rgba(220,38,38,0.55)'
    },
    amber: {
      base: '#f59e0b', dark: '#7c2d12', bright: '#fde68a', glow: 'rgba(245,158,11,0.5)'
    },
    green: {
      base: '#16a34a', dark: '#064e3b', bright: '#bbf7d0', glow: 'rgba(22,163,74,0.5)'
    }
  } as const;
  const c = cfg[color];
  const spec = 'radial-gradient(ellipse at 60% 25%, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.15) 22%, rgba(255,255,255,0.0) 60%)';
  const base = `radial-gradient(circle at 50% 55%, ${c.bright} 0%, ${c.base} 42%, ${c.dark} 95%)`;
  const mesh = 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.0) 60%)';
  const emissive = on ? `radial-gradient(circle at 50% 50%, ${c.bright} 0%, ${c.base} 35%, rgba(0,0,0,0) 70%)` : 'none';
  const boxShadow = on
    ? `inset 0 2px 6px rgba(255,255,255,0.25), inset 0 -3px 8px rgba(0,0,0,0.35), 0 0 18px 4px ${c.glow}`
    : 'inset 0 2px 6px rgba(255,255,255,0.08), inset 0 -3px 10px rgba(0,0,0,0.45)';
  return {
    backgroundImage: [spec, mesh, base, emissive].filter(Boolean).join(','),
    boxShadow,
  };
}

function bezelStyle(): React.CSSProperties {
  return {
    backgroundImage: 'linear-gradient(180deg, #0b0f19 0%, #1f2937 60%, #0b1220 100%)',
    boxShadow: 'inset 0 2px 6px rgba(255,255,255,0.06), inset 0 -4px 10px rgba(0,0,0,0.6), 0 8px 14px rgba(0,0,0,0.35)'
  };
}

export default function TrafficLight({ state, className, size = 'sm', ariaLabel }: Props) {
  const on = (k: TrafficState) => state === k;
  const wrap = size === 'sm' ? 'w-11 h-28 p-1.5' : 'w-14 h-32 p-2';
  const bezel = size === 'sm' ? 'w-7 h-7 p-[2px]' : 'w-8 h-8 p-[3px]';
  const lens = 'rounded-full w-full h-full';
  return (
    <div className={className} role="img" aria-label={ariaLabel || `Ampel ${state}`}>
      <div className={`rounded-xl ${wrap} flex flex-col items-center justify-between`} style={bezelStyle()}>
        <div className={`rounded-full ${bezel} shadow-lg`} style={{ background: 'linear-gradient(180deg,#111827,#0b1220)', boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.06), 0 2px 6px rgba(0,0,0,0.4)' }}>
          <div className={lens} style={lensStyle('red', on('red'))} />
        </div>
        <div className={`rounded-full ${bezel} shadow-lg`} style={{ background: 'linear-gradient(180deg,#111827,#0b1220)', boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.06), 0 2px 6px rgba(0,0,0,0.4)' }}>
          <div className={lens} style={lensStyle('amber', on('amber'))} />
        </div>
        <div className={`rounded-full ${bezel} shadow-lg`} style={{ background: 'linear-gradient(180deg,#111827,#0b1220)', boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.06), 0 2px 6px rgba(0,0,0,0.4)' }}>
          <div className={lens} style={lensStyle('green', on('green'))} />
        </div>
      </div>
    </div>
  );
}
