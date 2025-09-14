import React, { useMemo } from 'react';
import ResourceBar from './ResourceBar';
import TrafficLight, { type TrafficState } from './TrafficLight';

export type ResourceTileProps = {
  capacity: number;
  usedHours: number;
  rag: 'red' | 'amber' | 'green';
  height?: number;
};

export default function ResourceTile({ capacity, usedHours, rag, height = 200 }: ResourceTileProps) {
  const state: TrafficState = useMemo(() => rag, [rag]);
  return (
    <div className="w-full">
      <div className="flex items-center gap-4" style={{ height }}>
        <div className="w-12 shrink-0 flex justify-center">
          <TrafficLight state={state} size="sm" ariaLabel={`Ressourcen-Ampel: ${rag}`} />
        </div>
        <div className="flex-1 min-w-0 h-full">
          <ResourceBar capacity={capacity} usedHours={usedHours} height={height} />
        </div>
      </div>
    </div>
  );
}
