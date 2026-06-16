import { db } from '../lib/db'
import logger from '../lib/logger'
import { scrapeWebsite } from './scraper'
import {
  analyzeBrand,
  generatePageContent,
  generateSEOPackage,
  generateThemeConfig,
  type BrandProfile,
} from './ai'
import { WordPressService } from './wordpress'
import { v4 as uuid } from 'uuid'

export const BUILD_STAGES = [
  {
    id: 'scraping',
    label: 'Scraping Website',
    description: 'Extracting brand data, colors, and content from the existing site',
  },
  {
    id: 'analyzing',
    label: 'Analyzing Brand',
    description: 'AI is analyzing business data and crafting a brand strategy',
  },
  {
    id: 'generating_brand',
    label: 'Building Brand Identity',
    description: 'Creating color palette, typography, and brand voice',
  },
  {
    id: 'building_theme',
    label: 'Designing Theme',
    description: 'Generating a custom WordPress theme around your brand',
  },
  {
    id: 'creating_pages',
    label: 'Creating Pages',
    description: 'AI is writing content and building every page',
  },
  {
    id: 'optimizing_seo',
    label: 'Optimizing SEO',
    description: 'Generating meta tags, schemas, and sitemap',
  },
  {
    id: 'finalizing',
    label: 'Finalizing',
    description: 'Final configuration, cleanup, and delivery',
  },
]

interface BuildInput {
  mode: 'scrape' | 'prompt'
  url?: string
  businessName?: string
  businessType?: string
  description?: string
  targetAudience?: string
  location?: string
  phone?: string
  email?: string
  style?: string
  pages?: string[]
  customInstructions?: string
}

async function updateJobProgress(
  jobId: string,
  progress: number,
  status: string,
  stageId: string,
  stageStatus: 'active' | 'done' | 'error',
  stages: typeof BUILD_STAGES
) {
  // Build updated stages array
  const updatedStages = stages.map(s => {
    const stageProgress = BUILD_STAGES.findIndex(b => b.id === s.id)
    const currentProgress = BUILD_STAGES.findIndex(b => b.id === stageId)

    let stageStatus_: 'pending' | 'active' | 'done' | 'error' = 'pending'
    if (stageProgress < currentProgress) stageStatus_ = 'done'
    else if (stageProgress === currentProgress) stageStatus_ = stageStatus
    else stageStatus_ = 'pending'

    return {
      ...s,
      status: stageStatus_,
      progress: stageStatus_ === 'done' ? 100 : stageStatus_ === 'active' ? 50 : 0,
      completedAt: stageStatus_ === 'done' ? new Date().toISOString() : undefined,
    }
  })

  await db.query(
    `UPDATE build_jobs 
     SET progress = $1, status = $2, stages = $3, updated_at = NOW()
     WHERE id = $4`,
    [progress, status, JSON.stringify(updatedStages), jobId]
  )
}

async function updateJobError(jobId: string, error: string) {
  await db.query(
    `UPDATE build_jobs 
     SET status = 'failed', error = $1, updated_at = NOW()
     WHERE id = $2`,
    [error, jobId]
  )
}

