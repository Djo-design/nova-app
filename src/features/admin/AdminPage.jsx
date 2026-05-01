// src/features/admin/AdminPage.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/shared/lib/supabase'
import { useAuth } from '@/features/auth/AuthContext'

const TABS = ['Stats', 'Utilisateurs', 'Contenus', 'Signalements']

export function AdminPage() {
  const { isAdmin } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState(0)
  const [stats, setStats] = useState({})
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isAdmin) { navigate('/'); return }
    fetchStats()
    fetchUsers()
  }, [isAdmin])

  async function fetchStats() {
    const [{ count: usersCount }, { count: artistsCount }, { count: tracksCount }, { count: videosCount }] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('user_roles').select('*', { count: 'exact', head: true }).eq('role', 'artist'),
      supabase.from('tracks').select('*', { count: 'exact', head: true }).is('deleted_at', null),
      supabase.from('videos').select('*', { count: 'exact', head: true }).is('deleted_at', null),
    ])
    setStats({ usersCount, artistsCount, tracksCount, videosCount })
    setLoading(false)
  }

  async function fetchUsers() {
    const { data } = await supabase
      .from('profiles')
      .select('*, user_roles(role)')
      .order('created_at', { ascending: false })
      .limit(50)
    setUsers(data || [])
  }

  async function suspendUser(userId) {
    await supabase.from('profiles').update({ suspended_at: new Date().toISOString() }).eq('id', userId)
    fetchUsers()
  }

  async function promoteArtist(userId) {
    await supabase.from('user_roles').update({ role: 'artist' }).eq('user_id', userId)
    fetchUsers()
  }

  if (!isAdmin) return null

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>👑 ADMIN PANEL</h1>
        <div style={styles.tabs}>
          {TABS.map((t, i) => (
            <button key={i} style={{ ...styles.tab, ...(activeTab === i ? styles.tabActive : {}) }} onClick={() => setActiveTab(i)}>{t}</button>
          ))}
        </div>
      </div>

      <div style={styles.content}>
        {activeTab === 0 && (
          <div style={styles.statsGrid}>
            {[
              { label: 'Utilisateurs', value: stats.usersCount || 0, icon: '👥' },
              { label: 'Artistes', value: stats.artistsCount || 0, icon: '🎤' },
              { label: 'Tracks', value: stats.tracksCount || 0, icon: '🎵' },
              { label: 'Vidéos', value: stats.videosCount || 0, icon: '📺' },
            ].map(s => (
              <div key={s.label} style={styles.statCard}>
                <span style={styles.statIcon}>{s.icon}</span>
                <span style={styles.statNum}>{s.value}</span>
                <span style={styles.statLabel}>{s.label}</span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 1 && (
          <div>
            {users.map(u => (
              <div key={u.id} style={styles.userRow}>
                <div style={styles.userAvatar}>
                  {u.avatar_url ? <img src={u.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : '👤'}
                </div>
                <div style={styles.userInfo}>
                  <div style={styles.userName}>{u.username}</div>
                  <div style={styles.userRole}>{u.user_roles?.[0]?.role || 'user'}</div>
                </div>
                <div style={styles.userActions}>
                  {u.user_roles?.[0]?.role === 'user' && (
                    <button style={styles.smallBtn} onClick={() => promoteArtist(u.id)}>→ Artiste</button>
                  )}
                  {!u.suspended_at && (
                    <button style={{ ...styles.smallBtn, color: '#ff6b6b', borderColor: 'rgba(255,60,60,0.3)' }} onClick={() => suspendUser(u.id)}>Suspendre</button>
                  )}
                  {u.suspended_at && <span style={{ color: '#ff6b6b', fontSize: '11px' }}>⛔ Suspendu</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 2 && (
          <div style={styles.empty}>Gestion contenus — à venir</div>
        )}
        {activeTab === 3 && (
          <div style={styles.empty}>Signalements — à venir</div>
        )}
      </div>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', background: '#090909', paddingBottom: '80px' },
  header: { padding: '56px 16px 0', position: 'sticky', top: 0, background: 'rgba(9,9,9,0.95)', backdropFilter: 'blur(12px)', zIndex: 10, paddingBottom: '12px' },
  title: { fontFamily: "'Space Grotesk',sans-serif", fontSize: '22px', fontWeight: 700, color: '#fff', margin: '0 0 16px', letterSpacing: '0.05em' },
  tabs: { display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' },
  tab: { background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '20px', padding: '6px 14px', color: '#888', fontSize: '12px', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' },
  tabActive: { background: 'rgba(255,60,60,0.1)', border: '1px solid rgba(255,60,60,0.3)', color: '#ff6b6b' },
  content: { padding: '16px' },
  statsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
  statCard: { background: '#111', border: '1px solid #1a1a1a', borderRadius: '14px', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' },
  statIcon: { fontSize: '24px' },
  statNum: { fontFamily: "'Space Grotesk',sans-serif", fontSize: '28px', fontWeight: 700, color: '#fff' },
  statLabel: { fontFamily: "'Inter',sans-serif", fontSize: '12px', color: '#666' },
  userRow: { display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid #1a1a1a' },
  userAvatar: { width: '40px', height: '40px', borderRadius: '50%', background: '#1a1a1a', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '16px' },
  userInfo: { flex: 1 },
  userName: { fontFamily: "'Space Grotesk',sans-serif", fontSize: '14px', fontWeight: 600, color: '#fff' },
  userRole: { fontFamily: "'Inter',sans-serif", fontSize: '11px', color: '#666', marginTop: '2px' },
  userActions: { display: 'flex', gap: '6px', flexShrink: 0 },
  smallBtn: { background: 'transparent', border: '1px solid #2a2a2a', borderRadius: '8px', padding: '4px 10px', color: '#00FF87', fontSize: '11px', fontFamily: "'Space Grotesk',sans-serif", cursor: 'pointer' },
  empty: { textAlign: 'center', color: '#444', fontFamily: "'Inter',sans-serif", fontSize: '14px', padding: '40px' },
}
