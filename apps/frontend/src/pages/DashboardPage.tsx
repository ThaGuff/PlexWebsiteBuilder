import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  Globe,
  Zap,
  Clock,
  CheckCircle2,
  PlusCircle,
  ArrowRight,
  TrendingUp,
  AlertCircle,
} from 'lucide-react'
import { dashboardApi, buildApi } from '../lib/api'
import { useAuthStore } from '../store/auth'
import type { BuildJob } from '../types'
import { formatDistanceToNow } from 'date-fns'

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  queued:            { label: 'Queued',      color: 'text-white/40',  bg: 'bg-white/5' },
  scraping:          { label: 'Scraping',    color: 'text-blue-400',  bg: 'bg-blue-500/10' },
  analyzing:         { label: 'Analyzing',   color: 'text-purple-400', bg: 'bg-purple-500/10' },
  generating_brand:  { label: 'Branding',    color: 'text-pink-400',  bg: 'bg-pink-500/10' },
  building_theme:    { label: 'Theming',     color: 'text-orange-400', bg: 'bg-orange-500/10' },
  creating_pages:    { label: 'Pages',       color: 'text-cyan-400',  bg: 'bg-cyan-500/10' },
  optimizing_seo:    { label: 'SEO',         color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
  finalizing:        { label: 'Finalizing',  color: 'text-lime',      bg: 'bg-lime/10' },
  completed:         { label: 'Complete',    color: 'text-green-400', bg: 'bg-green-500/10' },
  failed:            { label: 'Failed',      color: 'text-red-400',   bg: 'bg-red-500/10' },
}

function StatCard({ icon: Icon, label, value, sub, color = 'text-lime' }: {
  icon: React.ElementType
  label: string
  value: string | number
  sub?: string
  color?: string
}) {
  return (
    <div className="card">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-[10px] bg-lime/8 border border-lime/15 flex items-center justify-center ${color}`}>
          <Icon size={20} />
        </div>
      </div>
      <div className="text-3xl font-display font-bold text-white mb-0.5">{value}</div>
      <div className="text-sm text-white/50">{label}</div>
      {sub && <div className="text-xs text-white/25 mt-1">{sub}</div>}
    </div>
  )
}

function BuildRow({ job }: { job: BuildJob }) {
  const status = STATUS_CONFIG[job.status] || STATUS_CONFIG.queued
  const name = job.input.businessName || job.input.url || 'Unnamed build'

  return (
    <Link
      to={`/builds/${job.id}`}
      className="flex items-center gap-4 px-4 py-3.5 hover:bg-white/3 rounded-[10px] transition-colors group"
    >
      {/* Icon */}
      <div className="w-9 h-9 rounded-[8px] bg-white/5 border border-white/8 flex items-center justify-center flex-shrink-0">
        <Globe size={16} className="text-white/40" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{name}</p>
        <p className="text-xs text-white/35 mt-0.5">
          {job.mode === 'scrape' ? 'URL import' : 'Custom prompt'} ·{' '}
          {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
        </p>
      </div>

      {/* Progress */}
      {job.status !== 'completed' && job.status !== 'failed' && (
        <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
          <div className="w-24 progress-bar">
            <div className="progress-bar-fill" style={{ width: `${job.progress}%` }} />
          </div>
          <span className="text-xs text-white/40">{job.progress}%</span>
        </div>
      )}

      {/* Status badge */}
      <span className={`badge text-xs px-2.5 py-1 rounded-full ${status.bg} ${status.color} flex-shrink-0`}>
        {status.label}
      </span>

      <ArrowRight size={14} className="text-white/20 group-hover:text-white/50 transition-colors flex-shrink-0" />
    </Link>
  )
}

export default function DashboardPage() {
  const { user } = useAuthStore()

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: dashboardApi.stats,
  })

  const { data: recentBuilds } = useQuery({
    queryKey: ['recent-builds'],
    queryFn: () => buildApi.list(1, 8),
    refetchInterval: 10000,
  })

  const hourOfDay = new Date().getHours()
  const greeting = hourOfDay < 12 ? 'Good morning' : hourOfDay < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display font-bold text-2xl text-white mb-1">
            {greeting}, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-white/40 text-sm">
            Your website-building command center
          </p>
        </div>
        <Link to="/build" className="btn-primary">
          <PlusCircle size={16} /> New Build
        </Link>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={Zap}
          label="Total Builds"
          value={stats?.totalBuilds ?? '—'}
          sub="All time"
        />
        <StatCard
          icon={CheckCircle2}
          label="Completed"
          value={stats?.completedBuilds ?? '—'}
          sub="Successfully built"
          color="text-green-400"
        />
        <StatCard
          icon={TrendingUp}
          label="Active Jobs"
          value={stats?.activeJobs ?? 0}
          sub="In progress now"
          color="text-blue-400"
        />
        <StatCard
          icon={Clock}
          label="Avg Build Time"
          value={stats?.avgBuildTime ? `${Math.round(stats.avgBuildTime / 60)}m` : '—'}
          sub="Per site"
          color="text-orange-400"
        />
      </div>

      {/* Quick start */}
      <div className="grid lg:grid-cols-2 gap-4 mb-8">
        <Link
          to="/build?mode=scrape"
          className="card-hover flex gap-4 items-start group"
        >
          <div className="w-12 h-12 rounded-[12px] bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
            <Globe size={22} className="text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white mb-1 group-hover:text-lime transition-colors">
              Import Existing Site
            </h3>
            <p className="text-sm text-white/40 leading-relaxed">
              Paste a URL and WebHop scrapes the brand, content, and structure — then rebuilds it as a premium WordPress site.
            </p>
          </div>
        </Link>

        <Link
          to="/build?mode=prompt"
          className="card-hover flex gap-4 items-start group"
        >
          <div className="w-12 h-12 rounded-[12px] bg-lime/10 border border-lime/20 flex items-center justify-center flex-shrink-0">
            <Zap size={22} className="text-lime" />
          </div>
          <div>
            <h3 className="font-semibold text-white mb-1 group-hover:text-lime transition-colors">
              Build from Description
            </h3>
            <p className="text-sm text-white/40 leading-relaxed">
              Describe the business or paste an MVP brief — WebHop crafts a full site from scratch with custom branding.
            </p>
          </div>
        </Link>
      </div>

      {/* Recent builds */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-white">Recent Builds</h2>
          <Link to="/history" className="text-xs text-white/40 hover:text-lime flex items-center gap-1 transition-colors">
            View all <ArrowRight size={12} />
          </Link>
        </div>

        {!recentBuilds?.builds?.length ? (
          <div className="py-12 text-center">
            <div className="w-14 h-14 rounded-full bg-lime/8 border border-lime/15 flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={24} className="text-lime/60" />
            </div>
            <p className="text-white/40 text-sm mb-4">No builds yet</p>
            <Link to="/build" className="btn-primary inline-flex">
              <PlusCircle size={15} /> Start your first build
            </Link>
          </div>
        ) : (
          <div className="-mx-4">
            {recentBuilds.builds.map((job: BuildJob) => (
              <BuildRow key={job.id} job={job} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
