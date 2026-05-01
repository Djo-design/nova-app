// src/features/artist/DashboardPage.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/shared/lib/supabase'
import { useAuth } from '@/features/auth/AuthContext'

function StatCard({ icon, label, value, color = '#00FF87' }) {
  return (
    <div style={{ ...styles.statCard, borderColor: color + '22' }}>
      <span style={{ fontSize: '22px' }}>{icon}</span>
      <div style={{ ...styles.statNum, color }}>{value ?? 0}</div>
      <div style={styles.statLabel}>{label}</div>
    </div>
  )
}

function fmtTime(s) {
  if (!s) return ''
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
}

export function DashboardPage() {
  const { user, isArtist } = useAuth()
  const navigate = useNavigate()

  const [tracks, setTracks]         = useState([])
  const [videos, setVideos]         = useState([])
  const [followersCount, setFollowers] = useState(0)
  const [loading, setLoading]       = useState(true)
  const [activeTab, setActiveTab]   = useState('tracks')
  const [deleting, setDeleting]     = useState(null)

  useEffect(() => {
    if (!user || !isArtist) return
    fetchAll()
  }, [user, isArtist])

  async function fetchAll() {
    setLoading(true)
    const [
      { data: trks },
      { data: vids },
      { count: followers },
    ] = await Promise.all([
      supabase.from('tracks').select('*').eq('artist_id', user.id).is('deleted_at', null).order('created_at', { ascending: false }),
      supabase.from('videos').select('*').eq('artist_id', user.id).is('deleted_at', null).order('created_at', { ascending: false }),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('artist_id', user.id),
    ])
    setTracks(trks || [])
    setVideos(vids || [])
    setFollowers(followers || 0)
    setLoading(false)
  }

  async function deleteTrack(id) {
    if (!window.confirm('Supprimer définitivement cette track ?')) return
    setDeleting(id)
    const { error } = await supabase
      .from('tracks')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('artist_id', user.id) // sécurité : seulement ses propres tracks
    if (!error) setTracks(prev => prev.filter(t => t.id !== id))
    setDeleting(null)
  }

  async function deleteVideo(id) {
    if (!window.confirm('Supprimer définitivement cette vidéo ?')) return
    setDeleting(id)
    const { error } = await supabase
      .from('videos')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('artist_id', user.id)
    if (!error) setVideos(prev => prev.filter(v => v.id !== id))
    setDeleting(null)
  }

  if (!isArtist) return (
    <div style={styles.center}>
      <p style={{ color: '#888', fontFamily: "'Inter',sans-serif" }}>Accès réservé aux artistes</p>
      <button style={styles.btn} onClick={() => navigate('/become-artist')}>Devenir artiste</button>
    </div>
  )

  const totalPlays  = tracks.reduce((s, t) => s + (t.plays || 0), 0)
  const totalLikes  = tracks.reduce((s, t) => s + (t.likes || 0), 0)
  const totalViews  = videos.reduce((s, v) => s + (v.views || 0), 0)
  const topTrack    = [...tracks].sort((a, b) => (b.plays || 0) - (a.plays || 0))[0]
  const topVideo    = [...videos].sort((a, b) => (b.views || 0) - (a.views || 0))[0]

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <button style={styles.back} onClick={() => navigate(-1)}>←</button>
        <h1 style={styles.title}>DASHBOARD</h1>
        <button style={styles.editBtn} onClick={() => navigate('/profile/edit')}>✏️</button>
      </div>

      {loading ? (
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[...Array(4)].map((_, i) => <div key={i} style={styles.skeleton} />)}
        </div>
      ) : (
        <>
          {/* Stats globales */}
          <div style={styles.statsGrid}>
            <StatCard icon="👥" label="Abonnés"    value={followersCount} color="#00FF87" />
            <StatCard icon="▶"  label="Écoutes"    value={totalPlays}     color="#00FF87" />
            <StatCard icon="♥"  label="Likes"      value={totalLikes}     color="#ff6b6b" />
            <StatCard icon="👁" label="Vues vidéo" value={totalViews}     color="#7B2FBE" />
          </div>

          {/* Top contenu */}
          {(topTrack || topVideo) && (
            <div style={styles.section}>
              <div style={styles.sectionTitle}>⭐ TOP CONTENU</div>
              {topTrack && (
                <div style={styles.topCard}>
                  <div style={styles.topThumb}>
                    {topTrack.cover_url ? <img src={topTrack.cover_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : '🎵'}
                  </div>
                  <div style={styles.topInfo}>
                    <div style={styles.topBadge}>🎵 TOP TRACK</div>
                    <div style={styles.topTitle}>{topTrack.title}</div>
                    <div style={styles.topMeta}>▶ {topTrack.plays || 0} écoutes · ♥ {topTrack.likes || 0}</div>
                  </div>
                </div>
              )}
              {topVideo && (
                <div style={{ ...styles.topCard, marginTop: '8px' }}>
                  <div style={styles.topThumb}>
                    {topVideo.thumb_url ? <img src={topVideo.thumb_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : '📹'}
                  </div>
                  <div style={styles.topInfo}>
                    <div style={{ ...styles.topBadge, background: 'rgba(123,47,190,0.15)', color: '#a87bd4' }}>📹 TOP VIDÉO</div>
                    <div style={styles.topTitle}>{topVideo.title}</div>
                    <div style={styles.topMeta}>👁 {topVideo.views || 0} vues · ♥ {topVideo.likes || 0}</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions rapides */}
          <div style={styles.section}>
            <div style={styles.quickActions}>
              <button style={styles.quickBtn} onClick={() => navigate('/upload')}>
                <span style={{ fontSize: '22px' }}>⬆</span>
                <span style={styles.quickLabel}>Uploader</span>
              </button>
              <button style={styles.quickBtn} onClick={() => navigate(`/artist/${user.id}`)}>
                <span style={{ fontSize: '22px' }}>👤</span>
                <span style={styles.quickLabel}>Mon profil</span>
              </button>
              <button style={styles.quickBtn} onClick={() => navigate('/profile/edit')}>
                <span style={{ fontSize: '22px' }}>✏️</span>
                <span style={styles.quickLabel}>Modifier</span>
              </button>
            </div>
          </div>

          {/* Gestion contenu */}
          <div style={styles.section}>
            <div style={styles.tabRow}>
              <button style={{ ...styles.tab, ...(activeTab === 'tracks' ? styles.tabActive : {}) }} onClick={() => setActiveTab('tracks')}>
                🎵 Tracks ({tracks.length})
              </button>
              <button style={{ ...styles.tab, ...(activeTab === 'videos' ? styles.tabActive : {}) }} onClick={() => setActiveTab('videos')}>
                📹 Vidéos ({videos.length})
              </button>
            </div>

            {activeTab === 'tracks' && (
              tracks.length === 0
                ? <div style={styles.empty}>Aucune track — <span style={{ color: '#00FF87', cursor: 'pointer' }} onClick={() => navigate('/upload')}>Uploader</span></div>
                : tracks.map(track => (
                  <div key={track.id} style={styles.contentRow}>
                    <div style={styles.contentThumb}>
                      {track.cover_url ? <img src={track.cover_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : <span style={{ fontSize: '16px' }}>🎵</span>}
                    </div>
                    <div style={styles.contentInfo}>
                      <div style={styles.contentTitle}>{track.title}</div>
                      <div style={styles.contentMeta}>▶ {track.plays || 0} · ♥ {track.likes || 0}{track.duration ? ` · ${fmtTime(track.duration)}` : ''}</div>
                    </div>
                    <button
                      style={{ ...styles.deleteBtn, opacity: deleting === track.id ? 0.4 : 1 }}
                      onClick={() => deleteTrack(track.id)}
                      disabled={deleting === track.id}
                    >
                      🗑
                    </button>
                  </div>
                ))
            )}

            {activeTab === 'videos' && (
              videos.length === 0
                ? <div style={styles.empty}>Aucune vidéo — <span style={{ color: '#00FF87', cursor: 'pointer' }} onClick={() => navigate('/upload')}>Uploader</span></div>
                : videos.map(video => (
                  <div key={video.id} style={styles.contentRow}>
                    <div style={styles.contentThumb}>
                      {video.thumb_url ? <img src={video.thumb_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : <span style={{ fontSize: '16px' }}>📹</span>}
                    </div>
                    <div style={styles.contentInfo}>
                      <div style={styles.contentTitle}>{video.title}</div>
                      <div style={styles.contentMeta}>👁 {video.views || 0} · ♥ {video.likes || 0}</div>
                    </div>
                    <button
                      style={{ ...styles.deleteBtn, opacity: deleting === video.id ? 0.4 : 1 }}
                      onClick={() => deleteVideo(video.id)}
                      disabled={deleting === video.id}
                    >
                      🗑
                    </button>
                  </div>
                ))
            )}
          </div>
        </>
      )}
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', background: '#090909', paddingBottom: '100px' },
  center: { minHeight: '100vh', background: '#090909', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' },
  btn: { background: '#00FF87', color: '#000', border: 'none', borderRadius: '10px', padding: '12px 24px', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: '14px', cursor: 'pointer' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '56px 16px 16px', position: 'sticky', top: 0, background: 'rgba(9,9,9,0.95)', backdropFilter: 'blur(12px)', zIndex: 10 },
  back: { background: 'none', border: 'none', color: '#fff', fontSize: '22px', cursor: 'pointer', padding: '4px 8px' },
  title: { fontFamily: "'Space Grotesk',sans-serif", fontSize: '20px', fontWeight: 700, color: '#fff', margin: 0, letterSpacing: '0.1em' },
  editBtn: { background: 'rgba(0,255,135,0.08)', border: '1px solid rgba(0,255,135,0.2)', borderRadius: '10px', padding: '8px 12px', color: '#00FF87', fontSize: '14px', cursor: 'pointer' },
  statsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', padding: '16px' },
  statCard: { background: '#111', border: '1px solid', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' },
  statNum: { fontFamily: "'Space Grotesk',sans-serif", fontSize: '26px', fontWeight: 700 },
  statLabel: { fontFamily: "'Inter',sans-serif", fontSize: '11px', color: '#666' },
  section: { padding: '0 16px 16px' },
  sectionTitle: { fontFamily: "'Space Grotesk',sans-serif", fontSize: '11px', fontWeight: 700, color: '#555', letterSpacing: '0.15em', marginBottom: '12px' },
  topCard: { display: 'flex', alignItems: 'center', gap: '12px', background: '#111', border: '1px solid #1a1a1a', borderRadius: '12px', padding: '12px' },
  topThumb: { width: '52px', height: '52px', borderRadius: '8px', background: '#1a1a1a', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '20px' },
  topInfo: { flex: 1, minWidth: 0 },
  topBadge: { background: 'rgba(0,255,135,0.1)', borderRadius: '10px', padding: '2px 8px', fontSize: '10px', color: '#00FF87', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, display: 'inline-block', marginBottom: '4px' },
  topTitle: { fontFamily: "'Space Grotesk',sans-serif", fontSize: '14px', fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  topMeta: { fontFamily: "'Inter',sans-serif", fontSize: '11px', color: '#666', marginTop: '3px' },
  quickActions: { display: 'flex', gap: '10px' },
  quickBtn: { flex: 1, background: '#111', border: '1px solid #1a1a1a', borderRadius: '12px', padding: '16px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer' },
  quickLabel: { fontFamily: "'Space Grotesk',sans-serif", fontSize: '11px', color: '#888', fontWeight: 600 },
  tabRow: { display: 'flex', gap: '0', marginBottom: '12px', background: '#111', borderRadius: '10px', padding: '4px' },
  tab: { flex: 1, background: 'transparent', border: 'none', padding: '9px', color: '#666', fontSize: '13px', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, cursor: 'pointer', borderRadius: '8px' },
  tabActive: { background: '#1a1a1a', color: '#00FF87' },
  contentRow: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0', borderBottom: '1px solid #111' },
  contentThumb: { width: '44px', height: '44px', borderRadius: '8px', background: '#1a1a1a', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  contentInfo: { flex: 1, minWidth: 0 },
  contentTitle: { fontFamily: "'Space Grotesk',sans-serif", fontSize: '13px', fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  contentMeta: { fontFamily: "'Inter',sans-serif", fontSize: '11px', color: '#555', marginTop: '2px' },
  deleteBtn: { background: 'rgba(255,60,60,0.08)', border: '1px solid rgba(255,60,60,0.2)', borderRadius: '8px', padding: '6px 10px', fontSize: '16px', cursor: 'pointer', flexShrink: 0, color: '#ff6b6b' },
  empty: { textAlign: 'center', color: '#444', fontFamily: "'Inter',sans-serif", fontSize: '14px', padding: '30px 0' },
  skeleton: { height: '80px', borderRadius: '12px', background: '#111', animation: 'pulse 1.5s ease-in-out infinite' },
}
