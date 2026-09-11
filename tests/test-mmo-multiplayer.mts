import assert from 'node:assert';

const baseUrl = 'http://localhost:5173';

// Helper to authenticate user sessions
async function authenticateUser(username: string, displayName: string) {
  const params = new URLSearchParams({
    user_id: username,
    user_name: displayName
  });
  const res = await fetch(`${baseUrl}/api/game?${params.toString()}`);
  const cookieHeader = res.headers.get('set-cookie');
  const sessionCookie = cookieHeader ? cookieHeader.split(';')[0] : '';
  const data = await res.json() as any;
  return { sessionCookie, data };
}

async function runTests() {
  console.log('🚀 Starting MMO Multiplayer & Real-Time Sync Test Suite...\n');

  // 1. Authenticate two distinct players
  console.log('--- Test 1: Authenticate Client A and Client B ---');
  const clientA = await authenticateUser('mmo_player_alpha', 'Alpha');
  const clientB = await authenticateUser('mmo_player_beta', 'Beta');

  assert(clientA.data.signedIn, 'Client A should be signed in');
  assert(clientB.data.signedIn, 'Client B should be signed in');
  console.log('✅ Client A:', clientA.data.user);
  console.log('✅ Client B:', clientB.data.user);

  // 2. Both connect to the shared MMO world: 'mmo-world-village'
  console.log('\n--- Test 2: Both clients join shared MMO instance ---');
  const mmoRoomId = 'mmo-world-village';

  const roomResA = await fetch(`${baseUrl}/api/game?room=${mmoRoomId}&wipe=1`, {
    headers: { Cookie: clientA.sessionCookie }
  });
  const roomA = (await roomResA.json()) as any;
  assert.strictEqual(roomA.room.id, mmoRoomId, 'Client A should be in mmo-world-village');

  const roomResB = await fetch(`${baseUrl}/api/game?room=${mmoRoomId}`, {
    headers: { Cookie: clientB.sessionCookie }
  });
  let roomB = (await roomResB.json()) as any;
  assert.strictEqual(roomB.room.id, mmoRoomId, 'Client B should be in mmo-world-village');

  // Ensure clean non-combat state if left over from prior test
  if (roomA.room.state.combat) {
    const endRes = await fetch(`${baseUrl}/api/game`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: clientA.sessionCookie },
      body: JSON.stringify({
        room: mmoRoomId,
        version: roomA.room.version,
        action: 'endCombat'
      })
    });
    const refreshed = await (await fetch(`${baseUrl}/api/game?room=${mmoRoomId}`, { headers: { Cookie: clientA.sessionCookie } })).json() as any;
    roomA.room = refreshed.room;
  }
  console.log('✅ Both clients connected to room:', roomA.room.name);

  // 3. Client A creates a hero
  console.log('\n--- Test 3: Client A creates hero in MMO instance ---');
  const heroA = {
    id: 'hero_alpha_' + Date.now(),
    name: 'Grom Martelo',
    species: 'Anão',
    className: 'Guerreiro',
    level: 1,
    xp: 0,
    hp: 12,
    maxHp: 12,
    ac: 16,
    speed: 9,
    attack: 5,
    spellAbility: 0,
    exhaustion: 0,
    stats: [16, 12, 16, 10, 12, 8],
    skills: ['Atletismo', 'Sobrevivência'],
    weapon: 'Martelo de Guerra',
    damage: '1d8+3',
    slots: [0, 0, 0, 0, 0, 0, 0, 0, 0],
    usedSlots: [0, 0, 0, 0, 0, 0, 0, 0, 0],
    x: 4,
    y: 6
  };

  const createHeroResA = await fetch(`${baseUrl}/api/game`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: clientA.sessionCookie },
    body: JSON.stringify({
      room: mmoRoomId,
      version: roomA.room.version,
      action: 'character',
      value: heroA
    })
  });
  const createHeroDataA = await createHeroResA.json() as any;
  assert(createHeroResA.ok, 'Hero creation should succeed: ' + JSON.stringify(createHeroDataA));
  console.log(`✅ Client A created hero: ${heroA.name}`);

  // 4. Client B polls and verifies seeing Client A's hero
  console.log('\n--- Test 4: Client B polls and sees Client A\'s hero ---');
  const pollResB1 = await fetch(`${baseUrl}/api/game?room=${mmoRoomId}`, {
    headers: { Cookie: clientB.sessionCookie }
  });
  const pollDataB1 = await pollResB1.json() as any;
  const foundHeroA = pollDataB1.room.state.characters.find((c: any) => c.id === heroA.id);
  assert(foundHeroA, 'Client B must see Client A\'s hero in room state');
  assert.strictEqual(foundHeroA.owner, clientA.data.user, 'Hero must retain Client A ownership');
  console.log(`✅ Client B detected ${foundHeroA.name} owned by ${foundHeroA.owner} on map at (${foundHeroA.x}, ${foundHeroA.y})`);

  // 5. Client B creates their own hero
  console.log('\n--- Test 5: Client B creates hero in the same MMO instance ---');
  const heroB = {
    id: 'hero_beta_' + Date.now(),
    name: 'Lyra das Chamas',
    species: 'Elfo',
    className: 'Mago',
    level: 1,
    xp: 0,
    hp: 8,
    maxHp: 8,
    ac: 12,
    speed: 9,
    attack: 4,
    spellAbility: 3,
    exhaustion: 0,
    stats: [8, 14, 12, 16, 13, 10],
    skills: ['Arcanismo', 'História'],
    weapon: 'Cajado Arcano',
    damage: '1d6-1',
    slots: [2, 0, 0, 0, 0, 0, 0, 0, 0],
    usedSlots: [0, 0, 0, 0, 0, 0, 0, 0, 0],
    x: 5,
    y: 6
  };

  const createHeroResB = await fetch(`${baseUrl}/api/game`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: clientB.sessionCookie },
    body: JSON.stringify({
      room: mmoRoomId,
      version: pollDataB1.room.version,
      action: 'character',
      value: heroB
    })
  });
  const createHeroDataB = await createHeroResB.json() as any;
  assert(createHeroResB.ok, 'Hero creation should succeed: ' + JSON.stringify(createHeroDataB));
  console.log(`✅ Client B created hero: ${heroB.name}`);

  // 6. Character Ownership Protection in MMO
  console.log('\n--- Test 6: Client A attempts to move Client B\'s hero (Must Be Forbidden) ---');
  const pollResA1 = await fetch(`${baseUrl}/api/game?room=${mmoRoomId}`, {
    headers: { Cookie: clientA.sessionCookie }
  });
  const pollDataA1 = await pollResA1.json() as any;

  const illegalMoveRes = await fetch(`${baseUrl}/api/game`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: clientA.sessionCookie },
    body: JSON.stringify({
      room: mmoRoomId,
      version: pollDataA1.room.version,
      action: 'move',
      character: heroB.id,
      x: 5,
      y: 5
    })
  });
  const illegalMoveData = await illegalMoveRes.json() as any;
  assert(!illegalMoveRes.ok, 'Client A must not be allowed to move Client B\'s hero');
  assert.match(illegalMoveData.error, /Escolha um personagem seu/, 'Should give proper ownership rejection error');
  console.log('✅ Unauthorized hero control properly rejected:', illegalMoveData.error);

  // 7. Client A moves their OWN hero, Client B sees real-time movement
  console.log('\n--- Test 7: Client A moves own hero; Client B sees updated position ---');
  const validMoveRes = await fetch(`${baseUrl}/api/game`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: clientA.sessionCookie },
    body: JSON.stringify({
      room: mmoRoomId,
      version: pollDataA1.room.version,
      action: 'move',
      character: heroA.id,
      x: 4,
      y: 5,
      gridSize: 8,
      maxBound: 7
    })
  });
  const validMoveData = await validMoveRes.json() as any;
  assert(validMoveRes.ok, 'Valid movement should succeed: ' + JSON.stringify(validMoveData));

  // Client B polls and checks Grom's new coordinates
  const pollResB2 = await fetch(`${baseUrl}/api/game?room=${mmoRoomId}`, {
    headers: { Cookie: clientB.sessionCookie }
  });
  const pollDataB2 = await pollResB2.json() as any;
  const updatedHeroA = pollDataB2.room.state.characters.find((c: any) => c.id === heroA.id);
  assert.strictEqual(updatedHeroA.x, 4, 'X should be updated to 4');
  assert.strictEqual(updatedHeroA.y, 5, 'Y should be updated to 5');
  console.log(`✅ Real-time movement confirmed: ${updatedHeroA.name} moved to (${updatedHeroA.x}, ${updatedHeroA.y}) for Client B!`);

  // 8. Real-Time MMO Chat
  console.log('\n--- Test 8: Client A sends MMO chat message; Client B receives it ---');
  const chatResA = await fetch(`${baseUrl}/api/game`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: clientA.sessionCookie },
    body: JSON.stringify({
      room: mmoRoomId,
      version: pollDataB2.room.version,
      action: 'chat',
      text: 'Olá guilda! Encontrei rastros de monstros ao norte da vila!',
      characterName: heroA.name
    })
  });
  assert(chatResA.ok, 'Chat dispatch should succeed');

  const pollResB3 = await fetch(`${baseUrl}/api/game?room=${mmoRoomId}`, {
    headers: { Cookie: clientB.sessionCookie }
  });
  const pollDataB3 = await pollResB3.json() as any;
  const lastLog = pollDataB3.room.state.logs[pollDataB3.room.state.logs.length - 1];
  assert(lastLog, 'Should have logs');
  assert.strictEqual(lastLog.kind, 'player', 'Kind should be player');
  assert(lastLog.text.includes(heroA.name), 'Log text must include sender name');
  assert(lastLog.text.includes('Olá guilda! Encontrei rastros'), 'Log text must match chat message');
  console.log('✅ Real-time chat message broadcast confirmed:', lastLog.text);

  // Form party to share combat XP
  const inviteRes = await fetch(`${baseUrl}/api/game`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: clientA.sessionCookie },
    body: JSON.stringify({
      room: mmoRoomId,
      version: pollDataB3.room.version,
      action: 'partyInvite',
      character: heroA.id,
      targetCharId: heroB.id
    })
  });
  const inviteData = await inviteRes.json() as any;
  const acceptRes = await fetch(`${baseUrl}/api/game`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: clientB.sessionCookie },
    body: JSON.stringify({
      room: mmoRoomId,
      version: inviteData.room.version,
      action: 'partyAccept'
    })
  });
  const acceptData = await acceptRes.json() as any;

  // 9. Cooperative Combat & Shared Party XP
  console.log('\n--- Test 9: Cooperative Combat & Shared XP for All Heroes ---');
  // Trigger encounter
  const encounterRes = await fetch(`${baseUrl}/api/game`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: clientA.sessionCookie },
    body: JSON.stringify({
      room: mmoRoomId,
      version: acceptData.room.version,
      action: 'encounter'
    })
  });
  const encounterData = await encounterRes.json() as any;
  assert(encounterRes.ok, 'Encounter trigger should succeed: ' + JSON.stringify(encounterData));

  // Verify combat is active for Client B as well
  const pollResB4 = await fetch(`${baseUrl}/api/game?room=${mmoRoomId}`, {
    headers: { Cookie: clientB.sessionCookie }
  });
  const pollDataB4 = await pollResB4.json() as any;
  assert.strictEqual(pollDataB4.room.state.combat, true, 'Combat must be active for all players');
  const enemy = pollDataB4.room.state.enemies[0];
  assert(enemy, 'Enemy should exist in combat');
  console.log(`✅ Shared encounter active: Enemy "${enemy.name}" with ${enemy.hp} HP`);

  // Resolve combat turns cooperatively:
  let currentCombatPoll = pollDataB4;
  let attempts = 0;
  while (currentCombatPoll.room.state.combat && attempts < 10) {
    attempts++;
    const state = currentCombatPoll.room.state;
    const currentTurnId = state.order[state.turn];
    const currentVer = currentCombatPoll.room.version;
    const targetEnemy = state.enemies.find((e: any) => e.hp > 0);

    console.log(`[Attempt ${attempts}] Turn #${state.turn}: ${currentTurnId} | Hero A: ${heroA.id} | Hero B: ${heroB.id} | Order:`, state.order);

    if (!targetEnemy) break;

    if (currentTurnId === heroA.id) {
      console.log('Turn of Hero A (Grom)...');
      // Move to safe walkable land (6, 4) adjacent to enemy at (7, 3)
      await fetch(`${baseUrl}/api/game`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: clientA.sessionCookie },
        body: JSON.stringify({
          room: mmoRoomId,
          version: currentVer,
          action: 'move',
          character: heroA.id,
          x: 6,
          y: 4,
          gridSize: 8,
          maxBound: 7
        })
      });

      // Fetch updated state for version
      const pRes = await fetch(`${baseUrl}/api/game?room=${mmoRoomId}`, { headers: { Cookie: clientA.sessionCookie } });
      const pData = await pRes.json() as any;

      // Strike enemy
      await fetch(`${baseUrl}/api/game`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: clientA.sessionCookie },
        body: JSON.stringify({
          room: mmoRoomId,
          version: pData.room.version,
          action: 'attack',
          character: heroA.id,
          target: targetEnemy.id,
          damageFormula: '99'
        })
      });
    } else if (currentTurnId === heroB.id) {
      console.log('Turn of Hero B (Lyra)...');
      // Cast spell from distance
      const spellRes = await fetch(`${baseUrl}/api/game`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: clientB.sessionCookie },
        body: JSON.stringify({
          room: mmoRoomId,
          version: currentVer,
          action: 'spell',
          character: heroB.id,
          targetId: targetEnemy.id,
          spellName: 'Raio de Fogo',
          spellLevel: 0,
          damageFormula: '99',
          endTurn: true
        })
      });
      const spellData = await spellRes.json() as any;
      console.log('Spell status:', spellRes.status, 'data:', spellData);
    } else {
      console.log('Turn of Enemy or GM - host passing turn...');
      // Host passes enemy turn
      const passRes = await fetch(`${baseUrl}/api/game`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: clientA.sessionCookie },
        body: JSON.stringify({
          room: mmoRoomId,
          version: currentVer,
          action: 'pass'
        })
      });
      const passData = await passRes.json() as any;
      console.log('Pass status:', passRes.status, 'data:', passData);
    }

    // Refresh poll state
    const refreshRes = await fetch(`${baseUrl}/api/game?room=${mmoRoomId}`, { headers: { Cookie: clientB.sessionCookie } });
    currentCombatPoll = await refreshRes.json() as any;
  }
  const pollDataB5 = currentCombatPoll;
  assert.strictEqual(pollDataB5.room.state.combat, false, 'Combat should conclude upon enemy defeat');

  const heroA_After = pollDataB5.room.state.characters.find((c: any) => c.id === heroA.id);
  const heroB_After = pollDataB5.room.state.characters.find((c: any) => c.id === heroB.id);

  assert(heroA_After.xp >= 50, `Hero A should have received shared XP (+50). Got: ${heroA_After.xp}`);
  assert(heroB_After.xp >= 50, `Hero B should have received shared XP (+50). Got: ${heroB_After.xp}`);
  console.log(`✅ Shared XP confirmed! Hero A: ${heroA_After.xp} XP, Hero B: ${heroB_After.xp} XP!`);

  console.log('\n🎉 ALL 9 MMO MULTIPLAYER & REAL-TIME SYNC TESTS PASSED SUCCESSFULLY! 🎉\n');
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
