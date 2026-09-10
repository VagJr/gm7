'use client';

import React, { useEffect, useState } from 'react';
import { Sparkles, Skull, CheckCircle, XCircle } from 'lucide-react';

export type DiceRollEvent = {
  id: string;
  raw: number; // 1 to 20
  modifier: number;
  total: number;
  targetAc?: number;
  hit?: boolean;
  isCrit?: boolean;
  isFumble?: boolean;
  label?: string;
};

interface DiceRoller3DProps {
  roll: DiceRollEvent | null;
  onComplete?: () => void;
}

export function DiceRoller3D({ roll, onComplete }: DiceRoller3DProps) {
  const [phase, setPhase] = useState<'rolling' | 'settled' | 'hidden'>('hidden');
  const [displayNumber, setDisplayNumber] = useState(1);
  const onCompleteRef = React.useRef(onComplete);
  onCompleteRef.current = onComplete;
  const currentRollIdRef = React.useRef<string | null>(null);

  useEffect(() => {
    if (!roll) {
      setPhase('hidden');
      currentRollIdRef.current = null;
      return;
    }

    // Guard: Prevent restarting roll animation if this roll ID is already playing/completed
    if (currentRollIdRef.current === roll.id) {
      return;
    }
    currentRollIdRef.current = roll.id;

    setPhase('rolling');
    // Rapidly cycle random numbers during roll
    let currentNumber = 1;
    const interval = setInterval(() => {
      currentNumber = Math.floor(Math.random() * 20) + 1;
      setDisplayNumber(currentNumber);
    }, 45);

    const settleTimer = setTimeout(() => {
      clearInterval(interval);
      setDisplayNumber(roll.raw);
      setPhase('settled');
    }, 500);

    const dismissTimer = setTimeout(() => {
      setPhase('hidden');
      onCompleteRef.current?.();
    }, 1900);

    return () => {
      clearInterval(interval);
      clearTimeout(settleTimer);
      clearTimeout(dismissTimer);
    };
  }, [roll?.id, roll?.raw]);

  if (phase === 'hidden' || !roll) return null;

  const isCrit = roll.raw === 20 || roll.isCrit;
  const isFumble = roll.raw === 1 || roll.isFumble;
  const isHit = roll.hit ?? (roll.targetAc ? roll.total >= roll.targetAc : true);

  return (
    <div
      onClick={() => {
        setPhase('hidden');
        onComplete?.();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] transition-opacity cursor-pointer animate-fade-in"
    >
      <div className="relative flex flex-col items-center justify-center p-6 text-center select-none">
        {/* Glow halo behind dice */}
        <div
          className={`absolute h-48 w-48 rounded-full blur-2xl transition-all duration-500 ${
            isCrit
              ? 'bg-amber-500/40 animate-pulse scale-125'
              : isFumble
              ? 'bg-red-600/40 animate-pulse'
              : 'bg-emerald-500/25'
          }`}
        />

        {/* The D20 Polyhedron */}
        <div
          className={`relative flex items-center justify-center w-28 h-28 sm:w-32 sm:h-32 rounded-2xl border-2 transition-transform duration-300 ${
            phase === 'rolling'
              ? 'animate-spin-rapid scale-95 border-amber-400/60 bg-gradient-to-br from-amber-950/90 to-black'
              : isCrit
              ? 'scale-110 border-amber-300 bg-gradient-to-b from-amber-900 via-amber-700 to-black shadow-[0_0_35px_rgba(251,191,36,0.6)]'
              : isFumble
              ? 'scale-105 border-red-500 bg-gradient-to-b from-red-950 via-red-900 to-black shadow-[0_0_30px_rgba(239,68,68,0.5)]'
              : 'scale-100 border-zinc-600 bg-gradient-to-b from-zinc-800 to-zinc-950 shadow-2xl'
          }`}
        >
          {/* Engraved Inner Diamond / D20 Shape */}
          <div className="absolute inset-1.5 border border-white/10 rounded-xl pointer-events-none flex items-center justify-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 border border-amber-400/20 rotate-45" />
          </div>

          {/* D20 Number Display */}
          <span
            className={`relative font-mono font-black text-4xl sm:text-5xl tracking-tighter ${
              isCrit
                ? 'text-amber-300 drop-shadow-[0_0_12px_rgba(251,191,36,0.9)]'
                : isFumble
                ? 'text-red-400 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]'
                : 'text-zinc-100 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]'
            }`}
          >
            {displayNumber}
          </span>
        </div>

        {/* Settled Result Card */}
        {phase === 'settled' && (
          <div className="mt-4 flex flex-col items-center gap-1.5 animate-slide-up">
            {/* Action Label */}
            {roll.label && (
              <span className="text-xs uppercase tracking-widest text-zinc-400 font-semibold">
                {roll.label}
              </span>
            )}

            {/* Formula Math */}
            <div className="flex items-center gap-2 text-sm font-mono text-zinc-300 bg-black/60 px-3 py-1 rounded-full border border-white/10">
              <span>d20 ({roll.raw})</span>
              <span>{roll.modifier >= 0 ? `+ ${roll.modifier}` : `- ${Math.abs(roll.modifier)}`}</span>
              <span>=</span>
              <strong className="text-amber-400 text-base">{roll.total}</strong>
              {roll.targetAc && (
                <span className="text-zinc-400 text-xs border-l border-zinc-700 pl-2">
                  vs CA {roll.targetAc}
                </span>
              )}
            </div>

            {/* Outcome Badge */}
            <div className="mt-1 flex items-center gap-1.5 px-3 py-1 rounded font-bold text-xs uppercase tracking-wider">
              {isCrit ? (
                <span className="inline-flex items-center gap-1 text-amber-300 bg-amber-950/80 border border-amber-500/60 px-3 py-1 rounded-md shadow-lg shadow-amber-900/40">
                  <Sparkles size={14} className="animate-spin" /> ACERTO CRÍTICO!
                </span>
              ) : isFumble ? (
                <span className="inline-flex items-center gap-1 text-red-300 bg-red-950/80 border border-red-500/60 px-3 py-1 rounded-md shadow-lg shadow-red-900/40">
                  <Skull size={14} /> FALHA CRÍTICA!
                </span>
              ) : isHit ? (
                <span className="inline-flex items-center gap-1 text-emerald-300 bg-emerald-950/70 border border-emerald-500/50 px-3 py-1 rounded-md">
                  <CheckCircle size={14} /> ACERTOU!
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-zinc-400 bg-zinc-900/90 border border-zinc-700 px-3 py-1 rounded-md">
                  <XCircle size={14} /> ERROU
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
