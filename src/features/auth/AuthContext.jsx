// src/features/auth/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/shared/lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [role, setRole]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    console.log('🔵 AuthProvider monté')

    // Vérifie la session au démarrage
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      console.log('🔵 getSession →', session ? `user: ${session.user.email}` : 'pas de session', error || '')
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Écoute les changements d'auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🟡 onAuthStateChange →', event, session ? `user: ${session.user.email}` : 'pas de session')
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setProfile(null)
        setRole(null)
        setLoading(false)
      }
    })

    return () => {
      console.log('🔴 AuthProvider démonté')
      subscription.unsubscribe()
    }
  }, [])

  async function fetchProfile(userId) {
    console.log('🟢 fetchProfile →', userId)
    try {
      // Profil
      let { data: prof, error: profErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      console.log('🟢 profiles →', prof, profErr?.message || '')

      // Si pas de profil → on le crée
      if (!prof) {
        const { data: userData } = await supabase.auth.getUser()
        const email = userData?.user?.email || ''
        const username = email.split('@')[0]
        console.log('🟢 Création profil manquant pour', username)
        const { data: newProf, error: createErr } = await supabase
          .from('profiles')
          .insert({ id: userId, username })
          .select()
          .single()
        console.log('🟢 Profil créé →', newProf, createErr?.message || '')
        prof = newProf
      }

      // Rôle
      let { data: roleData, error: roleErr } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single()

      console.log('🟢 user_roles →', roleData, roleErr?.message || '')

      // Si pas de rôle → on le crée
      if (!roleData) {
        console.log('🟢 Création rôle manquant')
        const { error: createRoleErr } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: 'user' })
        console.log('🟢 Rôle créé →', createRoleErr?.message || 'OK')
        roleData = { role: 'user' }
      }

      setProfile(prof)
      setRole(roleData?.role ?? 'user')
    } catch (e) {
      console.error('❌ fetchProfile error:', e)
      setProfile(null)
      setRole('user')
    } finally {
      setLoading(false)
    }
  }

  async function signUp(email, password, username) {
    console.log('🟢 signUp →', email, username)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
    })
    if (error) throw error

    // Fallback création profil + rôle côté client
    if (data.user) {
      await supabase.from('profiles')
        .insert({ id: data.user.id, username })
        .select()
        .single()
      await supabase.from('user_roles')
        .insert({ user_id: data.user.id, role: 'user' })
    }
    return data
  }

  async function signIn(email, password) {
    console.log('🟢 signIn →', email)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/` },
    })
    if (error) throw error
  }

  async function signOut() {
    console.log('🟢 signOut')
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
