import assert from 'node:assert/strict';

const base = 'http://localhost:5173';
const auth = await fetch(base + '/signin-with-chatgpt?return_to=/', { redirect: 'manual' });
const cookie = auth.headers.get('set-cookie')?.split(';')[0];
assert(cookie, 'local auth cookie');

// 1. Create room
const roomRes = await fetch(base + '/api/game', {
  method: 'POST',
  headers: { cookie, 'Content-Type': 'application/json', Origin: base },
  body: JSON.stringify({ action: 'create', name: 'Mesa de Teste Groq' })
});
const { id: roomId } = await roomRes.json() as { id: string };
assert(roomId);

// 2. Call GM with Groq key
console.log('Testing Groq AI GM Narration...');
const gmRes = await fetch(base + '/api/gm', {
  method: 'POST',
  headers: { cookie, 'Content-Type': 'application/json', Origin: base },
  body: JSON.stringify({
    room: roomId,
    version: 0,
    text: 'Eu examino a fonte seca e a estátua antiga.'
  })
});

const gmData = await gmRes.json() as { ok?: boolean; answer?: string; choices?: string[]; error?: string };
console.log('GM Status:', gmRes.status);
console.log('GM Response:', gmData);

assert.equal(gmRes.status, 200, gmData.error);
assert(gmData.ok);
assert(gmData.answer && gmData.answer.length > 10);
console.log('PASS: Groq API responds with dramatic narration and choices!');
