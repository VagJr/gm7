// lib/collision-system.ts
/**
 * Collision System & Pathfinding Engine for Illustrated D&D Maps
 * Supports normalized polygon regions, grid-obstacle conversion, A* pathfinding,
 * remaining movement calculation, and collision visualization.
 */

export interface Point {
  x: number;
  y: number;
}

export interface CollisionPolygon {
  id: string;
  name: string;
  type: 'obstacle' | 'walkable' | 'water' | 'difficult';
  // Normalized coordinates from 0.0 to 1.0
  points: [number, number][];
}

export interface MapCollisionProfile {
  biome: 'village' | 'forest' | 'dungeon';
  imageSrc: string;
  // Normalized obstacle polygons (blocked to movement)
  obstacles: CollisionPolygon[];
  // Walkable designated bridges/corridors that override obstacles (e.g. bridge over river)
  walkableBridges?: CollisionPolygon[];
}

/**
 * Normalized collision profiles matching the illustrated maps in public/maps/
 */
export const MAP_COLLISION_PROFILES: Record<'village' | 'forest' | 'dungeon', MapCollisionProfile> = {
  village: {
    biome: 'village',
    imageSrc: '/maps/vila.png',
    obstacles: [
      // Casa do Ancião Doran (Canto Superior Esquerdo)
      {
        id: 'house-nw',
        name: 'Casa do Ancião',
        type: 'obstacle',
        points: [
          [0.05, 0.05],
          [0.32, 0.05],
          [0.32, 0.28],
          [0.05, 0.28]
        ]
      },
      // Cabana da Alquimista Elenor (Canto Superior Direito)
      {
        id: 'house-ne',
        name: 'Oficina da Alquimista',
        type: 'obstacle',
        points: [
          [0.68, 0.05],
          [0.95, 0.05],
          [0.95, 0.28],
          [0.68, 0.28]
        ]
      },
      // Quartel e Muralha da Guarda (Canto Inferior Direito)
      {
        id: 'barracks-se',
        name: 'Quartel da Guarda',
        type: 'obstacle',
        points: [
          [0.70, 0.72],
          [0.96, 0.72],
          [0.96, 0.95],
          [0.70, 0.95]
        ]
      },
      // Taberna & Estalagem da Ponte (Canto Inferior Esquerdo)
      {
        id: 'tavern-sw',
        name: 'Estalagem do Rio',
        type: 'obstacle',
        points: [
          [0.05, 0.72],
          [0.30, 0.72],
          [0.30, 0.95],
          [0.05, 0.95]
        ]
      },
      // Rio das Cinzas (Faixa de água profunda que corta o mapa de cima a baixo)
      {
        id: 'river-north',
        name: 'Rio das Cinzas (Norte)',
        type: 'water',
        points: [
          [0.44, 0.0],
          [0.56, 0.0],
          [0.57, 0.44],
          [0.43, 0.44]
        ]
      },
      {
        id: 'river-south',
        name: 'Rio das Cinzas (Sul)',
        type: 'water',
        points: [
          [0.43, 0.58],
          [0.57, 0.58],
          [0.56, 1.0],
          [0.44, 1.0]
        ]
      }
    ],
    walkableBridges: [
      // Ponte de Pedra Central (Permite travessia sobre o rio)
      {
        id: 'bridge-main',
        name: 'Ponte de Pedra',
        type: 'walkable',
        points: [
          [0.42, 0.44],
          [0.58, 0.44],
          [0.58, 0.58],
          [0.42, 0.58]
        ]
      }
    ]
  },

  forest: {
    biome: 'forest',
    imageSrc: '/maps/mata.png',
    obstacles: [
      // Bosque Denso & Espinheiros (Norte)
      {
        id: 'forest-north-thicket',
        name: 'Espinheiro Denso',
        type: 'obstacle',
        points: [
          [0.15, 0.02],
          [0.85, 0.02],
          [0.85, 0.18],
          [0.15, 0.18]
        ]
      },
      // Penhasco & Ruínas Antigas do Oeste
      {
        id: 'ruins-west',
        name: 'Muralha em Ruínas',
        type: 'obstacle',
        points: [
          [0.02, 0.30],
          [0.26, 0.30],
          [0.26, 0.70],
          [0.02, 0.70]
        ]
      },
      // Lagoa Estígia & Pântano do Leste
      {
        id: 'stygian-pond',
        name: 'Charco Tóxico',
        type: 'water',
        points: [
          [0.72, 0.35],
          [0.96, 0.35],
          [0.96, 0.72],
          [0.72, 0.72]
        ]
      },
      // Rochedo das Sombras (Sul)
      {
        id: 'shadow-rocks',
        name: 'Rochedo Obscuro',
        type: 'obstacle',
        points: [
          [0.35, 0.78],
          [0.65, 0.78],
          [0.65, 0.96],
          [0.35, 0.96]
        ]
      }
    ]
  },

  dungeon: {
    biome: 'dungeon',
    imageSrc: '/maps/dungeon.png',
    obstacles: [
      // Muralha Externa Superior
      {
        id: 'dungeon-wall-n',
        name: 'Paredão de Pedra',
        type: 'obstacle',
        points: [
          [0.0, 0.0],
          [1.0, 0.0],
          [1.0, 0.12],
          [0.0, 0.12]
        ]
      },
      // Muralha Externa Esquerda
      {
        id: 'dungeon-wall-w',
        name: 'Paredão Oeste',
        type: 'obstacle',
        points: [
          [0.0, 0.12],
          [0.12, 0.12],
          [0.12, 0.88],
          [0.0, 0.88]
        ]
      },
      // Muralha Externa Direita
      {
        id: 'dungeon-wall-e',
        name: 'Paredão Leste',
        type: 'obstacle',
        points: [
          [0.88, 0.12],
          [1.0, 0.12],
          [1.0, 0.88],
          [0.88, 0.88]
        ]
      },
      // Muralha Externa Inferior (com passagem central)
      {
        id: 'dungeon-wall-s-left',
        name: 'Paredão Sul (Esq)',
        type: 'obstacle',
        points: [
          [0.0, 0.88],
          [0.40, 0.88],
          [0.40, 1.0],
          [0.0, 1.0]
        ]
      },
      {
        id: 'dungeon-wall-s-right',
        name: 'Paredão Sul (Dir)',
        type: 'obstacle',
        points: [
          [0.60, 0.88],
          [1.0, 0.88],
          [1.0, 1.0],
          [0.60, 1.0]
        ]
      },
      // Pilares Rúnicos de Sustentação
      {
        id: 'pillar-nw',
        name: 'Pilar Rúnico',
        type: 'obstacle',
        points: [
          [0.30, 0.32],
          [0.38, 0.32],
          [0.38, 0.40],
          [0.30, 0.40]
        ]
      },
      {
        id: 'pillar-ne',
        name: 'Pilar Rúnico',
        type: 'obstacle',
        points: [
          [0.62, 0.32],
          [0.70, 0.32],
          [0.70, 0.40],
          [0.62, 0.40]
        ]
      },
      {
        id: 'pillar-sw',
        name: 'Pilar Rúnico',
        type: 'obstacle',
        points: [
          [0.30, 0.62],
          [0.38, 0.62],
          [0.38, 0.70],
          [0.30, 0.70]
        ]
      },
      {
        id: 'pillar-se',
        name: 'Pilar Rúnico',
        type: 'obstacle',
        points: [
          [0.62, 0.62],
          [0.70, 0.62],
          [0.70, 0.70],
          [0.62, 0.70]
        ]
      }
    ]
  }
};

