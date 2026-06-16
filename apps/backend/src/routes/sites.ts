import { Router, Response } from 'express'
import { requireAuth, type AuthRequest } from '../middleware/auth'
import { db } from '../lib/db'
import logger from '../lib/logger'

const router = Router()
router.use(requireAuth)

// GET /api/sites
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { rows } = await db.query(
      `SELECT id, build_job_id, user_id, url, admin_url, title, status,
              thumbnail, pages, plugins, theme, metadata, created_at, last_modified
       FROM wordpress_sites
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user!.id]
    )

    res.json(rows.map(normalizeSite))
  } catch (err) {
    logger.error('[Sites] List error:', err)
    res.status(500).json({ message: 'Failed to list sites' })
  }
})

// GET /api/sites/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { rows } = await db.query(
      `SELECT id, build_job_id, user_id, url, admin_url, title, status,
              thumbnail, pages, plugins, theme, metadata, created_at, last_modified
       FROM wordpress_sites WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user!.id]
    )

    if (!rows.length) {
      res.status(404).json({ message: 'Site not found' })
      return
    }

    res.json(normalizeSite(rows[0]))
  } catch (err) {
    res.status(500).json({ message: 'Failed to get site' })
  }
})

// DELETE /api/sites/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { rows } = await db.query(
      'DELETE FROM wordpress_sites WHERE id = $1 AND user_id = $2 RETURNING id, url',
      [req.params.id, req.user!.id]
    )

    if (!rows.length) {
      res.status(404).json({ message: 'Site not found' })
      return
    }

    logger.info(`[Sites] Deleted site ${rows[0].id} (${rows[0].url})`)
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete site' })
  }
})

// POST /api/sites/:id/export
router.post('/:id/export', async (req: AuthRequest, res: Response) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM wordpress_sites WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user!.id]
    )

    if (!rows.length) {
      res.status(404).json({ message: 'Site not found' })
      return
    }

    // In production: trigger WP export and return download URL
    res.json({
      success: true,
      message: 'Export started — download link will be emailed to you',
      siteUrl: rows[0].url,
    })
  } catch (err) {
    res.status(500).json({ message: 'Export failed' })
  }
})

function normalizeSite(row: Record<string, unknown>) {
  return {
    id: row.id,
    buildJobId: row.build_job_id,
    userId: row.user_id,
    url: row.url,
    adminUrl: row.admin_url,
    title: row.title,
    status: row.status,
    thumbnail: row.thumbnail,
    pages: row.pages,
    plugins: row.plugins,
    theme: row.theme,
    metadata: row.metadata,
    createdAt: row.created_at,
    lastModified: row.last_modified,
  }
}

export default router
