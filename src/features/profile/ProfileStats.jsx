// src/features/profile/ProfileStats.jsx
import { useState } from 'react'

function StatModal({ stat, onClose }) {
  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <div style={s.bigValue}>{stat.value.toLocaleString()}</div>
        <div style={s.bigLabel}>{stat.label}</div>
        <button style={s.closeBtn} onClick={onClose}>Fermer</button>
      </div>
    </div>
  )
}

export function ProfileStats({ likes = 0, followers = 0, plays = 0 }) {
  const [open, setOpen] = useState(null)

  const stats = [
    { key: 'likes',     label: 'Likes',    value: likes,     icon: '❤️' },
    { key: 'followers', label: 'Abonnés',  value: followers, icon: '👥' },
    { key: 'plays',     label: 'Écoutes',  value: plays,     icon: '▶' },
  ]

  function fmt(n) {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
    if (n >= 1000)    return `${(n / 1000).toFixed(1)}K`
    return String(n)
  }

  return (
    <>
      <div style={s.row}>
        {stats.map((st, i) => (
          <div key={st.key} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <button style={s.stat} onClick={() => setOpen(st)}>
              <span style={s.statNum}>{fmt(st.value)}</span>
              <span style={s.statLabel}>{st.label}</span>
            </button>
            {i < stats.length - 1 && <div style={s.div} />}
          </div>
        ))}
      </div>

      {open && <StatModal stat={open} onClose={() => setOpen(null)} />}
    </>
  )
}

const s = {
  row: {
    display: 'flex', alignItems: 'center',
    background: '#111', border: '1px solid #1a1a1a',
    borderRadius: '16px', padding: '14px 8px',
    width: '100%', maxWidth: '360px',
  },
  stat: {
    flex: 1, display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: '3px',
    background: 'none', border: 'none', cursor: 'pointer',
    padding: '4px',
  },
  statNum: {
    fontFamily: "'Space Grotesk',sans-serif",
    fontSize: '20px', fontWeight: 700, color: '#fff',
  },
  statLabel: {
    fontFamily: "'Inter',sans-serif",
    fontSize: '10px', color: '#555',
  },
  div: { width: '1px', height: '32px', background: '#222' },
  overlay: {
    position: 'fixed', inset: 0, zIndex: 500,
    background: 'rgba(0,0,0,0.8)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  modal: {
    background: '#111', border: '1px solid #222',
    borderRadius: '20px', padding: '40px 32px',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: '12px', minWidth: '200px',
  },
  bigValue: {
    fontFamily: "'Space Grotesk',sans-serif",
    fontSize: '48px', fontWeight: 700, color: '#00FF87',
  },
  bigLabel: {
    fontFamily: "'Inter',sans-serif",
    fontSize: '16px', color: '#888',
  },
  closeBtn: {
    marginTop: '8px', background: '#1a1a1a',
    border: '1px solid #2a2a2a', borderRadius: '10px',
    padding: '10px 24px', color: '#fff',
    fontFamily: "'Inter',sans-serif", cursor: 'pointer',
  },
}
