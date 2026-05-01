// src/features/radio/RadioPage.jsx
import { useState, useEffect } from 'react'
import { supabase } from '@/shared/lib/supabase'
import { usePlayer } from '@/features/player/PlayerContext'
import { LikeButton } from '@/shared/ui/LikeButton'
import { ReportButton } from '@/shared/ui/ReportButton'

const TABS = ['Top écoutes', 'Top likes', 'Nouveautés']

function fmtTime(s) {
  if (!s) return ''
  const m = Math.floor(s / 60), sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export function RadioPage() {
  const [activeTab, setActiveTab] = useState(0)
  const [tracks, setTracks]       = useState([])
  const [loading, setLoading]     = useState(true)

  const { playQueue, currentTrack, playing, radioActive, startRadio, stopRadio } = usePlayer()

  useEffect(() => { fetchTracks() }, [activeTab])

  async function fetchTracks() {
    setLoading(true)
    let query = supabase
      .from('tracks')
      .select('*, profiles(username, avatar_url)')
      .is('deleted_at', null)
    if (activeTab === 0) query = query.order('plays', { ascending: false })
    if (activeTab === 1) query = query.order('likes', { ascending: false })
    if (activeTab === 2) query = query.order('created_at', { ascending: false })
    const { data } = await query.limit(50)
    setTracks(data || [])
    setLoading(false)
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.pageTitle}>UG RADIO</h1>

        {/* ── Bouton Radio ON/OFF ── */}
        <button
          style={radioActive ? styles.radioBtnOn : styles.radioBtnOff}
          onClick={radioActive ? stopRadio : startRadio}
        >
          {radioActive ? (
            <span style={styles.radioBtnInner}>
              <span style={styles.liveDot} />
              🎲 RADIO LIVE — Arrêter
            </span>
          ) : (
            <span style={styles.radioBtnInner}>
              ▶ Lancer la radio
            </span>
          )}
        </button>

        {radioActive && (
          <div style={styles.radioInfoBar}>
            <span style={styles.radioInfoDot} />
            <span style={styles.radioInfoText}>
              Lecture aléatoire continue — clique sur une track pour écouter en manuel
            </span>
          </div>
        )}

        <div style={styles.tabs}>
          {TABS.map((t, i) => (
            <button
              key={i}
              style={{ ...styles.tab, ...(activeTab === i ? styles.tabActive : {}) }}
              onClick={() => setActiveTab(i)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div style={styles.list}>
        {loading ? (
          [...Array(8)].map((_, i) => <div key={i} style={styles.skeleton} />)
        ) : tracks.length === 0 ? (
          <div style={styles.empty}>
            <span style={{ fontSize: '40px' }}>🎵</span>
            <p>Aucune track pour l'instant</p>
          </div>
        ) : (
          tracks.map((track, i) => {
            const isActive = currentTrack?.id === track.id
            return (
              <div
                key={track.id}
                style={{ ...styles.trackRow, ...(isActive ? styles.trackActive : {}) }}
                onClick={() => playQueue(tracks, i)}
              >
                {/* Rang / animation */}
                <div style={styles.rank}>
                  {isActive && playing ? (
                    <div style={styles.bars}>
                      {[0,1,2].map(j => <div key={j} style={{ ...styles.bar, animationDelay: `${j * 0.2}s` }} />)}
                    </div>
                  ) : (
                    <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '12px', color: i < 3 ? '#00FF87' : '#333' }}>
                      {i + 1}
                    </span>
                  )}
                </div>

                {/* Cover */}
                <div style={styles.cover}>
                  {track.cover_url
                    ? <img src={track.cover_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                    : <span style={{ fontSize: '18px' }}>🎵</span>}
                </div>

                {/* Infos */}
                <div style={styles.info}>
                  <div style={styles.trackTitle}>{track.title}</div>
                  <div style={styles.trackMeta}>
                    {[track.profiles?.username, fmtTime(track.duration), track.genre].filter(Boolean).join(' · ')}
                  </div>
                </div>

                {/* Actions */}
                <div style={styles.actions} onClick={e => e.stopPropagation()}>
                  <LikeButton targetType="track" targetId={track.id} initialLikes={track.likes} size="sm" />
                  <div style={styles.actionRow}>
                    <span style={styles.playsText}>▶ {track.plays || 0}</span>
                    <ReportButton targetType="track" targetId={track.id} />
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      <style>{`
        @keyframes barAnim { 0%,100%{height:4px} 50%{height:16px} }
        @keyframes blink    { 0%,100%{opacity:1} 50%{opacity:0.2} }
        @keyframes pulse    { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>
    </div>
  )
}

const styles = {
  page: { paddingBottom: '160px', minHeight: '100vh', background: '#090909' },
  header: { padding: '56px 16px 12px', position: 'sticky', top: 0, background: 'rgba(9,9,9,0.97)', backdropFilter: 'blur(16px)', zIndex: 10, display: 'flex', flexDirection: 'column', gap: '10px' },
  pageTitle: { fontFamily: "'Space Grotesk',sans-serif", fontSize: '24px', fontWeight: 700, color: '#fff', margin: 0, letterSpacing: '0.1em' },

  // Bouton OFF
  radioBtnOff: {
    background: '#1a1a1a',
    border: '1px solid #2a2a2a',
    borderRadius: '12px',
    padding: '12px 20px',
    color: '#aaa',
    fontSize: '14px',
    fontFamily: "'Space Grotesk',sans-serif",
    fontWeight: 700,
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.2s',
  },
  // Bouton ON — vert néon
  radioBtnOn: {
    background: 'rgba(0,255,135,0.1)',
    border: '1px solid #00FF87',
    borderRadius: '12px',
    padding: '12px 20px',
    color: '#00FF87',
    fontSize: '14px',
    fontFamily: "'Space Grotesk',sans-serif",
    fontWeight: 700,
    cursor: 'pointer',
    textAlign: 'left',
    boxShadow: '0 0 16px rgba(0,255,135,0.15)',
    transition: 'all 0.2s',
  },
  radioBtnInner: { display: 'flex', alignItems: 'center', gap: '8px' },
  liveDot: { width: '8px', height: '8px', borderRadius: '50%', background: '#00FF87', boxShadow: '0 0 8px #00FF87', animation: 'blink 1s ease-in-out infinite', flexShrink: 0 },

  radioInfoBar: { display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,255,135,0.05)', border: '1px solid rgba(0,255,135,0.1)', borderRadius: '8px', padding: '8px 12px' },
  radioInfoDot: { width: '6px', height: '6px', borderRadius: '50%', background: '#00FF87', animation: 'blink 1.5s ease-in-out infinite', flexShrink: 0 },
  radioInfoText: { fontFamily: "'Inter',sans-serif", fontSize: '11px', color: '#00FF87', opacity: 0.8 },

  tabs: { display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '2px' },
  tab: { background: '#1a1a1a', border: '1px solid #222', borderRadius: '20px', padding: '6px 16px', color: '#666', fontSize: '12px', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 },
  tabActive: { background: 'rgba(0,255,135,0.1)', border: '1px solid #00FF87', color: '#00FF87' },

  list: { padding: '12px' },
  skeleton: { height: '64px', borderRadius: '12px', background: '#111', marginBottom: '6px', animation: 'pulse 1.5s ease-in-out infinite' },
  empty: { textAlign: 'center', color: '#555', fontFamily: "'Inter',sans-serif", padding: '60px 20px', fontSize: '14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' },

  trackRow: { display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderRadius: '12px', cursor: 'pointer', marginBottom: '4px', transition: 'background 0.15s' },
  trackActive: { background: 'rgba(0,255,135,0.06)', border: '1px solid rgba(0,255,135,0.12)' },

  rank: { width: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  bars: { display: 'flex', alignItems: 'flex-end', gap: '2px', height: '18px' },
  bar: { width: '3px', background: '#00FF87', borderRadius: '2px', height: '4px', animation: 'barAnim 0.8s ease-in-out infinite' },

  cover: { width: '48px', height: '48px', borderRadius: '8px', background: '#1a1a1a', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  info: { flex: 1, minWidth: 0 },
  trackTitle: { fontFamily: "'Space Grotesk',sans-serif", fontSize: '14px', fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  trackMeta: { fontSize: '11px', color: '#555', fontFamily: "'Inter',sans-serif", marginTop: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },

  actions: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 },
  actionRow: { display: 'flex', alignItems: 'center', gap: '6px' },
  playsText: { fontSize: '10px', color: '#444', fontFamily: "'Inter',sans-serif" },
}
