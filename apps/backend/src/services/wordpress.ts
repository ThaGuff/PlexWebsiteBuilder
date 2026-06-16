import axios from 'axios'
import FormData from 'form-data'
import fs from 'fs'
import path from 'path'
import logger from '../lib/logger'
import type { BrandProfile, PageContent, SEOPackage, WebHopTheme } from './ai'

export interface WordPressSiteConfig {
  siteUrl: string
  adminUser: string
  adminPassword: string
  adminEmail: string
}

export class WordPressService {
  private baseUrl: string
  private auth: string

  constructor(config: WordPressSiteConfig) {
    this.baseUrl = config.siteUrl.replace(/\/$/, '')
    this.auth = Buffer.from(`${config.adminUser}:${config.adminPassword}`).toString('base64')
  }

  private headers() {
    return {
      Authorization: `Basic ${this.auth}`,
      'Content-Type': 'application/json',
    }
  }

  async checkConnection(): Promise<boolean> {
    try {
      await axios.get(`${this.baseUrl}/wp-json/wp/v2/users/me`, {
        headers: this.headers(),
        timeout: 10000,
      })
      return true
    } catch {
      return false
    }
  }

  // ── Site Settings ──────────────────────────────────────────────────────────
  async configureSiteSettings(brand: BrandProfile): Promise<void> {
    logger.info('[WP] Configuring site settings…')

    const settings = {
      title: brand.businessName,
      description: brand.tagline,
      timezone_string: 'America/Chicago',
      date_format: 'F j, Y',
      time_format: 'g:i a',
      start_of_week: 1,
    }

    await axios.post(`${this.baseUrl}/wp-json/wp/v2/settings`, settings, {
      headers: this.headers(),
    })
  }

  // ── Pages ──────────────────────────────────────────────────────────────────
  async createPage(page: PageContent, brandProfile: BrandProfile): Promise<number> {
    logger.info(`[WP] Creating page: ${page.title}`)

    // Build Gutenberg blocks from page content
    const content = this.buildGutenbergContent(page, brandProfile)

    const res = await axios.post(
      `${this.baseUrl}/wp-json/wp/v2/pages`,
      {
        title: page.title,
        content,
        status: 'publish',
        slug: page.slug,
        meta: {
          _yoast_wpseo_title: page.metaTitle,
          _yoast_wpseo_metadesc: page.metaDescription,
        },
      },
      { headers: this.headers() }
    )

    return res.data.id
  }

  private buildGutenbergContent(page: PageContent, brand: BrandProfile): string {
    let blocks = ''

    for (const section of page.sections) {
      switch (section.type) {
        case 'hero':
          blocks += this.heroBlock(section, brand)
          break
        case 'about':
          blocks += this.aboutBlock(section, brand)
          break
        case 'services':
          blocks += this.servicesBlock(section, brand)
          break
        case 'cta':
          blocks += this.ctaBlock(section, brand)
          break
        case 'contact':
          blocks += this.contactBlock(section, brand)
          break
        default:
          blocks += this.genericBlock(section, brand)
      }
    }

    return blocks
  }

  private heroBlock(section: { heading: string; subheading?: string; content: string }, brand: BrandProfile): string {
    return `
<!-- wp:cover {"overlayColor":"primary","minHeight":600,"align":"full","style":{"color":{"background":"${brand.primaryColor}"}}} -->
<div class="wp-block-cover alignfull" style="background-color:${brand.primaryColor};min-height:600px">
  <div class="wp-block-cover__inner-container">
    <!-- wp:heading {"textAlign":"center","level":1,"style":{"typography":{"fontSize":"clamp(2rem,5vw,4rem)","fontWeight":"700"},"color":{"text":"#ffffff"}}} -->
    <h1 class="wp-block-heading has-text-align-center" style="color:#ffffff">${section.heading}</h1>
    <!-- /wp:heading -->
    ${section.subheading ? `
    <!-- wp:paragraph {"align":"center","style":{"color":{"text":"rgba(255,255,255,0.85)"},"typography":{"fontSize":"1.25rem"}}} -->
    <p class="has-text-align-center" style="color:rgba(255,255,255,0.85);font-size:1.25rem">${section.subheading}</p>
    <!-- /wp:paragraph -->` : ''}
    <!-- wp:buttons {"layout":{"type":"flex","justifyContent":"center"}} -->
    <div class="wp-block-buttons">
      <!-- wp:button {"style":{"color":{"background":"${brand.accentColor}","text":"#ffffff"},"border":{"radius":"8px"},"typography":{"fontSize":"1.1rem","fontWeight":"600"},"spacing":{"padding":{"top":"16px","bottom":"16px","left":"32px","right":"32px"}}}} -->
      <div class="wp-block-button"><a class="wp-block-button__link" style="background-color:${brand.accentColor};color:#ffffff;border-radius:8px">${brand.callToAction}</a></div>
      <!-- /wp:button -->
    </div>
    <!-- /wp:buttons -->
  </div>
</div>
<!-- /wp:cover -->
`
  }

