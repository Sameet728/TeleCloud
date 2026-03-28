import { useState, useEffect } from 'react'
import mammoth from 'mammoth'

export default function DocViewer({ src, fileName, dark }) {
  const [html, setHtml]       = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(false)
  const [messages, setMessages] = useState([])

  useEffect(() => {
    setLoading(true); setError(false); setHtml(''); setMessages([])
    fetch(src)
      .then(r => r.arrayBuffer())
      .then(buf => {
        return mammoth.convertToHtml(
          { arrayBuffer: buf },
          {
            styleMap: [
              "p[style-name='Heading 1'] => h1:fresh",
              "p[style-name='Heading 2'] => h2:fresh",
              "p[style-name='Heading 3'] => h3:fresh",
            ]
          }
        )
      })
      .then(result => {
        setHtml(result.value)
        setMessages(result.messages || [])
        setLoading(false)
      })
      .catch(() => { setError(true); setLoading(false) })
  }, [src])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className={`w-8 h-8 border-2 rounded-full animate-spin ${dark ? 'border-white/30 border-t-white' : 'border-gray-300 border-t-gray-600'}`}/>
    </div>
  )

  if (error) return (
    <div className={`flex items-center justify-center h-64 text-sm ${dark ? 'text-white/40' : 'text-gray-400'}`}>Could not load document.</div>
  )

  return (
    <div className={`w-full h-full flex flex-col rounded-xl overflow-hidden border ${dark ? 'bg-[#1a1a1f] border-white/10' : 'bg-white border-gray-200'}`}
         onContextMenu={e => e.preventDefault()}>
      {/* Header */}
      <div className={`flex items-center gap-2 px-4 py-2.5 border-b shrink-0 ${dark ? 'bg-white/5 border-white/10' : 'bg-blue-50/50 border-gray-200'}`}>
        <span className={`text-xs font-mono px-2 py-0.5 rounded-md ${dark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
          DOCX
        </span>
        <span className={`text-xs truncate ${dark ? 'text-white/40' : 'text-gray-400'}`}>{fileName}</span>
      </div>

      {/* Document content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-3xl mx-auto px-8 py-10">
          <div
            className={`prose max-w-none
              ${dark ? 'prose-invert prose-p:text-gray-300 prose-headings:text-white prose-strong:text-white prose-a:text-blue-400' : ''}`}
            style={{
              fontFamily: "'Georgia', 'Times New Roman', serif",
              lineHeight: 1.8,
              fontSize: '15px'
            }}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </div>

      {/* Warnings if any */}
      {messages.length > 0 && (
        <div className={`px-4 py-2 border-t text-xs shrink-0 ${dark ? 'bg-yellow-500/5 border-white/5 text-yellow-500/60' : 'bg-yellow-50 border-yellow-100 text-yellow-600'}`}>
          {messages.length} conversion warning(s) — some formatting may differ from original
        </div>
      )}
    </div>
  )
}
