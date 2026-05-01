// src/features/player/FullscreenPlayer.jsx
import { usePlayer } from './PlayerContext'

function fmtTime(s) {
  if (!s || isNaN(s)) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export function FullscreenPlayer() {
  const {
    currentTrack, playing, progress, currentTime, duration,
    togglePlay, next, prev, seek, volume, changeVolume, setFullscreen, queue, currentIdx,
  } = usePlayer()

  if (!currentTrack) return null

  function handleSeek(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    seek(Math.max(0, Math.min(1, ratio)))
  }

  return (
    <div style={styles.overlay}>
      {/* BG flou basé sur la cover */}
      <div style={styles.bg}>
        {currentTrack.cover_url && (
          <img src={currentTrack.cover_url} style={styles.bgImg} alt="" />
        )}
        <div style={styles.bgBlur} />
      </div>

      {/* Header */}
      <div style={styles.header}>
        <button style={styles.closeBtn} onClick={() => setFullscreen(false)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M19 9l-7 7-7-7" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div style={styles.headerInfo}>
          <span style={styles.headerLabel}>EN LECTURE</span>
          <span style={styles.headerSub}>{currentIdx + 1} / {queue.length}</span>
        </div>
        <div style={{ width: 40 }} />
      </div>

      {/* Contenu principal */}
      <div style={styles.main}>
        {/* Artwork */}
        <div style={styles.artworkWrap}>
          <div style={styles.artwork}>
            {currentTrack.cover_url
              ? <img src={currentTrack.cover_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
              : (
                <div style={styles.artworkPlaceholder}>
                  <span style={{ fontSize: '80px' }}>🎵</span>
                </div>
              )}
            {playing && <div style={styles.artworkGlow} />}
          </div>
          {playing && (
            <div style={styles.soundWaves}>
              {[...Array(5)].map((_, i) => (
                <div key={i} style={{ ...styles.wave, animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          )}
        </div>

        {/* Infos track */}
        <div style={styles.trackInfo}>
          <h2 style={styles.trackTitle}>{currentTrack.title}</h2>
          <p style={styles.trackArtist}>{currentTrack.profiles?.username || 'Artiste'}</p>
          {currentTrack.genre && <span style={styles.genreBadge}>{currentTrack.genre}</span>}
        </div>

        {/* Barre de progression */}
        <div style={styles.progressSection}>
          <div style={styles.progressBar} onClick={handleSeek}>
            <div style={{ ...styles.progressFill, width: `${progress * 100}%` }}>
              <div style={styles.progressThumb} />
            </div>
          </div>
          <div style={styles.times}>
            <span style={styles.timeText}>{fmtTime(currentTime)}</span>
            <span style={styles.timeText}>{fmtTime(duration)}</span>
          </div>
        </div>

        {/* Contrôles */}
        <div style={styles.controls}>
          <button style={styles.sideBtn} onClick={prev}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M19 20L9 12l10-8v16z" fill="#fff"/>
              <rect x="4" y="4" width="2.5" height="16" rx="1" fill="#fff"/>
            </svg>
          </button>

          <button style={styles.playBtn} onClick={togglePlay}>
            {playing ? (
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <rect x="6" y="4" width="4" height="16" rx="1.5" fill="#000"/>
                <rect x="14" y="4" width="4" height="16" rx="1.5" fill="#000"/>
              </svg>
            ) : (
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <path d="M8 5.14v14l11-7-11-7z" fill="#000"/>
              </svg>
            )}
          </button>

          <button style={styles.sideBtn} onClick={next}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M5 4l10 8-10 8V4z" fill="#fff"/>
              <rect x="17.5" y="4" width="2.5" height="16" rx="1" fill="#fff"/>
            </svg>
          </button>
        </div>

        {/* Volume */}
        <div style={styles.volumeRow}>
          <span style={{ fontSize: '14px' }}>🔈</span>
          <input
            type="range" min="0" max="1" step="0.01"
            value={volume}
            onChange={e => changeVolume(parseFloat(e.target.value))}
            style={styles.volumeSlider}
          />
          <span style={{ fontSize: '14px' }}>🔊</span>
        </div>

        {/* Stats */}
        <div style={styles.statsRow}>
          <span style={styles.statChip}>▶ {currentTrack.plays || 0} écoutes</span>
          <span style={styles.statChip}>♥ {currentTrack.likes || 0} likes</span>
        </div>
      </div>

      <style>{`
        @keyframes waveAnim {
          0%, 100% { height: 6px; }
          50% { height: 22px; }
        }
        @keyframes glowPulse {
          0%, 100% { box-shadow: 0 0 40px rgba(0,255,135,0.15); }
          50% { box-shadow: 0 0 80px rgba(0,255,135,0.35); }
        }
      `}</style>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 200,
    display: 'flex', flexDirection: 'column',
    background: '#090909',
    overflowY: 'auto',
  },
  bg: { position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden' },
  bgImg: { width: '100%', height: '100%', objectFit: 'cover', opacity: 0.15, filter: 'blur(40px)', transform: 'scale(1.1)' },
  bgBlur: { position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(9,9,9,0.7) 0%, rgba(9,9,9,0.95) 100%)' },
  header: {
    position: 'relative', zIndex: 1,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '56px 20px 16px',
  },
  closeBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: '8px', opacity: 0.7 },
  headerInfo: { textAlign: 'center' },
  headerLabel: { display: 'block', fontFamily: "'Space Grotesk',sans-serif", fontSize: '11px', fontWeight: 700, color: '#00FF87', letterSpacing: '0.15em' },
  headerSub: { display: 'block', fontFamily: "'Inter',sans-serif", fontSize: '11px', color: '#555', marginTop: '2px' },
  main: {
    position: 'relative', zIndex: 1,
    flex: 1, display: 'flex', flexDirection: 'column',
    alignItems: 'center', padding: '20px 24px 40px', gap: '28px',
  },
  artworkWrap: { position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' },
  artwork: {
    width: '260px', height: '260px', borderRadius: '20px',
    background: '#1a1a1a', overflow: 'hidden',
    boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
    animation: 'glowPulse 3s ease-in-out infinite',
    position: 'relative',
  },
  artworkPlaceholder: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #1a1a1a, #111)' },
  artworkGlow: { position: 'absolute', inset: 0, borderRadius: '20px', boxShadow: 'inset 0 0 0 2px rgba(0,255,135,0.2)' },
  soundWaves: { display: 'flex', alignItems: 'center', gap: '4px', height: '28px' },
  wave: {
    width: '3px', borderRadius: '3px', background: '#00FF87',
    animation: 'waveAnim 0.8s ease-in-out infinite',
    height: '6px',
  },
  trackInfo: { textAlign: 'center', width: '100%' },
  trackTitle: { fontFamily: "'Space Grotesk',sans-serif", fontSize: '22px', fontWeight: 700, color: '#fff', margin: 0, letterSpacing: '-0.01em' },
  trackArtist: { fontFamily: "'Inter',sans-serif", fontSize: '15px', color: '#888', margin: '6px 0 10px' },
  genreBadge: { background: 'rgba(123,47,190,0.2)', border: '1px solid rgba(123,47,190,0.4)', borderRadius: '20px', padding: '3px 12px', fontSize: '11px', color: '#a87bd4', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600 },
  progressSection: { width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' },
  progressBar: {
    height: '4px', background: '#1a1a1a', borderRadius: '4px',
    cursor: 'pointer', position: 'relative', overflow: 'visible',
  },
  progressFill: { height: '100%', background: 'linear-gradient(90deg, #00FF87, #7B2FBE)', borderRadius: '4px', transition: 'width 0.5s linear', position: 'relative' },
  progressThumb: { position: 'absolute', right: '-5px', top: '50%', transform: 'translateY(-50%)', width: '10px', height: '10px', borderRadius: '50%', background: '#fff', boxShadow: '0 0 6px rgba(0,255,135,0.6)' },
  times: { display: 'flex', justifyContent: 'space-between' },
  timeText: { fontFamily: "'Inter',sans-serif", fontSize: '12px', color: '#555' },
  controls: { display: 'flex', alignItems: 'center', gap: '32px' },
  sideBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: '8px', opacity: 0.8 },
  playBtn: {
    width: '70px', height: '70px', borderRadius: '50%',
    background: '#00FF87', border: 'none', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 0 30px rgba(0,255,135,0.4)',
    transition: 'transform 0.1s',
  },
  volumeRow: { display: 'flex', alignItems: 'center', gap: '12px', width: '100%' },
  volumeSlider: { flex: 1, accentColor: '#00FF87', cursor: 'pointer' },
  statsRow: { display: 'flex', gap: '12px' },
  statChip: { background: 'rgba(255,255,255,0.05)', border: '1px solid #1a1a1a', borderRadius: '20px', padding: '5px 14px', fontSize: '12px', color: '#666', fontFamily: "'Inter',sans-serif" },
}