  private aboutBlock(section: { heading: string; content: string }, brand: BrandProfile): string {
    return `
<!-- wp:group {"align":"full","style":{"spacing":{"padding":{"top":"80px","bottom":"80px"}}}} -->
<div class="wp-block-group alignfull" style="padding-top:80px;padding-bottom:80px">
  <!-- wp:columns {"align":"wide"} -->
  <div class="wp-block-columns alignwide">
    <!-- wp:column {"width":"50%"} -->
    <div class="wp-block-column">
      <!-- wp:heading {"style":{"typography":{"fontSize":"2.25rem","fontWeight":"700"}}} -->
      <h2 style="font-size:2.25rem;font-weight:700">${section.heading}</h2>
      <!-- /wp:heading -->
      <!-- wp:separator {"style":{"color":{"background":"${brand.primaryColor}"}},"className":"is-style-wide"} -->
      <hr class="wp-block-separator has-text-color has-background is-style-wide" style="background-color:${brand.primaryColor};width:60px;height:4px;border:none"/>
      <!-- /wp:separator -->
      <!-- wp:paragraph {"style":{"typography":{"lineHeight":"1.8"},"color":{"text":"#555"}}} -->
      <p style="line-height:1.8;color:#555">${section.content}</p>
      <!-- /wp:paragraph -->
    </div>
    <!-- /wp:column -->
    <!-- wp:column {"width":"50%","style":{"color":{"background":"${brand.secondaryColor}20"},"spacing":{"padding":{"all":"40px"}},"border":{"radius":"16px"}}} -->
    <div class="wp-block-column" style="background-color:${brand.secondaryColor}20;padding:40px;border-radius:16px">
      <!-- wp:list {"style":{"typography":{"fontSize":"1.05rem"}}} -->
      <ul style="font-size:1.05rem">
        ${brand.uniqueSellingPoints.map(usp => `<li>${usp}</li>`).join('\n')}
      </ul>
      <!-- /wp:list -->
    </div>
    <!-- /wp:column -->
  </div>
  <!-- /wp:columns -->
</div>
<!-- /wp:group -->
`
  }

  private servicesBlock(section: { heading: string; subheading?: string; items?: { title: string; description: string }[] }, brand: BrandProfile): string {
    const items = section.items || []
    return `
<!-- wp:group {"align":"full","style":{"color":{"background":"#f8f9fa"},"spacing":{"padding":{"top":"80px","bottom":"80px"}}}} -->
<div class="wp-block-group alignfull" style="background-color:#f8f9fa;padding:80px 0">
  <!-- wp:heading {"textAlign":"center","style":{"typography":{"fontSize":"2.25rem","fontWeight":"700"}}} -->
  <h2 class="has-text-align-center" style="font-size:2.25rem">${section.heading}</h2>
  <!-- /wp:heading -->
  ${section.subheading ? `<!-- wp:paragraph {"align":"center","style":{"color":{"text":"#666"}}} --><p class="has-text-align-center" style="color:#666">${section.subheading}</p><!-- /wp:paragraph -->` : ''}
  <!-- wp:columns {"align":"wide","style":{"spacing":{"padding":{"top":"40px"}}}} -->
  <div class="wp-block-columns alignwide" style="padding-top:40px">
    ${items.slice(0, 3).map(item => `
    <!-- wp:column -->
    <div class="wp-block-column">
      <!-- wp:group {"style":{"color":{"background":"#fff"},"spacing":{"padding":{"all":"32px"}},"border":{"radius":"12px","width":"1px","color":"#e5e7eb"}}} -->
      <div class="wp-block-group" style="background-color:#fff;padding:32px;border-radius:12px;border:1px solid #e5e7eb">
        <!-- wp:heading {"level":3,"style":{"typography":{"fontSize":"1.25rem","fontWeight":"600"},"color":{"text":"${brand.primaryColor}"}}} -->
        <h3 style="font-size:1.25rem;color:${brand.primaryColor}">${item.title}</h3>
        <!-- /wp:heading -->
        <!-- wp:paragraph {"style":{"color":{"text":"#666"}}} -->
        <p style="color:#666">${item.description}</p>
        <!-- /wp:paragraph -->
      </div>
      <!-- /wp:group -->
    </div>
    <!-- /wp:column -->
    `).join('')}
  </div>
  <!-- /wp:columns -->
</div>
<!-- /wp:group -->
`
  }

