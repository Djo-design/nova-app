// src/shared/ui/ReportButton.jsx
import { useState } from 'react'
import { supabase } from '@/shared/lib/supabase'
import { useAuth } from '@/features/auth/AuthContext'

const REASONS = [
  'Contenu inapproprié',
  'Harcèlement',
  'Spam',
  'Droits d\'auteur',
  'Autre',
]

export function ReportButton({ targetType, targetId }) {
  const { user } = useAuth()
  const [open, setOpen]     = useState(false)
  const [reason, setReason] = useState('')
  const [done, setDone]     = useState(false)
  const [loading, setLoading] = useState(false)

  if (!user) return null
  if (done) return <span style={{ fontSize: '10px', color: '#555', fontFamily: "'Inter',sans-serif" }}>Signalé ✓</span>

  async function submit() {
    if (!reason) return
    setLoading(true)
    await supabase.from('reports').insert({
      reporter_id: user.id,
      target_type: targetType,
      target_id:   targetId,
      reason,
    })
    setLoading(false)
    setDone(true)
    setOpen(false)
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        style={styles.flagBtn}
        onClick={() => setOpen(o => !o)}
        title="Signaler"
      >
        🚩
      </button>

      {open && (
        <div style={styles.dropdown}>
          <div style={styles.dropTitle}>Signaler ce contenu</div>
          {REASONS.map(r => (
            <button
              key={r}
              style={{ ...styles.reasonBtn, ...(reason === r ? styles.reasonBtnActive : {}) }}
              onClick={() => setReason(r)}
            >
              {r}
            </button>
          ))}
          <div style={styles.dropActions}>
            <button style={styles.cancelBtn} onClick={() => setOpen(false)}>Annuler</button>
            <button
              style={{ ...styles.submitBtn, opacity: (!reason || loading) ? 0.5 : 1 }}
              onClick={submit}
              disabled={!reason || loading}
            >
              {loading ? '...' : 'Envoyer'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  flagBtn: { background: 'none', border: 'none', fontSize: '12px', cursor: 'pointer', padding: '2px', opacity: 0.5 },
  dropdown: {
    position: 'absolute', right: 0, bottom: '24px', zIndex: 200,
    background: '#1a1a1a', border: '1px solid #2a2a2a',
    borderRadius: '12px', padding: '12px', width: '200px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
  },
  dropTitle: { fontFamily: "'Space Grotesk',sans-serif", fontSize: '12px', fontWeight: 700, color: '#fff', marginBottom: '10px' },
  reasonBtn: { display: 'block', width: '100%', background: 'transparent', border: '1px solid #2a2a2a', borderRadius: '8px', padding: '7px 10px', color: '#888', fontSize: '12px', fontFamily: "'Inter',sans-serif", cursor: 'pointer', marginBottom: '5px', textAlign: 'left' },
  reasonBtnActive: { background: 'rgba(255,60,60,0.1)', border: '1px solid rgba(255,60,60,0.3)', color: '#ff6b6b' },
  dropActions: { display: 'flex', gap: '6px', marginTop: '8px' },
  cancelBtn: { flex: 1, background: 'transparent', border: '1px solid #2a2a2a', borderRadius: '8px', padding: '7px', color: '#666', fontSize: '12px', fontFamily: "'Inter',sans-serif", cursor: 'pointer' },
  submitBtn: { flex: 1, background: '#ff6b6b', border: 'none', borderRadius: '8px', padding: '7px', color: '#000', fontSize: '12px', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, cursor: 'pointer' },
}
