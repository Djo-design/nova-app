// src/shared/ui/BottomNav.jsx
import { Link, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from '@/shared/lib/supabase'
import { useAuth } from '@/features/auth/AuthContext'

function useUnreadCount() {
  const { user } = useAuth()
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!user) return
    supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('read_at', null)
      .then(({ count: c }) => setCount(c || 0))
  }, [user])

  return count
}

const tabs = [
  {
    path: '/radio',
    label: 'UG RADIO',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="3" fill={active ? '#00FF87' : '#444'} />
        <path d="M6.34 6.34a8 8 0 0 0 0 11.32" stroke={active ? '#00FF87' : '#444'} strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M17.66 6.34a8 8 0 0 1 0 11.32" stroke={active ? '#00FF87' : '#444'} strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M9.17 9.17a4 4 0 0 0 0 5.66" stroke={active ? '#00FF87' : '#444'} strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M14.83 9.17a4 4 0 0 1 0 5.66" stroke={active ? '#00FF87' : '#444'} strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    path: '/tv',
    label: 'UG TV',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <rect x="2" y="4" width="20" height="14" rx="2" stroke={active ? '#00FF87' : '#444'} strokeWidth="1.5"/>
        <path d="M8 20h8" stroke={active ? '#00FF87' : '#444'} strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M10 10l5 3-5 3V10z" fill={active ? '#00FF87' : '#444'}/>
      </svg>
    ),
  },
  {
    path: '/discovery',
    label: 'DECOUVERTE',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <circle cx="11" cy="11" r="7" stroke={active ? '#00FF87' : '#444'} strokeWidth="1.5"/>
        <path d="M21 21l-3-3" stroke={active ? '#00FF87' : '#444'} strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    path: '/upload',
    label: 'UPLOAD',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke={active ? '#00FF87' : '#444'} strokeWidth="1.5"/>
        <path d="M12 8v8M8 12l4-4 4 4" stroke={active ? '#00FF87' : '#444'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    path: '/profile',
    label: 'PROFIL',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="8" r="3.5" stroke={active ? '#00FF87' : '#444'} strokeWidth="1.5"/>
        <path d="M4 19c0-3.31 3.58-6 8-6s8 2.69 8 6" stroke={active ? '#00FF87' : '#444'} strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
]

export function BottomNav() {
  const { pathname } = useLocation()
  const unread = useUnreadCount()

  return (
    <nav style={styles.nav}>
      {tabs.map(tab => {
        const active = pathname.startsWith(tab.path)
        return (
          <Link key={tab.path} to={tab.path} style={styles.tab}>
            <div style={{ position: 'relative' }}>
              {tab.icon(active)}
              {active && <div style={styles.dot} />}
            </div>
            <span style={{ ...styles.label, color: active ? '#00FF87' : '#444' }}>
              {tab.label}
            </span>
          </Link>
        )
      })}

      {/* Cloche notifications séparée */}
      <Link to="/notifications" style={styles.tab}>
        <div style={{ position: 'relative' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2a7 7 0 0 0-7 7v4l-2 3h18l-2-3V9a7 7 0 0 0-7-7z"
              stroke={pathname.startsWith('/notifications') ? '#00FF87' : '#444'}
              strokeWidth="1.5"
            />
            <path d="M10 19a2 2 0 0 0 4 0" stroke={pathname.startsWith('/notifications') ? '#00FF87' : '#444'} strokeWidth="1.5"/>
          </svg>
          {unread > 0 && (
            <div style={styles.badge}>{unread > 9 ? '9+' : unread}</div>
          )}
          {pathname.startsWith('/notifications') && <div style={styles.dot} />}
        </div>
        <span style={{ ...styles.label, color: pathname.startsWith('/notifications') ? '#00FF87' : '#444', fontSize: '7px' }}>
          NOTIFS
        </span>
      </Link>
    </nav>
  )
}

const styles = {
  nav: {
    position: 'fixed', bottom: 0, left: 0, right: 0,
    background: 'rgba(9,9,9,0.97)',
    backdropFilter: 'blur(16px)',
    borderTop: '1px solid #1a1a1a',
    display: 'flex',
    paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    zIndex: 100,
  },
  tab: {
    flex: 1, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    padding: '10px 2px 8px',
    textDecoration: 'none', gap: '4px',
    minHeight: '56px',
  },
  label: {
    fontSize: '8px', fontFamily: "'Space Grotesk', sans-serif",
    fontWeight: 700, letterSpacing: '0.04em',
    transition: 'color 0.2s',
  },
  dot: {
    position: 'absolute', bottom: '-5px', left: '50%',
    transform: 'translateX(-50%)',
    width: '4px', height: '4px', borderRadius: '50%',
    background: '#00FF87', boxShadow: '0 0 6px #00FF87',
  },
  badge: {
    position: 'absolute', top: '-4px', right: '-6px',
    background: '#ff4444', color: '#fff',
    borderRadius: '10px', padding: '1px 5px',
    fontSize: '9px', fontFamily: "'Space Grotesk',sans-serif",
    fontWeight: 700, minWidth: '16px', textAlign: 'center',
    border: '1px solid #090909',
  },
}
