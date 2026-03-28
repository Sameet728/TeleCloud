import { useEffect, useState } from 'react'
import { Heart, ListMusic, ListPlus, Play, SkipForward } from 'lucide-react'
import { formatTrackDuration, getArtworkGradient, getPlaylistTrackCountLabel, getTrackMetaLine } from '../../utils/music'

export function Artwork({ src, alt, seed, className = '' }) {
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
  }, [src])

  if (src && !failed) {
    return <img src={src} alt={alt} className={className} loading="lazy" onError={() => setFailed(true)} />
  }

  return (
    <div
      className={className}
      style={getArtworkGradient(seed || alt)}
      aria-hidden="true"
    />
  )
}

export function SectionHeader({ title, subtitle, action = null }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        <h2 className="text-[15px] font-semibold text-gray-950 dark:text-white md:text-base">{title}</h2>
        {subtitle ? (
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
        ) : null}
      </div>
      {action}
    </div>
  )
}

export function SectionSkeleton({ variant = 'cards', count = 4 }) {
  if (variant === 'rows') {
    return (
      <div className="space-y-3">
        {Array.from({ length: count }).map((_, index) => (
          <div
            key={`row-skeleton-${index}`}
            className="h-14 rounded-[20px] bg-gray-100 dark:bg-gray-800/80 animate-pulse"
          />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={`card-skeleton-${index}`}
          className="h-52 rounded-[22px] bg-gray-100 dark:bg-gray-800/80 animate-pulse"
        />
      ))}
    </div>
  )
}

export function EmptyMusicState({ title, description, action = null, compact = false }) {
  return (
    <div
      className={[
        'rounded-[28px] border border-dashed border-gray-200 dark:border-gray-700/80 bg-white/70 dark:bg-gray-900/70',
        compact ? 'p-4' : 'p-5 md:p-6',
      ].join(' ')}
    >
      <p className="text-sm font-semibold text-gray-900 dark:text-white">{title}</p>
      <p className="mt-1.5 max-w-xl text-xs text-gray-500 dark:text-gray-400">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}

export function TrackRailCard({
  track,
  onPlay,
  onToggleLike,
  onAddToQueue,
  onPlayNext,
  onAddToPlaylist,
  isLiked = false,
}) {
  const durationText = formatTrackDuration(track.duration)

  return (
    <article className="group overflow-hidden rounded-[24px] border border-white/60 bg-white/85 shadow-[0_18px_60px_-30px_rgba(15,23,42,0.35)] backdrop-blur-md transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_70px_-28px_rgba(15,23,42,0.45)] dark:border-white/5 dark:bg-gray-900/75">
      <div className="relative">
        <Artwork
          src={track.thumbnail}
          alt={track.title}
          seed={track.videoId || track.title}
          className="w-full aspect-square object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent opacity-80" />
        <button
          type="button"
          onClick={onPlay}
          className="absolute bottom-3.5 right-3.5 flex h-11 w-11 translate-y-2 items-center justify-center rounded-full bg-emerald-500 text-white opacity-0 shadow-lg shadow-emerald-900/30 transition duration-200 group-hover:translate-y-0 group-hover:opacity-100"
          title="Play"
        >
          <Play size={20} className="fill-current ml-0.5" />
        </button>
      </div>

      <div className="p-3.5">
        <p className="text-sm font-semibold text-gray-950 dark:text-white truncate">{track.title}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">{getTrackMetaLine(track) || track.artist}</p>
        <div className="mt-3 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>{durationText === '--:--' ? 'Track' : durationText}</span>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-gray-500 dark:bg-gray-800 dark:text-gray-400">
            Song
          </span>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-1.5">
          <button
            type="button"
            onClick={onToggleLike}
            className="flex h-9 items-center justify-center rounded-[1rem] bg-gray-100/80 transition hover:scale-[1.03] dark:bg-gray-800/90"
            title={isLiked ? 'Unlike' : 'Like'}
          >
            <Heart size={16} className={isLiked ? 'text-pink-500 fill-pink-500' : ''} />
          </button>
          <button
            type="button"
            onClick={onPlayNext}
            className="flex h-9 items-center justify-center rounded-[1rem] bg-gray-100/80 transition hover:scale-[1.03] dark:bg-gray-800/90"
            title="Play next"
          >
            <SkipForward size={16} />
          </button>
          <button
            type="button"
            onClick={onAddToQueue}
            className="flex h-9 items-center justify-center rounded-[1rem] bg-gray-100/80 transition hover:scale-[1.03] dark:bg-gray-800/90"
            title="Add to queue"
          >
            <ListPlus size={16} />
          </button>
          <button
            type="button"
            onClick={onAddToPlaylist}
            className="flex h-9 items-center justify-center rounded-[1rem] bg-gray-100/80 transition hover:scale-[1.03] dark:bg-gray-800/90"
            title="Add to playlist"
          >
            <ListMusic size={16} />
          </button>
        </div>
      </div>
    </article>
  )
}

export function TrackListRow({
  track,
  index,
  onPlay,
  onToggleLike,
  onAddToQueue,
  onPlayNext,
  onAddToPlaylist,
  isLiked = false,
  active = false,
}) {
  const durationText = formatTrackDuration(track.duration)
  const actionButtonClass =
    'w-8 h-8 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl border border-gray-200/80 dark:border-white/10 bg-white/70 dark:bg-white/[0.04] hover:bg-gray-100 dark:hover:bg-white/[0.08] flex items-center justify-center shrink-0'

  return (
    <div
      className={[
        'group rounded-[20px] border px-2.5 py-2 sm:px-3 sm:py-2.5 transition duration-200 shadow-[0_14px_32px_-30px_rgba(15,23,42,0.45)]',
        active
          ? 'border-emerald-300/70 dark:border-emerald-600/50 bg-emerald-50/85 dark:bg-emerald-950/25'
          : 'border-white/60 dark:border-white/5 bg-white/88 dark:bg-gray-900/78 hover:bg-white dark:hover:bg-gray-900/95',
      ].join(' ')}
    >
      <div className="grid w-full grid-cols-[1.75rem_2.75rem_minmax(0,1fr)] items-center gap-x-2.5 gap-y-1.5 sm:flex sm:items-center sm:gap-3">
        <button
          type="button"
          onClick={onPlay}
          className="row-span-2 sm:row-span-1 flex h-7 w-7 shrink-0 self-center items-center justify-center rounded-full bg-gray-100 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400"
        >
          {index + 1}
        </button>

        <Artwork
          src={track.thumbnail}
          alt={track.title}
          seed={track.videoId || track.title}
          className="row-span-2 sm:row-span-1 h-10 w-10 shrink-0 self-center rounded-[15px] object-cover sm:h-11 sm:w-11"
        />

        <div className="min-w-0 sm:flex-1">
          <button type="button" onClick={onPlay} className="block w-full min-w-0 text-left">
            <p className="text-[13px] font-semibold text-gray-950 dark:text-white truncate">{track.title}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">{getTrackMetaLine(track) || track.artist}</p>
          </button>

          <div className="mt-1.5 flex items-center justify-between gap-2 sm:hidden">
            {durationText !== '--:--' ? (
              <span className="text-[11px] text-gray-500 dark:text-gray-400 shrink-0">
                {durationText}
              </span>
            ) : (
              <span className="text-[11px] text-gray-400 dark:text-gray-500">Track</span>
            )}

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onToggleLike}
                className={actionButtonClass}
                title={isLiked ? 'Unlike' : 'Like'}
              >
                <Heart size={14} className={isLiked ? 'text-pink-500 fill-pink-500' : ''} />
              </button>
              <button
                type="button"
                onClick={onPlayNext}
                className={actionButtonClass}
                title="Play next"
              >
                <SkipForward size={14} />
              </button>
              <button
                type="button"
                onClick={onAddToQueue}
                className={actionButtonClass}
                title="Add to queue"
              >
                <ListPlus size={14} />
              </button>
              <button
                type="button"
                onClick={onAddToPlaylist}
                className={actionButtonClass}
                title="Add to playlist"
              >
                <ListMusic size={14} />
              </button>
            </div>
          </div>
        </div>

        {durationText !== '--:--' ? (
          <span className="hidden md:block text-xs text-gray-500 dark:text-gray-400 shrink-0">
            {durationText}
          </span>
        ) : null}

        <div className="hidden sm:flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={onToggleLike}
            className={actionButtonClass}
            title={isLiked ? 'Unlike' : 'Like'}
          >
            <Heart size={15} className={isLiked ? 'text-pink-500 fill-pink-500' : ''} />
          </button>
          <button
            type="button"
            onClick={onPlayNext}
            className={actionButtonClass}
            title="Play next"
          >
            <SkipForward size={15} />
          </button>
          <button
            type="button"
            onClick={onAddToQueue}
            className={actionButtonClass}
            title="Add to queue"
          >
            <ListPlus size={15} />
          </button>
          <button
            type="button"
            onClick={onAddToPlaylist}
            className={actionButtonClass}
            title="Add to playlist"
          >
            <ListMusic size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}

export function PlaylistCard({ playlist, onOpen, onPlay }) {
  return (
    <article className="group rounded-[24px] border border-white/70 bg-white/92 p-3 shadow-[0_20px_54px_-34px_rgba(15,23,42,0.38)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_64px_-34px_rgba(15,23,42,0.46)] dark:border-white/8 dark:bg-gray-900/82">
      <button type="button" onClick={onOpen} className="block w-full text-left">
        <div className="relative overflow-hidden rounded-[18px]">
          <Artwork
            src={playlist.cover}
            alt={playlist.name}
            seed={playlist.name}
            className="w-full aspect-square rounded-[18px] object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent opacity-85" />
          <div className="absolute bottom-2.5 left-2.5 inline-flex items-center rounded-full bg-black/55 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-white shadow-lg">
            Playlist
          </div>
        </div>
        <div className="mt-3 space-y-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-gray-950 dark:text-white truncate">{playlist.name}</p>
            {playlist.isLikedSongs ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-[0.18em] bg-pink-50 text-pink-600 dark:bg-pink-900/20 dark:text-pink-300">
                Liked
              </span>
            ) : null}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
            {playlist.description || getPlaylistTrackCountLabel(playlist.trackCount)}
          </p>
        </div>
      </button>

      <div className="mt-3 flex items-center justify-between rounded-[18px] bg-gray-50/90 px-2.5 py-2 dark:bg-white/[0.04]">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {getPlaylistTrackCountLabel(playlist.trackCount)}
        </span>
        <button
          type="button"
          onClick={onPlay}
          className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-3 py-1.5 text-[11px] font-semibold text-white shadow-lg shadow-emerald-900/25 transition hover:scale-[1.03]"
        >
          <Play size={14} className="fill-current" />
          Play
        </button>
      </div>
    </article>
  )
}
