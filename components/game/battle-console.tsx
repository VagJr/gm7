'use client';

import { useState } from 'react';
import { ArrowUp, ChevronDown, ChevronUp, Compass, Footprints, Heart, Package, Shield, Sparkles, Swords, Zap } from 'lucide-react';
import { canLevelUp, getWeaponMaxRange, getXpForNextLevel, ITEMS_CATALOG, mod, signed, skills, type Character, type ActiveSpellEffect } from '@/lib/game-engine';
import { getCharacterSpellActions } from '@/lib/srd-spellbook';
import { getInventoryQuantity } from '@/lib/inventory-utils';
import type { ActionSelection } from './bottom-player-hud';
import { heroTokenIndex, tokenArt } from '@/lib/token-art';

type Props = {
  activeHero: Character;
  party: Character[];
  spellEffects?: ActiveSpellEffect[];
  onSelectHero: (id: string) => void;
  onActionSelect: (action: ActionSelection) => void;
  onOpenInventory: () => void;
  onOpenShop?: () => void;
  onOpenCharacterSheet: () => void;
  onOpenLevelUp?: () => void;
  onEndTurn?: () => void;
  onStartCombat?: () => void;
  combatEntryLabel?: string;
  onUseItem?: (id: string, target?: string) => void;
  isCombat: boolean;
  isHeroTurn: boolean;
  actionUsed?: boolean;
  bonusActionUsed?: boolean;
  reactionUsed?: boolean;
  movementUsed?: number;
  movementBonusSquares?: number;
  busy?: boolean;
  isMinimized?: boolean;
  onToggleMinimized?: (value: boolean) => void;
};
type Tab = 'action' | 'spell' | 'bonus' | 'movement' | 'reaction' | 'skills';
const tabs: { id: Tab; label: string; icon: typeof Swords }[] = [
  { id: 'action', label: 'Ações', icon: Swords }, { id: 'spell', label: 'Magias', icon: Sparkles },
  { id: 'bonus', label: 'Bônus', icon: Zap }, { id: 'movement', label: 'Mover', icon: Footprints },
  { id: 'reaction', label: 'Reações', icon: Shield }, { id: 'skills', label: 'Perícias', icon: Compass },
];

