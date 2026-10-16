import { NextResponse } from 'next/server';

// Global deletion is disabled until a scoped flow with recovery exists.
export async function GET() {
  return NextResponse.json({ error: 'Reset global desativado para proteger campanhas compartilhadas.' }, { status: 405 });
}

export async function POST() {
  return GET();
}
