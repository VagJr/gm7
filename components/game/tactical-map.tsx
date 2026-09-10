// components/game/tactical-map.tsx
'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Eye,
  EyeOff,
  Crosshair,
  Footprints,
  Sparkles,
  Shield,
  Layers,
  X,
  Package,
  ArrowDownCircle,
  Gem,
  Swords,
  Info,
  Droplets,
  Heart,
  Zap,
  Flame,
  Snowflake,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Mic
} from 'lucide-react';
import type { Character, Enemy } from '@/lib/game-engine';
import type { ActionSelection } from './bottom-player-hud';
import type { ProceduralDungeon, TileType } from '@/lib/dungeon-generator';
import type { Battlemap, OrganicTileType } from '@/lib/battlemap-biomes';

// Map action/weapon/spell names to VFX CSS class
function getVfxClass(actionName: string): string {
  const n = actionName.toLowerCase();
  if (n.includes('arco') || n.includes('besta') || n.includes('dardo')) return 'vfx-arrow';
  if (n.includes('lança') || n.includes('rapier') || n.includes('estoque')) return 'vfx-thrust';
  if (n.includes('raio de fogo') || n.includes('fire bolt')) return 'vfx-fire-bolt';
  if (n.includes('chama sagrada') || n.includes('sacred flame')) return 'vfx-sacred-flame';
  if (n.includes('raio de gelo') || n.includes('frost') || n.includes('gelo')) return 'vfx-frost-ray';
  if (n.includes('mísseis mágicos') || n.includes('magic missile')) return 'vfx-magic-missile';
  if (n.includes('eldritch') || n.includes('rajada')) return 'vfx-eldritch-blast';
  if (n.includes('cura') || n.includes('heal') || n.includes('poção')) return 'vfx-heal';
  if (n.includes('escudo') || n.includes('shield') || n.includes('bênção')) return 'vfx-shield';
  // Default melee slash
  return 'vfx-slash';
}

// Map condition names to status indicator CSS class
function getStatusClass(condition: string): string {
  const c = condition.toLowerCase();
  if (c.includes('envenenad') || c.includes('poison')) return 'status-poisoned';
  if (c.includes('queimand') || c.includes('burn') || c.includes('fogo')) return 'status-burning';
  if (c.includes('congelad') || c.includes('frozen') || c.includes('gelo')) return 'status-frozen';
  if (c.includes('atordoad') || c.includes('stun') || c.includes('incapacitad')) return 'status-stunned';
  if (c.includes('abençoad') || c.includes('bless')) return 'status-blessed';
  if (c.includes('invisível') || c.includes('invisible')) return 'status-invisible';
  return '';
}

// Status effect indicator dot color
function getStatusDotColor(condition: string): string {
  const c = condition.toLowerCase();
  if (c.includes('envenenad') || c.includes('poison')) return 'bg-green-400';
  if (c.includes('queimand') || c.includes('burn') || c.includes('fogo')) return 'bg-orange-400';
  if (c.includes('congelad') || c.includes('frozen') || c.includes('gelo')) return 'bg-sky-300';
  if (c.includes('atordoad') || c.includes('stun') || c.includes('incapacitad')) return 'bg-yellow-400';
  if (c.includes('abençoad') || c.includes('bless')) return 'bg-amber-300';
  if (c.includes('invisível') || c.includes('invisible')) return 'bg-zinc-400';
  if (c.includes('amedrontad') || c.includes('frighten')) return 'bg-purple-400';
  if (c.includes('prone') || c.includes('derribad') || c.includes('caído')) return 'bg-stone-400';
  return 'bg-zinc-500';
}

export interface ProjectileVfx {
  id: string;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  type: 'arrow' | 'fire_bolt' | 'magic_missile' | 'sacred_flame' | 'frost_ray' | 'eldritch' | 'slash';
}

export interface MapNpc {
  id: string;
  name: string;
  role: string;
  description: string;
  dialogue?: string[];
  x?: number;
  y?: number;
  icon?: string;
}

interface TacticalMapProps {
  characters: Character[];
  enemies: Enemy[];
  selectedHeroId: string;
  selectedEnemyId: string;
  targetingAction: ActionSelection | null;
  onCancelTargeting: () => void;
  onSelectToken: (type: 'hero' | 'enemy', id: string) => void;
  onMoveHero: (heroId: string, x: number, y: number) => void;
  onTargetEnemy: (enemyId: string) => void;
  locationName: string;
  locationLabel: string;
  isCombat: boolean;
  canMove: boolean;
  dungeon?: ProceduralDungeon;
  battlemap?: Battlemap;
  onInteractObject?: (type: string, x: number, y: number) => void;
  busy?: boolean;
  activeTurnId?: string;
  npcs?: MapNpc[];
  onTalkNpc?: (npcId: string) => void;
  projectiles?: ProjectileVfx[];
}

