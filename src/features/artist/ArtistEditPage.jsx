// src/features/artist/ArtistEditPage.jsx
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/shared/lib/supabase'
import { useAuth } from '@/features/auth/AuthContext'

const GENRES = ['Rap', 'R&B', 'Afro', 'Pop', 'Trap', 'Soul', 'Electronic', 'Jazz', 'Drill', 'Gospel', 'Reggae', 'Autre']
const PLATFORMS = [
  { value: 'youtube_channel', label: 'YouTube', placeholder: 'https://youtube.com/@machaîne' },
  { value: 'spotify', label: 'Spotify', placeholder: 'https://open.spotify.com/artist/...' },
  { value: 'deezer', label: 'Deezer', placeholder: 'https://www.deezer.com/fr/artist/...' },
  { value: 'tiktok', label: 'TikTok', placeholder: 'https://www.tiktok.com/@...' },
  { value: 'instagram', label: 'Instagram', placeholder: 'https://www.instagram.com/...' },
  { value: 'facebook', label: 'Facebook', placeholder: 'https://www.facebook.com/...' },
  { value: 'other', label: 'Autre lien', placeholder: 'https://...' },
]

// Regex validation par plateforme
const URL_PATTERNS = {
  youtube_channel: /youtube\.com\/@?[\w-]+/,
  spotify: /open\.spotify\.com\/artist\//,
  deezer: /deezer\.com\/.*artist\//,
  tiktok: /tiktok\.com\/@[\w.]+/,
  instagram: /instagram\.com\/[\w.]+/,
  facebook: /facebook\.com\/[\w.]+/,
  other: /^https?:\/\/.+\..+/,
}

const YT_VIDEO_REGEX = /(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]{11})/

function extractYouTubeId(url) {
  const m = url.match(YT_VIDEO_REGEX)
  return m ? m[1] : null
}

function compressAvatar(file) {
  return new Promise(resolve => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = 400; canvas.height = 400
      const ctx = canvas.getContext('2d')
      const size = Math.min(img.width, img.height)
      const sx = (img.width - size) / 2, sy = (img.height - size) / 2
      ctx.drawImage(img, sx, sy, size, size, 0, 0, 400, 400)
      URL.revokeObjectURL(url)
      canvas.toBlob(blob => resolve(blob), 'image/webp', 0.85)
    }
    img.src = url
  })
}

