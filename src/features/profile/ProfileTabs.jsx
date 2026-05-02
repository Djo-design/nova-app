// src/features/profile/ProfileTabs.jsx
import { useState, useEffect } from 'react'
import { supabase } from '@/shared/lib/supabase'
import { useAuth } from '@/features/auth/AuthContext'
import { usePlayer } from '@/features/player/PlayerContext'
import { ArtistDashboard } from './ArtistDashboard'

function fmtTime(s) {
  if (!s) return ''
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
}

function MediaRow({ item, onPlay, badge }) {
  return (
    <div style={s.row} onClick={onPlay}>
      <div style={s.thumb}>
        {item.cover_url || item.thumb_url ? (
          <img
            src={item.cover_url || item.thumb_url}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            alt=""
          />
        ) : (
          <span style={{ fontSize: '18px' }}>
            {badge === 'VIDEO' ? '📹' : '🎵'}
          </span>
        )}
      </div>

      <div style={s.info}>
        <div style={s.title}>{item.title}</div>
        <div style={s.meta}>
          {badge === 'AUDIO' && item.duration ? fmtTime(item.duration) : ''}
          {item.genre
            ? (badge === 'AUDIO' && item.duration ? ' · ' : '') + item.genre
            : ''}
        </div>
      </div>

      <span
        style={{
          ...s.badge,
          background:
            badge === 'VIDEO'
              ? 'rgba(123,47,190,0.2)'
              : s.badge.background,
          color: badge === 'VIDEO' ? '#a87bd4' : s.badge.color,
        }}
      >
        {badge}
      </span>
    </div>
  )
}

