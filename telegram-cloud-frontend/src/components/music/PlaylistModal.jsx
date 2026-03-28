import { createPortal } from 'react-dom'
import { Loader2, Music2, Plus, X } from 'lucide-react'
import { Artwork } from './MusicCards'
import UI_LAYERS from '../../constants/uiLayers'

export default function PlaylistModal({
  open,
  track = null,
  playlists = [],
  playlistName = '',
  playlistDescription = '',
  loading = false,
  error = '',
  onNameChange,
  onDescriptionChange,
  onCreate,
  onPickPlaylist,
  onClose,
}) {
  const portalRoot = typeof document !== 'undefined' ? document.body : null
  if (!open) return null

  const modalTree = (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm p-4 flex items-center justify-center" style={{ zIndex: UI_LAYERS.modal + 8 }}>
      <div className="w-full max-w-xl rounded-[32px] border border-white/10 bg-white dark:bg-gray-950 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-800">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-gray-400">Playlist</p>
            <h3 className="text-xl font-semibold text-gray-950 dark:text-white mt-1">
              {track ? 'Add Song To Playlist' : 'Create Playlist'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {track ? (
            <div className="flex items-center gap-4 rounded-[28px] bg-gray-50 dark:bg-gray-900/70 p-4">
              <Artwork
                src={track.thumbnail}
                alt={track.title}
                seed={track.videoId || track.title}
                className="w-16 h-16 rounded-2xl object-cover"
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-950 dark:text-white truncate">{track.title}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">{track.artist}</p>
              </div>
            </div>
          ) : null}

          <div>
            <div className="flex items-center gap-2 mb-3">
              <Music2 size={16} className="text-gray-400" />
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Create a new playlist</p>
            </div>
            <div className="space-y-3">
              <input
                value={playlistName}
                onChange={(event) => onNameChange(event.target.value)}
                placeholder="Late Night Drive"
                className="input"
              />
              <textarea
                value={playlistDescription}
                onChange={(event) => onDescriptionChange(event.target.value)}
                placeholder="A short description for the vibe"
                className="input min-h-[92px] resize-none"
              />
              <button
                type="button"
                onClick={onCreate}
                disabled={loading || !playlistName.trim()}
                className="btn-primary w-full justify-center"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                Create Playlist
              </button>
            </div>
          </div>

          {track ? (
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Add to existing playlist</p>
              <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                {playlists.map((playlist) => (
                  <button
                    key={playlist._id}
                    type="button"
                    onClick={() => onPickPlaylist(playlist)}
                    className="w-full text-left rounded-[24px] border border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-900/70 px-4 py-3 hover:border-emerald-300 dark:hover:border-emerald-700"
                  >
                    <p className="text-sm font-medium text-gray-950 dark:text-white truncate">{playlist.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {playlist.trackCount || (playlist.tracks || []).length || 0} songs
                    </p>
                  </button>
                ))}
                {!playlists.length ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 rounded-[24px] border border-dashed border-gray-200 dark:border-gray-800 px-4 py-6 text-center">
                    Create your first playlist to start collecting tracks.
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          {error ? <p className="text-sm text-red-500">{error}</p> : null}
        </div>
      </div>
    </div>
  )

  return portalRoot ? createPortal(modalTree, portalRoot) : modalTree
}
