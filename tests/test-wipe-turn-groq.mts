// tests/test-wipe-turn-groq.mts
import assert from 'node:assert';

const base = 'http://localhost:5173';

console.log('Testing Groq .env key isolation, Total Wipe to 0 characters, and Combat Turn Passing...');

async function run() {
  // 1. Obtain local session cookie
  console.log('\n--- 1. Testing Session Cookie ---');
  const auth = await fetch(base + '/signin-with-chatgpt?return_to=/', { redirect: 'manual' });
  const cookie = auth.headers.get('set-cookie')?.split(';')[0];
  assert(cookie, 'Session cookie obtained');

  const headers = {
    cookie,
    'Content-Type': 'application/json',
    Origin: base
  };

  // 2. Perform Wipe via POST /api/game action: 'wipe'
  console.log('\n--- 2. Testing Wipe API (Total Reset to 0 characters) ---');
  const wipeRes = await fetch(base + '/api/game', {
    method: 'POST',
    headers,
    body: JSON.stringify({ action: 'wipe' })
  });
  assert.strictEqual(wipeRes.status, 200, 'POST /api/game with action=wipe should return 200');
  const wipeData = await wipeRes.json() as any;
  assert.ok(wipeData.ok, 'Wipe should be ok');
  assert.ok(wipeData.room, 'Wiped room should be returned');
  assert.strictEqual(wipeData.room.state.characters.length, 0, 'Wiped state characters must be ZERO (0)');
  assert.strictEqual(wipeData.room.state.enemies.length, 0, 'Wiped state enemies must be ZERO (0)');
  assert.strictEqual(wipeData.room.state.round, 0, 'Wiped state round must be ZERO (0)');
  assert.strictEqual(wipeData.room.state.combat, false, 'Wiped state combat must be false');
  assert.strictEqual(wipeData.room.state.location, 0, 'Wiped state location must be 0 (Vila do Rio Verde)');
  console.log('Total Wipe confirmed: Room initialized with 0 characters, 0 enemies, 0 progress!');

  // 3. Check Groq API route with NO hardcoded key (must read process.env.GROQ_API_KEY)
  console.log('\n--- 3. Testing Groq API route (.env key only) ---');
  const gmRes = await fetch(base + '/api/gm', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      room: wipeData.room.id,
      text: 'O guerreiro examina os arredores da vila e observa a ponte leste.',
      // Notice: NO key passed here! The server must read process.env.GROQ_API_KEY
      key: ''
    })
  });

  assert.strictEqual(gmRes.status, 200, 'Groq GM endpoint should return 200 using process.env.GROQ_API_KEY');
  const gmData = await gmRes.json() as any;
  assert.ok(gmData.answer, 'Groq should return generated narrative text');
  console.log('Full Groq narration response:');
  console.log(gmData.answer);
  console.log('Parsed choices count:', gmData.choices?.length || 0);

  // Verify GET /api/game also reflects this clean room with 0 characters
  const getCleanRes = await fetch(base + '/api/game', { headers });
  const getCleanData = await getCleanRes.json() as any;
  assert.strictEqual(getCleanData.room.state.characters.length, 0, 'GET /api/game confirms 0 characters after wipe');
  console.log('GET /api/game verified: zero characters found, triggering character creator in UI!');

  // 3. Create a brand new character (simulating character creator save)
  console.log('\n--- 3. Testing Character Creation into fresh room ---');
  const newHeroId = 'hero-novato-' + Date.now();
  const createHeroRes = await fetch(base + '/api/game', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      room: getCleanData.room.id,
      version: getCleanData.room.version,
      action: 'character',
      value: {
        id: newHeroId,
        name: 'Aric Brasaforte',
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
        skills: ['Atletismo', 'Percepção'],
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
  if (createHeroRes.status !== 200) {
    const errBody = await createHeroRes.text();
    console.error('createHeroRes error:', errBody);
  }
  assert.strictEqual(createHeroRes.status, 200, 'Character creation should succeed');
  const heroCreatedData = await createHeroRes.json() as any;
  assert.strictEqual(heroCreatedData.room.state.characters.length, 1, 'Room now has exactly 1 character');
  assert.strictEqual(heroCreatedData.room.state.characters[0].name, 'Aric Brasaforte');
  console.log(`Created new hero: ${heroCreatedData.room.state.characters[0].name}`);

  // 4. Start Combat Encounter and Test Turn Passing ('pass')
  console.log('\n--- 4. Testing Combat and Turn Passing ---');
  const encRes = await fetch(base + '/api/game', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      room: heroCreatedData.room.id,
      version: heroCreatedData.room.version,
      action: 'encounter'
    })
  });
  assert.strictEqual(encRes.status, 200, 'Encounter start should succeed');
  const encData = await encRes.json() as any;
  assert.strictEqual(encData.room.state.combat, true, 'Combat should be active');
  assert.ok(encData.room.state.order.length >= 2, 'Initiative order should contain both hero and enemy');
  console.log(`Combat active! Order:`, encData.room.state.order);

  // Check turn passing ('pass')
  const currentTurnId = encData.room.state.order[encData.room.state.turn];
  console.log(`Current Turn Actor ID: ${currentTurnId}`);

  const passRes = await fetch(base + '/api/game', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      room: encData.room.id,
      version: encData.room.version,
      action: 'pass',
      character: currentTurnId
    })
  });
  assert.strictEqual(passRes.status, 200, 'Pass turn action should succeed');
  const passData = await passRes.json() as any;
  const nextTurnId = passData.room.state.order[passData.room.state.turn];
  console.log(`Turn passed successfully! Next turn actor ID: ${nextTurnId}`);

  // 5. Clean up by wiping again to leave a pristine initial state
  console.log('\n--- 5. Final Wipe to leave fresh state for user ---');
  const finalWipe = await fetch(base + '/api/game', {
    method: 'POST',
    headers,
    body: JSON.stringify({ action: 'wipe' })
  });
  const finalWipeData = await finalWipe.json() as any;
  assert.strictEqual(finalWipeData.room.state.characters.length, 0, 'Final state left completely pristine with 0 characters');

  console.log('\nAll tests passed successfully!');
}

run().catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
