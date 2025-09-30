export type TrafficState = 'red' | 'amber' | 'green';

type Props = {
  state: TrafficState;
  className?: string;
  size?: 'sm' | 'md';
  ariaLabel?: string;
};

export default function TrafficLight({ state, className, size = 'sm', ariaLabel }: Props) {
  const sizeClasses = size === 'sm' ? 'w-12 h-12' : 'w-16 h-16';

  // Color configuration
  const colors = {
    red: {
      bg: 'bg-red-500',
      glow: 'shadow-red-500/40',
      ring: 'ring-red-400/20',
      pulseGlow: 'shadow-red-500/50',
    },
    amber: {
      bg: 'bg-amber-500',
      glow: 'shadow-amber-500/40',
      ring: 'ring-amber-400/20',
      pulseGlow: '', // no pulse for amber
    },
    green: {
      bg: 'bg-green-500',
      glow: 'shadow-green-500/30',
      ring: 'ring-green-400/15',
      pulseGlow: '', // no pulse for green
    },
  };

  const config = colors[state];
  const shouldPulse = state === 'red'; // Only red pulses now

  return (
    <div className={className} role="img" aria-label={ariaLabel || `Status ${state}`}>
      <style>{`
        @keyframes pulse-gentle {
          0%, 100% {
            opacity: 1;
            box-shadow: 0 0 0 0 currentColor;
          }
          50% {
            opacity: 0.92;
            box-shadow: 0 0 10px 4px currentColor;
          }
        }
        .animate-pulse-gentle {
          animation: pulse-gentle 2s ease-in-out infinite;
        }
      `}</style>

      <div className="relative">
        {/* Outer glow ring (only visible when pulsing) */}
        {shouldPulse && (
          <div
            className={`absolute ${sizeClasses} rounded-full ${config.bg} opacity-15 blur-lg animate-pulse-gentle`}
            style={{ color: config.pulseGlow }}
          />
        )}

        {/* Main traffic light ring */}
        <div
          className={`
            relative ${sizeClasses} rounded-full
            ${config.bg}
            ring-2 ${config.ring}
            shadow-md ${config.glow}
            transition-all duration-300
            ${shouldPulse ? 'animate-pulse-gentle' : ''}
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
