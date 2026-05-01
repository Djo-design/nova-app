// src/shared/ui/YouTubeModal.jsx
import { useEffect } from 'react'

export function YouTubeModal({ videoId, onClose }) {
  // Fermer avec la touche Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  if (!videoId) return null

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <span style={styles.ytBadge}>▶ YouTube</span>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        {/* iframe embed */}
        <div style={styles.iframeWrap}>
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`}
            style={styles.iframe}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="YouTube video"
            sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
          />
        </div>
      </div>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 500,
    background: 'rgba(0,0,0,0.9)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '20px',
  },
  modal: {
    width: '100%', maxWidth: '600px',
    background: '#111', borderRadius: '16px',
    overflow: 'hidden', border: '1px solid #222',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 16px', background: '#0a0a0a',
    borderBottom: '1px solid #1a1a1a',
  },
  ytBadge: {
    background: 'rgba(255,0,0,0.15)', border: '1px solid rgba(255,0,0,0.3)',
    borderRadius: '10px', padding: '3px 10px',
    color: '#ff4444', fontSize: '12px',
    fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700,
  },
  closeBtn: {
    background: '#1a1a1a', border: '1px solid #2a2a2a',
    borderRadius: '50%', width: '30px', height: '30px',
    color: '#fff', fontSize: '14px', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  iframeWrap: {
    position: 'relative', paddingTop: '56.25%', // ratio 16:9
    background: '#000',
  },
  iframe: {
    position: 'absolute', top: 0, left: 0,
    width: '100%', height: '100%', border: 'none',
  },
}
