// src/features/profile/SettingsPanel.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'

function Toggle({ label, value, onChange }) {
  return (
    <div style={s.settingRow}>
      <span style={s.settingLabel}>{label}</span>
      <div style={{ ...s.toggle, background: value ? '#00FF87' : '#2a2a2a' }} onClick={() => onChange(!value)}>
        <div style={{ ...s.toggleThumb, transform: value ? 'translateX(20px)' : 'translateX(0)' }} />
      </div>
    </div>
  )
}

function SettingLink({ icon, label, onPress, danger }) {
  return (
    <div style={{ ...s.settingRow, cursor: 'pointer' }} onClick={onPress}>
      <div style={s.settingLeft}>
        <span style={{ fontSize: '18px' }}>{icon}</span>
        <span style={{ ...s.settingLabel, color: danger ? '#ff6b6b' : '#ccc' }}>{label}</span>
      </div>
      {!danger && <span style={s.chevron}>›</span>}
    </div>
  )
}

export function SettingsPanel({ onClose }) {
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const [notifs, setNotifs]   = useState(true)
  const [privacy, setPrivacy] = useState(false)

  async function handleLogout() {
    await signOut()
    navigate('/login')
    onClose()
  }

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.sheet} onClick={e => e.stopPropagation()}>
        <div style={s.handle} />
        <div style={s.header}>
          <span style={s.title}>Paramètres</span>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Notifications */}
        <div style={s.section}>
          <div style={s.sectionTitle}>PREFERENCES</div>
          <Toggle label="Notifications" value={notifs} onChange={setNotifs} />
          <Toggle label="Profil privé" value={privacy} onChange={setPrivacy} />
        </div>

        {/* Liens */}
        <div style={s.section}>
          <div style={s.sectionTitle}>INFORMATIONS</div>
          <SettingLink icon="🌍" label="Langue" onPress={() => {}} />
          <SettingLink icon="❓" label="Support" onPress={() => window.open('mailto:support@nova-app.com')} />
          <SettingLink icon="📄" label="Conditions d'utilisation" onPress={() => {}} />
          <SettingLink icon="🔒" label="Politique de confidentialité" onPress={() => {}} />
        </div>

        {/* Déconnexion */}
        <div style={s.section}>
          <SettingLink icon="🚪" label="Se déconnecter" onPress={handleLogout} danger />
        </div>

        <div style={s.version}>NOVA by UFO GVNG · v1.0</div>
      </div>

      <style>{`
        @keyframes slideUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
      `}</style>
    </div>
  )
}

const s = {
  overlay: { position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'flex-end' },
  sheet: { width: '100%', background: '#111', borderRadius: '20px 20px 0 0', padding: '0 0 32px', animation: 'slideUp 0.3s ease', paddingBottom: 'calc(32px + env(safe-area-inset-bottom, 0px))' },
  handle: { width: '36px', height: '4px', background: '#333', borderRadius: '4px', margin: '12px auto' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px 12px', borderBottom: '1px solid #1a1a1a' },
  title: { fontFamily: "'Space Grotesk',sans-serif", fontSize: '17px', fontWeight: 700, color: '#fff' },
  closeBtn: { background: 'none', border: 'none', color: '#666', fontSize: '18px', cursor: 'pointer' },
  section: { padding: '12px 16px', borderBottom: '1px solid #1a1a1a' },
  sectionTitle: { fontFamily: "'Space Grotesk',sans-serif", fontSize: '10px', fontWeight: 700, color: '#444', letterSpacing: '0.15em', marginBottom: '10px' },
  settingRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0' },
  settingLeft: { display: 'flex', alignItems: 'center', gap: '12px' },
  settingLabel: { fontFamily: "'Inter',sans-serif", fontSize: '14px', color: '#ccc' },
  chevron: { color: '#444', fontSize: '20px', fontFamily: 'sans-serif' },
  toggle: { width: '44px', height: '24px', borderRadius: '12px', position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 },
  toggleThumb: { position: 'absolute', top: '3px', left: '3px', width: '18px', height: '18px', borderRadius: '50%', background: '#fff', transition: 'transform 0.2s' },
  version: { fontFamily: "'Inter',sans-serif", fontSize: '11px', color: '#333', textAlign: 'center', padding: '16px 0 0' },
}
