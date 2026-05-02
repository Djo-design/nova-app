// src/features/tv/TVPage.jsx
import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/shared/lib/supabase'
import { useAuth } from '@/features/auth/AuthContext'
import { usePlayer } from '@/features/player/PlayerContext'
import { CommentsPanel } from '@/shared/ui/CommentsPanel'
import { FollowButton } from '@/shared/ui/FollowButton'

function isNew(dateStr) {
  return (Date.now() - new Date(dateStr)) < 48 * 3600 * 1000
}

function fmtViews(n) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000)    return `${(n / 1000).toFixed(1)}K`
  return String(n || 0)
}

export function TVPage() {
  const { user } = useAuth()
  const { pauseForVideo, resumeAfterVideo } = usePlayer()
  const navigate = useNavigate()

  const [videos, setVideos]           = useState([])
  const [current, setCurrent]         = useState(0)
  const [muted, setMuted]             = useState(true)
  const [playing, setPlaying]         = useState(true)
  const [liked, setLiked]             = useState({})
  const [views, setViews]             = useState({})
  const [showComments, setShowComments] = useState(false)
  const [showHearts, setShowHearts]   = useState(false)
  const [progress, setProgress]       = useState(0)

  const videoRef      = useRef(null)
  const viewTimerRef  = useRef(null)
  const touchStartY   = useRef(null)
  const lastTapRef    = useRef(0)

  useEffect(() => {
    fetchVideos()
    // Pause l'audio quand on arrive sur TV
    pauseForVideo()
    return () => {
      resumeAfterVideo()
      clearTimeout(viewTimerRef.current)
    }
  }, [])

  async function fetchVideos() {
    const { data } = await supabase
      .from('videos')
      .select('*, profiles(id, username, avatar_url)')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(30)
    setVideos(data || [])
    // Init vues locales
    const v = {}
    data?.forEach(vid => { v[vid.id] = vid.views || 0 })
    setViews(v)
  }

  // Charge les likes de l'user courant
  useEffect(() => {
    if (!user || !videos.length) return
    const ids = videos.map(v => v.id)
    supabase.from('likes')
      .select('target_id')
      .eq('user_id', user.id)
      .eq('target_type', 'video')
      .in('target_id', ids)
      .then(({ data }) => {
        const l = {}
        data?.forEach(d => { l[d.target_id] = true })
        setLiked(l)
      })
  }, [user, videos])

  // Quand la vidéo courante change
  useEffect(() => {
    const video = videoRef.current
    if (!video || !videos[current]) return

    video.src = videos[current].video_url
    video.load()
    video.muted = muted
    video.play().catch(() => {})
    setProgress(0)
    setPlaying(true)

    // Compteur vues après 5s
    clearTimeout(viewTimerRef.current)
    viewTimerRef.current = setTimeout(() => incrementView(videos[current].id), 5000)
  }, [current, videos])

  // Sync muted
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted
  }, [muted])

  async function incrementView(videoId) {
    try {
      await supabase.rpc('increment_views', { row_id: videoId })
      setViews(prev => ({ ...prev, [videoId]: (prev[videoId] || 0) + 1 }))
      if (user) {
        await supabase.from('views').insert({ user_id: user.id, video_id: videoId })
      }
    } catch (e) { console.error(e) }
  }

  async function toggleLike(videoId) {
    if (!user) { navigate('/login'); return }
    const isLiked = liked[videoId]
    setLiked(prev => ({ ...prev, [videoId]: !isLiked }))
    try {
      if (isLiked) {
        await supabase.from('likes').delete()
          .eq('user_id', user.id).eq('target_type', 'video').eq('target_id', videoId)
        await supabase.rpc('decrement_likes', { row_id: videoId, table_name: 'videos' })
      } else {
        await supabase.from('likes').insert({ user_id: user.id, target_type: 'video', target_id: videoId })
        await supabase.rpc('increment_likes', { row_id: videoId, table_name: 'videos' })
      }
    } catch (e) {
      setLiked(prev => ({ ...prev, [videoId]: isLiked })) // rollback
    }
  }

  async function shareVideo(video) {
    const url = `${window.location.origin}/tv?v=${video.id}`
    const shareData = {
      title: video.title,
      text: `Regarde "${video.title}" sur NOVA by UFO GVNG`,
      url,
    }
    try {
      if (navigator.share) {
        await navigator.share(shareData)
      } else {
        await navigator.clipboard.writeText(url)
        alert('Lien copié !')
      }
    } catch (e) {
      // User cancelled
    }
  }

  // Double tap → like
  function handleDoubleTap(videoId) {
    const now = Date.now()
    if (now - lastTapRef.current < 300) {
      toggleLike(videoId)
      setShowHearts(true)
      setTimeout(() => setShowHearts(false), 800)
    }
    lastTapRef.current = now
  }

  // Toggle play/pause au tap simple
  function handleVideoTap() {
    const video = videoRef.current
    if (!video) return
    if (video.paused) { video.play(); setPlaying(true) }
    else              { video.pause(); setPlaying(false) }
  }

  // Swipe vertical
  function handleTouchStart(e) { touchStartY.current = e.touches[0].clientY }
  function handleTouchEnd(e) {
    if (showComments) return
    const delta = touchStartY.current - e.changedTouches[0].clientY
    if (Math.abs(delta) < 60) return
    if (delta > 0 && current < videos.length - 1) setCurrent(c => c + 1)
    if (delta < 0 && current > 0)                 setCurrent(c => c - 1)
  }

  // Progression vidéo
  function handleTimeUpdate(e) {
    const v = e.target
    if (v.duration) setProgress(v.currentTime / v.duration)
  }

  // Auto-suivant
  function handleEnded() {
    if (current < videos.length - 1) setCurrent(c => c + 1)
  }

  const video = videos[current]

  return (
    <div
      style={styles.page}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Élément vidéo */}
      <video
        ref={videoRef}
        style={styles.video}
        autoPlay
        muted={muted}
        playsInline
        loop={false}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onClick={() => handleDoubleTap(video?.id)}
      />

      {/* Overlay tap pour play/pause */}
      <div style={styles.tapOverlay} onClick={handleVideoTap} />

      {/* Coeurs double tap */}
      {showHearts && (
        <div style={styles.heartsAnim}>
          {[...Array(5)].map((_, i) => (
            <div key={i} style={{ ...styles.heart, left: `${20 + i * 15}%`, animationDelay: `${i * 0.1}s` }}>
              ❤️
            </div>
          ))}
        </div>
      )}

      {/* Icône pause */}
      {!playing && (
        <div style={styles.pauseIcon}>⏸</div>
      )}

      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.pageTitle}>UG TV</h1>
        {videos.length > 0 && (
          <span style={styles.counter}>{current + 1} / {videos.length}</span>
        )}
      </div>

      {/* Barre de progression */}
      <div style={styles.progressBar}>
        <div style={{ ...styles.progressFill, width: `${progress * 100}%` }} />
      </div>

      {video && (
        <>
          {/* Infos vidéo */}
          <div style={styles.overlay}>
            <div style={styles.videoInfo}>
              {/* Artiste */}
              <div style={styles.artistRow} onClick={() => navigate(`/artist/${video.profiles?.id}`)}>
                <div style={styles.artistAvatar}>
                  {video.profiles?.avatar_url
                    ? <img src={video.profiles.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                    : <span style={{ fontSize: '18px' }}>🎤</span>}
                </div>
                <div>
                  <div style={styles.artistName}>{video.profiles?.username || 'Artiste'}</div>
                  <div style={styles.videoTitle}>{video.title}</div>
                </div>
                {/* Follow inline */}
                {user && user.id !== video.profiles?.id && (
                  <div onClick={e => e.stopPropagation()}>
                    <FollowButton artistId={video.profiles?.id} size="sm" />
                  </div>
                )}
              </div>

              {/* Badge NOUVEAU */}
              {isNew(video.created_at) && (
                <div style={styles.newBadge}>NOUVEAU</div>
              )}
            </div>

            {/* Actions droite */}
            <div style={styles.actions}>
              {/* Like */}
              <button style={styles.actionBtn} onClick={() => toggleLike(video.id)}>
                <span style={{ fontSize: '28px' }}>{liked[video.id] ? '❤️' : '🤍'}</span>
                <span style={styles.actionLabel}>{fmtViews(video.likes || 0)}</span>
              </button>

              {/* Commentaires */}
              <button style={styles.actionBtn} onClick={() => { setShowComments(true); videoRef.current?.pause(); setPlaying(false) }}>
                <span style={{ fontSize: '26px' }}>💬</span>
                <span style={styles.actionLabel}>Comm.</span>
              </button>

              {/* Partager */}
              <button style={styles.actionBtn} onClick={() => shareVideo(video)}>
                <span style={{ fontSize: '26px' }}>📤</span>
                <span style={styles.actionLabel}>Partager</span>
              </button>

              {/* Son */}
              <button style={styles.actionBtn} onClick={() => setMuted(m => !m)}>
                <span style={{ fontSize: '26px' }}>{muted ? '🔇' : '🔊'}</span>
                <span style={styles.actionLabel}>{muted ? 'Son OFF' : 'Son ON'}</span>
              </button>

              {/* Vues */}
              <div style={styles.viewsChip}>
                <span style={{ fontSize: '12px' }}>👁</span>
                <span style={styles.viewsCount}>{fmtViews(views[video.id] || 0)}</span>
              </div>
            </div>
          </div>

          {/* Navigation haut/bas */}
          <div style={styles.navArrows}>
            {current > 0 && (
              <button style={styles.navArrow} onClick={() => setCurrent(c => c - 1)}>↑</button>
            )}
            {current < videos.length - 1 && (
              <button style={{ ...styles.navArrow, marginTop: '8px' }} onClick={() => setCurrent(c => c + 1)}>↓</button>
            )}
          </div>
        </>
      )}

      {/* Vide */}
      {!video && (
        <div style={styles.empty}>
          <span style={{ fontSize: '48px' }}>📺</span>
          <p style={{ color: '#555', fontFamily: "'Inter',sans-serif" }}>Aucune vidéo disponible</p>
        </div>
      )}

      {/* Panel commentaires */}
      {showComments && video && (
        <CommentsPanel
          targetType="video"
          targetId={video.id}
          onClose={() => { setShowComments(false); videoRef.current?.play(); setPlaying(true) }}
        />
      )}

      <style>{`
        @keyframes heartFloat {
          0%   { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(-120px) scale(1.5); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </div>
  )
}

const styles = {
  page: { height: '100vh', background: '#000', position: 'relative', overflow: 'hidden', userSelect: 'none' },
  video: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' },
  tapOverlay: { position: 'absolute', inset: 0, zIndex: 1 },

  heartsAnim: { position: 'absolute', bottom: '200px', left: 0, right: 0, zIndex: 10, pointerEvents: 'none', height: '150px' },
  heart: { position: 'absolute', fontSize: '32px', animation: 'heartFloat 0.8s ease forwards' },

  pauseIcon: { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: '48px', zIndex: 5, opacity: 0.7, animation: 'fadeIn 0.2s ease' },

  header: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '50px 16px 12px', background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)' },
  pageTitle: { fontFamily: "'Space Grotesk',sans-serif", fontSize: '20px', fontWeight: 700, color: '#fff', margin: 0, letterSpacing: '0.1em' },
  counter: { fontFamily: "'Inter',sans-serif", fontSize: '12px', color: 'rgba(255,255,255,0.5)' },

  progressBar: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px', background: 'rgba(255,255,255,0.15)', zIndex: 10 },
  progressFill: { height: '100%', background: '#00FF87', transition: 'width 0.3s linear' },

  overlay: { position: 'absolute', inset: 0, zIndex: 5, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', padding: '0 0 72px 0', pointerEvents: 'none', background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 55%)' },

  videoInfo: { padding: '0 12px 0 12px', flex: 1, pointerEvents: 'all' },
  artistRow: { display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: '8px' },
  artistAvatar: { width: '40px', height: '40px', borderRadius: '50%', background: '#222', border: '2px solid #00FF87', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  artistName: { fontFamily: "'Space Grotesk',sans-serif", fontSize: '14px', fontWeight: 700, color: '#fff' },
  videoTitle: { fontFamily: "'Inter',sans-serif", fontSize: '12px', color: 'rgba(255,255,255,0.7)', marginTop: '2px' },
  newBadge: { display: 'inline-block', background: '#00FF87', color: '#000', fontSize: '9px', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 900, letterSpacing: '0.1em', padding: '2px 8px', borderRadius: '4px' },

  actions: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '0 12px 0 0', pointerEvents: 'all' },
  actionBtn: { background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' },
  actionLabel: { color: '#fff', fontSize: '10px', fontFamily: "'Inter',sans-serif", textShadow: '0 1px 3px rgba(0,0,0,0.8)' },
  viewsChip: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' },
  viewsCount: { color: '#fff', fontSize: '10px', fontFamily: "'Inter',sans-serif" },

  navArrows: { position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', pointerEvents: 'all' },
  navArrow: { background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '50%', width: '36px', height: '36px', color: '#fff', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' },

  empty: { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' },
}
