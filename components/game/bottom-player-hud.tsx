'use client';

import React, { useState, useEffect } from 'react';
import {
  Shield,
  Heart,
  Footprints,
  Swords,
  Sparkles,
  Zap,
  Package,
  Clock,
  ChevronUp,
  ChevronDown,
  Crosshair,
  Compass,
  AlertTriangle,
  Flame,
  Wind,
  Award,
  CheckCircle2,
  Dices,
  Coffee
} from 'lucide-react';
import {
  Character,
  SPELLS_CATALOG,
  TACTICAL_ACTIONS,
  ITEMS_CATALOG,
  mod,
  prof,
  signed
} from '@/lib/game-engine';

export type ActionSelection = {
  id: string;
  name: string;
  category: 'attack' | 'spell' | 'skill' | 'item' | 'action';
  rangeSquares: number;
  damageFormula?: string;
  healFormula?: string;
  aoeRadius?: number;
  spellLevel?: number;
  description: string;
};

// All 18 official D&D 5e skills with their key attribute index (0:FOR, 1:DES, 2:CON, 3:INT, 4:SAB, 5:CAR)
const ALL_5E_SKILLS: { name: string; attrIdx: number; attrName: string }[] = [
  { name: 'Acrobacia', attrIdx: 1, attrName: 'DES' },
  { name: 'Adestrar Animais', attrIdx: 4, attrName: 'SAB' },
  { name: 'Arcanismo', attrIdx: 3, attrName: 'INT' },
  { name: 'Atletismo', attrIdx: 0, attrName: 'FOR' },
  { name: 'Atuação', attrIdx: 5, attrName: 'CAR' },
  { name: 'Enganação', attrIdx: 5, attrName: 'CAR' },
  { name: 'Furtividade', attrIdx: 1, attrName: 'DES' },
  { name: 'História', attrIdx: 3, attrName: 'INT' },
  { name: 'Intimidação', attrIdx: 5, attrName: 'CAR' },
  { name: 'Intuição', attrIdx: 4, attrName: 'SAB' },
  { name: 'Investigação', attrIdx: 3, attrName: 'INT' },
  { name: 'Medicina', attrIdx: 4, attrName: 'SAB' },
  { name: 'Natureza', attrIdx: 3, attrName: 'INT' },
  { name: 'Percepção', attrIdx: 4, attrName: 'SAB' },
  { name: 'Persuasão', attrIdx: 5, attrName: 'CAR' },
  { name: 'Prestidigitação', attrIdx: 1, attrName: 'DES' },
  { name: 'Religião', attrIdx: 3, attrName: 'INT' },
  { name: 'Sobrevivência', attrIdx: 4, attrName: 'SAB' }
];

interface BottomPlayerHudProps {
  activeHero: Character;
  party: Character[];
  onSelectHero: (id: string) => void;
  onActionSelect: (action: ActionSelection) => void;
  onOpenInventory: () => void;
  onOpenCharacterSheet: () => void;
  onEndTurn?: () => void;
  onUseItem?: (itemId: string, targetId?: string) => void;
  isCombat: boolean;
  isHeroTurn: boolean;
  actionUsed?: boolean;
  busy?: boolean;
}

