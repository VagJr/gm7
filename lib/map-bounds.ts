import {
  MAP_COLLISION_PROFILES,
  isGridTileWalkable,
  type BiomeType
} from './collision-system';

function normalizeBiome(
  biome?: string
): BiomeType {
  const raw =
    String(
      biome ||
      'village'
    ).toLowerCase();

  if (
    raw === 'vila'
  ) {
    return 'village';
  }

  if (
    raw === 'forest' ||
    raw === 'ruins' ||
    raw === 'dungeon' ||
    raw === 'canyon' ||
    raw === 'lair' ||
    raw === 'village'
  ) {
    return raw as BiomeType;
  }

  return 'village';
}

export function getBiomeGridSize(
  biome?: string
): number {
  const normalized =
    normalizeBiome(
      biome
    );

  return (
    MAP_COLLISION_PROFILES[
      normalized
    ]?.gridSize ||
    8
  );
}

export function clampGridPoint(
  biome: string | undefined,
  x: number,
  y: number
): {
  x: number;
  y: number;
} {
  const size =
    getBiomeGridSize(
      biome
    );

  const cleanX =
    Number.isFinite(
      Number(x)
    )
      ? Math.trunc(
          Number(x)
        )
      : 0;

  const cleanY =
    Number.isFinite(
      Number(y)
    )
      ? Math.trunc(
          Number(y)
        )
      : 0;

  return {
    x:
      Math.max(
        0,
        Math.min(
          size - 1,
          cleanX
        )
      ),

    y:
      Math.max(
        0,
        Math.min(
          size - 1,
          cleanY
        )
      )
  };
}

export function nearestWalkablePoint(biome: string, x: number, y: number): { x: number; y: number } {
  const key = normalizeBiome(biome), size = getBiomeGridSize(key);
  const start = clampGridPoint(key, x, y);
  for (let radius = 0; radius < size; radius++) {
    for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) continue;
      const point = { x: start.x + dx, y: start.y + dy };
      if (isGridTileWalkable(key, point.x, point.y, size)) return point;
    }
  }
  return start;
}

export function normalizeEnemyMapPosition<
  T extends {
    x: number;
    y: number;
    biome?: string;
  }
>(
  enemy: T,
  fallbackBiome?: string
): T {
  const biome =
    enemy.biome ||
    fallbackBiome ||
    'village';

  const point =
    clampGridPoint(
      biome,
      enemy.x,
      enemy.y
    );

  return {
    ...enemy,
    x: point.x,
    y: point.y
  };
}
