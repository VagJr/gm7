import assert from 'node:assert';
import http from 'node:http';

const baseUrl = 'http://127.0.0.1:5173';

async function createClientSession(name: string) {
  const initRes = await fetch(`${baseUrl}/api/game?room=mmo-world-village`);
  const setCookie = initRes.headers.get('set-cookie');
  assert(setCookie, `Client ${name} must receive session cookie`);
  const sessionCookie = setCookie.split(';')[0];

  const authRes = await fetch(`${baseUrl}/api/game`, {
    headers: { Cookie: sessionCookie }
  });
  const data = await authRes.json() as any;
  return {
    name,
    userId: data.user,
    sessionCookie
  };
}

function listenToSseUpdates(roomId: string, cookie: string, onUpdate: (data: any) => void) {
  const url = new URL(`${baseUrl}/api/game/stream?room=${encodeURIComponent(roomId)}`);
  const req = http.request(
    {
      hostname: url.hostname,
      port: url.port,
      path: `${url.pathname}${url.search}`,
      method: 'GET',
      headers: {
        Cookie: cookie,
        Accept: 'text/event-stream'
      }
    },
    (res) => {
      let buffer = '';
      let currentEvent = '';
      let currentData = '';
      res.on('data', (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() || '';

        for (const rawLine of lines) {
          const line = rawLine.trim();
          if (line.startsWith('event:')) {
            currentEvent = line.replace(/^event:\s*/, '').trim();
          } else if (line.startsWith('data:')) {
            currentData = line.replace(/^data:\s*/, '').trim();
          } else if (line === '' && currentData) {
            try {
              const parsed = JSON.parse(currentData);
              onUpdate({ event: currentEvent || 'message', data: parsed });
            } catch (e) {
              console.warn('JSON parse error in test parser:', e);
            }
            currentEvent = '';
            currentData = '';
          }
        }
      });
    }
  );

  req.on('error', (err) => console.warn('SSE test connection error:', err));
  req.end();
  return () => req.destroy();
}

async function runRealtimeSyncTests() {
  console.log('🚀 Starting MMO Dedicated Real-Time Sync & SSE Stream Test Suite...\n');

  // 1. Authenticate Clients
  console.log('--- Test 1: Authenticate Client A and Client B ---');
  const clientA = await createClientSession('ClientA');
  const clientB = await createClientSession('ClientB');
  console.log(`✅ Client A: ${clientA.userId}`);
  console.log(`✅ Client B: ${clientB.userId}`);

  // Wipe MMO room to clean test state
  await fetch(`${baseUrl}/api/game?room=mmo-world-village&wipe=1`, {
    headers: { Cookie: clientA.sessionCookie }
  });

  // 2. Connect Client B to SSE Stream
  console.log('\n--- Test 2: Client B connects to real-time SSE stream ---');
  const receivedUpdates: any[] = [];
  const closeStream = listenToSseUpdates('mmo-world-village', clientB.sessionCookie, (payload) => {
    receivedUpdates.push(payload);
  });

  // Wait for initial SSE handshake
  for (let i = 0; i < 25 && receivedUpdates.length === 0; i++) {
    await new Promise((r) => setTimeout(r, 50));
  }
  assert(receivedUpdates.length >= 1, 'Client B should receive initial SSE handshake');
  assert.strictEqual(receivedUpdates[0].event, 'init', 'First event must be init');
  console.log('✅ Client B connected to real-time SSE stream and received handshake!');

  // 3. Client A creates a hero; Client B should receive SSE push immediately (< 100ms)
  console.log('\n--- Test 3: Instant Player Entry: Client A creates hero, Client B receives real-time SSE push ---');
  const startTime = Date.now();
  const createHeroRes = await fetch(`${baseUrl}/api/game`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: clientA.sessionCookie },
    body: JSON.stringify({
      room: 'mmo-world-village',
      action: 'character',
      value: {
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
        x: 2,
        y: 3
      }
    })
  });
  const heroAData = await createHeroRes.json() as any;
  assert(createHeroRes.ok, 'Hero creation should succeed: ' + JSON.stringify(heroAData));
  const heroA = heroAData.room.state.characters[0];
  assert(heroA, 'Hero A should exist');

  // Wait for SSE message to arrive on Client B
  let heroAPushed = false;
  for (let i = 0; i < 20; i++) {
    const found = receivedUpdates.find(
      (u) => u.event === 'update' && u.data.state?.characters?.some((c: any) => c.id === heroA.id)
    );
    if (found) {
      heroAPushed = true;
      const latency = Date.now() - startTime;
      console.log(`✅ Client B received Client A hero entry in ${latency}ms via Server-Sent Events!`);
      break;
    }
    await new Promise((r) => setTimeout(r, 25));
  }
  assert(heroAPushed, 'Client B must receive real-time push of Client A hero entry');

  // 4. Client A moves hero; Client B receives real-time coordinate update (< 50ms)
  console.log('\n--- Test 4: Real-Time Movement: Client A moves, Client B receives coordinate push ---');
  const moveStart = Date.now();
  const moveRes = await fetch(`${baseUrl}/api/game`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: clientA.sessionCookie },
    body: JSON.stringify({
      room: 'mmo-world-village',
      version: heroAData.room.version,
      action: 'move',
      character: heroA.id,
      x: 3,
      y: 3,
      maxBound: 7,
      gridSize: 8
    })
  });
  assert(moveRes.ok, 'Move action should succeed');
  const moveData = await moveRes.json() as any;

  let movePushed = false;
  for (let i = 0; i < 20; i++) {
    const found = receivedUpdates.find(
      (u) => u.event === 'update' && u.data.state?.characters?.some((c: any) => c.id === heroA.id && c.x === 3 && c.y === 3)
    );
    if (found) {
      movePushed = true;
      const latency = Date.now() - moveStart;
      console.log(`✅ Client B received Client A movement to (3, 3) in ${latency}ms via Server-Sent Events!`);
      break;
    }
    await new Promise((r) => setTimeout(r, 25));
  }
  assert(movePushed, 'Client B must receive real-time push of Client A movement without polling delay');

  // 5. Client B creates their own hero
  console.log('\n--- Test 5: Client B creates hero ---');
  const heroBRes = await fetch(`${baseUrl}/api/game`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: clientB.sessionCookie },
    body: JSON.stringify({
      room: 'mmo-world-village',
      version: moveData.room.version,
      action: 'character',
      value: {
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
        weapon: 'Bordão',
        damage: '1d6+1',
        slots: [2, 0, 0, 0, 0, 0, 0, 0, 0],
        usedSlots: [0, 0, 0, 0, 0, 0, 0, 0, 0],
        x: 4,
        y: 4
      }
    })
  });
  const heroBData = await heroBRes.json() as any;
  assert(heroBRes.ok, 'Client B hero creation should succeed: ' + JSON.stringify(heroBData));
  assert.strictEqual(heroBData.room.state.characters.length, 2, 'Room should have both characters');
  console.log('✅ Client B hero created: Lyra das Chamas');

  // Clean up stream
  closeStream();

  console.log('\n🎉 ALL 5 REAL-TIME MULTIPLAYER SYNC & SSE STREAM TESTS PASSED! 🎉\n');
}

runRealtimeSyncTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
