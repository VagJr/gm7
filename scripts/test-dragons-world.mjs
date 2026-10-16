import assert from 'node:assert/strict';
import { createServer } from 'vite';
const vite = await createServer({ configFile: false, logLevel: 'error', appType: 'custom', server: { middlewareMode: true }, resolve: { alias: { '@': process.cwd() } } });
try {
  const engine = await vite.ssrLoadModule('/lib/game-engine.ts');
  const world = await vite.ssrLoadModule('/lib/open-world.ts');
  const collision = await vite.ssrLoadModule('/lib/collision-system.ts');
  const bounds = await vite.ssrLoadModule('/lib/map-bounds.ts');
  const origins = await vite.ssrLoadModule('/lib/character-origins.ts');
  const draft = { ...engine.newCharacter(), name: 'Teste SRD', stats: [17,15,13,12,10,8], originBonuses: [2,1,0,0,0,0], gold: 999999, hp: 900, maxHp: 900, level: 20, speed: 150 };
  const hero = origins.createAuthoritativeHero(draft);
  assert.equal(hero.level, 1); assert.equal(hero.maxHp, 11); assert.equal(hero.gold, 50); assert.equal(hero.speed, 9);
  assert.throws(() => origins.createAuthoritativeHero({ ...draft, stats: [30,30,30,30,30,30] }));
  assert.throws(() => origins.createAuthoritativeHero({ ...draft, originBonuses: [0,0,0,2,1,0] }));
  for (const biome of ['village','forest','ruins','dungeon','canyon','lair']) {
    assert.equal(bounds.getBiomeGridSize(biome), 64);
    const start = world.legacyWorldPoint(biome, 4, 5), safe = bounds.nearestWalkablePoint(biome, start.x, start.y);
    assert.ok(collision.isGridTileWalkable(biome, safe.x, safe.y, 64));
    const goal = bounds.nearestWalkablePoint(biome, 32, 44);
    const path = collision.findPathAStar(safe, goal, biome, 64);
    assert.ok(path.length > 0, `${biome}: distrito deve ter saída para o mundo`);
    const actor = { ...hero, ...safe, biome };
    const state = { ...engine.initialState(), combat: false, biome, characters: [actor] };
    const validation = engine.validateWaypointPath(actor, path, state, 63, 64, collision.MAP_COLLISION_PROFILES[biome].customZones);
    assert.ok(validation.valid, `${biome}: ${validation.reason}`);
    assert.ok(world.worldLandmarks(biome).length > 5);
    for (const point of world.worldLandmarks(biome)) assert.ok(collision.isGridTileWalkable(biome, point.x, point.y, 64));
  }
  const state = engine.initialState(); state.characters = [engine.newCharacter()];
  const point=bounds.nearestWalkablePoint('village',32,44), outsider={...hero,...point,id:'outsider',biome:'village'};
  const goal=bounds.nearestWalkablePoint('village',32,45), path=collision.findPathAStar(point,goal,'village',64);
  const occupied={...engine.initialState(),biome:'village',combat:true,order:['other-player'],turn:0,movementUsed:99,characters:[outsider]};
  assert.ok(engine.validateWaypointPath(outsider,path,occupied,63,64,collision.MAP_COLLISION_PROFILES.village.customZones).valid,'O combate de outro jogador não bloqueia a exploração');
  occupied.order=[outsider.id];assert.equal(engine.validateWaypointPath(outsider,path,occupied,63,64,collision.MAP_COLLISION_PROFILES.village.customZones).valid,false,'Um participante continua respeitando seu deslocamento');
  assert.equal(world.migrateWorldCoordinates(state), true);
  const position = [state.characters[0].x,state.characters[0].y];
  assert.equal(world.migrateWorldCoordinates(state), false); assert.deepEqual([state.characters[0].x,state.characters[0].y],position);
  console.log('PASS: 6 regiões, saídas dos distritos, rotas sem atravessar obstáculos, migração idempotente e criação SRD autoritativa.');
} finally { await vite.close(); }
