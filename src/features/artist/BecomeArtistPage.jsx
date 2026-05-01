// src/features/artist/BecomeArtistPage.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/shared/lib/supabase'
import { useAuth } from '@/features/auth/AuthContext'
import { Logo } from '@/branding/Logo'

export function BecomeArtistPage() {
  const { user, refetchProfile } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  async function handleBecome() {
    if (!user) { navigate('/login'); return }
    setLoading(true)
    setError('')
    try {
      // 1. Met à jour le rôle → 'artist'
      const { error: roleErr } = await supabase
        .from('user_roles')
        .update({ role: 'artist' })
        .eq('user_id', user.id)
      if (roleErr) throw roleErr

      // 2. Crée artist_profiles si elle n'existe pas (upsert = insert ou ignore)
      const { error: apErr } = await supabase
        .from('artist_profiles')
        .upsert({ user_id: user.id }, { onConflict: 'user_id', ignoreDuplicates: true })
      if (apErr) throw apErr

      // 3. Rafraîchit le contexte auth
      await refetchProfile()

      // 4. Redirige vers le dashboard
      navigate('/dashboard')
    } catch (err) {
      console.error(err)
      setError(err.message || 'Une erreur est survenue. Réessaie.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <Logo size={56} />
        <h1 style={styles.title}>Devenir artiste</h1>
        <p style={styles.sub}>
          Rejoins NOVA et partage ta musique avec la communauté UFO GVNG.
        </p>

        <div style={styles.perks}>
          {[
            { icon: '⬆', text: 'Upload tes tracks & vidéos' },
            { icon: '📊', text: 'Dashboard analytics complet' },
            { icon: '🔗', text: 'Liens vers tes réseaux sociaux' },
            { icon: '▶', text: 'Tes vidéos YouTube sur ton profil' },
            { icon: '👥', text: 'Système d\'abonnés' },
          ].map((p, i) => (
            <div key={i} style={styles.perk}>
              <span style={styles.perkIcon}>{p.icon}</span>
              <span style={styles.perkText}>{p.text}</span>
            </div>
          ))}
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <button style={{ ...styles.btn, opacity: loading ? 0.7 : 1 }} onClick={handleBecome} disabled={loading}>
          {loading ? '⏳ Activation...' : '🚀 Activer mon compte artiste'}
        </button>
        <button style={styles.backBtn} onClick={() => navigate(-1)}>Annuler</button>
      </div>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', background: '#090909', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' },
  card: { width: '100%', maxWidth: '400px', background: '#111', border: '1px solid #1a1a1a', borderRadius: '20px', padding: '40px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' },
  title: { fontFamily: "'Space Grotesk',sans-serif", fontSize: '24px', fontWeight: 700, color: '#fff', margin: 0, textAlign: 'center' },
  sub: { fontFamily: "'Inter',sans-serif", fontSize: '14px', color: '#888', margin: 0, textAlign: 'center', lineHeight: 1.6 },
  perks: { width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' },
  perk: { display: 'flex', alignItems: 'center', gap: '12px', background: '#1a1a1a', borderRadius: '10px', padding: '12px 16px' },
  perkIcon: { fontSize: '20px', flexShrink: 0 },
  perkText: { fontFamily: "'Inter',sans-serif", fontSize: '14px', color: '#ccc' },
  error: { background: 'rgba(255,60,60,0.08)', border: '1px solid rgba(255,60,60,0.25)', borderRadius: '10px', padding: '12px 16px', color: '#ff6b6b', fontSize: '13px', fontFamily: "'Inter',sans-serif", width: '100%', boxSizing: 'border-box' },
  btn: { width: '100%', background: '#00FF87', color: '#000', border: 'none', borderRadius: '12px', padding: '14px', fontSize: '15px', fontWeight: 700, fontFamily: "'Space Grotesk',sans-serif", cursor: 'pointer' },
  backBtn: { background: 'transparent', border: 'none', color: '#555', fontSize: '13px', fontFamily: "'Inter',sans-serif", cursor: 'pointer' },
}
