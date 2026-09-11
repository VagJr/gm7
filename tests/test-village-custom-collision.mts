// tests/test-village-custom-collision.mts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  MAP_COLLISION_PROFILES,
  VILLAGE_CUSTOM_ZONES,
  isNormalizedCoordWalkable,
  isGridTileWalkable,
  isPointWalkableWithPolygons,
  findPathAStar
} from '../lib/collision-system.ts';

const BASE_URL = 'http://localhost:5173';

describe('Village Custom Collision Map & In-Game Integration', () => {
  it('should have 29 custom zones loaded in public/maps/vila-collision.json and MAP_COLLISION_PROFILES.village', () => {
    // 1. Verify file on disk
    const jsonPath = path.join(process.cwd(), 'public', 'maps', 'vila-collision.json');
    assert.ok(fs.existsSync(jsonPath), 'public/maps/vila-collision.json should exist');
    const content = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    assert.equal(content.zones.length, 29, 'File should contain exactly 29 zones');
    assert.equal(content.gridSize, 8, 'File grid size should be 8');
    assert.equal(content.imageSrc, '/maps/vila.png', 'File imageSrc should be /maps/vila.png');

    // 2. Verify static engine profile
    assert.equal(VILLAGE_CUSTOM_ZONES.length, 29, 'VILLAGE_CUSTOM_ZONES should contain 29 zones');
    const villageProfile = MAP_COLLISION_PROFILES.village;
    assert.ok(villageProfile.customZones, 'village profile should have customZones defined');
    assert.equal(villageProfile.customZones.length, 29, 'village customZones should have 29 zones');
  });

  it('should accurately block obstacle houses and water, while keeping roads and doorways walkable', () => {
    // Inside Zone 1: Bloqueado (Parede/Obstáculo) 1 [0.0537..0.1319, 0.1114..0.1922]
    const insideHouse1 = isNormalizedCoordWalkable('village', 0.09, 0.15);
    assert.equal(insideHouse1, false, 'Inside house 1 should be blocked');

    // Inside Zone 10: Bloqueado 10 [0.3461..0.4641, 0.0986..0.1922]
    const insideHouse10 = isNormalizedCoordWalkable('village', 0.40, 0.15);
    assert.equal(insideHouse10, false, 'Inside house 10 should be blocked');

    // Inside Zone 17: Água Profunda 17 [0.7822..0.9976, 0.7668..0.9694]
    const insideWater = isNormalizedCoordWalkable('village', 0.85, 0.82);
    assert.equal(insideWater, false, 'Inside deep water 17 should be blocked');

    // Inside Zone 29: Porta 29 [0.1794..0.2743, 0.0062..0.0729]
    const insideDoorway = isNormalizedCoordWalkable('village', 0.22, 0.04);
    assert.equal(insideDoorway, true, 'Inside doorway 29 should be walkable');

    // Inside Zone 21: Caminhável (Passagem) 21 (Street in front of northern houses)
    const inStreet = isNormalizedCoordWalkable('village', 0.22, 0.12);
    assert.equal(inStreet, true, 'Inside street 21 should be walkable');
  });

  it('should calculate A* path through the user streets and reject paths into blocked houses', () => {
    const gridSize = 8;
    // Start at walkable tile (1, 1) to destination (4, 4)
    const path = findPathAStar({ x: 1, y: 1 }, { x: 4, y: 4 }, 'village', gridSize);
    assert.ok(path.length > 0, 'Path should be found across village');
    assert.equal(path[0].x, 1);
    assert.equal(path[0].y, 1);
    assert.equal(path[path.length - 1].x, 4);
    assert.equal(path[path.length - 1].y, 4);

    // Tile (0, 1) contains house 1 and house 2 (blocked)
    const blockedTileWalkable = isGridTileWalkable('village', 0, 1, gridSize);
    assert.equal(blockedTileWalkable, false, 'Tile (0, 1) containing houses should be blocked');

    // Attempt path to blocked tile (0, 1)
    const pathIntoHouse = findPathAStar({ x: 1, y: 1 }, { x: 0, y: 1 }, 'village', gridSize);
    assert.equal(pathIntoHouse.length, 0, 'Path into blocked house must return empty array');
  });

  it('should serve custom collision data via GET /api/map-collision and persist updates via POST', async () => {
    // 1. GET /api/map-collision?biome=village
    const resGet = await fetch(`${BASE_URL}/api/map-collision?biome=village`);
    assert.equal(resGet.status, 200);
    const dataGet = await resGet.json();
    assert.equal(dataGet.success, true);
    assert.equal(dataGet.zones.length, 29, 'API should return 29 zones');
    assert.equal(dataGet.gridSize, 8);

    // 2. POST /api/map-collision
    const resPost = await fetch(`${BASE_URL}/api/map-collision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        biome: 'village',
        gridSize: 8,
        zones: dataGet.zones
      })
    });
    assert.equal(resPost.status, 200);
    const dataPost = await resPost.json();
    assert.equal(dataPost.success, true);
    assert.equal(dataPost.zonesCount, 29);
  });

  it('should enforce the new collision boundaries on the live /api/game server', async () => {
    // 1. Create a session and room
    const initRes = await fetch(`${BASE_URL}/api/game`);
    const setCookie = initRes.headers.get('set-cookie') || '';
    const cookie = `lume_session_id=${/lume_session_id=([^;]+)/.exec(setCookie)?.[1] || ''}`;
    const initData = await initRes.json();
    const roomId = initData.room.id;
    let version = initData.room.version;

    // 2. Create Hero in village at walkable tile (1, 1)
    const heroId = `hero_coll_${Date.now()}`;
    const charRes = await fetch(`${BASE_URL}/api/game`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        room: roomId,
        version,
        action: 'character',
        character: {
          id: heroId,
          name: 'Explorador da Vila',
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
          x: 1,
          y: 1,
          xp: 0,
          initiative: 0,
          deathSuccess: 0,
          deathFail: 0,
          exhaustion: 0
        }
      })
    });
    assert.equal(charRes.status, 200);
    const charData = await charRes.json();
    version = charData.room.version;

    // 3. Move Hero to a walkable street tile (2, 1) -> SUCCEEDS
    const validMoveRes = await fetch(`${BASE_URL}/api/game`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        room: roomId,
        version,
        action: 'move',
        character: heroId,
        x: 2,
        y: 1
      })
    });
    assert.equal(validMoveRes.status, 200, 'Moving to open street (2, 1) must succeed');
    const validMoveData = await validMoveRes.json();
    version = validMoveData.room.version;

    // 4. Attempt to move into blocked House 1 at tile (0, 1) -> MUST BE REJECTED (HTTP 400)
    const blockedMoveRes = await fetch(`${BASE_URL}/api/game`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        room: roomId,
        version,
        action: 'move',
        character: heroId,
        x: 0,
        y: 1 // Inside house 1 and 2
      })
    });
    assert.equal(blockedMoveRes.status, 400, 'Moving into house box must be rejected');
    const blockedData = await blockedMoveRes.json();
    assert.match(blockedData.error, /Destino intransponível|obstáculo/i);
  });
});
