import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { db } from '../lib/db'
import { requireAuth, type AuthRequest } from '../middleware/auth'
import logger from '../lib/logger'

const router = Router()
const JWT_SECRET = process.env.JWT_SECRET || 'webhop-secret-key-change-me'
const JWT_EXPIRES = '30d'

function signToken(userId: string, email: string) {
  return jwt.sign({ id: userId, email }, JWT_SECRET, { expiresIn: JWT_EXPIRES })
}

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body

    if (!name || !email || !password) {
      res.status(400).json({ message: 'Name, email, and password are required' })
      return
    }

    if (password.length < 6) {
      res.status(400).json({ message: 'Password must be at least 6 characters' })
      return
    }

    // Check duplicate
    const { rows: existing } = await db.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    )
    if (existing.length) {
      res.status(409).json({ message: 'An account with this email already exists' })
      return
    }

    const hash = await bcrypt.hash(password, 12)

    const { rows } = await db.query(
      `INSERT INTO users (name, email, password) 
       VALUES ($1, $2, $3) 
       RETURNING id, name, email, role, plan, created_at`,
      [name.trim(), email.toLowerCase(), hash]
    )

    const user = rows[0]

    // Create default user settings row
    await db.query('INSERT INTO user_settings (user_id) VALUES ($1) ON CONFLICT DO NOTHING', [user.id])

    const token = signToken(user.id, user.email)

    logger.info(`New user registered: ${user.email}`)

    res.status(201).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        plan: user.plan,
        createdAt: user.created_at,
      },
    })
  } catch (err) {
    logger.error('Register error', err)
    res.status(500).json({ message: 'Registration failed' })
  }
})

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      res.status(400).json({ message: 'Email and password are required' })
      return
    }

    const { rows } = await db.query(
      'SELECT id, name, email, password, role, plan FROM users WHERE email = $1',
      [email.toLowerCase()]
    )

    if (!rows.length) {
      res.status(401).json({ message: 'Invalid email or password' })
      return
    }

    const user = rows[0]
    const valid = await bcrypt.compare(password, user.password)

    if (!valid) {
      res.status(401).json({ message: 'Invalid email or password' })
      return
    }

    const token = signToken(user.id, user.email)

    logger.info(`User login: ${user.email}`)

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        plan: user.plan,
      },
    })
  } catch (err) {
    logger.error('Login error', err)
    res.status(500).json({ message: 'Login failed' })
  }
})

// GET /api/auth/me
router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  res.json({
    user: req.user,
  })
})

// PATCH /api/auth/me
router.patch('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { name } = req.body
    if (!name?.trim()) {
      res.status(400).json({ message: 'Name is required' })
      return
    }

    await db.query(
      'UPDATE users SET name = $1, updated_at = NOW() WHERE id = $2',
      [name.trim(), req.user!.id]
    )

    res.json({ success: true })
  } catch (err) {
    logger.error('Update profile error', err)
    res.status(500).json({ message: 'Failed to update profile' })
  }
})

// PATCH /api/auth/password
router.patch('/password', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body

    const { rows } = await db.query(
      'SELECT password FROM users WHERE id = $1',
      [req.user!.id]
    )

    const valid = await bcrypt.compare(currentPassword, rows[0].password)
    if (!valid) {
      res.status(401).json({ message: 'Current password is incorrect' })
      return
    }

    if (newPassword.length < 6) {
      res.status(400).json({ message: 'New password must be at least 6 characters' })
      return
    }

    const hash = await bcrypt.hash(newPassword, 12)
    await db.query(
      'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2',
      [hash, req.user!.id]
    )

    res.json({ success: true })
  } catch (err) {
    logger.error('Change password error', err)
    res.status(500).json({ message: 'Failed to change password' })
  }
})

// POST /api/auth/logout (client-side token drop, but we log it)
router.post('/logout', requireAuth, (req: AuthRequest, res: Response) => {
  logger.info(`User logout: ${req.user?.email}`)
  res.json({ success: true })
})

export default router
