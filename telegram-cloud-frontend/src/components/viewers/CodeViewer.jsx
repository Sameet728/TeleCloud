import { useState, useEffect, useRef } from 'react'
import { Copy, Check, WrapText, AlignLeft } from 'lucide-react'
import { getFileExtension } from '../../utils/helpers'

// SAFE Prism.js import — we do manual highlighting with inline regex instead of Prism grammars
// to avoid the `tokenizePlaceholders` crash that happens with circular grammar dependencies

const EXT_TO_LANG_LABEL = {
  js: 'JavaScript', jsx: 'React JSX', ts: 'TypeScript', tsx: 'React TSX',
  py: 'Python', java: 'Java', c: 'C', cpp: 'C++', h: 'C Header',
  cs: 'C#', go: 'Go', rs: 'Rust', rb: 'Ruby', php: 'PHP',
  sql: 'SQL', html: 'HTML', htm: 'HTML', xml: 'XML',
  css: 'CSS', scss: 'SCSS', less: 'LESS', json: 'JSON',
  yaml: 'YAML', yml: 'YAML', md: 'Markdown', sh: 'Shell',
  bash: 'Bash', bat: 'Batch', ps1: 'PowerShell', swift: 'Swift',
  kt: 'Kotlin', dart: 'Dart', lua: 'Lua', r: 'R',
  toml: 'TOML', ini: 'Config', env: 'Environment', gitignore: 'Git',
  dockerfile: 'Docker', makefile: 'Make', txt: 'Plain Text',
}

// Lightweight syntax highlighter that doesn't crash
function highlightCode(code, ext) {
  if (!code) return ''
  // Basic keyword-based highlighting using safe regex
  const rules = [
    // Strings
    { regex: /(["'`])(?:(?!\1|\\).|\\.)*\1/g, cls: 'text-emerald-400' },
    // Comments (single line)
    { regex: /\/\/.*/g, cls: 'text-gray-500 italic' },
    // Comments (hash)
    { regex: /^#.*/gm, cls: 'text-gray-500 italic' },
    // Numbers
    { regex: /\b\d+\.?\d*\b/g, cls: 'text-amber-400' },
    // Keywords
    { regex: /\b(const|let|var|function|return|if|else|for|while|class|import|export|from|default|async|await|try|catch|throw|new|this|null|undefined|true|false|def|self|print|elif|pass|raise|with|as|in|not|and|or|is|None|True|False|public|private|static|void|int|string|bool|float|double)\b/g, cls: 'text-purple-400' },
    // JSON keys
    ...(ext === 'json' ? [{ regex: /"([^"]+)"\s*:/g, cls: 'text-sky-400' }] : []),
  ]

  // For safety, just return escaped HTML with span highlights
  let escaped = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // Apply highlighting rules sequentially
  for (const rule of rules) {
    escaped = escaped.replace(rule.regex, (match) =>
      `<span class="${rule.cls}">${match}</span>`
    )
  }

  return escaped
}

export default function CodeViewer({ src, fileName, dark }) {
  const [content, setContent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(false)
  const [copied, setCopied]   = useState(false)
  const [wrap, setWrap]       = useState(false)

  const ext = getFileExtension(fileName)
  const langLabel = EXT_TO_LANG_LABEL[ext] || 'Text'

  useEffect(() => {
    setLoading(true); setError(false); setContent(null)
    fetch(src)
      .then(r => r.text())
      .then(t => { setContent(t); setLoading(false) })
      .catch(() => { setError(true); setLoading(false) })
  }, [src])

  const handleCopy = () => {
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className={`w-8 h-8 border-2 rounded-full animate-spin ${dark ? 'border-white/30 border-t-white' : 'border-gray-300 border-t-gray-600'}`}/>
    </div>
  )

  if (error) return (
    <div className={`flex items-center justify-center h-64 text-sm ${dark ? 'text-white/40' : 'text-gray-400'}`}>
      Could not load file.
    </div>
  )

  const lines = content?.split('\n') || []
  const highlighted = highlightCode(content, ext)

  return (
    <div className={`w-full h-full flex flex-col rounded-xl overflow-hidden border ${dark ? 'bg-[#1e1e2e] border-white/10' : 'bg-[#fafafa] border-gray-200'}`}
         onContextMenu={e => e.preventDefault()}>
      {/* Toolbar */}
      <div className={`flex items-center justify-between px-4 py-2.5 border-b shrink-0 ${dark ? 'bg-[#181825] border-white/8' : 'bg-gray-100/80 border-gray-200'}`}>
        <div className="flex items-center gap-2.5">
          <span className={`text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-md ${dark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}`}>
            {langLabel}
          </span>
          <span className={`text-xs tabular-nums ${dark ? 'text-white/25' : 'text-gray-400'}`}>
            {lines.length} lines · {(new Blob([content]).size / 1024).toFixed(1)} KB
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setWrap(!wrap)}
            className={`p-1.5 rounded-lg text-xs transition-colors ${dark ? 'hover:bg-white/8 text-white/40' : 'hover:bg-gray-200 text-gray-400'} ${wrap ? (dark ? 'bg-white/8 text-white/70' : 'bg-gray-200 text-gray-600') : ''}`}
            title={wrap ? 'Disable wrap' : 'Enable wrap'}>
            {wrap ? <AlignLeft size={14}/> : <WrapText size={14}/>}
          </button>
          <button onClick={handleCopy}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              copied
                ? 'bg-emerald-500/15 text-emerald-400'
                : dark ? 'hover:bg-white/8 text-white/40' : 'hover:bg-gray-200 text-gray-400'
            }`}>
            {copied ? <><Check size={12}/> Copied!</> : <><Copy size={12}/> Copy</>}
          </button>
        </div>
      </div>

      {/* Code area */}
      <div className="flex-1 overflow-auto" style={{ scrollbarWidth: 'thin' }}>
        <div className="flex min-h-full">
          {/* Line numbers */}
          <div className={`sticky left-0 z-10 select-none text-right pr-3 pl-4 py-4 text-[11px] font-mono leading-[1.7] shrink-0
            ${dark ? 'bg-[#1e1e2e] text-white/15 border-r border-white/5' : 'bg-[#fafafa] text-gray-300 border-r border-gray-100'}`}>
            {lines.map((_, i) => <div key={i}>{i + 1}</div>)}
          </div>
          {/* Code */}
          <pre className={`flex-1 px-4 py-4 text-[13px] font-mono leading-[1.7] m-0 ${wrap ? 'whitespace-pre-wrap break-words' : 'whitespace-pre'}
            ${dark ? 'text-gray-300' : 'text-gray-800'}`}
               style={{ background: 'transparent', fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace" }}>
            <code dangerouslySetInnerHTML={{ __html: highlighted }}/>
          </pre>
        </div>
      </div>
    </div>
  )
}
