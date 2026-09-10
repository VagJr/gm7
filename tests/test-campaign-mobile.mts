// tests/test-campaign-mobile.mts
import assert from 'node:assert';
import { generateProceduralDungeon } from '../lib/dungeon-generator.ts';
import { CAMPAIGN_ACTS } from '../lib/campaign-data.ts';
import { generateRandomNpc } from '../lib/npc-generator.ts';
import { resolveAttack, starterState } from '../lib/game-engine.ts';

console.log('Testing Campaign, Procedural Dungeon & Combat Synchronization...');

// 1. Test Procedural Dungeon Generator
const d8 = generateProceduralDungeon(1, 8, 42);
assert.strictEqual(d8.width, 8);
assert.strictEqual(d8.height, 8);
assert.strictEqual(d8.tiles.length, 8);
assert.strictEqual(d8.tiles[0].length, 8);
assert.ok(d8.tiles.some(row => row.some(t => t.type === 'pillar')), '8x8 should contain pillars');
assert.ok(d8.tiles.some(row => row.some(t => t.type === 'chest')), '8x8 should contain a chest');
assert.ok(d8.tiles.some(row => row.some(t => t.type === 'shrine')), '8x8 should contain a shrine');

const d12 = generateProceduralDungeon(2, 12, 99);
assert.strictEqual(d12.width, 12);
assert.strictEqual(d12.height, 12);
assert.ok(d12.rooms.length >= 2, '12x12 should have multiple rooms/chambers');
assert.ok(d12.tiles.some(row => row.some(t => t.type === 'stairs')), '12x12 should contain stairs');

// 2. Test Campaign Acts
assert.strictEqual(CAMPAIGN_ACTS[1].act, 1);
assert.strictEqual(CAMPAIGN_ACTS[1].bossName, 'Sentinela de Cinzas');
assert.strictEqual(CAMPAIGN_ACTS[2].act, 2);
assert.strictEqual(CAMPAIGN_ACTS[2].bossName, 'Guardião Espectral');
assert.strictEqual(CAMPAIGN_ACTS[3].act, 3);
assert.strictEqual(CAMPAIGN_ACTS[3].bossName, 'Malakor, o Lorde das Cinzas');
assert.ok(CAMPAIGN_ACTS[1].objectives.length >= 3);
assert.ok(CAMPAIGN_ACTS[2].objectives.length >= 3);
assert.ok(CAMPAIGN_ACTS[3].objectives.length >= 3);

// 3. Test NPC Generator
const npc1 = generateRandomNpc(101);
assert.ok(npc1.id.startsWith('npc-'));
assert.ok(npc1.name.length > 3);
assert.ok(npc1.options.length >= 3);
assert.ok(['aliado', 'neutro', 'misterioso', 'hostil'].includes(npc1.archetype));

// 4. Test Combat Damage & HP Reduction (Zero Refill/Desync)
const state = starterState('test-user');
const hero = state.characters[0];
const target = { id: 'sentinela', name: 'Sentinela de Cinzas', ac: 10, hp: 11, maxHp: 11 };

// Simulate multiple attacks
let totalDamage = 0;
for (let i = 0; i < 5; i++) {
  if (target.hp <= 0) break;
  const initialHp = target.hp;
  const res = resolveAttack({ name: hero.name, attack: 10, damage: '1d6+2' }, target);
  if (res.hit) {
    assert.strictEqual(target.hp, Math.max(0, initialHp - res.damage), 'Target HP must reduce by exact damage (floored at 0)');
    assert.ok(target.hp <= initialHp, 'HP must never increase upon taking damage');
    totalDamage += res.damage;
  }
}
assert.ok(target.hp < 11, 'Enemy HP must be reduced after hits');

console.log('PASS: Procedural dungeon, 3-act campaign data, NPC generator, and combat HP persistence verified.');
