// src/features/player/PlayerContext.jsx
import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '@/shared/lib/supabase'
import { useAuth } from '@/features/auth/AuthContext'

const PlayerContext = createContext(null)

export function PlayerProvider({ children }) {
  const { user } = useAuth()
  const audioRef      = useRef(null)
  const playTimerRef  = useRef(null)
  const modeRef       = useRef('manual') // 'manual' | 'radio'

  const [queue, setQueue]           = useState([])
  const [allTracks, setAllTracks]   = useState([]) // pour la radio
  const [currentIdx, setCurrentIdx] = useState(-1)
  const [playing, setPlaying]       = useState(false)
  const [progress, setProgress]     = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration]     = useState(0)
  const [volume, setVolume]         = useState(1)
  const [fullscreen, setFullscreen] = useState(false)
  const [mode, setMode]             = useState('manual') // 'manual' | 'radio'
  const [radioActive, setRadioActive] = useState(false)

  const currentTrack = queue[currentIdx] ?? null

  // Charge toutes les tracks pour la radio au démarrage
  useEffect(() => {
    supabase.from('tracks').select('*, profiles(username, avatar_url)').is('deleted_at', null).limit(200)
      .then(({ data }) => setAllTracks(data || []))
  }, [])

  // Init audio element
  useEffect(() => {
    const audio = new Audio()
    audio.preload = 'metadata'
    audioRef.current = audio

    const onTime = () => {
      setCurrentTime(audio.currentTime)
      setDuration(audio.duration || 0)
      setProgress(audio.duration ? audio.currentTime / audio.duration : 0)
    }
    const onPlay  = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onEnded = () => handleEnded()

    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('ended', onEnded)

    return () => {
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('ended', onEnded)
      audio.pause()
    }
  }, [])

  function handleEnded() {
    const m = modeRef.current
    if (m === 'radio') {
      // Radio : pick une track aléatoire
      playRadioNext()
    } else {
      // Manuel : track suivante dans la queue
      setCurrentIdx(prev => {
        if (prev < queue.length - 1) return prev + 1
        // Fin de queue → si radio était active avant, reprendre la radio
        if (radioActive) {
          modeRef.current = 'radio'
          setMode('radio')
          playRadioNext()
        }
        return prev
      })
    }
  }

  function playRadioNext() {
    if (allTracks.length === 0) return
    const randomTrack = allTracks[Math.floor(Math.random() * allTracks.length)]
    setQueue([randomTrack])
    setCurrentIdx(0)
  }

  // Change de src quand currentIdx change
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || currentIdx === -1 || !queue[currentIdx]) return
    const track = queue[currentIdx]
    audio.src = track.audio_url
    audio.load()
    audio.play().catch(e => console.warn('Autoplay blocked:', e))
    setProgress(0)
    setCurrentTime(0)
    // Anti-triche : comptabilise après 30s
    clearTimeout(playTimerRef.current)
    playTimerRef.current = setTimeout(() => incrementPlay(track.id), 30000)
  }, [currentIdx, queue])

  async function incrementPlay(trackId) {
    try {
      if (user) {
        await supabase.from('plays').insert({ user_id: user.id, track_id: trackId })
      }
      await supabase.rpc('increment_plays', { row_id: trackId })
    } catch (e) {
      console.error('incrementPlay error:', e)
    }
  }

  // ── API publique ──

  function playTrack(track, newQueue = null) {
    modeRef.current = 'manual'
    setMode('manual')
    const q = newQueue ?? [track]
    if (newQueue) setQueue(newQueue)
    else if (!queue.find(t => t.id === track.id)) setQueue([track])

    const idx = q.findIndex(t => t.id === track.id)
    if (idx === currentIdx && !newQueue) {
      togglePlay()
    } else {
      setCurrentIdx(idx === -1 ? 0 : idx)
    }
  }

  function playQueue(tracks, startIdx = 0) {
    modeRef.current = 'manual'
    setMode('manual')
    setQueue(tracks)
    setCurrentIdx(startIdx)
  }

  function startRadio() {
    modeRef.current = 'radio'
    setMode('radio')
    setRadioActive(true)
    playRadioNext()
  }

  function stopRadio() {
    modeRef.current = 'manual'
    setMode('manual')
    setRadioActive(false)
    audioRef.current?.pause()
    setPlaying(false)
  }

  function togglePlay() {
    const audio = audioRef.current
    if (!audio) return
    playing ? audio.pause() : audio.play().catch(() => {})
  }

  function next() {
    if (mode === 'radio') { playRadioNext(); return }
    if (currentIdx < queue.length - 1) setCurrentIdx(i => i + 1)
  }

  function prev() {
    const audio = audioRef.current
    if (audio && audio.currentTime > 3) { audio.currentTime = 0; return }
    if (currentIdx > 0) setCurrentIdx(i => i - 1)
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
      currentTrack, queue, currentIdx, allTracks,
      playing, progress, currentTime, duration, volume,
      fullscreen, setFullscreen,
      mode, radioActive,
      playTrack, playQueue, startRadio, stopRadio,
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
