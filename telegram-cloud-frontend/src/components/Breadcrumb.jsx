import { Link } from 'react-router-dom'
import { ChevronRight, Home } from 'lucide-react'

export default function Breadcrumb({ items = [] }) {
  return (
    <nav className="flex items-center gap-2 text-sm font-medium text-zinc-500 dark:text-zinc-400 flex-wrap">
      <Link to="/files" className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-gray-900 dark:hover:text-white transition-all">
        <Home size={16} />
      </Link>
      {items.map((item, i) => (
        <span key={item.id || i} className="flex items-center gap-2">
          <ChevronRight size={16} className="text-zinc-300 dark:text-zinc-700" />
          {i === items.length - 1
            ? <span className="text-gray-900 dark:text-white font-bold px-2 py-1">{item.name}</span>
            : <Link to={`/folder/${item.id}`}
                className="px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-gray-900 dark:hover:text-white transition-all">{item.name}</Link>
          }
        </span>
      ))}
    </nav>
  )
}
