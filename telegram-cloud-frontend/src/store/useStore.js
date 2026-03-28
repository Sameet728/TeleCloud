import { create } from 'zustand'

const readLocal = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))
const fallbackThumbnail = (videoId) =>
  videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : ''

const secondsToDuration = (value) => {
  const seconds = Number(value)
  if (!Number.isFinite(seconds) || seconds <= 0) return ''
  const minutes = Math.floor(seconds / 60)
  const remainder = Math.floor(seconds % 60)
  const hours = Math.floor(minutes / 60)
  const displayMinutes = hours ? minutes % 60 : minutes
  return hours
    ? `${hours}:${String(displayMinutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
    : `${displayMinutes}:${String(remainder).padStart(2, '0')}`
}

const normalizeDuration = (track = {}) => {
  const directValue = [track.duration, track.length, track.durationText]
    .map((value) => String(value || '').trim())
    .find(Boolean)
  if (directValue) {
    if (/^\d+:\d{2}(?::\d{2})?$/.test(directValue)) return directValue
    const fromNumericString = secondsToDuration(directValue)
    if (fromNumericString) return fromNumericString
  }

  return (
    secondsToDuration(track.durationSeconds) ||
    secondsToDuration(track.duration_seconds) ||
    secondsToDuration(track.lengthSeconds) ||
    secondsToDuration(track.length_seconds)
  )
}

const normalizeTrack = (track = {}) => ({
  videoId: String(track.videoId || '').trim(),
  title: String(track.title || 'Unknown Title').trim() || 'Unknown Title',
  artist: String(track.artist || 'Unknown Artist').trim() || 'Unknown Artist',
  thumbnail: String(track.thumbnail || '').trim() || fallbackThumbnail(String(track.videoId || '').trim()),
  duration: normalizeDuration(track),
  album: String(track.album || '').trim(),
})

const dedupeTracks = (tracks = []) => {
  const seen = new Set()
  const result = []

  tracks.forEach((track) => {
    const normalized = normalizeTrack(track)
    if (!normalized.videoId || seen.has(normalized.videoId)) return
    seen.add(normalized.videoId)
    result.push(normalized)
  })

  return result
}

const normalizePlaylist = (playlist = {}) => {
  const tracks = dedupeTracks(playlist.tracks || [])
  const coverTrack = tracks[0] || null

  return {
    ...playlist,
    tracks,
    trackCount: typeof playlist.trackCount === 'number' ? playlist.trackCount : tracks.length,
    cover: playlist.cover || coverTrack?.thumbnail || '',
    coverTrack,
    isSystem: Boolean(playlist.isSystem),
    isLikedSongs: Boolean(playlist.isLikedSongs || playlist.slug === 'liked-songs'),
  }
}

const defaultRecommendations = {
  sourceVideoId: '',
  upNext: [],
  related: [],
  quickPicks: [],
  loading: false,
  error: '',
  fetchedAt: 0,
}

const persistedLikedSongs = readLocal('tc_music_liked', [])

const useStore = create((set, get) => ({
  uploads: {},
  addUpload: (id, name) =>
    set((state) => ({
      uploads: {
        ...state.uploads,
        [id]: { progress: 0, status: 'pending', name },
      },
    })),
  updateUpload: (id, progress, status = 'uploading', speed = '') =>
    set((state) => ({
      uploads: {
        ...state.uploads,
        [id]: { ...state.uploads[id], progress, status, speed },
      },
    })),
  removeUpload: (id) =>
    set((state) => {
      const uploads = { ...state.uploads }
      delete uploads[id]
      return { uploads }
    }),

  selected: new Set(),
  toggleSelect: (id) =>
    set((state) => {
      const selected = new Set(state.selected)
      selected.has(id) ? selected.delete(id) : selected.add(id)
      return { selected }
    }),
  clearSelected: () => set({ selected: new Set() }),
  selectAll: (ids) => set({ selected: new Set(ids) }),

  musicQueue: [],
  currentTrackIndex: -1,
  isMusicPlaying: false,
  musicLoading: false,
  musicError: '',
  musicVolume: clamp(Number(readLocal('tc_music_volume', 0.92)), 0, 1),
  musicMuted: Boolean(readLocal('tc_music_muted', false)),
  playbackRate: clamp(Number(readLocal('tc_music_playback_rate', 1)), 0.5, 2),
  shuffleMode: Boolean(readLocal('tc_music_shuffle', false)),
  repeatMode: ['off', 'one', 'all'].includes(readLocal('tc_music_repeat', 'off'))
    ? readLocal('tc_music_repeat', 'off')
    : 'off',
  playerExpanded: false,
  queuePanelOpen: false,
  recentlyPlayed: dedupeTracks(readLocal('tc_music_recent', [])),
  recentSearches: readLocal('tc_music_searches', []),
  likedSongs: dedupeTracks(persistedLikedSongs),
  favorites: dedupeTracks(persistedLikedSongs),
  playlists: (readLocal('tc_music_playlists', []) || []).map(normalizePlaylist),
  categories: readLocal('tc_music_categories', []),
  selectedPlaylistId: String(readLocal('tc_music_selected_playlist', '') || ''),
  activeRecommendations: defaultRecommendations,
  recommendationCache: {},

  setMusicQueue: (tracks, options = {}) =>
    set((state) => {
      const queue = dedupeTracks(Array.isArray(tracks) ? tracks : [])
      const hasTracks = queue.length > 0
      const startIndex = hasTracks
        ? clamp(Number(options.startIndex ?? 0), 0, queue.length - 1)
        : -1

      return {
        musicQueue: queue,
        currentTrackIndex: hasTracks ? startIndex : -1,
        isMusicPlaying: hasTracks ? Boolean(options.autoplay ?? state.isMusicPlaying) : false,
        musicLoading: hasTracks ? Boolean(options.loading ?? state.musicLoading) : false,
        musicError: '',
      }
    }),

  startPlayback: (tracks, startIndex = 0) =>
    set(() => {
      const queue = dedupeTracks(Array.isArray(tracks) ? tracks : [])
      if (!queue.length) {
        return {
          musicQueue: [],
          currentTrackIndex: -1,
          isMusicPlaying: false,
          musicLoading: false,
          musicError: '',
        }
      }

      return {
        musicQueue: queue,
        currentTrackIndex: clamp(startIndex, 0, queue.length - 1),
        isMusicPlaying: true,
        musicLoading: true,
        musicError: '',
      }
    }),

  playSingleTrack: (track) =>
    set(() => {
      const normalized = normalizeTrack(track)
      if (!normalized.videoId) return {}

      return {
        musicQueue: [normalized],
        currentTrackIndex: 0,
        isMusicPlaying: true,
        musicLoading: true,
        musicError: '',
      }
    }),

  addToQueue: (track) =>
    set((state) => {
      const normalized = normalizeTrack(track)
      if (!normalized.videoId) return state
      if (state.musicQueue.some((item) => item.videoId === normalized.videoId)) {
        return state
      }
      return { musicQueue: [...state.musicQueue, normalized] }
    }),

  appendQueueTracks: (tracks) =>
    set((state) => {
      const additions = dedupeTracks(Array.isArray(tracks) ? tracks : [])
      if (!additions.length) return state

      const existingIds = new Set(state.musicQueue.map((track) => track.videoId))
      const nextTracks = additions.filter((track) => !existingIds.has(track.videoId))
      if (!nextTracks.length) return state

      return {
        musicQueue: [...state.musicQueue, ...nextTracks],
      }
    }),

  playNextNow: (track) =>
    set((state) => {
      const normalized = normalizeTrack(track)
      if (!normalized.videoId) return state

      if (state.currentTrackIndex < 0) {
        return {
          musicQueue: [normalized],
          currentTrackIndex: 0,
          isMusicPlaying: true,
          musicLoading: true,
          musicError: '',
        }
      }

      const existingIndex = state.musicQueue.findIndex((item) => item.videoId === normalized.videoId)
      const queue = [...state.musicQueue]

      if (existingIndex >= 0) {
        queue.splice(existingIndex, 1)
      }

      queue.splice(state.currentTrackIndex + 1, 0, normalized)

      let currentTrackIndex = state.currentTrackIndex
      if (existingIndex >= 0 && existingIndex < state.currentTrackIndex) {
        currentTrackIndex -= 1
      }

      return { musicQueue: queue, currentTrackIndex }
    }),

  playTrackAt: (index) =>
    set((state) => ({
      currentTrackIndex: index,
      isMusicPlaying: index >= 0 && index < state.musicQueue.length,
      musicLoading: index >= 0 && index < state.musicQueue.length,
      musicError: '',
    })),

  setMusicPlaying: (value) => set({ isMusicPlaying: Boolean(value) }),
  setMusicLoading: (value) => set({ musicLoading: Boolean(value) }),
  setMusicError: (message) => set({ musicError: message || '' }),
  setMusicVolume: (value) => set({ musicVolume: clamp(Number(value) || 0, 0, 1) }),
  setMusicMuted: (value) => set({ musicMuted: Boolean(value) }),
  setPlaybackRate: (value) => set({ playbackRate: clamp(Number(value) || 1, 0.5, 2) }),
  setShuffleMode: (value) => set({ shuffleMode: Boolean(value) }),
  setRepeatMode: (value) =>
    set({
      repeatMode: ['off', 'one', 'all'].includes(value) ? value : 'off',
    }),
  setPlayerExpanded: (value) => set({ playerExpanded: Boolean(value) }),
  setQueuePanelOpen: (value) => set({ queuePanelOpen: Boolean(value) }),

  removeFromQueueAt: (index) =>
    set((state) => {
      if (index < 0 || index >= state.musicQueue.length) return state

      const queue = state.musicQueue.filter((_, itemIndex) => itemIndex !== index)
      if (!queue.length) {
        return {
          musicQueue: [],
          currentTrackIndex: -1,
          isMusicPlaying: false,
          musicLoading: false,
          queuePanelOpen: false,
          playerExpanded: false,
        }
      }

      let currentTrackIndex = state.currentTrackIndex
      if (index < currentTrackIndex) currentTrackIndex -= 1
      if (index === currentTrackIndex) {
        currentTrackIndex = Math.min(currentTrackIndex, queue.length - 1)
      }

      return {
        musicQueue: queue,
        currentTrackIndex,
        isMusicPlaying: queue.length > 0 && state.isMusicPlaying,
      }
    }),

  moveQueueItem: (from, to) =>
    set((state) => {
      if (
        from === to ||
        from < 0 ||
        to < 0 ||
        from >= state.musicQueue.length ||
        to >= state.musicQueue.length
      ) {
        return state
      }

      const queue = [...state.musicQueue]
      const [item] = queue.splice(from, 1)
      queue.splice(to, 0, item)

      let currentTrackIndex = state.currentTrackIndex
      if (from === currentTrackIndex) currentTrackIndex = to
      else if (from < currentTrackIndex && to >= currentTrackIndex) currentTrackIndex -= 1
      else if (from > currentTrackIndex && to <= currentTrackIndex) currentTrackIndex += 1

      return { musicQueue: queue, currentTrackIndex }
    }),

  reorderQueue: (tracks) =>
    set((state) => {
      const queue = Array.isArray(tracks) ? tracks.map(normalizeTrack).filter((track) => track.videoId) : []
      if (!queue.length) return state

      const currentVideoId = state.musicQueue[state.currentTrackIndex]?.videoId || ''
      const currentTrackIndex = currentVideoId
        ? queue.findIndex((track) => track.videoId === currentVideoId)
        : state.currentTrackIndex

      return {
        musicQueue: queue,
        currentTrackIndex:
          currentTrackIndex >= 0
            ? currentTrackIndex
            : Math.min(state.currentTrackIndex, queue.length - 1),
      }
    }),

  clearQueue: () =>
    set({
      musicQueue: [],
      currentTrackIndex: -1,
      isMusicPlaying: false,
      musicLoading: false,
      queuePanelOpen: false,
      playerExpanded: false,
    }),

  playNextTrack: () =>
    set((state) => {
      if (!state.musicQueue.length) return state
      if (state.repeatMode === 'one') return { isMusicPlaying: true, musicLoading: true }

      if (state.shuffleMode && state.musicQueue.length > 1) {
        let nextIndex = Math.floor(Math.random() * state.musicQueue.length)
        if (nextIndex === state.currentTrackIndex) {
          nextIndex = (nextIndex + 1) % state.musicQueue.length
        }

        return {
          currentTrackIndex: nextIndex,
          isMusicPlaying: true,
          musicLoading: true,
          musicError: '',
        }
      }

      const nextIndex = state.currentTrackIndex + 1
      if (nextIndex >= state.musicQueue.length) {
        if (state.repeatMode === 'all') {
          return {
            currentTrackIndex: 0,
            isMusicPlaying: true,
            musicLoading: true,
            musicError: '',
          }
        }

        return {
          isMusicPlaying: false,
          musicLoading: false,
          currentTrackIndex: state.currentTrackIndex,
        }
      }

      return {
        currentTrackIndex: nextIndex,
        isMusicPlaying: true,
        musicLoading: true,
        musicError: '',
      }
    }),

  playPrevTrack: () =>
    set((state) => {
      if (!state.musicQueue.length) return state

      const prevIndex = Math.max(state.currentTrackIndex - 1, 0)
      return {
        currentTrackIndex: prevIndex,
        isMusicPlaying: true,
        musicLoading: true,
        musicError: '',
      }
    }),

  pushRecentlyPlayed: (track) =>
    set((state) => {
      const normalized = normalizeTrack(track)
      if (!normalized.videoId) return state

      const next = [normalized, ...state.recentlyPlayed.filter((item) => item.videoId !== normalized.videoId)]
      return { recentlyPlayed: next.slice(0, 24) }
    }),

  setRecentlyPlayedLocal: (tracks) =>
    set({
      recentlyPlayed: dedupeTracks(Array.isArray(tracks) ? tracks : []).slice(0, 24),
    }),

  addRecentSearch: (query) =>
    set((state) => {
      const normalized = String(query || '').trim()
      if (!normalized) return state

      const next = [
        normalized,
        ...state.recentSearches.filter((item) => item.toLowerCase() !== normalized.toLowerCase()),
      ]

      return { recentSearches: next.slice(0, 12) }
    }),

  clearRecentSearches: () => set({ recentSearches: [] }),

  toggleLikedSongLocal: (track) =>
    set((state) => {
      const normalized = normalizeTrack(track)
      if (!normalized.videoId) return state

      const exists = state.likedSongs.some((item) => item.videoId === normalized.videoId)
      const likedSongs = exists
        ? state.likedSongs.filter((item) => item.videoId !== normalized.videoId)
        : [normalized, ...state.likedSongs]

      return {
        likedSongs,
        favorites: likedSongs,
      }
    }),

  setLikedSongsLocal: (tracks) => {
    const likedSongs = dedupeTracks(Array.isArray(tracks) ? tracks : [])
    set({ likedSongs, favorites: likedSongs })
  },
  setFavoritesLocal: (tracks) => {
    const likedSongs = dedupeTracks(Array.isArray(tracks) ? tracks : [])
    set({ likedSongs, favorites: likedSongs })
  },

  setPlaylistsLocal: (playlists) =>
    set({
      playlists: (Array.isArray(playlists) ? playlists : []).map(normalizePlaylist),
    }),

  upsertPlaylistLocal: (playlist) =>
    set((state) => {
      const normalized = normalizePlaylist(playlist)
      if (!normalized?._id) return state

      const next = state.playlists.filter((item) => item._id !== normalized._id)
      next.unshift(normalized)
      next.sort((a, b) => {
        if (a.isLikedSongs && !b.isLikedSongs) return -1
        if (!a.isLikedSongs && b.isLikedSongs) return 1
        return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)
      })
      return { playlists: next }
    }),

  removePlaylistLocal: (playlistId) =>
    set((state) => ({
      playlists: state.playlists.filter((playlist) => playlist._id !== playlistId),
      selectedPlaylistId:
        state.selectedPlaylistId === playlistId ? '' : state.selectedPlaylistId,
    })),

  setCategoriesLocal: (categories) =>
    set({
      categories: Array.isArray(categories) ? categories : [],
    }),

  setSelectedPlaylistId: (playlistId) =>
    set({ selectedPlaylistId: String(playlistId || '') }),

  setRecommendationsState: (payload = {}) =>
    set((state) => ({
      activeRecommendations: {
        ...state.activeRecommendations,
        ...payload,
      },
    })),

  clearRecommendations: () => set({ activeRecommendations: defaultRecommendations }),

  hydrateRecommendationsFromCache: (videoId, maxAgeMs = 5 * 60 * 1000) => {
    const cached = get().recommendationCache[videoId]
    if (!cached) return false
    if (Date.now() - cached.fetchedAt > maxAgeMs) return false

    set({
      activeRecommendations: {
        ...defaultRecommendations,
        ...cached,
        sourceVideoId: videoId,
        loading: false,
        error: '',
      },
    })
    return true
  },

  cacheRecommendations: (videoId, payload = {}) =>
    set((state) => {
      const entry = {
        sourceVideoId: videoId,
        upNext: dedupeTracks(payload.upNext || []),
        related: dedupeTracks(payload.related || []),
        quickPicks: dedupeTracks(payload.quickPicks || []),
        fetchedAt: Date.now(),
      }

      return {
        recommendationCache: {
          ...state.recommendationCache,
          [videoId]: entry,
        },
        activeRecommendations: {
          ...defaultRecommendations,
          ...entry,
        },
      }
    }),
}))

useStore.subscribe((state) =>
  localStorage.setItem('tc_music_recent', JSON.stringify(state.recentlyPlayed || []))
)
useStore.subscribe((state) =>
  localStorage.setItem('tc_music_searches', JSON.stringify(state.recentSearches || []))
)
useStore.subscribe((state) =>
  localStorage.setItem('tc_music_liked', JSON.stringify(state.likedSongs || []))
)
useStore.subscribe((state) =>
  localStorage.setItem('tc_music_playlists', JSON.stringify(state.playlists || []))
)
useStore.subscribe((state) =>
  localStorage.setItem('tc_music_categories', JSON.stringify(state.categories || []))
)
useStore.subscribe((state) =>
  localStorage.setItem('tc_music_selected_playlist', JSON.stringify(state.selectedPlaylistId || ''))
)
useStore.subscribe((state) =>
  localStorage.setItem('tc_music_volume', JSON.stringify(state.musicVolume))
)
useStore.subscribe((state) =>
  localStorage.setItem('tc_music_muted', JSON.stringify(state.musicMuted))
)
useStore.subscribe((state) =>
  localStorage.setItem('tc_music_playback_rate', JSON.stringify(state.playbackRate))
)
useStore.subscribe((state) =>
  localStorage.setItem('tc_music_shuffle', JSON.stringify(state.shuffleMode))
)
useStore.subscribe((state) =>
  localStorage.setItem('tc_music_repeat', JSON.stringify(state.repeatMode))
)

export default useStore
