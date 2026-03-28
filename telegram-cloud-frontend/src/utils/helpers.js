export const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024, sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export const formatDate = (date) => {
  if (!date) return ''
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }).format(new Date(date))
}

export const formatDateShort = (date) => {
  if (!date) return ''
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric'
  }).format(new Date(date))
}

// Map of code-file extensions for syntax highlighting detection
const CODE_EXTENSIONS = new Set([
  'js','jsx','ts','tsx','json','html','htm','css','scss','less','py','java','c','cpp','h',
  'cs','go','rs','rb','php','sql','xml','yaml','yml','md','sh','bash','bat','ps1','swift',
  'kt','dart','lua','r','toml','ini','env','gitignore','dockerfile','makefile'
])

export const getFileExtension = (name = '') => {
  const parts = name.split('.')
  return parts.length > 1 ? parts.pop().toLowerCase() : ''
}

export const getMimeCategory = (mime = '', fileName = '') => {
  const ext = getFileExtension(fileName)
  if (mime.startsWith('image/'))        return 'image'
  if (mime.startsWith('video/'))        return 'video'
  if (mime.startsWith('audio/'))        return 'audio'
  if (mime === 'application/pdf')       return 'pdf'
  if (mime.includes('zip') || mime.includes('rar') || mime.includes('tar')) return 'archive'
  if (mime.includes('presentation') || mime.includes('powerpoint') || ext === 'pptx' || ext === 'ppt') return 'presentation'
  if (mime.includes('word') || mime.includes('document') || ext === 'docx' || ext === 'doc') return 'doc'
  if (mime.includes('sheet') || mime.includes('excel') || mime.includes('csv') || ext === 'xlsx' || ext === 'xls' || ext === 'csv') return 'sheet'
  if (CODE_EXTENSIONS.has(ext))         return 'code'
  if (mime.startsWith('text/') || mime === 'application/json' || mime === 'application/javascript') return 'code'
  return 'other'
}

export const generateUploadId = () =>
  `upload_${Date.now()}_${Math.random().toString(36).slice(2,8)}`

export const truncate = (str, n = 24) =>
  str && str.length > n ? str.slice(0, n - 3) + '...' : str

export const copyToClipboard = async (text) => {
  try { await navigator.clipboard.writeText(text); return true }
  catch { return false }
}
