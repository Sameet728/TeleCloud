import { Link } from 'react-router-dom'
import { ChevronRight, Home } from 'lucide-react'

export default function Breadcrumb({ items = [] }) {
  return (
    <nav className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 flex-wrap">
      <Link to="/files" className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-white transition-colors">
        <Home size={14} />
      </Link>
      {items.map((item, i) => (
        <span key={item.id || i} className="flex items-center gap-1">
          <ChevronRight size={14} className="text-gray-300 dark:text-gray-600" />
          {i === items.length - 1
            ? <span className="text-gray-900 dark:text-white font-medium">{item.name}</span>
            : <Link to={`/folder/${item.id}`}
                className="hover:text-gray-900 dark:hover:text-white transition-colors">{item.name}</Link>
          }
        </span>
      ))}
    </nav>
  )
}
