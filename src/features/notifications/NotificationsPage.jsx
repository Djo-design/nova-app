// src/features/notifications/NotificationsPage.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/shared/lib/supabase'
import { useAuth } from '@/features/auth/AuthContext'

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000
  if (diff < 60)    return 'maintenant'
  if (diff < 3600)  return `${Math.floor(diff / 60)}min`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86400)}j`
}

const NOTIF_ICONS = {
  new_follower: '👥',
  new_like:     '❤️',
  new_comment:  '💬',
  new_content:  '🎵',
}

export function NotificationsPage() {
  const { user } = useAuth()
  const navigate  = useNavigate()
  const [notifs, setNotifs]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [unread, setUnread]     = useState(0)

  useEffect(() => {
    if (!user) return
    fetchNotifs()
  }, [user])

  async function fetchNotifs() {
    setLoading(true)
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)
    setNotifs(data || [])
    setUnread((data || []).filter(n => !n.read_at).length)
    setLoading(false)
  }

  async function markAllRead() {
    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .is('read_at', null)
    setNotifs(prev => prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() })))
    setUnread(0)
  }

  async function markRead(id) {
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id)
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
    setUnread(prev => Math.max(0, prev - 1))
  }

  if (!user) return (
    <div style={styles.center}>
      <p style={{ color: '#888', fontFamily: "'Inter',sans-serif" }}>Connecte-toi pour voir tes notifications</p>
      <button style={styles.btn} onClick={() => navigate('/login')}>Se connecter</button>
    </div>
  )

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div style={styles.titleRow}>
          <h1 style={styles.pageTitle}>NOTIFICATIONS</h1>
          {unread > 0 && (
            <div style={styles.badge}>{unread}</div>
          )}
        </div>
        {unread > 0 && (
          <button style={styles.markAllBtn} onClick={markAllRead}>
            Tout marquer comme lu
          </button>
        )}
      </div>

      <div style={styles.list}>
        {loading ? (
          [...Array(5)].map((_, i) => <div key={i} style={styles.skeleton} />)
        ) : notifs.length === 0 ? (
          <div style={styles.empty}>
            <span style={{ fontSize: '48px' }}>🔔</span>
            <p>Pas encore de notifications</p>
            <p style={{ fontSize: '12px', color: '#444' }}>Elles apparaitront ici quand quelqu'un interagit avec toi</p>
          </div>
        ) : (
          notifs.map(notif => (
            <div
              key={notif.id}
              style={{ ...styles.notifRow, ...(notif.read_at ? {} : styles.notifUnread) }}
              onClick={() => { if (!notif.read_at) markRead(notif.id) }}
            >
              <div style={styles.notifIcon}>
                {NOTIF_ICONS[notif.type] || '🔔'}
              </div>
              <div style={styles.notifContent}>
                <div style={styles.notifTitle}>{notif.title}</div>
                {notif.body && <div style={styles.notifBody}>{notif.body}</div>}
                <div style={styles.notifTime}>{timeAgo(notif.created_at)}</div>
              </div>
              {!notif.read_at && <div style={styles.unreadDot} />}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', background: '#090909', paddingBottom: '100px' },
  center: { minHeight: '100vh', background: '#090909', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' },
  btn: { background: '#00FF87', color: '#000', border: 'none', borderRadius: '12px', padding: '12px 24px', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, cursor: 'pointer' },
  header: { padding: '56px 16px 12px', position: 'sticky', top: 0, background: 'rgba(9,9,9,0.97)', backdropFilter: 'blur(16px)', zIndex: 10 },
  titleRow: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' },
  pageTitle: { fontFamily: "'Space Grotesk',sans-serif", fontSize: '24px', fontWeight: 700, color: '#fff', margin: 0, letterSpacing: '0.1em' },
  badge: { background: '#00FF87', color: '#000', borderRadius: '12px', padding: '2px 8px', fontSize: '12px', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700 },
  markAllBtn: { background: 'transparent', border: '1px solid #1a1a1a', borderRadius: '8px', padding: '6px 12px', color: '#666', fontSize: '12px', fontFamily: "'Inter',sans-serif", cursor: 'pointer' },
  list: { padding: '8px 0' },
  skeleton: { height: '70px', margin: '4px 16px', borderRadius: '12px', background: '#111', animation: 'pulse 1.5s ease-in-out infinite' },
  empty: { textAlign: 'center', color: '#555', fontFamily: "'Inter',sans-serif", fontSize: '14px', padding: '60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', lineHeight: 1.6 },
  notifRow: { display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', borderBottom: '1px solid #111', cursor: 'pointer', position: 'relative', transition: 'background 0.15s' },
  notifUnread: { background: 'rgba(0,255,135,0.03)' },
  notifIcon: { width: '44px', height: '44px', borderRadius: '50%', background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 },
  notifContent: { flex: 1, minWidth: 0 },
  notifTitle: { fontFamily: "'Space Grotesk',sans-serif", fontSize: '14px', fontWeight: 600, color: '#fff', marginBottom: '2px' },
  notifBody: { fontFamily: "'Inter',sans-serif", fontSize: '12px', color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  notifTime: { fontFamily: "'Inter',sans-serif", fontSize: '11px', color: '#555', marginTop: '4px' },
  unreadDot: { width: '8px', height: '8px', borderRadius: '50%', background: '#00FF87', flexShrink: 0 },
}
