// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'user'
  plan: 'starter' | 'pro' | 'agency'
  avatar?: string
  createdAt: string
}

export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
}

// ─── Build Jobs ───────────────────────────────────────────────────────────────
export type BuildMode = 'scrape' | 'prompt'
export type BuildStatus =
  | 'queued'
  | 'scraping'
  | 'analyzing'
  | 'generating_brand'
  | 'building_theme'
  | 'creating_pages'
  | 'optimizing_seo'
  | 'finalizing'
  | 'completed'
  | 'failed'

export interface BuildStage {
  id: string
  label: string
  description: string
  status: 'pending' | 'active' | 'done' | 'error'
  progress: number
  startedAt?: string
  completedAt?: string
}

export interface BuildJob {
  id: string
  userId: string
  mode: BuildMode
  status: BuildStatus
  progress: number
  input: BuildInput
  result?: BuildResult
  stages: BuildStage[]
  error?: string
  createdAt: string
  updatedAt: string
  completedAt?: string
  wordpressUrl?: string
  previewUrl?: string
}

export interface BuildInput {
  // Scrape mode
  url?: string

  // Prompt mode
  businessName?: string
  businessType?: string
  description?: string
  targetAudience?: string
  keyServices?: string[]
  location?: string
  phone?: string
  email?: string
  logoUrl?: string

  // Shared
  style?: WebsiteStyle
  pages?: string[]
  colorPreference?: string
  customInstructions?: string
}

export type WebsiteStyle =
  | 'modern-minimal'
  | 'bold-creative'
  | 'corporate-professional'
  | 'warm-friendly'
  | 'luxury-premium'
  | 'tech-forward'

export interface BuildResult {
  wordpressId: string
  wordpressUrl: string
  adminUrl: string
  previewUrl: string
  downloadUrl?: string
  brand: BrandResult
  pages: PageResult[]
  seo: SEOResult
  stats: BuildStats
}

export interface BrandResult {
  primaryColor: string
  secondaryColor: string
  accentColor: string
  fontPrimary: string
  fontSecondary: string
  logoUrl?: string
  tagline?: string
  tone: string
}

export interface PageResult {
  slug: string
  title: string
  template: string
  wordpressId: number
}

export interface SEOResult {
  metaTitle: string
  metaDescription: string
  keywords: string[]
  schemaType: string
  sitemapUrl: string
}

export interface BuildStats {
  pagesCreated: number
  imagesOptimized: number
  pluginsInstalled: number
  timeSeconds: number
}

// ─── Business Scraped Data ────────────────────────────────────────────────────
export interface ScrapedData {
  url: string
  businessName?: string
  tagline?: string
  description?: string
  logo?: string
  phone?: string
  email?: string
  address?: string
  socialLinks?: Record<string, string>
  colors?: string[]
  fonts?: string[]
  images?: string[]
  pages?: { title: string; url: string }[]
  services?: string[]
  testimonials?: string[]
}

// ─── WordPress Site ───────────────────────────────────────────────────────────
export interface WordPressSite {
  id: string
  buildJobId: string
  userId: string
  url: string
  adminUrl: string
  title: string
  status: 'active' | 'building' | 'archived'
  thumbnail?: string
  pages: number
  plugins: number
  theme: string
  createdAt: string
  lastModified: string
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────
export interface DashboardStats {
  totalBuilds: number
  completedBuilds: number
  activeJobs: number
  sitesDelivered: number
  avgBuildTime: number
  buildsByDay: { date: string; count: number }[]
}

// ─── Notifications ────────────────────────────────────────────────────────────
export interface Notification {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  title: string
  message: string
  read: boolean
  createdAt: string
  buildJobId?: string
}
