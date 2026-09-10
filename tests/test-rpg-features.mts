import assert from 'node:assert/strict';
import {
  newCharacter,
  calculateEquippedStats,
  resolveAttack,
  ITEMS_CATALOG,
  SPELLS_CATALOG,
  TACTICAL_ACTIONS
} from '../lib/game-engine.ts';

console.log('Testing RPG Features...');

// 1. New character and paper doll equipping
const c = newCharacter();
assert.equal(c.className, 'Guerreiro');
assert.equal(c.weapon, 'Espada Longa');
assert.equal(c.ac, 18); // Cota de Malha (16) + Escudo (+2)

// Change weapon to Rapieira
c.equipment = {
  ...c.equipment,
  mainHand: 'rapieira'
};
const updated = calculateEquippedStats(c);
assert.equal(updated.weapon, 'Rapieira Élfica');
// Rapieira is finesse, uses max(STR=15, DEX=14) -> STR=15 (+2) + prof(1)=2 -> +4 attack, 1d8+2
assert.equal(updated.attack, 4);
assert.equal(updated.damage, '1d8+2');

// Change armor to Leather (baseAc 12 + DEX mod 2 = 14) + Shield (+2) = 16
c.equipment = {
  ...c.equipment,
  armor: 'armadura-de-couro'
};
const updated2 = calculateEquippedStats(c);
assert.equal(updated2.ac, 16);

// Unequip shield
delete c.equipment.offHand;
const updated3 = calculateEquippedStats(c);
assert.equal(updated3.ac, 14);

// 2. resolveAttack
const enemy = { id: 'test-enemy', name: 'Goblin', ac: 10, hp: 15, maxHp: 15 };
const result = resolveAttack({ name: 'Arin', attack: 5, damage: '1d8+3' }, enemy, 'normal');
assert(typeof result.hit === 'boolean');
assert(typeof result.d20Roll === 'number');
assert(typeof result.totalAttack === 'number');
assert(typeof result.damage === 'number');
assert(result.hpBefore === 15);
assert(result.hpAfter <= 15);
assert(result.targetId === 'test-enemy');

// 3. Catalogs
assert(Object.keys(ITEMS_CATALOG).length >= 10);
assert(SPELLS_CATALOG.length >= 6);
assert(TACTICAL_ACTIONS.length >= 5);

console.log('PASS: Paper doll equipment auto-calculation, weapon damage/AC update, resolveAttack structured FX result, item and spell catalogs validated.');
