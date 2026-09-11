// app/api/map-collision/route.ts
import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { MAP_COLLISION_PROFILES, type CollisionPolygon } from '@/lib/collision-system';

function getCollisionFilePath(biome: string): string {
  const fileName = `${biome === 'village' ? 'vila' : biome}-collision.json`;
  const candidates = [
    path.join('c:/gm/public/maps', fileName),
    path.join(process.cwd(), 'public', 'maps', fileName),
    path.join(process.cwd(), fileName)
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  for (const c of candidates) {
    const dir = path.dirname(c);
    if (fs.existsSync(dir)) return c;
  }
  for (const c of candidates) {
    try {
      fs.mkdirSync(path.dirname(c), { recursive: true });
      return c;
    } catch {}
  }
  return candidates[0];
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const biome = searchParams.get('biome') || 'village';
    const filePath = getCollisionFilePath(biome);

    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(content);
      return NextResponse.json({ success: true, custom: true, ...data });
    }

    const defaultProfile = MAP_COLLISION_PROFILES[biome as 'village' | 'forest' | 'dungeon'];
    return NextResponse.json({
      success: true,
      custom: Boolean(defaultProfile?.customZones && defaultProfile.customZones.length > 0),
      gridSize: 8,
      imageSrc: defaultProfile?.imageSrc || `/maps/${biome === 'village' ? 'vila' : biome}.png`,
      biome,
      zones: defaultProfile?.customZones || (defaultProfile ? [...defaultProfile.obstacles, ...(defaultProfile.walkableBridges || [])] : [])
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao carregar colisões' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as any;
    const biome = body?.biome || 'village';
    const payload = {
      version: 1,
      gridSize: body?.gridSize || 8,
      imageSrc: body?.imageSrc || `/maps/${biome === 'village' ? 'vila' : biome}.png`,
      zones: body?.zones || []
    };

    const targetFile = getCollisionFilePath(biome);
    try {
      fs.mkdirSync(path.dirname(targetFile), { recursive: true });
      fs.writeFileSync(targetFile, JSON.stringify(payload, null, 2), 'utf-8');
    } catch (writeErr) {
      console.warn('Could not write collision to disk, maintaining in memory:', writeErr);
    }

    // Sync in-memory collision profile for live authoritative server checks
    const targetBiome = (biome === 'vila' ? 'village' : biome) as 'village' | 'forest' | 'dungeon';
    if (MAP_COLLISION_PROFILES[targetBiome]) {
      MAP_COLLISION_PROFILES[targetBiome].customZones = payload.zones;
      MAP_COLLISION_PROFILES[targetBiome].obstacles = payload.zones.filter(
        (z: CollisionPolygon) => z.type === 'bloqueado' || z.type === 'agua'
      );
      MAP_COLLISION_PROFILES[targetBiome].walkableBridges = payload.zones.filter(
        (z: CollisionPolygon) => z.type === 'caminhavel' || z.type === 'porta' || z.type === 'ponte'
      );
    }

    return NextResponse.json({
      success: true,
      message: `Colisão do mapa ${biome} atualizada com sucesso!`,
      zonesCount: payload.zones.length,
      payload
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao salvar colisões' }, { status: 500 });
  }
}
