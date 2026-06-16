import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Globe,
  Zap,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
  Plus,
} from 'lucide-react'
import { buildApi } from '../lib/api'
import type { WebsiteStyle } from '../types'
import toast from 'react-hot-toast'

// ─── Schemas ───────────────────────────────────────────────────────────────────
const scrapeSchema = z.object({
  url: z.string().url('Enter a valid URL (include https://)'),
  style: z.enum(['modern-minimal','bold-creative','corporate-professional','warm-friendly','luxury-premium','tech-forward']).optional(),
  customInstructions: z.string().optional(),
})

const promptSchema = z.object({
  businessName: z.string().min(2, 'Business name required'),
  businessType: z.string().min(2, 'Business type required'),
  description: z.string().min(20, 'Please describe the business in at least 20 characters'),
  location: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),
  targetAudience: z.string().optional(),
  style: z.enum(['modern-minimal','bold-creative','corporate-professional','warm-friendly','luxury-premium','tech-forward']).optional(),
  customInstructions: z.string().optional(),
})

type ScrapeForm = z.infer<typeof scrapeSchema>
type PromptForm = z.infer<typeof promptSchema>

// ─── Style options ─────────────────────────────────────────────────────────────
const STYLES: { value: WebsiteStyle; label: string; description: string; emoji: string }[] = [
  { value: 'modern-minimal',       label: 'Modern Minimal',       description: 'Clean, whitespace-driven, sophisticated', emoji: '✦' },
  { value: 'bold-creative',        label: 'Bold & Creative',       description: 'High-contrast, expressive, memorable',    emoji: '⚡' },
  { value: 'corporate-professional',label: 'Corporate Pro',        description: 'Trust-building, structured, authoritative', emoji: '🏛' },
  { value: 'warm-friendly',        label: 'Warm & Friendly',      description: 'Approachable, inviting, community-focused', emoji: '☀' },
  { value: 'luxury-premium',       label: 'Luxury Premium',       description: 'Elevated, exclusive, refined details',     emoji: '◆' },
  { value: 'tech-forward',         label: 'Tech Forward',         description: 'Cutting-edge, data-driven, futuristic',    emoji: '◈' },
]

const DEFAULT_PAGES = ['Home', 'About', 'Services', 'Contact']
const AVAILABLE_PAGES = ['Home', 'About', 'Services', 'Portfolio', 'Testimonials', 'Blog', 'Contact', 'FAQ', 'Pricing', 'Team']

