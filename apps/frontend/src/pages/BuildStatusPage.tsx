import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  CheckCircle2,
  Clock,
  XCircle,
  ArrowLeft,
  ExternalLink,
  Download,
  Globe,
  Palette,
  FileText,
  Search,
  Zap,
  Loader2,
  Copy,
} from 'lucide-react'
import { buildApi } from '../lib/api'
import type { BuildJob, BuildStage } from '../types'
import { formatDistanceToNow, format } from 'date-fns'
import toast from 'react-hot-toast'

const STAGE_ICONS: Record<string, React.ElementType> = {
  scraping:         Globe,
  analyzing:        Search,
  generating_brand: Palette,
  building_theme:   Palette,
  creating_pages:   FileText,
  optimizing_seo:   Search,
  finalizing:       Zap,
  completed:        CheckCircle2,
}

function StageRow({ stage, isLast }: { stage: BuildStage; isLast: boolean }) {
  const Icon = STAGE_ICONS[stage.id] || Clock

  return (
    <div className="flex gap-4">
      {/* Icon + connector */}
      <div className="flex flex-col items-center">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 border transition-all ${
          stage.status === 'done'
            ? 'bg-lime/15 border-lime/30 text-lime'
            : stage.status === 'active'
            ? 'bg-blue-500/15 border-blue-500/30 text-blue-400 animate-pulse'
            : stage.status === 'error'
            ? 'bg-red-500/15 border-red-500/30 text-red-400'
            : 'bg-white/5 border-white/10 text-white/20'
        }`}>
          {stage.status === 'active' ? (
            <Loader2 size={16} className="animate-spin" />
          ) : stage.status === 'done' ? (
            <CheckCircle2 size={16} />
          ) : stage.status === 'error' ? (
            <XCircle size={16} />
          ) : (
            <Icon size={16} />
          )}
        </div>
        {!isLast && (
          <div className={`w-0.5 flex-1 mt-1 mb-1 rounded-full min-h-[20px] transition-all ${
            stage.status === 'done' ? 'bg-lime/30' : 'bg-white/5'
          }`} />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 pb-5">
        <div className="flex items-center justify-between">
          <p className={`text-sm font-medium transition-all ${
            stage.status === 'done'    ? 'text-white'
            : stage.status === 'active' ? 'text-blue-300'
            : stage.status === 'error'  ? 'text-red-400'
            : 'text-white/30'
          }`}>
            {stage.label}
          </p>
          {stage.completedAt && (
            <span className="text-xs text-white/25">
              {format(new Date(stage.completedAt), 'HH:mm:ss')}
            </span>
          )}
        </div>
        <p className="text-xs text-white/35 mt-0.5">{stage.description}</p>
        {stage.status === 'active' && stage.progress > 0 && (
          <div className="progress-bar mt-2 w-full max-w-[200px]">
            <div className="progress-bar-fill" style={{ width: `${stage.progress}%` }} />
          </div>
        )}
      </div>
    </div>
  )
}

export default function BuildStatusPage() {
  const { id } = useParams<{ id: string }>()
  const [copyDone, setCopyDone] = useState(false)

  const { data: job, error } = useQuery<BuildJob>({
    queryKey: ['build', id],
    queryFn: () => buildApi.get(id!),
    refetchInterval: (data) => {
      if (data?.status === 'completed' || data?.status === 'failed') return false
      return 3000
    },
    enabled: !!id,
  })

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url)
    setCopyDone(true)
    toast.success('Copied!')
    setTimeout(() => setCopyDone(false), 2000)
  }

  const isActive = job && job.status !== 'completed' && job.status !== 'failed'
  const isComplete = job?.status === 'completed'
  const isFailed = job?.status === 'failed'

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-400 mb-4">Failed to load build job</p>
        <Link to="/history" className="btn-secondary inline-flex">
          <ArrowLeft size={15} /> Back to History
        </Link>
      </div>
    )
  }

  if (!job) {
    return (
      <div className="p-8 text-center">
        <Loader2 className="animate-spin text-lime mx-auto mb-3" size={28} />
        <p className="text-white/40 text-sm">Loading build…</p>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* Back */}
      <Link to="/history" className="btn-ghost -ml-2 mb-6 inline-flex">
        <ArrowLeft size={15} /> Back
      </Link>

      {/* Header card */}
      <div className={`card mb-6 border-glow ${isComplete ? 'border-lime/20' : isFailed ? 'border-red-500/20' : ''}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {isActive && <div className="status-dot-active" />}
              {isComplete && <CheckCircle2 size={14} className="text-lime" />}
              {isFailed && <XCircle size={14} className="text-red-400" />}
              <span className="text-xs text-white/40 font-mono">#{id?.slice(0, 8)}</span>
            </div>

            <h1 className="font-display font-bold text-xl text-white mb-1 truncate">
              {job.input.businessName || job.input.url || 'Building website…'}
            </h1>

            <p className="text-sm text-white/40">
              {job.mode === 'scrape' ? '🌐 URL Import' : '⚡ Custom Build'} ·{' '}
              Started {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
            </p>
          </div>

          {/* Overall progress */}
          <div className="text-right flex-shrink-0">
            <div className={`text-3xl font-display font-bold mb-0.5 ${
              isComplete ? 'text-lime' : isFailed ? 'text-red-400' : 'text-white'
            }`}>
              {isFailed ? '—' : `${job.progress}%`}
            </div>
            <div className="text-xs text-white/30">
              {isComplete ? 'Complete' : isFailed ? 'Failed' : 'In progress'}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="progress-bar mt-4">
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${
              isFailed ? 'bg-red-500' : 'bg-lime'
            }`}
            style={{ width: `${isFailed ? 100 : job.progress}%` }}
          />
        </div>
      </div>

      {/* Result panel (when complete) */}
      {isComplete && job.result && (
        <div className="card mb-6 border border-lime/15 bg-lime/4">
          <h2 className="font-semibold text-white mb-4">🎉 Build Complete</h2>
          <div className="space-y-3">
            {/* Preview URL */}
            <div className="flex items-center gap-2 bg-black/20 rounded-[8px] px-3 py-2.5">
              <Globe size={14} className="text-lime flex-shrink-0" />
              <span className="text-white/60 text-xs">Preview:</span>
              <a
                href={job.result.previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-lime text-sm font-medium hover:underline flex-1 truncate"
              >
                {job.result.previewUrl}
              </a>
              <button onClick={() => copyUrl(job.result!.previewUrl)} className="text-white/30 hover:text-lime ml-auto flex-shrink-0">
                <Copy size={13} />
              </button>
              <a href={job.result.previewUrl} target="_blank" rel="noopener noreferrer" className="text-white/30 hover:text-lime">
                <ExternalLink size={13} />
              </a>
            </div>

            {/* Admin URL */}
            <div className="flex items-center gap-2 bg-black/20 rounded-[8px] px-3 py-2.5">
              <Zap size={14} className="text-white/40 flex-shrink-0" />
              <span className="text-white/60 text-xs">WP Admin:</span>
              <a
                href={job.result.adminUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/70 text-sm hover:text-white flex-1 truncate"
              >
                {job.result.adminUrl}
              </a>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-2 pt-1">
              {[
                { label: 'Pages', value: job.result.stats.pagesCreated },
                { label: 'Plugins', value: job.result.stats.pluginsInstalled },
                { label: 'Build time', value: `${Math.round(job.result.stats.timeSeconds / 60)}m` },
                { label: 'Images', value: job.result.stats.imagesOptimized },
              ].map(({ label, value }) => (
                <div key={label} className="text-center">
                  <div className="text-lg font-bold text-lime">{value}</div>
                  <div className="text-[10px] text-white/30 uppercase tracking-wide">{label}</div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <a
                href={job.result.previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary flex-1 justify-center"
              >
                <ExternalLink size={15} /> View Site
              </a>
              <button
                onClick={() => buildApi.download(job.id)}
                className="btn-secondary flex-1 justify-center"
              >
                <Download size={15} /> Export ZIP
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error panel */}
      {isFailed && (
        <div className="card mb-6 border border-red-500/20 bg-red-500/4">
          <div className="flex items-start gap-3">
            <XCircle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="font-semibold text-red-400 mb-1">Build Failed</h2>
              <p className="text-sm text-white/50">{job.error || 'An unexpected error occurred during the build.'}</p>
              <Link to="/build" className="btn-danger inline-flex mt-3 text-sm">
                Try Again
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Stages */}
      <div className="card">
        <h2 className="font-semibold text-white mb-5">Build Pipeline</h2>
        <div>
          {job.stages.map((stage, i) => (
            <StageRow key={stage.id} stage={stage} isLast={i === job.stages.length - 1} />
          ))}
        </div>
      </div>

      {/* Brand result */}
      {isComplete && job.result?.brand && (
        <div className="card mt-4">
          <h2 className="font-semibold text-white mb-4">Generated Brand</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-white/40 mb-2 block">Color Palette</label>
              <div className="flex gap-2">
                {[
                  job.result.brand.primaryColor,
                  job.result.brand.secondaryColor,
                  job.result.brand.accentColor,
                ].map((c) => (
                  <div key={c} className="flex flex-col items-center gap-1">
                    <div className="w-10 h-10 rounded-[8px] border border-white/10" style={{ background: c }} />
                    <span className="text-[10px] text-white/30 font-mono">{c}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-white/40 mb-2 block">Typography</label>
              <p className="text-sm text-white font-medium">{job.result.brand.fontPrimary}</p>
              <p className="text-xs text-white/40">{job.result.brand.fontSecondary}</p>
              {job.result.brand.tagline && (
                <p className="text-xs text-lime/70 mt-2 italic">"{job.result.brand.tagline}"</p>
              )}
            </div>
          </div>
          {job.result.seo && (
            <div className="mt-4 pt-4 border-t border-white/8">
              <label className="text-xs text-white/40 mb-2 block">SEO Meta</label>
              <p className="text-sm text-white font-medium">{job.result.seo.metaTitle}</p>
              <p className="text-xs text-white/50 mt-1">{job.result.seo.metaDescription}</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {job.result.seo.keywords?.slice(0, 6).map((kw) => (
                  <span key={kw} className="badge-gray text-[11px]">{kw}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
