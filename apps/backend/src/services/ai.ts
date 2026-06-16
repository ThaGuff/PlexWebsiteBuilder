import Anthropic from '@anthropic-ai/sdk'
import logger from '../lib/logger'
import type { ScrapedBrandData } from './scraper'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export interface BrandProfile {
  businessName: string
  tagline: string
  description: string
  tone: string
  targetAudience: string
  primaryColor: string
  secondaryColor: string
  accentColor: string
  fontPrimary: string
  fontSecondary: string
  industryCategory: string
  uniqueSellingPoints: string[]
  callToAction: string
}

export interface PageContent {
  slug: string
  title: string
  metaTitle: string
  metaDescription: string
  sections: ContentSection[]
}

export interface ContentSection {
  type: 'hero' | 'about' | 'services' | 'testimonials' | 'cta' | 'contact' | 'faq' | 'team' | 'gallery' | 'pricing'
  heading: string
  subheading?: string
  content: string
  items?: { title: string; description: string; icon?: string }[]
}

export interface SEOPackage {
  metaTitle: string
  metaDescription: string
  ogTitle: string
  ogDescription: string
  keywords: string[]
  schemaType: string
  schemaJson: string
  sitemapUrls: string[]
  robots: string
}

export interface WebHopTheme {
  themeName: string
  primaryColor: string
  secondaryColor: string
  accentColor: string
  textColor: string
  bgColor: string
  fontPrimary: string
  fontSecondary: string
  borderRadius: string
  headerStyle: string
  footerStyle: string
  buttonStyle: string
}

async function callClaude(prompt: string, systemPrompt: string, maxTokens = 2000): Promise<string> {
  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: 'user', content: prompt }],
  })

  const content = msg.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response type from Claude')
  return content.text
}

async function callClaudeJSON<T>(prompt: string, systemPrompt: string, maxTokens = 2000): Promise<T> {
  const text = await callClaude(prompt, systemPrompt + '\n\nRespond with ONLY valid JSON. No markdown, no explanation.', maxTokens)
  try {
    const cleaned = text.replace(/```json\n?|```/g, '').trim()
    return JSON.parse(cleaned) as T
  } catch {
    logger.error('[AI] JSON parse failed:', text.slice(0, 200))
    throw new Error('AI returned invalid JSON')
  }
}

// ─── Brand Analysis ────────────────────────────────────────────────────────────
export async function analyzeBrand(input: {
  scraped?: ScrapedBrandData
  businessName?: string
  businessType?: string
  description?: string
  targetAudience?: string
  location?: string
  style?: string
  colorPreference?: string
}): Promise<BrandProfile> {
  logger.info('[AI] Analyzing brand…')

  const systemPrompt = `You are an expert brand strategist and web designer. 
  You create compelling brand identities for businesses.
  Always generate professional, specific, non-generic brand profiles.
  For colors: choose colors that reflect the industry and feel premium.
  For fonts: use popular Google Fonts that fit the brand personality.`

  const context = input.scraped
    ? `EXISTING WEBSITE DATA:
Business Name: ${input.scraped.businessName || 'Unknown'}
Tagline: ${input.scraped.tagline || 'N/A'}
Description: ${input.scraped.description || 'N/A'}
Phone: ${input.scraped.phone || 'N/A'}
Location: ${input.scraped.address || 'N/A'}
Detected Colors: ${input.scraped.colors.slice(0, 5).join(', ')}
Detected Fonts: ${input.scraped.fonts.slice(0, 3).join(', ')}
Services: ${input.scraped.services.slice(0, 5).join(', ')}`
    : `BUSINESS DETAILS:
Name: ${input.businessName}
Type: ${input.businessType}
Description: ${input.description}
Target Audience: ${input.targetAudience || 'General public'}
Location: ${input.location || 'Not specified'}
Preferred Style: ${input.style || 'modern-minimal'}
Color Preference: ${input.colorPreference || 'None specified'}`

  return callClaudeJSON<BrandProfile>(
    `${context}

Generate a complete brand profile as JSON with these exact keys:
{
  "businessName": "Clean business name",
  "tagline": "Compelling 5-8 word tagline",
  "description": "2-3 sentence brand story",
  "tone": "e.g. Professional and authoritative / Warm and approachable",
  "targetAudience": "Specific audience description",
  "primaryColor": "#HEXCODE - main brand color",
  "secondaryColor": "#HEXCODE - complementary color",
  "accentColor": "#HEXCODE - call-to-action color",
  "fontPrimary": "Google Font name for headings",
  "fontSecondary": "Google Font name for body text",
  "industryCategory": "Industry category",
  "uniqueSellingPoints": ["USP 1", "USP 2", "USP 3"],
  "callToAction": "Primary CTA button text"
}`,
    systemPrompt,
    1500
  )
}

