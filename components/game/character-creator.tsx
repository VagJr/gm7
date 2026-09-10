// components/game/character-creator.tsx
'use client';

import React, { useState } from 'react';
import {
  Shield,
  Swords,
  Sparkles,
  Heart,
  Footprints,
  Dices,
  Check,
  ChevronRight,
  ChevronLeft,
  X,
  User,
  BookOpen,
  Award
} from 'lucide-react';
import {
  abilities,
  classes,
  species,
  skills,
  mod,
  prof,
  signed,
  newCharacter,
  calculateEquippedStats,
  type Character
} from '@/lib/game-engine';

interface CharacterCreatorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (character: Character) => Promise<void> | void;
  busy?: boolean;
}

const SPECIES_TRAITS: Record<string, { desc: string; statsBonus: [number, number, number, number, number, number]; speed: number }> = {
  Humano: { desc: '+1 em todos os atributos. Versátil, ambicioso e determinado.', statsBonus: [1, 1, 1, 1, 1, 1], speed: 9 },
  Elfo: { desc: '+2 DES, +1 INT. Visão no Escuro, sentidos aguçados e imunidade a sono mágico.', statsBonus: [0, 2, 0, 1, 0, 0], speed: 9 },
  Anão: { desc: '+2 CON, +1 FOR. Visão no Escuro, resiliência contra venenos e +1 PV por nível.', statsBonus: [1, 0, 2, 0, 0, 0], speed: 7.5 },
  Pequenino: { desc: '+2 DES, +1 CAR. Sortudo (rerrola 1 no d20) e ágil entre os inimigos.', statsBonus: [0, 2, 0, 0, 0, 1], speed: 7.5 },
  Halfling: { desc: '+2 DES, +1 CAR. Sortudo (rerrola 1 no d20) e ágil entre os inimigos.', statsBonus: [0, 2, 0, 0, 0, 1], speed: 7.5 },
  Draconato: { desc: '+2 FOR, +1 CAR. Ancestralidade dracônica com arma de sopro elemental.', statsBonus: [2, 0, 0, 0, 0, 1], speed: 9 },
  Tiferino: { desc: '+2 CAR, +1 INT. Visão no Escuro e resistência inerente a chamas infernais.', statsBonus: [0, 0, 0, 1, 0, 2], speed: 9 },
  Tiefling: { desc: '+2 CAR, +1 INT. Visão no Escuro e resistência inerente a chamas infernais.', statsBonus: [0, 0, 0, 1, 0, 2], speed: 9 },
  Gnomo: { desc: '+2 INT, +1 CON. Astúcia Gnômica (vantagem em salvaguardas mentais) e Visão no Escuro.', statsBonus: [0, 0, 1, 2, 0, 0], speed: 7.5 },
  Golias: { desc: '+2 FOR, +1 CON. Constituição Poderosa (capacidade de carga dupla) e Resguardo de Pedra.', statsBonus: [2, 0, 1, 0, 0, 0], speed: 9 },
  Orc: { desc: '+2 FOR, +1 CON. Agressividade feroz e Resistência Implacável (cai a 1 PV ao invés de 0).', statsBonus: [2, 0, 1, 0, 0, 0], speed: 9 }
};

