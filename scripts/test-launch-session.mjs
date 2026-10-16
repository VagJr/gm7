import assert from 'node:assert/strict';

const base = process.env.TEST_BASE_URL || 'http://localhost:5173';
async function client() {
  const response = await fetch(base + '/api/game?room=mmo-world-village');
  assert.equal(response.status, 200);
  const cookie = response.headers.get('set-cookie')?.split(';')[0];
  assert.ok(cookie, 'New browser receives a session');
  return async (path, body) => {
    const res = await fetch(base + path, { method: body ? 'POST' : 'GET', headers: { Cookie: cookie, 'Content-Type': 'application/json', Origin: base }, ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: res.status, data: await res.json() };
  };
}

const owner = await client();
const visitor = await client();
const created = await owner('/api/game', { action: 'create', name: '[QA] Isolamento de campanha' });
assert.equal(created.status, 200);
assert.notEqual(created.data.id, 'mmo-world-village');
const roomPath = '/api/game?room=' + created.data.id;
const saved = await owner(roomPath);
assert.equal(saved.data.room.id, created.data.id);
assert.equal(saved.data.room.state.characters.length, 0);
assert.equal((await visitor(roomPath)).status, 404, 'Private campaign cannot be read by guessing its id');
assert.equal((await visitor('/api/game', { action: 'notes', room: created.data.id, notes: 'unauthorized' })).status, 404, 'Private campaign rejects outsider writes');
assert.equal((await visitor('/api/game', { action: 'join', code: saved.data.room.code })).status, 200);
assert.equal((await visitor(roomPath)).data.room.id, created.data.id, 'Valid invitation grants access');
assert.equal((await owner('/api/game?wipe=1')).status, 405);
assert.equal((await owner('/api/wipe')).status, 405);
assert.equal((await owner('/api/game', { action: 'resetAll' })).status, 405);
assert.equal((await owner(roomPath)).data.room.id, created.data.id, 'Legacy resets leave campaign intact');
console.log('PASS: private creation, read/write isolation, invitation, three reset protections and save preservation.');
console.log('Test campaign retained as [QA] Isolamento de campanha; no existing saves were deleted.');
