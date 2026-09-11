// tests/test-session-isolation.mts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const BASE_URL = 'http://localhost:5173';

describe('Module 1: Anonymous Server-Generated Session Identity & Browser Isolation', () => {
  it('should generate distinct anonymous identities via Set-Cookie for two different browser clients', async () => {
    // 1. Browser Client A makes initial request without cookie
    const resA = await fetch(`${BASE_URL}/api/game`);
    assert.equal(resA.status, 200, 'Browser A GET /api/game should return 200');
    
    const setCookieA = resA.headers.get('set-cookie');
    assert.ok(setCookieA, 'Browser A should receive Set-Cookie header');
    assert.match(setCookieA, /lume_session_id=anon_[a-f0-9]+/, 'Cookie should be lume_session_id=anon_<id>');

    const matchA = /lume_session_id=([^;]+)/.exec(setCookieA || '');
    const cookieA = matchA ? `lume_session_id=${matchA[1]}` : '';
    assert.ok(cookieA, 'Browser A cookie should be parseable');

    const dataA = await resA.json();
    assert.ok(dataA.user, 'Browser A should have a user ID');
    assert.ok(dataA.user.startsWith('anon_'), 'Browser A user ID must start with anon_');
    assert.notEqual(dataA.user, 'local_hero', 'User ID must NOT be fixed local_hero');
    assert.notEqual(dataA.user, 'local-hero', 'User ID must NOT be fixed local-hero');

    // 2. Browser Client B makes initial request without cookie
    const resB = await fetch(`${BASE_URL}/api/game`);
    assert.equal(resB.status, 200, 'Browser B GET /api/game should return 200');

    const setCookieB = resB.headers.get('set-cookie');
    assert.ok(setCookieB, 'Browser B should receive Set-Cookie header');
    const matchB = /lume_session_id=([^;]+)/.exec(setCookieB || '');
    const cookieB = matchB ? `lume_session_id=${matchB[1]}` : '';

    const dataB = await resB.json();
    assert.ok(dataB.user, 'Browser B should have a user ID');
    assert.ok(dataB.user.startsWith('anon_'), 'Browser B user ID must start with anon_');

    // 3. Verify identities are completely distinct
    assert.notEqual(dataA.user, dataB.user, 'Browser A and Browser B must receive DIFFERENT user IDs');
    assert.notEqual(cookieA, cookieB, 'Browser A and Browser B must receive DIFFERENT session cookies');

    // 4. Verify Browser A keeps identity with its cookie
    const resA2 = await fetch(`${BASE_URL}/api/game`, {
      headers: { Cookie: cookieA }
    });
    const dataA2 = await resA2.json();
    assert.equal(dataA2.user, dataA.user, 'Browser A should retain identical user ID across requests with its cookie');
  });

  it('should prevent Browser B from accessing or manipulating Browser A room and characters', async () => {
    // 1. Establish session for Browser A
    const resA = await fetch(`${BASE_URL}/api/game`);
    const setCookieA = resA.headers.get('set-cookie') || '';
    const cookieA = `lume_session_id=${/lume_session_id=([^;]+)/.exec(setCookieA)?.[1] || ''}`;
    const dataA = await resA.json();
    const roomA = dataA.room;
    assert.ok(roomA, 'Browser A should have an active room');

    // 2. Browser A creates a character
    const charAId = `char_a_${Date.now()}`;
    const createCharRes = await fetch(`${BASE_URL}/api/game`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieA
      },
      body: JSON.stringify({
        room: roomA.id,
        version: roomA.version,
        action: 'character',
        character: {
          id: charAId,
          name: 'Guerreiro de A',
          className: 'Guerreiro',
          species: 'Humano',
          background: 'Soldado',
          level: 1,
          stats: [16, 12, 14, 10, 10, 8],
          skills: ['Atletismo'],
          expertise: [],
          saves: [0, 2],
          hp: 12,
          maxHp: 12,
          ac: 16,
          speed: 9,
          attack: 5,
          damage: '1d8+3',
          weapon: 'Espada Longa',
          spellAbility: 0,
          slots: [0, 0, 0, 0, 0, 0, 0, 0, 0],
          usedSlots: [0, 0, 0, 0, 0, 0, 0, 0, 0],
          features: '',
          spells: '',
          inventory: '',
          notes: '',
          conditions: [],
          x: 2,
          y: 2,
          xp: 0,
          initiative: 0,
          deathSuccess: 0,
          deathFail: 0,
          exhaustion: 0,
          equipment: {
            mainHand: 'espada-longa',
            armor: 'cota-de-malha'
          }
        }
      })
    });
    assert.equal(createCharRes.status, 200, 'Browser A should successfully create character');
    const createCharData = await createCharRes.json();
    assert.ok(createCharData.ok, 'Creation response should be ok');

    // 3. Establish session for Browser B
    const resB = await fetch(`${BASE_URL}/api/game`);
    const setCookieB = resB.headers.get('set-cookie') || '';
    const cookieB = `lume_session_id=${/lume_session_id=([^;]+)/.exec(setCookieB)?.[1] || ''}`;

    // 4. Browser B attempts to read Browser A private room
    const accessRoomRes = await fetch(`${BASE_URL}/api/game?room=${encodeURIComponent(roomA.id)}`, {
      headers: { Cookie: cookieB }
    });
    assert.equal(accessRoomRes.status, 404, 'Browser B must NOT be able to view Browser A private room (expected 404)');

    // 5. Browser B attempts to maliciously alter Browser A character
    const tamperRes = await fetch(`${BASE_URL}/api/game`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieB
      },
      body: JSON.stringify({
        room: roomA.id,
        version: 1,
        action: 'character',
        character: {
          id: charAId,
          name: 'Hacked by B',
          className: 'Guerreiro',
          species: 'Humano',
          background: 'Soldado',
          level: 1,
          stats: [10, 10, 10, 10, 10, 10],
          skills: [],
          expertise: [],
          saves: [0, 0],
          hp: 1,
          maxHp: 1,
          ac: 10,
          speed: 9,
          attack: 0,
          damage: '1d4',
          weapon: 'Adaga',
          spellAbility: 0,
          slots: [0, 0, 0, 0, 0, 0, 0, 0, 0],
          usedSlots: [0, 0, 0, 0, 0, 0, 0, 0, 0],
          features: '',
          spells: '',
          inventory: '',
          notes: '',
          conditions: [],
          x: 0,
          y: 0,
          xp: 0,
          initiative: 0,
          deathSuccess: 0,
          deathFail: 0,
          exhaustion: 0
        }
      })
    });
    assert.ok(
      tamperRes.status === 400 || tamperRes.status === 404,
      `Browser B character tampering must be rejected (got ${tamperRes.status})`
    );
    const tamperData = await tamperRes.json();
    assert.ok(
      tamperData.error.includes('Mesa não encontrada') ||
      tamperData.error.includes('pertence a outro jogador') ||
      tamperData.error.includes('Somente o anfitrião'),
      `Error must cite ownership or non-existence: ${tamperData.error}`
    );
  });
});
