// src/shared/ui/CommentsPanel.jsx
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/shared/lib/supabase'
import { useAuth } from '@/features/auth/AuthContext'

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000
  if (diff < 60)   return 'maintenant'
  if (diff < 3600) return `${Math.floor(diff / 60)}min`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86400)}j`
}

function CommentItem({ comment, currentUserId }) {
  const [liked, setLiked]   = useState(false)
  const [count, setCount]   = useState(comment.likes || 0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!currentUserId) return
    supabase.from('comment_likes')
      .select('user_id').eq('user_id', currentUserId).eq('comment_id', comment.id)
      .maybeSingle()
      .then(({ data }) => setLiked(!!data))
  }, [currentUserId, comment.id])

  async function toggleLike() {
    if (!currentUserId || loading) return
    setLoading(true)
    try {
      if (liked) {
        await supabase.from('comment_likes').delete()
          .eq('user_id', currentUserId).eq('comment_id', comment.id)
        await supabase.rpc('decrement_comment_likes', { row_id: comment.id })
        setCount(c => Math.max(0, c - 1))
        setLiked(false)
      } else {
        await supabase.from('comment_likes').insert({ user_id: currentUserId, comment_id: comment.id })
        await supabase.rpc('increment_comment_likes', { row_id: comment.id })
        setCount(c => c + 1)
        setLiked(true)
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  return (
    <div style={styles.commentItem}>
      <div style={styles.commentAvatar}>
        {comment.profiles?.avatar_url
          ? <img src={comment.profiles.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
          : <span style={{ fontSize: '16px' }}>👤</span>}
      </div>
      <div style={styles.commentBody}>
        <div style={styles.commentHeader}>
          <span style={styles.commentUser}>{comment.profiles?.username || 'Utilisateur'}</span>
          <span style={styles.commentTime}>{timeAgo(comment.created_at)}</span>
        </div>
        <p style={styles.commentText}>{comment.content}</p>
      </div>
      <button style={styles.commentLike} onClick={toggleLike}>
        <span style={{ fontSize: '13px' }}>{liked ? '❤️' : '🤍'}</span>
        {count > 0 && <span style={{ ...styles.commentLikeCount, color: liked ? '#ff6b6b' : '#555' }}>{count}</span>}
      </button>
    </div>
  )
}

export function CommentsPanel({ targetType, targetId, onClose }) {
  const { user } = useAuth()
  const [comments, setComments] = useState([])
  const [text, setText]         = useState('')
  const [loading, setLoading]   = useState(true)
  const [sending, setSending]   = useState(false)
  const inputRef                = useRef(null)

  useEffect(() => {
    fetchComments()
    setTimeout(() => inputRef.current?.focus(), 300)
  }, [targetId])

  async function fetchComments() {
    setLoading(true)
    const { data } = await supabase
      .from('comments')
      .select('*, profiles(username, avatar_url)')
      .eq('target_type', targetType)
      .eq('target_id', targetId)
      .order('created_at', { ascending: false })
      .limit(50)
    setComments(data || [])
    setLoading(false)
  }

  async function sendComment() {
    if (!user || !text.trim() || sending) return
    setSending(true)
    const { data, error } = await supabase
      .from('comments')
      .insert({ user_id: user.id, target_type: targetType, target_id: targetId, content: text.trim() })
      .select('*, profiles(username, avatar_url)')
      .single()
    if (!error && data) {
      setComments(prev => [data, ...prev])
      setText('')
    }
    setSending(false)
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.panel} onClick={e => e.stopPropagation()}>
        {/* Handle */}
        <div style={styles.handle} />

        {/* Header */}
        <div style={styles.header}>
          <span style={styles.headerTitle}>Commentaires</span>
          {comments.length > 0 && <span style={styles.headerCount}>{comments.length}</span>}
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Liste */}
        <div style={styles.list}>
          {loading ? (
            <div style={styles.empty}>Chargement...</div>
          ) : comments.length === 0 ? (
            <div style={styles.empty}>
              <span style={{ fontSize: '32px' }}>💬</span>
              <p>Sois le premier à commenter !</p>
            </div>
          ) : (
            comments.map(c => (
              <CommentItem key={c.id} comment={c} currentUserId={user?.id} />
            ))
          )}
        </div>

        {/* Input */}
        <div style={styles.inputRow}>
          <div style={styles.inputAvatar}>
            {user?.user_metadata?.avatar_url
              ? <img src={user.user_metadata.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
              : <span style={{ fontSize: '14px' }}>👤</span>}
          </div>
          <input
            ref={inputRef}
            style={styles.input}
            placeholder={user ? 'Ajoute un commentaire...' : 'Connecte-toi pour commenter'}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendComment()}
            disabled={!user}
            maxLength={500}
          />
          <button
            style={{ ...styles.sendBtn, opacity: (!text.trim() || sending || !user) ? 0.4 : 1 }}
            onClick={sendComment}
            disabled={!text.trim() || sending || !user}
          >
            {sending ? '...' : '➤'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

const styles = {
  overlay: { position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end' },
  panel: {
    width: '100%', maxHeight: '75vh',
    background: '#111', borderRadius: '20px 20px 0 0',
    display: 'flex', flexDirection: 'column',
    animation: 'slideUp 0.3s ease',
    paddingBottom: 'env(safe-area-inset-bottom, 0px)',
  },
  handle: { width: '36px', height: '4px', background: '#333', borderRadius: '4px', margin: '12px auto 0' },
  header: { display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', borderBottom: '1px solid #1a1a1a' },
  headerTitle: { fontFamily: "'Space Grotesk',sans-serif", fontSize: '15px', fontWeight: 700, color: '#fff', flex: 1 },
  headerCount: { background: '#1a1a1a', borderRadius: '10px', padding: '2px 8px', fontSize: '12px', color: '#888', fontFamily: "'Inter',sans-serif" },
  closeBtn: { background: 'none', border: 'none', color: '#666', fontSize: '16px', cursor: 'pointer', padding: '4px' },
  list: { flex: 1, overflowY: 'auto', padding: '8px 0' },
  empty: { textAlign: 'center', color: '#555', fontFamily: "'Inter',sans-serif", fontSize: '14px', padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' },
  commentItem: { display: 'flex', gap: '10px', padding: '10px 16px', alignItems: 'flex-start' },
  commentAvatar: { width: '32px', height: '32px', borderRadius: '50%', background: '#1a1a1a', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  commentBody: { flex: 1, minWidth: 0 },
  commentHeader: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' },
  commentUser: { fontFamily: "'Space Grotesk',sans-serif", fontSize: '12px', fontWeight: 700, color: '#fff' },
  commentTime: { fontFamily: "'Inter',sans-serif", fontSize: '11px', color: '#555' },
  commentText: { fontFamily: "'Inter',sans-serif", fontSize: '13px', color: '#ccc', margin: 0, lineHeight: 1.5, wordBreak: 'break-word' },
  commentLike: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', flexShrink: 0 },
  commentLikeCount: { fontFamily: "'Inter',sans-serif", fontSize: '10px' },
  inputRow: { display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', borderTop: '1px solid #1a1a1a' },
  inputAvatar: { width: '32px', height: '32px', borderRadius: '50%', background: '#1a1a1a', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '20px', padding: '9px 14px', color: '#fff', fontSize: '13px', fontFamily: "'Inter',sans-serif", outline: 'none' },
  sendBtn: { background: '#00FF87', border: 'none', borderRadius: '50%', width: '34px', height: '34px', color: '#000', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
}
