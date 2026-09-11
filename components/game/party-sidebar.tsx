'use client';

import React, { useState } from 'react';
import {
  Shield,
  Heart,
  Sparkles,
  Package,
  Coffee,
  MessageSquare,
  Plus,
  Trash2,
  ChevronDown,
  User,
  Skull,
  Flame,
  Swords,
  Footprints,
  Eye,
  Users
} from 'lucide-react';
import { type Character, canLevelUp } from '@/lib/game-engine';

interface PartySidebarProps {
  party: Character[];
  activeHeroId: string;
  onSelectHero: (id: string) => void;
  onOpenCharacterSheet: (hero: Character) => void;
  onOpenInventory: () => void;
  onOpenCharacterCreator: () => void;
  onOpenLevelUp?: (hero: Character) => void;
  onShortRest: () => void;
  onWipeData: () => void;
  onSelectView?: (view: string) => void;
  busy?: boolean;
  currentUserId?: string;
  isMmoRoom?: boolean;
  onInteractPlayer?: (hero: Character) => void;
  onInviteToParty?: (hero: Character) => void;
  onLeaveParty?: () => void;
}

export function PartySidebar({
  party,
  activeHeroId,
  onSelectHero,
  onOpenCharacterSheet,
  onOpenInventory,
  onOpenCharacterCreator,
  onOpenLevelUp,
  onShortRest,
  onWipeData,
  onSelectView,
  busy,
  currentUserId,
  isMmoRoom,
  onInteractPlayer,
  onInviteToParty,
  onLeaveParty
}: PartySidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // MODO RECOLHIDO (Micro-strip minimalista de 52px que não sobrepõe o mapa)
  if (isCollapsed) {
    return (
      <aside className="w-13 sm:w-14 flex flex-col items-center py-2 bg-[#101410]/95 border border-zinc-700/60 rounded-2xl backdrop-blur-xl shrink-0 select-none shadow-2xl transition-all duration-300 gap-2">
        <button
          type="button"
          onClick={() => setIsCollapsed(false)}
          className="p-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-amber-400 border border-zinc-700 transition-colors shadow"
          title="Expandir Painel do Grupo"
        >
          <ChevronDown size={14} className="-rotate-90 text-amber-400" />
        </button>

        <div className="w-8 h-[1px] bg-zinc-800 my-0.5" />

        {/* Vertical Portrait Strip */}
        <div className="flex-1 flex flex-col items-center gap-2 overflow-y-auto scrollbar-none px-1">
          {party.length === 0 ? (
            <button
              type="button"
              onClick={onOpenCharacterCreator}
              className="w-9 h-9 rounded-full bg-amber-950/40 border border-dashed border-amber-400/60 flex items-center justify-center text-amber-300 hover:bg-amber-900/60 transition-all shadow animate-pulse"
              title="Criar Primeiro Aventureiro"
            >
              <Plus size={16} />
            </button>
          ) : (
            party.map((hero) => {
            const isActive = hero.id === activeHeroId;
            const isDead = hero.hp <= 0;
            const hpPct = Math.max(0, Math.min(100, (hero.hp / hero.maxHp) * 100));

            return (
              <div
                key={hero.id}
                onClick={() => onSelectHero(hero.id)}
                className={`relative group flex flex-col items-center cursor-pointer p-1 rounded-xl transition-all ${
                  isActive ? 'ring-2 ring-amber-400 bg-amber-950/40 shadow-lg' : 'hover:bg-zinc-900/80'
                }`}
                title={`${hero.name} (${hero.className} Lv${hero.level}) • ${hero.hp}/${hero.maxHp} PV`}
              >
                {/* Level badge */}
                <div className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-amber-600 border border-amber-300 text-black flex items-center justify-center text-[8px] font-black z-10 shadow">
                  {hero.level}
                </div>

                {/* Avatar */}
                <div
                  className={`w-9 h-9 rounded-full overflow-hidden flex items-center justify-center border-2 ${
                    isActive ? 'border-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]' : 'border-zinc-700'
                  } ${isDead ? 'bg-zinc-900 grayscale opacity-75' : 'bg-gradient-to-b from-stone-800 to-zinc-950'}`}
                >
                  <span className="font-serif font-black text-sm text-amber-100">
                    {isDead ? <Skull size={15} className="text-red-500" /> : hero.name.charAt(0)}
                  </span>
                </div>

                {/* Mini HP bar beneath avatar */}
                <div className="w-8 h-1 bg-zinc-900 rounded-full overflow-hidden mt-1 border border-zinc-800">
                  <div
                    style={{ width: `${hpPct}%` }}
                    className={`h-full ${hpPct < 30 ? 'bg-red-500' : 'bg-emerald-400'}`}
                  />
                </div>

                {/* AC badge */}
                <span className="text-[8px] font-mono text-amber-300/80 mt-0.5 font-bold">
                  {hero.ac} CA
                </span>
              </div>
            );
          })
        )}
        </div>

        <div className="w-8 h-[1px] bg-zinc-800 my-0.5" />

        {/* Quick action icons */}
        <button
          onClick={onOpenCharacterCreator}
          className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-amber-300 border border-zinc-700/80 transition-colors"
          title="Criar Novo Personagem"
        >
          <Plus size={14} />
        </button>
        <button
          onClick={onShortRest}
          className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-emerald-300 border border-zinc-700/80 transition-colors"
          title="Descanso Curto (1h)"
        >
          <Coffee size={14} />
        </button>
      </aside>
    );
  }

  const myHero = isMmoRoom ? party.find((h) => currentUserId && h.owner === currentUserId) : null;
  const isSolo = isMmoRoom ? !myHero?.partyId : false;
  const myPartyHeroes = isMmoRoom
    ? party.filter(
        (h) => (currentUserId && h.owner === currentUserId) || (myHero?.partyId && h.partyId && h.partyId === myHero.partyId)
      )
    : party;
  const otherWorldHeroes = isMmoRoom
    ? party.filter((h) => !myPartyHeroes.some((mph) => mph.id === h.id))
    : [];

  const renderHeroCard = (hero: Character, isOtherWorld = false) => {
    const isActive = hero.id === activeHeroId;
    const isDead = hero.hp <= 0;
    const hpPct = Math.max(0, Math.min(100, (hero.hp / hero.maxHp) * 100));

    // Resource calculation (spell slots or stamina)
    const totalSlots = hero.slots?.reduce((a, b) => a + b, 0) || 4;
    const usedSlots = hero.usedSlots?.reduce((a, b) => a + b, 0) || 0;
    const availableSlots = Math.max(0, totalSlots - usedSlots);
    const manaPct = Math.min(100, (availableSlots / Math.max(1, totalSlots)) * 100);

    return (
      <div
        key={hero.id}
        onClick={() => {
          if (isOtherWorld && onInteractPlayer) {
            onInteractPlayer(hero);
          } else {
            onSelectHero(hero.id);
          }
        }}
        className={`crpg-hero-card rounded-xl p-2 cursor-pointer transition-all ${
          isActive ? 'active-hero ring-1 ring-amber-400/80' : 'border-zinc-800 hover:border-zinc-700'
        } ${isOtherWorld ? 'bg-zinc-950/60 hover:bg-zinc-900/70 border-emerald-900/40' : ''}`}
      >
        <div className="flex items-center gap-2">
          {/* Portrait + Badges */}
          <div className="relative shrink-0">
            {/* Level Badge at Top-Left */}
            <div className="absolute -top-1.5 -left-1.5 w-4 h-4 rounded-full bg-amber-600 border border-amber-300 text-black flex items-center justify-center text-[9px] font-black z-10 shadow">
              {hero.level}
            </div>

            {/* Level Up Indicator Badge */}
            {canLevelUp(hero) && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenLevelUp?.(hero);
                }}
                className="absolute -top-2 -right-1.5 w-4 h-4 rounded-full bg-yellow-400 border border-amber-200 text-black flex items-center justify-center text-[10px] font-black z-20 shadow animate-bounce cursor-pointer"
                title="Subir de Nível disponível!"
              >
                🌟
              </div>
            )}

            {/* Circular Avatar */}
            <div
              className={`w-10 h-10 rounded-full overflow-hidden flex items-center justify-center border-2 ${
                isActive
                  ? 'border-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.5)]'
                  : isOtherWorld
                  ? 'border-emerald-600/70'
                  : 'border-zinc-700/80'
              } ${
                isDead
                  ? 'bg-zinc-900 grayscale opacity-75'
                  : 'bg-gradient-to-b from-stone-800 to-zinc-950'
              }`}
            >
              <span className="font-serif font-black text-base text-amber-100">
                {isDead ? <Skull size={18} className="text-red-500" /> : hero.name.charAt(0)}
              </span>
            </div>

            {/* Armor Class Badge at Bottom of Avatar */}
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-0.5 px-1 rounded-sm bg-zinc-950/95 border border-zinc-700 text-[8px] font-mono font-bold text-amber-300 shadow">
              <Shield size={8} className="text-amber-400" />
              <span>{hero.ac}</span>
            </div>
          </div>

          {/* Info & Bars */}
          <div className="flex-1 min-w-0">
            {/* Name & Class */}
            <div className="flex items-center justify-between gap-1 mb-0.5">
              <div className="flex items-center gap-1.5 truncate">
                <strong className="text-xs font-semibold text-zinc-100 truncate block">
                  {hero.name}
                </strong>
                {currentUserId && hero.owner === currentUserId ? (
                  <span className="text-[8px] bg-amber-500/20 text-amber-300 px-1 py-0.2 rounded border border-amber-500/40 font-mono">
                    Você
                  </span>
                ) : isMmoRoom && hero.partyId && myHero?.partyId && hero.partyId === myHero.partyId ? (
                  <span className="text-[8px] bg-sky-500/20 text-sky-300 px-1 py-0.2 rounded border border-sky-500/40 font-mono">
                    Grupo
                  </span>
                ) : isMmoRoom ? (
                  <span className="text-[8px] bg-emerald-500/20 text-emerald-300 px-1 py-0.2 rounded border border-emerald-500/40 font-mono">
                    Solo
                  </span>
                ) : null}
              </div>

              {isOtherWorld ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onInviteToParty) onInviteToParty(hero);
                    else if (onInteractPlayer) onInteractPlayer(hero);
                  }}
                  className="text-[9px] font-mono px-2 py-0.5 rounded-lg bg-emerald-950/90 hover:bg-emerald-800 text-emerald-300 border border-emerald-600/60 flex items-center gap-0.5 transition-all shadow hover:scale-105"
                  title={`Convidar ${hero.name} para seu grupo`}
                >
                  <Plus size={10} />
                  <span>Convidar</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenCharacterSheet(hero);
                  }}
                  className="text-[10px] text-zinc-400 hover:text-amber-300 transition-colors p-0.5"
                  title="Ver Ficha Completa"
                >
                  <Eye size={12} />
                </button>
              )}
            </div>

            {/* Subtitle / Class */}
            <span className="text-[9px] text-zinc-400 truncate block -mt-0.5 mb-1 font-sans">
              {hero.className} • {hero.species}
            </span>

            {/* HP Bar */}
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <Heart size={10} className="text-emerald-400 shrink-0" />
                <div className="flex-1 h-1.5 bg-slate-900/90 rounded-full overflow-hidden border border-slate-800/80">
                  <div
                    className={`h-full transition-all duration-300 ${
                      isDead
                        ? 'crpg-hp-depleted'
                        : hpPct > 50
                        ? 'crpg-hp-bar'
                        : hpPct > 20
                        ? 'bg-amber-400'
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${hpPct}%` }}
                  />
                </div>
                <span className="text-[10px] font-mono font-bold text-slate-300 shrink-0 w-8 text-right">
                  {hero.hp}/{hero.maxHp}
                </span>
              </div>

              {/* Resource / Mana Bar */}
              <div className="flex items-center gap-1.5">
                <Sparkles size={10} className="text-purple-400 shrink-0" />
                <div className="flex-1 h-1.5 bg-slate-900/90 rounded-full overflow-hidden border border-slate-800/80">
                  <div
                    className="h-full crpg-mana-bar transition-all duration-300"
                    style={{ width: `${manaPct}%` }}
                  />
                </div>
                <span className="text-[10px] font-mono font-bold text-purple-300 shrink-0 w-8 text-right">
                  {availableSlots}/{totalSlots}
                </span>
              </div>
            </div>

            {/* Downed / Death Timer Pill */}
            {isDead && (
              <div className="mt-1.5 px-2 py-0.5 rounded-md bg-red-950/90 border border-red-700/60 flex items-center justify-between text-[10px] text-red-200">
                <span className="flex items-center gap-1">
                  <Skull size={10} className="text-red-400" />
                  Inconsciente
                </span>
                <span className="font-mono font-bold text-red-300">18:29</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // MODO EXPANDIDO (Cards detalhados)
  return (
    <aside className="w-64 sm:w-72 h-full max-h-full flex flex-col bg-[#111612]/95 border border-zinc-700/60 rounded-2xl backdrop-blur-xl shrink-0 select-none shadow-2xl overflow-hidden transition-all duration-300">
      {/* ═══ TOP BRANDING HEADER ═══ */}
      <div className="p-2.5 sm:p-3 pb-2 border-b border-zinc-800/80 flex flex-col items-start gap-1">
        <div className="flex items-center justify-between w-full">
          <div className="flex flex-col">
            <h1 className="crpg-title-emboss text-base sm:text-lg tracking-wider leading-none m-0">
              DUNGEONS
            </h1>
            <span className="crpg-title-emboss text-xs sm:text-sm tracking-[0.2em] text-amber-200/90 leading-tight">
              & MASTERS
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-700 text-black shadow-md border border-amber-400/60">
              5e D&D
            </span>
            <button
              type="button"
              onClick={() => setIsCollapsed(true)}
              className="p-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-amber-300 border border-zinc-700/80 transition-colors ml-1"
              title="Recolher painel (modo compacto)"
            >
              <ChevronDown size={14} className="rotate-90 text-zinc-400" />
            </button>
          </div>
        </div>
      </div>

      {/* ═══ HEROES / PARTY STACK ═══ */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-2 scrollbar-none">
        {party.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-4 text-center rounded-2xl border-2 border-dashed border-amber-600/40 bg-gradient-to-b from-amber-950/30 to-zinc-950/80 text-zinc-300 my-2 shadow-inner">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-2.5 shadow">
              <User size={24} className="text-amber-400" />
            </div>
            <p className="text-xs font-serif font-black text-amber-200 uppercase tracking-wider">
              Grupo Vazio
            </p>
            <p className="text-[11px] text-zinc-400 mt-1 mb-3 leading-relaxed">
              Nenhum aventureiro ativo. Crie seu primeiro herói para explorar o mundo de D&D 5e!
            </p>
            <button
              type="button"
              onClick={onOpenCharacterCreator}
              disabled={busy}
              className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 hover:from-amber-500 hover:to-yellow-400 text-black font-black text-xs uppercase tracking-wider shadow-[0_0_15px_rgba(245,158,11,0.5)] border border-yellow-200 flex items-center justify-center gap-1.5 transition-all active:scale-95 animate-pulse"
            >
              <Plus size={15} className="stroke-[3]" />
              <span>Criar Aventureiro</span>
            </button>
          </div>
        ) : isMmoRoom ? (
          <div className="space-y-3">
            {/* Section 1: My Party / Solo Hero */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-mono uppercase font-bold text-amber-300/90 tracking-wider flex items-center gap-1">
                  <Shield size={11} className="text-amber-400" />
                  {isSolo ? 'Meu Herói (Solo)' : 'Meu Grupo (Party)'}
                </span>
                {!isSolo && onLeaveParty && (
                  <button
                    type="button"
                    onClick={onLeaveParty}
                    className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-red-950/80 hover:bg-red-900 border border-red-800/80 text-red-300 transition-colors"
                    title="Sair do Grupo"
                  >
                    Sair do Grupo
                  </button>
                )}
              </div>
              {myPartyHeroes.map((hero) => renderHeroCard(hero, false))}
            </div>

            {/* Section 2: Other online MMO adventurers */}
            {otherWorldHeroes.length > 0 && (
              <div className="pt-2 border-t border-zinc-800/80 space-y-1.5">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-mono uppercase font-bold text-emerald-400/90 tracking-wider flex items-center gap-1">
                    <Users size={11} className="text-emerald-400" />
                    Aventureiros no Mundo ({otherWorldHeroes.length})
                  </span>
                </div>
                {otherWorldHeroes.map((hero) => renderHeroCard(hero, true))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-1.5">
            {party.map((hero) => renderHeroCard(hero, false))}
          </div>
        )}

        {/* Add Hero Button (hidden if player already has a character in MMO world) */}
        {(!isMmoRoom || party.filter((h) => currentUserId && h.owner === currentUserId).length === 0) && (
          <button
            type="button"
            onClick={onOpenCharacterCreator}
            disabled={busy}
            className="w-full py-1.5 px-2 rounded-xl border border-dashed border-zinc-700/80 hover:border-amber-400/70 bg-zinc-900/40 hover:bg-amber-950/20 text-zinc-300 hover:text-amber-200 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all"
          >
            <Plus size={13} className="text-amber-400" />
            <span>Novo Herói (Wizard 5e)</span>
          </button>
        )}
      </div>

      {/* ═══ BOTTOM UTILITIES & PLAYER PROFILE ═══ */}
      <div className="p-2.5 border-t border-zinc-800/80 bg-[#0b0e0b]/95 space-y-1.5">
        {/* Inventory and Quick Actions */}
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={onOpenInventory}
            className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700/70 text-zinc-200 text-xs font-semibold transition-all group"
          >
            <span className="flex items-center gap-1.5">
              <Package size={13} className="text-amber-400 group-hover:scale-110 transition-transform" />
              <span>Inventário</span>
            </span>
            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-amber-500/20 border border-amber-500/40 text-amber-300">
              50
            </span>
          </button>

          <button
            type="button"
            onClick={onShortRest}
            disabled={busy}
            className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700/70 text-zinc-200 text-xs font-semibold transition-all"
            title="Descanso Curto (Gasta dados de vida)"
          >
            <Coffee size={13} className="text-amber-400" />
            <span>Descanso</span>
          </button>
        </div>

        {/* Legal / Status Line */}
        <div className="text-center text-[9px] text-zinc-500 font-mono tracking-wider">
          D&D 5e SRD • Sistema Valdoria
        </div>

        {/* User Profile Pill at Bottom */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-slate-900/70 hover:bg-slate-800/80 border border-slate-800 text-slate-200 text-xs transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-indigo-700 text-white flex items-center justify-center text-[9px] font-black">
                MA
              </div>
              <span className="font-semibold text-slate-200 text-xs">MadiFinley</span>
            </div>
            <ChevronDown size={14} className="text-slate-400" />
          </button>

          {/* Profile Dropdown */}
          {showProfileMenu && (
            <div className="absolute bottom-full left-0 right-0 mb-1 p-1 bg-slate-950 border border-blue-900/60 rounded-xl shadow-2xl space-y-0.5 z-30 animate-fade-in">
              <button
                type="button"
                onClick={() => {
                  setShowProfileMenu(false);
                  onOpenCharacterCreator();
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-blue-950/60 flex items-center gap-2"
              >
                <Plus size={13} className="text-cyan-400" />
                <span>Novo Personagem</span>
              </button>
              {onSelectView && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileMenu(false);
                      onSelectView('Personagens');
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-blue-950/60 flex items-center gap-2"
                  >
                    <User size={13} className="text-blue-400" />
                    <span>Fichas dos Personagens</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileMenu(false);
                      onSelectView('Atlas');
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-blue-950/60 flex items-center gap-2"
                  >
                    <Sparkles size={13} className="text-amber-400" />
                    <span>Atlas Mundial</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileMenu(false);
                      onSelectView('Compêndio');
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-blue-950/60 flex items-center gap-2"
                  >
                    <Flame size={13} className="text-indigo-400" />
                    <span>Compêndio de Regras</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileMenu(false);
                      onSelectView('Mestre de jogo');
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-blue-950/60 flex items-center gap-2"
                  >
                    <Flame size={13} className="text-purple-400" />
                    <span>Configurações da Mestre</span>
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => {
                  setShowProfileMenu(false);
                  onWipeData();
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-red-400 hover:bg-red-950/60 flex items-center gap-2"
              >
                <Trash2 size={13} className="text-red-400" />
                <span>Reiniciar Mesa (Wipe)</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
