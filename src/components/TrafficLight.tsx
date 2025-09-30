export type TrafficState = 'red' | 'amber' | 'green';

type Props = {
  state: TrafficState;
  className?: string;
  size?: 'sm' | 'md';
  ariaLabel?: string;
};

export default function TrafficLight({ state, className, size = 'sm', ariaLabel }: Props) {
  const dotSize = size === 'sm' ? 32 : 40;

  // Modern status badge colors (GitHub/Slack/Linear style)
  const colors = {
    red: {
      dot: 'bg-red-500',
      ping: 'bg-red-400',
    },
    amber: {
      dot: 'bg-amber-500',
      ping: 'bg-amber-400',
    },
    green: {
      dot: 'bg-green-500',
      ping: 'bg-green-400',
    },
  };

  const config = colors[state];
  const shouldPing = state === 'red';

  return (
    <div className={className} role="img" aria-label={ariaLabel || `Status ${state}`}>
      <div className="relative inline-flex">
        {/* Ping animation (Tailwind native) - only for red */}
        {shouldPing && (
          <span
            className={`absolute inline-flex h-full w-full rounded-full ${config.ping} opacity-75 animate-ping`}
            style={{ width: dotSize, height: dotSize }}
          />
        )}

        {/* Status dot */}
        <span
          className={`relative inline-flex rounded-full ${config.dot} ring-4 ring-white shadow-lg`}
          style={{ width: dotSize, height: dotSize }}
        />
      </div>
    </div>
  );
}
