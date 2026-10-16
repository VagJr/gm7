import { newCharacter, mod, getSpellSlotsForClass, type Character } from './game-engine';
import { CAMPAIGN_PROOF_VERSION } from './campaign-progression';
export const ORIGIN_BACKGROUNDS: Record<string, number[]> = { 'Soldado': [0, 1, 2], 'Criminoso': [1, 2, 3], 'Sábio': [2, 3, 4], 'Acólito': [3, 4, 5] };
export function defaultOriginBonus(background: string): number[] {
  const allowed = ORIGIN_BACKGROUNDS[background] || ORIGIN_BACKGROUNDS.Soldado;
  return Array.from({ length: 6 }, (_, i) => i === allowed[0] ? 2 : i === allowed[1] ? 1 : 0);
}
export function speciesSpeed(species: string) { return species === 'Golias' ? 10.5 : 9; }
const classRules: Record<string, { die: number; saves: number[]; mainHand: string; armor?: string; offHand?: string }> = {
  'Guerreiro': { die: 10, saves: [0,2], mainHand: 'espada-longa', armor: 'cota-de-malha', offHand: 'escudo' },
  'Mago': { die: 6, saves: [3,4], mainHand: 'cajado-runico' },
  'Clérigo': { die: 8, saves: [4,5], mainHand: 'maca', armor: 'cota-de-malha', offHand: 'escudo' },
  'Ladino': { die: 8, saves: [1,3], mainHand: 'adaga', armor: 'armadura-de-couro' },
  'Paladino': { die: 10, saves: [4,5], mainHand: 'espada-longa', armor: 'cota-de-malha', offHand: 'escudo' },
  'Bárbaro': { die: 12, saves: [0,2], mainHand: 'machado-grande' },
  'Bardo': { die: 8, saves: [1,5], mainHand: 'rapieira', armor: 'armadura-de-couro' },
  'Bruxo': { die: 8, saves: [4,5], mainHand: 'cajado-runico', armor: 'armadura-de-couro' },
  'Druida': { die: 8, saves: [3,4], mainHand: 'cajado', armor: 'armadura-de-couro', offHand: 'escudo' },
  'Feiticeiro': { die: 6, saves: [2,5], mainHand: 'cajado-runico' },
  'Monge': { die: 8, saves: [0,1], mainHand: 'cajado' },
  'Patrulheiro': { die: 10, saves: [0,1], mainHand: 'arco-longo', armor: 'armadura-de-couro' },
};
// SRD 5.2.1: origin bonuses come from backgrounds, not species.
export function createAuthoritativeHero(draft: Character): Character {
  const rule = classRules[draft.className];
  const allowed = ORIGIN_BACKGROUNDS[draft.background];
  const bonuses = draft.originBonuses || defaultOriginBonus(draft.background);
  if (!rule || !allowed || bonuses.length !== 6 || bonuses.some((n,i) => !Number.isInteger(n) || n < 0 || n > 2 || (n && !allowed.includes(i))) || bonuses.reduce((a,b) => a+b,0) !== 3 || bonuses.filter(n=>n===2).length > 1) throw Error('Escolha um antecedente SRD e seus bônus de atributos.');
  const base = draft.stats.map((n,i) => n - bonuses[i]);
  const costs = [0,1,2,3,4,5,7,9];
  if (base.some(n => !Number.isInteger(n) || n < 8 || n > 15) || base.reduce((total,n)=>total+costs[n-8],0) > 27) throw Error('Distribua até 27 pontos entre atributos de 8 a 15, antes dos bônus do antecedente.');
  const hp = rule.die + mod(draft.stats[2]) + (draft.species === 'Anão' ? 1 : 0);
  const abilities:Record<string,number>={Mago:3,'Clérigo':4,Druida:4,Patrulheiro:4,Paladino:5,Bardo:5,Bruxo:5,Feiticeiro:5};
  return { ...newCharacter(), campaignProofVersion: CAMPAIGN_PROOF_VERSION, campaignProof:{}, id: crypto.randomUUID(), name: draft.name, className: draft.className, species: draft.species, background: draft.background, originBonuses: bonuses, stats: draft.stats, skills: [...new Set(draft.skills || [])].slice(0,5), saves: rule.saves, level: 1, hp, maxHp: hp, speed: speciesSpeed(draft.species), portrait: Number.isInteger(draft.portrait) && draft.portrait! >= 0 && draft.portrait! < 24 ? draft.portrait : undefined, notes: String(draft.notes || '').slice(0,2000), features: String(draft.features || '').slice(0,2000), knownCantrips: draft.knownCantrips, preparedSpells: draft.preparedSpells, spellbook: draft.spellbook, spells: draft.spells, spellSelectionVersion: draft.spellSelectionVersion, spellAbility: abilities[draft.className]??3, slots: getSpellSlotsForClass(draft.className, 1), equipment: { mainHand: rule.mainHand, armor: rule.armor, offHand: rule.offHand } };
}
