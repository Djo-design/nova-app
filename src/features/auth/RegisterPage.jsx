// src/features/auth/RegisterPage.jsx
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { Logo } from '@/branding/Logo'
import { BRAND } from '@/branding/config'

export function RegisterPage() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (password.length < 6) { setError('Mot de passe trop court (min 6 caractères)'); return }
    setLoading(true)
    try {
      await signUp(email, password, username)
      setDone(true)
    } catch (err) {
      setError(err.message || 'Erreur lors de la création')
    } finally {
      setLoading(false)
    }
  }

  if (done) return (
    <div style={styles.page}>
      <div style={styles.card}>
        <Logo size={48} />
        <h2 style={{ color: '#00FF87', fontFamily: "'Space Grotesk',sans-serif", margin: 0 }}>Vérifie tes emails ✉️</h2>
        <p style={{ color: '#888', fontFamily: "'Inter',sans-serif", fontSize: '14px', textAlign: 'center' }}>
          Un lien de confirmation a été envoyé à <strong style={{ color: '#fff' }}>{email}</strong>.
          Clique dessus pour activer ton compte.
        </p>
        <Link to="/login" style={{ color: '#00FF87', fontFamily: "'Inter',sans-serif", fontSize: '14px' }}>
          Retour à la connexion
        </Link>
      </div>
    </div>
  )

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <Logo size={48} />
          <h1 style={styles.title}>Rejoindre {BRAND.name}</h1>
          <p style={styles.sub}>Crée ton compte gratuitement</p>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <input style={styles.input} type="text" placeholder="Pseudo" value={username} onChange={e => setUsername(e.target.value)} required />
          <input style={styles.input} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
          <input style={styles.input} type="password" placeholder="Mot de passe (min 6 car.)" value={password} onChange={e => setPassword(e.target.value)} required />
          <button style={styles.btnPrimary} type="submit" disabled={loading}>
            {loading ? 'Création...' : 'Créer mon compte'}
          </button>
        </form>

        <div style={styles.links}>
          Déjà un compte ? <Link to="/login" style={styles.link}>Se connecter</Link>
        </div>
      </div>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', background: '#090909', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' },
  card: { width: '100%', maxWidth: '380px', background: '#111', border: '1px solid #222', borderRadius: '16px', padding: '40px 32px', display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' },
  header: { textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', width: '100%' },
  title: { fontFamily: "'Space Grotesk', sans-serif", fontSize: '22px', fontWeight: 700, color: '#fff', margin: 0 },
  sub: { fontFamily: "'Inter', sans-serif", fontSize: '13px', color: '#888', margin: 0 },
  error: { background: 'rgba(255,60,60,0.1)', border: '1px solid rgba(255,60,60,0.3)', borderRadius: '8px', padding: '10px 14px', color: '#ff6b6b', fontSize: '13px', fontFamily: "'Inter', sans-serif", width: '100%', boxSizing: 'border-box' },
  form: { display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' },
  input: { background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '12px 16px', color: '#fff', fontSize: '14px', fontFamily: "'Inter', sans-serif", outline: 'none', width: '100%', boxSizing: 'border-box' },
  btnPrimary: { background: '#00FF87', color: '#000', border: 'none', borderRadius: '10px', padding: '13px', fontSize: '15px', fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif", cursor: 'pointer' },
  links: { textAlign: 'center', fontSize: '13px', fontFamily: "'Inter', sans-serif", color: '#888' },
  link: { color: '#00FF87', textDecoration: 'none' },
}