export function BattleConsole(p: Props) {
  const h = p.activeHero;
  const [tab, setTab] = useState<Tab>('action');
  const [query, setQuery] = useState('');
  const [details, setDetails] = useState<ActionSelection | null>(null);
  const spells = getCharacterSpellActions(h);
  const move = Math.max(0, Math.floor(h.speed / 1.5) + (p.movementBonusSquares || 0) - (p.movementUsed || 0));
  const tactical = (id: string, name: string, description: string, economyType: ActionSelection['economyType'] = 'action'): ActionSelection => ({ id, name, description, economyType, category: 'action', rangeSquares: 0 });
  const spellActions: ActionSelection[] = spells.map(s => ({ id: s.id, name: s.name, canonicalName: s.canonicalName, category: 'spell', spellLevel: s.level, rangeSquares: s.rangeSquares, damageFormula: s.damageFormula, healFormula: s.healFormula, aoeRadius: s.aoeRadiusSquares, description: s.description, economyType: s.economyType, targetMode: s.targetMode, concentration: s.concentration }));
  const weapon = ITEMS_CATALOG[h.weapon]?.name || h.weapon;
  const actions: ActionSelection[] = tab === 'spell' ? spellActions : tab === 'skills'
    ? skills.map(([name, attribute]) => ({ id: `skill-${name}`, name: `Teste de ${name}`, category: 'skill', rangeSquares: 0, description: `${name}: modificador de atributo ${signed(mod(h.stats[attribute]))}. O servidor aplica a proficiência da ficha.` }))
    : tab === 'movement' ? [tactical('disparar', 'Disparar', 'Use sua ação para ganhar deslocamento adicional.'), tactical('desengajar', 'Desengajar', 'Mova-se sem provocar ataques de oportunidade neste turno.'), tactical('levantar', 'Levantar', 'Levante-se da condição Caído gastando movimento.', 'movement')]
    : tab === 'reaction' ? [tactical('ataque-oportunidade', 'Ataque de oportunidade', 'Reserve a reação para atacar quando um inimigo deixar seu alcance.', 'reaction'), ...spellActions.filter(s => s.economyType === 'reaction')]
    : tab === 'bonus' ? [
        ...(h.className === 'Guerreiro' ? [tactical('retomar-folego', 'Retomar o fôlego', 'Recupere pontos de vida usando seu recurso de classe.', 'bonus')] : []),
        ...(h.className === 'Bárbaro' ? [tactical('furia-barbara', 'Fúria', 'Ative sua fúria para enfrentar o combate corpo a corpo.', 'bonus')] : []),
        ...(h.className === 'Ladino' && h.level >= 2 ? [tactical('acao-ardilosa-desengajar', 'Ação ardilosa', 'Desengaje usando sua ação bônus.', 'bonus')] : []),
        ...spellActions.filter(s => s.economyType === 'bonus')]
    : [ { id: 'attack-weapon', name: weapon, category: 'attack', rangeSquares: getWeaponMaxRange(h.weapon).rangeSquares, damageFormula: h.damage, economyType: 'action', description: `Ataque com ${weapon}. Selecione um inimigo no mapa; alcance e acerto serão resolvidos pelo servidor.` },
        tactical('esquivar', 'Esquivar', 'Dificulte ataques contra você até seu próximo turno.'), tactical('esconder', 'Esconder', 'Faça um teste de Furtividade para tentar se ocultar.'), tactical('preparar-acao', 'Preparar ataque', 'Gaste a ação e reserve a reação para atacar uma criatura que entrar em alcance.') ];
  const blocked = (a: ActionSelection) => {
    if (p.busy) return 'Salvando ação…';
    if (h.hp <= 0) return 'Herói incapacitado';
    if (p.isCombat && !p.isHeroTurn && a.economyType !== 'reaction') return 'Aguarde seu turno';
    if (p.isCombat && a.economyType === 'action' && p.actionUsed) return 'Ação já utilizada';
    if (p.isCombat && a.economyType === 'bonus' && p.bonusActionUsed) return 'Bônus já utilizado';
    if (p.isCombat && a.economyType === 'reaction' && p.reactionUsed) return 'Reação já utilizada';
    return '';
  };
  const select = (a: ActionSelection) => {
    if (blocked(a)) return;
    p.onActionSelect(a);
    if (a.category === 'spell' || a.category === 'attack') p.onToggleMinimized?.(true);
    setDetails(null);
  };
  const effects = (p.spellEffects || []).filter(e => e.casterId === h.id || e.characterTargetIds.includes(h.id));
  const potions = getInventoryQuantity(h.inventory, ITEMS_CATALOG['pocao-cura']?.name || 'Poção de Cura');
  return <section className={`battle-console ${p.isMinimized ? 'is-compact' : ''}`} aria-label="Ações do personagem">
    <div className="battle-vitals">
      <button className="hero-medallion" onClick={p.onOpenCharacterSheet} aria-label={`Abrir ficha de ${h.name}`}><img src={tokenArt(heroTokenIndex(h))} alt="" style={{width:'100%',height:'100%',objectFit:'contain'}} /><small>{h.level}</small></button>
      <div className="battle-life"><div><strong>{h.name}</strong><span><Heart size={12} />{h.hp}/{h.maxHp}</span></div><progress aria-label="Pontos de vida" value={Math.max(0, h.hp)} max={Math.max(1, h.maxHp)} /><small>{h.className} · CA {h.ac} · {p.isCombat ? `${move * 1.5} m restantes` : `${h.x}, ${h.y}`}</small></div>
      {canLevelUp(h) && <button className="battle-level" onClick={p.onOpenLevelUp}><ArrowUp size={16} /><span>Evoluir</span></button>}
      <button className="console-toggle" aria-expanded={!p.isMinimized} aria-controls="battle-actions" onClick={() => p.onToggleMinimized?.(!p.isMinimized)}>{p.isMinimized ? <ChevronUp size={18} /> : <ChevronDown size={18} />}<span>{p.isMinimized ? 'Ações' : 'Recolher'}</span></button>
      {!p.isCombat && p.onStartCombat && <button className="end-turn" disabled={p.busy || h.hp<=0} onClick={p.onStartCombat}>{p.combatEntryLabel || 'Rolar iniciativa'}</button>}
      {p.isCombat && <button className="end-turn" disabled={p.busy || !p.isHeroTurn} onClick={p.onEndTurn}>{p.isHeroTurn ? 'Encerrar turno' : 'Aguardando…'}</button>}
    </div>
    {!p.isMinimized && <div id="battle-actions" className="battle-expanded">
      <div className="battle-economy" aria-label="Recursos do turno"><span>{p.isCombat ? (p.isHeroTurn ? 'Seu turno' : 'Turno de outro combatente') : 'Exploração'}</span><span>Ação: {p.actionUsed && p.isCombat ? 'usada' : 'livre'}</span><span>Bônus: {p.bonusActionUsed && p.isCombat ? 'usado' : 'livre'}</span><span>Reação: {p.reactionUsed && p.isCombat ? 'usada' : 'livre'}</span></div>
      <div className="battle-tabs" role="group" aria-label="Categorias de ações">{tabs.map(({id, label, icon: Icon}) => <button key={id} aria-pressed={tab === id} onClick={() => { setTab(id); setQuery(''); setDetails(null); }}><Icon size={16} /><span>{label}</span></button>)}</div>
      {tab === 'spell' && <label className="spell-search"><span className="sr-only">Pesquisar magias</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Pesquisar magias preparadas…" /></label>}
      {tab === 'movement' && <p className="battle-hint">Toque em uma casa para caminhar. No celular, arraste para explorar o mapa. Deslocamento disponível: {p.isCombat ? move * 1.5 : h.speed} m.</p>}
      <div className="battle-cards">
        {actions.filter(a => a.name.toLocaleLowerCase().includes(query.toLocaleLowerCase())).map(a => <div className="battle-card" key={a.id} data-srd-spell-economy={a.economyType} data-srd-target-mode={a.targetMode}>
          <button className="battle-card-action" disabled={!!blocked(a)} onClick={() => select(a)}><strong>{a.name}</strong><span>{blocked(a) || (a.category === 'spell' ? `${a.spellLevel ? `Círculo ${a.spellLevel}` : 'Truque'} · ${a.economyType === 'bonus' ? 'Bônus' : a.economyType === 'reaction' ? 'Reação' : 'Ação'}` : a.damageFormula ? `${a.damageFormula} · ${a.rangeSquares * 1.5} m` : a.economyType === 'bonus' ? 'Ação bônus' : a.category === 'skill' ? 'Teste de habilidade' : 'Tática')}</span></button>
          <button className="battle-info" onClick={() => setDetails(details?.id === a.id ? null : a)} aria-label={`Detalhes de ${a.name}`} aria-expanded={details?.id === a.id}>i</button>
        </div>)}
        {!actions.length && <p className="battle-empty">{tab === 'spell' ? 'Este herói não tem magias preparadas. Consulte sua ficha e as opções de evolução.' : 'Nenhuma habilidade disponível nesta categoria para sua classe e nível.'}</p>}
      </div>
      {details && <div className="battle-detail" role="status"><strong>{details.name}</strong><p>{details.description}</p>{details.rangeSquares > 0 && <span>Alcance: {details.rangeSquares * 1.5} m. </span>}{details.concentration && <span>Exige concentração. </span>}<button onClick={() => setDetails(null)}>Fechar detalhes</button></div>}
      {effects.length > 0 && <div className="battle-effects" data-srd-active-effects="true">{effects.map(e => <span key={e.id} data-srd-concentration={e.concentration || undefined}>{e.concentration ? 'Concentração: ' : ''}{e.spellName}</span>)}</div>}
      <div className="battle-utilities"><button onClick={p.onOpenInventory}><Package size={16} />Inventário</button><button disabled={p.busy || !potions || h.hp <= 0 || (p.isCombat && (!p.isHeroTurn || p.bonusActionUsed))} onClick={() => p.onUseItem?.('pocao-cura', h.id)}><Heart size={16} />Poção ({potions})</button><span>{h.xp || 0} / {getXpForNextLevel(h.level)} XP</span></div>
    </div>}
  </section>;
}
