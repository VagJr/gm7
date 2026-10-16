import { NextResponse } from 'next/server';
import { database } from '@/lib/room-db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = await database(); await db.prepare('SELECT 1 AS ready').first();
    return NextResponse.json({ status: 'healthy', service: 'dragons-and-dungeons', version: '0.2.0', storage: process.env.DATABASE_URL ? 'shared-postgres' : 'local', timestamp: Date.now() }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ status: 'unavailable', service: 'dragons-and-dungeons', error: 'O mundo está reconectando ao banco compartilhado.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