// ─── Page Content Generation ───────────────────────────────────────────────────
export async function generatePageContent(
  brand: BrandProfile,
  pageName: string,
  scraped?: ScrapedBrandData
): Promise<PageContent> {
  logger.info(`[AI] Generating content for page: ${pageName}`)

  const slug = pageName.toLowerCase().replace(/\s+/g, '-')

  const systemPrompt = `You are an expert copywriter who creates conversion-optimized website content.
Write compelling, specific content — never generic filler.
Every section should feel custom-made for this specific business.
Use the brand's tone and voice throughout.`

  const prompt = `Create content for the "${pageName}" page for:
Business: ${brand.businessName}
Tagline: ${brand.tagline}
Description: ${brand.description}
Tone: ${brand.tone}
Audience: ${brand.targetAudience}
USPs: ${brand.uniqueSellingPoints.join(', ')}
CTA: ${brand.callToAction}
${scraped?.services.length ? `Known Services: ${scraped.services.slice(0, 5).join(', ')}` : ''}

Return JSON with this structure:
{
  "slug": "${slug}",
  "title": "Page Title",
  "metaTitle": "SEO optimized title under 60 chars",
  "metaDescription": "SEO description 120-160 chars",
  "sections": [
    {
      "type": "hero",
      "heading": "Powerful headline",
      "subheading": "Supporting text",
      "content": "Body content"
    }
  ]
}`

  return callClaudeJSON<PageContent>(prompt, systemPrompt, 2000)
}

// ─── WordPress Theme Config ────────────────────────────────────────────────────
export async function generateThemeConfig(brand: BrandProfile): Promise<WebHopTheme> {
  logger.info('[AI] Generating WordPress theme config…')

  return {
    themeName: `webhop-${brand.businessName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 30)}`,
    primaryColor: brand.primaryColor,
    secondaryColor: brand.secondaryColor,
    accentColor: brand.accentColor,
    textColor: '#1A1A1A',
    bgColor: '#FFFFFF',
    fontPrimary: brand.fontPrimary,
    fontSecondary: brand.fontSecondary,
    borderRadius: '8px',
    headerStyle: 'sticky-transparent',
    footerStyle: 'dark-minimal',
    buttonStyle: 'rounded-bold',
  }
}

// ─── SEO Package ──────────────────────────────────────────────────────────────
export async function generateSEOPackage(
  brand: BrandProfile,
  pages: string[],
  scraped?: ScrapedBrandData
): Promise<SEOPackage> {
  logger.info('[AI] Generating SEO package…')

  const systemPrompt = `You are an expert SEO strategist. 
Generate highly optimized meta tags, schema markup, and keywords.
Focus on local SEO if a location is mentioned.
Schema should be valid Schema.org JSON-LD.`

  const schemaType = guessSchemaType(brand.industryCategory)

  const prompt = `Generate an SEO package for:
Business: ${brand.businessName}
Industry: ${brand.industryCategory}
Description: ${brand.description}
Pages: ${pages.join(', ')}
${scraped?.keywords.length ? `Existing keywords: ${scraped.keywords.join(', ')}` : ''}

Return JSON:
{
  "metaTitle": "Title under 60 chars",
  "metaDescription": "Description 120-160 chars",
  "ogTitle": "Open Graph title",
  "ogDescription": "OG description",
  "keywords": ["keyword1", "keyword2", ...up to 15],
  "schemaType": "${schemaType}",
  "schemaJson": "valid JSON-LD schema string",
  "sitemapUrls": ${JSON.stringify(pages.map(p => '/' + p.toLowerCase().replace(/\s+/g, '-')))},
  "robots": "index, follow"
}`

  return callClaudeJSON<SEOPackage>(prompt, systemPrompt, 2000)
}

// ─── WordPress Block Content Generator ───────────────────────────────────────
export async function generateWordPressBlocks(
  page: PageContent,
  brand: BrandProfile
): Promise<string> {
  logger.info(`[AI] Generating WordPress blocks for: ${page.title}`)

  const systemPrompt = `You are a WordPress Gutenberg expert. 
Generate WordPress block editor JSON that produces beautiful, professional pages.
Use only core WordPress blocks (no plugins needed).
The output should be valid WordPress post content.`

  const prompt = `Create WordPress Gutenberg block content for the "${page.title}" page.

Brand:
- Business: ${brand.businessName}
- Colors: Primary ${brand.primaryColor}, Secondary ${brand.secondaryColor}, Accent ${brand.accentColor}
- Fonts: ${brand.fontPrimary} / ${brand.fontSecondary}

Page sections to include:
${page.sections.map(s => `- ${s.type}: "${s.heading}" — ${s.content.slice(0, 100)}`).join('\n')}

Return the full WordPress block HTML/JSON content that can be saved directly as wp_insert_post content.
Include proper Gutenberg block comments (<!-- wp:... -->).
Make it visually impressive with custom colors and layout.`

  return callClaude(prompt, systemPrompt, 3000)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function guessSchemaType(industry: string): string {
  const lower = industry.toLowerCase()
  if (lower.includes('restaurant') || lower.includes('food')) return 'Restaurant'
  if (lower.includes('hvac') || lower.includes('plumb') || lower.includes('electric')) return 'HomeAndConstructionBusiness'
  if (lower.includes('medical') || lower.includes('dental') || lower.includes('health')) return 'MedicalBusiness'
  if (lower.includes('legal') || lower.includes('law')) return 'LegalService'
  if (lower.includes('real estate')) return 'RealEstateAgent'
  if (lower.includes('auto') || lower.includes('car')) return 'AutomotiveBusiness'
  if (lower.includes('beauty') || lower.includes('salon') || lower.includes('spa')) return 'BeautySalon'
  if (lower.includes('gym') || lower.includes('fitness')) return 'SportsActivityLocation'
  if (lower.includes('hotel') || lower.includes('lodg')) return 'LodgingBusiness'
  if (lower.includes('tech') || lower.includes('software')) return 'ProfessionalService'
  return 'LocalBusiness'
}
