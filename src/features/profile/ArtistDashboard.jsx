// src/features/profile/ArtistDashboard.jsx
import { useState, useEffect } from 'react'
import { supabase } from '@/shared/lib/supabase'
import { useAuth } from '@/features/auth/AuthContext'

function Card({ icon, label, value, color = '#00FF87', sub }) {
  return (
    <div style={{ ...s.card, borderColor: color + '22' }}>
      <span style={{ fontSize: '22px' }}>{icon}</span>
      <span style={{ ...s.cardVal, color }}>{value ?? 0}</span>
      <span style={s.cardLabel}>{label}</span>
      {sub && <span style={s.cardSub}>{sub}</span>}
    </div>
  )
}

export function ArtistDashboard({ userId }) {
  const [tracks, setTracks] = useState([])
  const [videos, setVideos] = useState([])
  const [followers, setFollowers] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    fetchData()
  }, [userId])

  async function fetchData() {
    setLoading(true)
    const [
      { data: trks },
      { data: vids },
      { count: fol },
    ] = await Promise.all([
      supabase.from('tracks').select('plays,likes').eq('artist_id', userId).is('deleted_at', null),
      supabase.from('videos').select('views,likes').eq('artist_id', userId).is('deleted_at', null),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('artist_id', userId),
    ])
    setTracks(trks || [])
    setVideos(vids || [])
    setFollowers(fol || 0)
    setLoading(false)
  }

  const totalPlays  = tracks.reduce((s, t) => s + (t.plays || 0), 0)
  const totalLikes  = tracks.reduce((s, t) => s + (t.likes || 0), 0)
  const totalViews  = videos.reduce((s, v) => s + (v.views || 0), 0)
  const totalVLikes = videos.reduce((s, v) => s + (v.likes || 0), 0)

  function fmt(n) {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
    if (n >= 1000)    return `${(n / 1000).toFixed(1)}K`
    return String(n)
  }

  if (loading) return (
    <div style={s.grid}>
      {[...Array(4)].map((_, i) => <div key={i} style={s.skeleton} />)}
    </div>
  )

  return (
    <div>
      <div style={s.grid}>
        <Card icon="▶"  label="Ecoutes"     value={fmt(totalPlays)}  color="#00FF87" sub={`${tracks.length} tracks`} />
        <Card icon="❤️" label="Likes audio"  value={fmt(totalLikes)}  color="#ff6b6b" />
        <Card icon="👥" label="Abonnés"      value={fmt(followers)}   color="#00FF87" />
        <Card icon="👁" label="Vues vidéo"   value={fmt(totalViews)}  color="#7B2FBE" sub={`${videos.length} vidéos`} />
      </div>

      {/* Revenue widget (UI only) */}
      <div style={s.revenueCard}>
        <div style={s.revenueHeader}>
          <span style={s.revenueTitle}>Revenus estimés</span>
          <span style={s.revenueBadge}>Bientôt</span>
        </div>
        <div style={s.revenueAmount}>€0.00</div>
        <div style={s.revenueBar}>
          <div style={s.revenueBarFill} />
        </div>
        <p style={s.revenueSub}>La monétisation sera disponible en V1.1 🚀</p>
      </div>
    </div>
  )
}

const s = {
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' },
  card: { background: '#111', border: '1px solid', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' },
  cardVal: { fontFamily: "'Space Grotesk',sans-serif", fontSize: '26px', fontWeight: 700 },
  cardLabel: { fontFamily: "'Inter',sans-serif", fontSize: '11px', color: '#666' },
  cardSub: { fontFamily: "'Inter',sans-serif", fontSize: '10px', color: '#444' },
  skeleton: { height: '100px', borderRadius: '14px', background: '#111', animation: 'pulse 1.5s ease-in-out infinite' },
  revenueCard: { background: 'linear-gradient(135deg, rgba(0,255,135,0.06), rgba(123,47,190,0.06))', border: '1px solid rgba(0,255,135,0.15)', borderRadius: '16px', padding: '20px' },
  revenueHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' },
  revenueTitle: { fontFamily: "'Space Grotesk',sans-serif", fontSize: '14px', fontWeight: 700, color: '#fff' },
  revenueBadge: { background: 'rgba(0,255,135,0.1)', border: '1px solid rgba(0,255,135,0.2)', borderRadius: '10px', padding: '2px 8px', fontSize: '10px', color: '#00FF87', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700 },
  revenueAmount: { fontFamily: "'Space Grotesk',sans-serif", fontSize: '32px', fontWeight: 700, color: '#fff', marginBottom: '12px' },
  revenueBar: { height: '4px', background: '#1a1a1a', borderRadius: '4px', marginBottom: '10px' },
  revenueBarFill: { height: '100%', width: '0%', background: 'linear-gradient(90deg, #00FF87, #7B2FBE)', borderRadius: '4px' },
  revenueSub: { fontFamily: "'Inter',sans-serif", fontSize: '12px', color: '#666', margin: 0 },
}
