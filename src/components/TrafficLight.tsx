import React from 'react';

export type TrafficState = 'red' | 'amber' | 'green';

type Props = {
  state: TrafficState;
  className?: string;
  size?: 'sm' | 'md';
  ariaLabel?: string;
};

export default function TrafficLight({ state, className, size = 'sm', ariaLabel }: Props) {
  const sizeClasses = size === 'sm' ? 'w-16 h-16' : 'w-20 h-20';

  // Color configuration
  const colors = {
    red: {
      bg: 'bg-red-500',
      glow: 'shadow-red-500/50',
      ring: 'ring-red-400/30',
      pulseGlow: 'shadow-red-500/70',
    },
    amber: {
      bg: 'bg-amber-500',
      glow: 'shadow-amber-500/50',
      ring: 'ring-amber-400/30',
      pulseGlow: 'shadow-amber-500/70',
    },
    green: {
      bg: 'bg-green-500',
      glow: 'shadow-green-500/40',
      ring: 'ring-green-400/20',
      pulseGlow: '', // no pulse for green
    },
  };

  const config = colors[state];
  const shouldPulse = state === 'red' || state === 'amber';
  const pulseSpeed = state === 'red' ? 'animate-pulse-fast' : 'animate-pulse-slow';

  return (
    <div className={className} role="img" aria-label={ariaLabel || `Status ${state}`}>
      <style>{`
        @keyframes pulse-fast {
          0%, 100% {
            opacity: 1;
            box-shadow: 0 0 0 0 currentColor;
          }
          50% {
            opacity: 0.8;
            box-shadow: 0 0 20px 8px currentColor;
          }
        }
        @keyframes pulse-slow {
          0%, 100% {
            opacity: 1;
            box-shadow: 0 0 0 0 currentColor;
          }
          50% {
            opacity: 0.9;
            box-shadow: 0 0 16px 6px currentColor;
          }
        }
        .animate-pulse-fast {
          animation: pulse-fast 0.8s ease-in-out infinite;
        }
        .animate-pulse-slow {
          animation: pulse-slow 1.5s ease-in-out infinite;
        }
      `}</style>

      <div className={`${sizeClasses} flex items-center justify-center`}>
        {/* Outer glow ring (only visible when pulsing) */}
        {shouldPulse && (
          <div
            className={`absolute ${sizeClasses} rounded-full ${config.bg} opacity-20 blur-xl ${pulseSpeed}`}
            style={{ color: config.pulseGlow }}
          />
        )}

        {/* Main ring */}
        <div
          className={`
            relative ${sizeClasses} rounded-full
            ${config.bg}
            ring-4 ${config.ring}
            shadow-lg ${config.glow}
            transition-all duration-300
            ${shouldPulse ? pulseSpeed : ''}
          `}
          style={shouldPulse ? { color: config.pulseGlow } : undefined}
        >
          {/* Inner highlight (subtle glass effect) */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: 'radial-gradient(circle at 35% 25%, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 50%)',
            }}
          />
        </div>
      </div>
    </div>
  );
}
