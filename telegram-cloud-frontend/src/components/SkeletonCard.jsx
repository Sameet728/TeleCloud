export function SkeletonCard() {
  return (
    <div className="card p-4 animate-pulse">
      <div className="flex justify-center mb-3">
        <div className="w-14 h-14 bg-gray-100 dark:bg-gray-800 rounded-xl" />
      </div>
      <div className="h-3.5 bg-gray-100 dark:bg-gray-800 rounded-lg mb-2" />
      <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-lg w-2/3 mx-auto" />
    </div>
  )
}

export function SkeletonList({ count = 8 }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {Array.from({ length: count }).map((_, i) => <SkeletonCard key={i} />)}
    </div>
  )
}
