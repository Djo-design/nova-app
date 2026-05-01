// src/features/profile/ProfilePage.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/shared/lib/supabase'
import { useAuth } from '@/features/auth/AuthContext'
import { usePlayer } from '@/features/player/PlayerContext'

export function ProfilePage() {
  const { user, profile, role, signOut, isArtist, isAdmin } = useAuth()
  const { playQueue } = usePlayer()
  const navigate = useNavigate()

  const [activeTab, setActiveTab]       = useState(0)
  const [followersCount, setFollowers]  = useState(0)
  const [followingCount, setFollowing]  = useState(0)
  const [likesCount, setLikes]          = useState(0)
  const [favorites, setFavorites]       = useState([])
  const [history, setHistory]           = useState([])
  const [playlists, setPlaylists]       = useState([])
  const [loadingTab, setLoadingTab]     = useState(false)

  useEffect(() => {
    if (!user) return
    fetchStats()
  }, [user])

  useEffect(() => {
    if (!user) return
    fetchTabData(activeTab)
  }, [activeTab, user])

  async function fetchStats() {
    const [
      { count: followers },
      { count: following },
      { count: likes },
    ] = await Promise.all([
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('artist_id', user.id),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', user.id),
      supabase.from('likes').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    ])
    setFollowers(followers || 0)
    setFollowing(following || 0)
    setLikes(likes || 0)
  }

  async function fetchTabData(tab) {
    setLoadingTab(true)
    try {
      if (tab === 0) {
        // Favoris : tracks likées
        const { data } = await supabase
          .from('likes')
          .select('target_id, target_type, created_at')
          .eq('user_id', user.id)
          .eq('target_type', 'track')
          .order('created_at', { ascending: false })
          .limit(30)

        if (data?.length) {
          const ids = data.map(d => d.target_id)
          const { data: tracks } = await supabase
            .from('tracks')
            .select('*, profiles(username)')
            .in('id', ids)
          setFavorites(tracks || [])
        } else {
          setFavorites([])
        }
      }

      if (tab === 1) {
        // Historique : dernières plays
        const { data } = await supabase
          .from('plays')
          .select('track_id, played_at, tracks(id, title, profiles(username), cover_url)')
          .eq('user_id', user.id)
          .order('played_at', { ascending: false })
          .limit(30)
        setHistory(data || [])
      }

      if (tab === 2) {
        // Playlists
        const { data } = await supabase
          .from('playlists')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
        setPlaylists(data || [])
      }
    } catch (e) {
      console.error('fetchTabData error:', e)
    } finally {
      setLoadingTab(false)
    }
  }

  if (!user) return (
    <div style={styles.center}>
      <span style={{ fontSize: '48px' }}>🎵</span>
      <p style={styles.msg}>Connecte-toi pour accéder à ton profil</p>
      <button style={styles.btn} onClick={() => navigate('/login')}>Se connecter</button>
      <button style={styles.btnOutline} onClick={() => navigate('/register')}>Créer un compte</button>
    </div>
  )

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        {/* Avatar avec glow animé */}
        <div style={styles.avatarWrap}>
          <div style={styles.avatarGlow} />
          <div style={styles.avatar}>
            {profile?.avatar_url
              ? <img src={profile.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
              : <span style={{ fontSize: '40px' }}>👤</span>}
          </div>
        </div>

        {/* Badges rôle */}
        <div style={styles.badges}>
          {isArtist && !isAdmin && <span style={styles.badge}>🎤 ARTISTE</span>}
          {isAdmin && <span style={{ ...styles.badge, background: 'rgba(255,60,60,0.12)', color: '#ff6b6b', borderColor: 'rgba(255,60,60,0.3)' }}>👑 ADMIN</span>}
          {!isArtist && !isAdmin && <span style={{ ...styles.badge, background: 'rgba(255,255,255,0.05)', color: '#888', borderColor: '#222' }}>MEMBRE</span>}
        </div>

        {/* Nom — pas d'email affiché */}
        <h2 style={styles.username}>{profile?.username || 'Utilisateur'}</h2>
        {profile?.bio && <p style={styles.bio}>{profile.bio}</p>}

        {/* Stats */}
        <div style={styles.statsBar}>
          <div style={styles.statItem}>
            <span style={styles.statNum}>{likesCount}</span>
            <span style={styles.statLabel}>Likes</span>
          </div>
          <div style={styles.statDiv} />
          <div style={styles.statItem}>
            <span style={styles.statNum}>{followingCount}</span>
            <span style={styles.statLabel}>Abonnements</span>
          </div>
          {isArtist && <>
            <div style={styles.statDiv} />
            <div style={styles.statItem}>
              <span style={styles.statNum}>{followersCount}</span>
              <span style={styles.statLabel}>Abonnés</span>
            </div>
          </>}
        </div>
      </div>

      {/* Actions */}
      <div style={styles.actions}>
        <button style={styles.editBtn} onClick={() => navigate('/profile/edit')}>
          ✏️ Modifier mon profil
        </button>
        {isArtist && <>
          <button style={styles.actionBtn} onClick={() => navigate(`/artist/${user.id}`)}>
            👤 Voir mon profil public
          </button>
          <button style={styles.actionBtn} onClick={() => navigate('/dashboard')}>
            📊 Dashboard artiste
          </button>
        </>}
        {!isArtist && (
          <button style={styles.actionBtnPurple} onClick={() => navigate('/become-artist')}>
            🎤 Devenir artiste
          </button>
        )}
        {isAdmin && (
          <button style={styles.adminBtn} onClick={() => navigate('/admin')}>
            👑 Panel Admin
          </button>
        )}
        <button style={styles.signOutBtn} onClick={handleSignOut}>Déconnexion</button>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        {['❤️ Favoris', '🕐 Historique', '🎶 Playlists'].map((t, i) => (
          <button key={i} style={{ ...styles.tab, ...(activeTab === i ? styles.tabActive : {}) }} onClick={() => setActiveTab(i)}>
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={styles.tabContent}>
        {loadingTab ? (
          <div style={styles.empty}>Chargement...</div>
        ) : (
          <>
            {/* FAVORIS */}
            {activeTab === 0 && (
              favorites.length === 0
                ? <div style={styles.empty}>Aucun favori pour l'instant ⭐<br /><span style={{ fontSize: '12px', color: '#444' }}>Like des tracks pour les retrouver ici</span></div>
                : favorites.map((track, i) => (
                  <div key={track.id} style={styles.trackRow} onClick={() => playQueue(favorites, i)}>
                    <div style={styles.trackThumb}>
                      {track.cover_url ? <img src={track.cover_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : '🎵'}
                    </div>
                    <div style={styles.trackInfo}>
                      <div style={styles.trackTitle}>{track.title}</div>
                      <div style={styles.trackArtist}>{track.profiles?.username}</div>
                    </div>
                    <span style={{ fontSize: '16px' }}>▶</span>
                  </div>
                ))
            )}

            {/* HISTORIQUE */}
            {activeTab === 1 && (
              history.length === 0
                ? <div style={styles.empty}>Aucune écoute pour l'instant 🎵<br /><span style={{ fontSize: '12px', color: '#444' }}>Lance une track pour voir ton historique</span></div>
                : history.map((play, i) => (
                  <div key={i} style={styles.trackRow}>
                    <div style={styles.trackThumb}>
                      {play.tracks?.cover_url ? <img src={play.tracks.cover_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : '🎵'}
                    </div>
                    <div style={styles.trackInfo}>
                      <div style={styles.trackTitle}>{play.tracks?.title || 'Track supprimée'}</div>
                      <div style={styles.trackArtist}>{play.tracks?.profiles?.username} · {new Date(play.played_at).toLocaleDateString('fr-FR')}</div>
                    </div>
                  </div>
                ))
            )}

            {/* PLAYLISTS */}
            {activeTab === 2 && (
              playlists.length === 0
                ? <div style={styles.empty}>Aucune playlist 🎶<br /><span style={{ fontSize: '12px', color: '#444' }}>Fonctionnalité bientôt disponible</span></div>
                : playlists.map(pl => (
                  <div key={pl.id} style={styles.trackRow}>
                    <div style={{ ...styles.trackThumb, fontSize: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🎵</div>
                    <div style={styles.trackInfo}>
                      <div style={styles.trackTitle}>{pl.name}</div>
                    </div>
                  </div>
                ))
            )}
          </>
        )}
      </div>

      <style>{`
        @keyframes glowPulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
        }
      `}</style>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', background: '#090909', paddingBottom: '160px' },
  center: { minHeight: '100vh', background: '#090909', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '14px', padding: '20px', textAlign: 'center' },
  msg: { color: '#888', fontFamily: "'Inter',sans-serif", fontSize: '15px', margin: 0 },
  btn: { background: '#00FF87', color: '#000', border: 'none', borderRadius: '12px', padding: '13px 32px', fontSize: '15px', fontWeight: 700, fontFamily: "'Space Grotesk',sans-serif", cursor: 'pointer' },
  btnOutline: { background: 'transparent', color: '#00FF87', border: '1px solid #00FF87', borderRadius: '12px', padding: '12px 32px', fontSize: '15px', fontFamily: "'Space Grotesk',sans-serif", cursor: 'pointer' },
  header: { padding: '60px 20px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' },
  avatarWrap: { position: 'relative', width: '90px', height: '90px' },
  avatarGlow: { position: 'absolute', inset: '-6px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,255,135,0.3) 0%, transparent 70%)', animation: 'glowPulse 2.5s ease-in-out infinite' },
  avatar: { position: 'relative', width: '90px', height: '90px', borderRadius: '50%', background: '#1a1a1a', border: '2px solid #00FF87', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  badges: { display: 'flex', gap: '6px' },
  badge: { background: 'rgba(0,255,135,0.1)', border: '1px solid rgba(0,255,135,0.3)', borderRadius: '20px', padding: '3px 12px', fontSize: '11px', color: '#00FF87', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700 },
  username: { fontFamily: "'Space Grotesk',sans-serif", fontSize: '22px', fontWeight: 700, color: '#fff', margin: 0 },
  bio: { fontFamily: "'Inter',sans-serif", fontSize: '13px', color: '#888', margin: 0, maxWidth: '280px', textAlign: 'center', lineHeight: 1.5 },
  statsBar: { display: 'flex', alignItems: 'center', background: '#111', border: '1px solid #1a1a1a', borderRadius: '14px', padding: '14px 24px', gap: '20px', width: '100%', maxWidth: '340px' },
  statItem: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' },
  statNum: { fontFamily: "'Space Grotesk',sans-serif", fontSize: '20px', fontWeight: 700, color: '#fff' },
  statLabel: { fontFamily: "'Inter',sans-serif", fontSize: '10px', color: '#555' },
  statDiv: { width: '1px', height: '30px', background: '#222' },
  actions: { padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '8px' },
  editBtn: { background: '#00FF87', color: '#000', border: 'none', borderRadius: '12px', padding: '13px', fontSize: '14px', fontWeight: 700, fontFamily: "'Space Grotesk',sans-serif", cursor: 'pointer' },
  actionBtn: { background: 'rgba(0,255,135,0.06)', border: '1px solid rgba(0,255,135,0.15)', borderRadius: '12px', padding: '12px', color: '#00FF87', fontSize: '14px', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, cursor: 'pointer' },
  actionBtnPurple: { background: 'rgba(123,47,190,0.08)', border: '1px solid rgba(123,47,190,0.2)', borderRadius: '12px', padding: '12px', color: '#a87bd4', fontSize: '14px', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, cursor: 'pointer' },
  adminBtn: { background: 'rgba(255,60,60,0.08)', border: '1px solid rgba(255,60,60,0.2)', borderRadius: '12px', padding: '12px', color: '#ff6b6b', fontSize: '14px', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, cursor: 'pointer' },
  signOutBtn: { background: 'transparent', border: '1px solid #1a1a1a', borderRadius: '12px', padding: '12px', color: '#555', fontSize: '14px', fontFamily: "'Inter',sans-serif", cursor: 'pointer' },
  tabs: { display: 'flex', marginTop: '20px', borderBottom: '1px solid #1a1a1a', position: 'sticky', top: 0, background: 'rgba(9,9,9,0.95)', backdropFilter: 'blur(12px)', zIndex: 10 },
  tab: { flex: 1, background: 'none', border: 'none', padding: '12px 4px', color: '#555', fontSize: '12px', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, cursor: 'pointer', borderBottom: '2px solid transparent' },
  tabActive: { color: '#00FF87', borderBottomColor: '#00FF87' },
  tabContent: { padding: '12px 16px' },
  empty: { textAlign: 'center', color: '#555', fontFamily: "'Inter',sans-serif", fontSize: '14px', padding: '40px 20px', lineHeight: 1.8 },
  trackRow: { display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 8px', borderRadius: '10px', cursor: 'pointer', borderBottom: '1px solid #111' },
  trackThumb: { width: '44px', height: '44px', borderRadius: '8px', background: '#1a1a1a', overflow: 'hidden', flexShrink: 0, fontSize: '20px' },
  trackInfo: { flex: 1, minWidth: 0 },
  trackTitle: { fontFamily: "'Space Grotesk',sans-serif", fontSize: '14px', fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  trackArtist: { fontFamily: "'Inter',sans-serif", fontSize: '11px', color: '#666', marginTop: '2px' },
}
