import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Play, Pause, Volume2, VolumeX, SkipBack, SkipForward, Minimize2, X, Repeat } from 'lucide-react'
import { formatBytes } from '../../utils/helpers'

export default function AudioPlayerPro({ src, file, dark, onMinimize, onClose }) {
  const audioRef  = useRef(null)
  const canvasRef = useRef(null)
  const animRef   = useRef(null)
  const ctxRef    = useRef(null)
  const analyserRef = useRef(null)

  const [playing, setPlaying]   = useState(false)
  const [duration, setDuration] = useState(0)
  const [current, setCurrent]   = useState(0)
  const [volume, setVolume]     = useState(1)
  const [muted, setMuted]       = useState(false)
  const [speed, setSpeed]       = useState(1)
  const [loading, setLoading]   = useState(true)
  const [waveReady, setWaveReady] = useState(false)
  const [miniPlayer, setMiniPlayer] = useState(false)
  const [loop, setLoop]         = useState(false)

  // Autoplay on mount
  useEffect(() => {
    if (audioRef.current) {
      setupAudioContext()
      audioRef.current.play().then(() => {
        setPlaying(true)
        if (analyserRef.current) drawWaveform()
      }).catch(() => setPlaying(false))
    }
  }, [])

  useEffect(() => {
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [])

  const setupAudioContext = useCallback(() => {
    if (analyserRef.current || !audioRef.current) return
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      ctxRef.current = ctx
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 128
      analyserRef.current = analyser
      const source = ctx.createMediaElementSource(audioRef.current)
      source.connect(analyser)
      analyser.connect(ctx.destination)
      setWaveReady(true)
    } catch {
      // CORS blocks Web Audio on cross-origin media — gracefully degrade
    }
  }, [])

  const drawWaveform = useCallback(() => {
    const analyser = analyserRef.current
    if (!analyser) return
    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const draw = () => {
      animRef.current = requestAnimationFrame(draw)
      const canvas = canvasRef.current
      if (!canvas) return
      
      const ctx = canvas.getContext('2d')
      analyser.getByteFrequencyData(dataArray)
      const { width, height } = canvas
      ctx.clearRect(0, 0, width, height)
      const barW = Math.max(2, (width / bufferLength) * 1.5)
      const gap = 1
      let x = (width - (barW + gap) * bufferLength) / 2
      for (let i = 0; i < bufferLength; i++) {
        const barH = Math.max(2, (dataArray[i] / 255) * height * 0.85)
        const hue = 270 + (i / bufferLength) * 60
        ctx.fillStyle = `hsla(${hue}, 70%, 65%, 0.9)`
        ctx.beginPath()
        ctx.roundRect(x, height - barH, barW, barH, 2)
        ctx.fill()
        x += barW + gap
      }
    }
    draw()
  }, [])

  const toggle = () => {
    if (!audioRef.current) return
    setupAudioContext()
    if (playing) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
      if (waveReady || analyserRef.current) drawWaveform()
    }
    setPlaying(!playing)
  }

  const seek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    if (audioRef.current) audioRef.current.currentTime = pct * duration
  }

  const changeSpeed = () => {
    const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2]
    const idx = speeds.indexOf(speed)
    const next = speeds[(idx + 1) % speeds.length]
    setSpeed(next)
    if (audioRef.current) audioRef.current.playbackRate = next
  }

  const skip = (secs) => {
    if (audioRef.current) audioRef.current.currentTime = Math.max(0, Math.min(duration, audioRef.current.currentTime + secs))
  }

  const fmt = (s) => {
    if (!s || isNaN(s)) return '0:00'
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec < 10 ? '0' : ''}${sec}`
  }

  // Register media session for OS-level controls (lock screen, notification area)
  useEffect(() => {
    if ('mediaSession' in navigator && file?.fileName) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: file.fileName,
        artist: 'TeleCloud',
      })
      navigator.mediaSession.setActionHandler('play', () => { audioRef.current?.play(); setPlaying(true) })
      navigator.mediaSession.setActionHandler('pause', () => { audioRef.current?.pause(); setPlaying(false) })
      navigator.mediaSession.setActionHandler('seekbackward', () => skip(-15))
      navigator.mediaSession.setActionHandler('seekforward', () => skip(15))
    }
  }, [file?.fileName])

  const progress = duration ? (current / duration) * 100 : 0

  // Mini floating player (PiP-style for audio)
  let miniContent = null
  if (miniPlayer) {
    miniContent = createPortal(
        <div className={`fixed bottom-6 right-6 z-[9999] flex items-center gap-3 px-4 py-3 rounded-2xl border backdrop-blur-xl shadow-2xl
          ${dark ? 'bg-[#16161e]/95 border-white/10 shadow-black/40' : 'bg-white/95 border-gray-200 shadow-gray-400/30'}`}
             style={{ minWidth: 300 }}>
          <button onClick={toggle}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0 bg-gradient-to-br from-violet-600 to-fuchsia-600 shadow-md">
            {playing ? <Pause size={16} fill="white" strokeWidth={0}/> : <Play size={16} fill="white" strokeWidth={0} className="ml-0.5"/>}
          </button>
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-medium truncate ${dark ? 'text-white' : 'text-gray-900'}`}>{file?.fileName}</p>
            <div className={`w-full h-1 rounded-full mt-1.5 cursor-pointer ${dark ? 'bg-white/10' : 'bg-gray-200'}`} onClick={seek}>
              <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500" style={{ width: `${progress}%` }}/>
            </div>
            <div className={`flex justify-between text-[9px] mt-0.5 font-mono ${dark ? 'text-white/20' : 'text-gray-400'}`}>
              <span>{fmt(current)}</span><span>{fmt(duration)}</span>
            </div>
          </div>
          {/* Expand back button */}
          <button onClick={() => setMiniPlayer(false)}
            title="Expand"
            className={`p-1.5 rounded-lg shrink-0 ${dark ? 'hover:bg-white/10 text-white/40' : 'hover:bg-gray-100 text-gray-400'}`}>
            <Minimize2 size={14}/>
          </button>
          {/* Close button */}
          <button onClick={() => { audioRef.current?.pause(); setPlaying(false); setMiniPlayer(false) }}
            title="Close"
            className={`p-1.5 rounded-lg shrink-0 ${dark ? 'hover:bg-red-500/20 text-white/40 hover:text-red-400' : 'hover:bg-red-50 text-gray-400 hover:text-red-500'}`}>
            <X size={14}/>
          </button>
      </div>,
      document.body
    )
  }

  return (
    <>
      <div style={{ display: 'none' }}>
        {/* Audio element OUTSIDE conditionals & wrapped to guarantee uninterrupted playback during PiP transition */}
        <audio ref={audioRef} src={src} preload="metadata" crossOrigin="anonymous" loop={loop} autoPlay
          onLoadedMetadata={() => { setDuration(audioRef.current.duration); setLoading(false) }}
          onTimeUpdate={() => setCurrent(audioRef.current.currentTime)}
          onEnded={() => { if (!loop) setPlaying(false); if (animRef.current && !loop) cancelAnimationFrame(animRef.current) }}
        />
      </div>
      {miniContent}

      {!miniPlayer && (
        <div className={`w-full max-w-xl mx-auto flex flex-col rounded-2xl overflow-hidden border backdrop-blur-xl
          ${dark ? 'bg-[#16161e]/80 border-white/8' : 'bg-white/80 border-gray-200/80'}`}
             style={{ boxShadow: dark ? '0 25px 60px rgba(0,0,0,0.5)' : '0 25px 60px rgba(0,0,0,0.08)' }}
             onContextMenu={e => e.preventDefault()}>

          {/* Waveform Visualizer */}
          <div className={`relative h-28 ${dark ? 'bg-[#1a1a2e]' : 'bg-gradient-to-b from-gray-50 to-white'}`}>
            <canvas ref={canvasRef} width={500} height={112} className="w-full h-full"/>
            {!waveReady && !playing && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex items-end gap-[3px] h-12">
                  {Array.from({ length: 24 }).map((_, i) => (
                    <div key={i} className={`w-[3px] rounded-full ${dark ? 'bg-white/8' : 'bg-gray-200'}`}
                         style={{ height: `${20 + Math.sin(i * 0.5) * 60}%` }}/>
                  ))}
                </div>
              </div>
            )}
          </div>

      {/* Info + Controls */}
      <div className="px-5 pt-4 pb-5 flex flex-col gap-4">
        {/* Title */}
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <p className={`text-sm font-semibold truncate ${dark ? 'text-white' : 'text-gray-900'}`}>
              {file?.fileName || 'Audio'}
            </p>
            <p className={`text-[11px] mt-0.5 ${dark ? 'text-white/30' : 'text-gray-400'}`}>
              {formatBytes(file?.fileSize)}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={changeSpeed}
              className={`text-[11px] font-bold px-2 py-1 rounded-md transition-colors shrink-0
                ${dark ? 'bg-white/8 text-white/50 hover:bg-white/12' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
              {speed}×
            </button>
            <button onClick={() => { setMiniPlayer(true); onMinimize?.() }}
              title="Mini Player (Picture-in-Picture)"
              className={`p-1.5 rounded-md transition-colors shrink-0
                ${dark ? 'bg-white/8 text-white/40 hover:bg-white/12' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}>
              <Minimize2 size={13}/>
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div>
          <div className={`w-full h-1 rounded-full cursor-pointer relative group ${dark ? 'bg-white/8' : 'bg-gray-200'}`}
               onClick={seek}>
            <div className="h-full rounded-full transition-all relative bg-gradient-to-r from-violet-500 to-fuchsia-500"
                 style={{ width: `${progress}%` }}>
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-md border-2 border-violet-500 opacity-0 group-hover:opacity-100 transition-opacity -mr-1.5"/>
            </div>
          </div>
          <div className={`flex justify-between mt-1.5 text-[10px] font-mono ${dark ? 'text-white/20' : 'text-gray-400'}`}>
            <span>{fmt(current)}</span>
            <span>{fmt(duration)}</span>
          </div>
        </div>

            {/* Transport controls */}
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => setLoop(!loop)}
                className={`p-2.5 rounded-xl transition-colors
                  ${loop ? 'text-violet-500 bg-violet-500/10' : dark ? 'hover:bg-white/8 text-white/40' : 'hover:bg-gray-100 text-gray-400'}`}>
                <Repeat size={16}/>
              </button>
              <button onClick={() => skip(-15)}
                className={`p-2.5 rounded-xl transition-colors ${dark ? 'hover:bg-white/8 text-white/40' : 'hover:bg-gray-100 text-gray-400'}`}>
                <SkipBack size={16}/>
              </button>
              <button onClick={toggle}
                className={`w-12 h-12 rounded-full flex items-center justify-center text-white transition-transform hover:scale-105 active:scale-95 shadow-lg
                  ${dark ? 'bg-gradient-to-br from-violet-600 to-fuchsia-600 shadow-violet-500/20' : 'bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-violet-500/30'}`}>
                {loading
                  ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                  : playing ? <Pause size={18} fill="white" strokeWidth={0}/> : <Play size={18} fill="white" strokeWidth={0} className="ml-0.5"/>
                }
              </button>
              <button onClick={() => skip(15)}
                className={`p-2.5 rounded-xl transition-colors ${dark ? 'hover:bg-white/8 text-white/40' : 'hover:bg-gray-100 text-gray-400'}`}>
                <SkipForward size={16}/>
              </button>
              {/* Spacer to balance the loop button */}
              <div className="w-9" />
            </div>

            {/* Volume */}
            <div className="flex items-center gap-2.5 px-1">
              <button onClick={() => { setMuted(!muted); if (audioRef.current) audioRef.current.muted = !muted }}
                className={`shrink-0 ${dark ? 'text-white/25' : 'text-gray-300'}`}>
                {muted ? <VolumeX size={14}/> : <Volume2 size={14}/>}
              </button>
              <input type="range" min={0} max={1} step={0.01} value={muted ? 0 : volume}
                onChange={e => { setVolume(+e.target.value); if (audioRef.current) audioRef.current.volume = +e.target.value; setMuted(false) }}
                className="flex-1 h-1 rounded-full appearance-none accent-violet-500 cursor-pointer"
                style={{ background: dark ? 'rgba(255,255,255,0.06)' : '#e5e7eb' }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
