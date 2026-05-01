// src/features/upload/UploadPage.jsx
import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/shared/lib/supabase'
import { useAuth } from '@/features/auth/AuthContext'

const GENRES = ['Rap', 'R&B', 'Afro', 'Pop', 'Trap', 'Soul', 'Electronic', 'Jazz', 'Autre']
const MAX_AUDIO_MB = 25
const MAX_VIDEO_MB = 100
const MAX_UPLOADS_PER_DAY = 5

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`
}

// Compression cover en WebP via canvas
async function compressCover(file) {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const size = Math.min(img.width, img.height, 800)
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      // Centre le crop
      const sx = (img.width - size) / 2
      const sy = (img.height - size) / 2
      ctx.drawImage(img, sx, sy, size, size, 0, 0, size, size)
      URL.revokeObjectURL(url)
      canvas.toBlob(blob => resolve(blob), 'image/webp', 0.85)
    }
    img.src = url
  })
}

export function UploadPage() {
  const { user, isArtist } = useAuth()
  const navigate = useNavigate()
  const audioRef = useRef(null)
  const coverRef = useRef(null)

  const [type, setType] = useState('audio') // 'audio' | 'video'
  const [title, setTitle] = useState('')
  const [genre, setGenre] = useState('')
  const [audioFile, setAudioFile] = useState(null)
  const [videoFile, setVideoFile] = useState(null)
  const [coverFile, setCoverFile] = useState(null)
  const [coverPreview, setCoverPreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  if (!user) return (
    <div style={styles.center}>
      <p style={styles.msg}>Connecte-toi pour uploader</p>
      <button style={styles.btn} onClick={() => navigate('/login')}>Se connecter</button>
    </div>
  )

  if (!isArtist) return (
    <div style={styles.center}>
      <span style={{ fontSize: '48px' }}>🎤</span>
      <p style={styles.msg}>Tu dois être artiste pour uploader du contenu</p>
      <button style={styles.btn} onClick={() => navigate('/profile')}>Devenir artiste</button>
    </div>
  )

  function handleAudioSelect(e) {
    const file = e.target.files[0]
    if (!file) return
    const ext = file.name.split('.').pop().toLowerCase()
    const allowed = ['mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac']
    if (!allowed.includes(ext)) { setError(`Format audio non supporté. Acceptés : ${allowed.join(', ')}`); return }
    if (file.size > MAX_AUDIO_MB * 1024 * 1024) { setError(`Fichier trop lourd (max ${MAX_AUDIO_MB} Mo)`); return }
    setError('')
    setAudioFile(file)
    // Auto-remplir le titre si vide
    if (!title) setTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '))
  }

  function handleVideoSelect(e) {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > MAX_VIDEO_MB * 1024 * 1024) { setError(`Vidéo trop lourde (max ${MAX_VIDEO_MB} Mo). Utilise HandBrake ou CapCut pour compresser.`); return }
    const validTypes = ['video/mp4', 'video/quicktime']
    if (!validTypes.includes(file.type)) { setError('Format vidéo non supporté. Utilise MP4 H.264.'); return }
    setError('')
    setVideoFile(file)
    if (!title) setTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '))
  }

  function handleCoverSelect(e) {
    const file = e.target.files[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('La cover doit être une image'); return }
    setCoverFile(file)
    setCoverPreview(URL.createObjectURL(file))
  }

  async function checkDailyLimit() {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const table = type === 'audio' ? 'tracks' : 'videos'
    const { count } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
      .eq('artist_id', user.id)
      .gte('created_at', today.toISOString())
    return count >= MAX_UPLOADS_PER_DAY
  }

  async function handleUpload() {
    setError('')
    if (!title.trim()) { setError('Donne un titre à ta track'); return }
    if (!genre) { setError('Choisis un genre'); return }
    if (type === 'audio' && !audioFile) { setError('Sélectionne un fichier audio'); return }
    if (type === 'video' && !videoFile) { setError('Sélectionne une vidéo'); return }

    setUploading(true)
    setProgress(5)

    try {
      // Vérif limite quotidienne
      const limited = await checkDailyLimit()
      if (limited) { setError(`Limite de ${MAX_UPLOADS_PER_DAY} uploads/jour atteinte. Reviens demain !`); setUploading(false); return }

      setProgress(15)

      let coverUrl = null
      // Upload cover si fournie
      if (coverFile) {
        setProgress(20)
        const compressed = await compressCover(coverFile)
        const coverPath = `${user.id}/${Date.now()}.webp`
        const { error: coverErr } = await supabase.storage.from('covers').upload(coverPath, compressed, { contentType: 'image/webp' })
        if (coverErr) throw coverErr
        const { data: { publicUrl } } = supabase.storage.from('covers').getPublicUrl(coverPath)
        coverUrl = publicUrl
        setProgress(35)
      }

      let mediaUrl = null
      let duration = null

      if (type === 'audio') {
        // Durée audio
        try {
          duration = await getAudioDuration(audioFile)
        } catch {}

        setProgress(40)
        const audioPath = `${user.id}/${Date.now()}_${audioFile.name}`
        const { error: audioErr } = await supabase.storage.from('audio').upload(audioPath, audioFile, {
          contentType: audioFile.type,
        })
        if (audioErr) throw audioErr
        const { data: { publicUrl } } = supabase.storage.from('audio').getPublicUrl(audioPath)
        mediaUrl = publicUrl
        setProgress(75)

        // Insert en DB
        const { error: dbErr } = await supabase.from('tracks').insert({
          artist_id: user.id,
          title: title.trim(),
          genre,
          audio_url: mediaUrl,
          cover_url: coverUrl,
          duration,
        })
        if (dbErr) throw dbErr

      } else {
        // Vidéo
        setProgress(40)
        const videoPath = `${user.id}/${Date.now()}_${videoFile.name}`
        const { error: videoErr } = await supabase.storage.from('video').upload(videoPath, videoFile, {
          contentType: videoFile.type,
        })
        if (videoErr) throw videoErr
        const { data: { publicUrl } } = supabase.storage.from('video').getPublicUrl(videoPath)
        mediaUrl = publicUrl
        setProgress(80)

        const { error: dbErr } = await supabase.from('videos').insert({
          artist_id: user.id,
          title: title.trim(),
          genre,
          video_url: mediaUrl,
          thumb_url: coverUrl,
        })
        if (dbErr) throw dbErr
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

  function getAudioDuration(file) {
    return new Promise((resolve, reject) => {
      const audio = document.createElement('audio')
      audio.src = URL.createObjectURL(file)
      audio.onloadedmetadata = () => { resolve(Math.round(audio.duration)); URL.revokeObjectURL(audio.src) }
      audio.onerror = reject
    })
  }

  function reset() {
    setTitle(''); setGenre(''); setAudioFile(null); setVideoFile(null)
    setCoverFile(null); setCoverPreview(null); setDone(false); setProgress(0); setError('')
  }

  if (done) return (
    <div style={styles.center}>
      <div style={styles.successIcon}>✅</div>
      <h2 style={styles.successTitle}>Upload réussi !</h2>
      <p style={styles.msg}>Ton contenu est en ligne 🔥</p>
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button style={styles.btn} onClick={reset}>Uploader un autre</button>
        <button style={{ ...styles.btn, background: '#1a1a1a', color: '#fff' }} onClick={() => navigate('/radio')}>Voir la Radio</button>
      </div>
    </div>
  )

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.pageTitle}>UPLOAD</h1>
        <p style={styles.sub}>Max {MAX_UPLOADS_PER_DAY} uploads/jour</p>
      </div>

      <div style={styles.form}>
        {/* Type audio / vidéo */}
        <div style={styles.typeToggle}>
          <button style={{ ...styles.typeBtn, ...(type === 'audio' ? styles.typeBtnActive : {}) }} onClick={() => setType('audio')}>
            🎵 Audio
          </button>
          <button style={{ ...styles.typeBtn, ...(type === 'video' ? styles.typeBtnActive : {}) }} onClick={() => setType('video')}>
            📹 Vidéo
          </button>
        </div>

        {/* Fichier principal */}
        <div style={styles.section}>
          <div style={styles.label}>{type === 'audio' ? 'Fichier audio' : 'Fichier vidéo'} *</div>
          <input
            ref={type === 'audio' ? audioRef : undefined}
            type="file"
            accept={type === 'audio' ? '.mp3,.wav,.m4a,.aac,.ogg,.flac' : '.mp4,.mov'}
            style={{ display: 'none' }}
            onChange={type === 'audio' ? handleAudioSelect : handleVideoSelect}
          />
          <div
            style={styles.dropZone}
            onClick={() => (type === 'audio' ? audioRef : coverRef).current?.click()}
          >
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
                <span style={styles.dropText}>Appuie pour choisir ton fichier</span>
                <span style={styles.dropSub}>{type === 'audio' ? `MP3, WAV, M4A... — max ${MAX_AUDIO_MB} Mo` : `MP4 H.264 — max ${MAX_VIDEO_MB} Mo`}</span>
              </div>
            )}
          </div>
          {/* Input vidéo séparé */}
          {type === 'video' && (
            <input
              type="file"
              accept=".mp4,.mov"
              style={{ display: 'none' }}
              ref={ref => ref && !videoFile && ref.addEventListener('change', handleVideoSelect, { once: true })}
              id="video-input"
            />
          )}
        </div>

        {/* Cover */}
        <div style={styles.section}>
          <div style={styles.label}>Cover {type === 'audio' ? '(recommandé)' : '(optionnel)'}</div>
          <input ref={coverRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleCoverSelect} />
          <div style={styles.coverRow}>
            <div style={styles.coverPreview} onClick={() => coverRef.current?.click()}>
              {coverPreview
                ? <img src={coverPreview} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '10px' }} alt="" />
                : <span style={{ fontSize: '28px' }}>🖼️</span>}
            </div>
            <div style={styles.coverHint}>
              <p style={styles.coverHintText}>Image carrée recommandée</p>
              <p style={styles.coverHintSub}>Sera compressée en WebP automatiquement</p>
              <button style={styles.coverBtn} onClick={() => coverRef.current?.click()}>Choisir une image</button>
            </div>
          </div>
        </div>

        {/* Titre */}
        <div style={styles.section}>
          <div style={styles.label}>Titre *</div>
          <input
            style={styles.input}
            placeholder="Nom de ta track..."
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={100}
          />
        </div>

        {/* Genre */}
        <div style={styles.section}>
          <div style={styles.label}>Genre *</div>
          <div style={styles.genreGrid}>
            {GENRES.map(g => (
              <button
                key={g}
                style={{ ...styles.genreChip, ...(genre === g ? styles.genreChipActive : {}) }}
                onClick={() => setGenre(g)}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Erreur */}
        {error && <div style={styles.error}>{error}</div>}

        {/* Progress */}
        {uploading && (
          <div style={styles.progressWrap}>
            <div style={styles.progressBar}>
              <div style={{ ...styles.progressFill, width: `${progress}%` }} />
            </div>
            <span style={styles.progressLabel}>{progress}% — Upload en cours...</span>
          </div>
        )}

        {/* Submit */}
        <button
          style={{ ...styles.submitBtn, opacity: uploading ? 0.6 : 1 }}
          onClick={handleUpload}
          disabled={uploading}
        >
          {uploading ? '⏳ Upload en cours...' : '🚀 Publier'}
        </button>

        {/* Info vidéo */}
        {type === 'video' && (
          <div style={styles.infoBox}>
            <p style={styles.infoText}>
              💡 Vidéo non conforme ? Convertis-la gratuitement avec <strong>HandBrake</strong> (PC) ou <strong>CapCut</strong> (mobile) en MP4 H.264, 1080p max.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', background: '#090909', paddingBottom: '100px' },
  center: { minHeight: '100vh', background: '#090909', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px', padding: '20px', textAlign: 'center' },
  header: { padding: '60px 20px 0', paddingBottom: '8px' },
  pageTitle: { fontFamily: "'Space Grotesk',sans-serif", fontSize: '24px', fontWeight: 700, color: '#fff', margin: '0 0 4px', letterSpacing: '0.1em' },
  sub: { fontFamily: "'Inter',sans-serif", fontSize: '12px', color: '#555', margin: 0 },
  form: { padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '24px' },
  typeToggle: { display: 'flex', gap: '0', background: '#111', border: '1px solid #222', borderRadius: '12px', overflow: 'hidden' },
  typeBtn: { flex: 1, padding: '12px', background: 'transparent', border: 'none', color: '#666', fontSize: '14px', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' },
  typeBtnActive: { background: 'rgba(0,255,135,0.1)', color: '#00FF87' },
  section: { display: 'flex', flexDirection: 'column', gap: '10px' },
  label: { fontFamily: "'Space Grotesk',sans-serif", fontSize: '12px', fontWeight: 700, color: '#666', letterSpacing: '0.1em' },
  dropZone: { background: '#111', border: '2px dashed #2a2a2a', borderRadius: '14px', padding: '28px 20px', cursor: 'pointer', transition: 'border-color 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  dropHint: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' },
  dropText: { fontFamily: "'Space Grotesk',sans-serif", fontSize: '14px', fontWeight: 600, color: '#aaa' },
  dropSub: { fontFamily: "'Inter',sans-serif", fontSize: '12px', color: '#555' },
  fileInfo: { display: 'flex', alignItems: 'center', gap: '12px', width: '100%' },
  fileName: { fontFamily: "'Space Grotesk',sans-serif", fontSize: '13px', fontWeight: 600, color: '#fff', wordBreak: 'break-all' },
  fileSize: { fontFamily: "'Inter',sans-serif", fontSize: '11px', color: '#666', marginTop: '2px' },
  removeBtn: { marginLeft: 'auto', background: 'transparent', border: 'none', color: '#ff6b6b', fontSize: '16px', cursor: 'pointer', padding: '4px', flexShrink: 0 },
  coverRow: { display: 'flex', gap: '16px', alignItems: 'center' },
  coverPreview: { width: '80px', height: '80px', borderRadius: '10px', background: '#1a1a1a', border: '1px dashed #2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer', overflow: 'hidden' },
  coverHint: { display: 'flex', flexDirection: 'column', gap: '4px' },
  coverHintText: { fontFamily: "'Inter',sans-serif", fontSize: '13px', color: '#aaa', margin: 0 },
  coverHintSub: { fontFamily: "'Inter',sans-serif", fontSize: '11px', color: '#555', margin: 0 },
  coverBtn: { background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px', padding: '6px 14px', color: '#ccc', fontSize: '12px', fontFamily: "'Inter',sans-serif", cursor: 'pointer', marginTop: '4px', width: 'fit-content' },
  input: { background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '12px 16px', color: '#fff', fontSize: '14px', fontFamily: "'Inter',sans-serif", outline: 'none', width: '100%', boxSizing: 'border-box' },
  genreGrid: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
  genreChip: { background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '20px', padding: '7px 16px', color: '#888', fontSize: '13px', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, cursor: 'pointer' },
  genreChipActive: { background: 'rgba(0,255,135,0.1)', border: '1px solid #00FF87', color: '#00FF87' },
  error: { background: 'rgba(255,60,60,0.08)', border: '1px solid rgba(255,60,60,0.25)', borderRadius: '10px', padding: '12px 16px', color: '#ff6b6b', fontSize: '13px', fontFamily: "'Inter',sans-serif" },
  progressWrap: { display: 'flex', flexDirection: 'column', gap: '8px' },
  progressBar: { height: '4px', background: '#1a1a1a', borderRadius: '4px', overflow: 'hidden' },
  progressFill: { height: '100%', background: 'linear-gradient(90deg, #00FF87, #7B2FBE)', borderRadius: '4px', transition: 'width 0.4s ease' },
  progressLabel: { fontFamily: "'Inter',sans-serif", fontSize: '12px', color: '#666', textAlign: 'center' },
  submitBtn: { background: '#00FF87', color: '#000', border: 'none', borderRadius: '12px', padding: '15px', fontSize: '16px', fontWeight: 700, fontFamily: "'Space Grotesk',sans-serif", cursor: 'pointer', letterSpacing: '0.05em' },
  infoBox: { background: 'rgba(123,47,190,0.08)', border: '1px solid rgba(123,47,190,0.2)', borderRadius: '10px', padding: '12px 16px' },
  infoText: { fontFamily: "'Inter',sans-serif", fontSize: '12px', color: '#888', margin: 0, lineHeight: 1.6 },
  msg: { fontFamily: "'Inter',sans-serif", fontSize: '15px', color: '#888' },
  btn: { background: '#00FF87', color: '#000', border: 'none', borderRadius: '10px', padding: '12px 28px', fontSize: '15px', fontWeight: 700, fontFamily: "'Space Grotesk',sans-serif", cursor: 'pointer' },
  successIcon: { fontSize: '56px' },
  successTitle: { fontFamily: "'Space Grotesk',sans-serif", fontSize: '24px', fontWeight: 700, color: '#fff' },
}
