// components/game/mobile-drawer.tsx
'use client';

import React from 'react';
import {
  X,
  Swords,
  Users,
  BookOpen,
  Map as MapIcon,
  Settings,
  Flame,
  ScrollText,
  Package,
  Sparkles,
  Plus,
  Compass,
  Moon,
  Coffee,
  Shield,
  Activity,
  Layers,
  ChevronRight,
  ExternalLink,
  Trash2
} from 'lucide-react';
import type { CampaignAct } from '@/lib/campaign-data';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentView: string;
  onSelectView: (view: string) => void;
  campaignAct: CampaignAct;
  dungeonSize: number;
  onChangeDungeonSize: (size: 8 | 12 | 16) => void;
  onGenerateNewDungeon: () => void;
  onOpenCharacterCreator: () => void;
  onOpenInventory: () => void;
  onOpenQuests: () => void;
  onOpenJournal: () => void;
  onOpenRoomsDialog: () => void;
  onWipeAllData?: () => void;
  onShortRest: () => void;
  onLongRest: () => void;
  onAdvanceAct?: () => void;
  canAdvanceAct?: boolean;
  isOwner: boolean;
  busy?: boolean;
}

export function MobileDrawer({
  isOpen,
  onClose,
  currentView,
  onSelectView,
  campaignAct,
  dungeonSize,
  onChangeDungeonSize,
  onGenerateNewDungeon,
  onOpenCharacterCreator,
  onOpenInventory,
  onOpenQuests,
  onOpenJournal,
  onOpenRoomsDialog,
  onWipeAllData,
  onShortRest,
  onLongRest,
  onAdvanceAct,
  canAdvanceAct,
  isOwner,
  busy
}: MobileDrawerProps) {
  if (!isOpen) return null;

  const navItems = [
    { id: 'Aventura', label: 'Aventura (Masmorra)', icon: Swords, badge: 'D&D 5e' },
    { id: 'Personagens', label: 'Heróis & NPCs', icon: Users, badge: 'Fichas' },
    { id: 'Compêndio', label: 'Compêndio de Regras', icon: BookOpen, badge: 'SRD 5.2.1' },
    { id: 'Atlas', label: 'Atlas de Valdoria', icon: MapIcon, badge: '3 Atos' },
    { id: 'Mestre de jogo', label: 'Mestre IA & Groq', icon: Settings, badge: 'Llama 3.3' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity animate-fade-in"
        onClick={onClose}
      />

      {/* Off-canvas Drawer Panel */}
      <div className="relative w-4/5 max-w-sm bg-gradient-to-b from-[#131913] via-[#0d120e] to-[#080b08] border-r border-amber-900/40 p-4 shadow-2xl flex flex-col h-full overflow-y-auto text-[#ede9dc] z-10 animate-slide-up">
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-300">
              <Swords size={18} />
            </div>
            <div>
              <h2 className="font-serif font-bold text-amber-200 text-sm leading-tight">
                CRÔNICAS DO VAZIO
              </h2>
              <span className="text-[10px] text-zinc-400 font-mono tracking-widest uppercase">
                D&D 5e • Mobile Edition
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Campaign Act Card */}
        <div className="bg-gradient-to-r from-amber-950/40 to-zinc-900/60 border border-amber-500/30 rounded-2xl p-3 mb-4 shadow-inner">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] uppercase font-bold tracking-widest text-amber-400">
              Campanha Ativa
            </span>
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/40">
              Ato {campaignAct.act} de 3
            </span>
          </div>
          <h3 className="font-serif font-bold text-sm text-zinc-100 mb-0.5">
            {campaignAct.title}
          </h3>
          <p className="text-[11px] text-zinc-400 leading-snug mb-2">
            {campaignAct.subtitle}
          </p>

          {/* Objective teaser */}
          <div className="space-y-1 text-[11px] text-zinc-300 bg-black/40 p-2 rounded-xl border border-zinc-800 mb-2">
            {campaignAct.objectives.slice(0, 2).map((obj) => (
              <div key={obj.id} className="flex items-start gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1 shrink-0" />
                <span className="truncate">{obj.text}</span>
              </div>
            ))}
          </div>

          {canAdvanceAct && onAdvanceAct && (
            <button
              onClick={() => {
                onAdvanceAct();
                onClose();
              }}
              className="w-full gold-button text-xs py-1.5 justify-center mt-1 animate-pulse"
            >
              <span>Descer para o Próximo Ato</span>
              <ChevronRight size={14} />
            </button>
          )}
        </div>

        {/* Primary Navigation */}
        <div className="space-y-1 mb-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 px-2 mb-1">
            Navegação Principal
          </p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectView(item.id);
                  onClose();
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  active
                    ? 'bg-amber-500/20 text-amber-200 border border-amber-500/40 shadow-md'
                    : 'text-zinc-300 hover:bg-zinc-900/70 hover:text-white border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon size={16} className={active ? 'text-amber-400' : 'text-zinc-400'} />
                  <span>{item.label}</span>
                </div>
                <span className="text-[10px] font-mono text-zinc-500 bg-black/40 px-1.5 py-0.5 rounded border border-zinc-800">
                  {item.badge}
                </span>
              </button>
            );
          })}
        </div>

        {/* Procedural Dungeon Tools */}
        <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-3 mb-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-1">
              <Layers size={12} className="text-amber-400" />
              Masmorra Procedural
            </span>
            <span className="text-[10px] text-amber-300 font-mono">
              {dungeonSize}x{dungeonSize}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {([8, 12, 16] as const).map((sz) => (
              <button
                key={sz}
                disabled={busy}
                onClick={() => onChangeDungeonSize(sz)}
                className={`py-1 rounded-lg text-xs font-bold transition-all border ${
                  dungeonSize === sz
                    ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {sz === 8 ? '8x8 Tático' : sz === 12 ? '12x12 Médio' : '16x16 Amplo'}
              </button>
            ))}
          </div>

          <button
            disabled={busy}
            onClick={() => {
              onGenerateNewDungeon();
              onClose();
            }}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-amber-300 border border-zinc-700/80 rounded-xl text-xs font-semibold transition-colors"
          >
            <Sparkles size={13} className="text-amber-400" />
            <span>Gerar Nova Masmorra</span>
          </button>
        </div>

        {/* Strategic Quick Action Buttons */}
        <div className="space-y-1.5 mb-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 px-2 mb-1">
            Ferramentas Rápidas
          </p>

          <button
            onClick={() => {
              onOpenCharacterCreator();
              onClose();
            }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-950/40 to-amber-900/20 border border-amber-500/40 text-amber-200 text-xs font-bold transition-all"
          >
            <Plus size={15} className="text-amber-400" />
            <span>Criar Novo Herói (Wizard 4 Passos)</span>
          </button>

          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => {
                onOpenInventory();
                onClose();
              }}
              className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs font-semibold hover:border-zinc-700"
            >
              <Package size={14} className="text-amber-400" />
              <span>Mochila / Itens</span>
            </button>

            <button
              onClick={() => {
                onOpenQuests();
                onClose();
              }}
              className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs font-semibold hover:border-zinc-700"
            >
              <ScrollText size={14} className="text-cyan-400" />
              <span>Missões & Notas</span>
            </button>
          </div>

          <button
            onClick={() => {
              onOpenJournal();
              onClose();
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-amber-300 text-xs font-semibold hover:border-zinc-700"
          >
            <div className="flex items-center gap-2">
              <Flame size={14} className="text-amber-400" />
              <span>Crônica da Mestre IA (Groq)</span>
            </div>
            <span className="text-[10px] text-zinc-500">História</span>
          </button>

          {isOwner && (
            <div className="grid grid-cols-2 gap-1.5 pt-1">
              <button
                disabled={busy}
                onClick={() => {
                  onShortRest();
                  onClose();
                }}
                className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs"
              >
                <Coffee size={13} className="text-amber-300" />
                <span>Descanso Curto</span>
              </button>
              <button
                disabled={busy}
                onClick={() => {
                  onLongRest();
                  onClose();
                }}
                className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs"
              >
                <Moon size={13} className="text-purple-300" />
                <span>Descanso Longo</span>
              </button>
            </div>
          )}
        </div>

        {/* Room Switcher / Multiplayer */}
        <div className="mt-auto pt-3 border-t border-zinc-800/80">
          <button
            onClick={() => {
              onOpenRoomsDialog();
              onClose();
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-zinc-900/60 border border-zinc-800 text-zinc-300 text-xs font-semibold hover:text-white"
          >
            <div className="flex items-center gap-2">
              <Users size={14} className="text-amber-400" />
              <span>Minhas Mesas & Código</span>
            </div>
            <ChevronRight size={14} className="text-zinc-500" />
          </button>

          {onWipeAllData && (
            <button
              onClick={() => {
                onWipeAllData();
                onClose();
              }}
              className="w-full mt-2 flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-red-950/40 hover:bg-red-950/80 border border-red-700/60 text-red-300 text-xs font-bold transition-all"
            >
              <Trash2 size={13} className="text-red-400" />
              <span>Wipe: Resetar Aventura e Cache</span>
            </button>
          )}

          {/* Engine Status Tag */}
          <div className="flex items-center justify-between mt-3 text-[10px] text-zinc-500 px-1 font-mono">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Groq AI: Online
            </span>
            <span>SRD 5.2.1 Core</span>
          </div>
        </div>
      </div>
    </div>
  );
}
