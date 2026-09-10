// components/game/mobile-action-cluster.tsx
'use client';

import React from 'react';
import {
  Swords,
  Sparkles,
  Package,
  Footprints,
  Search,
  Hand,
  MessageSquare,
  Shield,
  Crosshair,
  Heart
} from 'lucide-react';
import type { ActionSelection } from './bottom-player-hud';

interface MobileActionClusterProps {
  isCombat: boolean;
  isHeroTurn: boolean;
  hasTargetingAction: boolean;
  onCancelTargeting: () => void;
  onAttackClick: () => void;
  onSpellClick: () => void;
  onInventoryClick: () => void;
  onUsePotionClick?: () => void;
  onEndTurnClick: () => void;
  onInvestigateClick: () => void;
  onInteractClick: () => void;
  onTalkNpcClick: () => void;
  onStartCombatClick?: () => void;
  isOwner?: boolean;
  busy?: boolean;
}

export function MobileActionCluster({
  isCombat,
  isHeroTurn,
  hasTargetingAction,
  onCancelTargeting,
  onAttackClick,
  onSpellClick,
  onInventoryClick,
  onUsePotionClick,
  onEndTurnClick,
  onInvestigateClick,
  onInteractClick,
  onTalkNpcClick,
  onStartCombatClick,
  isOwner,
  busy
}: MobileActionClusterProps) {
  return (
    <div className="md:hidden fixed bottom-14 right-3 z-40 flex flex-col items-end gap-2 pointer-events-auto select-none">
      {/* Targeting active cancel pill */}
      {hasTargetingAction && (
        <button
          onClick={onCancelTargeting}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-950/90 text-red-200 border border-red-500 text-xs font-bold shadow-2xl animate-pulse"
        >
          <Crosshair size={14} className="text-red-400" />
          <span>Cancelar Alvo</span>
        </button>
      )}

      {/* Action Cluster */}
      <div className="flex items-center gap-2 bg-black/85 p-1.5 rounded-2xl border border-zinc-800/90 shadow-2xl backdrop-blur-md">
        {isCombat ? (
          <>
            {/* End turn button if hero turn */}
            {isHeroTurn && (
              <button
                disabled={busy}
                onClick={onEndTurnClick}
                className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-950 to-zinc-900 border border-emerald-500/60 text-emerald-300 flex flex-col items-center justify-center gap-0.5 shadow-lg active:scale-95 transition-transform"
                title="Encerrar Turno"
              >
                <Footprints size={16} />
                <span className="text-[9px] font-bold">Passar</span>
              </button>
            )}

            {/* Quick Healing Potion */}
            {onUsePotionClick && (
              <button
                disabled={busy}
                onClick={onUsePotionClick}
                className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-950 to-zinc-900 border border-emerald-500/60 text-emerald-300 flex flex-col items-center justify-center gap-0.5 shadow-lg active:scale-95 transition-transform"
                title="Beber Poção de Cura"
              >
                <Heart size={16} />
                <span className="text-[9px] font-bold">Poção</span>
              </button>
            )}

            {/* Inventory / Potions */}
            <button
              disabled={busy}
              onClick={onInventoryClick}
              className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-950/60 to-zinc-900 border border-amber-500/40 text-amber-300 flex flex-col items-center justify-center gap-0.5 shadow-lg active:scale-95 transition-transform"
              title="Mochila e Poções"
            >
              <Package size={16} />
              <span className="text-[9px] font-bold">Mochila</span>
            </button>

            {/* Magia / Spell */}
            <button
              disabled={busy}
              onClick={onSpellClick}
              className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-950 to-zinc-900 border border-purple-500/60 text-purple-200 flex flex-col items-center justify-center gap-0.5 shadow-lg active:scale-95 transition-transform"
              title="Magias Preparadas"
            >
              <Sparkles size={16} />
              <span className="text-[9px] font-bold">Magia</span>
            </button>

            {/* Main Attack Action Button */}
            <button
              disabled={busy || !isHeroTurn}
              onClick={onAttackClick}
              className={`w-13 h-13 rounded-2xl flex flex-col items-center justify-center gap-0.5 shadow-2xl active:scale-95 transition-all border ${
                isHeroTurn
                  ? 'bg-gradient-to-br from-red-600 via-amber-600 to-amber-700 text-white border-amber-300 shadow-[0_0_16px_rgba(245,158,11,0.5)] animate-pulse'
                  : 'bg-zinc-800 text-zinc-500 border-zinc-700 opacity-60'
              }`}
              title="Ataque com Arma"
            >
              <Swords size={20} className="drop-shadow" />
              <span className="text-[10px] font-black uppercase tracking-tight">Atacar</span>
            </button>
          </>
        ) : (
          /* Exploration Mode Buttons */
          <>
            {/* Investigar */}
            <button
              disabled={busy}
              onClick={onInvestigateClick}
              className="w-10 h-10 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-cyan-300 flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-transform"
              title="Investigar os arredores"
            >
              <Search size={15} />
              <span className="text-[8px] font-bold">Invest.</span>
            </button>

            {/* Interagir */}
            <button
              disabled={busy}
              onClick={onInteractClick}
              className="w-10 h-10 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-amber-300 flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-transform"
              title="Interagir com o ambiente"
            >
              <Hand size={15} />
              <span className="text-[8px] font-bold">Interagir</span>
            </button>

            {/* Falar NPC */}
            <button
              disabled={busy}
              onClick={onTalkNpcClick}
              className="w-10 h-10 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-emerald-300 flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-transform"
              title="Conversar com NPC"
            >
              <MessageSquare size={15} />
              <span className="text-[8px] font-bold">Falar</span>
            </button>

            {/* Iniciar Combate (if owner) */}
            {isOwner && onStartCombatClick && (
              <button
                disabled={busy}
                onClick={onStartCombatClick}
                className="w-11 h-11 rounded-xl bg-gradient-to-br from-red-900 to-zinc-900 border border-red-500/70 text-red-200 flex flex-col items-center justify-center gap-0.5 shadow-lg active:scale-95 transition-transform"
                title="Iniciar Combate"
              >
                <Swords size={16} />
                <span className="text-[8px] font-bold">Combate</span>
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
