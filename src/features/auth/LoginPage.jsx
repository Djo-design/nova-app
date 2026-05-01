// src/features/auth/LoginPage.jsx
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { Logo } from '@/branding/Logo'
import { BRAND } from '@/branding/config'

export function LoginPage() {
  const { signIn, signInWithGoogle } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(email, password)
      navigate('/')
    } catch (err) {
      setError(err.message || 'Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    try { await signInWithGoogle() }
    catch (err) { setError(err.message) }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <Logo size={48} />
          <h1 style={styles.title}>{BRAND.fullName}</h1>
          <p style={styles.sub}>Connecte-toi pour découvrir les talents</p>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            style={styles.input}
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <input
            style={styles.input}
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          <button style={styles.btnPrimary} type="submit" disabled={loading}>
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <button style={styles.btnGoogle} onClick={handleGoogle}>
          <svg width="18" height="18" viewBox="0 0 18 18" style={{ marginRight: 8 }}>
            <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
            <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
            <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"/>
            <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"/>
          </svg>
          Continuer avec Google
        </button>

        <div style={styles.links}>
          <Link to="/forgot-password" style={styles.link}>Mot de passe oublié ?</Link>
          <span style={{ color: '#444' }}> · </span>
          <Link to="/register" style={styles.link}>Créer un compte</Link>
        </div>
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh', background: '#090909',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '20px',
  },
  card: {
    width: '100%', maxWidth: '380px',
    background: '#111', border: '1px solid #222',
    borderRadius: '16px', padding: '40px 32px',
    display: 'flex', flexDirection: 'column', gap: '20px',
  },
  header: { textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' },
  title: { fontFamily: "'Space Grotesk', sans-serif", fontSize: '22px', fontWeight: 700, color: '#fff', margin: 0 },
  sub: { fontFamily: "'Inter', sans-serif", fontSize: '13px', color: '#888', margin: 0 },
  error: {
    background: 'rgba(255,60,60,0.1)', border: '1px solid rgba(255,60,60,0.3)',
    borderRadius: '8px', padding: '10px 14px',
    color: '#ff6b6b', fontSize: '13px', fontFamily: "'Inter', sans-serif",
  },
  form: { display: 'flex', flexDirection: 'column', gap: '12px' },
  input: {
    background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '10px',
    padding: '12px 16px', color: '#fff', fontSize: '14px',
    fontFamily: "'Inter', sans-serif", outline: 'none', width: '100%',
    boxSizing: 'border-box',
  },
  btnPrimary: {
    background: '#00FF87', color: '#000', border: 'none', borderRadius: '10px',
    padding: '13px', fontSize: '15px', fontWeight: 700,
    fontFamily: "'Space Grotesk', sans-serif", cursor: 'pointer',
    transition: 'opacity 0.2s',
  },
  btnGoogle: {
    background: '#1a1a1a', color: '#fff', border: '1px solid #2a2a2a',
    borderRadius: '10px', padding: '12px', fontSize: '14px',
    fontFamily: "'Inter', sans-serif", cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  links: { textAlign: 'center', fontSize: '13px', fontFamily: "'Inter', sans-serif" },
  link: { color: '#00FF87', textDecoration: 'none' },
}
