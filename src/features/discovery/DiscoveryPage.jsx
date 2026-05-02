// src/features/discovery/DiscoveryPage.jsx
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/shared/lib/supabase'
import { FollowButton } from '@/shared/ui/FollowButton'

const GENRES = ['Tous', 'Rap', 'R&B', 'Afro', 'Pop', 'Trap', 'Soul', 'Electronic', 'Jazz', 'Autre']

export function DiscoveryPage() {
  const navigate = useNavigate()
  const [search, setSearch]     = useState('')
  const [genre, setGenre]       = useState('Tous')
  const [artists, setArtists]   = useState([])
  const [rising, setRising]     = useState(null)
  const [topTracks, setTopTracks] = useState([])
  const [loading, setLoading]   = useState(true)

  const fetchArtists = useCallback(async () => {
    setLoading(true)
    try {
      // Artistes avec leur rôle
      let query = supabase
        .from('profiles')
        .select('*, user_roles!inner(role), artist_profiles(genres)')
        .eq('user_roles.role', 'artist')
        .is('suspended_at', null)

      if (search.trim()) query = query.ilike('username', `%${search.trim()}%`)

      const { data: allArtists } = await query.limit(60)
      let filtered = allArtists || []

      // Filtre genre côté client
      if (genre !== 'Tous') {
        filtered = filtered.filter(a =>
          a.artist_profiles?.genres?.includes(genre)
        )
      }

      setArtists(filtered)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [search, genre])

  useEffect(() => {
    const t = setTimeout(fetchArtists, 300)
    return () => clearTimeout(t)
  }, [fetchArtists])

  // Algo Étoile Montante : artiste avec plus de followers en 7 jours
  useEffect(() => {
    fetchRising()
    fetchTopTracks()
  }, [])

  async function fetchRising() {
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString()
      const { data: recentFollows } = await supabase
        .from('follows')
        .select('artist_id')
        .gte('created_at', sevenDaysAgo)

      if (!recentFollows?.length) return

      // Compte les follows par artiste
      const counts = {}
      recentFollows.forEach(f => {
        counts[f.artist_id] = (counts[f.artist_id] || 0) + 1
      })

      // Artiste avec le plus de nouveaux followers
      const topId = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0]
      if (!topId) return

      const { data: prof } = await supabase
        .from('profiles')
        .select('*, artist_profiles(genres)')
        .eq('id', topId)
        .single()

      if (prof) setRising({ ...prof, newFollowers: counts[topId] })
    } catch (e) {
      console.error('fetchRising:', e)
    }
  }

  async function fetchTopTracks() {
    try {
      const { data } = await supabase
        .from('tracks')
        .select('*, profiles(username, avatar_url)')
        .is('deleted_at', null)
        .order('plays', { ascending: false })
        .limit(5)
      setTopTracks(data || [])
    } catch (e) { console.error(e) }
  }

  function fmtTime(s) {
    if (!s) return ''
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
  }

  return (
    <div style={styles.page}>
      {/* Header sticky */}
      <div style={styles.header}>
        <h1 style={styles.pageTitle}>DECOUVERTE</h1>

        {/* Barre de recherche */}
        <div style={styles.searchBar}>
          <span style={styles.searchIcon}>🔍</span>
          <input
            style={styles.searchInput}
            placeholder="Cherche un artiste..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search.length > 0 && (
            <button style={styles.clearBtn} onClick={() => setSearch('')}>✕</button>
          )}
        </div>

        {/* Filtres genres */}
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

        {/* Étoile Montante */}
        {rising && !search && genre === 'Tous' && (
          <div style={styles.section}>
            <div style={styles.sectionTitle}>ETOILE MONTANTE DE LA SEMAINE</div>
            <div style={styles.risingCard} onClick={() => navigate(`/artist/${rising.id}`)}>
              <div style={styles.risingGlow} />
              <div style={styles.risingAvatar}>
                {rising.avatar_url
                  ? <img src={rising.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                  : <span style={{ fontSize: '32px' }}>🎤</span>}
              </div>
              <div style={styles.risingInfo}>
                <div style={styles.risingName}>{rising.username}</div>
                {rising.artist_profiles?.genres?.length > 0 && (
                  <div style={styles.risingGenres}>
                    {rising.artist_profiles.genres.slice(0, 3).map(g => (
                      <span key={g} style={styles.risingGenreTag}>{g}</span>
                    ))}
                  </div>
                )}
                <div style={styles.risingMeta}>
                  +{rising.newFollowers} abonné{rising.newFollowers > 1 ? 's' : ''} cette semaine 🔥
                </div>
              </div>
              <div onClick={e => e.stopPropagation()}>
                <FollowButton artistId={rising.id} size="sm" />
              </div>
            </div>
          </div>
        )}

        {/* Top 5 Tracks */}
        {topTracks.length > 0 && !search && genre === 'Tous' && (
          <div style={styles.section}>
            <div style={styles.sectionTitle}>TOP TRACKS DU MOMENT</div>
            {topTracks.map((track, i) => (
              <div key={track.id} style={styles.trackRow}>
                <span style={{ ...styles.trackRank, color: i < 3 ? '#00FF87' : '#444' }}>
                  {i + 1}
                </span>
                <div style={styles.trackThumb}>
                  {track.cover_url
                    ? <img src={track.cover_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                    : <span style={{ fontSize: '16px' }}>🎵</span>}
                </div>
                <div style={styles.trackInfo}>
                  <div style={styles.trackTitle}>{track.title}</div>
                  <div style={styles.trackMeta}>
                    {track.profiles?.username}
                    {track.duration ? ` · ${fmtTime(track.duration)}` : ''}
                  </div>
                </div>
                <div style={styles.trackStats}>
                  <span style={styles.trackStat}>▶ {track.plays || 0}</span>
                  <span style={styles.trackStat}>♥ {track.likes || 0}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Grille artistes */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>
            {search ? `RESULTATS POUR "${search.toUpperCase()}"` : 'TOUS LES ARTISTES'}
            {!loading && <span style={styles.artistCount}> {artists.length}</span>}
          </div>

          {loading ? (
            <div style={styles.grid}>
              {[...Array(6)].map((_, i) => <div key={i} style={styles.skeleton} />)}
            </div>
          ) : artists.length === 0 ? (
            <div style={styles.empty}>
              <span style={{ fontSize: '36px' }}>🎤</span>
              <p>Aucun artiste trouvé</p>
              {genre !== 'Tous' && (
                <button style={styles.resetBtn} onClick={() => setGenre('Tous')}>
                  Voir tous les genres
                </button>
              )}
            </div>
          ) : (
            <div style={styles.grid}>
              {artists.map(artist => (
                <div
                  key={artist.id}
                  style={styles.artistCard}
                  onClick={() => navigate(`/artist/${artist.id}`)}
                >
                  <div style={styles.artistAvatar}>
                    {artist.avatar_url
                      ? <img src={artist.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                      : <span style={{ fontSize: '28px' }}>🎤</span>}
                  </div>
                  <div style={styles.artistName}>{artist.username}</div>
                  {artist.artist_profiles?.genres?.length > 0 && (
                    <div style={styles.artistGenre}>
                      {artist.artist_profiles.genres[0]}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', background: '#090909', paddingBottom: '100px' },
  header: { padding: '56px 16px 12px', position: 'sticky', top: 0, background: 'rgba(9,9,9,0.97)', backdropFilter: 'blur(16px)', zIndex: 10, display: 'flex', flexDirection: 'column', gap: '10px' },
  pageTitle: { fontFamily: "'Space Grotesk',sans-serif", fontSize: '24px', fontWeight: 700, color: '#fff', margin: 0, letterSpacing: '0.1em' },
  searchBar: { display: 'flex', alignItems: 'center', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '10px 14px', gap: '8px' },
  searchIcon: { fontSize: '15px', flexShrink: 0 },
  searchInput: { background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: '14px', fontFamily: "'Inter',sans-serif", flex: 1 },
  clearBtn: { background: 'none', border: 'none', color: '#555', fontSize: '14px', cursor: 'pointer', padding: '0 2px', flexShrink: 0 },
  genres: { display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' },
  chip: { background: '#1a1a1a', border: '1px solid #222', borderRadius: '20px', padding: '6px 14px', color: '#666', fontSize: '12px', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 },
  chipActive: { background: 'rgba(0,255,135,0.1)', border: '1px solid #00FF87', color: '#00FF87' },
  content: { padding: '16px' },
  section: { marginBottom: '28px' },
  sectionTitle: { fontFamily: "'Space Grotesk',sans-serif", fontSize: '11px', fontWeight: 700, color: '#555', letterSpacing: '0.15em', marginBottom: '12px' },
  artistCount: { color: '#333' },

  // Étoile montante
  risingCard: { display: 'flex', alignItems: 'center', gap: '14px', background: 'linear-gradient(135deg, rgba(0,255,135,0.07), rgba(123,47,190,0.07))', border: '1px solid rgba(0,255,135,0.2)', borderRadius: '16px', padding: '16px', cursor: 'pointer', position: 'relative', overflow: 'hidden' },
  risingGlow: { position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', background: 'radial-gradient(circle, rgba(0,255,135,0.15), transparent)', borderRadius: '50%', pointerEvents: 'none' },
  risingAvatar: { width: '60px', height: '60px', borderRadius: '50%', background: '#1a1a1a', border: '2px solid #00FF87', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 16px rgba(0,255,135,0.3)' },
  risingInfo: { flex: 1, minWidth: 0 },
  risingName: { fontFamily: "'Space Grotesk',sans-serif", fontSize: '17px', fontWeight: 700, color: '#fff' },
  risingGenres: { display: 'flex', gap: '5px', marginTop: '4px', flexWrap: 'wrap' },
  risingGenreTag: { background: 'rgba(123,47,190,0.25)', borderRadius: '10px', padding: '1px 8px', fontSize: '10px', color: '#a87bd4', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600 },
  risingMeta: { fontFamily: "'Inter',sans-serif", fontSize: '12px', color: '#00FF87', marginTop: '5px' },

  // Top tracks
  trackRow: { display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 6px', borderRadius: '10px', marginBottom: '4px' },
  trackRank: { fontFamily: "'Space Grotesk',sans-serif", fontSize: '13px', fontWeight: 700, width: '20px', textAlign: 'center', flexShrink: 0 },
  trackThumb: { width: '42px', height: '42px', borderRadius: '8px', background: '#1a1a1a', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  trackInfo: { flex: 1, minWidth: 0 },
  trackTitle: { fontFamily: "'Space Grotesk',sans-serif", fontSize: '13px', fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  trackMeta: { fontFamily: "'Inter',sans-serif", fontSize: '11px', color: '#555', marginTop: '2px' },
  trackStats: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' },
  trackStat: { fontFamily: "'Inter',sans-serif", fontSize: '10px', color: '#444' },

  // Grille artistes
  grid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' },
  artistCard: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '7px', cursor: 'pointer', padding: '14px 8px', borderRadius: '14px', background: '#111', border: '1px solid #1a1a1a', transition: 'border-color 0.2s' },
  artistAvatar: { width: '64px', height: '64px', borderRadius: '50%', background: '#1a1a1a', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #222' },
  artistName: { fontFamily: "'Inter',sans-serif", fontSize: '12px', color: '#ccc', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', fontWeight: 600 },
  artistGenre: { fontFamily: "'Inter',sans-serif", fontSize: '10px', color: '#555', textAlign: 'center' },

  skeleton: { height: '120px', borderRadius: '14px', background: '#111', animation: 'pulse 1.5s ease-in-out infinite' },
  empty: { textAlign: 'center', color: '#555', fontFamily: "'Inter',sans-serif", fontSize: '14px', padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' },
  resetBtn: { background: 'rgba(0,255,135,0.08)', border: '1px solid rgba(0,255,135,0.2)', borderRadius: '20px', padding: '8px 16px', color: '#00FF87', fontSize: '12px', fontFamily: "'Space Grotesk',sans-serif", cursor: 'pointer' },
}
