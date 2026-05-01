// src/features/profile/EditProfilePage.jsx
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/shared/lib/supabase'
import { useAuth } from '@/features/auth/AuthContext'

const GENRES = ['Rap', 'R&B', 'Afro', 'Pop', 'Trap', 'Soul', 'Electronic', 'Jazz', 'Autre']
const PLATFORMS = [
  { value: 'youtube_channel', label: 'YouTube (chaîne)', placeholder: 'https://youtube.com/@ta-chaine' },
  { value: 'spotify',         label: 'Spotify',          placeholder: 'https://open.spotify.com/artist/...' },
  { value: 'deezer',          label: 'Deezer',           placeholder: 'https://deezer.com/artist/...' },
  { value: 'tiktok',          label: 'TikTok',           placeholder: 'https://tiktok.com/@ton-pseudo' },
  { value: 'instagram',       label: 'Instagram',        placeholder: 'https://instagram.com/ton-pseudo' },
  { value: 'facebook',        label: 'Facebook',         placeholder: 'https://facebook.com/ta-page' },
  { value: 'other',           label: 'Autre lien',       placeholder: 'https://...' },
]

const YT_REGEX = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/

function extractYouTubeId(url) {
  const m = url.match(YT_REGEX)
  return m ? m[1] : null
}

export function EditProfilePage() {
  const { user, profile, isArtist, refetchProfile } = useAuth()
  const navigate = useNavigate()
  const avatarRef = useRef(null)

  // Profil de base
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)

  // Profil artiste
  const [fullBio, setFullBio] = useState('')
  const [country, setCountry] = useState('')
  const [selectedGenres, setSelectedGenres] = useState([])

  // Liens externes
  const [links, setLinks] = useState([])
  const [newLinkPlatform, setNewLinkPlatform] = useState('instagram')
  const [newLinkUrl, setNewLinkUrl] = useState('')
  const [newLinkLabel, setNewLinkLabel] = useState('')

  // YouTube videos
  const [ytVideos, setYtVideos] = useState([])
  const [newYtUrl, setNewYtUrl] = useState('')
  const [newYtTitle, setNewYtTitle] = useState('')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [activeSection, setActiveSection] = useState('base') // 'base' | 'artist' | 'links' | 'youtube'

  useEffect(() => {
    if (!user) return
    setUsername(profile?.username || '')
    setBio(profile?.bio || '')
    setAvatarPreview(profile?.avatar_url || null)
    fetchArtistData()
  }, [user, profile])

  async function fetchArtistData() {
    if (!user) return
    const [{ data: ap }, { data: lnks }, { data: yts }] = await Promise.all([
      supabase.from('artist_profiles').select('*').eq('user_id', user.id).single(),
      supabase.from('artist_external_links').select('*').eq('artist_id', user.id).order('sort_order'),
      supabase.from('artist_youtube_videos').select('*').eq('artist_id', user.id).order('sort_order'),
    ])
    if (ap) {
      setFullBio(ap.full_bio || '')
      setCountry(ap.country || '')
      setSelectedGenres(ap.genres || [])
    }
    setLinks(lnks || [])
    setYtVideos(yts || [])
  }

  function toggleGenre(g) {
    setSelectedGenres(prev =>
      prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]
    )
  }

  async function handleAvatarSelect(e) {
    const file = e.target.files[0]
    if (!file) return
    // Compression avatar WebP
    const compressed = await compressAvatar(file)
    setAvatarFile(compressed)
    setAvatarPreview(URL.createObjectURL(compressed))
  }

  async function compressAvatar(file) {
    return new Promise(resolve => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = 200; canvas.height = 200
        const ctx = canvas.getContext('2d')
        const size = Math.min(img.width, img.height)
        ctx.drawImage(img, (img.width - size) / 2, (img.height - size) / 2, size, size, 0, 0, 200, 200)
        canvas.toBlob(b => resolve(b), 'image/webp', 0.85)
      }
      img.src = URL.createObjectURL(file)
    })
  }

  async function saveBase() {
    setSaving(true); setError(''); setSuccess('')
    try {
      let avatarUrl = profile?.avatar_url
      if (avatarFile) {
        const path = `${user.id}/avatar.webp`
        await supabase.storage.from('avatars').upload(path, avatarFile, { upsert: true, contentType: 'image/webp' })
        const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
        avatarUrl = publicUrl + '?t=' + Date.now()
      }
      const { error: e } = await supabase.from('profiles').update({ username: username.trim(), bio: bio.trim(), avatar_url: avatarUrl }).eq('id', user.id)
      if (e) throw e
      await refetchProfile()
      setSuccess('Profil mis à jour ✓')
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  async function saveArtist() {
    setSaving(true); setError(''); setSuccess('')
    try {
      const { error: e } = await supabase.from('artist_profiles').upsert({
        user_id: user.id, full_bio: fullBio.trim(),
        country: country.trim(), genres: selectedGenres,
      }, { onConflict: 'user_id' })
      if (e) throw e
      setSuccess('Profil artiste mis à jour ✓')
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  async function addLink() {
    setError('')
    if (!newLinkUrl.trim()) { setError('Entre une URL'); return }
    try { new URL(newLinkUrl) } catch { setError('URL invalide'); return }
    const { data, error: e } = await supabase.from('artist_external_links').insert({
      artist_id: user.id,
      platform: newLinkPlatform,
      url: newLinkUrl.trim(),
      label: newLinkLabel.trim() || null,
      sort_order: links.length,
    }).select().single()
    if (e) { setError(e.message); return }
    setLinks(prev => [...prev, data])
    setNewLinkUrl(''); setNewLinkLabel('')
    setSuccess('Lien ajouté ✓')
  }

  async function removeLink(id) {
    await supabase.from('artist_external_links').delete().eq('id', id)
    setLinks(prev => prev.filter(l => l.id !== id))
  }

  async function addYouTubeVideo() {
    setError('')
    const ytId = extractYouTubeId(newYtUrl)
    if (!ytId) { setError('URL YouTube invalide. Ex: https://youtube.com/watch?v=...'); return }
    if (ytVideos.length >= 20) { setError('Maximum 20 vidéos YouTube'); return }
    const thumbnail = `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`
    const { data, error: e } = await supabase.from('artist_youtube_videos').insert({
      artist_id: user.id,
      youtube_id: ytId,
      title: newYtTitle.trim() || 'Vidéo YouTube',
      thumbnail_url: thumbnail,
      sort_order: ytVideos.length,
    }).select().single()
    if (e) { setError(e.message); return }
    setYtVideos(prev => [...prev, data])
    setNewYtUrl(''); setNewYtTitle('')
    setSuccess('Vidéo YouTube ajoutée ✓')
  }

  async function removeYt(id) {
    await supabase.from('artist_youtube_videos').delete().eq('id', id)
    setYtVideos(prev => prev.filter(v => v.id !== id))
  }

  if (!user) return null

  const sections = [
    { key: 'base', label: '👤 Profil' },
    ...(isArtist ? [
      { key: 'artist', label: '🎤 Artiste' },
      { key: 'links', label: '🔗 Liens' },
      { key: 'youtube', label: '▶ YouTube' },
    ] : []),
  ]

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <button style={styles.back} onClick={() => navigate(-1)}>←</button>
        <h1 style={styles.title}>Modifier mon profil</h1>
        <div style={{ width: 40 }} />
      </div>

      {/* Section nav */}
      <div style={styles.sectionNav}>
        {sections.map(s => (
          <button key={s.key} style={{ ...styles.sectionBtn, ...(activeSection === s.key ? styles.sectionBtnActive : {}) }} onClick={() => { setActiveSection(s.key); setError(''); setSuccess('') }}>
            {s.label}
          </button>
        ))}
      </div>

      <div style={styles.form}>
        {error && <div style={styles.error}>{error}</div>}
        {success && <div style={styles.successMsg}>{success}</div>}

        {/* ── PROFIL DE BASE ── */}
        {activeSection === 'base' && (
          <>
            {/* Avatar */}
            <input ref={avatarRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarSelect} />
            <div style={styles.avatarSection}>
              <div style={styles.avatarWrap} onClick={() => avatarRef.current?.click()}>
                {avatarPreview
                  ? <img src={avatarPreview} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} alt="" />
                  : <span style={{ fontSize: '36px' }}>👤</span>}
                <div style={styles.avatarOverlay}>📷</div>
              </div>
              <p style={styles.avatarHint}>Appuie pour changer</p>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Pseudo</label>
              <input style={styles.input} value={username} onChange={e => setUsername(e.target.value)} maxLength={30} />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Bio courte</label>
              <textarea style={{ ...styles.input, height: '80px', resize: 'none' }} value={bio} onChange={e => setBio(e.target.value)} maxLength={160} placeholder="Présente-toi en quelques mots..." />
              <span style={styles.counter}>{bio.length}/160</span>
            </div>

            <button style={styles.saveBtn} onClick={saveBase} disabled={saving}>
              {saving ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
          </>
        )}

        {/* ── PROFIL ARTISTE ── */}
        {activeSection === 'artist' && isArtist && (
          <>
            <div style={styles.field}>
              <label style={styles.label}>Bio complète</label>
              <textarea style={{ ...styles.input, height: '140px', resize: 'none' }} value={fullBio} onChange={e => setFullBio(e.target.value)} maxLength={1000} placeholder="Raconte ton histoire, ton parcours, ta musique..." />
              <span style={styles.counter}>{fullBio.length}/1000</span>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Pays / Ville</label>
              <input style={styles.input} value={country} onChange={e => setCountry(e.target.value)} placeholder="Ex: Paris, France" />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Genres musicaux</label>
              <div style={styles.genreGrid}>
                {GENRES.map(g => (
                  <button key={g} style={{ ...styles.chip, ...(selectedGenres.includes(g) ? styles.chipActive : {}) }} onClick={() => toggleGenre(g)}>
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <button style={styles.saveBtn} onClick={saveArtist} disabled={saving}>
              {saving ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
          </>
        )}

        {/* ── LIENS EXTERNES ── */}
        {activeSection === 'links' && isArtist && (
          <>
            <div style={styles.field}>
              <label style={styles.label}>Ajouter un lien</label>
              <select style={styles.input} value={newLinkPlatform} onChange={e => setNewLinkPlatform(e.target.value)}>
                {PLATFORMS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
              <input
                style={{ ...styles.input, marginTop: '8px' }}
                value={newLinkUrl}
                onChange={e => setNewLinkUrl(e.target.value)}
                placeholder={PLATFORMS.find(p => p.value === newLinkPlatform)?.placeholder}
              />
              <input
                style={{ ...styles.input, marginTop: '8px' }}
                value={newLinkLabel}
                onChange={e => setNewLinkLabel(e.target.value)}
                placeholder="Label personnalisé (optionnel)"
              />
              <button style={styles.addBtn} onClick={addLink}>+ Ajouter</button>
            </div>

            {/* Liste des liens */}
            {links.length > 0 && (
              <div style={styles.field}>
                <label style={styles.label}>Mes liens ({links.length})</label>
                {links.map(link => (
                  <div key={link.id} style={styles.linkRow}>
                    <div style={styles.linkInfo}>
                      <span style={styles.linkPlatform}>{link.platform}</span>
                      <span style={styles.linkUrl}>{link.url.slice(0, 40)}...</span>
                    </div>
                    <button style={styles.removeBtn} onClick={() => removeLink(link.id)}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── YOUTUBE ── */}
        {activeSection === 'youtube' && isArtist && (
          <>
            <div style={styles.infoBox}>
              <p style={styles.infoText}>💡 Colle des URLs de tes vidéos YouTube. Elles s'afficheront sur ton profil avec miniature. Max 20 vidéos.</p>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>URL YouTube</label>
              <input style={styles.input} value={newYtUrl} onChange={e => setNewYtUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." />
              <input style={{ ...styles.input, marginTop: '8px' }} value={newYtTitle} onChange={e => setNewYtTitle(e.target.value)} placeholder="Titre de la vidéo" />
              <button style={styles.addBtn} onClick={addYouTubeVideo}>+ Ajouter</button>
            </div>

            {ytVideos.length > 0 && (
              <div style={styles.ytGrid}>
                {ytVideos.map(yt => (
                  <div key={yt.id} style={styles.ytCard}>
                    <img src={yt.thumbnail_url} style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '8px 8px 0 0' }} alt="" />
                    <div style={styles.ytInfo}>
                      <span style={styles.ytTitle}>{yt.title}</span>
                      <button style={styles.removeBtn} onClick={() => removeYt(yt.id)}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', background: '#090909', paddingBottom: '100px' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '56px 16px 12px', position: 'sticky', top: 0, background: 'rgba(9,9,9,0.95)', backdropFilter: 'blur(12px)', zIndex: 10 },
  back: { background: 'none', border: 'none', color: '#fff', fontSize: '22px', cursor: 'pointer', padding: '4px 8px' },
  title: { fontFamily: "'Space Grotesk',sans-serif", fontSize: '18px', fontWeight: 700, color: '#fff', margin: 0 },
  sectionNav: { display: 'flex', gap: '8px', padding: '0 16px 12px', overflowX: 'auto' },
  sectionBtn: { background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '20px', padding: '7px 14px', color: '#888', fontSize: '12px', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' },
  sectionBtnActive: { background: 'rgba(0,255,135,0.1)', border: '1px solid #00FF87', color: '#00FF87' },
  form: { padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '16px' },
  error: { background: 'rgba(255,60,60,0.08)', border: '1px solid rgba(255,60,60,0.25)', borderRadius: '10px', padding: '12px 16px', color: '#ff6b6b', fontSize: '13px', fontFamily: "'Inter',sans-serif" },
  successMsg: { background: 'rgba(0,255,135,0.08)', border: '1px solid rgba(0,255,135,0.25)', borderRadius: '10px', padding: '12px 16px', color: '#00FF87', fontSize: '13px', fontFamily: "'Inter',sans-serif" },
  avatarSection: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '8px 0' },
  avatarWrap: { width: '90px', height: '90px', borderRadius: '50%', background: '#1a1a1a', border: '3px solid #00FF87', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative' },
  avatarOverlay: { position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', opacity: 0, transition: 'opacity 0.2s' },
  avatarHint: { fontFamily: "'Inter',sans-serif", fontSize: '12px', color: '#555', margin: 0 },
  field: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontFamily: "'Space Grotesk',sans-serif", fontSize: '11px', fontWeight: 700, color: '#666', letterSpacing: '0.1em' },
  input: { background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '12px 16px', color: '#fff', fontSize: '14px', fontFamily: "'Inter',sans-serif", outline: 'none', width: '100%', boxSizing: 'border-box' },
  counter: { fontFamily: "'Inter',sans-serif", fontSize: '11px', color: '#444', alignSelf: 'flex-end' },
  genreGrid: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
  chip: { background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '20px', padding: '6px 14px', color: '#888', fontSize: '12px', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, cursor: 'pointer' },
  chipActive: { background: 'rgba(0,255,135,0.1)', border: '1px solid #00FF87', color: '#00FF87' },
  saveBtn: { background: '#00FF87', color: '#000', border: 'none', borderRadius: '12px', padding: '14px', fontSize: '15px', fontWeight: 700, fontFamily: "'Space Grotesk',sans-serif", cursor: 'pointer' },
  addBtn: { background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '11px', color: '#00FF87', fontSize: '14px', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, cursor: 'pointer', marginTop: '4px' },
  linkRow: { display: 'flex', alignItems: 'center', gap: '10px', background: '#111', border: '1px solid #1a1a1a', borderRadius: '10px', padding: '10px 12px', marginBottom: '6px' },
  linkInfo: { flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' },
  linkPlatform: { fontFamily: "'Space Grotesk',sans-serif", fontSize: '12px', fontWeight: 700, color: '#00FF87' },
  linkUrl: { fontFamily: "'Inter',sans-serif", fontSize: '11px', color: '#555' },
  removeBtn: { background: 'transparent', border: 'none', color: '#ff6b6b', fontSize: '16px', cursor: 'pointer', padding: '4px', flexShrink: 0 },
  infoBox: { background: 'rgba(123,47,190,0.08)', border: '1px solid rgba(123,47,190,0.2)', borderRadius: '10px', padding: '12px 16px' },
  infoText: { fontFamily: "'Inter',sans-serif", fontSize: '12px', color: '#888', margin: 0, lineHeight: 1.6 },
  ytGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' },
  ytCard: { background: '#111', border: '1px solid #1a1a1a', borderRadius: '10px', overflow: 'hidden' },
  ytInfo: { display: 'flex', alignItems: 'center', gap: '6px', padding: '8px' },
  ytTitle: { fontFamily: "'Inter',sans-serif", fontSize: '11px', color: '#ccc', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
}
