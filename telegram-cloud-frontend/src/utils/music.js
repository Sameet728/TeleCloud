export const formatTime = (seconds) => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const minutes = Math.floor(seconds / 60)
  const remainder = Math.floor(seconds % 60)
  return `${minutes}:${String(remainder).padStart(2, '0')}`
}

export const formatTrackDuration = (value) => {
  if (typeof value === 'string' && value.trim()) {
    const trimmed = value.trim()
    if (/^\d+:\d{2}(?::\d{2})?$/.test(trimmed)) return trimmed
    if (/^\d+(?:\.\d+)?$/.test(trimmed)) return formatTime(Number(trimmed))
  }
  const seconds = Number(value)
  return Number.isFinite(seconds) && seconds > 0 ? formatTime(seconds) : '--:--'
}

export const getArtworkGradient = (seed = '') => {
  const palette = [
    ['#0f172a', '#155e75'],
    ['#1f2937', '#0f766e'],
    ['#172554', '#166534'],
    ['#3f1d2e', '#9a3412'],
    ['#111827', '#7c2d12'],
    ['#042f2e', '#1d4ed8'],
  ]

  const hash = Array.from(String(seed || 'music')).reduce(
    (total, char) => total + char.charCodeAt(0),
    0
  )
  const [from, to] = palette[hash % palette.length]

  return {
    backgroundImage: `linear-gradient(135deg, ${from}, ${to})`,
  }
}

export const parseLyrics = (lyrics = '') => {
  const lines = String(lyrics || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]\s*(.*)$/)
      if (!match) {
        return { text: line, time: null }
      }

      const minutes = Number(match[1] || 0)
      const seconds = Number(match[2] || 0)
      const millis = Number((match[3] || '0').padEnd(3, '0'))

      return {
        text: match[4] || '',
        time: minutes * 60 + seconds + millis / 1000,
      }
    })

  return {
    lines,
    hasSync: lines.some((line) => Number.isFinite(line.time)),
  }
}

export const getActiveLyricIndex = (lines = [], currentTime = 0) => {
  if (!lines.some((line) => Number.isFinite(line.time))) return -1

  let activeIndex = -1
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    if (!Number.isFinite(line.time)) continue
    if (line.time <= currentTime) activeIndex = index
    if (line.time > currentTime) break
  }

  return activeIndex
}

export const getTrackMetaLine = (track = {}) =>
  [track.artist, track.album].filter(Boolean).join(' | ')

export const getPlaylistTrackCountLabel = (count = 0) =>
  `${count || 0} ${count === 1 ? 'song' : 'songs'}`
