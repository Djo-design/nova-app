// src/branding/Splash.jsx
import { useEffect, useState } from 'react'
import { Logo } from './Logo'
import { BRAND } from './config'

export function Splash({ onDone }) {
  const [phase, setPhase] = useState('in') // 'in' | 'hold' | 'out'

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('hold'), 600)
    const t2 = setTimeout(() => setPhase('out'), 2000)
    const t3 = setTimeout(() => onDone?.(), 2500)
    return () => [t1, t2, t3].forEach(clearTimeout)
  }, [onDone])

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: '#090909',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: '24px',
      transition: 'opacity 0.5s ease',
      opacity: phase === 'out' ? 0 : 1,
    }}>
      {/* Logo animé */}
      <div style={{
        animation: 'splashPulse 1.5s ease-in-out infinite',
        transform: phase === 'in' ? 'scale(0.8)' : 'scale(1)',
        transition: 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}>
        <Logo size={80} />
      </div>

      {/* Nom */}
      <div style={{ textAlign: 'center' }}>
        <h1 style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: '28px', fontWeight: 700, letterSpacing: '0.15em',
          color: '#FFFFFF', margin: 0,
          opacity: phase === 'in' ? 0 : 1,
          transition: 'opacity 0.5s ease 0.3s',
          textShadow: '0 0 20px rgba(0,255,135,0.4)',
        }}>
          {BRAND.fullName}
        </h1>
        <p style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: '13px', color: '#888888',
          margin: '8px 0 0', letterSpacing: '0.05em',
          opacity: phase === 'in' ? 0 : 1,
          transition: 'opacity 0.5s ease 0.5s',
        }}>
          {BRAND.tagline}
        </p>
      </div>

      <style>{`
        @keyframes splashPulse {
          0%, 100% { filter: drop-shadow(0 0 8px rgba(0,255,135,0.6)); }
          50% { filter: drop-shadow(0 0 20px rgba(0,255,135,0.9)); }
        }
      `}</style>
    </div>
  )
}
