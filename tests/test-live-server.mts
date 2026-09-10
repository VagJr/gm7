// tests/test-live-server.mts
import assert from 'node:assert';

console.log('Testing live server API endpoints and combat HP synchronization on http://localhost:5173...');

const base = 'http://localhost:5173';

async function run() {
  // Obtain local auth cookie
  const auth = await fetch(base + '/signin-with-chatgpt?return_to=/', { redirect: 'manual' });
  const cookie = auth.headers.get('set-cookie')?.split(';')[0];
  assert(cookie, 'Local session cookie obtained');

  const headers = {
    cookie,
    'Content-Type': 'application/json',
    Origin: base
  };

  // 1. Fetch initial room
  const getRes = await fetch(base + '/api/game', { headers });
  assert.strictEqual(getRes.status, 200, 'GET /api/game should return 200');
  const getData = await getRes.json() as any;
  assert.ok(getData.signedIn, 'User should be signed in');
  assert.ok(getData.room, 'Room should be present');
  const room = getData.room;
  const initialEnemy = room.state.enemies[0];
  assert.ok(initialEnemy, 'Enemies should exist');
  console.log(`Initial Room loaded: "${room.name}" (version ${room.version}). Enemy: ${initialEnemy.name} (${initialEnemy.hp}/${initialEnemy.maxHp} PV)`);

  const hero = room.state.characters[0];
  assert.ok(hero, 'Hero should exist');

  // End any stale combat from prior test runs to reset turn state
  if (room.state.combat) {
    const endRes = await fetch(base + '/api/game', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        room: room.id,
        version: room.version,
        action: 'endCombat'
      })
    });
    const endData = await endRes.json() as any;
    room.version = endData.room.version;
    room.state = endData.room.state;
  }

  // Restore hero HP if unconscious
  if (hero.hp <= 0) {
    const restRes = await fetch(base + '/api/game', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        room: room.id,
        version: room.version,
        action: 'rest'
      })
    });
    const restData = await restRes.json() as any;
    room.version = restData.room.version;
    room.state = restData.room.state;
    hero.hp = hero.maxHp;
  }

  // 2. Perform Attack on the live server
  const attackRes = await fetch(base + '/api/game', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      room: room.id,
      version: room.version,
      action: 'attack',
      character: hero.id,
      target: initialEnemy.id,
      damageFormula: '1d8+3',
      mode: 'normal'
    })
  });

  if (!attackRes.ok) {
    console.error('Attack error detail:', await attackRes.text());
  }
  assert.strictEqual(attackRes.status, 200, 'POST /api/game attack should succeed');
  const attackData = await attackRes.json() as any;
  assert.ok(attackData.ok, 'Attack response should be ok');
  assert.ok(attackData.room, 'Updated room should be returned');
  assert.ok(attackData.attackResult, 'Attack result should be returned');

  const updatedEnemy = attackData.room.state.enemies.find((e: any) => e.id === initialEnemy.id);
  console.log(`Attack executed! Roll: ${attackData.attackResult.d20Roll}, Hit: ${attackData.attackResult.hit}, Damage: ${attackData.attackResult.damage}`);
  if (attackData.attackResult.hit) {
    console.log(`Enemy HP reduced from ${initialEnemy.hp} to ${updatedEnemy.hp} PV!`);
    assert.ok(updatedEnemy.hp <= initialEnemy.hp, 'Enemy HP must decrease upon hit');
  }

  // 3. Re-fetch room directly from DB to prove zero HP refill / desync
  const reGetRes = await fetch(`${base}/api/game?room=${encodeURIComponent(room.id)}`, { headers });
  const reGetData = await reGetRes.json() as any;
  const persistedEnemy = reGetData.room.state.enemies.find((e: any) => e.id === initialEnemy.id);
  assert.strictEqual(persistedEnemy.hp, updatedEnemy.hp, 'Enemy HP in database must match updated HP exactly (never refills)');
  console.log(`Persisted Database Check: Enemy HP is still ${persistedEnemy.hp} PV! Zero refilling confirmed.`);

  // 4. Test Campaign Act Advance (Ato II: Catacumbas)
  const actRes = await fetch(base + '/api/game', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      room: room.id,
      version: attackData.room.version,
      action: 'advanceAct',
      act: 2
    })
  });
  assert.strictEqual(actRes.status, 200, 'POST advanceAct to Act 2 should succeed');
  const actData = await actRes.json() as any;
  const act2Boss = actData.room.state.enemies.find((e: any) => e.name === 'Guardião Espectral');
  assert.ok(act2Boss, 'Act 2 boss Guardião Espectral should be spawned');
  console.log(`Act 2 Advanced! Boss: ${act2Boss.name} (${act2Boss.hp}/${act2Boss.maxHp} PV, CA ${act2Boss.ac})`);

  // 5. Test Groq AI Narration on live server
  const gmRes = await fetch(base + '/api/gm', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      room: room.id,
      version: actData.room.version,
      text: 'Examinar os três selos rúnicos nas paredes de pedra.'
    })
  });
  assert.strictEqual(gmRes.status, 200, 'POST /api/gm should succeed with status 200');
  const gmData = await gmRes.json() as any;
  assert.ok(gmData.ok, 'GM response should be ok');
  assert.ok(gmData.answer && gmData.answer.length > 20, 'GM answer should be vivid');
  console.log(`Groq AI Response received: "${gmData.answer.slice(0, 90)}..."`);
  console.log(`Groq AI Choices generated: ${JSON.stringify(gmData.choices)}`);

  console.log('\nALL LIVE SERVER TESTS PASSED 100%! All endpoints, synchronization, and Groq AI validated.');
}

run().catch((err) => {
  console.error('LIVE SERVER TEST FAILED:', err);
  process.exit(1);
});
