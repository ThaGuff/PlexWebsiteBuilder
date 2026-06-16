import axios from 'axios'
import * as cheerio from 'cheerio'
import logger from '../lib/logger'

export interface ScrapedBrandData {
  url: string
  businessName?: string
  tagline?: string
  description?: string
  logo?: string
  phone?: string
  email?: string
  address?: string
  socialLinks: Record<string, string>
  colors: string[]
  fonts: string[]
  images: string[]
  pages: { title: string; url: string }[]
  services: string[]
  testimonials: string[]
  keywords: string[]
  navItems: string[]
  metaTitle?: string
  metaDescription?: string
  faviconUrl?: string
}

const USER_AGENT =
  'Mozilla/5.0 (compatible; WebHopBot/1.0; +https://webhop.ai/bot)'

function absoluteUrl(href: string, base: string): string {
  try {
    return new URL(href, base).href
  } catch {
    return href
  }
}

function extractColors(html: string): string[] {
  const colorSet = new Set<string>()

  // Hex colors
  const hexRe = /#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g
  for (const m of html.matchAll(hexRe)) {
    const hex = m[1].length === 3
      ? m[1].split('').map(c => c + c).join('')
      : m[1]
    colorSet.add('#' + hex.toUpperCase())
  }

  // RGB/RGBA
  const rgbRe = /rgb(?:a)?\((\d+),\s*(\d+),\s*(\d+)/g
  for (const m of html.matchAll(rgbRe)) {
    const r = parseInt(m[1])
    const g = parseInt(m[2])
    const b = parseInt(m[3])
    // Skip near-white and near-black
    if (r + g + b > 30 && r + g + b < 750) {
      const hex = '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase()
      colorSet.add(hex)
    }
  }

  return [...colorSet].slice(0, 10)
}

function extractFonts(html: string): string[] {
  const fontSet = new Set<string>()

  // Google Fonts URLs
  const googleFontRe = /fonts\.googleapis\.com\/css.*?family=([^&"']+)/g
  for (const m of html.matchAll(googleFontRe)) {
    const families = decodeURIComponent(m[1]).split('|')
    for (const f of families) {
      const name = f.split(':')[0].replace(/\+/g, ' ').trim()
      if (name) fontSet.add(name)
    }
  }

  // CSS font-family declarations
  const ffRe = /font-family:\s*['"]?([^'";,]+)/g
  for (const m of html.matchAll(ffRe)) {
    const name = m[1].trim().replace(/['"]/g, '')
    if (name && !name.includes('{') && name.length < 50) fontSet.add(name)
  }

  return [...fontSet].slice(0, 5)
}

function extractPhone(text: string): string | undefined {
  const phoneRe = /(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)?\d{3}[\s.-]?\d{4}/g
  const match = text.match(phoneRe)
  return match?.[0]?.trim()
}

function extractEmail(text: string): string | undefined {
  const emailRe = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/
  return text.match(emailRe)?.[0]
}

export async function scrapeWebsite(url: string): Promise<ScrapedBrandData> {
  logger.info(`[Scraper] Starting scrape: ${url}`)

  const result: ScrapedBrandData = {
    url,
    socialLinks: {},
    colors: [],
    fonts: [],
    images: [],
    pages: [],
    services: [],
    testimonials: [],
    keywords: [],
    navItems: [],
  }

  try {
    const response = await axios.get(url, {
      headers: { 'User-Agent': USER_AGENT },
      timeout: 20000,
      maxRedirects: 5,
    })

    const html = response.data as string
    const $ = cheerio.load(html)
    const baseUrl = new URL(url).origin

    // ── Meta ──────────────────────────────────────────────────────────────────
    result.metaTitle = $('meta[property="og:title"]').attr('content')
      || $('meta[name="twitter:title"]').attr('content')
      || $('title').text()
      || undefined

    result.metaDescription = $('meta[property="og:description"]').attr('content')
      || $('meta[name="description"]').attr('content')
      || undefined

    result.businessName = result.metaTitle
      ? result.metaTitle.split(/[|\-–]/)[0].trim()
      : undefined

    result.description = result.metaDescription

    // ── Logo ──────────────────────────────────────────────────────────────────
    const logoSrc = $('img[class*="logo"], img[id*="logo"], img[alt*="logo"], .logo img, #logo img, header img').first().attr('src')
    if (logoSrc) {
      result.logo = absoluteUrl(logoSrc, baseUrl)
    }

    const ogImage = $('meta[property="og:image"]').attr('content')
    if (ogImage) result.images.push(absoluteUrl(ogImage, baseUrl))

    // ── Favicon ───────────────────────────────────────────────────────────────
    result.faviconUrl = absoluteUrl(
      $('link[rel="icon"], link[rel="shortcut icon"]').attr('href') || '/favicon.ico',
      baseUrl
    )

    // ── Navigation ────────────────────────────────────────────────────────────
    const navLinks: { title: string; url: string }[] = []
    $('nav a, header a, .menu a, .navbar a, .navigation a').each((_, el) => {
      const href = $(el).attr('href')
      const text = $(el).text().trim()
      if (href && text && text.length < 50 && !href.startsWith('#')) {
        result.navItems.push(text)
        navLinks.push({ title: text, url: absoluteUrl(href, baseUrl) })
      }
    })
    result.pages = navLinks.slice(0, 10)

    // ── Contact info ──────────────────────────────────────────────────────────
    const bodyText = $('body').text()
    result.phone = extractPhone(bodyText)
    result.email = $('a[href^="mailto:"]').attr('href')?.replace('mailto:', '')
      || extractEmail(bodyText)

    // Address from schema.org or footer
    const schemaAddress = $('[itemprop="streetAddress"]').text().trim()
    const footerText = $('footer').text()
    result.address = schemaAddress || undefined

    // ── Social links ──────────────────────────────────────────────────────────
    const socialDomains: Record<string, string> = {
      'facebook.com': 'facebook',
      'twitter.com': 'twitter',
      'x.com': 'twitter',
      'instagram.com': 'instagram',
      'linkedin.com': 'linkedin',
      'youtube.com': 'youtube',
      'tiktok.com': 'tiktok',
      'pinterest.com': 'pinterest',
    }

    $('a[href]').each((_, el) => {
      const href = $(el).attr('href') || ''
      for (const [domain, platform] of Object.entries(socialDomains)) {
        if (href.includes(domain) && !result.socialLinks[platform]) {
          result.socialLinks[platform] = href
        }
      }
    })

    // ── Services / features ───────────────────────────────────────────────────
    $('h2, h3, .service-title, .service h3, [class*="service"] h3, [class*="feature"] h3').each((_, el) => {
      const text = $(el).text().trim()
      if (text && text.length > 3 && text.length < 80) {
        result.services.push(text)
      }
    })

    // ── Testimonials ──────────────────────────────────────────────────────────
    $('[class*="testimonial"] p, [class*="review"] p, blockquote, .quote p').each((_, el) => {
      const text = $(el).text().trim()
      if (text && text.length > 20) result.testimonials.push(text)
    })

    // ── Colors ────────────────────────────────────────────────────────────────
    result.colors = extractColors(html)

    // ── Fonts ────────────────────────────────────────────────────────────────
    result.fonts = extractFonts(html)

    // ── Images ───────────────────────────────────────────────────────────────
    $('img[src]').each((_, el) => {
      const src = $(el).attr('src')
      if (src && !src.startsWith('data:')) {
        result.images.push(absoluteUrl(src, baseUrl))
      }
    })
    result.images = [...new Set(result.images)].slice(0, 20)

    // ── Keywords ─────────────────────────────────────────────────────────────
    const metaKw = $('meta[name="keywords"]').attr('content')
    if (metaKw) result.keywords = metaKw.split(',').map(k => k.trim()).slice(0, 10)

    // ── Tagline ───────────────────────────────────────────────────────────────
    result.tagline = $('h1').first().text().trim() || undefined

    logger.info(`[Scraper] Done: ${url} — name="${result.businessName}", colors=${result.colors.length}`)
    return result

  } catch (err: unknown) {
    const error = err as Error
    logger.error(`[Scraper] Failed to scrape ${url}: ${error.message}`)
    throw new Error(`Could not fetch the website: ${error.message}`)
  }
}
