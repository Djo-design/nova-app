// src/features/discovery/DiscoveryPage.jsx
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/shared/lib/supabase'

const GENRES = ['Tous', 'Rap', 'R&B', 'Afro', 'Pop', 'Trap', 'Soul', 'Electronic', 'Jazz']

export function DiscoveryPage() {
  const [search, setSearch] = useState('')
  const [genre, setGenre] = useState('Tous')
  const [artists, setArtists] = useState([])
  const [rising, setRising] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const fetchArtists = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('profiles')
      .select('*, user_roles!inner(role)')
      .eq('user_roles.role', 'artist')

    if (search) query = query.ilike('username', `%${search}%`)
    const { data } = await query.limit(40)
    setArtists(data || [])
    setLoading(false)
  }, [search, genre])

  useEffect(() => {
    const t = setTimeout(fetchArtists, 300)
    return () => clearTimeout(t)
  }, [fetchArtists])

  useEffect(() => {
    // Étoile montante : artiste avec le plus de followers récents
    async function fetchRising() {
      const { data } = await supabase
        .from('follows')
        .select('artist_id, profiles(username, avatar_url)')
        .gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString())
        .limit(100)

      if (!data?.length) return
      const counts = {}
      data.forEach(f => {
        if (!counts[f.artist_id]) counts[f.artist_id] = { count: 0, profile: f.profiles }
        counts[f.artist_id].count++
      })
      const top = Object.entries(counts).sort((a, b) => b[1].count - a[1].count)[0]
      if (top) setRising({ id: top[0], ...top[1].profile, newFollowers: top[1].count })
    }
    fetchRising()
  }, [])

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.pageTitle}>DÉCOUVERTE</h1>

        {/* Search */}
        <div style={styles.searchBar}>
          <span style={styles.searchIcon}>🔍</span>
          <input
            style={styles.searchInput}
            placeholder="Cherche un artiste..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Genres */}
        <div style={styles.genres}>
          {GENRES.map(g => (
            <button
              key={g}
              style={{ ...styles.chip, ...(genre === g ? styles.chipActive : {}) }}
              onClick={() => setGenre(g)}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      <div style={styles.content}>
        {/* Étoile montante */}
        {rising && (
          <div style={styles.risingSection}>
            <div style={styles.sectionLabel}>⭐ ÉTOILE MONTANTE</div>
            <div style={styles.risingCard}>
              <div style={styles.risingAvatar}>
                {rising.avatar_url
                  ? <img src={rising.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                  : <span style={{ fontSize: '32px' }}>🎤</span>}
              </div>
              <div>
                <div style={styles.risingName}>{rising.username}</div>
                <div style={styles.risingMeta}>+{rising.newFollowers} followers cette semaine 🔥</div>
              </div>
            </div>
          </div>
        )}

        {/* Grille artistes */}
        <div style={styles.sectionLabel}>ARTISTES</div>
        {loading ? (
          <div style={styles.grid}>
            {[...Array(8)].map((_, i) => (
              <div key={i} style={styles.skeletonCard} />
            ))}
          </div>
        ) : artists.length === 0 ? (
          <div style={styles.empty}>Aucun artiste trouvé</div>
        ) : (
          <div style={styles.grid}>
            {artists.map(artist => (
              <div key={artist.id} style={styles.artistCard} onClick={() => navigate(`/artist/${artist.id}`)}>
                <div style={styles.artistAvatar}>
                  {artist.avatar_url
                    ? <img src={artist.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                    : <span style={{ fontSize: '28px' }}>🎤</span>}
                </div>
                <div style={styles.artistName}>{artist.username}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', background: '#090909', paddingBottom: '80px' },
  header: { padding: '56px 16px 0', position: 'sticky', top: 0, background: 'rgba(9,9,9,0.95)', backdropFilter: 'blur(12px)', zIndex: 10, paddingBottom: '12px' },
  pageTitle: { fontFamily: "'Space Grotesk',sans-serif", fontSize: '24px', fontWeight: 700, color: '#fff', margin: '0 0 16px', letterSpacing: '0.1em' },
  searchBar: { display: 'flex', alignItems: 'center', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '10px 14px', gap: '8px', marginBottom: '12px' },
  searchIcon: { fontSize: '16px' },
  searchInput: { background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: '14px', fontFamily: "'Inter',sans-serif", flex: 1 },
  genres: { display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' },
  chip: { background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '20px', padding: '5px 14px', color: '#888', fontSize: '12px', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 },
  chipActive: { background: 'rgba(0,255,135,0.1)', border: '1px solid #00FF87', color: '#00FF87' },
  content: { padding: '16px' },
  risingSection: { marginBottom: '24px' },
  sectionLabel: { fontFamily: "'Space Grotesk',sans-serif", fontSize: '11px', fontWeight: 700, color: '#555', letterSpacing: '0.15em', marginBottom: '12px' },
  risingCard: { display: 'flex', alignItems: 'center', gap: '16px', background: 'linear-gradient(135deg, rgba(0,255,135,0.08), rgba(123,47,190,0.08))', border: '1px solid rgba(0,255,135,0.2)', borderRadius: '14px', padding: '16px' },
  risingAvatar: { width: '56px', height: '56px', borderRadius: '50%', background: '#222', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #00FF87', flexShrink: 0 },
  risingName: { fontFamily: "'Space Grotesk',sans-serif", fontSize: '16px', fontWeight: 700, color: '#fff' },
  risingMeta: { fontFamily: "'Inter',sans-serif", fontSize: '12px', color: '#00FF87', marginTop: '4px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' },
  artistCard: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '12px 8px', borderRadius: '12px', background: '#111', border: '1px solid #1a1a1a' },
  artistAvatar: { width: '64px', height: '64px', borderRadius: '50%', background: '#1a1a1a', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  artistName: { fontFamily: "'Inter',sans-serif", fontSize: '12px', color: '#ccc', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' },
  skeletonCard: { height: '120px', borderRadius: '12px', background: '#111', animation: 'pulse 1.5s ease-in-out infinite' },
  empty: { textAlign: 'center', color: '#555', fontFamily: "'Inter',sans-serif", padding: '40px', fontSize: '14px' },
}