const CLASS_CONFIGS: Record<string, {
  hitDie: number;
  primaryStat: number;
  saves: [number, number];
  weapon: string;
  damage: string;
  armor: string;
  shield?: string;
  skillsCount: number;
  availableSkills: string[];
  slots: [number, number, number, number, number, number, number, number, number];
  features: string;
  spells?: string;
  spellAbility?: number;
}> = {
  Guerreiro: {
    hitDie: 10,
    primaryStat: 0,
    saves: [0, 2],
    weapon: 'espada-longa',
    damage: '1d8+3',
    armor: 'cota-de-malha',
    shield: 'escudo',
    skillsCount: 2,
    availableSkills: ['Atletismo', 'Acrobacia', 'Intimidação', 'Percepção', 'Sobrevivência', 'História'],
    slots: [0, 0, 0, 0, 0, 0, 0, 0, 0],
    features: 'Estilo de Luta (Defesa), Retomar o Fôlego (1d10+1 PV por descanso curto).',
    spells: ''
  },
  Mago: {
    hitDie: 6,
    primaryStat: 3,
    saves: [3, 4],
    weapon: 'cajado-runico',
    damage: '1d10',
    armor: '',
    skillsCount: 2,
    availableSkills: ['Arcanismo', 'História', 'Investigação', 'Intuição', 'Religião'],
    slots: [2, 0, 0, 0, 0, 0, 0, 0, 0],
    features: 'Conjuração Arcana (INT), Recuperação Arcana de espaços de magia durante descanso.',
    spells: 'Raio de Fogo\nToque Chocante\nMísseis Mágicos\nMãos Flamejantes',
    spellAbility: 3
  },
  Clérigo: {
    hitDie: 8,
    primaryStat: 4,
    saves: [4, 5],
    weapon: 'espada-longa',
    damage: '1d8+2',
    armor: 'cota-de-malha',
    shield: 'escudo',
    skillsCount: 2,
    availableSkills: ['História', 'Intuição', 'Medicina', 'Persuasão', 'Religião'],
    slots: [2, 0, 0, 0, 0, 0, 0, 0, 0],
    features: 'Domínio Divino (Vida), Canalizar Divindade, Preces Curativas.',
    spells: 'Chama Sagrada\nCurar Ferimentos',
    spellAbility: 4
  },
  Ladino: {
    hitDie: 8,
    primaryStat: 1,
    saves: [1, 3],
    weapon: 'rapieira',
    damage: '1d8+3',
    armor: 'armadura-de-couro',
    skillsCount: 4,
    availableSkills: ['Acrobacia', 'Atletismo', 'Enganação', 'Furtividade', 'Intimidação', 'Investigação', 'Percepção', 'Prestidigitação'],
    slots: [0, 0, 0, 0, 0, 0, 0, 0, 0],
    features: 'Ataque Furtivo (+1d6 em vantagem), Especialização em Perícias, Ação Ardilosa.',
    spells: ''
  },
  Paladino: {
    hitDie: 10,
    primaryStat: 0,
    saves: [4, 5],
    weapon: 'espada-longa',
    damage: '1d8+3',
    armor: 'cota-de-malha',
    shield: 'escudo',
    skillsCount: 2,
    availableSkills: ['Atletismo', 'Intuição', 'Intimidação', 'Medicina', 'Persuasão', 'Religião'],
    slots: [0, 0, 0, 0, 0, 0, 0, 0, 0],
    features: 'Sentido Divino, Cura pelas Mãos (5 PV), Destruição Divina.',
    spells: '',
    spellAbility: 5
  },
  Bárbaro: {
    hitDie: 12,
    primaryStat: 0,
    saves: [0, 2],
    weapon: 'espadão',
    damage: '2d6+3',
    armor: '',
    skillsCount: 2,
    availableSkills: ['Adestrar Animais', 'Atletismo', 'Intimidação', 'Natureza', 'Percepção', 'Sobrevivência'],
    slots: [0, 0, 0, 0, 0, 0, 0, 0, 0],
    features: 'Fúria (+2 dano corpo a corpo, resistência a impacto/corte/perfuração), Defesa sem Armadura (10+DES+CON).',
    spells: ''
  },
  Bardo: {
    hitDie: 8,
    primaryStat: 5,
    saves: [1, 5],
    weapon: 'rapieira',
    damage: '1d8+2',
    armor: 'armadura-de-couro',
    skillsCount: 3,
    availableSkills: ['Acrobacia', 'Atuação', 'Enganação', 'História', 'Intuição', 'Investigação', 'Percepção', 'Persuasão'],
    slots: [2, 0, 0, 0, 0, 0, 0, 0, 0],
    features: 'Inspiração de Bardo (1d6), Conhecimento de Todas as Coisas, Canção de Descanso.',
    spells: 'Curar Ferimentos\nOnda Trovejante',
    spellAbility: 5
  },
  Bruxo: {
    hitDie: 8,
    primaryStat: 5,
    saves: [4, 5],
    weapon: 'adaga',
    damage: '1d4+2',
    armor: 'armadura-de-couro',
    skillsCount: 2,
    availableSkills: ['Arcanismo', 'Enganação', 'História', 'Intimidação', 'Investigação', 'Natureza', 'Religião'],
    slots: [1, 0, 0, 0, 0, 0, 0, 0, 0],
    features: 'Pacto Sobrenatural, Rajada Mística, Espaços de Magia restaurados em descanso curto.',
    spells: 'Rajada Mística\nToque Chocante',
    spellAbility: 5
  },
  Druida: {
    hitDie: 8,
    primaryStat: 4,
    saves: [3, 4],
    weapon: 'cajado-runico',
    damage: '1d6+1',
    armor: 'armadura-de-couro',
    shield: 'escudo',
    skillsCount: 2,
    availableSkills: ['Adestrar Animais', 'Arcanismo', 'Intuição', 'Medicina', 'Natureza', 'Percepção', 'Religião', 'Sobrevivência'],
    slots: [2, 0, 0, 0, 0, 0, 0, 0, 0],
    features: 'Druídico, Conjuração Primitiva, Forma Selvagem.',
    spells: 'Curar Ferimentos\nOnda Trovejante',
    spellAbility: 4
  },
  Feiticeiro: {
    hitDie: 6,
    primaryStat: 5,
    saves: [2, 5],
    weapon: 'adaga',
    damage: '1d4+2',
    armor: '',
    skillsCount: 2,
    availableSkills: ['Arcanismo', 'Enganação', 'Intuição', 'Intimidação', 'Persuasão', 'Religião'],
    slots: [2, 0, 0, 0, 0, 0, 0, 0, 0],
    features: 'Origem de Feitiçaria Inata, Fontes Arcanas de Poder e Metamagia.',
    spells: 'Raio de Fogo\nMísseis Mágicos',
    spellAbility: 5
  },
  Monge: {
    hitDie: 8,
    primaryStat: 1,
    saves: [0, 1],
    weapon: 'cajado-runico',
    damage: '1d6+2',
    armor: '',
    skillsCount: 2,
    availableSkills: ['Acrobacia', 'Atletismo', 'História', 'Intuição', 'Religião', 'Furtividade'],
    slots: [0, 0, 0, 0, 0, 0, 0, 0, 0],
    features: 'Artes Marciais (dano desarmado), Defesa sem Armadura (10+DES+SAB), Energia Ki.',
    spells: ''
  },
  Patrulheiro: {
    hitDie: 10,
    primaryStat: 1,
    saves: [0, 1],
    weapon: 'arco-longo',
    damage: '1d8+2',
    armor: 'armadura-de-couro',
    skillsCount: 3,
    availableSkills: ['Adestrar Animais', 'Atletismo', 'Furtividade', 'Intuição', 'Investigação', 'Natureza', 'Percepção', 'Sobrevivência'],
    slots: [0, 0, 0, 0, 0, 0, 0, 0, 0],
    features: 'Inimigo Favorito, Explorador Natural, Precisão com Arco e Rastreamento.',
    spells: '',
    spellAbility: 4
  }
};