export function TacticalMap({
  characters,
  enemies,
  selectedHeroId,
  selectedEnemyId,
  targetingAction,
  onCancelTargeting,
  onSelectToken,
  onMoveHero,
  onTargetEnemy,
  locationName,
  locationLabel,
  isCombat,
  canMove,
  dungeon,
  battlemap,
  onInteractObject,
  busy,
  activeTurnId,
  npcs,
  onTalkNpc,
  projectiles
}: TacticalMapProps) {
  const [fogOfWar, setFogOfWar] = useState(true);
  const [zoomScale, setZoomScale] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredSquare, setHoveredSquare] = useState<{ x: number; y: number } | null>(null);
  const [contextEnemy, setContextEnemy] = useState<Enemy | null>(null);
  // VFX state: maps entityId -> vfx CSS class, auto-clears after animation
  const [activeVfx, setActiveVfx] = useState<Record<string, string>>({});
  // Track previous HP to detect damage/heal and trigger VFX
  const prevHpRef = useRef<Record<string, number>>({});

  // Reset pan and center hero on turn / combat change
  const handleCenterHero = () => {
    setPanOffset({ x: 0, y: 0 });
    setZoomScale(1);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Permite arrastar segurando botão do meio, espaço/alt ou clicando no fundo
    if (e.button === 1 || e.button === 0 && (e.altKey || (e.target as HTMLElement).getAttribute('data-board-bg') === 'true')) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPanOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleWheel = (e: React.WheelEvent) => {
    const delta = e.deltaY < 0 ? 0.08 : -0.08;
    setZoomScale((z) => Math.max(1.0, Math.min(2.2, Number((z + delta).toFixed(2)))));
  };

  // Detect HP changes and trigger VFX
  useEffect(() => {
    const allEntities = [...characters, ...enemies];
    const newVfx: Record<string, string> = {};
    for (const e of allEntities) {
      const prevHp = prevHpRef.current[e.id];
      if (prevHp !== undefined && prevHp !== e.hp) {
        if (e.hp < prevHp) {
          // Took damage - show hit VFX
          newVfx[e.id] = 'vfx-hit';
        } else if (e.hp > prevHp) {
          // Healed - show heal VFX
          newVfx[e.id] = 'vfx-heal';
        }
      }
      prevHpRef.current[e.id] = e.hp;
    }
    if (Object.keys(newVfx).length > 0) {
      setActiveVfx((prev) => ({ ...prev, ...newVfx }));
      // Auto-clear VFX after animation duration
      const timer = setTimeout(() => {
        setActiveVfx((prev) => {
          const next = { ...prev };
          for (const id of Object.keys(newVfx)) delete next[id];
          return next;
        });
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [characters, enemies]);

  const gridSize = battlemap ? battlemap.width : dungeon ? dungeon.width : 8;
  const activeHero = characters.find((c) => c.id === selectedHeroId) || characters[0];

  // Calculate vision / illumination around heroes (radius = 5 squares)
  const isIlluminated = (x: number, y: number) => {
    if (!fogOfWar) return true;
    return characters.some((c) => {
      const dist = Math.max(Math.abs(c.x - x), Math.abs(c.y - y));
      return dist <= 5;
    });
  };

  // Check if square is in range of targeting action
  const isInRange = (x: number, y: number) => {
    if (!targetingAction || !activeHero) return false;
    const dist = Math.max(Math.abs(activeHero.x - x), Math.abs(activeHero.y - y));
    return dist <= targetingAction.rangeSquares;
  };

  // Movement distance calculation for hovered tile
  const moveDistance = useMemo(() => {
    if (!hoveredSquare || !activeHero || targetingAction) return null;
    const dx = Math.abs(activeHero.x - hoveredSquare.x);
    const dy = Math.abs(activeHero.y - hoveredSquare.y);
    const steps = Math.max(dx, dy); // Chebyshev 5e diagonal rule
    const meters = (steps * 1.5).toFixed(1);
    const isValid = steps > 0 && steps <= Math.floor(activeHero.speed / 1.5);
    return { steps, meters, isValid };
  }, [hoveredSquare, activeHero, targetingAction]);

  // Helper to determine tile type and visual classes
  const getTileInfo = (x: number, y: number) => {
    if (battlemap && battlemap.tiles[y]?.[x]) {
      const t = battlemap.tiles[y][x];
      return {
        type: t.type as string,
        blocksMovement: t.blocksMovement,
        blocksSight: t.blocksSight,
        label: t.label
      };
    }
    if (dungeon && dungeon.tiles[y]?.[x]) {
      const dt = dungeon.tiles[y][x];
      return {
        type: dt.type as string,
        blocksMovement: dt.type === 'wall' || dt.type === 'pillar',
        blocksSight: dt.type === 'wall',
        label: undefined
      };
    }
    return { type: 'grass', blocksMovement: false, blocksSight: false, label: undefined };
  };

  return (
    <div
      className="relative w-full h-full select-none overflow-hidden cursor-default"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      data-board-bg="true"
    >
      {/* Battle Map Grid Board — FULL-BLEED CANVAS (fills entire parent) */}
      <div
        className="relative w-full h-full bg-[#050806] overflow-hidden"
        data-board-bg="true"
      >
        {/* In-Game Location Pill (Floating Top-Left) */}
        <div className="absolute top-2.5 left-2.5 z-20 flex items-center gap-1.5 bg-zinc-950/85 border border-zinc-700/80 rounded-full px-2.5 py-1 text-xs backdrop-blur-md shadow-lg pointer-events-none">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span className="font-serif font-bold text-amber-200 tracking-wide text-xs truncate max-w-[130px] sm:max-w-[200px]">
            {locationName}
          </span>
          <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded-full border border-amber-500/40 font-mono">
            {gridSize}x{gridSize}
          </span>
        </div>

        {/* In-Game Vision & Scale Controls (Floating Top-Right) */}
        <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1 bg-[#111612]/90 border border-zinc-700/80 rounded-full px-2 py-1 text-xs backdrop-blur-md shadow-lg pointer-events-auto">
          <button
            type="button"
            onClick={handleCenterHero}
            className="p-1 rounded-full text-zinc-400 hover:text-amber-200 hover:bg-zinc-800 transition-colors"
            title="Centralizar Câmera no Herói"
          >
            <RotateCcw size={13} />
          </button>
          <button
            type="button"
            onClick={() => setZoomScale((z) => Math.max(1.0, Number((z - 0.1).toFixed(2))))}
            className="p-1 rounded-full text-zinc-400 hover:text-amber-200 hover:bg-zinc-800 transition-colors"
            title="Diminuir Zoom (-)"
          >
            <ZoomOut size={13} />
          </button>
          <span className="text-[10px] font-mono text-amber-300/80 px-0.5">{Math.round(zoomScale * 100)}%</span>
          <button
            type="button"
            onClick={() => setZoomScale((z) => Math.min(2.2, Number((z + 0.1).toFixed(2))))}
            className="p-1 rounded-full text-zinc-400 hover:text-amber-200 hover:bg-zinc-800 transition-colors"
            title="Aumentar Zoom (+)"
          >
            <ZoomIn size={13} />
          </button>
          <div className="w-[1px] h-3.5 bg-zinc-700/80 mx-0.5" />
          <button
            type="button"
            onClick={() => setFogOfWar(!fogOfWar)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold transition-all ${
              fogOfWar
                ? 'border-amber-500/60 bg-amber-950/50 text-amber-300 shadow-sm'
                : 'border-zinc-700 bg-zinc-900 text-zinc-400'
            }`}
            title="Alternar Névoa de Guerra / Visão"
          >
            {fogOfWar ? <Eye size={11} className="text-amber-400" /> : <EyeOff size={11} className="text-zinc-400" />}
            <span className="hidden sm:inline">Névoa</span>
          </button>
          <span className="text-[10px] text-zinc-400 font-mono hidden sm:inline px-1">1q=1,5m</span>
        </div>

        {/* In-Game Targeting Bar (Floating Top-Center) */}
        {targetingAction && (
          <div className="absolute top-2.5 left-1/2 -translate-x-1/2 z-30 bg-gradient-to-r from-red-950 via-amber-950 to-red-950 border border-amber-400/90 rounded-full px-3.5 py-1 flex items-center gap-3 animate-fade-in shadow-[0_0_20px_rgba(239,68,68,0.5)] backdrop-blur-md pointer-events-auto">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-200">
              <Crosshair size={13} className="text-red-400 animate-spin-slow" />
              <span className="tracking-wide">ALVO: {targetingAction.name}</span>
              <span className="text-[10px] font-normal text-amber-300/80 hidden md:inline">
                ({targetingAction.rangeSquares * 1.5}m)
              </span>
            </div>
            <button
              onClick={onCancelTargeting}
              className="flex items-center gap-1 bg-black/70 hover:bg-black text-zinc-300 hover:text-white px-2 py-0.5 rounded-full text-[11px] border border-zinc-700 transition-colors"
            >
              <X size={11} />
              <span>Cancelar</span>
            </button>
          </div>
        )}

        {/* In-Game Coordinates & Distance Badge (Floating Bottom-Left) */}
        {hoveredSquare && (
          <div className="absolute bottom-2.5 left-2.5 z-20 bg-zinc-950/85 border border-zinc-800 rounded-lg px-2 py-0.5 text-[10px] font-mono text-zinc-400 backdrop-blur-md pointer-events-none shadow">
            X:{hoveredSquare.x} Y:{hoveredSquare.y}
            {moveDistance && (
              <span className={moveDistance.isValid ? 'text-cyan-400 ml-1.5 font-bold' : 'text-red-400 ml-1.5'}>
                • {moveDistance.meters}m ({moveDistance.steps}q)
              </span>
            )}
          </div>
        )}

        {/* Dynamic Grid Container — Edge-to-Edge Full Screen Game Board (No Card Frames or Black Void) */}
        <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none" data-board-bg="true">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${gridSize}, minmax(0, 1fr))`,
              transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomScale})`,
              transformOrigin: 'center center',
              transition: isDragging ? 'none' : 'transform 0.15s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
            className="w-full h-full gap-0.5 sm:gap-1 bg-transparent touch-manipulation pointer-events-auto"
          >
          {Array.from({ length: gridSize * gridSize }).map((_, i) => {
            const x = i % gridSize;
            const y = Math.floor(i / gridSize);

            const illuminated = isIlluminated(x, y);
            const inRange = isInRange(x, y);
            const isHovered = hoveredSquare?.x === x && hoveredSquare?.y === y;

            const isVillage = battlemap?.biome === 'village' || locationName.toLowerCase().includes('vila');
            const tileNpcs = isVillage ? (npcs || []).filter((n) => n.x === x && n.y === y) : [];
            const tileHeroes = characters.filter((c) => c.x === x && c.y === y);
            const tileEnemies = enemies.filter((e) => e.x === x && e.y === y && e.hp > 0);
            const hasEntities = tileHeroes.length > 0 || tileEnemies.length > 0 || tileNpcs.length > 0;

            const isTileActiveHero = isCombat && tileHeroes.some((h) => h.id === activeTurnId);
            const isTileActiveEnemy = isCombat && tileEnemies.some((e) => e.id === activeTurnId);

            const tile = getTileInfo(x, y);
            const tType = tile.type;
            const isDungeonBiome = battlemap?.biome === 'dungeon' || locationName.toLowerCase().includes('dungeon') || locationName.toLowerCase().includes('catacumba') || locationName.toLowerCase().includes('abóboda');
            const isCenterCampfire = x === Math.floor(gridSize / 2) && y === Math.floor(gridSize / 2);

            // Determine styling based on organic biome tile
            let tileBg = isDungeonBiome
              ? 'bg-[#151c16] border-[#253024]/80 hover:bg-[#1c261d]' // dark moss stone dungeon floor
              : 'bg-[#152217] border-[#1d3020]/70 hover:bg-[#1a2c1d]'; // grass default
            if (tType === 'road') {
              tileBg = 'bg-[#4a3b2c] border-[#5e4b38] hover:bg-[#574534]'; // dirt road
            } else if (tType === 'water') {
              tileBg = 'bg-gradient-to-br from-[#122e2b] to-[#1a3d34] border-[#255246] shadow-inner';
            } else if (tType === 'bridge') {
              tileBg = 'bg-[#5c381e] border-[#784724] shadow-sm';
            } else if (tType === 'tree') {
              tileBg = 'bg-[#143d1a] border-[#1e5c27] shadow-inner';
            } else if (tType === 'building_wall' || tType === 'wall') {
              tileBg = isDungeonBiome ? 'bg-[#1b221c] border-[#2e392c] shadow-md pointer-events-none' : 'bg-[#27272a] border-[#3f3f46] shadow-md pointer-events-none';
            } else if (tType === 'building_floor' || tType === 'floor') {
              tileBg = isDungeonBiome ? 'bg-[#131914] border-[#232d24] hover:bg-[#182019]' : 'bg-[#332218] border-[#442e20] hover:bg-[#3d291d]';
            } else if (tType === 'door') {
              tileBg = 'bg-[#61361c] border-amber-600/70';
            } else if (tType === 'well') {
              tileBg = 'bg-stone-800 border-stone-600';
            }

            const isAoE =
              targetingAction?.aoeRadius &&
              hoveredSquare &&
              Math.max(Math.abs(hoveredSquare.x - x), Math.abs(hoveredSquare.y - y)) <=
                targetingAction.aoeRadius;

            return (
              <div
                key={i}
                onMouseEnter={() => setHoveredSquare({ x, y })}
                onMouseLeave={() => setHoveredSquare(null)}
                onClick={() => {
                  if (targetingAction) {
                    const enemyTarget = tileEnemies[0];
                    if (enemyTarget && inRange) {
                      onTargetEnemy(enemyTarget.id);
                    }
                  } else if (tileNpcs.length > 0) {
                    const npc = tileNpcs[0];
                    const dist = activeHero ? Math.max(Math.abs(activeHero.x - x), Math.abs(activeHero.y - y)) : 99;
                    if (dist <= 1) {
                      onTalkNpc?.(npc.id);
                    } else if (canMove && activeHero && !tile.blocksMovement) {
                      onMoveHero(activeHero.id, x, y);
                    }
                  } else if (tileEnemies.length > 0) {
                    setContextEnemy(tileEnemies[0]);
                    onSelectToken('enemy', tileEnemies[0].id);
                  } else if (['chest', 'shrine', 'stairs', 'well'].includes(tType)) {
                    onInteractObject?.(tType, x, y);
                  } else if (canMove && activeHero && !hasEntities && !tile.blocksMovement) {
                    onMoveHero(activeHero.id, x, y);
                  }
                }}
                className={`relative flex items-center justify-center rounded-sm sm:rounded border transition-all cursor-pointer overflow-hidden ${
                  !illuminated
                    ? 'bg-black/95 border-zinc-950 opacity-25'
                    : inRange && targetingAction
                    ? 'bg-amber-500/20 border-amber-400/80 shadow-[inset_0_0_8px_rgba(251,191,36,0.4)]'
                    : isAoE
                    ? 'bg-orange-500/25 border-orange-500/60 animate-pulse'
                    : isTileActiveHero
                    ? 'bg-amber-950/40 border-amber-400/80 shadow-[inset_0_0_15px_rgba(251,191,36,0.35)]'
                    : isTileActiveEnemy
                    ? 'bg-red-950/40 border-red-500/80 shadow-[inset_0_0_15px_rgba(239,68,68,0.35)]'
                    : tileBg
                }`}
              >
                {/* Organic Visual Embellishments */}
                {illuminated && (
                  <>
                    {/* Water flow line */}
                    {tType === 'water' && (
                      <div className="absolute inset-0 flex items-center justify-center opacity-40">
                        <Droplets size={10} className="text-sky-300 animate-pulse" />
                      </div>
                    )}

                    {/* Wooden Bridge Planks */}
                    {tType === 'bridge' && (
                      <div className="absolute inset-0 flex flex-col justify-between py-0.5 px-0.5 opacity-60 pointer-events-none">
                        <div className="h-0.5 w-full bg-amber-900" />
                        <div className="h-0.5 w-full bg-amber-900" />
                        <div className="h-0.5 w-full bg-amber-900" />
                      </div>
                    )}

                    {/* Tree Foliage Canopy */}
                    {tType === 'tree' && (
                      <div
                        className="w-4/5 h-4/5 rounded-full bg-emerald-800 border border-emerald-600 shadow-md flex items-center justify-center"
                        title="Árvore / Bosque (Concede cobertura)"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-900/80" />
                      </div>
                    )}

                    {/* Stone Well */}
                    {tType === 'well' && (
                      <div
                        className="w-4/5 h-4/5 rounded-full bg-stone-700 border-2 border-stone-500 flex items-center justify-center shadow"
                        title="Poço da Vila (Água fresca)"
                      >
                        <div className="w-2 h-2 rounded-full bg-sky-500" />
                      </div>
                    )}

                    {/* Chest */}
                    {tType === 'chest' && (
                      <div
                        className="w-5 h-5 rounded-md bg-amber-950/90 border border-amber-400 flex items-center justify-center text-amber-300 animate-bounce"
                        title="Baú de Suprimentos (Examinar)"
                      >
                        <Package size={11} />
                      </div>
                    )}

                    {/* Shrine / Menir */}
                    {tType === 'shrine' && (
                      <div
                        className="w-5 h-5 rounded-full bg-emerald-950/90 border border-emerald-400 flex items-center justify-center text-emerald-300 animate-pulse"
                        title="Altar Sagrado / Menir dos Druidas"
                      >
                        <Sparkles size={11} />
                      </div>
                    )}

                    {/* Stairs */}
                    {tType === 'stairs' && (
                      <div
                        className="w-5 h-5 rounded-md bg-purple-950/90 border border-purple-400 flex items-center justify-center text-purple-300 animate-pulse"
                        title="Escadas para o Próximo Nível"
                      >
                        <ArrowDownCircle size={12} />
                      </div>
                    )}
                    {/* Campfire (Center feature as seen in reference image) */}
                    {isCenterCampfire && (
                      <div className="relative flex items-center justify-center pointer-events-none" title="Fogueira Central">
                        <div className="absolute w-8 h-8 rounded-full campfire-ambient opacity-75 pointer-events-none" />
                        <Flame size={18} className="text-amber-400 animate-bounce relative z-10 drop-shadow-[0_0_10px_rgba(245,158,11,1)]" />
                      </div>
                    )}
                  </>
                )}

                {/* Movement distance preview tooltip */}
                {isHovered && moveDistance && !hasEntities && !tile.blocksMovement && illuminated && (
                  <div className="absolute -top-6 z-30 pointer-events-none bg-black/95 border border-zinc-700 px-1.5 py-0.5 rounded text-[9px] font-mono text-zinc-200 whitespace-nowrap shadow-md">
                    <span className={moveDistance.isValid ? 'text-emerald-400' : 'text-red-400'}>
                      {moveDistance.meters}m
                    </span>
                  </div>
                )}

                {/* TOKENS */}
                {/* 1. Heroes */}
                {tileHeroes.map((hero) => {
                  const isSelected = hero.id === selectedHeroId;
                  const isActiveTurn = isCombat && (hero.id === activeTurnId);
                  const hpRatio = hero.hp / hero.maxHp;
                  const conditions = (hero as any).conditions || [];
                  const statusClasses = conditions.map((c: string) => getStatusClass(c)).filter(Boolean).join(' ');

                  // Fallen / Dead Hero Token (Do NOT let token disappear into thin air)
                  if (hero.hp <= 0) {
                    return (
                      <div
                        key={hero.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectToken('hero', hero.id);
                        }}
                        className="relative z-10 w-7 h-7 sm:w-9 sm:h-9 rounded-full flex flex-col items-center justify-center cursor-pointer ring-2 ring-red-700 bg-gradient-to-br from-zinc-950 via-red-950 to-black grayscale opacity-80 token-smooth-move shadow-lg"
                        title={`${hero.name} (INCONSCIENTE / 0 PV)`}
                      >
                        <span className="text-sm select-none drop-shadow">💀</span>
                        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-red-950 border border-red-700 text-red-300 font-mono text-[7px] px-1 rounded-full uppercase tracking-tight whitespace-nowrap z-20">
                          0 PV
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={hero.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectToken('hero', hero.id);
                      }}
                      className={`relative z-10 w-7 h-7 sm:w-9 sm:h-9 rounded-full flex flex-col items-center justify-center cursor-pointer token-bob token-smooth-move ${
                        isActiveTurn
                          ? 'ring-4 ring-amber-400 ring-offset-2 ring-offset-black scale-115 shadow-[0_0_25px_rgba(251,191,36,0.9)] token-selected-pulse'
                          : isSelected
                          ? 'ring-2 ring-amber-400 ring-offset-1 ring-offset-black scale-110 token-selected-pulse'
                          : 'ring-[1.5px] ring-amber-600/70 shadow-lg hover:scale-105'
                      } bg-gradient-to-br from-[#2d2417] via-[#1a1711] to-black transition-transform ${statusClasses}`}
                      title={`${hero.name} (${hero.hp}/${hero.maxHp} PV)${isActiveTurn ? ' • SEU TURNO ATIVO' : ''}`}
                    >
                      {/* Active Turn Pulsing Halo */}
                      {isActiveTurn && (
                        <div className="absolute -inset-2 rounded-full border-2 border-amber-400 animate-ping opacity-60 pointer-events-none" />
                      )}

                      {/* Turn Badge on Token */}
                      {isActiveTurn && (
                        <div className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 bg-amber-400 text-black font-black text-[7px] sm:text-[8px] px-1 rounded-full uppercase tracking-wider shadow-lg z-30 animate-pulse pointer-events-none whitespace-nowrap">
                          VEZ
                        </div>
                      )}

                      {/* VFX Overlay */}
                      {activeVfx[hero.id] && <div className={activeVfx[hero.id]} />}

                      {/* Mini HP Bar (Dinamica, ACIMA do token) */}
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-[130%] max-w-[42px] h-[5px] bg-black/95 rounded-full border border-zinc-500/80 overflow-hidden shadow-lg z-20">
                        <div
                          style={{ width: `${Math.min(100, hpRatio * 100)}%` }}
                          className={`h-full transition-all duration-500 ease-out ${
                            hpRatio > 0.5 ? 'bg-gradient-to-r from-emerald-500 to-green-400' : hpRatio > 0.2 ? 'bg-gradient-to-r from-amber-500 to-yellow-400' : 'bg-gradient-to-r from-red-600 to-red-400'
                          }`}
                        />
                      </div>

                      {/* HP Number (appears on hover/selected, above the HP bar) */}
                      {(isSelected || isActiveTurn) && (
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-zinc-950/95 border border-amber-500/60 px-1.5 py-0 rounded text-[8px] font-mono font-bold text-amber-200 whitespace-nowrap z-30 shadow-md pointer-events-none">
                          {hero.hp}/{hero.maxHp}
                        </div>
                      )}

                      {/* Status Effect Dots */}
                      {conditions.length > 0 && (
                        <div className="absolute -top-1 -right-1 flex gap-0.5 z-20">
                          {conditions.slice(0, 3).map((c: string, i: number) => (
                            <div key={i} className={`w-[5px] h-[5px] rounded-full ${getStatusDotColor(c)} shadow-sm`} title={c} />
                          ))}
                        </div>
                      )}

                      {/* Token Letter */}
                      <span className="font-serif font-black text-[11px] sm:text-sm text-amber-100 drop-shadow-sm">
                        {hero.name[0]}
                      </span>
                    </div>
                  );
                })}

                {/* 2. Enemies */}
                {tileEnemies.map((enemy) => {
                  const isSelected = enemy.id === selectedEnemyId;
                  const isActiveTurn = isCombat && (enemy.id === activeTurnId);
                  const hpRatio = enemy.hp / enemy.maxHp;
                  const conditions = (enemy as any).conditions || [];
                  const statusClasses = conditions.map((c: string) => getStatusClass(c)).filter(Boolean).join(' ');
                  const isTargeted = targetingAction && inRange;

                  return (
                    <div
                      key={enemy.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (targetingAction && inRange) {
                          onTargetEnemy(enemy.id);
                        } else {
                          onSelectToken('enemy', enemy.id);
                          setContextEnemy(enemy);
                        }
                      }}
                      className={`relative z-10 w-7 h-7 sm:w-9 sm:h-9 rounded-full flex flex-col items-center justify-center cursor-pointer token-smooth-move ${
                        isActiveTurn
                          ? 'ring-4 ring-red-500 ring-offset-2 ring-offset-black scale-115 shadow-[0_0_25px_rgba(239,68,68,0.9)] token-target-pulse'
                          : isSelected
                          ? 'ring-2 ring-red-500 ring-offset-1 ring-offset-black scale-110 token-target-pulse'
                          : isTargeted
                          ? 'ring-2 ring-amber-400/80 ring-offset-1 ring-offset-black scale-105 animate-pulse'
                          : 'ring-[1.5px] ring-red-700/80 shadow-lg hover:scale-105'
                      } bg-gradient-to-br from-red-800 via-red-950 to-zinc-950 transition-transform ${statusClasses}`}
                      title={`${enemy.name} (${enemy.hp}/${enemy.maxHp} PV) • CA ${enemy.ac}${isActiveTurn ? ' • TURNO ATIVO' : ''}`}
                    >
                      {/* Active Turn Pulsing Halo */}
                      {isActiveTurn && (
                        <div className="absolute -inset-2 rounded-full border-2 border-red-500 animate-ping opacity-60 pointer-events-none" />
                      )}

                      {/* Turn Badge on Token */}
                      {isActiveTurn && (
                        <div className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 bg-red-600 text-white font-black text-[7px] sm:text-[8px] px-1 rounded-full uppercase tracking-wider shadow-lg z-30 animate-pulse pointer-events-none whitespace-nowrap">
                          VEZ
                        </div>
                      )}

                      {/* VFX Overlay */}
                      {activeVfx[enemy.id] && <div className={activeVfx[enemy.id]} />}

                      {/* Mini HP Bar (Dinamica, ACIMA do token) */}
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-[130%] max-w-[42px] h-[5px] bg-black/95 rounded-full border border-zinc-500/80 overflow-hidden shadow-lg z-20">
                        <div
                          style={{ width: `${Math.min(100, hpRatio * 100)}%` }}
                          className={`h-full transition-all duration-500 ease-out ${
                            hpRatio > 0.5 ? 'bg-gradient-to-r from-red-500 to-rose-400' : hpRatio > 0.2 ? 'bg-gradient-to-r from-amber-500 to-orange-400' : 'bg-gradient-to-r from-red-700 to-red-500'
                          }`}
                        />
                      </div>

                      {/* HP Number (appears on hover/selected, above the HP bar) */}
                      {isSelected && (
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-zinc-950/95 border border-red-600/60 px-1.5 py-0 rounded text-[8px] font-mono font-bold text-red-200 whitespace-nowrap z-30 shadow-md pointer-events-none">
                          {enemy.hp}/{enemy.maxHp}
                        </div>
                      )}

                      {/* Status Effect Dots */}
                      {conditions.length > 0 && (
                        <div className="absolute -top-1 -right-1 flex gap-0.5 z-20">
                          {conditions.slice(0, 3).map((c: string, i: number) => (
                            <div key={i} className={`w-[5px] h-[5px] rounded-full ${getStatusDotColor(c)} shadow-sm`} title={c} />
                          ))}
                        </div>
                      )}

                      {/* Targeting Reticle Overlay */}
                      {isTargeted && (
                        <div className="absolute inset-0 rounded-full border-2 border-dashed border-amber-400/70 animate-spin-slow pointer-events-none z-15" />
                      )}

                      {/* Token Letter */}
                      <span className="font-serif font-black text-[11px] sm:text-sm text-red-200 drop-shadow-sm">
                        {enemy.name[0]}
                      </span>
                    </div>
                  );
                })}

                {/* 3. Village NPCs */}
                {tileNpcs.map((npc) => {
                  const dist = activeHero ? Math.max(Math.abs(activeHero.x - (npc.x ?? -1)), Math.abs(activeHero.y - (npc.y ?? -1))) : 99;
                  const isNear = dist <= 1;

                  return (
                    <div
                      key={npc.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isNear) {
                          onTalkNpc?.(npc.id);
                        }
                      }}
                      className={`relative z-15 w-7 h-7 sm:w-9 sm:h-9 rounded-full flex flex-col items-center justify-center cursor-pointer transition-all hover:scale-105 ${
                        isNear
                          ? 'ring-2 ring-amber-400 ring-offset-1 ring-offset-black npc-talk-glow shadow-[0_0_18px_rgba(245,158,11,0.7)] scale-105'
                          : 'ring-[1.5px] ring-emerald-500/70 opacity-90 shadow-md'
                      } bg-gradient-to-br from-[#1b3320] via-[#102415] to-[#0a140c]`}
                      title={`${npc.name} • ${npc.role}${isNear ? ' (Perto: clique para conversar)' : ' (Aproxime-se a 1,5m para conversar)'}`}
                    >
                      {/* Speech bubble button when player is in close proximity */}
                      {isNear && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onTalkNpc?.(npc.id);
                          }}
                          className="absolute -top-7 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 hover:from-amber-300 hover:to-yellow-200 text-black font-black text-[8px] sm:text-[9px] shadow-[0_0_12px_rgba(245,158,11,0.9)] cursor-pointer active:scale-95 transition-all whitespace-nowrap"
                        >
                          <span>💬 Falar</span>
                        </button>
                      )}

                      {/* NPC Token Icon */}
                      <span className="text-xs sm:text-sm drop-shadow-md select-none">
                        {npc.id === 'doran' ? '🧙' : npc.id === 'elenor' ? '🧪' : npc.id === 'kaelen' ? '🛡️' : '👤'}
                      </span>

                      {/* Mini Name Pill beneath token */}
                      <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-zinc-950/95 border border-emerald-500/60 text-emerald-300 font-serif font-bold text-[7px] sm:text-[8px] px-1 py-0 rounded-full tracking-tight whitespace-nowrap z-20 pointer-events-none shadow">
                        {npc.name.split(' ')[0]}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* FLYING COMBAT PROJECTILES OVERLAY */}
          {projectiles && projectiles.map((p) => {
            const startLeft = ((p.startX + 0.5) / gridSize) * 100 + '%';
            const startTop = ((p.startY + 0.5) / gridSize) * 100 + '%';
            const targetLeft = ((p.targetX + 0.5) / gridSize) * 100 + '%';
            const targetTop = ((p.targetY + 0.5) / gridSize) * 100 + '%';
            const dx = p.targetX - p.startX;
            const dy = p.targetY - p.startY;
            const angle = Math.atan2(dy, dx) * (180 / Math.PI);

            if (p.type === 'slash') {
              return (
                <div
                  key={p.id}
                  className="slash-arc-anim"
                  style={{ left: targetLeft, top: targetTop }}
                >
                  <div className="w-12 h-12 border-r-4 border-t-4 border-red-500 rounded-full shadow-[0_0_20px_#ef4444]" />
                </div>
              );
            }

            if (p.type === 'sacred_flame') {
              return (
                <div
                  key={p.id}
                  className="sacred-flame-anim"
                  style={{ left: targetLeft, top: targetTop }}
                >
                  <div className="w-6 h-24 bg-gradient-to-b from-yellow-200 via-amber-400 to-amber-500 rounded-full shadow-[0_0_30px_#fef08a]" />
                </div>
              );
            }

            return (
              <React.Fragment key={p.id}>
                <div
                  className="projectile-fly-anim"
                  style={{
                    '--proj-start-x': startLeft,
                    '--proj-start-y': startTop,
                    '--proj-target-x': targetLeft,
                    '--proj-target-y': targetTop,
                    '--proj-angle': `${angle}deg`
                  } as React.CSSProperties}
                >
                  {p.type === 'fire_bolt' ? (
                    <div className="relative flex items-center justify-center">
                      <div className="w-5 h-5 rounded-full bg-gradient-to-r from-yellow-300 via-orange-500 to-red-600 shadow-[0_0_18px_#f97316] animate-spin" />
                      <div className="absolute right-3 w-10 h-2 bg-gradient-to-l from-orange-500/90 to-transparent blur-[1px] rounded-full" />
                    </div>
                  ) : p.type === 'magic_missile' ? (
                    <div className="relative flex items-center justify-center">
                      <div className="w-5 h-5 rounded-full bg-gradient-to-r from-violet-400 via-purple-500 to-fuchsia-400 shadow-[0_0_18px_#a855f7] animate-pulse" />
                      <div className="absolute right-3 w-12 h-2 bg-gradient-to-l from-fuchsia-500/80 to-transparent blur-[1px] rounded-full" />
                    </div>
                  ) : p.type === 'frost_ray' ? (
                    <div className="relative flex items-center justify-center">
                      <div className="w-7 h-2 rounded-full bg-gradient-to-r from-cyan-300 to-white shadow-[0_0_16px_#38bdf8]" />
                      <div className="absolute right-2 w-9 h-2 bg-gradient-to-l from-sky-400/80 to-transparent blur-[1px]" />
                    </div>
                  ) : p.type === 'eldritch' ? (
                    <div className="relative flex items-center justify-center">
                      <div className="w-5 h-5 rounded-full bg-gradient-to-r from-emerald-400 to-green-500 shadow-[0_0_18px_#10b981] animate-spin-slow" />
                      <div className="absolute right-3 w-10 h-2 bg-gradient-to-l from-emerald-500/80 to-transparent blur-[1px]" />
                    </div>
                  ) : (
                    /* Default Arrow */
                    <div className="relative flex items-center">
                      <div className="w-7 h-1 bg-gradient-to-r from-transparent via-amber-200 to-white shadow-[0_0_10px_#eab308]" />
                      <div className="w-2.5 h-2.5 -ml-1.5 rotate-45 bg-amber-300 shadow" />
                    </div>
                  )}
                </div>

                {/* Impact Ring at target */}
                <div
                  className="impact-ring-anim border-2 border-amber-400"
                  style={{
                    left: targetLeft,
                    top: targetTop,
                    width: '36px',
                    height: '36px'
                  }}
                />
              </React.Fragment>
            );
          })}
          </div>
        </div>

        {/* FLOATING CONTEXT ACTION MENU ON ENEMY CLICK */}
        {contextEnemy && (
          <div className="absolute inset-x-2 bottom-3 sm:bottom-5 z-40 animate-slide-up max-w-md mx-auto">
            <div className="bg-zinc-950/97 border-2 border-red-500/70 rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-[0_0_40px_rgba(239,68,68,0.2)] backdrop-blur-xl">
              {/* Enemy Info Header */}
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-zinc-800/80">
                <div className="flex items-center gap-2.5">
                  {/* Animated Portrait */}
                  <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-red-900 to-zinc-950 border-2 border-red-500/80 flex items-center justify-center shadow-lg">
                    <span className="font-serif font-black text-red-200 text-lg">{contextEnemy.name[0]}</span>
                    {/* Mini HP ring */}
                    <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 40 40">
                      <circle cx="20" cy="20" r="18" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2" />
                      <circle
                        cx="20" cy="20" r="18" fill="none"
                        stroke={contextEnemy.hp / contextEnemy.maxHp > 0.5 ? '#ef4444' : contextEnemy.hp / contextEnemy.maxHp > 0.2 ? '#f59e0b' : '#dc2626'}
                        strokeWidth="2.5"
                        strokeDasharray={`${(contextEnemy.hp / contextEnemy.maxHp) * 113} 113`}
                        strokeLinecap="round"
                        className="transition-all duration-500"
                      />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-bold text-red-200 text-sm sm:text-base leading-tight tracking-wide">
                      {contextEnemy.name}
                    </h4>
                    <div className="flex items-center gap-3 text-[11px] font-mono mt-0.5">
                      <span className="flex items-center gap-1 text-red-400 font-bold">
                        <Heart size={10} /> {contextEnemy.hp}/{contextEnemy.maxHp}
                      </span>
                      <span className="flex items-center gap-1 text-amber-400">
                        <Shield size={10} /> CA {contextEnemy.ac}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setContextEnemy(null)}
                  className="p-1.5 rounded-xl text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all"
                  title="Fechar Menu"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Tactical Action Grid */}
              <div className="grid grid-cols-2 gap-2">
                {/* Melee Attack */}
                <button
                  disabled={busy}
                  onClick={() => {
                    setActiveVfx((prev) => ({ ...prev, [contextEnemy.id]: getVfxClass(activeHero?.weapon || 'espada') }));
                    setTimeout(() => {
                      onTargetEnemy(contextEnemy.id);
                      setContextEnemy(null);
                    }, 100);
                  }}
                  className="ctx-action-btn flex items-center gap-2.5 p-2.5 bg-gradient-to-r from-red-950/90 to-zinc-900/90 hover:from-red-900 hover:to-zinc-800 border border-red-600/50 hover:border-red-400/80 rounded-xl text-left group shadow-lg"
                >
                  <div className="w-8 h-8 rounded-lg bg-red-900/70 border border-red-500/50 flex items-center justify-center text-red-300 shrink-0 group-hover:scale-110 group-hover:bg-red-800 transition-all shadow-inner">
                    <Swords size={15} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-bold text-red-200 truncate">
                      {activeHero?.weapon || 'Arma'}
                    </div>
                    <div className="text-[9px] font-mono text-red-400/80">
                      {activeHero?.damage || '1d8'} dano
                    </div>
                  </div>
                </button>

                {/* Spell Attack */}
                <button
                  disabled={busy}
                  onClick={() => {
                    const spellName = activeHero?.className === 'Mago' ? 'Raio de Fogo' : 'Golpe Místico';
                    setActiveVfx((prev) => ({ ...prev, [contextEnemy.id]: getVfxClass(spellName) }));
                    setTimeout(() => {
                      onTargetEnemy(contextEnemy.id);
                      setContextEnemy(null);
                    }, 100);
                  }}
                  className="ctx-action-btn flex items-center gap-2.5 p-2.5 bg-gradient-to-r from-purple-950/90 to-zinc-900/90 hover:from-purple-900 hover:to-zinc-800 border border-purple-600/50 hover:border-purple-400/80 rounded-xl text-left group shadow-lg"
                >
                  <div className="w-8 h-8 rounded-lg bg-purple-900/70 border border-purple-500/50 flex items-center justify-center text-purple-300 shrink-0 group-hover:scale-110 group-hover:bg-purple-800 transition-all shadow-inner">
                    <Sparkles size={15} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-bold text-purple-200 truncate">
                      {activeHero?.className === 'Mago' ? 'Raio de Fogo' : 'Golpe Místico'}
                    </div>
                    <div className="text-[9px] font-mono text-purple-400/80">
                      {activeHero?.className === 'Mago' ? '1d10 fogo' : 'dano mágico'}
                    </div>
                  </div>
                </button>

                {/* Ranged Attack */}
                <button
                  disabled={busy}
                  onClick={() => {
                    setActiveVfx((prev) => ({ ...prev, [contextEnemy.id]: 'vfx-arrow' }));
                    setTimeout(() => {
                      onTargetEnemy(contextEnemy.id);
                      setContextEnemy(null);
                    }, 100);
                  }}
                  className="ctx-action-btn flex items-center gap-2.5 p-2.5 bg-gradient-to-r from-amber-950/90 to-zinc-900/90 hover:from-amber-900 hover:to-zinc-800 border border-amber-600/50 hover:border-amber-400/80 rounded-xl text-left group shadow-lg"
                >
                  <div className="w-8 h-8 rounded-lg bg-amber-900/70 border border-amber-500/50 flex items-center justify-center text-amber-300 shrink-0 group-hover:scale-110 group-hover:bg-amber-800 transition-all shadow-inner">
                    <Zap size={15} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-bold text-amber-200 truncate">
                      Ataque à Distância
                    </div>
                    <div className="text-[9px] font-mono text-amber-400/80">
                      projétil
                    </div>
                  </div>
                </button>

                {/* Inspect */}
                <button
                  onClick={() => {
                    onSelectToken('enemy', contextEnemy.id);
                    setContextEnemy(null);
                  }}
                  className="ctx-action-btn flex items-center gap-2.5 p-2.5 bg-gradient-to-r from-[#1c1813]/90 to-zinc-900/90 hover:from-amber-950/60 hover:to-zinc-800 border border-amber-600/40 hover:border-amber-400/80 rounded-xl text-left group shadow-lg"
                >
                  <div className="w-8 h-8 rounded-lg bg-amber-950/70 border border-amber-500/50 flex items-center justify-center text-amber-300 shrink-0 group-hover:scale-110 group-hover:bg-amber-900 transition-all shadow-inner">
                    <Info size={15} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-bold text-amber-200 truncate">
                      Inspecionar
                    </div>
                    <div className="text-[9px] font-mono text-amber-400/80">
                      detalhes do alvo
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
