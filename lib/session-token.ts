import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const localSecret = Buffer.from(randomBytes(32)).toString('hex');
function secret() {
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32) return process.env.SESSION_SECRET;
  if (process.env.VERCEL) throw new Error('SESSION_SECRET precisa ser configurada antes de iniciar o mundo.');
  return localSecret;
}
export function issueSession(now = Date.now()) {
  const id = `anon_${Buffer.from(randomBytes(16)).toString('hex')}`;
  const payload = Buffer.from(JSON.stringify({ id, exp: now + 365 * 86400000 })).toString('base64url');
  const signature = createHmac('sha256', secret()).update(payload).digest('base64url');
  return { id, token: `${payload}.${signature}` };
}
export function verifySession(token: string, now = Date.now()): string | null {
  try {
    const [payload, signature, extra] = token.split('.');
    if (!payload || !signature || extra) return null;
    const expected = createHmac('sha256', secret()).update(payload).digest();
    const supplied = Buffer.from(signature, 'base64url');
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;
    const value = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return /^anon_[a-f0-9]{32}$/.test(value.id) && value.exp > now ? value.id : null;
  } catch { return null; }
}