  private ctaBlock(section: { heading: string; content: string }, brand: BrandProfile): string {
    return `
<!-- wp:cover {"overlayColor":"primary","align":"full","style":{"color":{"background":"${brand.primaryColor}"},"spacing":{"padding":{"top":"80px","bottom":"80px"}}}} -->
<div class="wp-block-cover alignfull" style="background-color:${brand.primaryColor};padding:80px 0">
  <div class="wp-block-cover__inner-container">
    <!-- wp:heading {"textAlign":"center","style":{"color":{"text":"#ffffff"},"typography":{"fontSize":"2.5rem"}}} -->
    <h2 class="has-text-align-center" style="color:#ffffff">${section.heading}</h2>
    <!-- /wp:heading -->
    <!-- wp:paragraph {"align":"center","style":{"color":{"text":"rgba(255,255,255,0.85)"}}} -->
    <p class="has-text-align-center" style="color:rgba(255,255,255,0.85)">${section.content}</p>
    <!-- /wp:paragraph -->
    <!-- wp:buttons {"layout":{"type":"flex","justifyContent":"center"}} -->
    <div class="wp-block-buttons">
      <!-- wp:button {"style":{"color":{"background":"${brand.accentColor}","text":"#ffffff"},"border":{"radius":"8px"}}} -->
      <div class="wp-block-button"><a class="wp-block-button__link" style="background-color:${brand.accentColor};color:#ffffff;border-radius:8px">${brand.callToAction}</a></div>
      <!-- /wp:button -->
    </div>
    <!-- /wp:buttons -->
  </div>
</div>
<!-- /wp:cover -->
`
  }

  private contactBlock(section: { heading: string; content: string }, brand: BrandProfile): string {
    return `
<!-- wp:group {"align":"full","style":{"spacing":{"padding":{"top":"80px","bottom":"80px"}}}} -->
<div class="wp-block-group alignfull" style="padding:80px 0">
  <!-- wp:heading {"textAlign":"center","style":{"typography":{"fontSize":"2.25rem","fontWeight":"700"}}} -->
  <h2 class="has-text-align-center">${section.heading}</h2>
  <!-- /wp:heading -->
  <!-- wp:paragraph {"align":"center","style":{"color":{"text":"#666"}}} -->
  <p class="has-text-align-center" style="color:#666">${section.content}</p>
  <!-- /wp:paragraph -->
  <!-- wp:html -->
  <div class="webhop-contact-form" style="max-width:600px;margin:40px auto">
    <form action="#" method="POST" style="display:grid;gap:16px">
      <input type="text" placeholder="Your Name" style="padding:14px 18px;border:1px solid #e5e7eb;border-radius:8px;font-size:1rem;width:100%"/>
      <input type="email" placeholder="Email Address" style="padding:14px 18px;border:1px solid #e5e7eb;border-radius:8px;font-size:1rem;width:100%"/>
      <input type="tel" placeholder="Phone Number" style="padding:14px 18px;border:1px solid #e5e7eb;border-radius:8px;font-size:1rem;width:100%"/>
      <textarea placeholder="How can we help?" rows="5" style="padding:14px 18px;border:1px solid #e5e7eb;border-radius:8px;font-size:1rem;width:100%;resize:vertical"></textarea>
      <button type="submit" style="background:${brand.primaryColor};color:#fff;padding:16px 32px;border:none;border-radius:8px;font-size:1.05rem;font-weight:600;cursor:pointer;width:100%">${brand.callToAction}</button>
    </form>
  </div>
  <!-- /wp:html -->
</div>
<!-- /wp:group -->
`
  }

  private genericBlock(section: { heading: string; content: string }, brand: BrandProfile): string {
    return `
<!-- wp:group {"align":"full","style":{"spacing":{"padding":{"top":"60px","bottom":"60px"}}}} -->
<div class="wp-block-group alignfull" style="padding:60px 0">
  <!-- wp:heading {"textAlign":"center"} -->
  <h2 class="has-text-align-center">${section.heading}</h2>
  <!-- /wp:heading -->
  <!-- wp:paragraph {"align":"center","style":{"color":{"text":"#666"}}} -->
  <p class="has-text-align-center" style="color:#666">${section.content}</p>
  <!-- /wp:paragraph -->
</div>
<!-- /wp:group -->
`
  }

  // ── Navigation ─────────────────────────────────────────────────────────────
  async setNavigation(pages: { id: number; title: string; slug: string }[]): Promise<void> {
    logger.info('[WP] Setting up navigation…')

    // Get or create primary menu
    const menuRes = await axios.post(
      `${this.baseUrl}/wp-json/wp/v2/menus`,
      { name: 'Primary Menu' },
      { headers: this.headers() }
    ).catch(() => null)

    if (!menuRes?.data?.id) return

    const menuId = menuRes.data.id

    // Add each page to the menu
    for (let i = 0; i < pages.length; i++) {
      await axios.post(
        `${this.baseUrl}/wp-json/wp/v2/menu-items`,
        {
          title: pages[i].title,
          url: `/${pages[i].slug}`,
          menus: menuId,
          menu_order: i + 1,
          type: 'post_type',
          type_label: 'Page',
          object: 'page',
          object_id: pages[i].id,
        },
        { headers: this.headers() }
      ).catch(() => null)
    }
  }

