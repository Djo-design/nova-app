// src/features/player/PlayerContext.jsx
import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '@/shared/lib/supabase'
import { useAuth } from '@/features/auth/AuthContext'

const PlayerContext = createContext(null)

export function PlayerProvider({ children }) {
  const { user } = useAuth()

  // ─── Refs (ne déclenchent pas de re-render) ───
  const audioRef       = useRef(null)   // élément Audio unique
  const queueRef       = useRef([])     // queue courante
  const idxRef         = useRef(-1)     // index courant
  const modeRef        = useRef('manual') // 'manual' | 'radio'
  const allTracksRef   = useRef([])     // toutes les tracks pour la radio
  const playTimerRef   = useRef(null)

  // ─── State (UI) ───
  const [currentTrack, setCurrentTrack] = useState(null)
  const [playing, setPlaying]           = useState(false)
  const [progress, setProgress]         = useState(0)
  const [currentTime, setCurrentTime]   = useState(0)
  const [duration, setDuration]         = useState(0)
  const [volume, setVolume]             = useState(1)
  const [fullscreen, setFullscreen]     = useState(false)
  const [mode, setMode]                 = useState('manual') // pour l'UI
  const [radioActive, setRadioActive]   = useState(false)

  // ─── Charge toutes les tracks pour la radio ───
  useEffect(() => {
    supabase
      .from('tracks')
      .select('*, profiles(username, avatar_url)')
      .is('deleted_at', null)
      .limit(500)
      .then(({ data }) => { allTracksRef.current = data || [] })
  }, [])

  // ─── Crée l'élément Audio une seule fois ───
  useEffect(() => {
    const audio = new Audio()
    audio.preload = 'metadata'
    audioRef.current = audio

    audio.addEventListener('timeupdate', () => {
      setCurrentTime(audio.currentTime)
      setDuration(audio.duration || 0)
      setProgress(audio.duration ? audio.currentTime / audio.duration : 0)
    })
    audio.addEventListener('play',  () => setPlaying(true))
    audio.addEventListener('pause', () => setPlaying(false))
    audio.addEventListener('ended', handleEnded)

    return () => { audio.pause(); audio.src = '' }
  }, []) // eslint-disable-line

  // ─── Joue la track à l'index donné ───
  function loadAndPlay(queue, idx) {
    const audio = audioRef.current
    if (!audio || idx < 0 || idx >= queue.length) return

    const track = queue[idx]
    queueRef.current = queue
    idxRef.current   = idx

    audio.src = track.audio_url
    audio.load()

    // Petit délai pour laisser le src se charger
    const playPromise = audio.play()
    if (playPromise) {
      playPromise.catch(e => console.warn('play() blocked:', e))
    }

    setCurrentTrack(track)
    setProgress(0)
    setCurrentTime(0)

    // Anti-triche : comptabilise après 30s
    clearTimeout(playTimerRef.current)
    playTimerRef.current = setTimeout(() => incrementPlay(track.id), 30000)
  }

  // ─── Appelé quand la track se termine ───
  function handleEnded() {
    const m = modeRef.current

    if (m === 'radio') {
      // Radio → track aléatoire suivante
      playRandomRadio()
    } else {
      // Manuel → track suivante dans la queue
      const nextIdx = idxRef.current + 1
      if (nextIdx < queueRef.current.length) {
        loadAndPlay(queueRef.current, nextIdx)
      } else {
        // Fin de queue manuelle → reprendre la radio si elle était active
        if (radioActive) {
          modeRef.current = 'radio'
          setMode('radio')
          playRandomRadio()
        } else {
          setPlaying(false)
        }
      }
    }
  }

  function playRandomRadio() {
    const tracks = allTracksRef.current
    if (!tracks.length) return
    const randomIdx = Math.floor(Math.random() * tracks.length)
    const radioQueue = [tracks[randomIdx]]
    loadAndPlay(radioQueue, 0)
  }

  async function incrementPlay(trackId) {
    try {
      if (user) {
        await supabase.from('plays').insert({ user_id: user.id, track_id: trackId })
      }
      await supabase.rpc('increment_plays', { row_id: trackId })
    } catch (e) {
      console.error('incrementPlay:', e)
    }
  }

  // ─── API publique ───

  /** Lance une track (optionnel : avec une queue) */
  function playTrack(track, queue = null) {
    const q = queue || [track]
    const idx = q.findIndex(t => t.id === track.id)

    // Si c'est la track déjà en lecture → toggle play/pause
    if (currentTrack?.id === track.id && !queue) {
      togglePlay()
      return
    }

    // Passe en mode manuel (pause la radio)
    modeRef.current = 'manual'
    setMode('manual')

    loadAndPlay(q, idx === -1 ? 0 : idx)
  }

  /** Lance une queue à un index donné */
  function playQueue(tracks, startIdx = 0) {
    modeRef.current = 'manual'
    setMode('manual')
    loadAndPlay(tracks, startIdx)
  }

  /** Lance la radio */
  function startRadio() {
    modeRef.current = 'radio'
    setMode('radio')
    setRadioActive(true)
    playRandomRadio()
  }

  /** Arrête la radio */
  function stopRadio() {
    modeRef.current = 'manual'
    setMode('manual')
    setRadioActive(false)
    audioRef.current?.pause()
  }

  /** Met en pause l'audio (pour YouTube ou autre) */
  function pauseForVideo() {
    audioRef.current?.pause()
  }

  /** Reprend l'audio après une vidéo */
  function resumeAfterVideo() {
    if (modeRef.current === 'radio') {
      playRandomRadio()
    } else if (currentTrack) {
      audioRef.current?.play().catch(() => {})
    }
  }

  function togglePlay() {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) {
      audio.play().catch(() => {})
    } else {
      audio.pause()
    }
  }

  function next() {
    if (modeRef.current === 'radio') {
      playRandomRadio()
      return
    }
    const nextIdx = idxRef.current + 1
    if (nextIdx < queueRef.current.length) {
      loadAndPlay(queueRef.current, nextIdx)
    }
  }

  function prev() {
    const audio = audioRef.current
    // Si plus de 3s écoulées → retour au début
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0
      return
    }
    const prevIdx = idxRef.current - 1
    if (prevIdx >= 0) {
      loadAndPlay(queueRef.current, prevIdx)
    }
  }

  function seek(ratio) {
    const audio = audioRef.current
    if (!audio || !audio.duration) return
    audio.currentTime = ratio * audio.duration
  }

  function changeVolume(v) {
    setVolume(v)
    if (audioRef.current) audioRef.current.volume = v
  }

  return (
    <PlayerContext.Provider value={{
      currentTrack, playing, progress, currentTime, duration, volume,
      fullscreen, setFullscreen,
      mode, radioActive,
      playTrack, playQueue, startRadio, stopRadio,
      pauseForVideo, resumeAfterVideo,
      togglePlay, next, prev, seek, changeVolume,
    }}>
      {children}
    </PlayerContext.Provider>
  )
}

export const usePlayer = () => {
  const ctx = useContext(PlayerContext)
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider')
  return ctx
}
