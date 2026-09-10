'use client';

import React, { useEffect, useState } from 'react';
import { Shield, Skull, Swords, ChevronRight, AlertCircle, Heart } from 'lucide-react';
import type { Enemy, Character } from '@/lib/game-engine';

interface TopEnemyHudProps {
  combat: boolean;
  round: number;
  turn: number;
  order: string[];
  characters: Character[];
  enemies: Enemy[];
  selectedTargetId: string;
  onSelectTarget: (id: string) => void;
  onEndTurn?: () => void;
  canEndTurn?: boolean;
  busy?: boolean;
}

export function TopEnemyHud({
  combat,
  round,
  turn,
  order,
  characters,
  enemies,
  selectedTargetId,
  onSelectTarget,
  onEndTurn,
  canEndTurn,
  busy
}: TopEnemyHudProps) {
  // Find current entity whose turn it is
  const turnId = order[turn];
  const allEntities = [...characters, ...enemies];
  const turnEntity = allEntities.find((e) => e.id === turnId);

  // Active targeted enemy
  const activeEnemies = enemies.filter((e) => e.hp > 0);
  const targetEnemy =
    activeEnemies.find((e) => e.id === selectedTargetId) ||
    activeEnemies[0] ||
    enemies[0];

  // Deferred health bar transition effect (the lagging damage trail)
  const [delayedHp, setDelayedHp] = useState(targetEnemy?.hp || 0);

  useEffect(() => {
    if (!targetEnemy) return;
    const timer = setTimeout(() => {
      setDelayedHp(targetEnemy.hp);
    }, 400);
    return () => clearTimeout(timer);
  }, [targetEnemy?.hp]);

  if (!combat && !targetEnemy) return null;

  const currentHp = targetEnemy ? Math.max(0, targetEnemy.hp) : 0;
  const maxHp = targetEnemy ? Math.max(1, targetEnemy.maxHp) : 1;
  const hpPct = Math.min(100, Math.max(0, (currentHp / maxHp) * 100));
  const delayedHpPct = Math.min(100, Math.max(0, (delayedHp / maxHp) * 100));

  return (
    <div className="w-full flex flex-col items-center gap-2 select-none">
      {/* 1. Initiative Tracker / Turn Order Ribbon */}
      {combat && order.length > 0 && (
        <div className="w-full max-w-4xl bg-zinc-950/90 border border-amber-950/80 rounded-xl px-3 py-1.5 shadow-xl backdrop-blur-md flex items-center justify-between gap-2 overflow-x-auto scrollbar-none">
          {/* Round counter */}
          <div className="flex items-center gap-1.5 shrink-0 pr-3 border-r border-zinc-800">
            <Swords size={16} className="text-amber-400" />
            <span className="text-[11px] uppercase tracking-wider text-amber-300/90 font-bold">
              Rodada {round}
            </span>
          </div>

          {/* Entity Queue */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none flex-1">
            {order.map((id, idx) => {
              const entity = allEntities.find((e) => e.id === id);
              if (!entity || entity.hp <= 0) return null;
              const isTurn = idx === turn;
              const isHero = characters.some((c) => c.id === id);

              return (
                <div
                  key={id}
                  onClick={() => {
                    if (!isHero) onSelectTarget(id);
                  }}
                  className={`relative flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs transition-all cursor-pointer ${
                    isTurn
                      ? 'bg-amber-500/20 border-2 border-amber-400 text-amber-200 font-bold shadow-[0_0_12px_rgba(251,191,36,0.3)] scale-105'
                      : isHero
                      ? 'bg-cyan-950/40 border border-cyan-700/50 text-cyan-200/80 hover:border-cyan-400'
                      : 'bg-red-950/40 border border-red-800/50 text-red-200/80 hover:border-red-400'
                  }`}
                  title={`${entity.name} (Iniciativa ${entity.initiative})`}
                >
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black ${
                      isHero ? 'bg-cyan-700 text-white' : 'bg-red-700 text-white'
                    }`}
                  >
                    {entity.name[0]}
                  </div>
                  <span className="max-w-[70px] truncate">{entity.name}</span>
                  {isTurn && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping ml-0.5" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Pass Turn quick button if player turn */}
          {canEndTurn && onEndTurn && (
            <button
              disabled={busy}
              onClick={onEndTurn}
              className="shrink-0 text-xs font-semibold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all"
            >
              <span>Passar</span>
              <ChevronRight size={14} />
            </button>
          )}
        </div>
      )}

      {/* 2. Target Enemy Boss HUD Bar (Top Center) */}
      {targetEnemy && (
        <div className="w-full max-w-2xl bg-gradient-to-b from-zinc-950/95 to-black/90 border border-red-950/80 rounded-2xl p-2.5 sm:px-4 sm:py-2.5 shadow-2xl backdrop-blur-md flex items-center gap-3 relative overflow-hidden">
          {/* Subtle top red glow */}
          <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-red-500/60 to-transparent" />

          {/* Enemy Portrait / Avatar */}
          <div
            className={`relative shrink-0 w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center border-2 shadow-lg transition-transform ${
              targetEnemy.hp <= 0
                ? 'border-zinc-700 bg-zinc-900 opacity-50'
                : 'border-red-600/80 bg-gradient-to-br from-red-950 to-zinc-950 text-red-300'
            }`}
          >
            <Skull size={24} className="text-red-400 drop-shadow" />
            {targetEnemy.hp <= 0 && (
              <span className="absolute inset-0 bg-black/60 rounded-xl flex items-center justify-center text-[10px] font-bold text-red-500 uppercase">
                Morto
              </span>
            )}
          </div>

          {/* Name & Health Bar */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2 truncate">
                <span className="font-bold text-zinc-100 text-sm sm:text-base truncate tracking-wide">
                  {targetEnemy.name}
                </span>
                <span className="flex items-center gap-0.5 text-[11px] text-zinc-400 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
                  <Shield size={11} className="text-amber-400" />
                  <span>CA {targetEnemy.ac}</span>
                </span>
              </div>

              {/* Numeric HP */}
              <div className="flex items-center gap-1 text-xs font-mono font-bold">
                <span className="text-red-400">{currentHp}</span>
                <span className="text-zinc-600">/</span>
                <span className="text-zinc-400">{maxHp} PV</span>
              </div>
            </div>

            {/* Dynamic Health Bar with Deferred Damage Trail */}
            <div className="relative w-full h-3 sm:h-3.5 bg-zinc-900 rounded-full overflow-hidden border border-red-950">
              {/* Deferred Damage Layer (White/Light Red trail) */}
              <div
                style={{ width: `${delayedHpPct}%` }}
                className="absolute inset-y-0 left-0 bg-red-300/70 transition-all duration-700 ease-out"
              />

              {/* Main HP Layer (Crimson Red) */}
              <div
                style={{ width: `${hpPct}%` }}
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-red-700 via-red-600 to-amber-600 transition-all duration-300 ease-out"
              />

              {/* Glossy line */}
              <div className="absolute top-0 inset-x-0 h-1 bg-white/20" />
            </div>

            {/* Target selector chips if multiple active enemies */}
            {activeEnemies.length > 1 && (
              <div className="flex items-center gap-1 mt-1.5">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
                  Outros alvos:
                </span>
                {activeEnemies.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => onSelectTarget(e.id)}
                    className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
                      e.id === targetEnemy.id
                        ? 'border-red-500 bg-red-950 text-red-200'
                        : 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {e.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
