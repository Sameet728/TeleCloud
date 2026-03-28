import {
  FileImage, FileVideo, FileAudio, FileText,
  FileArchive, FileSpreadsheet, File, FileType
} from 'lucide-react'
import { getMimeCategory } from './helpers'

const iconMap = {
  image:        { Icon: FileImage,       color: 'text-green-500',  bg: 'bg-green-50 dark:bg-green-900/20'   },
  video:        { Icon: FileVideo,       color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
  audio:        { Icon: FileAudio,       color: 'text-pink-500',   bg: 'bg-pink-50 dark:bg-pink-900/20'     },
  pdf:          { Icon: FileType,        color: 'text-red-500',    bg: 'bg-red-50 dark:bg-red-900/20'       },
  archive:      { Icon: FileArchive,     color: 'text-amber-500',  bg: 'bg-amber-50 dark:bg-amber-900/20'   },
  doc:          { Icon: FileText,        color: 'text-blue-500',   bg: 'bg-blue-50 dark:bg-blue-900/20'     },
  sheet:        { Icon: FileSpreadsheet, color: 'text-emerald-500',bg: 'bg-emerald-50 dark:bg-emerald-900/20'},
  code:         { Icon: FileText,        color: 'text-gray-500',   bg: 'bg-gray-50 dark:bg-gray-900/20'     },
  presentation: { Icon: FileText,        color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20'  },
  other:        { Icon: File,            color: 'text-gray-400',   bg: 'bg-gray-50 dark:bg-gray-900/20'     },
}

export default function FileIcon({ mimeType, size = 20, className = '' }) {
  const cat = getMimeCategory(mimeType)
  const { Icon, color, bg } = iconMap[cat] || iconMap.other
  return (
    <div className={`inline-flex items-center justify-center rounded-xl ${bg} ${className}`}
         style={{ width: size * 1.8, height: size * 1.8 }}>
      <Icon size={size} className={color} />
    </div>
  )
}

export function FileIconSmall({ mimeType }) {
  const cat = getMimeCategory(mimeType)
  const { Icon, color } = iconMap[cat] || iconMap.other
  return <Icon size={16} className={color} />
}
