'use client';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import { TacticalMap, type TacticalMapProps } from './tactical-map';
const Board3D = dynamic(() => import('./world-board').then(m => m.WorldBoard), { ssr: false, loading: () => <div className="dd-webgl-error">Preparando o mundo 3D…</div> });
export function GameBoard(props: TacticalMapProps) {
  const [compatibility, setCompatibility] = useState(false);
  if (props.dungeonFloor || compatibility) return <><TacticalMap {...props} />{!props.dungeonFloor && <button style={{ position: 'absolute', bottom: 130, left: 18, zIndex: 35 }} className="dd-primary" onClick={() => setCompatibility(false)}>Voltar ao mundo 3D</button>}</>;
  return <Board3D {...props} onFallback={() => setCompatibility(true)} />;
}