const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];

export function CharacterCreator({ isOpen, onClose, onSave, busy }: CharacterCreatorProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Character Draft State
  const [name, setName] = useState('');
  const [chosenSpecies, setChosenSpecies] = useState('Humano');
  const [chosenClass, setChosenClass] = useState('Guerreiro');
  const [background, setBackground] = useState('Soldado');
  const [baseStats, setBaseStats] = useState<number[]>([15, 14, 13, 12, 10, 8]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>(['Atletismo', 'Intimidação']);
  const [backstory, setBackstory] = useState('');

  if (!isOpen) return null;

  const speciesInfo = SPECIES_TRAITS[chosenSpecies] || SPECIES_TRAITS.Humano;
  const classInfo = CLASS_CONFIGS[chosenClass] || CLASS_CONFIGS.Guerreiro;

  // Final attributes with racial bonus
  const finalStats = baseStats.map((val, idx) => val + speciesInfo.statsBonus[idx]);
  const conMod = mod(finalStats[2]);
  const maxHp = classInfo.hitDie + conMod;

  const handleToggleSkill = (skName: string) => {
    if (selectedSkills.includes(skName)) {
      setSelectedSkills(selectedSkills.filter((s) => s !== skName));
    } else {
      if (selectedSkills.length < classInfo.skillsCount) {
        setSelectedSkills([...selectedSkills, skName]);
      }
    }
  };

  const handleRollRandomStats = () => {
    // 4d6 drop lowest for 6 stats
    const rolled = Array.from({ length: 6 }, () => {
      const dice = Array.from({ length: 4 }, () => Math.floor(Math.random() * 6) + 1);
      dice.sort((a, b) => b - a);
      return dice[0] + dice[1] + dice[2];
    });
    rolled.sort((a, b) => b - a);
    setBaseStats(rolled);
  };

  const handleFinish = async () => {
    const heroName = name.trim() || `Herói de ${chosenSpecies}`;
    const baseHero: Character = {
      ...newCharacter(),
      id: crypto.randomUUID(),
      name: heroName,
      className: chosenClass,
      species: chosenSpecies,
      background,
      level: 1,
      stats: finalStats as [number, number, number, number, number, number],
      skills: selectedSkills,
      saves: classInfo.saves,
      hp: maxHp,
      maxHp,
      speed: speciesInfo.speed,
      slots: classInfo.slots,
      features: `${speciesInfo.desc}\n\n${classInfo.features}`,
      spells: classInfo.spells || '',
      spellAbility: classInfo.spellAbility !== undefined ? classInfo.spellAbility : 3,
      notes: backstory,
      equipment: {
        mainHand: classInfo.weapon,
        armor: classInfo.armor,
        offHand: classInfo.shield
      }
    };

    const calculatedHero = calculateEquippedStats(baseHero);
    await onSave(calculatedHero);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 animate-fade-in select-none">
      <div className="relative w-full max-w-3xl bg-zinc-950 border-2 border-amber-900/70 rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Wizard Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3 bg-gradient-to-r from-zinc-950 to-zinc-900">
          <div className="flex items-center gap-2">
            <User size={20} className="text-amber-400" />
            <h2 className="font-serif font-bold text-amber-200 text-base sm:text-lg">
              Forjar Novo Aventureiro • Passo {step} de 4
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Step Tabs Indicator */}
        <div className="flex items-center justify-between px-4 py-2 bg-black/40 border-b border-zinc-800/80 text-xs font-semibold">
          {[
            { s: 1, label: 'Identidade & Classe' },
            { s: 2, label: 'Atributos' },
            { s: 3, label: 'Perícias' },
            { s: 4, label: 'Resumo & Equipamento' }
          ].map((item) => (
            <button
              key={item.s}
              onClick={() => setStep(item.s as any)}
              className={`flex items-center gap-1 transition-colors ${
                step === item.s
                  ? 'text-amber-400 font-bold border-b-2 border-amber-400 pb-0.5'
                  : step > item.s
                  ? 'text-zinc-400 hover:text-zinc-200'
                  : 'text-zinc-600'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-zinc-800 flex items-center justify-center text-[10px]">
                {item.s}
              </span>
              <span className="hidden sm:inline">{item.label}</span>
            </button>
          ))}
        </div>

        {/* Wizard Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 scrollbar-thin">
          {step === 1 && (
            <div className="space-y-4 animate-slide-up">
              <div>
                <label className="block text-xs uppercase tracking-wider text-amber-400 font-bold mb-1">
                  Nome do Personagem
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Valerius, o Destemido"
                  maxLength={50}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:border-amber-400 outline-none"
                />
              </div>

              {/* Species Selection */}
              <div>
                <label className="block text-xs uppercase tracking-wider text-zinc-400 font-bold mb-2">
                  Escolha a Espécie
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {species.map((sp) => (
                    <button
                      key={sp}
                      onClick={() => setChosenSpecies(sp)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        chosenSpecies === sp
                          ? 'border-amber-400 bg-amber-950/40 text-amber-200 shadow-lg'
                          : 'border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:border-zinc-700'
                      }`}
                    >
                      <strong className="block text-sm">{sp}</strong>
                      <span className="text-[11px] text-zinc-400 line-clamp-2 mt-0.5">
                        {SPECIES_TRAITS[sp]?.desc || 'Aventureiro de Valdoria.'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Class Selection */}
              <div>
                <label className="block text-xs uppercase tracking-wider text-zinc-400 font-bold mb-2">
                  Escolha a Classe
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.keys(CLASS_CONFIGS).map((cl) => (
                    <button
                      key={cl}
                      onClick={() => {
                        setChosenClass(cl);
                        setSelectedSkills(CLASS_CONFIGS[cl].availableSkills.slice(0, CLASS_CONFIGS[cl].skillsCount));
                      }}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        chosenClass === cl
                          ? 'border-amber-400 bg-amber-950/40 text-amber-200 shadow-lg'
                          : 'border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <strong className="block text-sm">{cl}</strong>
                        <span className="text-[10px] font-mono text-amber-400">d{CLASS_CONFIGS[cl].hitDie}</span>
                      </div>
                      <span className="text-[11px] text-zinc-400 line-clamp-2 mt-0.5">
                        {CLASS_CONFIGS[cl].features}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-slide-up">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-zinc-200">Atributos Primários (D&D 5e SRD)</h3>
                  <p className="text-xs text-zinc-400">
                    Bônus da espécie {chosenSpecies} já somados automaticamente.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setBaseStats([15, 14, 13, 12, 10, 8])}
                    className="text-xs px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 rounded-lg transition-colors"
                  >
                    Padrão
                  </button>
                  <button
                    onClick={handleRollRandomStats}
                    className="text-xs px-2.5 py-1 bg-amber-950/60 hover:bg-amber-900/60 text-amber-300 border border-amber-700/60 rounded-lg flex items-center gap-1 transition-colors"
                  >
                    <Dices size={13} /> Rolar 4d6
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {abilities.map((abName, idx) => {
                  const baseVal = baseStats[idx];
                  const racial = speciesInfo.statsBonus[idx];
                  const total = baseVal + racial;
                  const m = mod(total);

                  return (
                    <div
                      key={abName}
                      className="p-3 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex flex-col items-center gap-1 shadow-md"
                    >
                      <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                        {abName}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            const next = [...baseStats];
                            next[idx] = Math.max(6, next[idx] - 1);
                            setBaseStats(next);
                          }}
                          className="w-6 h-6 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700 flex items-center justify-center font-bold"
                        >
                          -
                        </button>
                        <span className="font-serif font-black text-2xl text-amber-300 w-8 text-center">
                          {total}
                        </span>
                        <button
                          onClick={() => {
                            const next = [...baseStats];
                            next[idx] = Math.min(18, next[idx] + 1);
                            setBaseStats(next);
                          }}
                          className="w-6 h-6 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700 flex items-center justify-center font-bold"
                        >
                          +
                        </button>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-zinc-400">
                        <span>Mod: <strong className="text-zinc-200">{signed(m)}</strong></span>
                        {racial > 0 && <span className="text-emerald-400">+{racial} raça</span>}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-xl flex items-center justify-around text-xs font-mono text-zinc-300">
                <span className="flex items-center gap-1">
                  <Heart size={14} className="text-red-400" /> PV Máximos: <strong>{maxHp}</strong>
                </span>
                <span className="flex items-center gap-1">
                  <Footprints size={14} className="text-amber-400" /> Deslocamento: <strong>{speciesInfo.speed}m</strong>
                </span>
                <span className="flex items-center gap-1">
                  <Award size={14} className="text-cyan-400" /> Bônus Proficiência: <strong>+2</strong>
                </span>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 animate-slide-up">
              <div>
                <h3 className="text-sm font-bold text-zinc-200">
                  Perícias de {chosenClass} (Escolha até {classInfo.skillsCount})
                </h3>
                <p className="text-xs text-zinc-400">
                  Selecionadas: {selectedSkills.length} de {classInfo.skillsCount}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {classInfo.availableSkills.map((skName) => {
                  const isSelected = selectedSkills.includes(skName);
                  return (
                    <button
                      key={skName}
                      onClick={() => handleToggleSkill(skName)}
                      className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition-all ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-950/40 text-emerald-200 font-bold'
                          : 'border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:border-zinc-700'
                      }`}
                    >
                      <span>{skName}</span>
                      {isSelected ? <Check size={14} className="text-emerald-400" /> : null}
                    </button>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-zinc-800">
                <label className="block text-xs uppercase tracking-wider text-zinc-400 font-bold mb-1">
                  Antecedente & História
                </label>
                <textarea
                  rows={3}
                  value={backstory}
                  onChange={(e) => setBackstory(e.target.value)}
                  placeholder="Descreva a origem, motivação ou votos sagrados do seu herói..."
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 text-xs text-zinc-200 focus:border-amber-400 outline-none resize-none"
                />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4 animate-slide-up">
              <div className="p-4 bg-gradient-to-br from-zinc-900 to-black border border-amber-900/60 rounded-2xl flex items-center justify-between">
                <div>
                  <h3 className="font-serif font-black text-xl text-amber-200">
                    {name.trim() || 'Herói sem Nome'}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {chosenSpecies} • {chosenClass} Nível 1 • {background}
                  </p>
                </div>
                <div className="text-right font-mono text-xs text-zinc-300">
                  <span className="block text-red-400 font-bold">{maxHp} PV</span>
                  <span className="block text-amber-300 font-bold">{classInfo.shield ? 'CA 18' : 'CA 13+'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 bg-zinc-900/70 border border-zinc-800 rounded-xl space-y-1">
                  <span className="text-[10px] uppercase font-bold text-amber-400 block">Equipamento Padrão</span>
                  <p className="text-zinc-200 capitalize font-medium">{classInfo.weapon.replace('-', ' ')}</p>
                  {classInfo.armor && <p className="text-zinc-300 capitalize">{classInfo.armor.replace('-', ' ')}</p>}
                  {classInfo.shield && <p className="text-zinc-300 capitalize">Escudo de Aço (+2 CA)</p>}
                </div>
                <div className="p-3 bg-zinc-900/70 border border-zinc-800 rounded-xl space-y-1">
                  <span className="text-[10px] uppercase font-bold text-emerald-400 block">Perícias Treinadas</span>
                  <p className="text-zinc-200">{selectedSkills.join(', ') || 'Nenhuma'}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Wizard Footer Navigation Buttons */}
        <div className="flex items-center justify-between border-t border-zinc-800 px-4 py-3 bg-zinc-950">
          {step > 1 ? (
            <button
              onClick={() => setStep((step - 1) as any)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold border border-zinc-700 transition-colors"
            >
              <ChevronLeft size={14} /> Voltar
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              onClick={() => setStep((step + 1) as any)}
              className="flex items-center gap-1 gold-button text-xs py-1.5 px-4"
            >
              Próximo <ChevronRight size={14} />
            </button>
          ) : (
            <button
              disabled={busy}
              onClick={handleFinish}
              className="flex items-center gap-1.5 gold-button text-xs py-2 px-5 font-bold shadow-lg"
            >
              <Sparkles size={14} /> {busy ? 'Forjando…' : 'Concluir & Jogar'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