export function ArtistEditPage() {
  const { user, profile: authProfile, refetchProfile } = useAuth()
  const navigate = useNavigate()
  const avatarRef = useRef(null)

  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [fullBio, setFullBio] = useState('')
  const [country, setCountry] = useState('')
  const [genres, setGenres] = useState([])
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [avatarFile, setAvatarFile] = useState(null)

  // Liens externes
  const [links, setLinks] = useState([])
  const [newLink, setNewLink] = useState({ platform: 'instagram', url: '', label: '' })
  const [linkError, setLinkError] = useState('')

  // Vidéos YouTube
  const [ytVideos, setYtVideos] = useState([])
  const [newYtUrl, setNewYtUrl] = useState('')
  const [newYtTitle, setNewYtTitle] = useState('')
  const [ytError, setYtError] = useState('')

  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [activeSection, setActiveSection] = useState('profil')

  useEffect(() => { if (user) fetchData() }, [user])

  async function fetchData() {
    const [{ data: prof }, { data: artProf }, { data: lnks }, { data: yts }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('artist_profiles').select('*').eq('user_id', user.id).single(),
      supabase.from('artist_external_links').select('*').eq('artist_id', user.id).order('sort_order'),
      supabase.from('artist_youtube_videos').select('*').eq('artist_id', user.id).order('sort_order'),
    ])
    setUsername(prof?.username || '')
    setBio(prof?.bio || '')
    setAvatarPreview(prof?.avatar_url || null)
    setFullBio(artProf?.full_bio || '')
    setCountry(artProf?.country || '')
    setGenres(artProf?.genres || [])
    setLinks(lnks || [])
    setYtVideos(yts || [])
  }

  function toggleGenre(g) {
    setGenres(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g])
  }

  async function handleAvatarSelect(e) {
    const file = e.target.files[0]
    if (!file || !file.type.startsWith('image/')) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  async function saveProfile() {
    setSaving(true)
    setSaveMsg('')
    try {
      let avatarUrl = avatarPreview

      // Upload avatar si changé
      if (avatarFile) {
        const compressed = await compressAvatar(avatarFile)
        const path = `${user.id}/avatar.webp`
        await supabase.storage.from('avatars').upload(path, compressed, { contentType: 'image/webp', upsert: true })
        const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
        avatarUrl = publicUrl + `?t=${Date.now()}`
      }

      // Update profil
      await supabase.from('profiles').update({ username: username.trim(), bio: bio.trim(), avatar_url: avatarUrl }).eq('id', user.id)

      // Upsert profil artiste
      await supabase.from('artist_profiles').upsert({
        user_id: user.id,
        full_bio: fullBio.trim(),
        country: country.trim(),
        genres,
      })

      await refetchProfile?.()
      setSaveMsg('✅ Profil sauvegardé !')
      setTimeout(() => setSaveMsg(''), 3000)
    } catch (e) {
      setSaveMsg('❌ Erreur : ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  // Liens externes
  function validateLink(platform, url) {
    const pattern = URL_PATTERNS[platform]
    return pattern?.test(url)
  }

  async function addLink() {
    setLinkError('')
    if (!newLink.url.trim()) { setLinkError('Entre une URL'); return }
    if (!validateLink(newLink.platform, newLink.url)) {
      setLinkError(`URL invalide pour ${PLATFORMS.find(p => p.value === newLink.platform)?.label}`)
      return
    }
    const { data, error } = await supabase.from('artist_external_links').insert({
      artist_id: user.id,
      platform: newLink.platform,
      url: newLink.url.trim(),
      label: newLink.label.trim() || null,
      sort_order: links.length,
    }).select().single()
    if (error) { setLinkError(error.message); return }
    setLinks(prev => [...prev, data])
    setNewLink({ platform: 'instagram', url: '', label: '' })
  }

  async function removeLink(id) {
    await supabase.from('artist_external_links').delete().eq('id', id)
    setLinks(prev => prev.filter(l => l.id !== id))
  }

  // YouTube videos
  async function addYtVideo() {
    setYtError('')
    if (ytVideos.length >= 20) { setYtError('Maximum 20 vidéos YouTube'); return }
    const ytId = extractYouTubeId(newYtUrl)
    if (!ytId) { setYtError("URL YouTube invalide. Ex : https://youtube.com/watch?v=XXXX"); return }
    const thumb = `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`
    const { data, error } = await supabase.from('artist_youtube_videos').insert({
      artist_id: user.id,
      youtube_id: ytId,
      title: newYtTitle.trim() || null,
      thumbnail_url: thumb,
      sort_order: ytVideos.length,
    }).select().single()
    if (error) { setYtError(error.message); return }
    setYtVideos(prev => [...prev, data])
    setNewYtUrl(''); setNewYtTitle('')
  }

  async function removeYtVideo(id) {
    await supabase.from('artist_youtube_videos').delete().eq('id', id)
    setYtVideos(prev => prev.filter(v => v.id !== id))
  }

  const SECTIONS = ['profil', 'genres', 'liens', 'youtube']

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate(`/artist/${user?.id}`)}>←</button>
        <h1 style={styles.title}>Modifier le profil</h1>
        <div style={{ width: 36 }} />
      </div>

      {/* Navigation sections */}
      <div style={styles.sectionNav}>
        {SECTIONS.map(s => (
          <button key={s} style={{ ...styles.sectionBtn, ...(activeSection === s ? styles.sectionBtnActive : {}) }} onClick={() => setActiveSection(s)}>
            {s === 'profil' ? '👤 Profil' : s === 'genres' ? '🎵 Genres' : s === 'liens' ? '🔗 Liens' : '▶ YouTube'}
          </button>
        ))}
      </div>

      <div style={styles.content}>

        {/* SECTION PROFIL */}
        {activeSection === 'profil' && (
          <div style={styles.section}>
            {/* Avatar */}
            <div style={styles.avatarSection}>
              <input ref={avatarRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarSelect} />
              <div style={styles.avatarPreview} onClick={() => avatarRef.current?.click()}>
                {avatarPreview
                  ? <img src={avatarPreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                  : <span style={{ fontSize: '40px' }}>👤</span>}
                <div style={styles.avatarOverlay}>📷</div>
              </div>
              <p style={styles.avatarHint}>Appuie pour changer la photo</p>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Pseudo *</label>
              <input style={styles.input} value={username} onChange={e => setUsername(e.target.value)} maxLength={30} />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Bio courte (affichée partout)</label>
              <textarea style={styles.textarea} rows={2} value={bio} onChange={e => setBio(e.target.value)} maxLength={160} placeholder="En quelques mots..." />
              <span style={styles.charCount}>{bio.length}/160</span>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Bio complète (page artiste)</label>
              <textarea style={styles.textarea} rows={5} value={fullBio} onChange={e => setFullBio(e.target.value)} maxLength={1000} placeholder="Parle de toi, ton histoire, ta musique..." />
              <span style={styles.charCount}>{fullBio.length}/1000</span>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Pays / Ville</label>
              <input style={styles.input} value={country} onChange={e => setCountry(e.target.value)} placeholder="Ex : Paris, France" maxLength={50} />
            </div>

            {saveMsg && <div style={saveMsg.startsWith('✅') ? styles.success : styles.error}>{saveMsg}</div>}
            <button style={styles.saveBtn} onClick={saveProfile} disabled={saving}>
              {saving ? '⏳ Sauvegarde...' : '💾 Sauvegarder le profil'}
            </button>
          </div>
        )}

        {/* SECTION GENRES */}
        {activeSection === 'genres' && (
          <div style={styles.section}>
            <p style={styles.hint}>Sélectionne jusqu'à 3 genres qui te représentent</p>
            <div style={styles.genreGrid}>
              {GENRES.map(g => (
                <button
                  key={g}
                  style={{ ...styles.genreChip, ...(genres.includes(g) ? styles.genreChipActive : {}), ...(genres.length >= 3 && !genres.includes(g) ? { opacity: 0.4 } : {}) }}
                  onClick={() => toggleGenre(g)}
                  disabled={genres.length >= 3 && !genres.includes(g)}
                >
                  {g}
                </button>
              ))}
            </div>
            <button style={styles.saveBtn} onClick={saveProfile} disabled={saving}>
              {saving ? '⏳...' : '💾 Sauvegarder'}
            </button>
          </div>
        )}

        {/* SECTION LIENS */}
        {activeSection === 'liens' && (
          <div style={styles.section}>
            {/* Liens existants */}
            {links.map(link => (
              <div key={link.id} style={styles.linkRow}>
                <span style={styles.linkPlatform}>{PLATFORMS.find(p => p.value === link.platform)?.label}</span>
                <span style={styles.linkUrlShort}>{link.url.slice(0, 28)}...</span>
                <button style={styles.removeBtn} onClick={() => removeLink(link.id)}>✕</button>
              </div>
            ))}

            {/* Ajouter un lien */}
            <div style={styles.addLinkBox}>
              <p style={styles.addLinkTitle}>Ajouter un lien</p>
              <select style={styles.select} value={newLink.platform} onChange={e => setNewLink(l => ({ ...l, platform: e.target.value }))}>
                {PLATFORMS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
              <input
                style={styles.input}
                placeholder={PLATFORMS.find(p => p.value === newLink.platform)?.placeholder}
                value={newLink.url}
                onChange={e => setNewLink(l => ({ ...l, url: e.target.value }))}
              />
              <input
                style={styles.input}
                placeholder="Label personnalisé (optionnel)"
                value={newLink.label}
                onChange={e => setNewLink(l => ({ ...l, label: e.target.value }))}
              />
              {linkError && <div style={styles.error}>{linkError}</div>}
              <button style={styles.addBtn} onClick={addLink}>+ Ajouter</button>
            </div>
          </div>
        )}

        {/* SECTION YOUTUBE */}
        {activeSection === 'youtube' && (
          <div style={styles.section}>
            <p style={styles.hint}>Ajoute tes vidéos YouTube à ton profil ({ytVideos.length}/20)</p>

            {/* Vidéos existantes */}
            {ytVideos.map(v => (
              <div key={v.id} style={styles.ytRow}>
                <img src={v.thumbnail_url} style={styles.ytThumb} alt="" />
                <div style={styles.ytInfo}>
                  <div style={styles.ytTitle}>{v.title || v.youtube_id}</div>
                  <div style={styles.ytId}>ID: {v.youtube_id}</div>
                </div>
                <button style={styles.removeBtn} onClick={() => removeYtVideo(v.id)}>✕</button>
              </div>
            ))}

            {/* Ajouter une vidéo */}
            <div style={styles.addLinkBox}>
              <p style={styles.addLinkTitle}>Ajouter une vidéo YouTube</p>
              <input
                style={styles.input}
                placeholder="https://youtube.com/watch?v=... ou youtu.be/..."
                value={newYtUrl}
                onChange={e => setNewYtUrl(e.target.value)}
              />
              <input
                style={styles.input}
                placeholder="Titre de la vidéo (optionnel)"
                value={newYtTitle}
                onChange={e => setNewYtTitle(e.target.value)}
              />
              {/* Prévisualisation si URL valide */}
              {extractYouTubeId(newYtUrl) && (
                <img
                  src={`https://img.youtube.com/vi/${extractYouTubeId(newYtUrl)}/mqdefault.jpg`}
                  style={{ width: '100%', borderRadius: '8px', marginTop: '8px' }}
                  alt="Aperçu"
                />
              )}
              {ytError && <div style={styles.error}>{ytError}</div>}
              <button style={styles.addBtn} onClick={addYtVideo}>+ Ajouter la vidéo</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', background: '#090909', paddingBottom: '100px' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '56px 16px 16px' },
  backBtn: { background: 'none', border: 'none', color: '#fff', fontSize: '22px', cursor: 'pointer', padding: '4px 8px' },
  title: { fontFamily: "'Space Grotesk',sans-serif", fontSize: '20px', fontWeight: 700, color: '#fff', margin: 0 },
  sectionNav: { display: 'flex', gap: '8px', padding: '0 16px 16px', overflowX: 'auto' },
  sectionBtn: { background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '20px', padding: '7px 14px', color: '#888', fontSize: '12px', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' },
  sectionBtnActive: { background: 'rgba(0,255,135,0.1)', border: '1px solid #00FF87', color: '#00FF87' },
  content: { padding: '0 16px' },
  section: { display: 'flex', flexDirection: 'column', gap: '16px' },
  avatarSection: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' },
  avatarPreview: { width: '100px', height: '100px', borderRadius: '50%', background: '#1a1a1a', border: '3px solid #00FF87', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative' },
  avatarOverlay: { position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', opacity: 0 },
  avatarHint: { fontFamily: "'Inter',sans-serif", fontSize: '12px', color: '#555', margin: 0 },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontFamily: "'Space Grotesk',sans-serif", fontSize: '12px', fontWeight: 700, color: '#666', letterSpacing: '0.08em' },
  input: { background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '12px 14px', color: '#fff', fontSize: '14px', fontFamily: "'Inter',sans-serif", outline: 'none', width: '100%', boxSizing: 'border-box' },
  textarea: { background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '12px 14px', color: '#fff', fontSize: '14px', fontFamily: "'Inter',sans-serif", outline: 'none', width: '100%', boxSizing: 'border-box', resize: 'vertical' },
  charCount: { fontFamily: "'Inter',sans-serif", fontSize: '11px', color: '#444', textAlign: 'right' },
  hint: { fontFamily: "'Inter',sans-serif", fontSize: '13px', color: '#666', margin: 0 },
  genreGrid: { display: 'flex', flexWrap: 'wrap', gap: '10px' },
  genreChip: { background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '20px', padding: '8px 18px', color: '#888', fontSize: '13px', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, cursor: 'pointer' },
  genreChipActive: { background: 'rgba(0,255,135,0.1)', border: '1px solid #00FF87', color: '#00FF87' },
  saveBtn: { background: '#00FF87', color: '#000', border: 'none', borderRadius: '12px', padding: '14px', fontSize: '15px', fontWeight: 700, fontFamily: "'Space Grotesk',sans-serif", cursor: 'pointer' },
  success: { background: 'rgba(0,255,135,0.1)', border: '1px solid rgba(0,255,135,0.3)', borderRadius: '10px', padding: '10px 14px', color: '#00FF87', fontSize: '13px', fontFamily: "'Inter',sans-serif" },
  error: { background: 'rgba(255,60,60,0.08)', border: '1px solid rgba(255,60,60,0.25)', borderRadius: '10px', padding: '10px 14px', color: '#ff6b6b', fontSize: '13px', fontFamily: "'Inter',sans-serif" },
  linkRow: { display: 'flex', alignItems: 'center', gap: '10px', background: '#111', border: '1px solid #1a1a1a', borderRadius: '10px', padding: '10px 14px' },
  linkPlatform: { fontFamily: "'Space Grotesk',sans-serif", fontSize: '13px', fontWeight: 700, color: '#00FF87', width: '80px', flexShrink: 0 },
  linkUrlShort: { flex: 1, fontFamily: "'Inter',sans-serif", fontSize: '12px', color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  removeBtn: { background: 'transparent', border: 'none', color: '#ff6b6b', fontSize: '16px', cursor: 'pointer', padding: '4px', flexShrink: 0 },
  addLinkBox: { background: '#111', border: '1px solid #1a1a1a', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' },
  addLinkTitle: { fontFamily: "'Space Grotesk',sans-serif", fontSize: '13px', fontWeight: 700, color: '#888', margin: 0, letterSpacing: '0.05em' },
  select: { background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '12px 14px', color: '#fff', fontSize: '14px', fontFamily: "'Inter',sans-serif", outline: 'none', width: '100%' },
  addBtn: { background: 'rgba(0,255,135,0.1)', border: '1px solid rgba(0,255,135,0.2)', borderRadius: '10px', padding: '11px', color: '#00FF87', fontSize: '14px', fontWeight: 700, fontFamily: "'Space Grotesk',sans-serif", cursor: 'pointer' },
  ytRow: { display: 'flex', alignItems: 'center', gap: '12px', background: '#111', border: '1px solid #1a1a1a', borderRadius: '10px', padding: '10px' },
  ytThumb: { width: '80px', height: '45px', borderRadius: '6px', objectFit: 'cover', flexShrink: 0 },
  ytInfo: { flex: 1, minWidth: 0 },
  ytTitle: { fontFamily: "'Space Grotesk',sans-serif", fontSize: '13px', fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  ytId: { fontFamily: "'Inter',sans-serif", fontSize: '11px', color: '#555', marginTop: '2px' },
}