// ─── Scrape preview component ─────────────────────────────────────────────────
function ScrapePreview({ url, onClose }: { url: string; onClose: () => void }) {
  const [preview, setPreview] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const run = async () => {
      try {
        const data = await buildApi.scrapePreview(url)
        setPreview(data)
      } catch {
        setError('Could not fetch site preview')
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [url])

  return (
    <div className="bg-[#1A1A1A] border border-white/10 rounded-[12px] p-4 mt-3">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-white/50 uppercase tracking-wide">Site Preview</span>
        <button onClick={onClose} className="text-white/30 hover:text-white/60">
          <X size={14} />
        </button>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-white/40 text-sm py-2">
          <Loader2 size={14} className="animate-spin" />
          Fetching site data…
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-red-400 text-sm py-2">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {preview && (
        <div className="space-y-2">
          {preview.businessName && (
            <div className="flex items-center gap-2">
              <span className="text-white/30 text-xs w-24">Business:</span>
              <span className="text-white text-sm font-medium">{String(preview.businessName)}</span>
            </div>
          )}
          {preview.description && (
            <div className="flex items-start gap-2">
              <span className="text-white/30 text-xs w-24 pt-0.5">Description:</span>
              <span className="text-white/60 text-xs leading-relaxed line-clamp-2">{String(preview.description)}</span>
            </div>
          )}
          {Array.isArray(preview.colors) && preview.colors.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-white/30 text-xs w-24">Colors:</span>
              <div className="flex gap-1">
                {(preview.colors as string[]).slice(0, 5).map((c) => (
                  <div key={c} className="w-5 h-5 rounded-full border border-white/15" style={{ background: c }} title={c} />
                ))}
              </div>
            </div>
          )}
          <div className="mt-2 pt-2 border-t border-white/8">
            <span className="text-lime text-xs font-medium flex items-center gap-1">
              <CheckCircle2 size={12} /> Site detected — ready to rebuild as a premium WordPress site
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main build page ───────────────────────────────────────────────────────────
export default function BuildPage() {
  const [searchParams] = useSearchParams()
  const [mode, setMode] = useState<'scrape' | 'prompt'>(
    (searchParams.get('mode') as 'scrape' | 'prompt') || 'scrape'
  )
  const [step, setStep] = useState(1)
  const [selectedPages, setSelectedPages] = useState<string[]>(DEFAULT_PAGES)
  const [showPreview, setShowPreview] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()

  const scrapeForm = useForm<ScrapeForm>({ resolver: zodResolver(scrapeSchema) })
  const promptForm = useForm<PromptForm>({ resolver: zodResolver(promptSchema) })

  const watchUrl = scrapeForm.watch('url')

  const togglePage = (page: string) => {
    setSelectedPages((prev) =>
      prev.includes(page) ? prev.filter((p) => p !== page) : [...prev, page]
    )
  }

  const handleScrapeSubmit = async (data: ScrapeForm) => {
    setSubmitting(true)
    try {
      const res = await buildApi.create({
        mode: 'scrape',
        ...data,
        pages: selectedPages,
      })
      toast.success('Build started! Monitoring your site…')
      navigate(`/builds/${res.jobId}`)
    } catch {
      toast.error('Failed to start build — please try again')
    } finally {
      setSubmitting(false)
    }
  }

  const handlePromptSubmit = async (data: PromptForm) => {
    setSubmitting(true)
    try {
      const res = await buildApi.create({
        mode: 'prompt',
        ...data,
        pages: selectedPages,
      })
      toast.success('Build started! Monitoring your site…')
      navigate(`/builds/${res.jobId}`)
    } catch {
      toast.error('Failed to start build — please try again')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display font-bold text-2xl text-white mb-1">New Build</h1>
          <p className="text-white/40 text-sm">Configure and launch your AI website build</p>
        </div>

        {/* Mode switcher */}
        <div className="bg-[#1A1A1A] border border-white/8 rounded-[14px] p-1 flex gap-1 mb-6">
          <button
            onClick={() => { setMode('scrape'); setStep(1) }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[10px] text-sm font-medium transition-all ${
              mode === 'scrape'
                ? 'bg-white/8 text-white border border-white/10'
                : 'text-white/40 hover:text-white/60'
            }`}
          >
            <Globe size={16} /> Import Existing Site
          </button>
          <button
            onClick={() => { setMode('prompt'); setStep(1) }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[10px] text-sm font-medium transition-all ${
              mode === 'prompt'
                ? 'bg-lime/10 text-lime border border-lime/20'
                : 'text-white/40 hover:text-white/60'
            }`}
          >
            <Zap size={16} /> Build from Scratch
          </button>
        </div>

        {/* ── SCRAPE MODE ── */}
        {mode === 'scrape' && (
          <form onSubmit={scrapeForm.handleSubmit(handleScrapeSubmit)} className="space-y-5">
            {/* URL input */}
            <div className="card">
              <label className="text-sm font-semibold text-white mb-3 block">
                Website URL to Import
              </label>
              <div className="relative">
                <Globe size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  {...scrapeForm.register('url')}
                  type="url"
                  placeholder="https://example-business.com"
                  className="input pl-10"
                  onBlur={() => {
                    if (watchUrl && watchUrl.startsWith('http')) setShowPreview(true)
                  }}
                />
              </div>
              {scrapeForm.formState.errors.url && (
                <p className="text-red-400 text-xs mt-1.5">{scrapeForm.formState.errors.url.message}</p>
              )}
              {showPreview && watchUrl && (
                <ScrapePreview url={watchUrl} onClose={() => setShowPreview(false)} />
              )}
              <p className="text-white/25 text-xs mt-2">
                WebHop will extract brand colors, fonts, content, and structure from this site
              </p>
            </div>

            {/* Style + pages (collapsible) */}
            <StyleAndPagesSection
              pages={selectedPages}
              onTogglePage={togglePage}
              styleValue={scrapeForm.watch('style')}
              onStyleChange={(v) => scrapeForm.setValue('style', v as WebsiteStyle)}
            />

            {/* Custom instructions */}
            <div className="card">
              <label className="text-sm font-semibold text-white mb-2 block">
                Custom Instructions <span className="text-white/30 font-normal">(optional)</span>
              </label>
              <textarea
                {...scrapeForm.register('customInstructions')}
                placeholder="e.g. 'Emphasize the HVAC repair services, use dark mode, add a prominent call button'"
                className="textarea"
                rows={3}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full justify-center py-3.5 text-base"
            >
              {submitting ? (
                <><Loader2 size={18} className="animate-spin" /> Starting build…</>
              ) : (
                <>Launch Build <ArrowRight size={18} /></>
              )}
            </button>
          </form>
        )}

        {/* ── PROMPT MODE ── */}
        {mode === 'prompt' && (
          <form onSubmit={promptForm.handleSubmit(handlePromptSubmit)} className="space-y-5">
            {/* Step 1: Business basics */}
            <div className="card">
              <h3 className="text-sm font-semibold text-white mb-4">Business Information</h3>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-xs text-white/50 mb-1.5 block">Business Name *</label>
                  <input
                    {...promptForm.register('businessName')}
                    placeholder="Acme HVAC Co."
                    className="input text-sm"
                  />
                  {promptForm.formState.errors.businessName && (
                    <p className="text-red-400 text-xs mt-1">{promptForm.formState.errors.businessName.message}</p>
                  )}
                </div>
                <div>
                  <label className="text-xs text-white/50 mb-1.5 block">Business Type *</label>
                  <input
                    {...promptForm.register('businessType')}
                    placeholder="HVAC Contractor"
                    className="input text-sm"
                  />
                  {promptForm.formState.errors.businessType && (
                    <p className="text-red-400 text-xs mt-1">{promptForm.formState.errors.businessType.message}</p>
                  )}
                </div>
              </div>

              <div className="mb-3">
                <label className="text-xs text-white/50 mb-1.5 block">Business Description *</label>
                <textarea
                  {...promptForm.register('description')}
                  placeholder="Describe the business, what they do, their unique value, any specific services or products you want highlighted…"
                  className="textarea text-sm"
                  rows={4}
                />
                {promptForm.formState.errors.description && (
                  <p className="text-red-400 text-xs mt-1">{promptForm.formState.errors.description.message}</p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-white/50 mb-1.5 block">Location</label>
                  <input
                    {...promptForm.register('location')}
                    placeholder="Huntsville, AL"
                    className="input text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/50 mb-1.5 block">Phone</label>
                  <input
                    {...promptForm.register('phone')}
                    placeholder="(256) 555-0100"
                    className="input text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/50 mb-1.5 block">Email</label>
                  <input
                    {...promptForm.register('email')}
                    type="email"
                    placeholder="info@business.com"
                    className="input text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Target audience */}
            <div className="card">
              <label className="text-sm font-semibold text-white mb-2 block">Target Audience</label>
              <input
                {...promptForm.register('targetAudience')}
                placeholder="e.g. Homeowners in North Alabama, 35–65, mid-to-high income"
                className="input text-sm"
              />
            </div>

            {/* Style + pages */}
            <StyleAndPagesSection
              pages={selectedPages}
              onTogglePage={togglePage}
              styleValue={promptForm.watch('style')}
              onStyleChange={(v) => promptForm.setValue('style', v as WebsiteStyle)}
            />

            {/* Custom instructions */}
            <div className="card">
              <label className="text-sm font-semibold text-white mb-2 block">
                Additional Instructions <span className="text-white/30 font-normal">(optional)</span>
              </label>
              <textarea
                {...promptForm.register('customInstructions')}
                placeholder="Any specific colors, features, competitors to outrank, tone of voice, integrations, etc."
                className="textarea text-sm"
                rows={3}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full justify-center py-3.5 text-base"
            >
              {submitting ? (
                <><Loader2 size={18} className="animate-spin" /> Starting build…</>
              ) : (
                <>Launch Build <ArrowRight size={18} /></>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

// ─── Style + Pages section ────────────────────────────────────────────────────
function StyleAndPagesSection({
  pages,
  onTogglePage,
  styleValue,
  onStyleChange,
}: {
  pages: string[]
  onTogglePage: (p: string) => void
  styleValue?: string
  onStyleChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="card">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between text-sm font-semibold text-white"
      >
        <span>Site Style & Pages</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/30 font-normal">{pages.length} pages · {styleValue || 'Auto style'}</span>
          {open ? <ChevronUp size={15} className="text-white/40" /> : <ChevronDown size={15} className="text-white/40" />}
        </div>
      </button>

      {open && (
        <div className="mt-4 space-y-5">
          {/* Style picker */}
          <div>
            <label className="text-xs text-white/50 mb-2.5 block font-medium">Visual Style</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {STYLES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => onStyleChange(s.value)}
                  className={`text-left p-3 rounded-[10px] border transition-all ${
                    styleValue === s.value
                      ? 'bg-lime/10 border-lime/30 text-white'
                      : 'bg-white/3 border-white/8 text-white/50 hover:border-white/15 hover:text-white/70'
                  }`}
                >
                  <div className="text-base mb-1">{s.emoji}</div>
                  <div className="text-xs font-semibold">{s.label}</div>
                  <div className="text-[10px] opacity-60 mt-0.5">{s.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Page selector */}
          <div>
            <label className="text-xs text-white/50 mb-2.5 block font-medium">Pages to Include</label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_PAGES.map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => onTogglePage(page)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    pages.includes(page)
                      ? 'bg-lime/12 border-lime/25 text-lime'
                      : 'bg-white/3 border-white/10 text-white/40 hover:border-white/20 hover:text-white/60'
                  }`}
                >
                  {pages.includes(page) ? <CheckCircle2 size={11} /> : <Plus size={11} />}
                  {page}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
