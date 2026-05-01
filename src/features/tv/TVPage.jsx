// src/features/tv/TVPage.jsx
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/shared/lib/supabase'

export function TVPage() {
  const [videos, setVideos] = useState([])
  const [current, setCurrent] = useState(0)
  const [liked, setLiked] = useState({})
  const touchStartY = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => { fetchVideos() }, [])

  async function fetchVideos() {
    const { data } = await supabase
      .from('videos')
      .select('*, profiles(username, avatar_url)')
      .is('deleted_at', null)
      .order('views', { ascending: false })
      .limit(20)
    setVideos(data || [])
  }

  function handleTouchStart(e) { touchStartY.current = e.touches[0].clientY }
  function handleTouchEnd(e) {
    const delta = touchStartY.current - e.changedTouches[0].clientY
    if (Math.abs(delta) < 50) return
    if (delta > 0 && current < videos.length - 1) setCurrent(c => c + 1)
    if (delta < 0 && current > 0) setCurrent(c => c - 1)
  }

  function toggleLike(id) {
    setLiked(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const video = videos[current]

  return (
    <div
      ref={containerRef}
      style={styles.page}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {!video ? (
        <div style={styles.empty}>
          <p style={{ color: '#555', fontFamily: "'Inter',sans-serif" }}>Aucune vidéo disponible 📺</p>
        </div>
      ) : (
        <div style={styles.slide}>
          {/* Vidéo */}
          <video
            key={video.id}
            src={video.video_url}
            style={styles.video}
            autoPlay muted playsInline loop
          />

          {/* Overlay infos */}
          <div style={styles.overlay}>
            <div style={styles.videoInfo}>
              <div style={styles.artistInfo}>
                <div style={styles.avatar}>
                  {video.profiles?.avatar_url
                    ? <img src={video.profiles.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                    : <span style={{ fontSize: '20px' }}>🎵</span>}
                </div>
                <div>
                  <div style={styles.artistName}>{video.profiles?.username || 'Artiste'}</div>
                  <div style={styles.videoTitle}>{video.title}</div>
                </div>
              </div>
              <div style={styles.stats}>
                <span style={styles.stat}>👁 {video.views || 0}</span>
                <span style={styles.stat}>♥ {video.likes || 0}</span>
              </div>
            </div>

            {/* Actions */}
            <div style={styles.actions}>
              <button style={styles.actionBtn} onClick={() => toggleLike(video.id)}>
                <span style={{ fontSize: '26px' }}>{liked[video.id] ? '❤️' : '🤍'}</span>
                <span style={styles.actionLabel}>{(video.likes || 0) + (liked[video.id] ? 1 : 0)}</span>
              </button>
              <button style={styles.actionBtn}>
                <span style={{ fontSize: '26px' }}>💬</span>
                <span style={styles.actionLabel}>0</span>
              </button>
              <button style={styles.actionBtn}>
                <span style={{ fontSize: '26px' }}>⤴</span>
                <span style={styles.actionLabel}>Partager</span>
              </button>
            </div>
          </div>

          {/* Indicateur navigation */}
          <div style={styles.navHint}>
            {current > 0 && <div style={styles.hint}>↑</div>}
            {current < videos.length - 1 && <div style={{ ...styles.hint, marginTop: 'auto' }}>↓</div>}
          </div>
        </div>
      )}

      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.pageTitle}>UG TV</h1>
        <span style={styles.counter}>{current + 1} / {videos.length}</span>
      </div>
    </div>
  )
}

const styles = {
  page: { height: '100vh', background: '#000', position: 'relative', overflow: 'hidden' },
  empty: { height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  slide: { width: '100%', height: '100%', position: 'relative' },
  video: { width: '100%', height: '100%', objectFit: 'cover' },
  overlay: {
    position: 'absolute', inset: 0,
    background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 50%)',
    display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
    padding: '20px 16px 80px',
  },
  videoInfo: { marginBottom: '16px' },
  artistInfo: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' },
  avatar: { width: '44px', height: '44px', borderRadius: '50%', background: '#222', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #00FF87' },
  artistName: { fontFamily: "'Space Grotesk',sans-serif", fontSize: '15px', fontWeight: 700, color: '#fff' },
  videoTitle: { fontSize: '13px', color: '#ccc', fontFamily: "'Inter',sans-serif", marginTop: '2px' },
  stats: { display: 'flex', gap: '12px' },
  stat: { fontSize: '13px', color: '#aaa', fontFamily: "'Inter',sans-serif" },
  actions: { position: 'absolute', right: '16px', bottom: '100px', display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' },
  actionBtn: { background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' },
  actionLabel: { color: '#fff', fontSize: '11px', fontFamily: "'Inter',sans-serif" },
  navHint: { position: 'absolute', right: '50%', top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: '100px', pointerEvents: 'none' },
  hint: { color: 'rgba(255,255,255,0.2)', fontSize: '20px', textAlign: 'center' },
  header: { position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '50px 20px 12px', background: 'linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)' },
  pageTitle: { fontFamily: "'Space Grotesk',sans-serif", fontSize: '20px', fontWeight: 700, color: '#fff', margin: 0, letterSpacing: '0.1em' },
  counter: { fontFamily: "'Inter',sans-serif", fontSize: '12px', color: 'rgba(255,255,255,0.5)' },
}
