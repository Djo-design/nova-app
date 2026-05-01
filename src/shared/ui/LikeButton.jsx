// src/shared/ui/LikeButton.jsx
import { useState, useEffect } from 'react'
import { supabase } from '@/shared/lib/supabase'
import { useAuth } from '@/features/auth/AuthContext'

export function LikeButton({ targetType, targetId, initialLikes = 0, size = 'md' }) {
  const { user } = useAuth()
  const [liked, setLiked] = useState(false)
  const [count, setCount] = useState(initialLikes)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user) return
    supabase
      .from('likes')
      .select('user_id')
      .eq('user_id', user.id)
      .eq('target_type', targetType)
      .eq('target_id', targetId)
      .single()
      .then(({ data }) => setLiked(!!data))
  }, [user, targetId])

  async function toggle() {
    if (!user || loading) return
    setLoading(true)
    try {
      if (liked) {
        await supabase.from('likes').delete()
          .eq('user_id', user.id).eq('target_type', targetType).eq('target_id', targetId)
        // Décrémente le compteur
        const table = targetType === 'track' ? 'tracks' : 'videos'
        await supabase.rpc('decrement_likes', { row_id: targetId, table_name: table })
        setCount(c => Math.max(0, c - 1))
        setLiked(false)
      } else {
        await supabase.from('likes').insert({ user_id: user.id, target_type: targetType, target_id: targetId })
        const table = targetType === 'track' ? 'tracks' : 'videos'
        await supabase.rpc('increment_likes', { row_id: targetId, table_name: table })
        setCount(c => c + 1)
        setLiked(true)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const isSmall = size === 'sm'

  return (
    <button
      style={{
        background: liked ? 'rgba(255,60,100,0.12)' : 'rgba(255,255,255,0.05)',
        border: `1px solid ${liked ? 'rgba(255,60,100,0.3)' : '#222'}`,
        borderRadius: '20px',
        padding: isSmall ? '4px 10px' : '6px 14px',
        display: 'flex', alignItems: 'center', gap: '5px',
        cursor: user ? 'pointer' : 'default',
        transition: 'all 0.2s',
        transform: loading ? 'scale(0.95)' : 'scale(1)',
      }}
      onClick={toggle}
    >
      <span style={{ fontSize: isSmall ? '14px' : '16px' }}>
        {liked ? '❤️' : '🤍'}
      </span>
      <span style={{
        fontFamily: "'Inter',sans-serif",
        fontSize: isSmall ? '11px' : '13px',
        color: liked ? '#ff6b6b' : '#666',
        fontWeight: 600,
      }}>
        {count}
      </span>
    </button>
  )
}
