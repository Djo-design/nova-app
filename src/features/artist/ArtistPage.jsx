// src/features/artist/ArtistPage.jsx
import { useState, useEffect } from 'react'
<parameter name="file_text">// src/features/artist/ArtistPage.jsx
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/shared/lib/supabase'
import { useAuth } from '@/features/auth/AuthContext'
import { usePlayer } from '@/features/player/PlayerContext'
import { LikeButton } from '@/shared/ui/LikeButton'
import { FollowButton } from '@/shared/ui/FollowButton'
import { ReportButton } from '@/shared/ui/ReportButton'
import { YouTubeModal } from '@/shared/ui/YouTubeModal'

const PLATFORM_ICONS = {
  youtube_channel: { icon: '▶', label: 'YouTube',   color: '#FF0000' },
  spotify:         { icon: '♫', label: 'Spotify',   color: '#1DB954' },
  deezer:          { icon: '♪', label: 'Deezer',    color: '#FF0092' },
  tiktok:          { icon: '♬', label: 'TikTok',    color: '#fff'    },
  instagram:       { icon: '◈', label: 'Instagram', color: '#E1306C' },
  facebook:        { icon: 'f', label: 'Facebook',  color: '#1877F2' },
  other:           { icon: '↗', label: 'Lien',      color: '#888'    },
}

function fmtTime(s) {
  if (!s) return ''
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
}

const TABS = ['Tracks', 'Vidéos', 'YouTube', 'Infos']

