// components/game/level-up-modal.tsx
'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  Heart,
  Shield,
  Award,
  ChevronRight,
  Plus,
  Minus,
  X,
  Dices,
  Flame
} from 'lucide-react';
import {
  Character,
  classes,
  abilities,
  mod,
  prof,
  signed,
  getXpForNextLevel,
  isAsiLevel,
  getSpellSlotsForClass
} from '@/lib/game-engine';

interface LevelUpModalProps {
  hero: Character;
  isOpen: boolean;
  onClose: () => void;
  onConfirmLevelUp: (statIncreases: number[]) => Promise<void> | void;
  busy?: boolean;
}

export function LevelUpModal({
  hero,
  isOpen,
  onClose,
  onConfirmLevelUp,
  busy
}: LevelUpModalProps) {
  const newLevel = hero.level + 1;
  const classTuple = classes.find((cl) => cl[0] === hero.className);
  const hitDieSides = classTuple ? classTuple[1] : 8;
  const conMod = mod(hero.stats[2]);
  const avgHpGain = Math.max(1, Math.floor(hitDieSides / 2) + 1 + conMod);

  const hasAsi = isAsiLevel(hero.className, newLevel);
  // ASI distribution state: 2 points total
  const [allocatedPoints, setAllocatedPoints] = useState<number[]>([0, 0, 0, 0, 0, 0]);

  if (!isOpen) return null;

  const totalPointsSpent = allocatedPoints.reduce((a, b) => a + b, 0);
  const pointsRemaining = 2 - totalPointsSpent;

  const handleAddPoint = (statIdx: number) => {
    if (pointsRemaining <= 0) return;
    if (hero.stats[statIdx] + allocatedPoints[statIdx] >= 20) return; // Cap at 20 in 5e
    const next = [...allocatedPoints];
    next[statIdx] += 1;
    setAllocatedPoints(next);
  };

  const handleRemovePoint = (statIdx: number) => {
    if (allocatedPoints[statIdx] <= 0) return;
    const next = [...allocatedPoints];
    next[statIdx] -= 1;
    setAllocatedPoints(next);
  };

  const handleConfirm = async () => {
    if (hasAsi && pointsRemaining > 0) {
      alert(`Você ainda tem ${pointsRemaining} ponto(s) de atributo para distribuir.`);
      return;
    }

    // Convert allocated points into array of stat indices (e.g. [0, 0] or [0, 2])
    const statIncreases: number[] = [];
    allocatedPoints.forEach((pts, idx) => {
      for (let i = 0; i < pts; i++) statIncreases.push(idx);
    });

    await onConfirmLevelUp(statIncreases);
    onClose();
  };

  const oldProf = prof(hero.level);
  const newProf = prof(newLevel);
  const profIncreased = newProf > oldProf;

  const newSlots = getSpellSlotsForClass(hero.className, newLevel);
  const hasSpells = newSlots.some((s) => s > 0);

  return (
    <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6 animate-fade-in select-none">
      <div className="relative w-full max-w-lg bg-gradient-to-b from-[#181308] via-[#0f0c05] to-[#080602] border-2 border-amber-500/90 rounded-3xl p-5 sm:p-7 shadow-[0_0_60px_rgba(245,158,11,0.4)] flex flex-col gap-4 text-left">
        {/* Header Ribbon */}
        <div className="flex items-center justify-between border-b border-amber-500/40 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400 flex items-center justify-center text-amber-300 shadow-md animate-pulse">
              <Award size={22} />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400/90 font-bold block">
                Ascensão de Poder • D&D 5e
              </span>
              <h2 className="text-xl sm:text-2xl font-serif font-black text-amber-100 leading-tight">
                Subir para o Nível {newLevel}!
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Hero Identity Badge */}
        <div className="flex items-center justify-between bg-zinc-950/80 border border-zinc-800 rounded-2xl p-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-600 to-amber-900 border border-amber-400/80 flex items-center justify-center text-amber-100 font-serif font-bold text-base">
              {hero.name[0]}
            </div>
            <div>
              <div className="font-bold text-zinc-100 text-sm">{hero.name}</div>
              <div className="text-xs text-amber-400/80 font-serif">
                {hero.species} {hero.className} • Nível {hero.level} →{' '}
                <strong className="text-amber-300 font-black">Nível {newLevel}</strong>
              </div>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-mono text-zinc-400 block">XP Acumulado</span>
            <span className="text-xs font-mono font-bold text-amber-300">
              {hero.xp || 0} XP
            </span>
          </div>
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Hit Points Gain */}
          <div className="bg-zinc-950/90 border border-red-900/60 rounded-2xl p-3 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-xs text-red-400 font-bold">
              <Heart size={14} className="text-red-400" />
              <span>Pontos de Vida (PV)</span>
            </div>
            <div className="flex items-baseline gap-1 text-lg font-black text-red-200">
              <span>+{avgHpGain} PV</span>
              <span className="text-[11px] font-normal text-zinc-400">
                (1d{hitDieSides}/2 + {conMod >= 0 ? '+' : ''}{conMod} CON)
              </span>
            </div>
            <div className="text-[10px] text-zinc-400 font-mono">
              Total: {hero.maxHp} → <strong className="text-red-300">{hero.maxHp + avgHpGain} PV</strong>
            </div>
          </div>

          {/* Proficiency Bonus */}
          <div className="bg-zinc-950/90 border border-amber-900/60 rounded-2xl p-3 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-xs text-amber-400 font-bold">
              <Sparkles size={14} className="text-amber-400" />
              <span>Bônus de Proficiência</span>
            </div>
            <div className="flex items-baseline gap-1 text-lg font-black text-amber-200">
              <span>{signed(newProf)}</span>
              {profIncreased && (
                <span className="text-[11px] font-bold text-emerald-400 uppercase">
                  (Subiu!)
                </span>
              )}
            </div>
            <div className="text-[10px] text-zinc-400 font-mono">
              Ataques, salvaguardas e perícias
            </div>
          </div>
        </div>

        {/* Spell Slots Advancement if applicable */}
        {hasSpells && (
          <div className="bg-purple-950/30 border border-purple-800/60 rounded-2xl p-3 flex flex-col gap-1.5">
            <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
              <Sparkles size={14} className="text-purple-400" />
              Espaços de Magia Atualizados (D&D 5e):
            </span>
            <div className="flex items-center gap-3 text-xs font-mono text-purple-200">
              {newSlots.map((total, lvl) => {
                if (total === 0) return null;
                const oldTotal = hero.slots[lvl] || 0;
                return (
                  <span key={lvl} className="flex items-center gap-1 bg-purple-900/40 px-2 py-0.5 rounded-lg border border-purple-700/60">
                    Círculo {lvl + 1}: <strong>{total}</strong>
                    {total > oldTotal && (
                      <span className="text-emerald-400 font-bold text-[10px]">
                        (+{total - oldTotal})
                      </span>
                    )}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Ability Score Improvement (ASI) section if level qualifies */}
        {hasAsi && (
          <div className="bg-zinc-950/95 border-2 border-amber-500/80 rounded-2xl p-3 sm:p-4 flex flex-col gap-2 shadow-inner">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Award size={16} className="text-amber-400" />
                <span className="text-xs sm:text-sm font-bold text-amber-200">
                  Aumento de Atributo (ASI)
                </span>
              </div>
              <span className="text-xs font-mono font-black text-yellow-300 bg-amber-500/20 px-2 py-0.5 rounded-lg border border-amber-500/40">
                Pontos restantes: {pointsRemaining}
              </span>
            </div>
            <p className="text-[11px] text-zinc-300 leading-relaxed">
              Distribua 2 pontos entre os atributos abaixo (+2 em um ou +1 em dois, máximo 20).
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
              {abilities.map((name, idx) => {
                const currentVal = hero.stats[idx];
                const added = allocatedPoints[idx];
                const finalVal = currentVal + added;
                const isMax = finalVal >= 20;

                return (
                  <div
                    key={name}
                    className="bg-black/60 border border-zinc-800 rounded-xl p-2 flex items-center justify-between"
                  >
                    <div>
                      <span className="text-[10px] uppercase font-bold text-zinc-400 block">
                        {name.slice(0, 3)}
                      </span>
                      <span className="text-xs font-bold text-zinc-100">
                        {finalVal}{' '}
                        <small className="text-amber-400 font-mono">
                          ({signed(mod(finalVal))})
                        </small>
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleRemovePoint(idx)}
                        disabled={added <= 0}
                        className="w-5 h-5 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 text-white flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
                      >
                        <Minus size={10} />
                      </button>
                      <span className="text-xs font-mono font-bold text-amber-300 w-3 text-center">
                        {added > 0 ? `+${added}` : '0'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleAddPoint(idx)}
                        disabled={pointsRemaining <= 0 || isMax}
                        className="w-5 h-5 rounded bg-amber-600 hover:bg-amber-500 disabled:opacity-30 text-black flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
                      >
                        <Plus size={10} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Action Confirm Button */}
        <button
          disabled={busy || (hasAsi && pointsRemaining > 0)}
          onClick={handleConfirm}
          className="w-full py-3 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 disabled:opacity-40 disabled:cursor-not-allowed text-black font-black text-sm tracking-wider uppercase shadow-[0_0_25px_rgba(245,158,11,0.6)] border border-yellow-200 transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer mt-1"
        >
          <Sparkles size={16} className="fill-black" />
          <span>Confirmar e Subir para Nível {newLevel}</span>
        </button>
      </div>
    </div>
  );
}
