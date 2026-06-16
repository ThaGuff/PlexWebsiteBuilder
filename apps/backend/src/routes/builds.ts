import { Router, Response } from 'express'
import { requireAuth, type AuthRequest } from '../middleware/auth'
import { db } from '../lib/db'
import { runBuildPipeline, BUILD_STAGES } from '../services/builder'
import { scrapeWebsite } from '../services/scraper'
import logger from '../lib/logger'
import { v4 as uuid } from 'uuid'

const router = Router()
router.use(requireAuth)

// POST /api/builds — start a new build
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { mode, url, businessName, businessType, description, targetAudience,
            location, phone, email, style, pages, customInstructions } = req.body

    if (!mode || !['scrape', 'prompt'].includes(mode)) {
      res.status(400).json({ message: 'mode must be "scrape" or "prompt"' })
      return
    }
    if (mode === 'scrape' && !url) {
      res.status(400).json({ message: 'url is required for scrape mode' })
      return
    }
    if (mode === 'prompt' && (!businessName || !description)) {
      res.status(400).json({ message: 'businessName and description required for prompt mode' })
      return
    }

    const jobId = uuid()
    const initialStages = BUILD_STAGES.map(s => ({
      ...s,
      status: 'pending',
      progress: 0,
    }))

    const input = { mode, url, businessName, businessType, description,
                    targetAudience, location, phone, email, style,
                    pages: pages || ['Home', 'About', 'Services', 'Contact'],
                    customInstructions }

    await db.query(
      `INSERT INTO build_jobs (id, user_id, mode, status, progress, input, stages)
       VALUES ($1, $2, $3, 'queued', 0, $4, $5)`,
      [jobId, req.user!.id, mode, JSON.stringify(input), JSON.stringify(initialStages)]
    )

    logger.info(`[Builds] New job queued: ${jobId} (${mode}) for user ${req.user!.id}`)

    // Start pipeline asynchronously — don't await
    setImmediate(() => {
      runBuildPipeline(jobId, req.user!.id, input).catch(err => {
        logger.error(`[Builds] Pipeline error for job ${jobId}:`, err)
      })
    })

    res.status(202).json({ jobId, status: 'queued' })
  } catch (err) {
    logger.error('[Builds] Create error:', err)
    res.status(500).json({ message: 'Failed to create build job' })
  }
})

// GET /api/builds — list user's builds
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100)
    const offset = (page - 1) * limit

    const { rows: builds } = await db.query(
      `SELECT id, user_id, mode, status, progress, input, stages, result,
              error, wordpress_url, preview_url, created_at, updated_at, completed_at
       FROM build_jobs
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user!.id, limit, offset]
    )

    const { rows: countRows } = await db.query(
      'SELECT COUNT(*) FROM build_jobs WHERE user_id = $1',
      [req.user!.id]
    )

    res.json({
      builds: builds.map(normalizeJob),
      total: parseInt(countRows[0].count),
      page,
      limit,
    })
  } catch (err) {
    logger.error('[Builds] List error:', err)
    res.status(500).json({ message: 'Failed to list builds' })
  }
})

// GET /api/builds/:id — get single build
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { rows } = await db.query(
      `SELECT id, user_id, mode, status, progress, input, stages, result,
              error, wordpress_url, preview_url, created_at, updated_at, completed_at
       FROM build_jobs WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user!.id]
    )

    if (!rows.length) {
      res.status(404).json({ message: 'Build job not found' })
      return
    }

    res.json(normalizeJob(rows[0]))
  } catch (err) {
    logger.error('[Builds] Get error:', err)
    res.status(500).json({ message: 'Failed to get build' })
  }
})

// GET /api/builds/:id/status — lightweight status poll
router.get('/:id/status', async (req: AuthRequest, res: Response) => {
  try {
    const { rows } = await db.query(
      'SELECT id, status, progress, stages, error, result FROM build_jobs WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user!.id]
    )

    if (!rows.length) {
      res.status(404).json({ message: 'Not found' })
      return
    }

    const job = rows[0]
    res.json({
      id: job.id,
      status: job.status,
      progress: job.progress,
      stages: job.stages,
      error: job.error,
      hasResult: !!job.result,
    })
  } catch (err) {
    res.status(500).json({ message: 'Failed to get status' })
  }
})

// POST /api/builds/:id/cancel — cancel an in-progress build
router.post('/:id/cancel', async (req: AuthRequest, res: Response) => {
  try {
    const { rows } = await db.query(
      `UPDATE build_jobs SET status = 'failed', error = 'Cancelled by user', updated_at = NOW()
       WHERE id = $1 AND user_id = $2 AND status NOT IN ('completed', 'failed')
       RETURNING id`,
      [req.params.id, req.user!.id]
    )

    if (!rows.length) {
      res.status(404).json({ message: 'Job not found or already finished' })
      return
    }

    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ message: 'Failed to cancel job' })
  }
})

// DELETE /api/builds/:id — delete a build record
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { rows } = await db.query(
      'DELETE FROM build_jobs WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user!.id]
    )

    if (!rows.length) {
      res.status(404).json({ message: 'Build not found' })
      return
    }

    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete build' })
  }
})

// POST /api/builds/scrape-preview — quick scrape for UI preview
router.post('/scrape-preview', async (req: AuthRequest, res: Response) => {
  try {
    const { url } = req.body
    if (!url) {
      res.status(400).json({ message: 'url required' })
      return
    }

    const data = await scrapeWebsite(url)
    res.json({
      businessName: data.businessName,
      tagline: data.tagline,
      description: data.description,
      colors: data.colors,
      fonts: data.fonts,
      logo: data.logo,
      pages: data.pages,
    })
  } catch (err) {
    res.status(422).json({ message: (err as Error).message })
  }
})

// GET /api/builds/:id/download — download site as ZIP placeholder
router.get('/:id/download', async (req: AuthRequest, res: Response) => {
  try {
    const { rows } = await db.query(
      'SELECT result FROM build_jobs WHERE id = $1 AND user_id = $2 AND status = $3',
      [req.params.id, req.user!.id, 'completed']
    )

    if (!rows.length) {
      res.status(404).json({ message: 'Build not found or not complete' })
      return
    }

    // In production this would zip and stream the WordPress export
    // For now return info JSON
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', `attachment; filename="webhop-export-${req.params.id}.json"`)
    res.send(JSON.stringify(rows[0].result, null, 2))
  } catch (err) {
    res.status(500).json({ message: 'Download failed' })
  }
})

function normalizeJob(row: Record<string, unknown>) {
  return {
    id: row.id,
    userId: row.user_id,
    mode: row.mode,
    status: row.status,
    progress: row.progress,
    input: row.input,
    stages: row.stages,
    result: row.result,
    error: row.error,
    wordpressUrl: row.wordpress_url,
    previewUrl: row.preview_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
  }
}

export default router
