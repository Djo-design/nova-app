// src/features/artist/ArtistDashboardPage.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/shared/lib/supabase'
import { useAuth } from '@/features/auth/AuthContext'

function fmtNum(n) {
  if (!n) return '0'
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

function fmtDate(d) {
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

export function ArtistDashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [stats, setStats] = useState({
    totalPlays: 0, totalViews: 0, totalLikes: 0,
    followers: 0, tracks: 0, videos: 0,
    playsThisWeek: 0, followersThisWeek: 0,
  })
  const [topTracks, setTopTracks] = useState([])
  const [topVideos, setTopVideos] = useState([])
  const [recentPlays, setRecentPlays] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (user) fetchDashboard() }, [user])

  async function fetchDashboard() {
    setLoading(true)
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString()

    const [
      { data: trks },
      { data: vids },
      { count: followers },
      { count: followersThisWeek },
      { data: playsRecent },
    ] = await Promise.all([
      supabase.from('tracks').select('*').eq('artist_id', user.id).is('deleted_at', null).order('plays', { ascending: false }),
      supabase.from('videos').select('*').eq('artist_id', user.id).is('deleted_at', null).order('views', { ascending: false }),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('artist_id', user.id),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('artist_id', user.id).gte('created_at', weekAgo),
      supabase.from('plays')
        .select('played_at, tracks(title)')
        .in('track_id', (trks || []).map(t => t.id))
        .gte('played_at', weekAgo)
        .order('played_at', { ascending: false })
        .limit(50),
    ])

    const totalPlays = (trks || []).reduce((a, t) => a + (t.plays || 0), 0)
    const totalViews = (vids || []).reduce((a, v) => a + (v.views || 0), 0)
    const totalLikes = (trks || []).reduce((a, t) => a + (t.likes || 0), 0)
      + (vids || []).reduce((a, v) => a + (v.likes || 0), 0)

    setStats({
      totalPlays, totalViews, totalLikes,
      followers: followers || 0,
      tracks: (trks || []).length,
      videos: (vids || []).length,
      playsThisWeek: (playsRecent || []).length,
      followersThisWeek: followersThisWeek || 0,
    })
    setTopTracks((trks || []).slice(0, 5))
    setTopVideos((vids || []).slice(0, 5))
    setRecentPlays(playsRecent || [])
    setLoading(false)
  }

  // Calcul graphique simple écoutes par jour (7 jours)
  function buildDailyChart() {
    const days = {}
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000)
      const key = d.toISOString().slice(0, 10)
      days[key] = 0
    }
    recentPlays.forEach(p => {
      const key = p.played_at?.slice(0, 10)
      if (key && days[key] !== undefined) days[key]++
    })
    return Object.entries(days).map(([date, count]) => ({ date, count }))
  }

  const chartData = buildDailyChart()
  const chartMax = Math.max(...chartData.map(d => d.count), 1)

  if (loading) return (
    <div style={styles.page}>
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate('/profile')}>←</button>
        <h1 style={styles.title}>Dashboard</h1>
        <div style={{ width: 36 }} />
      </div>
      <div style={{ padding: '20px' }}>
        {[...Array(4)].map((_, i) => <div key={i} style={styles.skeleton} />)}
      </div>
    </div>
  )

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate('/profile')}>←</button>
        <h1 style={styles.title}>Dashboard</h1>
        <button style={styles.editBtn} onClick={() => navigate('/artist/edit')}>✏️</button>
      </div>

      <div style={styles.content}>

        {/* KPIs principaux */}
        <div style={styles.kpiGrid}>
          {[
            { label: 'Écoutes totales', value: fmtNum(stats.totalPlays), icon: '▶', sub: `+${stats.playsThisWeek} cette semaine` },
            { label: 'Abonnés', value: fmtNum(stats.followers), icon: '👥', sub: `+${stats.followersThisWeek} cette semaine` },
            { label: 'Vues vidéos', value: fmtNum(stats.totalViews), icon: '👁', sub: `${stats.videos} vidéo(s)` },
            { label: 'Likes reçus', value: fmtNum(stats.totalLikes), icon: '♥', sub: `${stats.tracks} track(s)` },
          ].map(kpi => (
            <div key={kpi.label} style={styles.kpiCard}>
              <span style={styles.kpiIcon}>{kpi.icon}</span>
              <span style={styles.kpiValue}>{kpi.value}</span>
              <span style={styles.kpiLabel}>{kpi.label}</span>
              <span style={styles.kpiSub}>{kpi.sub}</span>
            </div>
          ))}
        </div>

        {/* Graphique écoutes 7 jours */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <span style={styles.cardTitle}>ÉCOUTES — 7 DERNIERS JOURS</span>
            <span style={styles.cardTotal}>{stats.playsThisWeek} total</span>
          </div>
          <div style={styles.chart}>
            {chartData.map((d, i) => (
              <div key={i} style={styles.chartCol}>
                <div style={styles.chartBarWrap}>
                  <div style={{
                    ...styles.chartBar,
                    height: `${Math.max(4, (d.count / chartMax) * 100)}%`,
                    background: d.count > 0
                      ? 'linear-gradient(to top, #00FF87, #7B2FBE)'
                      : '#1a1a1a',
                  }} />
                </div>
                <span style={styles.chartLabel}>{fmtDate(d.date).split(' ')[0]}</span>
                {d.count > 0 && <span style={styles.chartCount}>{d.count}</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Top tracks */}
        {topTracks.length > 0 && (
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <span style={styles.cardTitle}>TOP TRACKS</span>
            </div>
            {topTracks.map((track, i) => (
              <div key={track.id} style={styles.rankRow}>
                <span style={styles.rankNum}>{i + 1}</span>
                <div style={styles.rankCover}>
                  {track.cover_url
                    ? <img src={track.cover_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                    : <span>🎵</span>}
                </div>
                <div style={styles.rankInfo}>
                  <div style={styles.rankTitle}>{track.title}</div>
                  <div style={styles.rankMeta}>{track.genre || 'Sans genre'}</div>
                </div>
                <div style={styles.rankStats}>
                  <span style={styles.rankStat}>▶ {fmtNum(track.plays)}</span>
                  <span style={styles.rankStat}>♥ {fmtNum(track.likes)}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Top vidéos */}
        {topVideos.length > 0 && (
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <span style={styles.cardTitle}>TOP VIDÉOS</span>
            </div>
            {topVideos.map((video, i) => (
              <div key={video.id} style={styles.rankRow}>
                <span style={styles.rankNum}>{i + 1}</span>
                <div style={styles.rankCover}>
                  {video.thumb_url
                    ? <img src={video.thumb_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                    : <span>📹</span>}
                </div>
                <div style={styles.rankInfo}>
                  <div style={styles.rankTitle}>{video.title}</div>
                  <div style={styles.rankMeta}>{video.genre || 'Vidéo'}</div>
                </div>
                <div style={styles.rankStats}>
                  <span style={styles.rankStat}>👁 {fmtNum(video.views)}</span>
                  <span style={styles.rankStat}>♥ {fmtNum(video.likes)}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Actions rapides */}
        <div style={styles.quickActions}>
          <div style={styles.cardTitle}>ACTIONS RAPIDES</div>
          <div style={styles.actionGrid}>
            <button style={styles.actionBtn} onClick={() => navigate('/upload')}>
              <span style={{ fontSize: '24px' }}>⬆️</span>
              <span>Uploader</span>
            </button>
            <button style={styles.actionBtn} onClick={() => navigate('/artist/edit')}>
              <span style={{ fontSize: '24px' }}>✏️</span>
              <span>Modifier profil</span>
            </button>
            <button style={styles.actionBtn} onClick={() => navigate(`/artist/${user?.id}`)}>
              <span style={{ fontSize: '24px' }}>👤</span>
              <span>Voir ma page</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', background: '#090909', paddingBottom: '100px' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '56px 16px 16px', position: 'sticky', top: 0, background: 'rgba(9,9,9,0.95)', backdropFilter: 'blur(12px)', zIndex: 10 },
  backBtn: { background: 'none', border: 'none', color: '#fff', fontSize: '22px', cursor: 'pointer', padding: '4px 8px' },
  title: { fontFamily: "'Space Grotesk',sans-serif", fontSize: '20px', fontWeight: 700, color: '#fff', margin: 0 },
  editBtn: { background: 'rgba(0,255,135,0.08)', border: '1px solid rgba(0,255,135,0.2)', borderRadius: '10px', padding: '6px 12px', color: '#00FF87', fontSize: '13px', cursor: 'pointer' },
  content: { padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' },
  skeleton: { height: '80px', borderRadius: '14px', background: '#111', marginBottom: '12px', animation: 'pulse 1.5s ease-in-out infinite' },

  // KPIs
  kpiGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' },
  kpiCard: { background: '#111', border: '1px solid #1a1a1a', borderRadius: '14px', padding: '16px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' },
  kpiIcon: { fontSize: '20px' },
  kpiValue: { fontFamily: "'Space Grotesk',sans-serif", fontSize: '26px', fontWeight: 700, color: '#fff' },
  kpiLabel: { fontFamily: "'Inter',sans-serif", fontSize: '11px', color: '#666', textAlign: 'center' },
  kpiSub: { fontFamily: "'Inter',sans-serif", fontSize: '10px', color: '#00FF87', textAlign: 'center' },

  // Card
  card: { background: '#111', border: '1px solid #1a1a1a', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontFamily: "'Space Grotesk',sans-serif", fontSize: '11px', fontWeight: 700, color: '#555', letterSpacing: '0.12em' },
  cardTotal: { fontFamily: "'Inter',sans-serif", fontSize: '12px', color: '#00FF87' },

  // Chart
  chart: { display: 'flex', alignItems: 'flex-end', gap: '6px', height: '100px' },
  chartCol: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', height: '100%' },
  chartBarWrap: { flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end' },
  chartBar: { width: '100%', borderRadius: '4px 4px 0 0', transition: 'height 0.5s ease', minHeight: '4px' },
  chartLabel: { fontFamily: "'Inter',sans-serif", fontSize: '9px', color: '#444' },
  chartCount: { fontFamily: "'Inter',sans-serif", fontSize: '9px', color: '#00FF87' },

  // Ranks
  rankRow: { display: 'flex', alignItems: 'center', gap: '10px' },
  rankNum: { fontFamily: "'Space Grotesk',sans-serif", fontSize: '13px', color: '#444', width: '16px', flexShrink: 0 },
  rankCover: { width: '40px', height: '40px', borderRadius: '8px', background: '#1a1a1a', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' },
  rankInfo: { flex: 1, minWidth: 0 },
  rankTitle: { fontFamily: "'Space Grotesk',sans-serif", fontSize: '13px', fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  rankMeta: { fontFamily: "'Inter',sans-serif", fontSize: '11px', color: '#555', marginTop: '2px' },
  rankStats: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px', flexShrink: 0 },
  rankStat: { fontFamily: "'Inter',sans-serif", fontSize: '11px', color: '#555' },

  // Quick actions
  quickActions: { background: '#111', border: '1px solid #1a1a1a', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' },
  actionGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' },
  actionBtn: { background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '14px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'pointer', color: '#ccc', fontSize: '12px', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600 },
}
