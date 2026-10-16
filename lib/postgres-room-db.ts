import { neon } from '@neondatabase/serverless';
import type { D1Database, D1PreparedStatement } from './room-db';

let schemaPromise: Promise<void> | null = null;
const statements = new WeakMap<object, { query: string; params: unknown[] }>();
function translate(query: string) {
  const ignore = /INSERT OR IGNORE/i.test(query);
  const replace = /INSERT OR REPLACE/i.test(query);
  let index = 0;
  let sql = query.replace(/INSERT OR (?:IGNORE|REPLACE)/gi, 'INSERT')
    .replace(/\buser\b/g, '"user"').replace(/r\.rowid/g, 'r.created_at')
    .replace(/\?/g, () => `$${++index}`);
  if (ignore) sql += ' ON CONFLICT DO NOTHING';
  if (replace) {
    const columns = /INTO\s+rooms\s*\(([^)]+)\)/i.exec(sql)?.[1].split(',').map(c => c.trim()) || [];
    sql += ` ON CONFLICT (id) DO UPDATE SET ${columns.filter(c => c !== 'id').map(c => `${c}=EXCLUDED.${c}`).join(',')}`;
  }
  return sql;
}
export async function postgresDatabase(): Promise<D1Database> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('Banco compartilhado não provisionado. Configure DATABASE_URL pelo Neon na Vercel.');
  const sql = neon(url);
  if (!schemaPromise) {
    schemaPromise = sql.transaction([
      sql.query('CREATE TABLE IF NOT EXISTS rooms (id TEXT PRIMARY KEY, owner TEXT NOT NULL, name TEXT NOT NULL, state TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 0, code TEXT NOT NULL UNIQUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())'),
      sql.query('CREATE TABLE IF NOT EXISTS members (room TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE, "user" TEXT NOT NULL, PRIMARY KEY(room,"user"))'),
      sql.query('CREATE INDEX IF NOT EXISTS members_user_idx ON members ("user")'),
    ]).then(() => undefined).catch(error => { schemaPromise = null; throw error; });
  }
  await schemaPromise;
  const make = (query: string, params: unknown[] = []): D1PreparedStatement => {
    const translated = translate(query);
    const statement = {
      bind: (...values: unknown[]) => make(query, values),
      first: async <T>() => (await sql.query(translated, params))[0] as T ?? null,
      all: async <T>() => ({ results: await sql.query(translated, params) as T[], success: true }),
      run: async () => { const result = await sql.query(translated, params, { fullResults: true }); return { changes: result.rowCount, meta: { changes: result.rowCount } }; },
    };
    statements.set(statement, { query: translated, params });
    return statement;
  };
  return {
    prepare: query => make(query),
    batch: async batch => {
      await sql.transaction(batch.map(statement => {
        const value = statements.get(statement);
        if (!value) throw new Error('Statement de outro banco recusado.');
        return sql.query(value.query, value.params);
      }));
    },
  };
}
