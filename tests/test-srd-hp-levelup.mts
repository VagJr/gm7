// tests/test-srd-hp-levelup.mts
import assert from 'node:assert';
import {
  calculateEquippedStats,
  DND_5E_XP_TABLE,
  getXpForNextLevel,
  canLevelUp,
  isAsiLevel,
  getSpellSlotsForClass,
  SPELLS_CATALOG,
  newCharacter,
  type Character
} from '../lib/game-engine.ts';

async function runUnitTests() {
  console.log('=== [1] ENGINE UNIT TESTS: D&D 5e RULES & STATS ===');

  // 1. Barbarian Unarmored Defense (10 + DEX + CON)
  const barbarian: Character = {
    ...newCharacter(),
    name: 'Grom Garra-de-Ferro',
    className: 'Bárbaro',
    species: 'Orc',
    stats: [16, 14, 14, 8, 10, 8], // FOR 16 (+3), DES 14 (+2), CON 14 (+2)
    equipment: { mainHand: 'espadão' }
  };

  const barbStats = calculateEquippedStats(barbarian);
  console.log(`Barbarian Unarmored AC: ${barbStats.ac} (expected 14 = 10 + DES 2 + CON 2)`);
  assert.strictEqual(barbStats.ac, 14, 'Barbarian unarmored defense should equal 10 + DES + CON');
  assert.strictEqual(barbStats.weapon, 'Espadão de Batalha');
  assert.strictEqual(barbStats.damage, '2d6+3', 'Greatsword should be 2d6+3 with STR +3');
  assert.strictEqual(barbStats.attack, 5, 'Attack bonus should be +3 (STR) + 2 (Prof) = +5');

  // With Shield (Barbarian allows shield with Unarmored Defense in 5e)
  barbarian.equipment!.offHand = 'escudo';
  const barbShieldStats = calculateEquippedStats(barbarian);
  console.log(`Barbarian with Shield AC: ${barbShieldStats.ac} (expected 16 = 14 + 2)`);
  assert.strictEqual(barbShieldStats.ac, 16, 'Barbarian with shield should have AC 16');

  // 2. Monk Unarmored Defense (10 + DEX + WIS) - no shield allowed
  const monk: Character = {
    ...newCharacter(),
    name: 'Li',
    className: 'Monge',
    species: 'Humano',
    stats: [10, 16, 12, 10, 16, 8], // FOR 10 (+0), DES 16 (+3), CON 12 (+1), SAB 16 (+3)
    equipment: {}
  };
  const monkStats = calculateEquippedStats(monk);
  console.log(`Monk Unarmored AC: ${monkStats.ac} (expected 16 = 10 + DES 3 + SAB 3)`);
  assert.strictEqual(monkStats.ac, 16, 'Monk unarmored defense should equal 10 + DES + WIS');

  // 3. Spells Catalog & Class Restrictions
  console.log('Verifying spells catalog class restrictions...');
  const fireBolt = SPELLS_CATALOG.find((s) => s.id === 'raio-de-fogo');
  assert.ok(fireBolt?.classes?.includes('Mago'), 'Fire bolt should be available to Mago');
  assert.ok(!fireBolt?.classes?.includes('Bárbaro'), 'Fire bolt should NOT be available to Bárbaro');

  const eldritchBlast = SPELLS_CATALOG.find((s) => s.id === 'rajada-mistica');
  assert.ok(eldritchBlast?.classes?.includes('Bruxo'), 'Eldritch blast should be available to Bruxo');
  assert.ok(!eldritchBlast?.classes?.includes('Guerreiro'), 'Eldritch blast should NOT be available to Guerreiro');

  // 4. XP Progression & Level Up Check
  console.log('Verifying XP table and progression...');
  assert.strictEqual(DND_5E_XP_TABLE[0], 0);
  assert.strictEqual(DND_5E_XP_TABLE[1], 300);
  assert.strictEqual(DND_5E_XP_TABLE[2], 900);
  assert.strictEqual(DND_5E_XP_TABLE[3], 2700);
  assert.strictEqual(DND_5E_XP_TABLE[4], 6500);

  barbarian.level = 1;
  barbarian.xp = 250;
  assert.strictEqual(canLevelUp(barbarian), false, '250 XP should not be enough for Level 2');
  barbarian.xp = 300;
  assert.strictEqual(canLevelUp(barbarian), true, '300 XP should allow leveling up to Level 2');

  // 5. ASI Levels
  assert.strictEqual(isAsiLevel('Guerreiro', 4), true);
  assert.strictEqual(isAsiLevel('Guerreiro', 6), true); // Fighter gets ASI at 6
  assert.strictEqual(isAsiLevel('Mago', 4), true);
  assert.strictEqual(isAsiLevel('Mago', 6), false);

  // 6. Spell Slots
  const wizardSlotsLvl1 = getSpellSlotsForClass('Mago', 1);
  assert.strictEqual(wizardSlotsLvl1[0], 2);
  const wizardSlotsLvl3 = getSpellSlotsForClass('Mago', 3);
  assert.strictEqual(wizardSlotsLvl3[0], 4);
  assert.strictEqual(wizardSlotsLvl3[1], 2);

  const barbSlots = getSpellSlotsForClass('Bárbaro', 5);
  assert.strictEqual(barbSlots[0], 0, 'Barbarian should have 0 spell slots');

  console.log('✅ Unit Tests Passed Successfully!\n');
}

