'use client';

import React from 'react';
import {
  Search,
  Hand,
  Users,
  Moon,
  Coffee,
  Swords,
  Compass,
  MapPin
} from 'lucide-react';

interface ExplorationBarProps {
  onInvestigate: () => void;
  onInteract: () => void;
  onTalkNpc: () => void;
  onShortRest: () => void;
  onLongRest: () => void;
  onStartCombat: () => void;
  isOwner: boolean;
  busy?: boolean;
}

export function ExplorationBar({
  onInvestigate,
  onInteract,
  onTalkNpc,
  onShortRest,
  onLongRest,
  onStartCombat,
  isOwner,
  busy
}: ExplorationBarProps) {
  return (
    <div className="w-full max-w-4xl mx-auto flex items-center justify-between gap-2 p-2 bg-zinc-950/90 border border-zinc-800 rounded-2xl shadow-xl backdrop-blur-md overflow-x-auto scrollbar-none select-none">
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-0.5">
        {/* Investigar */}
        <button
          disabled={busy}
          onClick={onInvestigate}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-200 text-xs font-semibold transition-all hover:scale-105"
        >
          <Search size={14} className="text-cyan-400" />
          <span>Investigar</span>
        </button>

        {/* Interagir */}
        <button
          disabled={busy}
          onClick={onInteract}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-200 text-xs font-semibold transition-all hover:scale-105"
        >
          <Hand size={14} className="text-amber-400" />
          <span>Interagir</span>
        </button>

        {/* Conversar com NPC */}
        <button
          disabled={busy}
          onClick={onTalkNpc}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-200 text-xs font-semibold transition-all hover:scale-105"
        >
          <Users size={14} className="text-emerald-400" />
          <span>Falar com NPC</span>
        </button>

        {/* Descansos */}
        {isOwner && (
          <>
            <button
              disabled={busy}
              onClick={onShortRest}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-300 text-xs font-semibold transition-all"
              title="Descanso Curto (1 hora)"
            >
              <Coffee size={14} className="text-amber-300" />
              <span className="hidden sm:inline">Descanso Curto</span>
            </button>

            <button
              disabled={busy}
              onClick={onLongRest}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-300 text-xs font-semibold transition-all"
              title="Descanso Longo (8 horas)"
            >
              <Moon size={14} className="text-purple-300" />
              <span>Descanso Longo</span>
            </button>
          </>
        )}
      </div>

      {/* Iniciar Combate (Owner only) */}
      {isOwner && (
        <button
          disabled={busy}
          onClick={onStartCombat}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-red-950 to-red-900 hover:from-red-900 hover:to-red-800 text-red-200 border border-red-600/70 text-xs font-bold transition-all shadow-lg hover:scale-105 shrink-0"
        >
          <Swords size={14} className="text-red-400" />
          <span>Iniciar Encontro</span>
        </button>
      )}
    </div>
  );
}
