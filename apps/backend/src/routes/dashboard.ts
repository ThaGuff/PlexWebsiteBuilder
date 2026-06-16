import { Router, Response } from 'express'
import { requireAuth, type AuthRequest } from '../middleware/auth'
import { db } from '../lib/db'
import logger from '../lib/logger'

const router = Router()
router.use(requireAuth)

// GET /api/dashboard/stats
router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id

    const [totalRes, completedRes, activeRes, avgTimeRes, byDayRes] = await Promise.all([
      db.query('SELECT COUNT(*) FROM build_jobs WHERE user_id = $1', [userId]),
      db.query("SELECT COUNT(*) FROM build_jobs WHERE user_id = $1 AND status = 'completed'", [userId]),
      db.query("SELECT COUNT(*) FROM build_jobs WHERE user_id = $1 AND status NOT IN ('completed','failed')", [userId]),
      db.query(`
        SELECT AVG(EXTRACT(EPOCH FROM (completed_at - created_at))) as avg_seconds
        FROM build_jobs WHERE user_id = $1 AND status = 'completed' AND completed_at IS NOT NULL
      `, [userId]),
      db.query(`
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM build_jobs WHERE user_id = $1
          AND created_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `, [userId]),
    ])

    const sitesRes = await db.query(
      "SELECT COUNT(*) FROM wordpress_sites WHERE user_id = $1 AND status = 'active'",
      [userId]
    )

    res.json({
      totalBuilds:    parseInt(totalRes.rows[0].count),
      completedBuilds: parseInt(completedRes.rows[0].count),
      activeJobs:     parseInt(activeRes.rows[0].count),
      sitesDelivered: parseInt(sitesRes.rows[0].count),
      avgBuildTime:   Math.round(parseFloat(avgTimeRes.rows[0].avg_seconds || '0')),
      buildsByDay:    byDayRes.rows.map(r => ({
        date: r.date,
        count: parseInt(r.count),
      })),
    })
  } catch (err) {
    logger.error('[Dashboard] Stats error:', err)
    res.status(500).json({ message: 'Failed to get stats' })
  }
})

// GET /api/dashboard/recent
router.get('/recent', async (req: AuthRequest, res: Response) => {
  try {
    const { rows } = await db.query(
      `SELECT id, mode, status, progress, input, result, error,
              wordpress_url, preview_url, created_at, updated_at, completed_at
       FROM build_jobs WHERE user_id = $1
       ORDER BY created_at DESC LIMIT 5`,
      [req.user!.id]
    )

    res.json({ builds: rows })
  } catch (err) {
    res.status(500).json({ message: 'Failed to get recent builds' })
  }
})

// GET /api/dashboard/notifications
router.get('/notifications', async (req: AuthRequest, res: Response) => {
  try {
    const { rows } = await db.query(
      `SELECT id, type, title, message, read, build_job_id, created_at
       FROM notifications WHERE user_id = $1
       ORDER BY created_at DESC LIMIT 20`,
      [req.user!.id]
    )

    res.json({ notifications: rows })
  } catch (err) {
    res.status(500).json({ message: 'Failed to get notifications' })
  }
})

// POST /api/dashboard/notifications/:id/read
router.post('/notifications/:id/read', async (req: AuthRequest, res: Response) => {
  try {
    await db.query(
      'UPDATE notifications SET read = TRUE WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user!.id]
    )
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ message: 'Failed to mark notification read' })
  }
})

export default router
