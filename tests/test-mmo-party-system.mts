import assert from 'node:assert';

const baseUrl = 'http://localhost:5173';

async function createClientSession(label: string) {
  const initRes = await fetch(`${baseUrl}/api/game`);
  const setCookie = initRes.headers.get('set-cookie');
  assert(setCookie, `Client ${label} should receive session cookie`);
  const sessionCookie = setCookie.split(';')[0];
  const data = (await initRes.json()) as any;
  return { label, sessionCookie, data };
}

async function runPartyTests() {
  console.log('🚀 Starting MMO Party System & 1-Character Limit Test Suite...\n');

  // 1. Authenticate two independent players
  console.log('--- Test 1: Authenticate Client A and Client B ---');
  const clientA = await createClientSession('A');
  const clientB = await createClientSession('B');
  assert.notStrictEqual(clientA.data.user, clientB.data.user, 'Clients must have isolated user IDs');
  console.log(`✅ Client A: ${clientA.data.user}`);
  console.log(`✅ Client B: ${clientB.data.user}`);

  // 2. Both join mmo-world-village with pristine wipe
  console.log('\n--- Test 2: Both join MMO world instance ---');
  const mmoRoomId = 'mmo-world-village';
  const roomResA = await fetch(`${baseUrl}/api/game?room=${mmoRoomId}&wipe=1`, {
    headers: { Cookie: clientA.sessionCookie }
  });
  const roomA = (await roomResA.json()) as any;
  assert.strictEqual(roomA.room.id, mmoRoomId);

  const roomResB = await fetch(`${baseUrl}/api/game?room=${mmoRoomId}`, {
    headers: { Cookie: clientB.sessionCookie }
  });
  const roomB = (await roomResB.json()) as any;
  assert.strictEqual(roomB.room.id, mmoRoomId);
  console.log('✅ Both clients connected to MMO instance:', roomA.room.name);

  // 3. Client A creates hero
  console.log('\n--- Test 3: Client A creates first hero ---');
  const heroA = {
    id: 'hero_grom_' + Date.now(),
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
    skills: ['Atletismo'],
    weapon: 'Martelo de Guerra',
    damage: '1d8+3',
    slots: [0, 0, 0, 0, 0, 0, 0, 0, 0],
    usedSlots: [0, 0, 0, 0, 0, 0, 0, 0, 0],
    x: 4,
    y: 6
  };

  const createA = await fetch(`${baseUrl}/api/game`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: clientA.sessionCookie },
    body: JSON.stringify({ room: mmoRoomId, version: roomA.room.version, action: 'character', value: heroA })
  });
  assert(createA.ok, 'Client A hero creation must succeed');
  const createAData = await createA.json() as any;
  console.log(`✅ Client A created hero: ${heroA.name}`);

  // 4. Client A attempts to create a SECOND character in MMO (MUST BE FORBIDDEN)
  console.log('\n--- Test 4: Client A attempts to create a 2nd hero in MMO (Must Be Rejected) ---');
  const heroA2 = {
    ...heroA,
    id: 'hero_clone_' + Date.now(),
    name: 'Clone Proibido'
  };
  const createA2 = await fetch(`${baseUrl}/api/game`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: clientA.sessionCookie },
    body: JSON.stringify({ room: mmoRoomId, version: createAData.room.version, action: 'character', value: heroA2 })
  });
  assert(!createA2.ok, 'Creation of a 2nd character in MMO must be rejected');
  const createA2Data = await createA2.json() as any;
  assert.match(createA2Data.error, /Você já possui um personagem ativo neste mundo MMO/, 'Error message must match');
  console.log('✅ 2nd character creation properly rejected:', createA2Data.error);

  // 5. Client B creates hero
  console.log('\n--- Test 5: Client B creates their own hero ---');
  const heroB = {
    id: 'hero_lyra_' + Date.now(),
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
    stats: [8, 14, 12, 16, 12, 10],
    skills: ['Arcanismo'],
    weapon: 'Adaga',
    damage: '1d4+2',
    slots: [2, 0, 0, 0, 0, 0, 0, 0, 0],
    usedSlots: [0, 0, 0, 0, 0, 0, 0, 0, 0],
    x: 3,
    y: 6
  };
  const createB = await fetch(`${baseUrl}/api/game`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: clientB.sessionCookie },
    body: JSON.stringify({ room: mmoRoomId, version: createAData.room.version, action: 'character', value: heroB })
  });
  assert(createB.ok, 'Client B hero creation must succeed');
  const createBData = await createB.json() as any;
  console.log(`✅ Client B created hero: ${heroB.name}`);

  // 6. Verify both heroes enter SOLO (no partyId)
  console.log('\n--- Test 6: Verify both heroes start SOLO (not in party) ---');
  const charA = createBData.room.state.characters.find((c: any) => c.id === heroA.id);
  const charB = createBData.room.state.characters.find((c: any) => c.id === heroB.id);
  assert(!charA.partyId, 'Hero A must start SOLO');
  assert(!charB.partyId, 'Hero B must start SOLO');
  console.log('✅ Confirmed: Both players enter the MMO world SOLO!');

  // 7. Client A invites Client B to Party
  console.log('\n--- Test 7: Client A invites Client B to party ---');
  const inviteRes = await fetch(`${baseUrl}/api/game`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: clientA.sessionCookie },
    body: JSON.stringify({
      room: mmoRoomId,
      version: createBData.room.version,
      action: 'partyInvite',
      character: heroA.id,
      targetCharId: heroB.id
    })
  });
  assert(inviteRes.ok, 'Party invite dispatch must succeed');
  const inviteData = await inviteRes.json() as any;
  assert(inviteData.room.state.partyInvites?.length === 1, 'Room must have 1 active party invite');
  const pendingInvite = inviteData.room.state.partyInvites[0];
  assert.strictEqual(pendingInvite.fromCharId, heroA.id);
  assert.strictEqual(pendingInvite.toCharId, heroB.id);
  console.log(`✅ Party invite sent from ${pendingInvite.fromCharName} to ${pendingInvite.toCharName}`);

  // 8. Duplicate invite attempt
  console.log('\n--- Test 8: Prevent duplicate party invite ---');
  const dupInviteRes = await fetch(`${baseUrl}/api/game`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: clientA.sessionCookie },
    body: JSON.stringify({
      room: mmoRoomId,
      version: inviteData.room.version,
      action: 'partyInvite',
      character: heroA.id,
      targetCharId: heroB.id
    })
  });
  assert(!dupInviteRes.ok, 'Duplicate invite must be rejected');
  const dupData = await dupInviteRes.json() as any;
  assert.match(dupData.error, /Convite já enviado/, 'Must report already invited');
  console.log('✅ Duplicate invite properly rejected:', dupData.error);

  // 9. Client B accepts the party invite
  console.log('\n--- Test 9: Client B accepts party invite ---');
  const acceptRes = await fetch(`${baseUrl}/api/game`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: clientB.sessionCookie },
    body: JSON.stringify({
      room: mmoRoomId,
      version: inviteData.room.version,
      action: 'partyAccept',
      character: heroB.id,
      inviteId: pendingInvite.id
    })
  });
  assert(acceptRes.ok, 'Party accept must succeed');
  const acceptData = await acceptRes.json() as any;

  const charA_InParty = acceptData.room.state.characters.find((c: any) => c.id === heroA.id);
  const charB_InParty = acceptData.room.state.characters.find((c: any) => c.id === heroB.id);
  assert(charA_InParty.partyId, 'Hero A must have partyId');
  assert(charB_InParty.partyId, 'Hero B must have partyId');
  assert.strictEqual(charA_InParty.partyId, charB_InParty.partyId, 'Both heroes must share identical partyId');
  assert.strictEqual(acceptData.room.state.partyInvites?.length || 0, 0, 'Pending invite must be removed');
  console.log(`✅ Party formed! Shared Party ID: ${charA_InParty.partyId}`);

  // 10. Cooperative Combat & Party Shared XP
  console.log('\n--- Test 10: Party Members Cooperate and Share Combat XP ---');
  const encounterRes = await fetch(`${baseUrl}/api/game`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: clientA.sessionCookie },
    body: JSON.stringify({ room: mmoRoomId, version: acceptData.room.version, action: 'encounter' })
  });
  assert(encounterRes.ok, 'Encounter trigger must succeed');
  const encounterData = await encounterRes.json() as any;
  const enemy = encounterData.room.state.enemies[0];
  assert(enemy, 'Enemy should spawn');

  // Handle initiative turn loop
  let combatPoll = encounterData;
  let safety = 0;
  while (combatPoll.room.state.combat && safety < 10) {
    safety++;
    const state = combatPoll.room.state;
    const curTurn = state.order[state.turn];
    const curVer = combatPoll.room.version;
    const targetEnemy = state.enemies.find((e: any) => e.hp > 0);
    if (!targetEnemy) break;

    if (curTurn === heroA.id) {
      await fetch(`${baseUrl}/api/game`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: clientA.sessionCookie },
        body: JSON.stringify({
          room: mmoRoomId,
          version: curVer,
          action: 'pass',
          character: heroA.id
        })
      });
    } else if (curTurn === heroB.id) {
      await fetch(`${baseUrl}/api/game`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: clientB.sessionCookie },
        body: JSON.stringify({
          room: mmoRoomId,
          version: curVer,
          action: 'spell',
          character: heroB.id,
          targetId: targetEnemy.id,
          spellName: 'Raio de Fogo',
          spellLevel: 0,
          damageFormula: '99'
        })
      });
    } else {
      await fetch(`${baseUrl}/api/game`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: clientA.sessionCookie },
        body: JSON.stringify({ room: mmoRoomId, version: curVer, action: 'pass' })
      });
    }
    const refRes = await fetch(`${baseUrl}/api/game?room=${mmoRoomId}`, { headers: { Cookie: clientA.sessionCookie } });
    combatPoll = await refRes.json() as any;
  }

  assert.strictEqual(combatPoll.room.state.combat, false, 'Combat should be resolved');
  const charA_AfterKill = combatPoll.room.state.characters.find((c: any) => c.id === heroA.id);
  const charB_AfterKill = combatPoll.room.state.characters.find((c: any) => c.id === heroB.id);

  assert(charA_AfterKill.xp >= 150, `Hero A should have received party XP (+150). Got: ${charA_AfterKill.xp}`);
  assert(charB_AfterKill.xp >= 150, `Hero B should have received party XP (+150). Got: ${charB_AfterKill.xp}`);
  console.log(`✅ Shared Party XP confirmed! Hero A: ${charA_AfterKill.xp} XP, Hero B: ${charB_AfterKill.xp} XP!`);

  // 11. Client B leaves party
  console.log('\n--- Test 11: Client B leaves party (returns to Solo) ---');
  const leaveRes = await fetch(`${baseUrl}/api/game`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: clientB.sessionCookie },
    body: JSON.stringify({
      room: mmoRoomId,
      version: combatPoll.room.version,
      action: 'partyLeave',
      character: heroB.id
    })
  });
  assert(leaveRes.ok, 'Party leave must succeed');
  const leaveData = await leaveRes.json() as any;

  const charA_AfterLeave = leaveData.room.state.characters.find((c: any) => c.id === heroA.id);
  const charB_AfterLeave = leaveData.room.state.characters.find((c: any) => c.id === heroB.id);
  assert(!charB_AfterLeave.partyId, 'Hero B must now be SOLO');
  assert(!charA_AfterLeave.partyId, 'Hero A party should be dissolved back to SOLO');
  console.log('✅ Both players successfully returned to SOLO mode!');

  console.log('\n🎉 ALL 11 MMO PARTY SYSTEM & 1-CHARACTER LIMIT TESTS PASSED! 🎉\n');
}

runPartyTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
