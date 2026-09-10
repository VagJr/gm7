'use client';

import React from 'react';
import { Shield, Sparkles, Swords, Skull, Crown } from 'lucide-react';
import type { Character, Enemy } from '@/lib/game-engine';

interface InitiativeRibbonProps {
  combat: boolean;
  round: number;
  turn: number;
  order: string[];
  characters: Character[];
  enemies: Enemy[];
  selectedTargetId?: string;
  onSelectTarget?: (id: string) => void;
}

export function InitiativeRibbon({
  combat,
  round,
  turn,
  order,
  characters,
  enemies,
  selectedTargetId,
  onSelectTarget
}: InitiativeRibbonProps) {
  // Build initiative list
  // If combat is active and order is available, sort actors by order
  // Otherwise list heroes and available enemies
  const allActors = React.useMemo(() => {
    if (combat && order && order.length > 0) {
      return order.map((id, index) => {
        const hero = characters.find((c) => c.id === id);
        if (hero) {
          return {
            id: hero.id,
            name: hero.name,
            type: 'hero' as const,
            hp: hero.hp,
            maxHp: hero.maxHp,
            ac: hero.ac,
            className: hero.className,
            species: hero.species,
            index: index + 1,
            isCurrentTurn: turn % order.length === index
          };
        }
        const enemy = enemies.find((e) => e.id === id);
        if (enemy) {
          return {
            id: enemy.id,
            name: enemy.name,
            type: 'enemy' as const,
            hp: enemy.hp,
            maxHp: enemy.maxHp,
            ac: enemy.ac,
            className: 'Inimigo',
            species: 'Monstro',
            index: index + 1,
            isCurrentTurn: turn % order.length === index
          };
        }
        return null;
      }).filter(Boolean);
    }

    // Peaceful / Exploration queue
    const list: any[] = [];
    characters.forEach((c, idx) => {
      list.push({
        id: c.id,
        name: c.name,
        type: 'hero' as const,
        hp: c.hp,
        maxHp: c.maxHp,
        ac: c.ac,
        className: c.className,
        species: c.species,
        index: idx + 1,
        isCurrentTurn: idx === 0
      });
    });
    enemies.forEach((e, idx) => {
      list.push({
        id: e.id,
        name: e.name,
        type: 'enemy' as const,
        hp: e.hp,
        maxHp: e.maxHp,
        ac: e.ac,
        className: 'Inimigo',
        species: 'Monstro',
        index: characters.length + idx + 1,
        isCurrentTurn: false
      });
    });
    return list;
  }, [combat, order, turn, characters, enemies]);

  return (
    <div className="relative flex items-center justify-start gap-1 sm:gap-2 px-3 py-1 bg-[#101410]/95 border border-zinc-700/70 rounded-2xl backdrop-blur-md shadow-[0_4px_25px_rgba(0,0,0,0.8)] max-w-full overflow-x-auto scrollbar-none">
      {/* Subtle background glow */}
      <div className="absolute inset-0 bg-gradient-to-r from-amber-950/10 via-zinc-900/10 to-amber-950/10 pointer-events-none rounded-2xl" />

      {/* Combat round indicator badge */}
      {combat && (
        <div className="flex items-center gap-1 shrink-0 px-2 py-0.5 rounded-lg bg-red-950/90 border border-red-600/60 text-red-200 font-mono text-[10px] font-bold tracking-wider mr-1 shadow-sm">
          <Swords size={11} className="text-red-400 animate-pulse" />
          <span>R{round}</span>
        </div>
      )}

      {/* Combatants tokens queue */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0 py-0.5">
        {allActors.map((actor, i) => {
          if (!actor) return null;
          const isHero = actor.type === 'hero';
          const hpPct = Math.max(0, Math.min(100, (actor.hp / actor.maxHp) * 100));
          const isDead = actor.hp <= 0;
          const isSelected = selectedTargetId === actor.id;

          return (
            <React.Fragment key={actor.id}>
              {/* Divider dots between tokens */}
              {i > 0 && (
                <div className="flex flex-col gap-0.5 items-center justify-center opacity-40 shrink-0">
                  <span className="w-1 h-1 rounded-full bg-amber-400" />
                  <span className="w-1 h-1 rounded-full bg-stone-500" />
                </div>
              )}

              <button
                type="button"
                onClick={() => onSelectTarget?.(actor.id)}
                className={`group relative flex flex-col items-center shrink-0 transition-transform focus:outline-none ${
                  actor.isCurrentTurn ? 'scale-115' : 'hover:scale-105'
                }`}
                title={`${actor.name} (${actor.hp}/${actor.maxHp} PV • CA ${actor.ac})${actor.isCurrentTurn ? ' • VEZ ATUAL' : ''}`}
              >
                {/* Active turn halo indicator */}
                {actor.isCurrentTurn && (
                  <>
                    <div className="absolute -inset-1 rounded-full border-2 border-amber-400 animate-ping opacity-60 pointer-events-none" />
                    <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-amber-400 text-black font-black text-[7px] sm:text-[8px] px-1 rounded-full uppercase tracking-tight shadow-md pointer-events-none whitespace-nowrap z-30 animate-pulse">
                      VEZ
                    </span>
                  </>
                )}

                {/* Circular Token */}
                <div
                  className={`relative w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center overflow-hidden transition-all ${
                    actor.isCurrentTurn
                      ? 'ring-4 ring-amber-400 shadow-[0_0_16px_rgba(251,191,36,0.8)]'
                      : isSelected
                      ? 'ring-2 ring-amber-400/80 shadow-[0_0_10px_rgba(251,191,36,0.4)]'
                      : isHero
                      ? 'ring-1 ring-amber-600/50'
                      : 'ring-1 ring-red-500/50'
                  } ${
                    isHero
                      ? 'bg-gradient-to-b from-[#2d2417] to-zinc-950'
                      : 'bg-gradient-to-b from-red-950/90 to-zinc-950'
                  }`}
                >
                  {/* Avatar silhouette / initials */}
                  <span
                    className={`font-serif font-black text-xs sm:text-sm select-none ${
                      isDead
                        ? 'text-zinc-600 line-through'
                        : isHero
                        ? 'text-amber-200'
                        : 'text-red-300'
                    }`}
                  >
                    {isDead ? (
                      <Skull size={14} className="text-red-400" />
                    ) : (
                      actor.name.charAt(0)
                    )}
                  </span>

                  {/* Turn order small index badge */}
                  <div
                    className={`absolute top-0 left-0 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-black leading-none ${
                      actor.isCurrentTurn
                        ? 'bg-amber-400 text-black font-black'
                        : isHero
                        ? 'bg-amber-700 text-black font-bold'
                        : 'bg-red-700 text-white'
                    }`}
                  >
                    {actor.index}
                  </div>
                </div>

                {/* Underline mini health line */}
                <div className="w-7 sm:w-8 h-1 bg-zinc-800/90 rounded-full mt-1 overflow-hidden border border-zinc-950">
                  <div
                    className={`h-full transition-all duration-300 ${
                      isDead
                        ? 'bg-zinc-700'
                        : hpPct > 50
                        ? 'bg-emerald-400'
                        : hpPct > 20
                        ? 'bg-amber-400'
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${hpPct}%` }}
                  />
                </div>
              </button>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