export function ArtistPage() {
  const { artistId } = useParams()
  const { user } = useAuth()
  const { playQueue } = usePlayer()
  const navigate = useNavigate()

  const [profile, setProfile]             = useState(null)
  const [artistProfile, setArtistProfile] = useState(null)
  const [tracks, setTracks]               = useState([])
  const [videos, setVideos]               = useState([])
  const [ytVideos, setYtVideos]           = useState([])
  const [links, setLinks]                 = useState([])
  const [activeTab, setActiveTab]         = useState(0)
  const [loading, setLoading]             = useState(true)
  const [ytModal, setYtModal]             = useState(null)

  const isOwnProfile = user?.id === artistId

  useEffect(() => { fetchAll() }, [artistId])

  async function fetchAll() {
    setLoading(true)
    const [
      { data: prof },
      { data: artProf },
      { data: trks },
      { data: vids },
      { data: yts },
      { data: lnks },
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', artistId).single(),
      supabase.from('artist_profiles').select('*').eq('user_id', artistId).single(),
      supabase.from('tracks').select('*').eq('artist_id', artistId).is('deleted_at', null).order('plays', { ascending: false }),
      supabase.from('videos').select('*').eq('artist_id', artistId).is('deleted_at', null).order('views', { ascending: false }),
      supabase.from('artist_youtube_videos').select('*').eq('artist_id', artistId).order('sort_order'),
      supabase.from('artist_external_links').select('*').eq('artist_id', artistId).order('sort_order'),
    ])
    setProfile(prof)
    setArtistProfile(artProf)
    setTracks(trks || [])
    setVideos(vids || [])
    setYtVideos(yts || [])
    setLinks(lnks || [])
    setLoading(false)
  }

  function openExternalLink(url) {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  if (loading) return (
    <div style={styles.page}>
      <div style={styles.skeletonHeader} />
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {[...Array(5)].map((_, i) => <div key={i} style={styles.skeletonRow} />)}
      </div>
    </div>
  )

  if (!profile) return (
    <div style={styles.center}>
      <p style={{ color: '#888', fontFamily: "'Inter',sans-serif" }}>Artiste introuvable</p>
      <button style={styles.backBtn} onClick={() => navigate(-1)}>← Retour</button>
    </div>
  )

  const totalPlays = tracks.reduce((s, t) => s + (t.plays || 0), 0)
  const totalLikes = tracks.reduce((s, t) => s + (t.likes || 0), 0)
  const totalViews = videos.reduce((s, v) => s + (v.views || 0), 0)

  return (
    <div style={styles.page}>
      {ytModal && <YouTubeModal videoId={ytModal} onClose={() => setYtModal(null)} />}

      <button style={styles.backFloat} onClick={() => navigate(-1)}>←</button>

      {/* Hero */}
      <div style={styles.hero}>
        <div style={styles.heroBg}>
          {profile.avatar_url && <img src={profile.avatar_url} style={styles.heroBgImg} alt="" />}
          <div style={styles.heroBgOverlay} />
        </div>
        <div style={styles.heroContent}>
          <div style={styles.avatar}>
            {profile.avatar_url
              ? <img src={profile.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
              : <span style={{ fontSize: '36px' }}>🎤</span>}
          </div>
          <div style={styles.heroInfo}>
            <h1 style={styles.artistName}>{profile.username}</h1>
            {artistProfile?.genres?.length > 0 && (
              <div style={styles.genres}>
                {artistProfile.genres.map(g => <span key={g} style={styles.genreTag}>{g}</span>)}
              </div>
            )}
            {artistProfile?.country && <p style={styles.country}>📍 {artistProfile.country}</p>}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={styles.statsBar}>
        {[
          { label: 'Tracks',  value: tracks.length },
          { label: 'Écoutes', value: totalPlays    },
          { label: 'Likes',   value: totalLikes    },
          { label: 'Vues',    value: totalViews    },
        ].map((s, i, arr) => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <div style={styles.statItem}>
              <span style={styles.statNum}>{s.value}</span>
              <span style={styles.statLabel}>{s.label}</span>
            </div>
            {i < arr.length - 1 && <div style={styles.statDiv} />}
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={styles.actionsRow}>
        {/* Bouton suivre — composant réutilisable */}
        {!isOwnProfile && <FollowButton artistId={artistId} />}

        {isOwnProfile && (
          <button style={styles.editBtn} onClick={() => navigate('/profile/edit')}>✏️ Modifier</button>
        )}

        {/* Signaler le profil */}
        {!isOwnProfile && user && (
          <ReportButton targetType="profile" targetId={artistId} />
        )}

        {/* Liens sociaux */}
        {links.map(link => {
          const p = PLATFORM_ICONS[link.platform] || PLATFORM_ICONS.other
          return (
            <button key={link.id}
              style={{ ...styles.linkBtn, borderColor: p.color + '44' }}
              onClick={() => openExternalLink(link.url)}
            >
              <span style={{ color: p.color, fontSize: '13px' }}>{p.icon}</span>
              <span style={styles.linkLabel}>{link.label || p.label}</span>
            </button>
          )
        })}
      </div>

      {/* Bio */}
      {(artistProfile?.full_bio || profile.bio) && (
        <div style={styles.bioBox}>
          <p style={styles.bioText}>{artistProfile?.full_bio || profile.bio}</p>
        </div>
      )}

      {/* Tabs */}
      <div style={styles.tabs}>
        {TABS.map((t, i) => (
          <button key={i}
            style={{ ...styles.tab, ...(activeTab === i ? styles.tabActive : {}) }}
            onClick={() => setActiveTab(i)}
          >
            {t}
            {i === 0 && tracks.length > 0   && <span style={styles.tabCount}>{tracks.length}</span>}
            {i === 1 && videos.length > 0   && <span style={styles.tabCount}>{videos.length}</span>}
            {i === 2 && ytVideos.length > 0 && <span style={styles.tabCount}>{ytVideos.length}</span>}
          </button>
        ))}
      </div>

      <div style={styles.tabContent}>

        {/* TRACKS */}
        {activeTab === 0 && (
          tracks.length === 0
            ? <div style={styles.empty}>Aucune track uploadée</div>
            : tracks.map((track, i) => (
              <div key={track.id} style={styles.trackRow} onClick={() => playQueue(tracks, i)}>
                <div style={styles.trackCover}>
                  {track.cover_url
                    ? <img src={track.cover_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                    : <span style={{ fontSize: '18px' }}>🎵</span>}
                </div>
                <div style={styles.trackInfo}>
                  <div style={styles.trackTitle}>{track.title}</div>
                  <div style={styles.trackMeta}>{[track.genre, fmtTime(track.duration)].filter(Boolean).join(' · ')}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={e => e.stopPropagation()}>
                  <LikeButton targetType="track" targetId={track.id} initialLikes={track.likes} size="sm" />
                  <ReportButton targetType="track" targetId={track.id} />
                </div>
              </div>
            ))
        )}

        {/* VIDÉOS */}
        {activeTab === 1 && (
          videos.length === 0
            ? <div style={styles.empty}>Aucune vidéo uploadée</div>
            : <div style={styles.videoGrid}>
                {videos.map(video => (
                  <div key={video.id} style={styles.videoCard}>
                    <div style={styles.videoThumb} onClick={() => navigate('/tv')}>
                      {video.thumb_url
                        ? <img src={video.thumb_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                        : <span style={{ fontSize: '28px' }}>📹</span>}
                      <div style={styles.playOverlay}>▶</div>
                    </div>
                    <div style={styles.videoFooter}>
                      <div style={styles.videoTitle}>{video.title}</div>
                      <div style={styles.videoMeta}>
                        <span>👁 {video.views || 0}</span>
                        <div onClick={e => e.stopPropagation()}>
                          <ReportButton targetType="video" targetId={video.id} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
        )}

        {/* YOUTUBE — lecture dans l'app */}
        {activeTab === 2 && (
          ytVideos.length === 0
            ? <div style={styles.empty}>Aucune vidéo YouTube ajoutée</div>
            : <div style={styles.ytGrid}>
                {ytVideos.map(yt => (
                  <div key={yt.id} style={styles.ytCard} onClick={() => setYtModal(yt.youtube_id)}>
                    <div style={styles.ytThumb}>
                      <img
                        src={yt.thumbnail_url || `https://img.youtube.com/vi/${yt.youtube_id}/mqdefault.jpg`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        alt=""
                      />
                      <div style={styles.ytPlayOverlay}>▶</div>
                      <div style={styles.ytBadge}>YouTube</div>
                    </div>
                    <div style={styles.ytTitle}>{yt.title || 'Vidéo YouTube'}</div>
                  </div>
                ))}
              </div>
        )}

        {/* INFOS */}
        {activeTab === 3 && (
          <div style={styles.infoCard}>
            <div style={styles.infoLabel}>STATISTIQUES</div>
            {[
              ['Écoutes totales', totalPlays],
              ['Likes totaux',    totalLikes],
              ['Vues vidéo',      totalViews],
              ['Tracks',          tracks.length],
              ['Vidéos',          videos.length],
            ].map(([k, v]) => (
              <div key={k} style={styles.infoRow}>
                <span style={styles.infoKey}>{k}</span>
                <span style={styles.infoVal}>{v}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', background: '#090909', paddingBottom: '160px' },
  center: { minHeight: '100vh', background: '#090909', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' },
  backFloat: { position: 'fixed', top: '50px', left: '16px', zIndex: 50, background: 'rgba(0,0,0,0.6)', border: '1px solid #222', borderRadius: '50%', width: '38px', height: '38px', color: '#fff', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' },
  backBtn: { background: '#1a1a1a', border: '1px solid #222', borderRadius: '10px', padding: '10px 20px', color: '#fff', fontFamily: "'Inter',sans-serif", cursor: 'pointer' },
  hero: { position: 'relative', height: '240px', display: 'flex', alignItems: 'flex-end' },
  heroBg: { position: 'absolute', inset: 0 },
  heroBgImg: { width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(20px)', transform: 'scale(1.1)', opacity: 0.3 },
  heroBgOverlay: { position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(9,9,9,0.2), rgba(9,9,9,0.97))' },
  heroContent: { position: 'relative', zIndex: 1, display: 'flex', alignItems: 'flex-end', gap: '14px', padding: '0 16px 16px', width: '100%' },
  avatar: { width: '76px', height: '76px', borderRadius: '50%', background: '#1a1a1a', border: '2px solid #00FF87', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 0 20px rgba(0,255,135,0.25)' },
  heroInfo: { flex: 1, minWidth: 0 },
  artistName: { fontFamily: "'Space Grotesk',sans-serif", fontSize: '22px', fontWeight: 700, color: '#fff', margin: 0 },
  genres: { display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '5px' },
  genreTag: { background: 'rgba(123,47,190,0.3)', border: '1px solid rgba(123,47,190,0.4)', borderRadius: '20px', padding: '2px 9px', fontSize: '10px', color: '#a87bd4', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600 },
  country: { fontFamily: "'Inter',sans-serif", fontSize: '12px', color: '#888', margin: '4px 0 0' },
  statsBar: { display: 'flex', alignItems: 'center', padding: '12px 16px', background: '#111', borderBottom: '1px solid #1a1a1a' },
  statItem: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' },
  statNum: { fontFamily: "'Space Grotesk',sans-serif", fontSize: '17px', fontWeight: 700, color: '#fff' },
  statLabel: { fontFamily: "'Inter',sans-serif", fontSize: '10px', color: '#555' },
  statDiv: { width: '1px', height: '26px', background: '#222', flexShrink: 0 },
  actionsRow: { display: 'flex', gap: '8px', padding: '12px 16px', overflowX: 'auto', alignItems: 'center' },
  editBtn: { background: 'rgba(0,255,135,0.08)', color: '#00FF87', border: '1px solid rgba(0,255,135,0.2)', borderRadius: '20px', padding: '9px 14px', fontSize: '12px', fontFamily: "'Space Grotesk',sans-serif", cursor: 'pointer', flexShrink: 0 },
  linkBtn: { display: 'flex', alignItems: 'center', gap: '5px', background: '#111', border: '1px solid #222', borderRadius: '20px', padding: '7px 12px', cursor: 'pointer', flexShrink: 0 },
  linkLabel: { fontFamily: "'Inter',sans-serif", fontSize: '12px', color: '#ccc' },
  bioBox: { padding: '0 16px 12px' },
  bioText: { fontFamily: "'Inter',sans-serif", fontSize: '13px', color: '#aaa', lineHeight: 1.6, margin: 0 },
  tabs: { display: 'flex', borderBottom: '1px solid #1a1a1a', position: 'sticky', top: 0, background: 'rgba(9,9,9,0.97)', backdropFilter: 'blur(12px)', zIndex: 10 },
  tab: { flex: 1, background: 'none', border: 'none', padding: '12px 4px', color: '#555', fontSize: '12px', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, cursor: 'pointer', borderBottom: '2px solid transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' },
  tabActive: { color: '#00FF87', borderBottomColor: '#00FF87' },
  tabCount: { background: 'rgba(0,255,135,0.15)', borderRadius: '10px', padding: '1px 5px', fontSize: '9px', color: '#00FF87' },
  tabContent: { padding: '12px' },
  empty: { textAlign: 'center', color: '#444', fontFamily: "'Inter',sans-serif", fontSize: '14px', padding: '40px 20px' },
  trackRow: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 6px', borderRadius: '10px', cursor: 'pointer', borderBottom: '1px solid #111' },
  trackCover: { width: '44px', height: '44px', borderRadius: '8px', background: '#1a1a1a', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  trackInfo: { flex: 1, minWidth: 0 },
  trackTitle: { fontFamily: "'Space Grotesk',sans-serif", fontSize: '13px', fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  trackMeta: { fontSize: '11px', color: '#555', fontFamily: "'Inter',sans-serif", marginTop: '2px' },
  videoGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' },
  videoCard: { borderRadius: '10px', overflow: 'hidden', background: '#111' },
  videoThumb: { height: '96px', background: '#1a1a1a', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', cursor: 'pointer' },
  playOverlay: { position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', color: '#fff' },
  videoFooter: { padding: '7px 8px' },
  videoTitle: { fontFamily: "'Space Grotesk',sans-serif", fontSize: '12px', fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  videoMeta: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px', fontFamily: "'Inter',sans-serif", fontSize: '10px', color: '#555' },
  ytGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' },
  ytCard: { cursor: 'pointer', borderRadius: '10px', overflow: 'hidden', background: '#111' },
  ytThumb: { height: '96px', background: '#1a1a1a', position: 'relative', overflow: 'hidden' },
  ytPlayOverlay: { position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', color: '#fff' },
  ytBadge: { position: 'absolute', bottom: '5px', left: '5px', background: 'rgba(255,0,0,0.85)', borderRadius: '4px', padding: '2px 6px', fontSize: '9px', color: '#fff', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700 },
  ytTitle: { fontFamily: "'Space Grotesk',sans-serif", fontSize: '12px', fontWeight: 600, color: '#fff', padding: '7px 8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  infoCard: { background: '#111', border: '1px solid #1a1a1a', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' },
  infoLabel: { fontFamily: "'Space Grotesk',sans-serif", fontSize: '10px', fontWeight: 700, color: '#555', letterSpacing: '0.15em', marginBottom: '4px' },
  infoRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid #1a1a1a' },
  infoKey: { fontFamily: "'Inter',sans-serif", fontSize: '13px', color: '#888' },
  infoVal: { fontFamily: "'Space Grotesk',sans-serif", fontSize: '15px', fontWeight: 700, color: '#fff' },
  skeletonHeader: { height: '240px', background: 'linear-gradient(to bottom, #1a1a1a, #090909)' },
  skeletonRow: { height: '58px', borderRadius: '10px', background: '#111', animation: 'pulse 1.5s ease-in-out infinite' },
}
