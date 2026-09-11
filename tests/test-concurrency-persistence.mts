// tests/test-concurrency-persistence.mts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const BASE_URL = 'http://localhost:5173';

describe('Concurrency Control & SQLite Data Persistence Suite', () => {
  it('should enforce optimistic concurrency locking with HTTP 409 when two requests submit with the same version', async () => {
    // 1. Establish session
    const initRes = await fetch(`${BASE_URL}/api/game`);
    const setCookie = initRes.headers.get('set-cookie') || '';
    const cookie = `lume_session_id=${/lume_session_id=([^;]+)/.exec(setCookie)?.[1] || ''}`;
    const initData = await initRes.json();
    const roomId = initData.room.id;
    const initialVersion = initData.room.version;

    assert.ok(roomId, 'Room ID should exist');
    assert.ok(initialVersion >= 0, 'Initial room version should be at least 0');

    // 2. Fire two concurrent POST requests with the EXACT SAME room version
    const [res1, res2] = await Promise.all([
      fetch(`${BASE_URL}/api/game`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({
          room: roomId,
          version: initialVersion,
          action: 'notes',
          notes: 'Nota enviada pela Operação Alfa'
        })
      }),
      fetch(`${BASE_URL}/api/game`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({
          room: roomId,
          version: initialVersion,
          action: 'notes',
          notes: 'Nota enviada pela Operação Beta'
        })
      })
    ]);

    const statuses = [res1.status, res2.status].sort();
    
    // Exactly one request must succeed (200) and the conflicting request must be rejected with 409
    assert.deepEqual(
      statuses,
      [200, 409],
      `Expected one 200 OK and one 409 Conflict, received statuses: [${res1.status}, ${res2.status}]`
    );

    const conflictRes = res1.status === 409 ? res1 : res2;
    const conflictData = await conflictRes.json();
    assert.match(
      conflictData.error,
      /mudou|chegou primeiro|atualize/i,
      `Conflict message should explain version divergence: ${conflictData.error}`
    );

    // 3. Verify that the room version in DB has been incremented exactly by 1
    const verifyRes = await fetch(`${BASE_URL}/api/game?room=${encodeURIComponent(roomId)}`, {
      headers: { Cookie: cookie }
    });
    const verifyData = await verifyRes.json();
    assert.equal(
      verifyData.room.version,
      initialVersion + 1,
      `Room version should have advanced by exactly 1 to ${initialVersion + 1}`
    );
  });

  it('should reliably persist complex state updates across requests and session reloads', async () => {
    // 1. Establish session
    const initRes = await fetch(`${BASE_URL}/api/game`);
    const setCookie = initRes.headers.get('set-cookie') || '';
    const cookie = `lume_session_id=${/lume_session_id=([^;]+)/.exec(setCookie)?.[1] || ''}`;
    const initData = await initRes.json();
    const roomId = initData.room.id;
    let version = initData.room.version;

    // 2. Add Character to room
    const charId = `persisted_char_${Date.now()}`;
    const charRes = await fetch(`${BASE_URL}/api/game`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        room: roomId,
        version,
        action: 'character',
        character: {
          id: charId,
          name: 'Guardião de Ferro',
          className: 'Guerreiro',
          species: 'Anão',
          background: 'Soldado',
          level: 2,
          stats: [16, 10, 16, 8, 12, 8],
          skills: ['Atletismo'],
          expertise: [],
          saves: [0, 2],
          hp: 20,
          maxHp: 20,
          ac: 18,
          speed: 7.5,
          attack: 5,
          damage: '1d8+3',
          weapon: 'Machado de Batalha',
          spellAbility: 0,
          slots: [0, 0, 0, 0, 0, 0, 0, 0, 0],
          usedSlots: [0, 0, 0, 0, 0, 0, 0, 0, 0],
          features: 'Retomar o Fôlego',
          spells: '',
          inventory: 'Poção de Cura x2',
          notes: 'Guardião ancestral',
          conditions: [],
          x: 5,
          y: 7,
          xp: 300,
          initiative: 0,
          deathSuccess: 0,
          deathFail: 0,
          exhaustion: 0,
          equipment: {
            mainHand: 'machado-batalha',
            armor: 'cota-de-malha',
            offHand: 'escudo'
          }
        }
      })
    });
    assert.equal(charRes.status, 200);
    const charData = await charRes.json();
    version = charData.room.version;

    // 3. Update quest step
    const questRes = await fetch(`${BASE_URL}/api/game`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        room: roomId,
        version,
        action: 'questStep',
        step: 'ancient_seal_found',
        logText: 'O selo ancestral das catacumbas foi localizado.'
      })
    });
    assert.equal(questRes.status, 200);
    const questData = await questRes.json();
    version = questData.room.version;

    // 4. Move character to new tactical coordinates (4, 7)
    const moveRes = await fetch(`${BASE_URL}/api/game`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        room: roomId,
        version,
        action: 'move',
        character: charId,
        x: 4,
        y: 7
      })
    });
    assert.equal(moveRes.status, 200);
    const moveData = await moveRes.json();
    version = moveData.room.version;

    // 5. Query room again in a completely fresh GET request
    const reloadRes = await fetch(`${BASE_URL}/api/game?room=${encodeURIComponent(roomId)}`, {
      headers: { Cookie: cookie }
    });
    assert.equal(reloadRes.status, 200);
    const reloadData = await reloadRes.json();

    // Verify all persisted state in SQLite matches exactly
    const persistedRoom = reloadData.room;
    assert.equal(persistedRoom.version, version, 'Room version must match last committed mutation');
    
    const persistedChar = persistedRoom.state.characters.find((c: any) => c.id === charId);
    assert.ok(persistedChar, 'Character must be persisted in database');
    assert.equal(persistedChar.name, 'Guardião de Ferro');
    assert.equal(persistedChar.hp, 20);
    assert.equal(persistedChar.x, 4, 'Character X position must be 4');
    assert.equal(persistedChar.y, 7, 'Character Y position must be 7');
    assert.equal(persistedChar.equipment.offHand, 'escudo');

    // Verify questProgress is persisted
    assert.equal(persistedRoom.state.questProgress?.ancient_seal_found, true, 'Quest progress flag must be persisted');
  });
});
