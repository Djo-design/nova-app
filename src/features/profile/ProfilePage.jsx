// src/features/profile/ProfilePage.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/shared/lib/supabase'
import { useAuth } from '@/features/auth/AuthContext'
import { usePlayer } from '@/features/player/PlayerContext'

const TABS = ['❤️ Favoris', '🕐 Historique', '🎶 Playlists']

export function ProfilePage() {
  const { user, profile, role, signOut, isArtist, isAdmin } = useAuth()
  const { playQueue } = usePlayer()
  const navigate = useNavigate()

  const [activeTab, setActiveTab]   = useState(0)
  const [followersCount, setFollowers] = useState(0)
  const [followingCount, setFollowing] = useState(0)
  const [likesCount, setLikes]      = useState(0)
  const [favorites, setFavorites]   = useState([])
  const [history, setHistory]       = useState([])
  const [playlists, setPlaylists]   = useState([])
  const [loadingTab, setLoadingTab] = useState(false)

  // Modal création playlist
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false)
  const [newPlaylistName, setNewPlaylistName]       = useState('')
  const [creatingPlaylist, setCreatingPlaylist]     = useState(false)

  useEffect(() => { if (user) fetchStats() }, [user])
  useEffect(() => { if (user) fetchTabData(activeTab) }, [activeTab, user])

  async function fetchStats() {
    const [{ count: followers }, { count: following }, { count: likes }] = await Promise.all([
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
        const { data: likedIds } = await supabase
          .from('likes').select('target_id').eq('user_id', user.id).eq('target_type', 'track').order('created_at', { ascending: false }).limit(30)
        if (likedIds?.length) {
          const { data: tracks } = await supabase.from('tracks').select('*, profiles(username)').in('id', likedIds.map(l => l.target_id))
          setFavorites(tracks || [])
        } else setFavorites([])
      }
      if (tab === 1) {
        const { data } = await supabase
          .from('plays').select('track_id, played_at, tracks(id, title, cover_url, profiles(username))').eq('user_id', user.id).order('played_at', { ascending: false }).limit(30)
        setHistory(data || [])
      }
      if (tab === 2) {
        const { data } = await supabase.from('playlists').select('*, playlist_tracks(count)').eq('user_id', user.id).order('created_at', { ascending: false })
        setPlaylists(data || [])
      }
    } catch (e) { console.error(e) }
    finally { setLoadingTab(false) }
  }

  async function createPlaylist() {
    if (!newPlaylistName.trim()) return
    setCreatingPlaylist(true)
    const { data, error } = await supabase.from('playlists').insert({ user_id: user.id, name: newPlaylistName.trim() }).select().single()
    if (!error && data) {
      setPlaylists(prev => [data, ...prev])
      setNewPlaylistName('')
      setShowCreatePlaylist(false)
    }
    setCreatingPlaylist(false)
  }

  async function deletePlaylist(id) {
    if (!window.confirm('Supprimer cette playlist ?')) return
    await supabase.from('playlists').delete().eq('id', id).eq('user_id', user.id)
    setPlaylists(prev => prev.filter(p => p.id !== id))
  }

  if (!user) return (
    <div style={styles.center}>
      <span style={{ fontSize: '48px' }}>🎵</span>
      <p style={styles.msg}>Connecte-toi pour accéder à ton profil</p>
      <button style={styles.btn} onClick={() => navigate('/login')}>Se connecter</button>
      <button style={styles.btnOutline} onClick={() => navigate('/register')}>Créer un compte</button>
    </div>
  )

  return (
    <div style={styles.page}>
      <div style={styles.header}>

        {/* Avatar avec glow néon animé */}
        <div style={styles.avatarOuter}>
          <div style={styles.avatarGlowRing} />
          <div style={styles.avatar}>
            {profile?.avatar_url
              ? <img src={profile.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
              : <span style={{ fontSize: '40px' }}>👤</span>}
          </div>
        </div>

        {/* Badges */}
        <div style={styles.badges}>
          {isAdmin  && <span style={styles.badgeAdmin}>👑 ADMIN</span>}
          {isArtist && !isAdmin && <span style={styles.badgeArtist}>🎤 ARTISTE</span>}
          {!isArtist && !isAdmin && <span style={styles.badgeMember}>MEMBRE</span>}
        </div>

        <h2 style={styles.username}>{profile?.username || 'Utilisateur'}</h2>
        {profile?.bio && <p style={styles.bio}>{profile.bio}</p>}

        {/* Stats */}
        <div style={styles.statsBar}>
          <div style={styles.statItem}><span style={styles.statNum}>{likesCount}</span><span style={styles.statLabel}>Likes</span></div>
          <div style={styles.statDiv} />
          <div style={styles.statItem}><span style={styles.statNum}>{followingCount}</span><span style={styles.statLabel}>Abonnements</span></div>
          {isArtist && <><div style={styles.statDiv} /><div style={styles.statItem}><span style={styles.statNum}>{followersCount}</span><span style={styles.statLabel}>Abonnés</span></div></>}
        </div>
      </div>

      {/* Actions */}
      <div style={styles.actions}>
        <button style={styles.editBtn} onClick={() => navigate('/profile/edit')}>✏️ Modifier mon profil</button>
        {isArtist && <>
          <button style={styles.actionBtn} onClick={() => navigate(`/artist/${user.id}`)}>👤 Mon profil public</button>
          <button style={styles.actionBtn} onClick={() => navigate('/dashboard')}>📊 Dashboard</button>
        </>}
        {!isArtist && <button style={styles.actionBtnPurple} onClick={() => navigate('/become-artist')}>🎤 Devenir artiste</button>}
        {isAdmin && <button style={styles.adminBtn} onClick={() => navigate('/admin')}>👑 Panel Admin</button>}
        <button style={styles.signOutBtn} onClick={async () => { await signOut(); navigate('/login') }}>Déconnexion</button>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        {TABS.map((t, i) => (
          <button key={i} style={{ ...styles.tab, ...(activeTab === i ? styles.tabActive : {}) }} onClick={() => setActiveTab(i)}>{t}</button>
        ))}
      </div>

      <div style={styles.tabContent}>
        {loadingTab ? (
          <div style={styles.empty}>Chargement...</div>
        ) : (
          <>
            {/* FAVORIS */}
            {activeTab === 0 && (
              favorites.length === 0
                ? <div style={styles.empty}>❤️ Like des tracks pour les retrouver ici</div>
                : favorites.map((track, i) => (
                  <div key={track.id} style={styles.row} onClick={() => playQueue(favorites, i)}>
                    <div style={styles.thumb}>{track.cover_url ? <img src={track.cover_url} style={styles.thumbImg} alt="" /> : '🎵'}</div>
                    <div style={styles.rowInfo}>
                      <div style={styles.rowTitle}>{track.title}</div>
                      <div style={styles.rowSub}>{track.profiles?.username}</div>
                    </div>
                    <span style={{ color: '#555' }}>▶</span>
                  </div>
                ))
            )}

            {/* HISTORIQUE */}
            {activeTab === 1 && (
              history.length === 0
                ? <div style={styles.empty}>🕐 Lance une track pour voir ton historique</div>
                : history.map((play, i) => (
                  <div key={i} style={styles.row}>
                    <div style={styles.thumb}>{play.tracks?.cover_url ? <img src={play.tracks.cover_url} style={styles.thumbImg} alt="" /> : '🎵'}</div>
                    <div style={styles.rowInfo}>
                      <div style={styles.rowTitle}>{play.tracks?.title || 'Track supprimée'}</div>
                      <div style={styles.rowSub}>{play.tracks?.profiles?.username} · {new Date(play.played_at).toLocaleDateString('fr-FR')}</div>
                    </div>
                  </div>
                ))
            )}

            {/* PLAYLISTS */}
            {activeTab === 2 && (
              <>
                <button style={styles.createPlaylistBtn} onClick={() => setShowCreatePlaylist(true)}>
                  + Nouvelle playlist
                </button>

                {/* Modal création */}
                {showCreatePlaylist && (
                  <div style={styles.createModal}>
                    <div style={styles.createModalTitle}>Nouvelle playlist</div>
                    <input
                      style={styles.input}
                      placeholder="Nom de la playlist..."
                      value={newPlaylistName}
                      onChange={e => setNewPlaylistName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && createPlaylist()}
                      autoFocus
                    />
                    <div style={styles.createModalActions}>
                      <button style={styles.cancelBtn} onClick={() => { setShowCreatePlaylist(false); setNewPlaylistName('') }}>Annuler</button>
                      <button style={{ ...styles.confirmBtn, opacity: (!newPlaylistName.trim() || creatingPlaylist) ? 0.5 : 1 }} onClick={createPlaylist} disabled={!newPlaylistName.trim() || creatingPlaylist}>
                        {creatingPlaylist ? '...' : 'Créer'}
                      </button>
                    </div>
                  </div>
                )}

                {playlists.length === 0
                  ? <div style={styles.empty}>🎶 Crée ta première playlist</div>
                  : playlists.map(pl => (
                    <div key={pl.id} style={styles.row}>
                      <div style={{ ...styles.thumb, background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>🎵</div>
                      <div style={styles.rowInfo}>
                        <div style={styles.rowTitle}>{pl.name}</div>
                        <div style={styles.rowSub}>{pl.playlist_tracks?.[0]?.count || 0} tracks</div>
                      </div>
                      <button style={styles.deleteSmallBtn} onClick={() => deletePlaylist(pl.id)}>🗑</button>
                    </div>
                  ))
                }
              </>
            )}
          </>
        )}
      </div>

      <style>{`
        @keyframes glowPulse {
          0%,100% { box-shadow: 0 0 12px rgba(0,255,135,0.4), 0 0 24px rgba(0,255,135,0.15); }
          50%      { box-shadow: 0 0 20px rgba(0,255,135,0.7), 0 0 40px rgba(0,255,135,0.3); }
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

  // Avatar glow
  avatarOuter: { position: 'relative', width: '96px', height: '96px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  avatarGlowRing: { position: 'absolute', inset: '-4px', borderRadius: '50%', animation: 'glowPulse 2.5s ease-in-out infinite' },
  avatar: { position: 'relative', width: '90px', height: '90px', borderRadius: '50%', background: '#1a1a1a', border: '2px solid #00FF87', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' },

  badges: { display: 'flex', gap: '6px' },
  badgeArtist: { background: 'rgba(0,255,135,0.1)', border: '1px solid rgba(0,255,135,0.3)', borderRadius: '20px', padding: '3px 12px', fontSize: '11px', color: '#00FF87', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700 },
  badgeAdmin:  { background: 'rgba(255,60,60,0.12)', border: '1px solid rgba(255,60,60,0.3)', borderRadius: '20px', padding: '3px 12px', fontSize: '11px', color: '#ff6b6b', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700 },
  badgeMember: { background: 'rgba(255,255,255,0.05)', border: '1px solid #222', borderRadius: '20px', padding: '3px 12px', fontSize: '11px', color: '#555', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700 },

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

  tabs: { display: 'flex', marginTop: '20px', borderBottom: '1px solid #1a1a1a', position: 'sticky', top: 0, background: 'rgba(9,9,9,0.97)', backdropFilter: 'blur(12px)', zIndex: 10 },
  tab: { flex: 1, background: 'none', border: 'none', padding: '12px 4px', color: '#555', fontSize: '12px', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, cursor: 'pointer', borderBottom: '2px solid transparent' },
  tabActive: { color: '#00FF87', borderBottomColor: '#00FF87' },
  tabContent: { padding: '12px 16px' },
  empty: { textAlign: 'center', color: '#555', fontFamily: "'Inter',sans-serif", fontSize: '14px', padding: '40px 20px', lineHeight: 1.8 },

  row: { display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 6px', borderBottom: '1px solid #111', cursor: 'pointer' },
  thumb: { width: '44px', height: '44px', borderRadius: '8px', background: '#1a1a1a', overflow: 'hidden', flexShrink: 0 },
  thumbImg: { width: '100%', height: '100%', objectFit: 'cover' },
  rowInfo: { flex: 1, minWidth: 0 },
  rowTitle: { fontFamily: "'Space Grotesk',sans-serif", fontSize: '14px', fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  rowSub: { fontFamily: "'Inter',sans-serif", fontSize: '11px', color: '#666', marginTop: '2px' },

  createPlaylistBtn: { width: '100%', background: 'rgba(0,255,135,0.06)', border: '1px dashed rgba(0,255,135,0.2)', borderRadius: '12px', padding: '12px', color: '#00FF87', fontSize: '14px', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, cursor: 'pointer', marginBottom: '12px' },
  createModal: { background: '#111', border: '1px solid #1a1a1a', borderRadius: '14px', padding: '16px', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '10px' },
  createModalTitle: { fontFamily: "'Space Grotesk',sans-serif", fontSize: '14px', fontWeight: 700, color: '#fff' },
  input: { background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '10px 14px', color: '#fff', fontSize: '14px', fontFamily: "'Inter',sans-serif", outline: 'none', width: '100%', boxSizing: 'border-box' },
  createModalActions: { display: 'flex', gap: '8px' },
  cancelBtn: { flex: 1, background: 'transparent', border: '1px solid #2a2a2a', borderRadius: '8px', padding: '9px', color: '#666', fontSize: '13px', fontFamily: "'Inter',sans-serif", cursor: 'pointer' },
  confirmBtn: { flex: 1, background: '#00FF87', border: 'none', borderRadius: '8px', padding: '9px', color: '#000', fontSize: '13px', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, cursor: 'pointer' },
  deleteSmallBtn: { background: 'transparent', border: 'none', fontSize: '16px', cursor: 'pointer', opacity: 0.5, padding: '4px' },
}
