export function SkeletonCard() {
  return (
    <div className="app-panel-muted animate-pulse p-5">
      <div className="flex justify-center mb-4">
        <div className="h-16 w-16 rounded-[1.5rem] bg-gray-100 dark:bg-zinc-800/50" />
      </div>
      <div className="h-4 bg-gray-100 dark:bg-zinc-800/50 rounded-lg mb-2.5" />
      <div className="h-3 bg-gray-100 dark:bg-zinc-800/50 rounded-lg w-2/3 mx-auto" />
    </div>
  )
}

export function SkeletonList({ count = 8 }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
      {Array.from({ length: count }).map((_, i) => <SkeletonCard key={i} />)}
    </div>
  )
}
