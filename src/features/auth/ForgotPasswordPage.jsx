// src/features/auth/ForgotPasswordPage.jsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { Logo } from '@/branding/Logo'

export function ForgotPasswordPage() {
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      await resetPassword(email)
      setSent(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <Logo size={40} />
        <h1 style={styles.title}>Mot de passe oublié</h1>
        {sent ? (
          <p style={{ color: '#00FF87', fontFamily: "'Inter',sans-serif", fontSize: '14px', textAlign: 'center' }}>
            Email envoyé ! Vérifie ta boîte mail. 📩
          </p>
        ) : (
          <form onSubmit={handleSubmit} style={styles.form}>
            {error && <div style={styles.error}>{error}</div>}
            <input style={styles.input} type="email" placeholder="Ton email" value={email} onChange={e => setEmail(e.target.value)} required />
            <button style={styles.btn} type="submit" disabled={loading}>
              {loading ? 'Envoi...' : 'Envoyer le lien'}
            </button>
          </form>
        )}
        <Link to="/login" style={styles.link}>← Retour</Link>
      </div>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', background: '#090909', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' },
  card: { width: '100%', maxWidth: '360px', background: '#111', border: '1px solid #222', borderRadius: '16px', padding: '40px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' },
  title: { fontFamily: "'Space Grotesk',sans-serif", fontSize: '20px', fontWeight: 700, color: '#fff', margin: 0 },
  form: { display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' },
  error: { background: 'rgba(255,60,60,0.1)', border: '1px solid rgba(255,60,60,0.3)', borderRadius: '8px', padding: '10px 14px', color: '#ff6b6b', fontSize: '13px', fontFamily: "'Inter',sans-serif" },
  input: { background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '12px 16px', color: '#fff', fontSize: '14px', fontFamily: "'Inter',sans-serif", outline: 'none', width: '100%', boxSizing: 'border-box' },
  btn: { background: '#00FF87', color: '#000', border: 'none', borderRadius: '10px', padding: '12px', fontSize: '15px', fontWeight: 700, fontFamily: "'Space Grotesk',sans-serif", cursor: 'pointer' },
  link: { color: '#888', fontSize: '13px', fontFamily: "'Inter',sans-serif", textDecoration: 'none' },
}
