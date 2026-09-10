'use client';

import React from 'react';

export type FloatingNumber = {
  id: string;
  x: number; // percentage or px
  y: number;
  text: string;
  type: 'damage' | 'crit' | 'heal' | 'miss' | 'info';
};

interface FloatingTextOverlayProps {
  items: FloatingNumber[];
}

export function FloatingTextOverlay({ items }: FloatingTextOverlayProps) {
  if (!items.length) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-50 overflow-hidden">
      {items.map((item) => {
        const colorClasses = {
          damage: 'text-red-500 text-shadow-damage text-2xl font-black',
          crit: 'text-amber-300 text-shadow-crit text-3xl font-black scale-110 animate-bounce',
          heal: 'text-emerald-400 text-shadow-heal text-2xl font-bold',
          miss: 'text-slate-400 text-lg font-semibold tracking-wider',
          info: 'text-cyan-300 text-sm font-medium'
        }[item.type];

        return (
          <div
            key={item.id}
            style={{ left: `${item.x}%`, top: `${item.y}%` }}
            className={`floating-combat-text absolute -translate-x-1/2 -translate-y-1/2 ${colorClasses}`}
          >
            {item.text}
          </div>
        );
      })}
    </div>
  );
}
