import assert from 'node:assert/strict';

const base = 'http://localhost:5173';
const auth = await fetch(base + '/signin-with-chatgpt?return_to=/', { redirect: 'manual' });
const cookie = auth.headers.get('set-cookie')?.split(';')[0];
assert(cookie, 'local auth cookie');

console.log('🧪 Testing Biome Travel & Persistence (Vila -> Mata -> Dungeon)...');

// 1. Create room
const roomRes = await fetch(base + '/api/game', {
  method: 'POST',
  headers: { cookie, 'Content-Type': 'application/json', Origin: base },
  body: JSON.stringify({ action: 'create', name: 'Mesa de Teste Viagem' })
});
const { id: roomId } = (await roomRes.json()) as { id: string };
assert(roomId, 'Room created');

// 2. Fetch room initial state (should be village)
const getRes1 = await fetch(base + '/api/game?room=' + encodeURIComponent(roomId), {
  headers: { cookie, Origin: base }
});
const data1 = (await getRes1.json()) as { room: { state: { biome?: string; location: number } } };
console.log(`Initial: location = ${data1.room.state.location}, biome = ${data1.room.state.biome}`);
assert.strictEqual(data1.room.state.biome, 'village');
assert.strictEqual(data1.room.state.location, 0);

// 3. Travel to Mata (Forest, location: 1)
console.log('Traveling to Mata (Floresta dos Sussurros)...');
const travelResForest = await fetch(base + '/api/game', {
  method: 'POST',
  headers: { cookie, 'Content-Type': 'application/json', Origin: base },
  body: JSON.stringify({ room: roomId, version: 0, action: 'location', location: 1, biome: 'forest' })
});
const dataForest = (await travelResForest.json()) as { room: { state: { biome?: string; location: number; enemies: any[] } } };
console.log(`Mata Result: location = ${dataForest.room.state.location}, biome = ${dataForest.room.state.biome}, enemies = ${dataForest.room.state.enemies.length}`);
assert.strictEqual(dataForest.room.state.biome, 'forest', 'Biome must be forest');
assert.strictEqual(dataForest.room.state.location, 1, 'Location index must be 1');
assert(dataForest.room.state.enemies.length > 0, 'Enemies should spawn in forest');

// 4. Travel to Dungeon (Catacumbas, location: 2)
console.log('Traveling to Dungeon (Catacumbas dos Três Selos)...');
const travelResDungeon = await fetch(base + '/api/game', {
  method: 'POST',
  headers: { cookie, 'Content-Type': 'application/json', Origin: base },
  body: JSON.stringify({ room: roomId, version: 1, action: 'location', location: 2, biome: 'dungeon' })
});
const dataDungeon = (await travelResDungeon.json()) as { room: { state: { biome?: string; location: number; enemies: any[] } } };
console.log(`Dungeon Result: location = ${dataDungeon.room.state.location}, biome = ${dataDungeon.room.state.biome}, enemies = ${dataDungeon.room.state.enemies.length}`);
assert.strictEqual(dataDungeon.room.state.biome, 'dungeon', 'Biome must be dungeon');
assert.strictEqual(dataDungeon.room.state.location, 2, 'Location index must be 2');
assert(dataDungeon.room.state.enemies.some(e => e.name.includes('Guardião')), 'Guardião Espectral should spawn in dungeon');

// 5. Test Groq AI reading key from .env without passing key in body
console.log('Testing Groq AI narration without key (reading from process.env)...');
const gmRes = await fetch(base + '/api/gm', {
  method: 'POST',
  headers: { cookie, 'Content-Type': 'application/json', Origin: base },
  body: JSON.stringify({
    room: roomId,
    version: 2,
    text: 'Eu desembainho a espada e avanço pelas lajes da catacumba.'
  })
});
const gmData = (await gmRes.json()) as { ok?: boolean; answer?: string; choices?: string[]; error?: string };
console.log('Groq status:', gmRes.status);
assert.strictEqual(gmRes.status, 200, gmData.error);
assert(gmData.ok);
assert(gmData.answer && gmData.answer.length > 10);
console.log(`Groq narration response: "${gmData.answer.slice(0, 75)}..."`);

console.log('🎉 ALL BIOME TRAVEL & ENV GROQ TESTS PASSED PERFECTLY! 🗺️✨');
