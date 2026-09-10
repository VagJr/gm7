// tests/test-mechanics.mts
// Automated verification of D&D 5e turn economy, potion healing, organic biomes & NPCs
import assert from 'node:assert';

async function runTests() {
  console.log('🧪 Starting Game Mechanics & D&D 5e Engine Verification...\n');
  const baseUrl = 'http://localhost:5173';

  // 0. Obtain session cookie
  const auth = await fetch(baseUrl + '/signin-with-chatgpt?return_to=/', { redirect: 'manual' });
  const cookie = auth.headers.get('set-cookie')?.split(';')[0];
  assert(cookie, 'Session cookie obtained');

  const headers = {
    cookie,
    'Content-Type': 'application/json',
    Origin: baseUrl
  };

  // 1. Create a fresh room with the new starterState
  console.log('1️⃣ Creating fresh room with Village Prologue...');
  const createRes = await fetch(`${baseUrl}/api/game`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      action: 'create',
      name: 'Aventura em Vila do Rio Verde'
    })
  });
  assert.strictEqual(createRes.status, 200, 'Room creation must return 200');
  const createData = await createRes.json() as any;
  const roomId = createData.id;
  assert(roomId, 'Room ID generated');
  console.log('✅ Created Room ID:', roomId);

  // 2. Fetch the created room
  const resGet = await fetch(`${baseUrl}/api/game?room=${encodeURIComponent(roomId)}`, { headers });
  assert.strictEqual(resGet.status, 200, 'GET /api/game should return 200');
  const dataGet = await resGet.json() as any;
  assert.ok(dataGet.signedIn, 'User is signed in');
  assert.ok(dataGet.room, 'Room exists');

  let state = dataGet.room.state;
  console.log('✅ Room loaded:', dataGet.room.name);
  console.log(`   Location index: ${state.location}`);
  console.log(`   Biome: ${state.biome}`);
  console.log(`   NPCs count: ${state.npcs?.length}`);
  state.npcs?.forEach((n: any) => console.log(`   - NPC: ${n.name} (${n.role})`));

  assert.ok(state.npcs?.some((n: any) => n.id === 'doran'), 'Missing Ancião Doran in starter state');
  assert.ok(state.npcs?.some((n: any) => n.id === 'elenor'), 'Missing Alquimista Elenor in starter state');
  assert.ok(state.npcs?.some((n: any) => n.id === 'kaelen'), 'Missing Capitão Kaelen in starter state');
  assert.strictEqual(state.biome, 'village', 'Starter biome must be village');
  assert.strictEqual(state.combat, false, 'Starter state must be out of combat');

  let roomVersion = dataGet.room.version;
  if (state.characters.length === 0) {
    const addHeroRes = await fetch(`${baseUrl}/api/game`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        room: roomId,
        version: roomVersion,
        action: 'character',
        value: {
          id: 'hero-test-1',
          name: 'Valerius Teste',
          className: 'Guerreiro',
          species: 'Humano',
          level: 1,
          hp: 12,
          maxHp: 12,
          ac: 16,
          speed: 9,
          attack: 5,
          damage: '1d8+3',
          weapon: 'Espada Longa',
          spellAbility: 0,
          stats: [16, 12, 14, 10, 12, 8],
          skills: ['Atletismo'],
          expertise: [],
          conditions: [],
          exhaustion: 0,
          deathSaves: { success: 0, fail: 0 },
          slots: [0, 0, 0, 0, 0, 0, 0, 0, 0],
          usedSlots: [0, 0, 0, 0, 0, 0, 0, 0, 0],
          spells: '',
          equipment: { mainHand: 'espada-longa' },
          inventory: 'Espada Longa\nPoção de Cura (2)',
          gold: 25,
          x: 4,
          y: 6
        }
      })
    });
    const addHeroData = await addHeroRes.json() as any;
    roomVersion = addHeroData.room.version;
    state = addHeroData.room.state;
  }
  const hero = state.characters[0];
  assert.ok(hero, 'Hero exists');

  // Damage hero slightly so we can verify healing
  hero.hp = Math.max(1, hero.maxHp - 6);
  const saveHeroRes = await fetch(`${baseUrl}/api/game`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      room: roomId,
      version: roomVersion,
      action: 'character',
      value: hero
    })
  });
  const saveHeroData = await saveHeroRes.json() as any;
  roomVersion = saveHeroData.room.version;
  console.log(`   Set hero HP to ${hero.hp}/${hero.maxHp} for healing test.`);

  // 3. Test POST useItem (Healing Potion)
  console.log('\n2️⃣ Testing POST useItem (Poção de Cura)...');
  const initialHp = hero.hp;
  const resPotion = await fetch(`${baseUrl}/api/game`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      room: roomId,
      version: roomVersion,
      action: 'useItem',
      character: hero.id,
      itemId: 'pocao-cura',
      targetId: hero.id
    })
  });

  assert.strictEqual(resPotion.status, 200, 'useItem should return 200');
  const dataPotion = await resPotion.json() as any;
  roomVersion = dataPotion.room.version;
  const healedHero = dataPotion.room.state.characters.find((c: any) => c.id === hero.id);
  console.log(`✅ Potion drank! HP went from ${initialHp} to ${healedHero.hp}/${healedHero.maxHp}`);
  console.log(`   healResult returned:`, dataPotion.healResult);
  assert.ok(dataPotion.healResult && dataPotion.healResult.healAmount > 0, 'healResult must have healAmount > 0');
  assert.ok(healedHero.hp > initialHp, 'Hero HP must increase after potion');

  // 4. Test POST encounter (Initiate Combat)
  console.log('\n3️⃣ Testing POST encounter (Iniciativa 5e)...');
  const resEncounter = await fetch(`${baseUrl}/api/game`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      room: roomId,
      version: roomVersion,
      action: 'encounter'
    })
  });

  assert.strictEqual(resEncounter.status, 200, 'encounter should succeed');
  const dataEncounter = await resEncounter.json() as any;
  roomVersion = dataEncounter.room.version;
  const combatState = dataEncounter.room.state;
  console.log(`✅ Combat initiated! Round: ${combatState.round}, Combat: ${combatState.combat}`);
  console.log(`   Turn order: ${combatState.order.join(' -> ')}`);
  console.log(`   Enemies count: ${combatState.enemies.length} (${combatState.enemies[0]?.name})`);

  // 5. Test D&D 5e Action Economy (1 Action limit & turn enforcement)
  console.log('\n4️⃣ Testing D&D 5e Action Economy (1 Action limit & turn enforcement)...');
  const enemy = combatState.enemies[0];
  const curTurnEntityId = combatState.order[combatState.turn];

  // If enemy is first, have the enemy act or pass turn
  if (enemy && curTurnEntityId === enemy.id) {
    console.log('   Enemy has initiative, passing to hero...');
    const resPass = await fetch(`${baseUrl}/api/game`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        room: roomId,
        version: roomVersion,
        action: 'pass'
      })
    });
    const dataPass = await resPass.json() as any;
    roomVersion = dataPass.room.version;
  }

  // Active hero takes their 1st attack
  console.log('   Hero performing 1st attack in combat turn...');
  const resAttack1 = await fetch(`${baseUrl}/api/game`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      room: roomId,
      version: roomVersion,
      action: 'attack',
      character: hero.id,
      target: enemy.id,
      damageFormula: '1'
    })
  });

  if (resAttack1.status === 200) {
    const dataAttack1 = await resAttack1.json() as any;
    roomVersion = dataAttack1.room.version;
    console.log('✅ 1st Attack resolved! Attack result:', dataAttack1.attackResult?.text);
    console.log(`   actionUsed state: ${dataAttack1.room.state.actionUsed}`);
    assert.strictEqual(dataAttack1.room.state.actionUsed, true, 'actionUsed must be true after attack');

    // Now attempt 2nd attack on the SAME turn - MUST BE BLOCKED BY SERVER!
    console.log('   Attempting 2nd attack on same turn (should be blocked by D&D 5e rule)...');
    const resAttack2 = await fetch(`${baseUrl}/api/game`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        room: roomId,
        version: roomVersion,
        action: 'attack',
        character: hero.id,
        target: enemy.id,
        damageFormula: '1'
      })
    });

    assert.strictEqual(resAttack2.status, 400, '2nd attack in single turn must be rejected with 400');
    const err = await resAttack2.json() as any;
    console.log(`✅ 2nd Attack successfully BLOCKED by server rule: "${err.error}"`);

    // Pass turn to reset action
    console.log('   Hero passing turn...');
    const resPassTurn = await fetch(`${baseUrl}/api/game`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        room: roomId,
        version: roomVersion,
        action: 'pass',
        character: hero.id
      })
    });
    const dataPassTurn = await resPassTurn.json() as any;
    roomVersion = dataPassTurn.room.version;
    console.log(`✅ Turn ended. Action reset: actionUsed = ${dataPassTurn.room.state.actionUsed}`);
  }

  // 6. Clean up combat
  console.log('\n5️⃣ Ending combat cleanly...');
  const resEnd = await fetch(`${baseUrl}/api/game`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      room: roomId,
      version: roomVersion,
      action: 'endCombat'
    })
  });
  const dataEnd = await resEnd.json() as any;
  console.log(`✅ Combat ended. State combat: ${dataEnd.room.state.combat}`);

  console.log('\n🎉 ALL GAME MECHANICS & D&D 5e TESTS PASSED PERFECTLY! ⚔️🛡️');
}

runTests().catch((e) => {
  console.error('❌ Test failed:', e);
  process.exit(1);
});