async function runApiIntegrationTests() {
  console.log('=== [2] API INTEGRATION TESTS (HP DAMAGE, LEVEL UP, COMBAT) ===');
  const baseUrl = 'http://localhost:5173';

  // 1. Authenticate with dev cookie
  const cookie = 'auth_session=' + Buffer.from(JSON.stringify({
    userId: 'test-srd-runner',
    displayName: 'Mestre SRD'
  })).toString('base64');
  const headers = { Cookie: cookie, 'Content-Type': 'application/json' };

  // 2. Create Room
  const createRes = await fetch(`${baseUrl}/api/game`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ action: 'create', name: 'Sala Teste HP e Leveling SRD' })
  });
  assert.strictEqual(createRes.status, 200);
  const createData = await createRes.json() as any;
  const roomId = createData.id;
  console.log(`✅ Created test room: ${roomId}`);

  // Fetch room to get fresh version
  const roomRes = await fetch(`${baseUrl}/api/game?room=${roomId}`, { headers });
  let roomData = await roomRes.json() as any;
  let roomVersion = roomData.room.version;

  // 3. Add an Orc Barbarian Character (Authentic 5e rules, no spells)
  const addHeroRes = await fetch(`${baseUrl}/api/game`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      room: roomId,
      version: roomVersion,
      action: 'character',
      value: {
        ...newCharacter(),
        id: 'hero_grom',
        name: 'Grom Garra-de-Ferro',
        species: 'Orc',
        className: 'Bárbaro',
        background: 'Soldado',
        level: 1,
        xp: 0,
        hp: 15,
        maxHp: 15,
        ac: 14,
        speed: 9,
        stats: [16, 14, 14, 8, 10, 8],
        skills: ['Atletismo', 'Intimidação'],
        expertise: [],
        saves: [0, 2],
        conditions: [],
        spells: '', // Barbarian starts with NO spells!
        slots: [0, 0, 0, 0, 0, 0, 0, 0, 0],
        usedSlots: [0, 0, 0, 0, 0, 0, 0, 0, 0],
        features: 'Fúria Bárbara',
        inventory: 'Espadão de Batalha\nPoção de Cura (2)',
        notes: '',
        equipment: { mainHand: 'espadão' },
        x: 6,
        y: 3,
        spellAbility: 0,
        exhaustion: 0
      }
    })
  });
  assert.strictEqual(addHeroRes.status, 200);
  const heroRoomData = await addHeroRes.json() as any;
  roomVersion = heroRoomData.room.version;
  const hero = heroRoomData.room.state.characters.find((c: any) => c.id === 'hero_grom');
  assert.ok(hero, 'Hero must be added to party');
  assert.strictEqual(hero.spells, '', 'Barbarian should start with empty spells');
  assert.strictEqual(hero.ac, 14, 'Barbarian AC must reflect 10 + DES 2 + CON 2 = 14');
  console.log(`✅ Created Hero: ${hero.name} (${hero.className}) - HP: ${hero.hp}/${hero.maxHp}, CA: ${hero.ac}`);

  // 4. Start Encounter
  console.log('Initiating combat encounter...');
  const encRes = await fetch(`${baseUrl}/api/game`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ room: roomId, version: roomVersion, action: 'encounter' })
  });
  assert.strictEqual(encRes.status, 200);
  const encData = await encRes.json() as any;
  roomVersion = encData.room.version;
  assert.strictEqual(encData.room.state.combat, true, 'Combat must be active');
  assert.ok(encData.room.state.enemies.length > 0, 'Enemies must be spawned');

  const initialEnemy = encData.room.state.enemies[0];
  const initialEnemyHp = initialEnemy.hp;
  console.log(`Spawned enemy: ${initialEnemy.name} (HP: ${initialEnemyHp}/${initialEnemy.maxHp})`);

  // 5. Perform Attack on Enemy and VERIFY HP DECREASES
  console.log('Attacking enemy and verifying HP decrease...');
  let currentEnemyHp = initialEnemyHp;
  let attackCount = 0;
  let hitCount = 0;

  while (attackCount < 10 && currentEnemyHp > 0) {
    attackCount++;
    const atkRes = await fetch(`${baseUrl}/api/game`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        room: roomId,
        version: roomVersion,
        action: 'attack',
        character: 'hero_grom',
        targetId: initialEnemy.id,
        mode: 'advantage' // Use advantage to ensure hits
      })
    });
    assert.strictEqual(atkRes.status, 200);
    const atkData = await atkRes.json() as any;
    roomVersion = atkData.room.version;
    const atkResult = atkData.attackResult;

    if (atkResult && atkResult.hit) {
      hitCount++;
      const updatedEnemy = atkData.room.state.enemies.find((e: any) => e.id === initialEnemy.id);
      console.log(`⚔️ Hit #${hitCount}! Damage dealt: ${atkResult.damage}. Enemy HP went from ${atkResult.hpBefore} to ${atkResult.hpAfter}`);
      
      // CRITICAL ASSERTION: The enemy HP in the state must equal hpAfter!
      if (updatedEnemy && updatedEnemy.hp > 0) {
        assert.strictEqual(updatedEnemy.hp, atkResult.hpAfter, 'Enemy HP in room state MUST decrease to hpAfter');
        assert.ok(updatedEnemy.hp < atkResult.hpBefore, 'Enemy HP MUST be lower than hpBefore');
        currentEnemyHp = updatedEnemy.hp;
      } else {
        console.log(`💀 Enemy ${initialEnemy.name} was defeated!`);
        currentEnemyHp = 0;
      }
    }

    // Pass turn to reset action for next test iteration if still in combat
    if (atkData.room.state.combat) {
      const passRes = await fetch(`${baseUrl}/api/game`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ room: roomId, version: roomVersion, action: 'pass', character: 'hero_grom' })
      });
      if (passRes.status === 200) {
        const passData = await passRes.json() as any;
        roomVersion = passData.room.version;
      }
    }
  }

  assert.ok(hitCount > 0, 'At least one attack should have hit with advantage');
  console.log('✅ VERIFIED: Enemy HP decreases properly upon taking damage!');

  // End combat cleanly if still active
  const endCombatRes = await fetch(`${baseUrl}/api/game`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ room: roomId, version: roomVersion, action: 'endCombat' })
  });
  if (endCombatRes.status === 200) {
    const endData = await endCombatRes.json() as any;
    roomVersion = endData.room.version;
  }

  // 6. Test Level Up Mechanics via API
  console.log('\nTesting Level Up mechanics via API...');
  // Give hero enough XP for Level 2 (350 XP > 300 XP)
  const currentHero = (await (await fetch(`${baseUrl}/api/game?room=${roomId}`, { headers })).json() as any).room.state.characters.find((c: any) => c.id === 'hero_grom');
  currentHero.xp = 350;
  
  const updateXpRes = await fetch(`${baseUrl}/api/game`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ room: roomId, version: roomVersion, action: 'character', value: currentHero })
  });
  const xpData = await updateXpRes.json() as any;
  roomVersion = xpData.room.version;

  // Call levelup action
  const levelUpRes = await fetch(`${baseUrl}/api/game`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      room: roomId,
      version: roomVersion,
      action: 'levelup',
      character: 'hero_grom'
    })
  });
  assert.strictEqual(levelUpRes.status, 200);
  const levelUpData = await levelUpRes.json() as any;
  roomVersion = levelUpData.room.version;
  const leveledHero = levelUpData.room.state.characters.find((c: any) => c.id === 'hero_grom');

  console.log(`Hero after Level Up: Level ${leveledHero.level}, Max HP: ${leveledHero.maxHp}`);
  assert.strictEqual(leveledHero.level, 2, 'Hero level must be 2');
  // Barbarian d12 -> gain is 12/2 + 1 + CON mod (2) = 7 + 2 = 9 hp gain (15 + 9 = 24)
  assert.ok(leveledHero.maxHp > 15, 'Max HP must have increased upon level up');
  assert.strictEqual(leveledHero.maxHp, 24, 'Barbarian d12 with CON +2 should gain 9 HP (15 -> 24)');

  // 7. Test ASI Level Up (Level 4 with +2 STR)
  console.log('Testing Level 4 ASI (+2 STR)...');
  leveledHero.level = 3;
  leveledHero.xp = 2800; // >= 2700 for lvl 4
  const setLvl3Res = await fetch(`${baseUrl}/api/game`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ room: roomId, version: roomVersion, action: 'character', value: leveledHero })
  });
  const lvl3Data = await setLvl3Res.json() as any;
  roomVersion = lvl3Data.room.version;

  const asiRes = await fetch(`${baseUrl}/api/game`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      room: roomId,
      version: roomVersion,
      action: 'levelup',
      character: 'hero_grom',
      statIncreases: [0, 0] // Two points in FOR (index 0)
    })
  });
  assert.strictEqual(asiRes.status, 200);
  const asiData = await asiRes.json() as any;
  const lvl4Hero = asiData.room.state.characters.find((c: any) => c.id === 'hero_grom');

  console.log(`Hero at Level 4: STR is ${lvl4Hero.stats[0]} (was 16, now 18)`);
  assert.strictEqual(lvl4Hero.level, 4, 'Hero should be level 4');
  assert.strictEqual(lvl4Hero.stats[0], 18, 'STR should have increased from 16 to 18');

  // Verify recalculation of equipped stats with new STR (+4)
  assert.strictEqual(lvl4Hero.attack, 6, 'Attack bonus should now be +4 (STR) + 2 (Prof) = +6');
  console.log('✅ VERIFIED: Level Up, HP scaling, and ASI attribute points work accurately!');
}

async function main() {
  try {
    await runUnitTests();
    await runApiIntegrationTests();
    console.log('\n🎉 ALL SRD 5e, ENEMY HP DAMAGE, AND LEVELING TESTS PASSED!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  }
}

main();
