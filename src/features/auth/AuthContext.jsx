// src/features/auth/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/shared/lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  useEffect(() => {
  // récupérer la session au chargement
  supabase.auth.getSession().then(({ data }) => {
    setUser(data.session?.user ?? null)
  })

  // écouter les changements (login/logout)
  const { data: listener } = supabase.auth.onAuthStateChange(
    (_event, session) => {
      setUser(session?.user ?? null)
    }
  )

  return () => {
    listener.subscription.unsubscribe()
  }
}, [])
  const [profile, setProfile] = useState(null)
  const [role, setRole]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
  // 🔥 nettoyer l’URL après login Google
  if (window.location.hash.includes('access_token')) {
    window.location.hash = ''
  }

  // récupérer la session
  supabase.auth.getSession().then(({ data: { session } }) => {
    setUser(session?.user ?? null)

    if (session?.user) {
      fetchProfile(session.user.id)
    } else {
      setLoading(false)
    }
  })

  // écouter login/logout
  const { data: listener } = supabase.auth.onAuthStateChange(
    (_event, session) => {
      setUser(session?.user ?? null)

      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setLoading(false)
      }
    }
  )

  return () => {
    listener.subscription.unsubscribe()
  }
}, [])

  async function fetchProfile(userId) {
    try {
      // Récupère profil
      let { data: prof } = await supabase
        .from('profiles').select('*').eq('id', userId).single()

      // Si pas de profil (utilisateur créé avant le trigger), on le crée
      if (!prof) {
        const { data: userData } = await supabase.auth.getUser()
        const email = userData?.user?.email || ''
        const { data: newProf } = await supabase
          .from('profiles')
          .insert({ id: userId, username: email.split('@')[0] })
          .select().single()
        prof = newProf
      }

      // Récupère rôle
      let { data: roleData } = await supabase
        .from('user_roles').select('role').eq('user_id', userId).single()

      // Si pas de rôle, on le crée
      if (!roleData) {
        await supabase.from('user_roles').insert({ user_id: userId, role: 'user' })
        roleData = { role: 'user' }
      }

      setProfile(prof)
      setRole(roleData?.role ?? 'user')
    } catch (e) {
      console.error('fetchProfile error:', e)
      // On set des valeurs par défaut pour ne pas bloquer l'UI
      setProfile(null)
      setRole('user')
    } finally {
      setLoading(false)
    }
  }

  async function signUp(email, password, username) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username }, // transmis au trigger handle_new_user
      },
    })
    if (error) throw error
    // Le trigger SQL crée profil + rôle automatiquement
    // Mais on le fait aussi côté client en fallback
    if (data.user) {
      await supabase.from('profiles')
        .insert({ id: data.user.id, username })
        .select().single()
      await supabase.from('user_roles')
        .insert({ user_id: data.user.id, role: 'user' })
    }
    return data
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'https://nova-app-delta.vercel.app/'
      }
    })
    if (error) throw error
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  async function resetPassword(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) throw error
  }

  async function refetchProfile() {
    if (user) await fetchProfile(user.id)
  }

  return (
    <AuthContext.Provider value={{
      user, profile, role, loading,
      signUp, signIn, signInWithGoogle, signOut, resetPassword, refetchProfile,
      isAdmin:  role === 'admin',
      isArtist: role === 'artist' || role === 'admin',
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
