// src/shared/ui/LikeButton.jsx
import { useState, useEffect } from 'react'
import { supabase } from '@/shared/lib/supabase'
import { useAuth } from '@/features/auth/AuthContext'

export function LikeButton({ targetType, targetId, initialLikes = 0, size = 'md' }) {
  const { user } = useAuth()
  const [liked, setLiked]   = useState(false)
  const [count, setCount]   = useState(initialLikes)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user || !targetId) return
    // maybeSingle() au lieu de single() → pas d'erreur 406 si aucune ligne
    supabase
      .from('likes')
      .select('user_id')
      .eq('user_id', user.id)
      .eq('target_type', targetType)
      .eq('target_id', targetId)
      .maybeSingle()
      .then(({ data }) => setLiked(!!data))
  }, [user, targetId, targetType])

  async function toggle() {
    if (!user || loading) return
    setLoading(true)
    try {
      if (liked) {
        await supabase.from('likes').delete()
          .eq('user_id', user.id)
          .eq('target_type', targetType)
          .eq('target_id', targetId)
        await supabase.rpc('decrement_likes', { row_id: targetId, table_name: targetType === 'track' ? 'tracks' : 'videos' })
        setCount(c => Math.max(0, c - 1))
        setLiked(false)
      } else {
        await supabase.from('likes').insert({ user_id: user.id, target_type: targetType, target_id: targetId })
        await supabase.rpc('increment_likes', { row_id: targetId, table_name: targetType === 'track' ? 'tracks' : 'videos' })
        setCount(c => c + 1)
        setLiked(true)
      }
    } catch (e) {
      console.error('LikeButton error:', e)
    } finally {
      setLoading(false)
    }
  }

  const isSmall = size === 'sm'

  return (
    <button
      onClick={toggle}
      style={{
        background: liked ? 'rgba(255,60,100,0.12)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${liked ? 'rgba(255,60,100,0.3)' : '#1a1a1a'}`,
        borderRadius: '20px',
        padding: isSmall ? '4px 10px' : '6px 14px',
        display: 'flex', alignItems: 'center', gap: '5px',
        cursor: user ? 'pointer' : 'default',
        transition: 'all 0.2s',
        opacity: loading ? 0.6 : 1,
      }}
    >
      <span style={{ fontSize: isSmall ? '13px' : '15px' }}>
        {liked ? '❤️' : '🤍'}
      </span>
      <span style={{
        fontFamily: "'Inter',sans-serif",
        fontSize: isSmall ? '11px' : '13px',
        color: liked ? '#ff6b6b' : '#555',
        fontWeight: 600,
      }}>
        {count}
      </span>
    </button>
  )
}
