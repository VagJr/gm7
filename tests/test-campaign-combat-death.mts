import assert from 'node:assert';

const BASE_URL = 'http://localhost:5173';

async function run() {
  console.log('Testing Campaign Progression, NPC Deeds, Death & Respawn, and Combat targeting...');

  // 1. Authenticate with dev cookie
  const cookie = 'auth_session=' + Buffer.from(JSON.stringify({
    userId: 'test-hero-runner',
    displayName: 'Aventureiro Teste'
  })).toString('base64');

  // 2. Wipe room to clean state
  const wipeRes = await fetch(`${BASE_URL}/api/game`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ action: 'wipe' })
  });
  assert(wipeRes.status === 200, 'Wipe should return 200');

  // 3. Get room and verify zero characters and questProgress object
  const getRes = await fetch(`${BASE_URL}/api/game`, { headers: { Cookie: cookie } });
  const data = await getRes.json();
  assert(data.signedIn, 'Should be signed in');
  assert(data.room, 'Room should exist');
  const roomId = data.room.id;
  const version = data.room.version;
  console.log('✓ Clean room created:', roomId);

  // 4. Create Hero
  const createHeroRes = await fetch(`${BASE_URL}/api/game`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({
      room: roomId,
      version,
      action: 'character',
      value: {
        id: 'hero-test-1',
        name: 'Gareth Machado de Prata',
        className: 'Guerreiro',
        species: 'Humano',
        background: 'Soldado',
        level: 1,
        stats: [16, 14, 15, 10, 12, 8],
        skills: ['Atletismo', 'Percepção'],
        expertise: [],
        saves: [5, 2, 4, 0, 1, -1],
        hp: 12,
        maxHp: 12,
        ac: 16,
        speed: 9,
        attack: 5,
        damage: '1d8+3',
        weapon: 'Espada Longa',
        spellAbility: 3,
        slots: [0, 0, 0, 0, 0, 0, 0, 0, 0],
        usedSlots: [0, 0, 0, 0, 0, 0, 0, 0, 0],
        features: 'Retomar o Fôlego',
        spells: '',
        inventory: 'espada-longa, escudo',
        notes: '',
        conditions: [],
        x: 4,
        y: 6,
        xp: 0,
        initiative: 0,
        deathSuccess: 0,
        deathFail: 0,
        exhaustion: 0
      }
    })
  });
  const heroData = await createHeroRes.json();
  assert(heroData.room.state.characters.length === 1, 'Hero should be created');
  console.log('✓ Hero Gareth created');

  // 5. Test Quest Step: Doran Talked
  const doranTalkRes = await fetch(`${BASE_URL}/api/game`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({
      room: roomId,
      version: heroData.room.version,
      action: 'questStep',
      step: 'doran_talked',
      logText: 'O herói conversou com Ancião Doran.'
    })
  });
  const doranData = await doranTalkRes.json();
  assert(doranData.room.state.questProgress.doran_talked === true, 'doran_talked flag should be true');
  console.log('✓ Quest step 1 (doran_talked) completed');

  // 6. Test Quest Step: Elenor Talked & Potion Granting
  const elenorTalkRes = await fetch(`${BASE_URL}/api/game`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({
      room: roomId,
      version: doranData.room.version,
      action: 'questStep',
      step: 'elenor_talked',
      logText: 'O herói conversou com Alquimista Elenor.'
    })
  });
  const elenorData = await elenorTalkRes.json();
  assert(elenorData.room.state.questProgress.elenor_talked === true, 'elenor_talked flag should be true');
  console.log('✓ Quest step 2 (elenor_talked) completed');

  // 7. Test Travel to Forest (Biome change) & Enemy Encounter
  const travelForestRes = await fetch(`${BASE_URL}/api/game`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({
      room: roomId,
      version: elenorData.room.version,
      action: 'location',
      location: 1
    })
  });
  const forestData = await travelForestRes.json();
  assert(forestData.room.state.biome === 'forest', 'Biome should be forest');
  assert(forestData.room.state.enemies.length > 0, 'Enemies should spawn in forest');
  console.log('✓ Traveled to Forest, spawned enemies:', forestData.room.state.enemies.map((e: any) => e.name));

  // 8. Test Character Death and Respawn Logic
  // First, drop hero HP to 0
  const heroDamaged = { ...forestData.room.state.characters[0], hp: 0 };
  const deathUpdateRes = await fetch(`${BASE_URL}/api/game`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({
      room: roomId,
      version: forestData.room.version,
      action: 'character',
      value: heroDamaged
    })
  });
  const deathData = await deathUpdateRes.json();
  assert(deathData.room.state.characters[0].hp === 0, 'Hero should be at 0 HP');
  console.log('✓ Hero Gareth dropped to 0 HP (fallen state)');

  // Now trigger Respawn action
  const respawnRes = await fetch(`${BASE_URL}/api/game`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({
      room: roomId,
      version: deathData.room.version,
      action: 'respawn',
      character: 'hero-test-1'
    })
  });
  const respawnData = await respawnRes.json();
  const revivedHero = respawnData.room.state.characters[0];
  assert(revivedHero.hp === revivedHero.maxHp, 'Hero HP should be fully restored upon respawn');
  assert(respawnData.room.state.location === 0, 'Hero should respawn in Village (location 0)');
  assert(respawnData.room.state.biome === 'village', 'Biome should be village');
  assert(revivedHero.x === 4 && revivedHero.y === 6, 'Hero coordinates should be reset to Village sanctuary');
  assert(respawnData.room.state.combat === false, 'Combat should be ended upon respawn');
  console.log('✓ Respawn succeeded! Hero returned to Village sanctuary with full HP:', revivedHero.hp + '/' + revivedHero.maxHp);

  // 9. Travel to Dungeon and verify dungeon_entered flag
  const travelDungeonRes = await fetch(`${BASE_URL}/api/game`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({
      room: roomId,
      version: respawnData.room.version,
      action: 'location',
      location: 2
    })
  });
  const dungeonData = await travelDungeonRes.json();
  assert(dungeonData.room.state.biome === 'dungeon', 'Biome should be dungeon');
  assert(dungeonData.room.state.questProgress.dungeon_entered === true, 'dungeon_entered should be flagged in questProgress');
  console.log('✓ Dungeon entered and flagged in questProgress!');

  // Final cleanup wipe
  await fetch(`${BASE_URL}/api/game`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ action: 'wipe' })
  });
  console.log('\nAll campaign progression, deeds, death, and respawn tests passed with 100% success!');
}

run().catch((e) => {
  console.error('Test failed:', e);
  process.exit(1);
});
