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

export const getMimeCategory = (mime = '') => {
  if (mime.startsWith('image/'))        return 'image'
  if (mime.startsWith('video/'))        return 'video'
  if (mime.startsWith('audio/'))        return 'audio'
  if (mime === 'application/pdf')       return 'pdf'
  if (mime.includes('zip') || mime.includes('rar') || mime.includes('tar')) return 'archive'
  if (mime.includes('word') || mime.includes('document'))  return 'doc'
  if (mime.includes('sheet') || mime.includes('excel'))    return 'sheet'
  if (mime.startsWith('text/'))         return 'text'
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
