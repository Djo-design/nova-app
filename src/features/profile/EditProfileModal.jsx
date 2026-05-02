// src/features/profile/EditProfileModal.jsx
import { useState, useRef } from 'react'
import { supabase } from '@/shared/lib/supabase'
import { useAuth } from '@/features/auth/AuthContext'

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

export function EditProfileModal({ profile, onClose, onSaved }) {
  const { user, refetchProfile } = useAuth()
  const avatarRef = useRef(null)

  const [name, setName]           = useState(profile?.username || '')
  const [bio, setBio]             = useState(profile?.bio || '')
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(profile?.avatar_url || null)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')

  async function handleAvatarSelect(e) {
    const file = e.target.files[0]
    if (!file) return
    const compressed = await compressAvatar(file)
    setAvatarFile(compressed)
    setAvatarPreview(URL.createObjectURL(compressed))
  }

  async function save() {
    if (!name.trim()) { setError('Le pseudo est requis'); return }
    setSaving(true); setError('')
    try {
      let avatarUrl = profile?.avatar_url
      if (avatarFile) {
        const path = `${user.id}/avatar.webp`
        await supabase.storage.from('avatars').upload(path, avatarFile, { upsert: true, contentType: 'image/webp' })
        const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
        avatarUrl = publicUrl + '?t=' + Date.now()
      }
      const { error: e } = await supabase
        .from('profiles')
        .update({ username: name.trim(), bio: bio.trim(), avatar_url: avatarUrl })
        .eq('id', user.id)
      if (e) throw e
      await refetchProfile()
      onSaved?.({ username: name.trim(), bio: bio.trim(), avatar_url: avatarUrl })
      onClose()
    } catch (e) {
      setError(e.message || 'Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.sheet} onClick={e => e.stopPropagation()}>
        <div style={s.handle} />
        <div style={s.header}>
          <span style={s.title}>Modifier le profil</span>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Avatar */}
        <input ref={avatarRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarSelect} />
        <div style={s.avatarSection}>
          <div style={s.avatar} onClick={() => avatarRef.current?.click()}>
            {avatarPreview
              ? <img src={avatarPreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
              : <span style={{ fontSize: '32px' }}>👤</span>}
            <div style={s.avatarOverlay}>📷</div>
          </div>
          <span style={s.avatarHint}>Changer la photo</span>
        </div>

        {error && <div style={s.error}>{error}</div>}

        <div style={s.form}>
          <div style={s.field}>
            <label style={s.label}>Pseudo</label>
            <input style={s.input} value={name} onChange={e => setName(e.target.value)} maxLength={30} />
          </div>
          <div style={s.field}>
            <label style={s.label}>Bio</label>
            <textarea
              style={{ ...s.input, height: '90px', resize: 'none' }}
              value={bio}
              onChange={e => setBio(e.target.value)}
              maxLength={160}
              placeholder="Présente-toi en quelques mots..."
            />
            <span style={s.counter}>{bio.length}/160</span>
          </div>
        </div>

        <button style={{ ...s.saveBtn, opacity: saving ? 0.6 : 1 }} onClick={save} disabled={saving}>
          {saving ? 'Sauvegarde...' : 'Sauvegarder'}
        </button>
      </div>

      <style>{`
        @keyframes slideUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
      `}</style>
    </div>
  )
}

const s = {
  overlay: { position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'flex-end' },
  sheet: { width: '100%', background: '#111', borderRadius: '20px 20px 0 0', padding: '0 16px 32px', animation: 'slideUp 0.3s ease', paddingBottom: 'calc(32px + env(safe-area-inset-bottom, 0px))' },
  handle: { width: '36px', height: '4px', background: '#333', borderRadius: '4px', margin: '12px auto' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' },
  title: { fontFamily: "'Space Grotesk',sans-serif", fontSize: '17px', fontWeight: 700, color: '#fff' },
  closeBtn: { background: 'none', border: 'none', color: '#666', fontSize: '18px', cursor: 'pointer' },
  avatarSection: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', marginBottom: '20px' },
  avatar: { width: '80px', height: '80px', borderRadius: '50%', background: '#1a1a1a', border: '2px solid #00FF87', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative' },
  avatarOverlay: { position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' },
  avatarHint: { fontFamily: "'Inter',sans-serif", fontSize: '12px', color: '#555' },
  error: { background: 'rgba(255,60,60,0.08)', border: '1px solid rgba(255,60,60,0.25)', borderRadius: '10px', padding: '10px 14px', color: '#ff6b6b', fontSize: '13px', fontFamily: "'Inter',sans-serif", marginBottom: '12px' },
  form: { display: 'flex', flexDirection: 'column', gap: '14px' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontFamily: "'Space Grotesk',sans-serif", fontSize: '11px', fontWeight: 700, color: '#555', letterSpacing: '0.1em' },
  input: { background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '11px 14px', color: '#fff', fontSize: '14px', fontFamily: "'Inter',sans-serif", outline: 'none', width: '100%', boxSizing: 'border-box' },
  counter: { fontFamily: "'Inter',sans-serif", fontSize: '11px', color: '#444', alignSelf: 'flex-end' },
  saveBtn: { width: '100%', background: '#00FF87', color: '#000', border: 'none', borderRadius: '12px', padding: '14px', fontSize: '15px', fontWeight: 700, fontFamily: "'Space Grotesk',sans-serif", cursor: 'pointer', marginTop: '20px' },
}
