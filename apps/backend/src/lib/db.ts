import { Pool } from 'pg'
import { v4 as uuid } from 'uuid'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
})

pool.on('error', (err) => {
  console.error('[DB] Unexpected error on idle client', err)
})

export const db = {
  query: async (text: string, params?: unknown[]) => {
    const start = Date.now()
    const res = await pool.query(text, params)
    const duration = Date.now() - start
    if (duration > 100) {
      console.warn(`[DB] Slow query (${duration}ms):`, text.substring(0, 80))
    }
    return res
  },

  getClient: () => pool.connect(),
}

export async function migrate() {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email       TEXT UNIQUE NOT NULL,
        name        TEXT NOT NULL,
        password    TEXT NOT NULL,
        role        TEXT NOT NULL DEFAULT 'user',
        plan        TEXT NOT NULL DEFAULT 'starter',
        api_keys    JSONB DEFAULT '{}',
        created_at  TIMESTAMPTZ DEFAULT NOW(),
        updated_at  TIMESTAMPTZ DEFAULT NOW()
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS build_jobs (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        mode            TEXT NOT NULL,
        status          TEXT NOT NULL DEFAULT 'queued',
        progress        INTEGER NOT NULL DEFAULT 0,
        input           JSONB NOT NULL DEFAULT '{}',
        stages          JSONB NOT NULL DEFAULT '[]',
        result          JSONB,
        error           TEXT,
        wordpress_url   TEXT,
        preview_url     TEXT,
        created_at      TIMESTAMPTZ DEFAULT NOW(),
        updated_at      TIMESTAMPTZ DEFAULT NOW(),
        completed_at    TIMESTAMPTZ
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS wordpress_sites (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        build_job_id    UUID REFERENCES build_jobs(id) ON DELETE SET NULL,
        user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        url             TEXT NOT NULL,
        admin_url       TEXT NOT NULL,
        title           TEXT NOT NULL,
        status          TEXT NOT NULL DEFAULT 'active',
        thumbnail       TEXT,
        pages           INTEGER DEFAULT 0,
        plugins         INTEGER DEFAULT 0,
        theme           TEXT DEFAULT 'webhop-custom',
        metadata        JSONB DEFAULT '{}',
        created_at      TIMESTAMPTZ DEFAULT NOW(),
        last_modified   TIMESTAMPTZ DEFAULT NOW()
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type            TEXT NOT NULL,
        title           TEXT NOT NULL,
        message         TEXT NOT NULL,
        read            BOOLEAN DEFAULT FALSE,
        build_job_id    UUID REFERENCES build_jobs(id) ON DELETE SET NULL,
        created_at      TIMESTAMPTZ DEFAULT NOW()
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS user_settings (
        user_id         UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        anthropic_key   TEXT,
        openai_key      TEXT,
        preferences     JSONB DEFAULT '{}',
        updated_at      TIMESTAMPTZ DEFAULT NOW()
      )
    `)

    // Indexes
    await client.query('CREATE INDEX IF NOT EXISTS idx_build_jobs_user_id ON build_jobs(user_id)')
    await client.query('CREATE INDEX IF NOT EXISTS idx_build_jobs_status ON build_jobs(status)')
    await client.query('CREATE INDEX IF NOT EXISTS idx_build_jobs_created_at ON build_jobs(created_at DESC)')
    await client.query('CREATE INDEX IF NOT EXISTS idx_sites_user_id ON wordpress_sites(user_id)')
    await client.query('CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id, read)')

    await client.query('COMMIT')
    console.log('[DB] Migrations complete')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export default pool
