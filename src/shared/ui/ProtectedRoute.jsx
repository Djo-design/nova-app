// src/shared/ui/ProtectedRoute.jsx
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'

export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div style={{ minHeight: '100vh', background: '#090909' }} />
  if (!user) return <Navigate to="/login" replace />
  return children
}

export function AdminRoute({ children }) {
  const { isAdmin, loading } = useAuth()
  if (loading) return <div style={{ minHeight: '100vh', background: '#090909' }} />
  if (!isAdmin) return <Navigate to="/" replace />
  return children
}
