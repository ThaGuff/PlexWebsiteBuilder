import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { db } from '../lib/db'

export interface AuthRequest extends Request {
  user?: {
    id: string
    email: string
    name: string
    role: string
    plan: string
  }
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization
    if (!header || !header.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' })
      return
    }

    const token = header.slice(7)
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'webhop-secret-key-change-me') as {
      id: string
      email: string
    }

    // Verify user still exists
    const { rows } = await db.query(
      'SELECT id, email, name, role, plan FROM users WHERE id = $1',
      [payload.id]
    )

    if (!rows.length) {
      res.status(401).json({ error: 'User not found' })
      return
    }

    req.user = rows[0]
    next()
  } catch (err) {
    if (err instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: 'Invalid token' })
      return
    }
    next(err)
  }
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: 'Admin required' })
    return
  }
  next()
}