  // ── Theme Customization ────────────────────────────────────────────────────
  async applyThemeCustomization(theme: WebHopTheme): Promise<void> {
    logger.info('[WP] Applying theme customization…')

    // Inject custom CSS via WordPress API
    const customCss = `
/* WebHop Generated Theme CSS */
:root {
  --webhop-primary: ${theme.primaryColor};
  --webhop-secondary: ${theme.secondaryColor};
  --webhop-accent: ${theme.accentColor};
  --webhop-text: ${theme.textColor};
  --webhop-bg: ${theme.bgColor};
  --webhop-font-primary: '${theme.fontPrimary}', sans-serif;
  --webhop-font-secondary: '${theme.fontSecondary}', sans-serif;
  --webhop-radius: ${theme.borderRadius};
}

body {
  font-family: var(--webhop-font-secondary);
  color: var(--webhop-text);
  background-color: var(--webhop-bg);
  line-height: 1.7;
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--webhop-font-primary);
  font-weight: 700;
  color: ${theme.textColor};
}

a { color: var(--webhop-primary); }
a:hover { color: var(--webhop-accent); }

.wp-block-button__link {
  border-radius: var(--webhop-radius) !important;
  font-weight: 600 !important;
  transition: transform 0.15s ease, box-shadow 0.15s ease !important;
}

.wp-block-button__link:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.15);
}

/* Navigation */
.wp-block-navigation a {
  font-family: var(--webhop-font-primary);
  font-weight: 500;
}

/* Responsive */
@media (max-width: 768px) {
  h1 { font-size: 2rem !important; }
  h2 { font-size: 1.5rem !important; }
}
`

    await axios.post(
      `${this.baseUrl}/wp-json/wp/v2/global-styles/themes/${theme.themeName}`,
      { settings: { custom: { css: customCss } } },
      { headers: this.headers() }
    ).catch(() => {
      // Fallback: Use Additional CSS endpoint
      logger.warn('[WP] Global styles API not available, using additional CSS endpoint')
    })

    // Also set via customizer API
    await axios.post(
      `${this.baseUrl}/wp-json/wp/v2/settings`,
      { custom_css: customCss },
      { headers: this.headers() }
    ).catch(() => null)
  }

  // ── Plugin Installation ────────────────────────────────────────────────────
  async installEssentialPlugins(): Promise<string[]> {
    logger.info('[WP] Installing essential plugins…')

    const plugins = [
      'yoast-seo',           // SEO
      'contact-form-7',      // Contact forms
      'wp-smushit',          // Image optimization
      'wordfence',           // Security
      'wp-super-cache',      // Caching
    ]

    const installed: string[] = []

    for (const plugin of plugins) {
      try {
        await axios.post(
          `${this.baseUrl}/wp-json/wp/v2/plugins`,
          { slug: plugin, status: 'active' },
          { headers: this.headers() }
        )
        installed.push(plugin)
        logger.info(`[WP] Installed plugin: ${plugin}`)
      } catch {
        logger.warn(`[WP] Could not install plugin: ${plugin}`)
      }
    }

    return installed
  }

  // ── Homepage setup ────────────────────────────────────────────────────────
  async setHomepage(homePageId: number): Promise<void> {
    logger.info('[WP] Setting static homepage…')

    await axios.post(
      `${this.baseUrl}/wp-json/wp/v2/settings`,
      {
        show_on_front: 'page',
        page_on_front: homePageId,
      },
      { headers: this.headers() }
    )
  }

  // ── SEO Config ────────────────────────────────────────────────────────────
  async configureSEO(seo: SEOPackage, brand: BrandProfile): Promise<void> {
    logger.info('[WP] Configuring SEO settings…')

    // Yoast SEO options
    await axios.post(
      `${this.baseUrl}/wp-json/yoast/v1/configuration`,
      {
        company_name: brand.businessName,
        separator: ' | ',
        title_template: `%%title%% | ${brand.businessName}`,
        description_template: seo.metaDescription,
      },
      { headers: this.headers() }
    ).catch(() => logger.warn('[WP] Yoast SEO not available'))
  }

  // ── Get page count ────────────────────────────────────────────────────────
  async getPageCount(): Promise<number> {
    const res = await axios.get(`${this.baseUrl}/wp-json/wp/v2/pages?per_page=100`, {
      headers: this.headers(),
    })
    return res.data.length
  }
}
