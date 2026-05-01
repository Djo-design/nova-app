// src/features/upload/UploadPage.jsx
import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/shared/lib/supabase'
import { useAuth } from '@/features/auth/AuthContext'

const GENRES = ['Rap', 'R&B', 'Afro', 'Pop', 'Trap', 'Soul', 'Electronic', 'Jazz', 'Autre']
const MAX_AUDIO_MB = 25
const MAX_VIDEO_MB = 100
const MAX_PER_DAY  = 5

function formatBytes(b) {
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} Ko`
  return `${(b / 1024 / 1024).toFixed(1)} Mo`
}

async function compressCover(file) {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const size = Math.min(img.width, img.height, 800)
      canvas.width = size; canvas.height = size
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, (img.width - size) / 2, (img.height - size) / 2, size, size, 0, 0, size, size)
      canvas.toBlob(blob => resolve(blob), 'image/webp', 0.85)
    }
    img.src = URL.createObjectURL(file)
  })
}

function getAudioDuration(file) {
  return new Promise((resolve, reject) => {
    const a = document.createElement('audio')
    a.onloadedmetadata = () => { resolve(Math.round(a.duration)); URL.revokeObjectURL(a.src) }
    a.onerror = reject
    a.src = URL.createObjectURL(file)
  })
}

export function UploadPage() {
  const { user, isArtist } = useAuth()
  const navigate = useNavigate()
  const audioInputRef = useRef(null)
  const videoInputRef = useRef(null)
  const coverRef      = useRef(null)

  const [type, setType]           = useState('audio')
  const [title, setTitle]         = useState('')
  const [genre, setGenre]         = useState('')
  const [audioFile, setAudioFile] = useState(null)
  const [videoFile, setVideoFile] = useState(null)
  const [coverFile, setCoverFile] = useState(null)
  const [coverPreview, setCoverPreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress]   = useState(0)
  const [error, setError]         = useState('')
  const [done, setDone]           = useState(false)
  const [remaining, setRemaining] = useState(null) // uploads restants aujourd'hui

  // Vérifie la limite côté backend à l'affichage
  useState(() => {
    if (!user) return
    checkRemaining()
  })

  async function checkRemaining() {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const table = type === 'audio' ? 'tracks' : 'videos'
    const { count } = await supabase
      .from(table).select('*', { count: 'exact', head: true })
      .eq('artist_id', user.id)
      .gte('created_at', today.toISOString())
    setRemaining(MAX_PER_DAY - (count || 0))
  }

  function handleAudioSelect(e) {
    const file = e.target.files[0]; if (!file) return
    const ext = file.name.split('.').pop().toLowerCase()
    const allowed = ['mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac']
    if (!allowed.includes(ext)) { setError(`Format non supporté. Acceptés : ${allowed.join(', ')}`); return }
    if (file.size > MAX_AUDIO_MB * 1024 * 1024) { setError(`Fichier trop lourd (max ${MAX_AUDIO_MB} Mo)`); return }
    setError(''); setAudioFile(file)
    if (!title) setTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '))
  }

  function handleVideoSelect(e) {
    const file = e.target.files[0]; if (!file) return
    if (file.size > MAX_VIDEO_MB * 1024 * 1024) { setError(`Vidéo trop lourde (max ${MAX_VIDEO_MB} Mo)`); return }
    if (!['video/mp4', 'video/quicktime'].includes(file.type)) { setError('Format non supporté. Utilise MP4 H.264.'); return }
    setError(''); setVideoFile(file)
    if (!title) setTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '))
  }

  function handleCoverSelect(e) {
    const file = e.target.files[0]; if (!file) return
    if (!file.type.startsWith('image/')) { setError('La cover doit être une image'); return }
    setCoverFile(file); setCoverPreview(URL.createObjectURL(file))
  }

  async function handleUpload() {
    setError('')
    if (!title.trim())   { setError('Donne un titre'); return }
    if (!genre)          { setError('Choisis un genre'); return }
    if (type === 'audio' && !audioFile) { setError('Sélectionne un fichier audio'); return }
    if (type === 'video' && !videoFile) { setError('Sélectionne une vidéo'); return }

    setUploading(true); setProgress(5)

    try {
      // ── Vérif limite BACKEND (source of truth) ──
      const today = new Date(); today.setHours(0, 0, 0, 0)
      const table = type === 'audio' ? 'tracks' : 'videos'
      const { count } = await supabase
        .from(table).select('*', { count: 'exact', head: true })
        .eq('artist_id', user.id)
        .gte('created_at', today.toISOString())

      if ((count || 0) >= MAX_PER_DAY) {
        setError(`Limite de ${MAX_PER_DAY} uploads/jour atteinte. Reviens demain !`)
        setUploading(false); return
      }

      setProgress(15)

      // ── Upload cover ──
      let coverUrl = null
      if (coverFile) {
        const compressed = await compressCover(coverFile)
        const coverPath = `${user.id}/${Date.now()}.webp`
        const { error: ce } = await supabase.storage.from('covers').upload(coverPath, compressed, { contentType: 'image/webp' })
        if (ce) throw ce
        const { data: { publicUrl } } = supabase.storage.from('covers').getPublicUrl(coverPath)
        coverUrl = publicUrl
      }
      setProgress(35)

      // ── Upload audio ──
      if (type === 'audio') {
        let duration = null
        try { duration = await getAudioDuration(audioFile) } catch {}
        setProgress(45)

        const audioPath = `${user.id}/${Date.now()}_${audioFile.name}`
        const { error: ae } = await supabase.storage.from('audio').upload(audioPath, audioFile, { contentType: audioFile.type })
        if (ae) throw ae
        const { data: { publicUrl } } = supabase.storage.from('audio').getPublicUrl(audioPath)
        setProgress(80)

        const { error: de } = await supabase.from('tracks').insert({
          artist_id: user.id, title: title.trim(), genre,
          audio_url: publicUrl, cover_url: coverUrl, duration,
        })
        if (de) throw de
      }

      // ── Upload vidéo ──
      if (type === 'video') {
        setProgress(45)
        const videoPath = `${user.id}/${Date.now()}_${videoFile.name}`
        const { error: ve } = await supabase.storage.from('video').upload(videoPath, videoFile, { contentType: videoFile.type })
        if (ve) throw ve
        const { data: { publicUrl } } = supabase.storage.from('video').getPublicUrl(videoPath)
        setProgress(80)

        const { error: de } = await supabase.from('videos').insert({
          artist_id: user.id, title: title.trim(), genre,
          video_url: publicUrl, thumb_url: coverUrl,
        })
        if (de) throw de
      }

      setProgress(100)
      setTimeout(() => setDone(true), 300)
    } catch (err) {
      console.error(err)
      setError(err.message || 'Erreur lors de l\'upload. Réessaie.')
    } finally {
      setUploading(false)
    }
  }

  function reset() {
    setTitle(''); setGenre(''); setAudioFile(null); setVideoFile(null)
    setCoverFile(null); setCoverPreview(null); setDone(false); setProgress(0); setError('')
    checkRemaining()
  }

  if (!user) return (
    <div style={styles.center}>
      <p style={styles.msg}>Connecte-toi pour uploader</p>
      <button style={styles.btn} onClick={() => navigate('/login')}>Se connecter</button>
    </div>
  )

  if (!isArtist) return (
    <div style={styles.center}>
      <span style={{ fontSize: '48px' }}>🎤</span>
      <p style={styles.msg}>Tu dois être artiste pour uploader</p>
      <button style={styles.btn} onClick={() => navigate('/become-artist')}>Devenir artiste</button>
    </div>
  )

  if (done) return (
    <div style={styles.center}>
      <span style={{ fontSize: '56px' }}>✅</span>
      <h2 style={styles.successTitle}>Upload réussi !</h2>
      <p style={styles.msg}>Ton contenu est en ligne 🔥</p>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button style={styles.btn} onClick={reset}>Uploader un autre</button>
        <button style={styles.btnSecondary} onClick={() => navigate('/radio')}>Voir la Radio</button>
      </div>
    </div>
  )

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.pageTitle}>UPLOAD</h1>
        {remaining !== null && (
          <div style={{ ...styles.limitBadge, ...(remaining <= 1 ? styles.limitBadgeWarn : {}) }}>
            {remaining <= 0
              ? '⛔ Limite atteinte aujourd\'hui'
              : `${remaining} upload${remaining > 1 ? 's' : ''} restant${remaining > 1 ? 's' : ''} aujourd'hui`}
          </div>
        )}
      </div>

      {remaining === 0 ? (
        <div style={styles.centerPad}>
          <p style={{ color: '#ff6b6b', fontFamily: "'Inter',sans-serif", fontSize: '14px', textAlign: 'center' }}>
            Tu as atteint la limite de {MAX_PER_DAY} uploads aujourd'hui.<br />Reviens demain ! 🙏
          </p>
        </div>
      ) : (
        <div style={styles.form}>
          {/* Toggle audio / vidéo */}
          <div style={styles.typeToggle}>
            <button style={{ ...styles.typeBtn, ...(type === 'audio' ? styles.typeBtnActive : {}) }} onClick={() => { setType('audio'); setError(''); checkRemaining() }}>
              🎵 Audio
            </button>
            <button style={{ ...styles.typeBtn, ...(type === 'video' ? styles.typeBtnActive : {}) }} onClick={() => { setType('video'); setError(''); checkRemaining() }}>
              📹 Vidéo
            </button>
          </div>

          {/* Fichier principal */}
          <div style={styles.section}>
            <div style={styles.label}>{type === 'audio' ? 'Fichier audio' : 'Vidéo'} *</div>
            <input ref={type === 'audio' ? audioInputRef : videoInputRef} type="file"
              accept={type === 'audio' ? '.mp3,.wav,.m4a,.aac,.ogg,.flac' : '.mp4,.mov'}
              style={{ display: 'none' }}
              onChange={type === 'audio' ? handleAudioSelect : handleVideoSelect}
            />
            <div style={styles.dropZone} onClick={() => (type === 'audio' ? audioInputRef : videoInputRef).current?.click()}>
              {(type === 'audio' ? audioFile : videoFile) ? (
                <div style={styles.fileInfo}>
                  <span style={{ fontSize: '24px' }}>{type === 'audio' ? '🎵' : '📹'}</span>
                  <div>
                    <div style={styles.fileName}>{(type === 'audio' ? audioFile : videoFile).name}</div>
                    <div style={styles.fileSize}>{formatBytes((type === 'audio' ? audioFile : videoFile).size)}</div>
                  </div>
                  <button style={styles.removeBtn} onClick={e => { e.stopPropagation(); type === 'audio' ? setAudioFile(null) : setVideoFile(null) }}>✕</button>
                </div>
              ) : (
                <div style={styles.dropHint}>
                  <span style={{ fontSize: '32px' }}>{type === 'audio' ? '🎵' : '📹'}</span>
                  <span style={styles.dropText}>Appuie pour choisir</span>
                  <span style={styles.dropSub}>{type === 'audio' ? `MP3, WAV, M4A... max ${MAX_AUDIO_MB} Mo` : `MP4 H.264 max ${MAX_VIDEO_MB} Mo`}</span>
                </div>
              )}
            </div>
          </div>

          {/* Cover */}
          <div style={styles.section}>
            <div style={styles.label}>Cover {type === 'audio' ? '(recommandé)' : '(optionnel)'}</div>
            <input ref={coverRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleCoverSelect} />
            <div style={styles.coverRow}>
              <div style={styles.coverPreview} onClick={() => coverRef.current?.click()}>
                {coverPreview ? <img src={coverPreview} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '10px' }} alt="" /> : <span style={{ fontSize: '28px' }}>🖼️</span>}
              </div>
              <div>
                <p style={{ fontFamily: "'Inter',sans-serif", fontSize: '13px', color: '#aaa', margin: '0 0 4px' }}>Image carrée recommandée</p>
                <p style={{ fontFamily: "'Inter',sans-serif", fontSize: '11px', color: '#555', margin: '0 0 8px' }}>Auto-compressée en WebP</p>
                <button style={styles.coverBtn} onClick={() => coverRef.current?.click()}>Choisir une image</button>
              </div>
            </div>
          </div>

          {/* Titre */}
          <div style={styles.section}>
            <div style={styles.label}>Titre *</div>
            <input style={styles.input} placeholder="Nom de ta track..." value={title} onChange={e => setTitle(e.target.value)} maxLength={100} />
          </div>

          {/* Genre */}
          <div style={styles.section}>
            <div style={styles.label}>Genre *</div>
            <div style={styles.genreGrid}>
              {GENRES.map(g => (
                <button key={g} style={{ ...styles.genreChip, ...(genre === g ? styles.genreChipActive : {}) }} onClick={() => setGenre(g)}>{g}</button>
              ))}
            </div>
          </div>

          {error && <div style={styles.error}>{error}</div>}

          {uploading && (
            <div style={styles.progressWrap}>
              <div style={styles.progressBar}>
                <div style={{ ...styles.progressFill, width: `${progress}%` }} />
              </div>
              <span style={styles.progressLabel}>{progress}% — Upload en cours...</span>
            </div>
          )}

          <button style={{ ...styles.submitBtn, opacity: uploading ? 0.6 : 1 }} onClick={handleUpload} disabled={uploading}>
            {uploading ? '⏳ Upload en cours...' : '🚀 Publier'}
          </button>

          {type === 'video' && (
            <div style={styles.infoBox}>
              <p style={styles.infoText}>💡 Vidéo non compatible ? Convertis avec <strong>HandBrake</strong> (PC) ou <strong>CapCut</strong> (mobile) en MP4 H.264, 1080p max.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', background: '#090909', paddingBottom: '100px' },
  center: { minHeight: '100vh', background: '#090909', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '20px', textAlign: 'center' },
  centerPad: { padding: '40px 20px' },
  header: { padding: '56px 16px 0 16px', paddingBottom: '8px', display: 'flex', flexDirection: 'column', gap: '8px' },
  pageTitle: { fontFamily: "'Space Grotesk',sans-serif", fontSize: '24px', fontWeight: 700, color: '#fff', margin: 0, letterSpacing: '0.1em' },
  limitBadge: { background: 'rgba(0,255,135,0.08)', border: '1px solid rgba(0,255,135,0.2)', borderRadius: '8px', padding: '6px 12px', fontFamily: "'Inter',sans-serif", fontSize: '12px', color: '#00FF87', alignSelf: 'flex-start' },
  limitBadgeWarn: { background: 'rgba(255,165,0,0.08)', border: '1px solid rgba(255,165,0,0.3)', color: '#FFA500' },
  form: { padding: '16px', display: 'flex', flexDirection: 'column', gap: '20px' },
  typeToggle: { display: 'flex', background: '#111', border: '1px solid #222', borderRadius: '12px', overflow: 'hidden' },
  typeBtn: { flex: 1, padding: '12px', background: 'transparent', border: 'none', color: '#666', fontSize: '14px', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, cursor: 'pointer' },
  typeBtnActive: { background: 'rgba(0,255,135,0.1)', color: '#00FF87' },
  section: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontFamily: "'Space Grotesk',sans-serif", fontSize: '11px', fontWeight: 700, color: '#555', letterSpacing: '0.1em' },
  dropZone: { background: '#111', border: '2px dashed #222', borderRadius: '14px', padding: '28px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  dropHint: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' },
  dropText: { fontFamily: "'Space Grotesk',sans-serif", fontSize: '14px', fontWeight: 600, color: '#aaa' },
  dropSub: { fontFamily: "'Inter',sans-serif", fontSize: '12px', color: '#555' },
  fileInfo: { display: 'flex', alignItems: 'center', gap: '12px', width: '100%' },
  fileName: { fontFamily: "'Space Grotesk',sans-serif", fontSize: '13px', fontWeight: 600, color: '#fff', wordBreak: 'break-all' },
  fileSize: { fontFamily: "'Inter',sans-serif", fontSize: '11px', color: '#666', marginTop: '2px' },
  removeBtn: { marginLeft: 'auto', background: 'transparent', border: 'none', color: '#ff6b6b', fontSize: '16px', cursor: 'pointer', flexShrink: 0 },
  coverRow: { display: 'flex', gap: '16px', alignItems: 'center' },
  coverPreview: { width: '80px', height: '80px', borderRadius: '10px', background: '#1a1a1a', border: '1px dashed #222', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', flexShrink: 0 },
  coverBtn: { background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px', padding: '6px 14px', color: '#ccc', fontSize: '12px', fontFamily: "'Inter',sans-serif", cursor: 'pointer' },
  input: { background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '12px 16px', color: '#fff', fontSize: '14px', fontFamily: "'Inter',sans-serif", outline: 'none', width: '100%', boxSizing: 'border-box' },
  genreGrid: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
  genreChip: { background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '20px', padding: '7px 16px', color: '#888', fontSize: '13px', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, cursor: 'pointer' },
  genreChipActive: { background: 'rgba(0,255,135,0.1)', border: '1px solid #00FF87', color: '#00FF87' },
  error: { background: 'rgba(255,60,60,0.08)', border: '1px solid rgba(255,60,60,0.25)', borderRadius: '10px', padding: '12px 16px', color: '#ff6b6b', fontSize: '13px', fontFamily: "'Inter',sans-serif" },
  progressWrap: { display: 'flex', flexDirection: 'column', gap: '8px' },
  progressBar: { height: '4px', background: '#1a1a1a', borderRadius: '4px', overflow: 'hidden' },
  progressFill: { height: '100%', background: 'linear-gradient(90deg, #00FF87, #7B2FBE)', borderRadius: '4px', transition: 'width 0.4s ease' },
  progressLabel: { fontFamily: "'Inter',sans-serif", fontSize: '12px', color: '#666', textAlign: 'center' },
  submitBtn: { background: '#00FF87', color: '#000', border: 'none', borderRadius: '12px', padding: '15px', fontSize: '16px', fontWeight: 700, fontFamily: "'Space Grotesk',sans-serif", cursor: 'pointer' },
  infoBox: { background: 'rgba(123,47,190,0.08)', border: '1px solid rgba(123,47,190,0.2)', borderRadius: '10px', padding: '12px 16px' },
  infoText: { fontFamily: "'Inter',sans-serif", fontSize: '12px', color: '#888', margin: 0, lineHeight: 1.6 },
  msg: { color: '#888', fontFamily: "'Inter',sans-serif", fontSize: '15px', margin: 0 },
  btn: { background: '#00FF87', color: '#000', border: 'none', borderRadius: '12px', padding: '13px 28px', fontSize: '15px', fontWeight: 700, fontFamily: "'Space Grotesk',sans-serif", cursor: 'pointer' },
  btnSecondary: { background: '#1a1a1a', color: '#fff', border: '1px solid #222', borderRadius: '12px', padding: '12px 28px', fontSize: '15px', fontFamily: "'Space Grotesk',sans-serif", cursor: 'pointer' },
  successTitle: { fontFamily: "'Space Grotesk',sans-serif", fontSize: '24px', fontWeight: 700, color: '#fff' },
}
