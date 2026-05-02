// src/features/profile/ProfilePage.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/shared/lib/supabase'
import { useAuth } from '@/features/auth/AuthContext'
import { ProfileStats }    from './ProfileStats'
import { ProfileTabs }     from './ProfileTabs'
import { EditProfileModal } from './EditProfileModal'
import { SettingsPanel }   from './SettingsPanel'

export function ProfilePage() {
  const { user, profile, role, isArtist, isAdmin } = useAuth()
  const navigate = useNavigate()

  const [mode, setMode]               = useState(isArtist ? 'artist' : 'user')
  const [stats, setStats]             = useState({ likes: 0, followers: 0, plays: 0 })
  const [bioExpanded, setBioExpanded] = useState(false)
  const [showEdit, setShowEdit]       = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [localProfile, setLocalProfile] = useState(null)
  const [copied, setCopied]           = useState(false)

  useEffect(() => {
    setLocalProfile(profile)
  }, [profile])

  useEffect(() => {
    if (user) fetchStats()
  }, [user])

  useEffect(() => {
    if (isArtist) setMode('artist')
  }, [isArtist])

  async function fetchStats() {
    const [
      { count: likes },
      { count: followers },
      { count: plays },
    ] = await Promise.all([
      supabase.from('likes').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('artist_id', user.id),
      supabase.from('plays').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    ])
    setStats({ likes: likes || 0, followers: followers || 0, plays: plays || 0 })
  }

  async function shareProfile() {
    const url = `${window.location.origin}/artist/${user?.id}`
    try {
      if (navigator.share) {
        await navigator.share({ title: localProfile?.username, url })
      } else {
        await navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch {}
  }

  function onSaved(updated) {
    setLocalProfile(prev => ({ ...prev, ...updated }))
  }

  if (!user) return (
    <div style={s.center}>
      <span style={{ fontSize: '48px' }}>🎵</span>
      <p style={s.centerMsg}>Connecte-toi pour accéder à ton profil</p>
      <button style={s.btn} onClick={() => navigate('/login')}>Se connecter</button>
      <button style={s.btnOutline} onClick={() => navigate('/register')}>Créer un compte</button>
    </div>
  )

  const bio = localProfile?.bio || ''
  const bioShort = bio.length > 100

  return (
    <div style={s.page}>

      {/* Header */}
      <div style={s.header}>
        {/* Icones haut droite */}
        <div style={s.topIcons}>
          <button style={s.iconBtn} onClick={() => navigate('/notifications')} title="Notifications">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 2a7 7 0 0 0-7 7v4l-2 3h18l-2-3V9a7 7 0 0 0-7-7z" stroke="#888" strokeWidth="1.5"/>
              <path d="M10 19a2 2 0 0 0 4 0" stroke="#888" strokeWidth="1.5"/>
            </svg>
          </button>
          <button style={s.iconBtn} onClick={() => setShowSettings(true)} title="Paramètres">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="3" stroke="#888" strokeWidth="1.5"/>
              <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="#888" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Avatar avec glow animé */}
        <div style={s.avatarWrap}>
          <div style={s.avatarGlow} />
          <div style={s.avatar}>
            {localProfile?.avatar_url
              ? <img src={localProfile.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
              : <span style={{ fontSize: '40px' }}>👤</span>}
          </div>
        </div>

        {/* Badge rôle */}
        <div style={s.badges}>
          {isAdmin  && <span style={s.badgeAdmin}>👑 ADMIN</span>}
          {isArtist && !isAdmin && <span style={s.badgeArtist}>🎤 ARTISTE</span>}
          {!isArtist && !isAdmin && <span style={s.badgeMember}>MEMBRE</span>}
        </div>

        {/* Nom */}
        <h2 style={s.username}>{localProfile?.username || 'Utilisateur'}</h2>
        <p style={s.handle}>@{(localProfile?.username || 'user').toLowerCase().replace(/\s/g, '')}</p>

        {/* Bio */}
        {bio.length > 0 && (
          <div style={s.bioWrap}>
            <p style={s.bio}>
              {bioShort && !bioExpanded ? bio.slice(0, 100) + '...' : bio}
            </p>
            {bioShort && (
              <button style={s.bioToggle} onClick={() => setBioExpanded(e => !e)}>
                {bioExpanded ? 'Voir moins' : 'Voir plus'}
              </button>
            )}
          </div>
        )}

        {/* Boutons actions */}
        <div style={s.actionsRow}>
          <button style={s.editBtn} onClick={() => setShowEdit(true)}>
            ✏️ Modifier
          </button>
          <button style={{ ...s.shareBtn, ...(copied ? s.shareBtnCopied : {}) }} onClick={shareProfile}>
            {copied ? '✓ Copié !' : '📤 Partager'}
          </button>
        </div>

        {/* Toggle User / Artiste */}
        {isArtist && (
          <div style={s.modeToggle}>
            <button style={{ ...s.modeBtn, ...(mode === 'user' ? s.modeBtnActive : {}) }} onClick={() => setMode('user')}>
              👤 Utilisateur
            </button>
            <button style={{ ...s.modeBtn, ...(mode === 'artist' ? s.modeBtnActive : {}) }} onClick={() => setMode('artist')}>
              🎤 Artiste
            </button>
          </div>
        )}

        {/* Stats */}
        <ProfileStats likes={stats.likes} followers={stats.followers} plays={stats.plays} />
      </div>

      {/* Devenir artiste si pas encore artiste */}
      {!isArtist && (
        <div style={s.becomeArtistBanner}>
          <p style={s.bannerText}>Tu es musicien ? Partage ta musique sur NOVA</p>
          <button style={s.bannerBtn} onClick={() => navigate('/become-artist')}>
            🎤 Devenir artiste
          </button>
        </div>
      )}

      {/* Admin link */}
      {isAdmin && (
        <div style={{ padding: '0 16px 8px' }}>
          <button style={s.adminBtn} onClick={() => navigate('/admin')}>👑 Panel Admin</button>
        </div>
      )}

      {/* Tabs */}
      <ProfileTabs isArtist={mode === 'artist' && isArtist} userId={user.id} />

      {/* Modals */}
      {showEdit && (
        <EditProfileModal
          profile={localProfile}
          onClose={() => setShowEdit(false)}
          onSaved={onSaved}
        />
      )}
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}

      <style>{`
        @keyframes glowPulse {
          0%,100% { box-shadow: 0 0 12px rgba(0,255,135,0.35), 0 0 28px rgba(0,255,135,0.12); }
          50%      { box-shadow: 0 0 22px rgba(0,255,135,0.65), 0 0 50px rgba(0,255,135,0.25); }
        }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>
    </div>
  )
}

const s = {
  page: { minHeight: '100vh', background: '#090909', paddingBottom: '100px' },

  center: { minHeight: '100vh', background: '#090909', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '14px', padding: '20px', textAlign: 'center' },
  centerMsg: { color: '#888', fontFamily: "'Inter',sans-serif", fontSize: '15px', margin: 0 },
  btn: { background: '#00FF87', color: '#000', border: 'none', borderRadius: '12px', padding: '13px 32px', fontSize: '15px', fontWeight: 700, fontFamily: "'Space Grotesk',sans-serif", cursor: 'pointer' },
  btnOutline: { background: 'transparent', color: '#00FF87', border: '1px solid #00FF87', borderRadius: '12px', padding: '12px 32px', fontSize: '15px', fontFamily: "'Space Grotesk',sans-serif", cursor: 'pointer' },

  header: { padding: '56px 16px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', position: 'relative' },

  topIcons: { position: 'absolute', top: '56px', right: '16px', display: 'flex', gap: '8px' },
  iconBtn: { background: '#1a1a1a', border: '1px solid #222', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },

  avatarWrap: { position: 'relative', width: '96px', height: '96px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  avatarGlow: { position: 'absolute', inset: '-6px', borderRadius: '50%', animation: 'glowPulse 2.5s ease-in-out infinite' },
  avatar: { position: 'relative', width: '90px', height: '90px', borderRadius: '50%', background: '#1a1a1a', border: '2.5px solid #00FF87', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' },

  badges: { display: 'flex', gap: '6px' },
  badgeArtist: { background: 'rgba(0,255,135,0.1)', border: '1px solid rgba(0,255,135,0.3)', borderRadius: '20px', padding: '3px 12px', fontSize: '11px', color: '#00FF87', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700 },
  badgeAdmin:  { background: 'rgba(255,60,60,0.12)', border: '1px solid rgba(255,60,60,0.3)', borderRadius: '20px', padding: '3px 12px', fontSize: '11px', color: '#ff6b6b', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700 },
  badgeMember: { background: 'rgba(255,255,255,0.05)', border: '1px solid #222', borderRadius: '20px', padding: '3px 12px', fontSize: '11px', color: '#555', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700 },

  username: { fontFamily: "'Space Grotesk',sans-serif", fontSize: '22px', fontWeight: 700, color: '#fff', margin: 0 },
  handle: { fontFamily: "'Inter',sans-serif", fontSize: '13px', color: '#555', margin: 0 },

  bioWrap: { maxWidth: '300px', textAlign: 'center' },
  bio: { fontFamily: "'Inter',sans-serif", fontSize: '13px', color: '#aaa', lineHeight: 1.6, margin: 0 },
  bioToggle: { background: 'none', border: 'none', color: '#00FF87', fontSize: '12px', fontFamily: "'Inter',sans-serif", cursor: 'pointer', padding: '4px 0' },

  actionsRow: { display: 'flex', gap: '10px' },
  editBtn: { background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '20px', padding: '9px 18px', color: '#fff', fontSize: '13px', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, cursor: 'pointer' },
  shareBtn: { background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '20px', padding: '9px 18px', color: '#fff', fontSize: '13px', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' },
  shareBtnCopied: { background: 'rgba(0,255,135,0.1)', border: '1px solid #00FF87', color: '#00FF87' },

  modeToggle: { display: 'flex', background: '#111', border: '1px solid #1a1a1a', borderRadius: '12px', overflow: 'hidden', width: '100%', maxWidth: '300px' },
  modeBtn: { flex: 1, background: 'transparent', border: 'none', padding: '10px', color: '#666', fontSize: '13px', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' },
  modeBtnActive: { background: 'rgba(0,255,135,0.1)', color: '#00FF87' },

  becomeArtistBanner: { margin: '0 16px 16px', background: 'linear-gradient(135deg, rgba(0,255,135,0.06), rgba(123,47,190,0.06))', border: '1px solid rgba(0,255,135,0.15)', borderRadius: '14px', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' },
  bannerText: { fontFamily: "'Inter',sans-serif", fontSize: '13px', color: '#aaa', margin: 0, flex: 1 },
  bannerBtn: { background: '#00FF87', color: '#000', border: 'none', borderRadius: '10px', padding: '9px 14px', fontSize: '12px', fontWeight: 700, fontFamily: "'Space Grotesk',sans-serif", cursor: 'pointer', flexShrink: 0 },

  adminBtn: { width: '100%', background: 'rgba(255,60,60,0.08)', border: '1px solid rgba(255,60,60,0.2)', borderRadius: '12px', padding: '12px', color: '#ff6b6b', fontSize: '14px', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, cursor: 'pointer' },
}
