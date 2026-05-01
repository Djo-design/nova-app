// src/features/artist/ArtistProfilePage.jsx
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/shared/lib/supabase'
import { useAuth } from '@/features/auth/AuthContext'
import { usePlayer } from '@/features/player/PlayerContext'
import { LikeButton } from '@/shared/ui/LikeButton'

const PLATFORM_ICONS = {
  youtube_channel: { icon: '▶', color: '#FF0000', label: 'YouTube' },
  spotify: { icon: '♪', color: '#1DB954', label: 'Spotify' },
  deezer: { icon: '♫', color: '#FF6600', label: 'Deezer' },
  tiktok: { icon: '♬', color: '#ffffff', label: 'TikTok' },
  instagram: { icon: '◈', color: '#E1306C', label: 'Instagram' },
  facebook: { icon: 'f', color: '#1877F2', label: 'Facebook' },
  other: { icon: '↗', color: '#888', label: 'Lien' },
}

function fmtTime(s) {
  if (!s) return ''
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
}

function fmtNum(n) {
  if (!n) return '0'
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

export function ArtistProfilePage() {
  const { artistId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { playQueue, currentTrack, playing } = usePlayer()

  const [profile, setProfile] = useState(null)
  const [artistProfile, setArtistProfile] = useState(null)
  const [tracks, setTracks] = useState([])
  const [videos, setVideos] = useState([])
  const [externalLinks, setExternalLinks] = useState([])
  const [youtubeVideos, setYoutubeVideos] = useState([])
  const [stats, setStats] = useState({ totalPlays: 0, totalLikes: 0, followers: 0 })
  const [isFollowing, setIsFollowing] = useState(false)
  const [activeTab, setActiveTab] = useState('tracks')
  const [loading, setLoading] = useState(true)

  const isOwnProfile = user?.id === artistId

  useEffect(() => { fetchAll() }, [artistId])

  async function fetchAll() {
    setLoading(true)
    const [
      { data: prof },
      { data: artProf },
      { data: trks },
      { data: vids },
      { data: links },
      { data: ytVids },
      { count: followCount },
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', artistId).single(),
      supabase.from('artist_profiles').select('*').eq('user_id', artistId).single(),
      supabase.from('tracks').select('*').eq('artist_id', artistId).is('deleted_at', null).order('plays', { ascending: false }),
      supabase.from('videos').select('*').eq('artist_id', artistId).is('deleted_at', null).order('views', { ascending: false }),
      supabase.from('artist_external_links').select('*').eq('artist_id', artistId).order('sort_order'),
      supabase.from('artist_youtube_videos').select('*').eq('artist_id', artistId).order('sort_order'),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('artist_id', artistId),
    ])

    setProfile(prof)
    setArtistProfile(artProf)
    setTracks(trks || [])
    setVideos(vids || [])
    setExternalLinks(links || [])
    setYoutubeVideos(ytVids || [])

    // Stats globales
    const totalPlays = (trks || []).reduce((a, t) => a + (t.plays || 0), 0)
    const totalLikes = (trks || []).reduce((a, t) => a + (t.likes || 0), 0)
      + (vids || []).reduce((a, v) => a + (v.likes || 0), 0)
    setStats({ totalPlays, totalLikes, followers: followCount || 0 })

    // Est-ce qu'on suit cet artiste ?
    if (user) {
      const { data: followData } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('follower_id', user.id)
        .eq('artist_id', artistId)
        .single()
      setIsFollowing(!!followData)
    }
    setLoading(false)
  }

  async function toggleFollow() {
    if (!user) { navigate('/login'); return }
    if (isFollowing) {
      await supabase.from('follows').delete().eq('follower_id', user.id).eq('artist_id', artistId)
      setIsFollowing(false)
      setStats(s => ({ ...s, followers: s.followers - 1 }))
    } else {
      await supabase.from('follows').insert({ follower_id: user.id, artist_id: artistId })
      setIsFollowing(true)
      setStats(s => ({ ...s, followers: s.followers + 1 }))
    }
  }

  function openExternalLink(url) {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  if (loading) return (
    <div style={styles.page}>
      <div style={styles.skeletonHeader} />
    </div>
  )

  if (!profile) return (
    <div style={styles.center}>
      <p style={{ color: '#555', fontFamily: "'Inter',sans-serif" }}>Artiste introuvable</p>
    </div>
  )

  const TABS = [
    { id: 'tracks', label: `Tracks (${tracks.length})` },
    { id: 'videos', label: `Vidéos (${videos.length + youtubeVideos.length})` },
    { id: 'links', label: `Liens (${externalLinks.length})` },
  ]

  return (
    <div style={styles.page}>
      {/* Hero header */}
      <div style={styles.hero}>
        <div style={styles.heroBg}>
          {profile.avatar_url && (
            <img src={profile.avatar_url} style={styles.heroBgImg} alt="" />
          )}
          <div style={styles.heroBgOverlay} />
        </div>

        {/* Back button */}
        <button style={styles.backBtn} onClick={() => navigate(-1)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M12 5l-7 7 7 7" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        <div style={styles.heroContent}>
          {/* Avatar */}
          <div style={styles.avatar}>
            {profile.avatar_url
              ? <img src={profile.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
              : <span style={{ fontSize: '44px' }}>🎤</span>}
          </div>

          <h1 style={styles.artistName}>{profile.username}</h1>
          {artistProfile?.genres?.length > 0 && (
            <div style={styles.genresRow}>
              {artistProfile.genres.map(g => (
                <span key={g} style={styles.genreBadge}>{g}</span>
              ))}
            </div>
          )}
          {artistProfile?.country && (
            <p style={styles.country}>📍 {artistProfile.country}</p>
          )}
        </div>
      </div>

      {/* Stats bar */}
      <div style={styles.statsBar}>
        <div style={styles.statItem}>
          <span style={styles.statNum}>{fmtNum(stats.totalPlays)}</span>
          <span style={styles.statLabel}>Écoutes</span>
        </div>
        <div style={styles.statDivider} />
        <div style={styles.statItem}>
          <span style={styles.statNum}>{fmtNum(stats.totalLikes)}</span>
          <span style={styles.statLabel}>Likes</span>
        </div>
        <div style={styles.statDivider} />
        <div style={styles.statItem}>
          <span style={styles.statNum}>{fmtNum(stats.followers)}</span>
          <span style={styles.statLabel}>Abonnés</span>
        </div>
      </div>

      {/* Bio */}
      {(artistProfile?.full_bio || profile.bio) && (
        <div style={styles.bioSection}>
          <p style={styles.bioText}>{artistProfile?.full_bio || profile.bio}</p>
        </div>
      )}

      {/* Actions */}
      <div style={styles.actionsRow}>
        {!isOwnProfile ? (
          <button
            style={{ ...styles.followBtn, ...(isFollowing ? styles.followingBtn : {}) }}
            onClick={toggleFollow}
          >
            {isFollowing ? '✓ Abonné' : '+ S\'abonner'}
          </button>
        ) : (
          <button style={styles.editBtn} onClick={() => navigate('/artist/edit')}>
            ✏️ Modifier le profil
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        {TABS.map(t => (
          <button
            key={t.id}
            style={{ ...styles.tab, ...(activeTab === t.id ? styles.tabActive : {}) }}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Contenu tabs */}
      <div style={styles.tabContent}>

        {/* TRACKS */}
        {activeTab === 'tracks' && (
          <div>
            {tracks.length === 0 ? (
              <div style={styles.empty}>Aucune track uploadée</div>
            ) : (
              <>
                <button style={styles.playAllBtn} onClick={() => playQueue(tracks, 0)}>
                  ▶ Tout écouter
                </button>
                {tracks.map((track, i) => {
                  const isActive = currentTrack?.id === track.id
                  return (
                    <div key={track.id} style={{ ...styles.trackRow, ...(isActive ? styles.trackActive : {}) }}
                      onClick={() => playQueue(tracks, i)}>
                      <div style={styles.trackNum}>
                        {isActive && playing
                          ? <div style={styles.playingDot} />
                          : <span style={{ color: '#444', fontSize: '12px' }}>{i + 1}</span>}
                      </div>
                      <div style={styles.trackCover}>
                        {track.cover_url
                          ? <img src={track.cover_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                          : <span>🎵</span>}
                      </div>
                      <div style={styles.trackInfo}>
                        <div style={styles.trackTitle}>{track.title}</div>
                        <div style={styles.trackMeta}>
                          {track.genre && `${track.genre} · `}{fmtTime(track.duration)}
                        </div>
                      </div>
                      <div style={styles.trackStats} onClick={e => e.stopPropagation()}>
                        <LikeButton targetType="track" targetId={track.id} initialLikes={track.likes} size="sm" />
                        <span style={styles.playCount}>▶ {fmtNum(track.plays)}</span>
                      </div>
                    </div>
                  )
                })}
              </>
            )}
          </div>
        )}

        {/* VIDEOS */}
        {activeTab === 'videos' && (
          <div>
            {/* Vidéos internes */}
            {videos.length > 0 && (
              <>
                <div style={styles.sectionLabel}>VIDÉOS UPLOADÉES</div>
                <div style={styles.videoGrid}>
                  {videos.map(v => (
                    <div key={v.id} style={styles.videoCard}>
                      <div style={styles.videoThumb}>
                        {v.thumb_url
                          ? <img src={v.thumb_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                          : <span style={{ fontSize: '28px' }}>📹</span>}
                        <div style={styles.videoOverlay}>
                          <span style={styles.videoPlayIcon}>▶</span>
                        </div>
                      </div>
                      <div style={styles.videoTitle}>{v.title}</div>
                      <div style={styles.videoMeta}>👁 {fmtNum(v.views)} · ♥ {fmtNum(v.likes)}</div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Vidéos YouTube */}
            {youtubeVideos.length > 0 && (
              <>
                <div style={{ ...styles.sectionLabel, marginTop: '20px' }}>
                  <span style={{ color: '#FF0000' }}>▶</span> VIDÉOS YOUTUBE
                </div>
                <div style={styles.videoGrid}>
                  {youtubeVideos.map(v => (
                    <div key={v.id} style={styles.videoCard}
                      onClick={() => window.open(`https://youtube.com/watch?v=${v.youtube_id}`, '_blank')}>
                      <div style={styles.videoThumb}>
                        <img
                          src={v.thumbnail_url || `https://img.youtube.com/vi/${v.youtube_id}/mqdefault.jpg`}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          alt=""
                        />
                        <div style={styles.videoOverlay}>
                          <span style={{ ...styles.videoPlayIcon, background: '#FF0000' }}>▶</span>
                        </div>
                        <div style={styles.ytBadge}>YouTube</div>
                      </div>
                      <div style={styles.videoTitle}>{v.title || 'Vidéo YouTube'}</div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {videos.length === 0 && youtubeVideos.length === 0 && (
              <div style={styles.empty}>Aucune vidéo</div>
            )}
          </div>
        )}

        {/* LIENS EXTERNES */}
        {activeTab === 'links' && (
          <div style={styles.linksGrid}>
            {externalLinks.length === 0 ? (
              <div style={styles.empty}>Aucun lien externe</div>
            ) : (
              externalLinks.map(link => {
                const p = PLATFORM_ICONS[link.platform] || PLATFORM_ICONS.other
                return (
                  <button key={link.id} style={styles.linkCard} onClick={() => openExternalLink(link.url)}>
                    <div style={{ ...styles.linkIcon, background: `${p.color}22`, border: `1px solid ${p.color}44` }}>
                      <span style={{ color: p.color, fontSize: '20px', fontWeight: 700 }}>{p.icon}</span>
                    </div>
                    <div style={styles.linkInfo}>
                      <div style={styles.linkLabel}>{link.label || p.label}</div>
                      <div style={styles.linkUrl}>{link.url.replace(/https?:\/\/(www\.)?/, '').slice(0, 30)}...</div>
                    </div>
                    <span style={{ color: '#444', fontSize: '16px' }}>↗</span>
                  </button>
                )
              })
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes barAnim {
          0%, 100% { height: 4px; }
          50% { height: 14px; }
        }
      `}</style>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', background: '#090909', paddingBottom: '160px' },
  center: { minHeight: '100vh', background: '#090909', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  skeletonHeader: { height: '280px', background: '#111', animation: 'pulse 1.5s ease-in-out infinite' },

  // Hero
  hero: { position: 'relative', paddingBottom: '24px', overflow: 'hidden' },
  heroBg: { position: 'absolute', inset: 0, zIndex: 0 },
  heroBgImg: { width: '100%', height: '100%', objectFit: 'cover', opacity: 0.2, filter: 'blur(30px)', transform: 'scale(1.1)' },
  heroBgOverlay: { position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(9,9,9,0.4) 0%, rgba(9,9,9,1) 100%)' },
  backBtn: { position: 'relative', zIndex: 2, background: 'rgba(0,0,0,0.4)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', margin: '52px 0 0 16px' },
  heroContent: { position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 20px 0', gap: '12px' },
  avatar: { width: '100px', height: '100px', borderRadius: '50%', background: '#1a1a1a', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid #00FF87', boxShadow: '0 0 30px rgba(0,255,135,0.25)' },
  artistName: { fontFamily: "'Space Grotesk',sans-serif", fontSize: '26px', fontWeight: 700, color: '#fff', margin: 0, textAlign: 'center' },
  genresRow: { display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' },
  genreBadge: { background: 'rgba(123,47,190,0.2)', border: '1px solid rgba(123,47,190,0.4)', borderRadius: '20px', padding: '3px 12px', fontSize: '11px', color: '#a87bd4', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600 },
  country: { fontFamily: "'Inter',sans-serif", fontSize: '13px', color: '#666', margin: 0 },

  // Stats
  statsBar: { display: 'flex', background: '#111', margin: '0 16px', borderRadius: '14px', padding: '16px', gap: '0', border: '1px solid #1a1a1a' },
  statItem: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' },
  statNum: { fontFamily: "'Space Grotesk',sans-serif", fontSize: '22px', fontWeight: 700, color: '#fff' },
  statLabel: { fontFamily: "'Inter',sans-serif", fontSize: '11px', color: '#555' },
  statDivider: { width: '1px', background: '#222', margin: '0 8px' },

  // Bio
  bioSection: { padding: '16px 20px' },
  bioText: { fontFamily: "'Inter',sans-serif", fontSize: '14px', color: '#aaa', lineHeight: 1.7, margin: 0 },

  // Actions
  actionsRow: { padding: '0 16px 16px', display: 'flex', gap: '10px' },
  followBtn: { flex: 1, background: '#00FF87', color: '#000', border: 'none', borderRadius: '12px', padding: '13px', fontSize: '15px', fontWeight: 700, fontFamily: "'Space Grotesk',sans-serif", cursor: 'pointer' },
  followingBtn: { background: 'transparent', color: '#00FF87', border: '1px solid #00FF87' },
  editBtn: { flex: 1, background: 'rgba(0,255,135,0.08)', color: '#00FF87', border: '1px solid rgba(0,255,135,0.2)', borderRadius: '12px', padding: '13px', fontSize: '14px', fontWeight: 600, fontFamily: "'Space Grotesk',sans-serif", cursor: 'pointer' },

  // Tabs
  tabs: { display: 'flex', borderBottom: '1px solid #1a1a1a', padding: '0 16px' },
  tab: { flex: 1, background: 'none', border: 'none', borderBottom: '2px solid transparent', padding: '12px 4px', color: '#555', fontSize: '12px', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' },
  tabActive: { color: '#00FF87', borderBottomColor: '#00FF87' },
  tabContent: { padding: '16px' },

  // Tracks
  playAllBtn: { width: '100%', background: 'rgba(0,255,135,0.08)', border: '1px solid rgba(0,255,135,0.15)', borderRadius: '12px', padding: '12px', color: '#00FF87', fontSize: '14px', fontWeight: 700, fontFamily: "'Space Grotesk',sans-serif", cursor: 'pointer', marginBottom: '12px' },
  trackRow: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 8px', borderRadius: '10px', cursor: 'pointer', marginBottom: '4px' },
  trackActive: { background: 'rgba(0,255,135,0.06)', border: '1px solid rgba(0,255,135,0.1)' },
  trackNum: { width: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  playingDot: { width: '8px', height: '8px', borderRadius: '50%', background: '#00FF87', boxShadow: '0 0 8px #00FF87' },
  trackCover: { width: '44px', height: '44px', borderRadius: '8px', background: '#1a1a1a', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', fontSize: '18px' },
  trackInfo: { flex: 1, minWidth: 0 },
  trackTitle: { fontFamily: "'Space Grotesk',sans-serif", fontSize: '14px', fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  trackMeta: { fontSize: '11px', color: '#555', fontFamily: "'Inter',sans-serif", marginTop: '3px' },
  trackStats: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 },
  playCount: { fontSize: '10px', color: '#444', fontFamily: "'Inter',sans-serif" },

  // Videos
  sectionLabel: { fontFamily: "'Space Grotesk',sans-serif", fontSize: '11px', fontWeight: 700, color: '#555', letterSpacing: '0.12em', marginBottom: '12px' },
  videoGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '8px' },
  videoCard: { cursor: 'pointer' },
  videoThumb: { width: '100%', aspectRatio: '16/9', borderRadius: '10px', background: '#1a1a1a', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', marginBottom: '6px' },
  videoOverlay: { position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0 },
  videoPlayIcon: { width: '36px', height: '36px', borderRadius: '50%', background: '#00FF87', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', color: '#000', fontWeight: 700 },
  ytBadge: { position: 'absolute', top: '6px', right: '6px', background: '#FF0000', borderRadius: '4px', padding: '2px 6px', fontSize: '9px', color: '#fff', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700 },
  videoTitle: { fontFamily: "'Space Grotesk',sans-serif", fontSize: '12px', fontWeight: 600, color: '#ccc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  videoMeta: { fontSize: '10px', color: '#555', fontFamily: "'Inter',sans-serif", marginTop: '2px' },

  // Links
  linksGrid: { display: 'flex', flexDirection: 'column', gap: '10px' },
  linkCard: { display: 'flex', alignItems: 'center', gap: '14px', background: '#111', border: '1px solid #1a1a1a', borderRadius: '14px', padding: '14px 16px', cursor: 'pointer', width: '100%', textAlign: 'left' },
  linkIcon: { width: '44px', height: '44px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  linkInfo: { flex: 1, minWidth: 0 },
  linkLabel: { fontFamily: "'Space Grotesk',sans-serif", fontSize: '14px', fontWeight: 700, color: '#fff' },
  linkUrl: { fontFamily: "'Inter',sans-serif", fontSize: '11px', color: '#555', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },

  empty: { textAlign: 'center', color: '#444', fontFamily: "'Inter',sans-serif", fontSize: '14px', padding: '40px 20px' },
}
