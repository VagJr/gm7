import type { NextRequest } from 'next/server';
import { database } from './room-db';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { roomEventBus, type RoomUpdatePayload } from './room-events';

export async function openRoomStream(req: NextRequest) {
  const user = await getChatGPTUser();
  if (!user || user.isNewSession) return new Response('Sessão exigida.', { status: 401 });
  const roomId = req.nextUrl.searchParams.get('room') || 'mmo-world-village';
  const db = await database();
  const row = await db.prepare('SELECT r.state,r.version FROM rooms r JOIN members m ON m.room=r.id WHERE r.id=? AND m.user=?').bind(roomId, user.userId).first<{ state: string; version: number }>();
  if (!row) return new Response('Participação exigida.', { status: 403 });
  let revision = -1; let closed = false; let polling = false;
  let cleanup = () => {};
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const send = (payload: RoomUpdatePayload) => {
        if (closed || payload.version <= revision) return;
        revision = payload.version;
        try { controller.enqueue(encoder.encode(`id: ${revision}\nevent: update\ndata: ${JSON.stringify(payload)}\n\n`)); } catch { cleanup(); }
      };
      const channel = `room:${roomId}`;
      const poll = async () => {
        if (closed || polling) return;
        polling = true;
        try {
          // Shared Postgres bridges Vercel instances; the event bus only accelerates local delivery.
          const fresh = await db.prepare('SELECT r.state,r.version FROM rooms r JOIN members m ON m.room=r.id WHERE r.id=? AND m.user=? AND r.version>?').bind(roomId, user.userId, revision).first<{ state: string; version: number }>();
          if (fresh) send({ roomId, version: fresh.version, state: JSON.parse(fresh.state), timestamp: Date.now() });
        } catch { try { controller.error(new Error('Conexão perdida.')); } finally { cleanup(); } }
        finally { polling = false; }
      };
      const timer = setInterval(poll, 3000);
      const ping = setInterval(() => { if (!closed) { try { controller.enqueue(encoder.encode(': keepalive\n\n')); } catch { cleanup(); } } }, 15000);
      const lifetime = setTimeout(() => { cleanup(); try { controller.close(); } catch {} }, 240000);
      cleanup = () => { if (closed) return; closed = true; clearInterval(timer); clearInterval(ping); clearTimeout(lifetime); roomEventBus.off(channel, send); req.signal.removeEventListener('abort', cleanup); };
      roomEventBus.on(channel, send);
      req.signal.addEventListener('abort', cleanup, { once: true });
      send({ roomId, version: row.version, state: JSON.parse(row.state), timestamp: Date.now() });
      if (req.signal.aborted) cleanup();
    },
    cancel() { cleanup(); },
  });
  return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store, no-transform', 'X-Accel-Buffering': 'no' } });
}
