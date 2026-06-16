import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { sitesApi } from '../lib/api'
import type { WordPressSite } from '../types'
import { Globe, ExternalLink, Download, Trash2, PlusCircle, Loader2, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { useState } from 'react'

export default function SitesPage() {
  const [deleting, setDeleting] = useState<string | null>(null)
  const { data: sites, isLoading, refetch } = useQuery<WordPressSite[]>({
    queryKey: ['sites'],
    queryFn: sitesApi.list,
  })

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this site? The WordPress instance will be shut down.')) return
    setDeleting(id)
    try {
      await sitesApi.delete(id)
      toast.success('Site removed')
      refetch()
    } catch {
      toast.error('Failed to remove site')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display font-bold text-2xl text-white mb-1">My Sites</h1>
          <p className="text-white/40 text-sm">All WordPress sites built with WebHop</p>
        </div>
        <Link to="/build" className="btn-primary">
          <PlusCircle size={16} /> New Site
        </Link>
      </div>

      {isLoading ? (
        <div className="text-center py-16">
          <Loader2 className="animate-spin text-lime mx-auto mb-3" size={28} />
          <p className="text-white/40 text-sm">Loading sites…</p>
        </div>
      ) : !sites?.length ? (
        <div className="card text-center py-16">
          <Globe size={36} className="text-white/15 mx-auto mb-4" />
          <p className="text-white/50 mb-2 font-medium">No sites yet</p>
          <p className="text-white/30 text-sm mb-5">Build your first premium WordPress site</p>
          <Link to="/build" className="btn-primary inline-flex">
            <PlusCircle size={15} /> Build a Site
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sites.map((site) => (
            <div key={site.id} className="card-hover flex flex-col">
              {/* Thumbnail */}
              <div className="bg-[#161616] border border-white/6 rounded-[10px] mb-4 overflow-hidden aspect-video relative">
                {site.thumbnail ? (
                  <img src={site.thumbnail} alt={site.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Globe size={28} className="text-white/10" />
                  </div>
                )}
                {/* Status overlay */}
                <div className="absolute top-2.5 right-2.5">
                  <span className={`badge text-[10px] ${
                    site.status === 'active' ? 'badge-green' : site.status === 'building' ? 'badge-blue' : 'badge-gray'
                  }`}>
                    {site.status}
                  </span>
                </div>
              </div>

              {/* Info */}
              <div className="flex-1">
                <h3 className="font-semibold text-white mb-1 truncate">{site.title}</h3>
                <a
                  href={site.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-lime/70 hover:text-lime flex items-center gap-1 mb-3 truncate"
                >
                  {site.url} <ExternalLink size={10} />
                </a>

                {/* Stats */}
                <div className="flex items-center gap-4 text-xs text-white/35 mb-3">
                  <span>{site.pages} pages</span>
                  <span>{site.plugins} plugins</span>
                  <span className="flex items-center gap-1">
                    <Calendar size={10} />
                    {format(new Date(site.createdAt), 'MMM d, yyyy')}
                  </span>
                </div>

                <div className="text-xs text-white/25 truncate">Theme: {site.theme}</div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-4 pt-4 border-t border-white/8">
                <a
                  href={site.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary flex-1 justify-center text-xs py-2"
                >
                  <ExternalLink size={13} /> View
                </a>
                <a
                  href={site.adminUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-ghost text-xs py-2 px-3"
                  title="WP Admin"
                >
                  <Globe size={13} />
                </a>
                <button
                  onClick={() => sitesApi.export(site.id).then(() => toast.success('Export started'))}
                  className="btn-ghost text-xs py-2 px-3"
                  title="Export ZIP"
                >
                  <Download size={13} />
                </button>
                <button
                  onClick={() => handleDelete(site.id)}
                  disabled={deleting === site.id}
                  className="p-2 text-white/20 hover:text-red-400 transition-colors disabled:opacity-40"
                  title="Delete"
                >
                  {deleting === site.id
                    ? <Loader2 size={13} className="animate-spin" />
                    : <Trash2 size={13} />
                  }
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
