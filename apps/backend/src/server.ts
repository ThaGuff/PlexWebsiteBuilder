import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { migrate } from './lib/db'
import logger from './lib/logger'

// Routes
import authRoutes from './routes/auth'
import buildRoutes from './routes/builds'
import siteRoutes from './routes/sites'
import dashboardRoutes from './routes/dashboard'
import settingsRoutes from './routes/settings'

const app = express()
const PORT = parseInt(process.env.PORT || '4000')

// ── Security middleware ────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // Configured separately if needed
}))

app.use(cors({
  origin: process.env.FRONTEND_URL || ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
}))

// ── Rate limiting ──────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests — please slow down' },
})

const strictLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Rate limit exceeded' },
})

app.use('/api/', limiter)
app.use('/api/auth/login', strictLimiter)
app.use('/api/auth/register', strictLimiter)

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// ── Request logger ────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  const start = Date.now()
  res.on('finish', () => {
    const ms = Date.now() - start
    const color = res.statusCode >= 400 ? '\x1b[31m' : '\x1b[32m'
    const reset = '\x1b[0m'
    if (process.env.NODE_ENV !== 'production') {
      logger.debug(`${color}${req.method}${reset} ${req.path} ${res.statusCode} ${ms}ms`)
    }
  })
  next()
})

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_, res) => {
  res.json({
    status: 'ok',
    service: 'WebHop Backend',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  })
})

app.get('/api/health', (_, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes)
app.use('/api/builds', buildRoutes)
app.use('/api/sites', siteRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/settings', settingsRoutes)

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` })
})

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error:', err)
  res.status(500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  })
})

// ── Bootstrap ─────────────────────────────────────────────────────────────────
async function bootstrap() {
  try {
    // Run DB migrations
    logger.info('[Server] Running database migrations…')
    await migrate()
    logger.info('[Server] Database ready')

    app.listen(PORT, '0.0.0.0', () => {
      logger.info(`[Server] WebHop API running on port ${PORT}`)
      logger.info(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`)
      logger.info(`[Server] Health: http://localhost:${PORT}/health`)
    })
  } catch (err) {
    logger.error('[Server] Failed to start:', err)
    process.exit(1)
  }
}

bootstrap()

export default app
