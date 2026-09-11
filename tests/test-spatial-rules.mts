// tests/test-spatial-rules.mts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getGridDistance,
  getDistanceMeters,
  getWeaponMaxRange,
  getSpellMaxRange,
  validateAttackRange,
  validateSpellRange,
  validateMovement,
  determineAttackMode,
  resolveAttack,
  applyCondition,
  hasCondition,
  removeCondition
} from '../lib/game-engine.ts';

const BASE_URL = 'http://localhost:5173';

describe('Module 3 & 4: Tactical Spatial Rules & Structured Conditions', () => {
  describe('Engine Unit Tests: Spatial Calculations & Rules', () => {
    it('should compute correct grid distances and metric conversions (5e Chebyshev)', () => {
      // Orthogonal distance
      assert.equal(getGridDistance({ x: 2, y: 2 }, { x: 5, y: 2 }), 3);
      assert.equal(getDistanceMeters({ x: 2, y: 2 }, { x: 5, y: 2 }), 4.5);

      // Diagonal distance (1 square per diagonal in 5e grid)
      assert.equal(getGridDistance({ x: 2, y: 2 }, { x: 5, y: 5 }), 3);
      assert.equal(getDistanceMeters({ x: 2, y: 2 }, { x: 5, y: 5 }), 4.5);

      // Asymmetric move
      assert.equal(getGridDistance({ x: 1, y: 1 }, { x: 4, y: 2 }), 3);
      assert.equal(getDistanceMeters({ x: 1, y: 1 }, { x: 4, y: 2 }), 4.5);
    });

    it('should evaluate correct weapon ranges and reaches', () => {
      // Standard Melee
      const longsword = getWeaponMaxRange('Espada Longa');
      assert.equal(longsword.rangeSquares, 1);
      assert.equal(longsword.isRanged, false);

      // Reach Weapon (Lança / Glaive)
      const spear = getWeaponMaxRange('Lança');
      assert.equal(spear.rangeSquares, 2);
      assert.equal(spear.isRanged, false);

      // Ranged Weapon (Arco Curto)
      const shortbow = getWeaponMaxRange('Arco Curto');
      assert.equal(shortbow.rangeSquares, 12);
      assert.equal(shortbow.isRanged, true);

      // Ranged Weapon (Arco Longo)
      const longbow = getWeaponMaxRange('Arco Longo');
      assert.equal(longbow.rangeSquares, 18);
      assert.equal(longbow.isRanged, true);

      // Thrown Weapon (Adaga)
      const dagger = getWeaponMaxRange('Adaga');
      assert.equal(dagger.rangeSquares, 4);
      assert.equal(dagger.isRanged, true);
    });

    it('should validate attack ranges according to weapon properties', () => {
      const hero = { x: 2, y: 2, weapon: 'Espada Longa' };
      const adjacentEnemy = { x: 3, y: 3 }; // dist 1
      const distantEnemy = { x: 4, y: 4 };  // dist 2

      // Melee vs adjacent
      const meleeAdj = validateAttackRange(hero, adjacentEnemy);
      assert.equal(meleeAdj.inRange, true);
      assert.equal(meleeAdj.distance, 1);

      // Melee vs distant
      const meleeDist = validateAttackRange(hero, distantEnemy);
      assert.equal(meleeDist.inRange, false);
      assert.equal(meleeDist.distance, 2);

      // Shortbow vs distant
      const archer = { x: 2, y: 2, weapon: 'Arco Curto' };
      const archerCheck = validateAttackRange(archer, { x: 12, y: 2 }); // dist 10
      assert.equal(archerCheck.inRange, true);
      assert.equal(archerCheck.distance, 10);

      // Shortbow beyond range (> 12)
      const archerTooFar = validateAttackRange(archer, { x: 16, y: 2 }); // dist 14
      assert.equal(archerTooFar.inRange, false);
    });

    it('should validate spell casting ranges', () => {
      const caster = { x: 2, y: 2 };
      
      // Fire Bolt (Raio de Fogo) - long range
      const fireBoltInRange = validateSpellRange(caster, { x: 10, y: 10 }, 'Raio de Fogo');
      assert.equal(fireBoltInRange.inRange, true);

      // Shocking Grasp (Toque Chocante) - touch range (1 square)
      const shockingGraspDist = validateSpellRange(caster, { x: 4, y: 4 }, 'Toque Chocante');
      assert.equal(shockingGraspDist.inRange, false);
      assert.equal(shockingGraspDist.maxRange, 1);
    });

    it('should validate movement budget and bounds during combat and exploration', () => {
      const char: any = {
        id: 'hero_test',
        x: 2,
        y: 2,
        speed: 9, // 9m = 6 squares
        conditions: []
      };

      const outOfCombatState: any = { combat: false };

      // Out of combat: destination within bounds is allowed
      const oocMove = validateMovement(char, { x: 8, y: 8 }, outOfCombatState);
      assert.equal(oocMove.valid, true);

      // Destination out of board bounds: rejected
      const oobMove = validateMovement(char, { x: 25, y: 2 }, outOfCombatState);
      assert.equal(oobMove.valid, false);
      assert.match(oobMove.reason || '', /fora dos limites/);

      // In Combat: valid movement within speed budget (6 squares)
      const inCombatState: any = {
        combat: true,
        order: ['hero_test', 'enemy_1'],
        turn: 0,
        movementUsed: 0
      };
      const validCombatMove = validateMovement(char, { x: 6, y: 2 }, inCombatState); // 4 squares
      assert.equal(validCombatMove.valid, true);

      // In Combat: exceeding speed budget in single turn (7 squares > 6 allowed)
      const overbudgetMove = validateMovement(char, { x: 9, y: 2 }, inCombatState);
      assert.equal(overbudgetMove.valid, false);
      assert.match(overbudgetMove.reason || '', /Deslocamento insuficiente/);

      // In Combat: not player's turn
      const notMyTurnState: any = {
        combat: true,
        order: ['enemy_1', 'hero_test'],
        turn: 0,
        movementUsed: 0
      };
      const notMyTurnMove = validateMovement(char, { x: 3, y: 2 }, notMyTurnState);
      assert.equal(notMyTurnMove.valid, false);
      assert.match(notMyTurnMove.reason || '', /Aguarde o seu turno/);

      // Incapacitated hero cannot move
      char.conditions = ['Incapacitado'];
      const stunnedMove = validateMovement(char, { x: 3, y: 2 }, outOfCombatState);
      assert.equal(stunnedMove.valid, false);
      assert.match(stunnedMove.reason || '', /incapacitado/);
    });

    it('should manage structured conditions and apply 5e tactical modifiers', () => {
      const entity: { conditions: string[] } = { conditions: [] };

      // Add condition
      assert.equal(hasCondition(entity, 'Caído'), false);
      applyCondition(entity, 'Caído');
      assert.equal(hasCondition(entity, 'Caído'), true);

      // Duplicate apply is no-op
      applyCondition(entity, 'Caído');
      assert.equal(entity.conditions.length, 1);

      // 5e Prone target: Melee attack gets ADVANTAGE; Ranged attack gets DISADVANTAGE
      const meleeMode = determineAttackMode([], entity.conditions, 'normal', false);
      assert.equal(meleeMode, 'advantage', 'Melee attack against prone target should have Advantage');

      const rangedMode = determineAttackMode([], entity.conditions, 'normal', true);
      assert.equal(rangedMode, 'disadvantage', 'Ranged attack against prone target should have Disadvantage');

      // Bless condition: adds +1d4 roll bonus
      const blessedAttacker = {
        name: 'Paladino',
        attack: 5,
        damage: '1d8+3',
        conditions: ['Abençoado']
      };
      const target = { name: 'Orc', ac: 13, hp: 20 };
      const attackRes = resolveAttack(blessedAttacker, target);
      assert.match(attackRes.text, /Bênção/, 'Attack log should indicate Bless bonus');

      // Remove condition
      removeCondition(entity, 'Caído');
      assert.equal(hasCondition(entity, 'Caído'), false);
    });
  });

  describe('Server API Live Integration: Server-Authoritative Spatial Enforcement', () => {
    it('should reject melee attack when target is out of range, and succeed after moving in range', async () => {
      // 1. Create fresh session
      const getRes = await fetch(`${BASE_URL}/api/game`);
      const setCookie = getRes.headers.get('set-cookie') || '';
      const cookie = `lume_session_id=${/lume_session_id=([^;]+)/.exec(setCookie)?.[1] || ''}`;
      const initialData = await getRes.json();
      const roomId = initialData.room.id;
      let version = initialData.room.version;

      // 2. Create Hero at position (2, 2) with standard melee weapon (Espada Longa)
      const heroId = `hero_${Date.now()}`;
      const charRes = await fetch(`${BASE_URL}/api/game`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({
          room: roomId,
          version,
          action: 'character',
          character: {
            id: heroId,
            name: 'Cavaleiro Valente',
            className: 'Guerreiro',
            species: 'Humano',
            background: 'Soldado',
            level: 1,
            stats: [16, 12, 14, 10, 10, 8],
            skills: ['Atletismo'],
            expertise: [],
            saves: [0, 2],
            hp: 12,
            maxHp: 12,
            ac: 16,
            speed: 9,
            attack: 5,
            damage: '1d8+3',
            weapon: 'Espada Longa',
            spellAbility: 0,
            slots: [0, 0, 0, 0, 0, 0, 0, 0, 0],
            usedSlots: [0, 0, 0, 0, 0, 0, 0, 0, 0],
            features: '',
            spells: '',
            inventory: '',
            notes: '',
            conditions: [],
            x: 2,
            y: 1,
            xp: 0,
            initiative: 0,
            deathSuccess: 0,
            deathFail: 0,
            exhaustion: 0,
            equipment: {
              mainHand: 'espada-longa',
              armor: 'cota-de-malha'
            }
          }
        })
      });
      assert.equal(charRes.status, 200);
      const charData = await charRes.json();
      version = charData.room.version;

      // 3. Start Encounter (spawns Sentinela de Cinzas at (7, 3))
      const encRes = await fetch(`${BASE_URL}/api/game`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({
          room: roomId,
          version,
          action: 'encounter'
        })
      });
      assert.equal(encRes.status, 200);
      const encData = await encRes.json();
      version = encData.room.version;
      const enemy = encData.room.state.enemies[0];
      assert.ok(enemy, 'Encounter should spawn at least 1 enemy');
      const distToEnemy = Math.max(Math.abs(enemy.x - 2), Math.abs(enemy.y - 1));
      assert.ok(distToEnemy > 1, `Enemy should be spawned out of melee range (distance was ${distToEnemy})`);

      // Distance from Hero (2, 1) to Enemy (7, 3) is max(5, 2) = 5 squares (> 1 square melee reach)

      // 4. Attempt Melee Attack out of range -> MUST BE REJECTED (HTTP 400)
      const outOfRangeAttackRes = await fetch(`${BASE_URL}/api/game`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({
          room: roomId,
          version,
          action: 'attack',
          character: heroId,
          targetId: enemy.id
        })
      });
      assert.equal(outOfRangeAttackRes.status, 400, 'Attack out of melee range must return 400');
      const outOfRangeData = await outOfRangeAttackRes.json();
      assert.match(outOfRangeData.error, /fora do alcance da arma/, 'Error must state target is out of weapon range');

      // 5. Attempt to move into an impassable house obstacle tile in village -> MUST BE REJECTED (HTTP 400)
      // House 1 and 2 in village block tile (0, 1)
      const obstacleMoveRes = await fetch(`${BASE_URL}/api/game`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({
          room: roomId,
          version,
          action: 'move',
          character: heroId,
          x: 0,
          y: 1 // Inside house 1 and 2
        })
      });
      assert.equal(obstacleMoveRes.status, 400, 'Moving into impassable house obstacle must return 400');
      const obstacleData = await obstacleMoveRes.json();
      assert.match(obstacleData.error, /Destino intransponível|obstáculo/, 'Error must state destination is blocked');

      // 6. Move through the open street Zone 21 to (1, 1) -> SUCCEEDS
      const streetMoveRes = await fetch(`${BASE_URL}/api/game`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({
          room: roomId,
          version,
          action: 'move',
          character: heroId,
          x: 1,
          y: 1 // Open street
        })
      });
      assert.equal(streetMoveRes.status, 200, 'Moving onto open street must succeed');
      const streetData = await streetMoveRes.json();
      version = streetData.room.version;
      const updatedHero = streetData.room.state.characters.find((c: any) => c.id === heroId);
      assert.equal(updatedHero.x, 1);
      assert.equal(updatedHero.y, 1);
    });
  });
});
