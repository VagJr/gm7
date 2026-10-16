import { NextRequest, NextResponse } from 'next/server';
import { MAP_COLLISION_PROFILES, type BiomeType } from '@/lib/collision-system';
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('biome') || 'village';
  const biome = raw === 'vila' ? 'village' : raw;
  if (!Object.hasOwn(MAP_COLLISION_PROFILES, biome)) return NextResponse.json({ error: 'Região inválida.' }, { status: 400 });
  const profile = MAP_COLLISION_PROFILES[biome as BiomeType];
  return NextResponse.json({ success: true, custom: true, gridSize: profile.gridSize, imageSrc: profile.imageSrc, biome, zones: profile.customZones });
}
export async function POST() {
  return NextResponse.json({ error: 'Mapas publicados são editados no projeto e passam por revisão antes da publicação.' }, { status: 405 });
}
