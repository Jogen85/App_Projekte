import React from 'react';

export type TrafficState = 'red' | 'amber' | 'green';

type Props = {
  state: TrafficState;
  className?: string;
  size?: 'sm' | 'md';
  ariaLabel?: string;
};

export default function TrafficLight({ state, className, size = 'sm', ariaLabel }: Props) {
  const on = (k: TrafficState) => state === k;
  const box = size === 'sm' ? 'w-10 h-24 p-1' : 'w-12 h-28 p-1.5';
  const dot = size === 'sm' ? 'w-6 h-6' : 'w-7 h-7';
  return (
    <div className={className} role="img" aria-label={ariaLabel || `Ampel ${state}`}>
      <div className={`rounded-xl bg-slate-800/90 shadow-inner flex flex-col items-center justify-between ${box}`}>
        <div className={`rounded-full ${dot} transition-all duration-200 ` + (on('red') ? 'bg-red-600 shadow-[0_0_12px_2px_rgba(220,38,38,0.6)]' : 'bg-red-900')} />
        <div className={`rounded-full ${dot} transition-all duration-200 ` + (on('amber') ? 'bg-amber-400 shadow-[0_0_12px_2px_rgba(245,158,11,0.5)]' : 'bg-amber-900')} />
        <div className={`rounded-full ${dot} transition-all duration-200 ` + (on('green') ? 'bg-green-600 shadow-[0_0_12px_2px_rgba(22,163,74,0.5)]' : 'bg-green-900')} />
      </div>
    </div>
  );
}