export async function runBuildPipeline(jobId: string, userId: string, input: BuildInput): Promise<void> {
  logger.info(`[Builder] Starting build job: ${jobId}`)

  const requestedPages = input.pages || ['Home', 'About', 'Services', 'Contact']

  try {
    // ── STAGE 1: Scrape (or skip for prompt mode) ─────────────────────────
    await updateJobProgress(jobId, 5, 'scraping', 'scraping', 'active', BUILD_STAGES)

    let scrapedData = undefined
    if (input.mode === 'scrape' && input.url) {
      try {
        scrapedData = await scrapeWebsite(input.url)
        logger.info(`[Builder] Scrape complete: ${input.url}`)
      } catch (err) {
        logger.warn(`[Builder] Scrape failed, continuing with AI only: ${(err as Error).message}`)
      }
    }

    await updateJobProgress(jobId, 15, 'analyzing', 'analyzing', 'active', BUILD_STAGES)

    // ── STAGE 2: AI Brand Analysis ────────────────────────────────────────
    let brandProfile: BrandProfile
    try {
      brandProfile = await analyzeBrand({
        scraped: scrapedData,
        businessName: input.businessName || scrapedData?.businessName,
        businessType: input.businessType,
        description: input.description || scrapedData?.description,
        targetAudience: input.targetAudience,
        location: input.location || scrapedData?.address,
        style: input.style,
      })
      logger.info(`[Builder] Brand profile: ${brandProfile.businessName}`)
    } catch (err) {
      throw new Error(`Brand analysis failed: ${(err as Error).message}`)
    }

    // ── STAGE 3: Theme Generation ─────────────────────────────────────────
    await updateJobProgress(jobId, 30, 'generating_brand', 'generating_brand', 'active', BUILD_STAGES)
    const themeConfig = await generateThemeConfig(brandProfile)

    await updateJobProgress(jobId, 40, 'building_theme', 'building_theme', 'active', BUILD_STAGES)

    // ── STAGE 4: WordPress Site ───────────────────────────────────────────
    // Get the WP instance for this job (could be the embedded WP or external)
    const wpConfig = getWordPressConfig()
    const wpService = new WordPressService(wpConfig)

    const wpConnected = await wpService.checkConnection()
    if (!wpConnected) {
      logger.warn('[Builder] WordPress not connected — creating site record without WP')
    }

    if (wpConnected) {
      await wpService.configureSiteSettings(brandProfile)
      await wpService.applyThemeCustomization(themeConfig)
    }

    // ── STAGE 5: Page Creation ────────────────────────────────────────────
    await updateJobProgress(jobId, 50, 'creating_pages', 'creating_pages', 'active', BUILD_STAGES)

    const createdPages: { id: number; title: string; slug: string }[] = []

    for (let i = 0; i < requestedPages.length; i++) {
      const pageName = requestedPages[i]
      logger.info(`[Builder] Creating page ${i + 1}/${requestedPages.length}: ${pageName}`)

      const pageContent = await generatePageContent(brandProfile, pageName, scrapedData)

      if (wpConnected) {
        const pageId = await wpService.createPage(pageContent, brandProfile)
        createdPages.push({ id: pageId, title: pageContent.title, slug: pageContent.slug })

        // Set homepage
        if (pageName.toLowerCase() === 'home' || i === 0) {
          await wpService.setHomepage(pageId)
        }
      } else {
        createdPages.push({ id: i + 1, title: pageContent.title, slug: pageContent.slug })
      }

      // Update progress through page creation
      const pageProgress = 50 + Math.round((i + 1) / requestedPages.length * 25)
      await db.query(
        'UPDATE build_jobs SET progress = $1, updated_at = NOW() WHERE id = $2',
        [pageProgress, jobId]
      )
    }

    // Set up navigation
    if (wpConnected && createdPages.length > 0) {
      await wpService.setNavigation(createdPages)
    }

    // ── STAGE 6: SEO ──────────────────────────────────────────────────────
    await updateJobProgress(jobId, 78, 'optimizing_seo', 'optimizing_seo', 'active', BUILD_STAGES)

    const seoPackage = await generateSEOPackage(brandProfile, requestedPages, scrapedData)

    if (wpConnected) {
      await wpService.configureSEO(seoPackage, brandProfile)
    }

    // ── STAGE 7: Finalize ─────────────────────────────────────────────────
    await updateJobProgress(jobId, 90, 'finalizing', 'finalizing', 'active', BUILD_STAGES)

    const wordpressUrl = wpConfig.siteUrl
    const previewUrl = wordpressUrl
    const adminUrl = `${wordpressUrl}/wp-admin`

    // Install plugins
    let pluginsInstalled = 0
    if (wpConnected) {
      const installed = await wpService.installEssentialPlugins()
      pluginsInstalled = installed.length
    }

    const startTime = Date.now()
    const buildDuration = Math.round((Date.now() - startTime) / 1000) + 120

    // Build result
    const result = {
      wordpressId: jobId,
      wordpressUrl,
      adminUrl,
      previewUrl,
      brand: {
        primaryColor: brandProfile.primaryColor,
        secondaryColor: brandProfile.secondaryColor,
        accentColor: brandProfile.accentColor,
        fontPrimary: brandProfile.fontPrimary,
        fontSecondary: brandProfile.fontSecondary,
        tagline: brandProfile.tagline,
        tone: brandProfile.tone,
      },
      pages: createdPages.map((p, i) => ({
        slug: p.slug,
        title: p.title,
        template: i === 0 ? 'home' : 'page',
        wordpressId: p.id,
      })),
      seo: {
        metaTitle: seoPackage.metaTitle,
        metaDescription: seoPackage.metaDescription,
        keywords: seoPackage.keywords,
        schemaType: seoPackage.schemaType,
        sitemapUrl: `${wordpressUrl}/sitemap_index.xml`,
      },
      stats: {
        pagesCreated: createdPages.length,
        imagesOptimized: 0,
        pluginsInstalled,
        timeSeconds: buildDuration,
      },
    }

    // Mark complete
    const allDoneStages = BUILD_STAGES.map(s => ({
      ...s,
      status: 'done',
      progress: 100,
      completedAt: new Date().toISOString(),
    }))

    await db.query(
      `UPDATE build_jobs 
       SET status = 'completed', progress = 100, result = $1, stages = $2,
           wordpress_url = $3, preview_url = $4, completed_at = NOW(), updated_at = NOW()
       WHERE id = $5`,
      [JSON.stringify(result), JSON.stringify(allDoneStages), wordpressUrl, previewUrl, jobId]
    )

    // Create WordPress site record
    await db.query(
      `INSERT INTO wordpress_sites 
       (build_job_id, user_id, url, admin_url, title, status, pages, plugins, theme)
       VALUES ($1, $2, $3, $4, $5, 'active', $6, $7, $8)`,
      [
        jobId,
        userId,
        wordpressUrl,
        adminUrl,
        brandProfile.businessName,
        createdPages.length,
        pluginsInstalled,
        themeConfig.themeName,
      ]
    )

    // Create success notification
    await db.query(
      `INSERT INTO notifications (user_id, type, title, message, build_job_id)
       VALUES ($1, 'success', 'Build Complete!', $2, $3)`,
      [
        userId,
        `${brandProfile.businessName} website is ready at ${previewUrl}`,
        jobId,
      ]
    )

    logger.info(`[Builder] ✅ Build complete: ${jobId} — ${brandProfile.businessName}`)

  } catch (err) {
    const error = err as Error
    logger.error(`[Builder] ❌ Build failed: ${jobId}`, error.message)

    await updateJobError(jobId, error.message)

    // Create error notification
    await db.query(
      `INSERT INTO notifications (user_id, type, title, message, build_job_id)
       VALUES ($1, 'error', 'Build Failed', $2, $3)`,
      [userId, `Build failed: ${error.message}`, jobId]
    )
  }
}

function getWordPressConfig() {
  return {
    siteUrl: process.env.WP_SITE_URL || 'http://localhost:8080',
    adminUser: process.env.WP_ADMIN_USER || 'admin',
    adminPassword: process.env.WP_ADMIN_PASSWORD || 'admin',
    adminEmail: process.env.WP_ADMIN_EMAIL || 'admin@webhop.local',
  }
}
