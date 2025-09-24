import React from 'react'
import { useParams } from 'react-router-dom'
import { loadPublicShortlist } from '@/lib/api/shortlistShare'
import { PublicShortlistView } from '@/components/venue/PublicShortlistView'

type ShortlistRow = {
  id: string
  name: string
  venue_shortlist_items?: { venue_id: string }[]
}

export function PublicShortlistPage() {
  const { token } = useParams<{ token: string }>()
  const [data, setData] = React.useState<ShortlistRow | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let mounted = true
    ;(async () => {
      if (!token) {
        if (mounted) setError('No token provided')
        return
      }

      try {
        setLoading(true)
        const shortlist = await loadPublicShortlist(token)
        if (!mounted) return
        
        if (!shortlist) {
          setError('Shortlist not found or expired')
        } else {
          setData(shortlist)
        }
      } catch (e: any) {
        if (mounted) {
          setError(e?.message ?? 'Unable to load shortlist')
        }
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [token])

  const title = data?.name ? `${data.name} · Floq` : 'Floq shortlist'

  React.useEffect(() => {
    document.title = title
    
    // Set meta description
    const metaDescription = document.querySelector('meta[name="description"]')
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Shared venue shortlist')
    }
  }, [title])

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {loading && (
          <div className="opacity-80">Loading shortlist…</div>
        )}
        
        {!loading && error && (
          <div className="rounded-lg border border-white/15 bg-white/5 p-4 text-white/80">
            {error}
          </div>
        )}

        {!loading && data && (
          <PublicShortlistView
            id={data.id}
            name={data.name}
            venueIds={(data.venue_shortlist_items ?? []).map(i => i.venue_id)}
          />
        )}
      </div>
    </div>
  )
}