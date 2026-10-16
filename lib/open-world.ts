import type { BiomeType, CollisionPolygon } from './collision-system';
import type { State } from './game-engine';
import { nearestWalkablePoint } from './map-bounds';
export const WORLD_SIZE = 64;
export const CORE_START = 24;
export const CORE_SIZE = 16;
export const WORLD_MAP_VERSION = 3;
export const WALK_TILES_PER_SECOND = 2.2;
export type WorldProp = { id: string; x: number; y: number; kind: 'tree' | 'rock' | 'house' | 'water'; size: number; art?: number };
export type WorldLandmark = { id: string; x: number; y: number; kind: 'shrine' | 'cache' | 'camp'; name: string };
export function worldHash(x: number, y: number, salt = 0) {
  let h = Math.imul(x + 193, 374761393) ^ Math.imul(y + 719, 668265263) ^ Math.imul(salt + 17, 1274126177);
  h = Math.imul(h ^ h >>> 13, 1274126177); return (h ^ h >>> 16) >>> 0;
}
export function isWorldCore(x: number, y: number) { return x >= CORE_START && y >= CORE_START && x < CORE_START + CORE_SIZE && y < CORE_START + CORE_SIZE; }
export function legacyWorldPoint(biome: string, x: number, y: number) {
  const oldSize = ['ruins', 'canyon', 'lair'].includes(biome) ? 12 : 8;
  return { x: Math.max(CORE_START, Math.min(CORE_START + CORE_SIZE - 1, CORE_START + Math.floor((x + .5) * CORE_SIZE / oldSize))), y: Math.max(CORE_START, Math.min(CORE_START + CORE_SIZE - 1, CORE_START + Math.floor((y + .5) * CORE_SIZE / oldSize))) };
}
const propCache = new Map<string, WorldProp[]>();
export function worldProps(biome: BiomeType): WorldProp[] {
  const cached = propCache.get(biome); if (cached) return cached;
  const salt = ['village', 'forest', 'ruins', 'dungeon', 'canyon', 'lair'].indexOf(biome);
  const result: WorldProp[] = [];
  if(biome==='village'){
    for(const [i,[x,y]] of [[26,27],[29,27],[35,27],[38,27],[26,31],[38,31],[26,37],[29,39],[35,39],[38,37]].entries()) result.push({id:`town-${i}`,x,y,kind:'house',size:1.25,art:[12,13,14,15,17][i%5]});
  }else{
    for(const [i,[x,y]] of [[26,27],[29,26],[37,27],[38,31],[26,37],[29,39],[37,38]].entries()) result.push({id:`district-${i}`,x,y,kind:biome==='forest'?'tree':'rock',size:1.25,art:biome==='forest'?i%5:biome==='ruins'?18+i%6:biome==='dungeon'?20+i%4:30+i%6});
  }
  for (let y = 2; y < WORLD_SIZE - 2; y++) for (let x = 2; x < WORLD_SIZE - 2; x++) {
    if (isWorldCore(x, y) || Math.abs(x - 32) <= 2 || Math.abs(y - 32) <= 2) continue;
    const h = worldHash(x, y, salt); const riverX = 47 + Math.sin(y * .16) * 2;
    if (biome !== 'dungeon' && Math.abs(x - riverX) < 1.1 && ![16, 32, 48].some(n => Math.abs(y - n) < 2)) { result.push({ id: `river-${x}-${y}`, x, y, kind: 'water', size: .98 }); continue; }
    if (h % 100 < (biome === 'forest' ? 11 : biome === 'village' ? 5 : 3)) result.push({ id: `prop-${x}-${y}`, x, y, kind: biome === 'forest' || biome === 'village' ? 'tree' : 'rock', size: .8 + h % 4 / 10, art:biome==='forest'||biome==='village'?h%5:biome==='canyon'||biome==='lair'?30+h%6:6+h%3 });
    if (biome === 'village' && h % 173 === 0 && x < 45) result.push({ id: `house-${x}-${y}`, x, y, kind: 'house', size: .8 });
  }
  propCache.set(biome, result); return result;
}
export function worldZones(biome: BiomeType, original: CollisionPolygon[]): CollisionPolygon[] {
  const zones: CollisionPolygon[] = [];
  for (const prop of worldProps(biome)) {
    const r = prop.kind === 'water' ? .49 : prop.kind === 'house' ? .9 : .33;
    zones.push({ id: prop.id, name: prop.kind, type: prop.kind === 'water' ? 'agua' : 'bloqueado', points: [[(prop.x + .5 - r) / WORLD_SIZE, (prop.y + .5 - r) / WORLD_SIZE], [(prop.x + .5 + r) / WORLD_SIZE, (prop.y + .5 - r) / WORLD_SIZE], [(prop.x + .5 + r) / WORLD_SIZE, (prop.y + .5 + r) / WORLD_SIZE], [(prop.x + .5 - r) / WORLD_SIZE, (prop.y + .5 + r) / WORLD_SIZE]] });
  }
  return zones;
}
const landmarkCache = new Map<string, WorldLandmark[]>();
export function worldLandmarks(biome: BiomeType): WorldLandmark[] {
  const cached = landmarkCache.get(biome); if (cached) return cached;
  const result: WorldLandmark[] = []; const occupied = new Set(worldProps(biome).map(p => `${p.x},${p.y}`));
  for (let y = 8; y < WORLD_SIZE; y += 16) for (let x = 8; x < WORLD_SIZE; x += 16) {
    if (isWorldCore(x, y) || occupied.has(`${x},${y}`)) continue;
    const kind = ['shrine', 'cache', 'camp'][worldHash(x, y) % 3] as WorldLandmark['kind'];
    result.push({ id: `${biome}-${kind}-${x}-${y}`, x, y, kind, name: kind === 'shrine' ? 'Santuário esquecido' : kind === 'cache' ? 'Relíquias da estrada' : 'Acampamento de viajantes' });
  }
  landmarkCache.set(biome, result); return result;
}
export function migrateWorldCoordinates(state: State) {
  if (state.worldMapVersion === WORLD_MAP_VERSION) return false;
  const alreadyExpanded = (state.worldMapVersion || 0) >= 2;
  for (const entity of [...state.characters, ...state.enemies, ...state.npcs, ...(state.corpses || [])]) {
    if ('activeActivityId' in entity && entity.activeActivityId && state.activities?.[entity.activeActivityId]?.type === 'dungeon') continue;
    const point = alreadyExpanded ? {x:entity.x || 0,y:entity.y || 0} : legacyWorldPoint(entity.biome || state.biome || 'village', entity.x || 0, entity.y || 0);
    const safe = nearestWalkablePoint(entity.biome || state.biome || 'village', point.x, point.y);
    entity.x = safe.x; entity.y = safe.y;
  }
  state.worldMapVersion = WORLD_MAP_VERSION; return true;
}
