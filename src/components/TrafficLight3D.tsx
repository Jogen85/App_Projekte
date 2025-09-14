import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';

export type TrafficState = 'red' | 'amber' | 'green';

type Props = {
  state: TrafficState;
  ariaLabel?: string;
  className?: string;
  height?: number;
};

function Light({ position, color, on }: { position: [number, number, number]; color: string; on: boolean }) {
  const emissive = on ? color : '#111111';
  const intensity = on ? 1.5 : 0.05;
  return (
    <group position={position}>
      <mesh>
        <cylinderGeometry args={[0.28, 0.28, 0.12, 32]} />
        {/** @ts-expect-error r3f material typing */}
        <meshStandardMaterial color="#0a0a0a" metalness={0.6} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0, 0.07]}> 
        <sphereGeometry args={[0.22, 32, 32]} />
        {/** @ts-expect-error r3f material typing */}
        <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={intensity} metalness={0.1} roughness={0.4} />
      </mesh>
    </group>
  );
}

function Housing() {
  return (
    <group>
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[1.2, 3.2, 0.8]} />
        {/** @ts-expect-error r3f material typing */}
        <meshStandardMaterial color="#1a1a1a" metalness={0.8} roughness={0.35} />
      </mesh>
      <mesh position={[0, -1.6, 0]}> 
        <cylinderGeometry args={[0.12, 0.12, 3.0, 24]} />
        {/** @ts-expect-error r3f material typing */}
        <meshStandardMaterial color="#2a2a2a" metalness={0.7} roughness={0.4} />
      </mesh>
      <mesh position={[0, -3.2, 0]}>
        <cylinderGeometry args={[0.5, 0.5, 0.2, 24]} />
        {/** @ts-expect-error r3f material typing */}
        <meshStandardMaterial color="#2a2a2a" metalness={0.7} roughness={0.4} />
      </mesh>
    </group>
  );
}

function TrafficLight({ state }: { state: TrafficState }) {
  const active = useMemo(() => ({
    red: state === 'red',
    amber: state === 'amber',
    green: state === 'green',
  }), [state]);

  return (
    <group position={[0, 0, 0]}>
      <Housing />
      <group position={[0, 1.6, 0.45]}>
        <Light position={[0, 0.8, 0]} color="#dc2626" on={active.red} />
        <Light position={[0, 0.0, 0]} color="#f59e0b" on={active.amber} />
        <Light position={[0, -0.8, 0]} color="#16a34a" on={active.green} />
      </group>
    </group>
  );
}

export default function TrafficLight3D({ state, ariaLabel, className, height = 280 }: Props) {
  const isClient = typeof window !== 'undefined';
  const hasGL = (() => {
    if (!isClient) return false;
    try {
      const c = document.createElement('canvas');
      return !!(c.getContext('webgl') || c.getContext('experimental-webgl'));
    } catch { return false; }
  })();

  if (!hasGL) {
    // Fallback: einfache, visuell ansprechende 2D-Ampel (CSS)
    const on = (k: TrafficState) => state === k;
    return (
      <div className={className} style={{ height }} aria-label={ariaLabel || `Ampel ${state}`}>
        <div className="h-full w-full flex items-center justify-center">
          <div className="w-24 h-[80%] rounded-lg shadow-inner bg-slate-800 p-2 flex flex-col justify-between" role="img" aria-label={ariaLabel || `Ampel ${state}`}>
            <div className={`aspect-square rounded-full ${on('red') ? 'bg-red-600' : 'bg-red-900'} shadow`} />
            <div className={`aspect-square rounded-full ${on('amber') ? 'bg-amber-400' : 'bg-amber-900'} shadow`} />
            <div className={`aspect-square rounded-full ${on('green') ? 'bg-green-600' : 'bg-green-900'} shadow`} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={className} style={{ height }} aria-label={ariaLabel || `Ampel ${state}`}>
      <Canvas camera={{ position: [3.5, 2.5, 6.5], fov: 35 }}>
        {/* Subtle environment */}
        <color attach="background" args={[0.95, 0.97, 1]} />
        <ambientLight intensity={0.7} />
        <directionalLight position={[5, 8, 5]} intensity={0.7} />
        <spotLight position={[-6, 6, 6]} angle={0.4} penumbra={0.5} intensity={0.6} castShadow />

        {/* Ground shadow catcher */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.6, 0]}>
          <cylinderGeometry args={[3, 3, 0.05, 48]} />
          {/** @ts-expect-error r3f material typing */}
          <meshStandardMaterial color="#e5e7eb" metalness={0} roughness={1} />
        </mesh>

        <TrafficLight state={state} />
      </Canvas>
    </div>
  );
}