/**
 * Standard Ray-Casting algorithm to test if a point is inside a polygon
 */
export function isPointInsidePolygon(point: [number, number], polygon: [number, number][]): boolean {
  const [px, py] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const intersect = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Check if a normalized coordinate [0..1] is walkable in the given biome
 */
export function isNormalizedCoordWalkable(biome: 'village' | 'forest' | 'dungeon', nx: number, ny: number): boolean {
  const profile = MAP_COLLISION_PROFILES[biome];
  if (!profile) return true;

  // Boundary check
  if (nx < 0.02 || nx > 0.98 || ny < 0.02 || ny > 0.98) {
    return false;
  }

  // Check override bridges first (e.g. stone bridge over river)
  if (profile.walkableBridges) {
    for (const bridge of profile.walkableBridges) {
      if (isPointInsidePolygon([nx, ny], bridge.points)) {
        return true;
      }
    }
  }

  // Check obstacle polygons
  for (const obs of profile.obstacles) {
    if (isPointInsidePolygon([nx, ny], obs.points)) {
      return false;
    }
  }

  return true;
}

/**
 * Check if a discrete grid tile (x, y) is walkable within a grid of size gridSize
 */
export function isGridTileWalkable(
  biome: 'village' | 'forest' | 'dungeon',
  gx: number,
  gy: number,
  gridSize: number
): boolean {
  if (gx < 0 || gx >= gridSize || gy < 0 || gy >= gridSize) return false;
  // Sample the center of the grid tile in normalized space [0..1]
  const nx = (gx + 0.5) / gridSize;
  const ny = (gy + 0.5) / gridSize;
  return isNormalizedCoordWalkable(biome, nx, ny);
}

/**
 * A* Pathfinding to compute the optimal, obstacle-navigating path between two points on the map
 */
export function findPathAStar(
  start: Point,
  goal: Point,
  biome: 'village' | 'forest' | 'dungeon',
  gridSize: number,
  occupiedTiles: Set<string> = new Set()
): Point[] {
  // If destination is out of bounds or impassable, fail early
  if (!isGridTileWalkable(biome, goal.x, goal.y, gridSize)) {
    return [];
  }

  // Chebyshev distance heuristic for D&D 5e (diagonal costs same 1 step)
  const heuristic = (a: Point, b: Point) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));

  const startKey = `${start.x},${start.y}`;
  const goalKey = `${goal.x},${goal.y}`;

  if (startKey === goalKey) return [start];

  const openSet: Point[] = [start];
  const cameFrom = new Map<string, Point>();
  const gScore = new Map<string, number>();
  gScore.set(startKey, 0);

  const fScore = new Map<string, number>();
  fScore.set(startKey, heuristic(start, goal));

  // 8 directions (including diagonals per 5e rules)
  const directions: [number, number][] = [
    [0, -1], [1, -1], [1, 0], [1, 1],
    [0, 1], [-1, 1], [-1, 0], [-1, -1]
  ];

  let iterations = 0;
  while (openSet.length > 0 && iterations < 600) {
    iterations++;
    // Get node with lowest fScore
    openSet.sort((a, b) => (fScore.get(`${a.x},${a.y}`) || Infinity) - (fScore.get(`${b.x},${b.y}`) || Infinity));
    const current = openSet.shift()!;
    const currentKey = `${current.x},${current.y}`;

    if (current.x === goal.x && current.y === goal.y) {
      // Reconstruct path
      const path: Point[] = [current];
      let curr = current;
      while (cameFrom.has(`${curr.x},${curr.y}`)) {
        curr = cameFrom.get(`${curr.x},${curr.y}`)!;
        path.unshift(curr);
      }
      return path;
    }

    for (const [dx, dy] of directions) {
      const neighbor: Point = { x: current.x + dx, y: current.y + dy };
      const neighborKey = `${neighbor.x},${neighbor.y}`;

      // Check walkability
      if (!isGridTileWalkable(biome, neighbor.x, neighbor.y, gridSize)) continue;

      // Avoid cutting corners through adjacent walls when moving diagonally
      if (dx !== 0 && dy !== 0) {
        const side1Walkable = isGridTileWalkable(biome, current.x + dx, current.y, gridSize);
        const side2Walkable = isGridTileWalkable(biome, current.x, current.y + dy, gridSize);
        if (!side1Walkable && !side2Walkable) continue;
      }

      // Check if blocked by other entities (unless it's the goal)
      if (neighborKey !== goalKey && occupiedTiles.has(neighborKey)) continue;

      const tentativeGScore = (gScore.get(currentKey) || Infinity) + 1;
      if (tentativeGScore < (gScore.get(neighborKey) || Infinity)) {
        cameFrom.set(neighborKey, current);
        gScore.set(neighborKey, tentativeGScore);
        fScore.set(neighborKey, tentativeGScore + heuristic(neighbor, goal));

        if (!openSet.some((p) => p.x === neighbor.x && p.y === neighbor.y)) {
          openSet.push(neighbor);
        }
      }
    }
  }

  // No valid path found
  return [];
}

/**
 * Calculates remaining speed and movement in squares/meters
 */
export function calculateMovementBudget(
  speedMeters: number = 9,
  movementUsedSquares: number = 0
): {
  maxSquares: number;
  remainingSquares: number;
  remainingMeters: number;
  speedMeters: number;
} {
  const maxSquares = Math.floor(speedMeters / 1.5);
  const remainingSquares = Math.max(0, maxSquares - movementUsedSquares);
  const remainingMeters = Number((remainingSquares * 1.5).toFixed(1));
  return {
    maxSquares,
    remainingSquares,
    remainingMeters,
    speedMeters
  };
}
