import { Router, Response } from 'express'
import { requireAuth, type AuthRequest } from '../middleware/auth'
import { db } from '../lib/db'
import logger from '../lib/logger'
import crypto from 'crypto'

const router = Router()
router.use(requireAuth)

// Simple encrypt/decrypt for API keys at rest
const CIPHER_KEY = (process.env.CIPHER_KEY || 'webhop-cipher-key-32-chars-00000').slice(0, 32)
const IV_LEN = 16

function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LEN)
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(CIPHER_KEY), iv)
  const encrypted = Buffer.concat([cipher.update(text), cipher.final()])
  return iv.toString('hex') + ':' + encrypted.toString('hex')
}

function decrypt(text: string): string {
  const [ivHex, encHex] = text.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(CIPHER_KEY), iv)
  const decrypted = Buffer.concat([decipher.update(Buffer.from(encHex, 'hex')), decipher.final()])
  return decrypted.toString()
}

// POST /api/settings/api-keys — save encrypted API keys
router.post('/api-keys', async (req: AuthRequest, res: Response) => {
  try {
    const { anthropicKey, openaiKey } = req.body

    const updates: Record<string, string> = {}
    if (anthropicKey?.startsWith('sk-')) {
      updates.anthropic_key = encrypt(anthropicKey)
    }
    if (openaiKey?.startsWith('sk-')) {
      updates.openai_key = encrypt(openaiKey)
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ message: 'No valid API keys provided' })
      return
    }

    const setClauses = Object.keys(updates)
      .map((k, i) => `${k} = $${i + 2}`)
      .join(', ')

    await db.query(
      `INSERT INTO user_settings (user_id, ${Object.keys(updates).join(', ')})
       VALUES ($1, ${Object.keys(updates).map((_, i) => `$${i + 2}`).join(', ')})
       ON CONFLICT (user_id) DO UPDATE SET ${setClauses}, updated_at = NOW()`,
      [req.user!.id, ...Object.values(updates)]
    )

    logger.info(`[Settings] API keys updated for user ${req.user!.id}`)
    res.json({ success: true })
  } catch (err) {
    logger.error('[Settings] API key save error:', err)
    res.status(500).json({ message: 'Failed to save API keys' })
  }
})

// GET /api/settings/api-keys — return masked versions
router.get('/api-keys', async (req: AuthRequest, res: Response) => {
  try {
    const { rows } = await db.query(
      'SELECT anthropic_key, openai_key FROM user_settings WHERE user_id = $1',
      [req.user!.id]
    )

    if (!rows.length) {
      res.json({ anthropicKey: null, openaiKey: null })
      return
    }

    const mask = (encrypted: string | null) => {
      if (!encrypted) return null
      try {
        const decrypted = decrypt(encrypted)
        return decrypted.slice(0, 8) + '••••••••' + decrypted.slice(-4)
      } catch {
        return '••••••••'
      }
    }

    res.json({
      anthropicKey: mask(rows[0].anthropic_key),
      openaiKey: mask(rows[0].openai_key),
    })
  } catch (err) {
    res.status(500).json({ message: 'Failed to get API keys' })
  }
})

// GET /api/settings/preferences
router.get('/preferences', async (req: AuthRequest, res: Response) => {
  try {
    const { rows } = await db.query(
      'SELECT preferences FROM user_settings WHERE user_id = $1',
      [req.user!.id]
    )

    res.json(rows[0]?.preferences || {})
  } catch (err) {
    res.status(500).json({ message: 'Failed to get preferences' })
  }
})

// PATCH /api/settings/preferences
router.patch('/preferences', async (req: AuthRequest, res: Response) => {
  try {
    const prefs = req.body

    await db.query(
      `INSERT INTO user_settings (user_id, preferences)
       VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET preferences = $2, updated_at = NOW()`,
      [req.user!.id, JSON.stringify(prefs)]
    )

    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ message: 'Failed to update preferences' })
  }
})

export default router
