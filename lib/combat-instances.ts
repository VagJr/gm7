import type { State, Character } from './game-engine';

export const COMBAT_FIELDS = ['combat','order','turn','round','combatMode','combatPartyId','actionUsed','bonusActionUsed','movementUsed','movementBonusSquares','disengagedActorId','spellSlotUsedThisTurn','reactionUsedBy','reactionPolicyBy'] as const;
export type CombatSnapshot = Pick<State, typeof COMBAT_FIELDS[number]>;
export const combatKey = (hero: Pick<Character,'id'|'partyId'>) => hero.partyId || hero.id;
export function emptyCombat(): CombatSnapshot { return {combat:false,order:[],turn:0,round:1,combatMode:'tactical',actionUsed:false,bonusActionUsed:false,movementUsed:0,movementBonusSquares:0,spellSlotUsedThisTurn:false,reactionUsedBy:{},reactionPolicyBy:{}}; }
function snapshot(state: State): CombatSnapshot { return Object.fromEntries(COMBAT_FIELDS.map(field=>[field,structuredClone(state[field])])) as CombatSnapshot; }
export function ensureCombatInstances(state: State) {
  if (state.combats) return;
  state.combats = {};
  if (state.combat) {
    const hero = state.characters.find(c=>state.order.includes(c.id));
    if (hero) state.combats[combatKey(hero)] = snapshot(state);
  }
}
export function activateCombat(state: State, hero?: Character) {
  ensureCombatInstances(state);
  if (!hero) return;
  const value=state.combats![combatKey(hero)] || emptyCombat();
  for(const field of COMBAT_FIELDS) (state as unknown as Record<string,unknown>)[field]=structuredClone(value[field]);
}
export function persistCombat(state: State, hero?: Character) {
  if (!hero) return;
  ensureCombatInstances(state);
  state.combats![combatKey(hero)]=snapshot(state);
}
export function projectCombat(state: State, hero?: Character): State {
  if(!hero || !state.combats) return state;
  return {...state,...(state.combats[combatKey(hero)] || emptyCombat())};
}
