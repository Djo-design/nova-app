// src/shared/ui/FollowButton.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/shared/lib/supabase'
import { useAuth } from '@/features/auth/AuthContext'

export function FollowButton({ artistId, size = 'md' }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [following, setFollowing] = useState(false)
  const [count, setCount]         = useState(0)
  const [loading, setLoading]     = useState(false)

  useEffect(() => {
    fetchState()
  }, [artistId, user])

  async function fetchState() {
    // Nb d'abonnés
    const { count: c } = await supabase
      .from('follows').select('*', { count: 'exact', head: true })
      .eq('artist_id', artistId)
    setCount(c || 0)

    // Est-ce que l'user suit déjà ?
    if (!user) return
    const { data } = await supabase
      .from('follows').select('follower_id')
      .eq('follower_id', user.id)
      .eq('artist_id', artistId)
      .single()
    setFollowing(!!data)
  }

  async function toggle() {
    if (!user) { navigate('/login'); return }
    if (loading) return
    setLoading(true)
    try {
      if (following) {
        await supabase.from('follows').delete()
          .eq('follower_id', user.id).eq('artist_id', artistId)
        setCount(c => Math.max(0, c - 1))
        setFollowing(false)
      } else {
        await supabase.from('follows').insert({ follower_id: user.id, artist_id: artistId })
        setCount(c => c + 1)
        setFollowing(true)
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const isSmall = size === 'sm'

  return (
    <button
      onClick={toggle}
      style={{
        background: following ? 'transparent' : '#00FF87',
        color:      following ? '#00FF87'      : '#000',
        border:     following ? '1px solid #00FF87' : 'none',
        borderRadius: '20px',
        padding: isSmall ? '6px 14px' : '10px 22px',
        fontSize: isSmall ? '12px' : '14px',
        fontFamily: "'Space Grotesk',sans-serif",
        fontWeight: 700,
        cursor: loading ? 'default' : 'pointer',
        opacity: loading ? 0.7 : 1,
        transition: 'all 0.2s',
        display: 'flex', alignItems: 'center', gap: '6px',
        flexShrink: 0,
      }}
    >
      {following ? '✓ Abonné' : '+ Suivre'}
      {count > 0 && (
        <span style={{
          fontFamily: "'Inter',sans-serif",
          fontSize: isSmall ? '10px' : '11px',
          fontWeight: 400,
          opacity: 0.7,
        }}>
          {count}
        </span>
      )}
    </button>
  )
}
