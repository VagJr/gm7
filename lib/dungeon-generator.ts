// lib/dungeon-generator.ts
// Gerador Procedural de Mapas para D&D 5e (SRD 5.2.1)

export type TileType = 'floor' | 'wall' | 'pillar' | 'door' | 'chest' | 'stairs' | 'shrine' | 'trap';

export interface DungeonTile {
  x: number;
  y: number;
  type: TileType;
  label?: string;
  revealed?: boolean;
  interactive?: boolean;
  loot?: { id: string; name: string; type: string }[];
}

export interface DungeonRoom {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  description: string;
  cleared: boolean;
}

export interface ProceduralDungeon {
  id: string;
  name: string;
  act: 1 | 2 | 3;
  width: number;
  height: number;
  tiles: DungeonTile[][];
  rooms: DungeonRoom[];
  spawnHero: { x: number; y: number };
  spawnStairs: { x: number; y: number };
  seed: number;
}

// Pseudo-random number generator with seed
function mulberry32(seed: number) {
  return function() {
    let t = (seed += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateProceduralDungeon(
  act: 1 | 2 | 3 = 1,
  size: 8 | 12 | 16 = 8,
  customSeed = Date.now()
): ProceduralDungeon {
  const rng = mulberry32(customSeed);
  const width = size;
  const height = size;

  const actTitles: Record<number, string> = {
    1: 'Claustro das Vozes • Abadia Esquecida',
    2: 'Catacumbas dos Três Selos',
    3: 'O Trono do Vazio • Santuário das Cinzas'
  };

  // 1. Initialize grid with walls
  const tiles: DungeonTile[][] = [];
  for (let y = 0; y < height; y++) {
    const row: DungeonTile[] = [];
    for (let x = 0; x < width; x++) {
      row.push({
        x,
        y,
        type: 'wall',
        revealed: false
      });
    }
    tiles.push(row);
  }

  // 2. Carve walkable areas and chambers
  const rooms: DungeonRoom[] = [];
  
  if (size === 8) {
    // 8x8 standard tactical grid: carve main courtyard/crypt with central obstacles
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        tiles[y][x].type = 'floor';
      }
    }
    // Add atmospheric pillars/obstacles
    tiles[3][3].type = 'pillar';
    tiles[3][4].type = 'pillar';
    tiles[1][3].type = 'shrine'; // ancient font or altar
    tiles[1][4].type = 'chest';  // old relic chest
    tiles[0][3].type = 'door';   // entry arch

    rooms.push({
      id: 'room-main',
      name: act === 1 ? 'Pátio das Lajes Rachadas' : act === 2 ? 'Cripta dos Escribas' : 'Altar de Obsidiana',
      x: 1,
      y: 1,
      width: 6,
      height: 6,
      description: 'Ruínas ancestrais de pedra escura cobertas por névoa e runas.',
      cleared: false
    });
  } else {
    // 12x12 or 16x16 expansive dungeon with 3-4 connected chambers
    const chamberConfigs = [
      { id: 'antechamber', name: 'Antecâmara das Vozes', rx: 1, ry: Math.floor(height / 2) - 2, rw: 4, rh: 5 },
      { id: 'hall', name: 'Corredor das Runas', rx: 5, ry: Math.floor(height / 2) - 1, rw: 3, rh: 3 },
      { id: 'sanctuary', name: 'Santuário Profundo', rx: 8, ry: 1, rw: Math.min(width - 9, 6), rh: height - 2 }
    ];

    for (const c of chamberConfigs) {
      for (let y = c.ry; y < Math.min(height - 1, c.ry + c.rh); y++) {
        for (let x = c.rx; x < Math.min(width - 1, c.rx + c.rw); x++) {
          tiles[y][x].type = 'floor';
        }
      }
      rooms.push({
        id: c.id,
        name: c.name,
        x: c.rx,
        y: c.ry,
        width: c.rw,
        height: c.rh,
        description: 'Câmara ancestral esculpida na rocha.',
        cleared: false
      });
    }

    // Corridors connecting chambers
    const midY = Math.floor(height / 2);
    for (let x = 1; x < width - 1; x++) {
      tiles[midY][x].type = 'floor';
    }

    // Add interactive elements
    tiles[2][width - 3].type = 'chest';
    tiles[midY - 1][width - 3].type = 'shrine';
    tiles[height - 2][width - 2].type = 'stairs';
  }

  // Spawn positions
  const spawnHero = { x: 2, y: size === 8 ? 5 : Math.floor(height / 2) };
  const spawnStairs = { x: width - 2, y: 1 };

  return {
    id: `dungeon-act-${act}-${customSeed}`,
    name: actTitles[act] || 'Masmorras da Abadia',
    act,
    width,
    height,
    tiles,
    rooms,
    spawnHero,
    spawnStairs,
    seed: customSeed
  };
}
