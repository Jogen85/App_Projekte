import React, { useMemo } from 'react';
import ResourceBar from './ResourceBar';
import TrafficLight3D, { type TrafficState } from './TrafficLight3D';

export type ResourceTileProps = {
  capacity: number;
  usedHours: number;
  rag: 'red' | 'amber' | 'green';
  height?: number;
};

export default function ResourceTile({ capacity, usedHours, rag, height = 320 }: ResourceTileProps) {
  const state: TrafficState = useMemo(() => rag, [rag]);
  return (
    <div className="w-full">
      <div className="flex items-stretch gap-4" style={{ height }}>
        <div className="hidden sm:block w-36 shrink-0">
          <TrafficLight3D state={state} height={height} ariaLabel={`Ressourcen-Ampel: ${rag}`} />
        </div>
        <div className="flex-1 min-w-0">
          <ResourceBar capacity={capacity} usedHours={usedHours} height={height} />
        </div>
      </div>
    </div>
  );
}

