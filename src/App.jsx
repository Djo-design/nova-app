// src/App.jsx
import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/features/auth/AuthContext'
import { PlayerProvider } from '@/features/player/PlayerContext'
import { Splash } from '@/branding/Splash'
import { BottomNav } from '@/shared/ui/BottomNav'
import { MiniPlayer } from '@/features/player/MiniPlayer'
import { FullscreenPlayer } from '@/features/player/FullscreenPlayer'
import { ProtectedRoute, AdminRoute } from '@/shared/ui/ProtectedRoute'
import { usePlayer } from '@/features/player/PlayerContext'

// Auth
import { LoginPage }          from '@/features/auth/LoginPage'
import { RegisterPage }       from '@/features/auth/RegisterPage'
import { ForgotPasswordPage } from '@/features/auth/ForgotPasswordPage'

// App
import { RadioPage }          from '@/features/radio/RadioPage'
import { TVPage }             from '@/features/tv/TVPage'
import { DiscoveryPage }      from '@/features/discovery/DiscoveryPage'
import { ProfilePage }        from '@/features/profile/ProfilePage'
import { EditProfilePage }    from '@/features/profile/EditProfilePage'
import { UploadPage }         from '@/features/upload/UploadPage'

// Artiste
import { ArtistPage }         from '@/features/artist/ArtistPage'
import { DashboardPage }      from '@/features/artist/DashboardPage'
import { BecomeArtistPage }   from '@/features/artist/BecomeArtistPage'

// Admin
import { AdminPage }          from '@/features/admin/AdminPage'

function AppLayout({ children }) {
  const { fullscreen } = usePlayer()
  return (
    <div style={{ background: '#090909', minHeight: '100vh' }}>
      {children}
      <MiniPlayer />
      {fullscreen && <FullscreenPlayer />}
      <BottomNav />
    </div>
  )
}

export function App() {
  const [splashDone, setSplashDone] = useState(false)

  return (
    <AuthProvider>
      <PlayerProvider>
        {!splashDone && <Splash onDone={() => setSplashDone(true)} />}
        <BrowserRouter>
          <Routes>
            {/* Auth */}
            <Route path="/login"           element={<LoginPage />} />
            <Route path="/register"        element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />

            {/* Pages principales */}
            <Route path="/radio"      element={<AppLayout><RadioPage /></AppLayout>} />
            <Route path="/tv"         element={<AppLayout><TVPage /></AppLayout>} />
            <Route path="/discovery"  element={<AppLayout><DiscoveryPage /></AppLayout>} />

            {/* Upload (artiste requis) */}
            <Route path="/upload" element={<AppLayout><ProtectedRoute><UploadPage /></ProtectedRoute></AppLayout>} />

            {/* Profil */}
            <Route path="/profile"      element={<AppLayout><ProtectedRoute><ProfilePage /></ProtectedRoute></AppLayout>} />
            <Route path="/profile/edit" element={<AppLayout><ProtectedRoute><EditProfilePage /></ProtectedRoute></AppLayout>} />

            {/* Artiste */}
            <Route path="/artist/:artistId"  element={<AppLayout><ArtistPage /></AppLayout>} />
            <Route path="/dashboard"         element={<AppLayout><ProtectedRoute><DashboardPage /></ProtectedRoute></AppLayout>} />
            <Route path="/become-artist"     element={<AppLayout><ProtectedRoute><BecomeArtistPage /></ProtectedRoute></AppLayout>} />

            {/* Admin */}
            <Route path="/admin" element={<AppLayout><AdminRoute><AdminPage /></AdminRoute></AppLayout>} />

            {/* Redirects */}
            <Route path="/"  element={<Navigate to="/radio" replace />} />
            <Route path="*"  element={<Navigate to="/radio" replace />} />
          </Routes>
        </BrowserRouter>
      </PlayerProvider>
    </AuthProvider>
  )
}