export function ProfileTabs({ isArtist, userId }) {
  const { user } = useAuth()
  const { playQueue } = usePlayer()

  const userTabs = ['Historique', 'Favoris']
  const artistTabs = ['Uploads', 'Dashboard']
  const tabs = isArtist ? artistTabs : userTabs

  const [activeTab, setActiveTab] = useState(0)
  const [history, setHistory] = useState([])
  const [favorites, setFavorites] = useState([])
  const [uploads, setUploads] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!userId) return
    setActiveTab(0)
  }, [isArtist])

  useEffect(() => {
    if (!userId) return
    fetchTab()
  }, [activeTab, userId, isArtist])

  async function fetchTab() {
    setLoading(true)
    try {
      if (!isArtist) {
        if (activeTab === 0) {
          const { data } = await supabase
            .from('plays')
            .select(
              'track_id, played_at, tracks(id, title, cover_url, duration, genre, audio_url)'
            )
            .eq('user_id', userId)
            .order('played_at', { ascending: false })
            .limit(30)

          setHistory((data || []).filter(p => p.tracks))
        }

        if (activeTab === 1) {
          const { data: likedIds } = await supabase
            .from('likes')
            .select('target_id')
            .eq('user_id', userId)
            .eq('target_type', 'track')
            .order('created_at', { ascending: false })
            .limit(30)

          if (likedIds?.length) {
            const { data: tracks } = await supabase
              .from('tracks')
              .select('id, title, cover_url, duration, genre, audio_url')
              .in('id', likedIds.map(l => l.target_id))

            setFavorites(tracks || [])
          } else {
            setFavorites([])
          }
        }
      } else {
        if (activeTab === 0) {
          const [{ data: trks }, { data: vids }] = await Promise.all([
            supabase
              .from('tracks')
              .select('*')
              .eq('artist_id', userId)
              .is('deleted_at', null)
              .order('created_at', { ascending: false }),
            supabase
              .from('videos')
              .select('*')
              .eq('artist_id', userId)
              .is('deleted_at', null)
              .order('created_at', { ascending: false }),
          ])

          const combined = [
            ...(trks || []).map(t => ({ ...t, _type: 'audio' })),
            ...(vids || []).map(v => ({ ...v, _type: 'video' })),
          ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

          setUploads(combined)
        }
      }
    } catch (e) {
      console.error('fetchTab:', e)
    } finally {
      setLoading(false)
    }
  }

  function playHistory(idx) {
    const tracks = history.map(p => p.tracks)
    playQueue(tracks, idx)
  }

  function playFavorite(idx) {
    playQueue(favorites, idx)
  }

  function playUpload(idx) {
    const audioUploads = uploads.filter(u => u._type === 'audio')
    const audioIdx = audioUploads.findIndex(
      u => u.id === uploads[idx]?.id
    )
    if (audioIdx >= 0) playQueue(audioUploads, audioIdx)
  }

  const isEmpty =
    (!isArtist && activeTab === 0 && history.length === 0) ||
    (!isArtist && activeTab === 1 && favorites.length === 0) ||
    (isArtist && activeTab === 0 && uploads.length === 0)

  return (
    <div>
      <div style={s.tabBar}>
        {tabs.map((t, i) => (
          <button
            key={t}
            style={{ ...s.tab, ...(activeTab === i ? s.tabActive : {}) }}
            onClick={() => setActiveTab(i)}
          >
            {t}
          </button>
        ))}
      </div>

      <div style={s.content}>
        {isArtist && activeTab === 1 ? (
          <ArtistDashboard userId={userId} />
        ) : loading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} style={s.skeleton} />
          ))
        ) : isEmpty ? (
          <div style={s.empty}>
            <span style={{ fontSize: '36px' }}>
              {!isArtist && activeTab === 0
                ? '🕐'
                : !isArtist && activeTab === 1
                ? '❤️'
                : '⬆'}
            </span>
            <p>
              {!isArtist &&
                activeTab === 0 &&
                'Lance une track pour voir ton historique'}
              {!isArtist &&
                activeTab === 1 &&
                'Like des tracks pour les retrouver ici'}
              {isArtist &&
                activeTab === 0 &&
                "Tu n'as pas encore uploadé de contenu"}
            </p>
          </div>
        ) : (
          <>
            {!isArtist &&
              activeTab === 0 &&
              history.map((p, i) => (
                <MediaRow
                  key={i}
                  item={p.tracks}
                  badge="AUDIO"
                  onPlay={() => playHistory(i)}
                />
              ))}

            {!isArtist &&
              activeTab === 1 &&
              favorites.map((track, i) => (
                <MediaRow
                  key={track.id}
                  item={track}
                  badge="AUDIO"
                  onPlay={() => playFavorite(i)}
                />
              ))}

            {isArtist &&
              activeTab === 0 &&
              uploads.map((item, i) => (
                <MediaRow
                  key={item.id}
                  item={item}
                  badge={item._type === 'video' ? 'VIDEO' : 'AUDIO'}
                  onPlay={() =>
                    item._type === 'audio' ? playUpload(i) : null
                  }
                />
              ))}
          </>
        )}
      </div>
    </div>
  )
}

const s = {
  tabBar: { display: 'flex', borderBottom: '1px solid #1a1a1a', position: 'sticky', top: 0, background: 'rgba(9,9,9,0.97)', backdropFilter: 'blur(12px)', zIndex: 5 },
  tab: { flex: 1, background: 'none', border: 'none', padding: '13px 4px', color: '#555', fontSize: '13px', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, cursor: 'pointer', borderBottom: '2px solid transparent', transition: 'all 0.2s' },
  tabActive: { color: '#00FF87', borderBottomColor: '#00FF87' },
  content: { padding: '8px 0' },
  row: { display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid #0d0d0d' },
  thumb: { width: '46px', height: '46px', borderRadius: '8px', background: '#1a1a1a', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, minWidth: 0 },
  title: { fontFamily: "'Space Grotesk',sans-serif", fontSize: '14px', fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  meta: { fontFamily: "'Inter',sans-serif", fontSize: '11px', color: '#555', marginTop: '3px' },
  badge: { background: 'rgba(0,255,135,0.1)', border: '1px solid rgba(0,255,135,0.2)', borderRadius: '6px', padding: '2px 7px', fontSize: '9px', color: '#00FF87', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700 },
  skeleton: { height: '66px', margin: '4px 16px', borderRadius: '10px', background: '#111' },
  empty: { textAlign: 'center', color: '#555', fontFamily: "'Inter',sans-serif", fontSize: '14px', padding: '50px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' },
}