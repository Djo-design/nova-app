// src/features/player/MiniPlayer.jsx
import { usePlayer } from './PlayerContext'

function fmtTime(s) {
  if (!s || isNaN(s)) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export function MiniPlayer() {
  const { currentTrack, playing, progress, currentTime, duration, togglePlay, next, prev, seek, setFullscreen } = usePlayer()

  if (!currentTrack) return null

  function handleSeek(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    seek(Math.max(0, Math.min(1, ratio)))
  }

  return (
    <div style={styles.wrap}>
      {/* Barre de progression cliquable */}
      <div style={styles.progressBar} onClick={handleSeek}>
        <div style={{ ...styles.progressFill, width: `${progress * 100}%` }} />
      </div>

      {/* Contenu */}
      <div style={styles.inner} onClick={() => setFullscreen(true)}>
        {/* Cover */}
        <div style={styles.cover}>
          {currentTrack.cover_url
            ? <img src={currentTrack.cover_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
            : <span style={{ fontSize: '20px' }}>🎵</span>}
          {playing && <div style={styles.coverGlow} />}
        </div>

        {/* Infos */}
        <div style={styles.info}>
          <div style={styles.title}>{currentTrack.title}</div>
          <div style={styles.artist}>{currentTrack.profiles?.username || 'Artiste'}</div>
        </div>

        {/* Temps */}
        <div style={styles.time}>{fmtTime(currentTime)} / {fmtTime(duration)}</div>

        {/* Contrôles */}
        <div style={styles.controls} onClick={e => e.stopPropagation()}>
          <button style={styles.ctrlBtn} onClick={prev}>⏮</button>
          <button style={styles.playBtn} onClick={togglePlay}>
            {playing ? '⏸' : '▶'}
          </button>
          <button style={styles.ctrlBtn} onClick={next}>⏭</button>
        </div>
      </div>
    </div>
  )
}

const styles = {
  wrap: {
    position: 'fixed', bottom: '56px', left: 0, right: 0, zIndex: 90,
    background: 'rgba(17,17,17,0.98)', backdropFilter: 'blur(20px)',
    borderTop: '1px solid #222',
  },
  progressBar: {
    height: '3px', background: '#1a1a1a', cursor: 'pointer',
    position: 'relative',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #00FF87, #7B2FBE)',
    transition: 'width 0.5s linear',
    position: 'relative',
  },
  inner: {
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '8px 12px', cursor: 'pointer',
  },
  cover: {
    width: '42px', height: '42px', borderRadius: '8px',
    background: '#1a1a1a', flexShrink: 0, overflow: 'hidden',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  coverGlow: {
    position: 'absolute', inset: 0,
    boxShadow: 'inset 0 0 0 1px rgba(0,255,135,0.3)',
    borderRadius: '8px',
    animation: 'pulse 2s ease-in-out infinite',
  },
  info: { flex: 1, minWidth: 0 },
  title: {
    fontFamily: "'Space Grotesk',sans-serif", fontSize: '13px', fontWeight: 700,
    color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  artist: { fontFamily: "'Inter',sans-serif", fontSize: '11px', color: '#666', marginTop: '2px' },
  time: { fontFamily: "'Inter',sans-serif", fontSize: '10px', color: '#555', flexShrink: 0 },
  controls: { display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 },
  ctrlBtn: {
    background: 'none', border: 'none', color: '#888',
    fontSize: '16px', cursor: 'pointer', padding: '4px 6px',
  },
  playBtn: {
    background: '#00FF87', border: 'none', borderRadius: '50%',
    width: '34px', height: '34px', fontSize: '13px', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#000', fontWeight: 700, flexShrink: 0,
  },
}
