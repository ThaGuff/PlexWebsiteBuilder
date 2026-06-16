import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { buildApi } from '../lib/api'
import type { BuildJob } from '../types'
import { Globe, Zap, ArrowRight, Trash2, Loader2, PlusCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'

const STATUS_STYLES: Record<string, string> = {
  queued:            'badge-gray',
  scraping:          'badge-blue',
  analyzing:         'badge-blue',
  generating_brand:  'badge-blue',
  building_theme:    'badge-orange',
  creating_pages:    'badge-orange',
  optimizing_seo:    'badge-blue',
  finalizing:        'badge-lime',
  completed:         'badge-green',
  failed:            'badge-red',
}

const STATUS_LABELS: Record<string, string> = {
  queued:            'Queued',
  scraping:          'Scraping',
  analyzing:         'Analyzing',
  generating_brand:  'Branding',
  building_theme:    'Theming',
  creating_pages:    'Building',
  optimizing_seo:    'SEO',
  finalizing:        'Finalizing',
  completed:         'Complete',
  failed:            'Failed',
}

export default function HistoryPage() {
  const [page, setPage] = useState(1)
  const [deleting, setDeleting] = useState<string | null>(null)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['builds', page],
    queryFn: () => buildApi.list(page, 20),
    refetchInterval: 15000,
  })

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault()
    if (!confirm('Delete this build? This cannot be undone.')) return
    setDeleting(id)
    try {
      await buildApi.delete(id)
      toast.success('Build deleted')
      refetch()
    } catch {
      toast.error('Failed to delete')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display font-bold text-2xl text-white mb-1">Build History</h1>
          <p className="text-white/40 text-sm">All your website builds in one place</p>
        </div>
        <Link to="/build" className="btn-primary">
          <PlusCircle size={16} /> New Build
        </Link>
      </div>

      {isLoading ? (
        <div className="text-center py-16">
          <Loader2 className="animate-spin text-lime mx-auto mb-3" size={28} />
          <p className="text-white/40 text-sm">Loading builds…</p>
        </div>
      ) : !data?.builds?.length ? (
        <div className="card text-center py-16">
          <p className="text-white/40 mb-4">No builds yet</p>
          <Link to="/build" className="btn-primary inline-flex">
            <PlusCircle size={15} /> Start your first build
          </Link>
        </div>
      ) : (
        <>
          {/* Table */}
          <div className="card overflow-hidden p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/8">
                  <th className="text-left text-xs text-white/30 font-semibold uppercase tracking-wider px-5 py-3.5">Site</th>
                  <th className="text-left text-xs text-white/30 font-semibold uppercase tracking-wider px-4 py-3.5 hidden sm:table-cell">Mode</th>
                  <th className="text-left text-xs text-white/30 font-semibold uppercase tracking-wider px-4 py-3.5">Status</th>
                  <th className="text-left text-xs text-white/30 font-semibold uppercase tracking-wider px-4 py-3.5 hidden md:table-cell">Progress</th>
                  <th className="text-left text-xs text-white/30 font-semibold uppercase tracking-wider px-4 py-3.5 hidden lg:table-cell">Created</th>
                  <th className="text-right text-xs text-white/30 font-semibold uppercase tracking-wider px-5 py-3.5">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.builds.map((job: BuildJob) => (
                  <tr key={job.id} className="border-b border-white/5 hover:bg-white/2 transition-colors group">
                    <td className="px-5 py-4">
                      <Link to={`/builds/${job.id}`} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-[8px] bg-white/5 border border-white/8 flex items-center justify-center flex-shrink-0">
                          {job.mode === 'scrape'
                            ? <Globe size={14} className="text-blue-400" />
                            : <Zap size={14} className="text-lime" />
                          }
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate max-w-[200px] group-hover:text-lime transition-colors">
                            {job.input.businessName || job.input.url || 'Unnamed'}
                          </p>
                          <p className="text-xs text-white/30 truncate max-w-[200px]">
                            {job.input.businessType || job.input.url}
                          </p>
                        </div>
                      </Link>
                    </td>

                    <td className="px-4 py-4 hidden sm:table-cell">
                      <span className="text-xs text-white/40 capitalize">
                        {job.mode === 'scrape' ? 'URL Import' : 'Custom'}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      <span className={`badge text-xs ${STATUS_STYLES[job.status] || 'badge-gray'}`}>
                        {STATUS_LABELS[job.status] || job.status}
                      </span>
                    </td>

                    <td className="px-4 py-4 hidden md:table-cell">
                      <div className="flex items-center gap-2">
                        <div className="progress-bar w-20">
                          <div className="progress-bar-fill" style={{ width: `${job.progress}%` }} />
                        </div>
                        <span className="text-xs text-white/30">{job.progress}%</span>
                      </div>
                    </td>

                    <td className="px-4 py-4 hidden lg:table-cell">
                      <span className="text-xs text-white/35">
                        {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {job.status === 'completed' && job.result?.previewUrl && (
                          <a
                            href={job.result.previewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-white/30 hover:text-lime transition-colors"
                            title="View site"
                          >
                            <ArrowRight size={14} />
                          </a>
                        )}
                        <button
                          onClick={(e) => handleDelete(job.id, e)}
                          disabled={deleting === job.id}
                          className="p-1.5 text-white/20 hover:text-red-400 transition-colors disabled:opacity-40"
                          title="Delete"
                        >
                          {deleting === job.id
                            ? <Loader2 size={14} className="animate-spin" />
                            : <Trash2 size={14} />
                          }
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data.total > 20 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-xs text-white/30">
                Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, data.total)} of {data.total}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-30"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={page * 20 >= data.total}
                  className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-30"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