export function BottomPlayerHud({
  activeHero,
  party,
  onSelectHero,
  onActionSelect,
  onOpenInventory,
  onOpenCharacterSheet,
  onEndTurn,
  onUseItem,
  isCombat,
  isHeroTurn,
  actionUsed,
  busy
}: BottomPlayerHudProps) {
  const [activeTab, setActiveTab] = useState<'attacks' | 'spells' | 'skills' | 'items' | 'tactics'>('attacks');
  const [isMinimized, setIsMinimized] = useState(false);
  const [tooltip, setTooltip] = useState<ActionSelection | null>(null);

  // Dynamic HP bar with deferred damage animation
  const [delayedHp, setDelayedHp] = useState(activeHero.hp);
  useEffect(() => {
    const timer = setTimeout(() => {
      setDelayedHp(activeHero.hp);
    }, 400);
    return () => clearTimeout(timer);
  }, [activeHero.hp]);

  const maxHp = Math.max(1, activeHero.maxHp);
  const currentHp = Math.max(0, activeHero.hp);
  const hpPct = Math.min(100, Math.max(0, (currentHp / maxHp) * 100));
  const delayedHpPct = Math.min(100, Math.max(0, (delayedHp / maxHp) * 100));

  // Determine available spells
  const heroSpells = SPELLS_CATALOG.filter((s) => {
    if (s.level === 0) return true;
    const slotTotal = activeHero.slots[s.level - 1] || 0;
    return slotTotal > 0 || activeHero.spells.toLowerCase().includes(s.name.toLowerCase());
  });

  return (
    <div className="w-full flex flex-col items-center gap-1 select-none z-30 shrink-0 pointer-events-auto">
      {/* Tooltip Overlay */}
      {tooltip && (
        <div className="fixed bottom-36 sm:bottom-44 bg-zinc-950/95 border border-amber-500/60 rounded-xl p-3 shadow-2xl backdrop-blur-md max-w-sm pointer-events-none z-50 animate-fade-in text-left">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-1 mb-1.5">
            <span className="font-bold text-amber-300 text-sm">{tooltip.name}</span>
            <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-mono">
              {tooltip.category === 'attack'
                ? 'Ataque de Arma'
                : tooltip.category === 'spell'
                ? `Círculo ${tooltip.spellLevel || 0}`
                : tooltip.category === 'skill'
                ? 'Teste D&D 5e'
                : tooltip.category}
            </span>
          </div>
          <p className="text-xs text-zinc-300 leading-relaxed">{tooltip.description}</p>
          <div className="flex items-center gap-3 mt-2 text-[11px] font-mono text-zinc-400 border-t border-zinc-800/80 pt-1">
            {tooltip.damageFormula && (
              <span className="text-red-400 font-bold">Dano: {tooltip.damageFormula}</span>
            )}
            {tooltip.healFormula && (
              <span className="text-emerald-400 font-bold">Cura: {tooltip.healFormula}</span>
            )}
            <span>Alcance: {tooltip.rangeSquares * 1.5}m</span>
          </div>
        </div>
      )}

      {/* Main Wide CRPG Console Container */}
      <div className="w-full max-w-6xl mx-auto bg-[#0a0f0a]/95 border-2 border-[#384333]/90 rounded-2xl shadow-[0_-8px_40px_rgba(0,0,0,0.85)] backdrop-blur-2xl flex flex-col overflow-hidden transition-all duration-300">
        {/* ═══ TIER 1: HERO VITALS & TOP DOCK HEADER (~42px) ═══ */}
        <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-[#121812] border-b border-[#2a3528]">
          {/* Active Hero Portrait & Vitals */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Avatar Button */}
            <div
              onClick={onOpenCharacterSheet}
              className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-amber-600 via-amber-900 to-zinc-950 border-2 border-amber-400/80 shadow-md flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-transform shrink-0"
              title="Abrir Ficha de Personagem Completa"
            >
              <span className="font-serif font-black text-amber-200 text-lg">
                {activeHero.name[0]}
              </span>
              <div className="absolute -bottom-1 -right-1 bg-zinc-950 border border-amber-400/80 rounded-full px-1 text-[9px] font-black text-amber-300 leading-tight shadow">
                {activeHero.level}
              </div>
            </div>

            {/* Name, Class & Large HP Bar */}
            <div className="flex-1 min-w-0 max-w-sm flex flex-col justify-center">
              <div className="flex items-center justify-between gap-1 leading-tight mb-1">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="font-bold text-zinc-100 text-xs sm:text-sm truncate">
                    {activeHero.name}
                  </span>
                  <span className="text-[11px] text-amber-400/90 hidden sm:inline font-serif">
                    • {activeHero.species} {activeHero.className}
                  </span>
                </div>

                {/* Numeric HP */}
                <div className="flex items-center gap-1 text-xs font-mono font-bold shrink-0">
                  <Heart size={12} className="text-emerald-400" />
                  <span className={currentHp <= maxHp * 0.3 ? 'text-red-400' : 'text-emerald-300'}>
                    {currentHp}
                  </span>
                  <span className="text-zinc-600">/</span>
                  <span className="text-zinc-300">{maxHp} PV</span>
                </div>
              </div>

              {/* Dynamic Health Bar */}
              <div className="relative w-full h-2 sm:h-2.5 bg-zinc-900 rounded-full overflow-hidden border border-emerald-950/80 shadow-inner">
                <div
                  style={{ width: `${delayedHpPct}%` }}
                  className="absolute inset-y-0 left-0 bg-emerald-200/60 transition-all duration-700 ease-out"
                />
                <div
                  style={{ width: `${hpPct}%` }}
                  className={`absolute inset-y-0 left-0 transition-all duration-300 ease-out ${
                    hpPct < 30
                      ? 'bg-gradient-to-r from-red-600 via-red-500 to-amber-500'
                      : 'bg-gradient-to-r from-emerald-600 via-green-500 to-teal-400'
                  }`}
                />
              </div>
            </div>

            {/* Badges: AC, Speed, Initiative & Spell Slots */}
            <div className="hidden md:flex items-center gap-2 text-xs text-zinc-300 shrink-0">
              <span className="flex items-center gap-1 bg-zinc-900/95 px-2 py-0.5 rounded-lg border border-zinc-700/80 shadow-sm" title="Classe de Armadura">
                <Shield size={12} className="text-amber-400" />
                <span className="font-bold font-mono">{activeHero.ac} CA</span>
              </span>
              <span className="flex items-center gap-1 bg-zinc-900/95 px-2 py-0.5 rounded-lg border border-zinc-700/80 shadow-sm" title="Deslocamento">
                <Footprints size={12} className="text-cyan-400" />
                <span className="font-bold font-mono">{activeHero.speed}m</span>
              </span>
              <span className="flex items-center gap-1 bg-zinc-900/95 px-2 py-0.5 rounded-lg border border-zinc-700/80 shadow-sm" title="Iniciativa (Destreza)">
                <Clock size={12} className="text-purple-400" />
                <span className="font-bold font-mono">{signed(mod(activeHero.stats[1]))}</span>
              </span>

              {/* Spell Slots Indicators */}
              {activeHero.slots.some((s) => s > 0) && (
                <div className="flex items-center gap-1.5 bg-purple-950/40 border border-purple-800/60 px-2 py-0.5 rounded-lg shadow-sm">
                  <Sparkles size={12} className="text-purple-400" />
                  <div className="flex items-center gap-1">
                    {activeHero.slots.map((total, lvl) => {
                      if (total === 0) return null;
                      const used = activeHero.usedSlots[lvl] || 0;
                      const remaining = Math.max(0, total - used);
                      return (
                        <div key={lvl} className="flex items-center gap-0.5" title={`Espaços Círculo ${lvl + 1}: ${remaining}/${total}`}>
                          <span className="text-[9px] text-purple-300 font-mono font-bold mr-0.5">C{lvl + 1}:</span>
                          {Array.from({ length: total }).map((_, i) => (
                            <span
                              key={i}
                              className={`w-2 h-2 rounded-full transition-all ${
                                i < remaining ? 'bg-purple-400 shadow-[0_0_5px_rgba(192,132,252,0.9)]' : 'bg-zinc-800 border border-zinc-700'
                              }`}
                            />
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Party Quick Switcher, Inventory & Minimize Toggle */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Party Mini Avatars */}
            <div className="flex items-center gap-1">
              {party.map((hero) => {
                const isSelected = hero.id === activeHero.id;
                return (
                  <button
                    key={hero.id}
                    onClick={() => onSelectHero(hero.id)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-xl border transition-all ${
                      isSelected
                        ? 'border-amber-400 bg-amber-500/20 shadow-[0_0_10px_rgba(251,191,36,0.3)]'
                        : 'border-zinc-800 bg-zinc-900/70 opacity-70 hover:opacity-100 hover:border-zinc-600'
                    }`}
                    title={`${hero.name} (${hero.hp}/${hero.maxHp} PV)`}
                  >
                    <span className="font-serif font-black text-xs text-amber-200">
                      {hero.name[0]}
                    </span>
                    <span className="text-[11px] font-bold text-zinc-300 hidden lg:inline">
                      {hero.name.split(' ')[0]}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={onOpenInventory}
              className="p-1 px-2.5 bg-zinc-900 hover:bg-zinc-800 text-amber-300 border border-zinc-700 rounded-xl flex items-center gap-1.5 text-xs font-semibold shadow transition-colors"
              title="Mochila e Equipamentos"
            >
              <Package size={14} />
              <span className="hidden sm:inline">Mochila</span>
            </button>

            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1.5 px-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-amber-300 border border-zinc-700 rounded-xl flex items-center gap-1 text-xs font-semibold shadow transition-colors"
              title={isMinimized ? 'Expandir console de ações' : 'Minimizar para visão desobstruída do tabuleiro'}
            >
              {isMinimized ? <ChevronUp size={16} className="text-amber-400" /> : <ChevronDown size={16} />}
              <span className="text-[10px] hidden sm:inline">{isMinimized ? 'Expandir' : 'Minimizar'}</span>
            </button>
          </div>
        </div>

        {/* ═══ TIER 2: EXPANDED ACTION CONSOLE (GRID DE OPÇÕES COMPLETAS) ═══ */}
        {!isMinimized && (
          <div className="flex flex-col p-2.5 gap-2 bg-[#0d120d]">
            {/* Action Category Navigation Ribbon */}
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-1.5 gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { id: 'attacks', label: 'Ataques & Armas', icon: Swords, count: 3 },
                  { id: 'spells', label: 'Magias & Truques', icon: Sparkles, count: heroSpells.length },
                  { id: 'skills', label: 'Perícias D&D 5e', icon: Compass, count: ALL_5E_SKILLS.length },
                  { id: 'items', label: 'Poções & Consumíveis', icon: Package, count: 3 },
                  { id: 'tactics', label: 'Ações Táticas 5e', icon: Wind, count: TACTICAL_ACTIONS.length }
                ].map(({ id, label, icon: Icon, count }) => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id as any)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all shadow-sm ${
                      activeTab === id
                        ? 'bg-amber-500/25 border-2 border-amber-400 text-amber-200 shadow-[0_0_12px_rgba(251,191,36,0.3)]'
                        : 'bg-zinc-900/80 border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
                    }`}
                  >
                    <Icon size={13} className={activeTab === id ? 'text-amber-400' : 'text-zinc-400'} />
                    <span>{label}</span>
                    <span className="text-[10px] bg-black/50 px-1.5 py-0.2 rounded-full font-mono text-zinc-400">
                      {count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Action Economy Status & Turn Controls */}
              <div className="flex items-center gap-2">
                {isCombat ? (
                  <>
                    {actionUsed ? (
                      <span className="text-xs font-bold text-amber-300/90 bg-amber-950/60 border border-amber-700/60 px-2 py-0.5 rounded-lg flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-400" /> Ação Utilizada
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-emerald-300 bg-emerald-950/70 border border-emerald-500/80 px-2 py-0.5 rounded-lg flex items-center gap-1.5 animate-pulse">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,1)]" /> 1 Ação Disponível
                      </span>
                    )}

                    {isHeroTurn && onEndTurn && (
                      <button
                        disabled={busy}
                        onClick={onEndTurn}
                        className="bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-black font-black px-3.5 py-1 rounded-xl text-xs flex items-center gap-1.5 shadow-[0_0_15px_rgba(245,158,11,0.5)] active:scale-95 transition-all animate-pulse shrink-0"
                        title="Encerrar seu turno e passar a vez ao próximo combatente"
                      >
                        <Swords size={13} />
                        <span>FIM DO TURNO</span>
                      </button>
                    )}
                  </>
                ) : (
                  <span className="text-xs text-zinc-400 font-mono hidden sm:inline">
                    🌿 Modo de Exploração Livre
                  </span>
                )}
              </div>
            </div>

            {/* Action Cards Grid Area — Modular Fixed Height for Games (No Layout Shifts) */}
            <div className="w-full h-52 sm:h-48 overflow-y-auto pr-1.5 scrollbar-thin scrollbar-thumb-zinc-700">
              {/* ═══ TAB 1: ATAQUES & ARMAS ═══ */}
              {activeTab === 'attacks' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                  {/* Weapon Attack */}
                  <div
                    onClick={() =>
                      onActionSelect({
                        id: 'attack-weapon',
                        name: `Atacar com ${activeHero.weapon}`,
                        category: 'attack',
                        rangeSquares: activeHero.weapon.includes('Arco') ? 16 : 1,
                        damageFormula: activeHero.damage,
                        description: `Desfere um ataque preciso com ${activeHero.weapon}.`
                      })
                    }
                    className="p-2.5 rounded-xl bg-gradient-to-br from-zinc-900 to-zinc-950 hover:from-amber-950/40 hover:to-zinc-900 border border-zinc-700/80 hover:border-amber-400/90 cursor-pointer shadow transition-all hover:scale-102 flex flex-col justify-between group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <Swords size={15} className="text-amber-400" />
                        <strong className="text-zinc-100 text-xs font-bold">{activeHero.weapon}</strong>
                      </div>
                      <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 rounded">
                        {signed(activeHero.attack)}
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-400 leading-tight mb-2">
                      Ataque com arma principal. Adiciona bônus de proficiência e atributo.
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-mono border-t border-zinc-800/80 pt-1">
                      <span className="text-red-400 font-bold">{activeHero.damage} Dano</span>
                      <span className="text-zinc-400">{activeHero.weapon.includes('Arco') ? '24m (Distância)' : '1.5m (C.a.C)'}</span>
                    </div>
                  </div>

                  {/* Unarmed Strike */}
                  <div
                    onClick={() =>
                      onActionSelect({
                        id: 'attack-unarmed',
                        name: 'Golpe Desarmado',
                        category: 'attack',
                        rangeSquares: 1,
                        damageFormula: `1${signed(mod(activeHero.stats[0]))}`,
                        description: 'Soco, chute ou cotovelada no combate corpo a corpo.'
                      })
                    }
                    className="p-2.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-855 border border-zinc-800 hover:border-zinc-600 cursor-pointer shadow transition-all hover:scale-102 flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <Zap size={14} className="text-zinc-400" />
                        <strong className="text-zinc-200 text-xs font-bold">Golpe Desarmado</strong>
                      </div>
                      <span className="text-[10px] font-mono font-bold bg-zinc-800 text-zinc-300 px-1.5 rounded">
                        {signed(prof(activeHero.level) + mod(activeHero.stats[0]))}
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-400 leading-tight mb-2">
                      Ataque físico básico. 1 + mod. de Força de dano de contusão.
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-mono border-t border-zinc-800/80 pt-1">
                      <span className="text-zinc-300 font-bold">1{signed(mod(activeHero.stats[0]))} Dano</span>
                      <span className="text-zinc-400">1.5m</span>
                    </div>
                  </div>

                  {/* Secondary Attack / Dagger */}
                  <div
                    onClick={() =>
                      onActionSelect({
                        id: 'attack-dagger',
                        name: 'Adaga Ágil',
                        category: 'attack',
                        rangeSquares: 4,
                        damageFormula: `1d4${signed(mod(activeHero.stats[1]))}`,
                        description: 'Ataque veloz com lâmina secundária ou arremesso.'
                      })
                    }
                    className="p-2.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-855 border border-zinc-800 hover:border-zinc-600 cursor-pointer shadow transition-all hover:scale-102 flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <Crosshair size={14} className="text-amber-400/80" />
                        <strong className="text-zinc-200 text-xs font-bold">Adaga Curta</strong>
                      </div>
                      <span className="text-[10px] font-mono font-bold bg-zinc-800 text-zinc-300 px-1.5 rounded">
                        {signed(prof(activeHero.level) + mod(activeHero.stats[1]))}
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-400 leading-tight mb-2">
                      Lâmina leve e acuidade. Pode ser usada corpo a corpo ou arremessada.
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-mono border-t border-zinc-800/80 pt-1">
                      <span className="text-red-400 font-bold">1d4{signed(mod(activeHero.stats[1]))} Dano</span>
                      <span className="text-zinc-400">6m (Arremesso)</span>
                    </div>
                  </div>
                </div>
              )}

              {/* ═══ TAB 2: MAGIAS & TRUQUES ═══ */}
              {activeTab === 'spells' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                  {heroSpells.map((s) => {
                    const isCantrip = s.level === 0;
                    const availableSlots = isCantrip ? 99 : Math.max(0, (activeHero.slots[s.level - 1] || 0) - (activeHero.usedSlots[s.level - 1] || 0));
                    const isDepleted = !isCantrip && availableSlots <= 0;

                    return (
                      <div
                        key={s.id}
                        onClick={() => {
                          if (isDepleted) return;
                          onActionSelect({
                            id: s.id,
                            name: s.name,
                            category: 'spell',
                            spellLevel: s.level,
                            rangeSquares: s.rangeSquares,
                            damageFormula: s.damageFormula,
                            healFormula: s.healFormula,
                            aoeRadius: s.aoeRadiusSquares,
                            description: s.description
                          });
                        }}
                        className={`p-2.5 rounded-xl border shadow transition-all flex flex-col justify-between ${
                          isDepleted
                            ? 'bg-zinc-950/60 border-zinc-800 opacity-50 cursor-not-allowed'
                            : 'bg-gradient-to-br from-zinc-900 via-zinc-900 to-purple-950/30 hover:border-purple-400/90 cursor-pointer hover:scale-102 border-zinc-700/80'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5 truncate">
                            <Sparkles size={14} className={isCantrip ? 'text-cyan-400' : 'text-purple-400'} />
                            <strong className="text-zinc-100 text-xs font-bold truncate">{s.name}</strong>
                          </div>
                          <span className={`text-[10px] font-mono font-bold px-1.5 rounded shrink-0 ${
                            isCantrip ? 'bg-cyan-950 text-cyan-300 border border-cyan-700/60' : 'bg-purple-950 text-purple-300 border border-purple-700/60'
                          }`}>
                            {isCantrip ? 'Truque' : `Círc. ${s.level}`}
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-400 leading-tight mb-2 line-clamp-2">
                          {s.description}
                        </div>
                        <div className="flex items-center justify-between text-[11px] font-mono border-t border-zinc-800/80 pt-1">
                          {s.damageFormula ? (
                            <span className="text-red-400 font-bold">{s.damageFormula} Dano</span>
                          ) : s.healFormula ? (
                            <span className="text-emerald-400 font-bold">{s.healFormula} Cura</span>
                          ) : (
                            <span className="text-zinc-400">Efeito Arcano</span>
                          )}
                          <span className="text-zinc-400">{s.rangeSquares * 1.5}m</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ═══ TAB 3: TODAS AS 18 PERÍCIAS D&D 5e ═══ */}
              {activeTab === 'skills' && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                  {ALL_5E_SKILLS.map((sk) => {
                    const isProf = activeHero.skills.includes(sk.name);
                    const isExp = activeHero.expertise.includes(sk.name);
                    const attrMod = mod(activeHero.stats[sk.attrIdx]);
                    const totalBonus = attrMod + (isProf ? prof(activeHero.level) : 0) + (isExp ? prof(activeHero.level) : 0);

                    return (
                      <button
                        key={sk.name}
                        disabled={busy}
                        onClick={() =>
                          onActionSelect({
                            id: `skill-${sk.name}`,
                            name: `Teste de ${sk.name}`,
                            category: 'skill',
                            rangeSquares: 0,
                            description: `Realiza um teste oficial de ${sk.name} (${sk.attrName}) com modificador ${signed(totalBonus)}.`
                          })
                        }
                        className={`p-2 rounded-xl border text-left transition-all shadow-sm flex flex-col justify-between active:scale-95 ${
                          isExp
                            ? 'bg-amber-950/40 border-amber-400/80 text-amber-200'
                            : isProf
                            ? 'bg-zinc-900 border-zinc-700 text-zinc-100 hover:border-amber-400/70'
                            : 'bg-zinc-950/80 border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-bold truncate">{sk.name}</span>
                          {isExp ? (
                            <Award size={12} className="text-amber-400 shrink-0" title="Especialista" />
                          ) : isProf ? (
                            <CheckCircle2 size={11} className="text-emerald-400 shrink-0" title="Proficiente" />
                          ) : null}
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-mono">
                          <span className="text-zinc-500">{sk.attrName}</span>
                          <span className="font-bold text-amber-400 text-xs">{signed(totalBonus)}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* ═══ TAB 4: ITENS & CONSUMÍVEIS ═══ */}
              {activeTab === 'items' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                  {['pocao-cura', 'pocao-cura-maior', 'antidoto', 'tocha'].map((itemId) => {
                    const it = ITEMS_CATALOG[itemId];
                    if (!it) return null;
                    const isConsumable = it.type === 'consumivel';

                    return (
                      <div
                        key={itemId}
                        className="p-2.5 rounded-xl bg-zinc-900/90 border border-zinc-700/80 hover:border-emerald-400/80 shadow flex flex-col justify-between transition-all"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5">
                            <Heart size={14} className="text-emerald-400" />
                            <strong className="text-zinc-100 text-xs font-bold">{it.name}</strong>
                          </div>
                          <span className="text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-700/60 px-1.5 rounded">
                            {it.type}
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-400 leading-tight mb-2">
                          {it.description}
                        </div>
                        <div className="flex items-center justify-between border-t border-zinc-800/80 pt-1.5">
                          <span className="text-[11px] font-mono text-emerald-400 font-bold">
                            {it.healFormula ? `+${it.healFormula} PV` : 'Efeito Imediato'}
                          </span>
                          <button
                            disabled={busy || (isCombat && actionUsed)}
                            onClick={() => {
                              if (isConsumable && onUseItem) {
                                onUseItem(itemId, activeHero.id);
                              } else {
                                onActionSelect({
                                  id: itemId,
                                  name: it.name,
                                  category: 'item',
                                  rangeSquares: 1,
                                  healFormula: it.healFormula,
                                  description: it.description
                                });
                              }
                            }}
                            className="px-2.5 py-0.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-black font-bold text-xs shadow active:scale-95 transition-all"
                          >
                            Consumir
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ═══ TAB 5: AÇÕES TÁTICAS 5E ═══ */}
              {activeTab === 'tactics' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                  {TACTICAL_ACTIONS.map((tac) => (
                    <div
                      key={tac.id}
                      onClick={() =>
                        onActionSelect({
                          id: tac.id,
                          name: tac.name,
                          category: 'action',
                          rangeSquares: 0,
                          description: tac.description
                        })
                      }
                      className="p-2.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-850 border border-zinc-800 hover:border-cyan-400/80 cursor-pointer shadow transition-all hover:scale-102 flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <Wind size={14} className="text-cyan-400" />
                          <strong className="text-zinc-100 text-xs font-bold">{tac.name}</strong>
                        </div>
                        <span className="text-[10px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-800/60 px-1.5 rounded">
                          1 Ação
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-300 leading-relaxed mb-1">
                        {tac.description}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
