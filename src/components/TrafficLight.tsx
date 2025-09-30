export type TrafficState = 'red' | 'amber' | 'green';

type Props = {
  state: TrafficState;
  className?: string;
  size?: 'sm' | 'md';
  ariaLabel?: string;
};

export default function TrafficLight({ state, className, size = 'sm', ariaLabel }: Props) {
  const orbSize = size === 'sm' ? 32 : 40;

  // Modern gradient color configs (inspired by Apple/Stripe)
  const colors = {
    red: {
      gradient: 'radial-gradient(circle at 30% 30%, #fca5a5 0%, #ef4444 40%, #dc2626 100%)',
      glow: '0 0 20px rgba(239, 68, 68, 0.6), 0 0 40px rgba(239, 68, 68, 0.3)',
      innerGlow: 'radial-gradient(circle at 35% 25%, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0) 60%)',
    },
    amber: {
      gradient: 'radial-gradient(circle at 30% 30%, #fde68a 0%, #f59e0b 40%, #d97706 100%)',
      glow: '0 0 16px rgba(245, 158, 11, 0.5), 0 0 32px rgba(245, 158, 11, 0.25)',
      innerGlow: 'radial-gradient(circle at 35% 25%, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0) 60%)',
    },
    green: {
      gradient: 'radial-gradient(circle at 30% 30%, #6ee7b7 0%, #10b981 40%, #059669 100%)',
      glow: '0 0 14px rgba(16, 185, 129, 0.4), 0 0 28px rgba(16, 185, 129, 0.2)',
      innerGlow: 'radial-gradient(circle at 35% 25%, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0) 60%)',
    },
  };

  const config = colors[state];
  const shouldBreathe = state === 'red';

  return (
    <div className={className} role="img" aria-label={ariaLabel || `Status ${state}`}>
      <style>{`
        @keyframes breathe {
          0%, 100% {
            transform: scale(0.92);
            filter: brightness(1);
          }
          50% {
            transform: scale(1.08);
            filter: brightness(1.15);
          }
        }
        .animate-breathe {
          animation: breathe 3s ease-in-out infinite;
        }
      `}</style>

      <div className="relative flex items-center justify-center" style={{ width: orbSize + 16, height: orbSize + 16 }}>
        {/* Outer glow layer */}
        <div
          className={`absolute ${shouldBreathe ? 'animate-breathe' : ''}`}
          style={{
            width: orbSize,
            height: orbSize,
            borderRadius: '50%',
            background: config.gradient,
            boxShadow: config.glow,
            transition: 'all 0.3s ease',
          }}
        />

        {/* Main orb with glassmorphism */}
        <div
          className={`relative ${shouldBreathe ? 'animate-breathe' : ''}`}
          style={{
            width: orbSize,
            height: orbSize,
            borderRadius: '50%',
            background: config.gradient,
            boxShadow: `inset 0 1px 2px rgba(255,255,255,0.3), inset 0 -2px 4px rgba(0,0,0,0.2), ${config.glow}`,
            backdropFilter: 'blur(8px)',
          }}
        >
          {/* Inner highlight (glassmorphism effect) */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: config.innerGlow,
            }}
          />
        </div>
      </div>
    </div>
  );
}
