import { useState, useCallback, useRef, useEffect } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import {
  ZoomIn, ZoomOut, ChevronLeft, ChevronRight, ChevronUp, ChevronDown,
  Maximize2, Sun, Moon, RotateCw, RotateCcw, Columns, Search, X,
  ChevronsLeft, ChevronsRight, Sidebar, Printer, Download
} from 'lucide-react'

// Use local worker (CDN doesn't host v5.4.296)
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

export default function PdfViewerPro({ src, dark: parentDark }) {
  const [numPages, setNumPages] = useState(null)
  const [page, setPage] = useState(1)
  const [scale, setScale] = useState(1.2)
  const [darkMode, setDarkMode] = useState(parentDark)
  const [rotation, setRotation] = useState(0)
  const [loading, setLoading] = useState(true)
  const [inputPage, setInputPage] = useState('')
  const [showSidebar, setShowSidebar] = useState(true)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [scrollMode, setScrollMode] = useState('vertical') // vertical, horizontal, wrapped
  const scrollContainerRef = useRef(null)
  const pageRefs = useRef({})

  const onDocumentLoadSuccess = useCallback(({ numPages: n }) => {
    setNumPages(n)
    setLoading(false)
  }, [])

  const goToPage = (p) => {
    const target = Math.max(1, Math.min(numPages || 1, p))
    setPage(target)
    setInputPage('')
    // Scroll the page into view
    const pageEl = pageRefs.current[target]
    if (pageEl) pageEl.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handlePageInput = (e) => {
    e.preventDefault()
    const p = parseInt(inputPage)
    if (!isNaN(p)) goToPage(p)
  }

  const zoomIn  = () => setScale(s => Math.min(4, +(s + 0.1).toFixed(1)))
  const zoomOut = () => setScale(s => Math.max(0.3, +(s - 0.1).toFixed(1)))
  const rotateCW  = () => setRotation(r => (r + 90) % 360)
  const rotateCCW = () => setRotation(r => (r - 90 + 360) % 360)

  // Track visible page on scroll
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container || !numPages) return
    const handleScroll = () => {
      const containerRect = container.getBoundingClientRect()
      let closestPage = 1
      let closestDist = Infinity
      for (let i = 1; i <= numPages; i++) {
        const el = pageRefs.current[i]
        if (!el) continue
        const rect = el.getBoundingClientRect()
        const dist = Math.abs(rect.top - containerRect.top)
        if (dist < closestDist) { closestDist = dist; closestPage = i }
      }
      setPage(closestPage)
    }
    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [numPages])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (e.ctrlKey && e.key === 'f') { e.preventDefault(); setShowSearch(s => !s) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const btnCls = `p-1.5 rounded-lg transition-all ${darkMode ? 'hover:bg-white/10 text-white/70 active:bg-white/15' : 'hover:bg-black/8 text-gray-600 active:bg-black/12'}`
  const btnActive = `p-1.5 rounded-lg ${darkMode ? 'bg-white/15 text-white' : 'bg-black/10 text-gray-900'}`

  // Generate pages array for continuous scrolling
  const allPages = numPages ? Array.from({ length: numPages }, (_, i) => i + 1) : []

  return (
    <div className={`w-full h-full flex flex-col rounded-xl overflow-hidden border
      ${darkMode ? 'bg-[#1a1a2e] border-white/10' : 'bg-gray-100 border-gray-200'}`}
         onContextMenu={e => e.preventDefault()}>

      {/* ═══ TOP TOOLBAR ═══ */}
      <div className={`flex items-center gap-1 px-2 py-1.5 border-b shrink-0 flex-wrap
        ${darkMode ? 'bg-[#12121f] border-white/8' : 'bg-white border-gray-200'}`}>

        {/* Sidebar toggle */}
        <button onClick={() => setShowSidebar(!showSidebar)}
          className={showSidebar ? btnActive : btnCls} title="Toggle page thumbnails">
          <Sidebar size={15}/>
        </button>

        <div className={`w-px h-5 mx-0.5 ${darkMode ? 'bg-white/8' : 'bg-gray-200'}`}/>

        {/* Search */}
        <button onClick={() => setShowSearch(!showSearch)}
          className={showSearch ? btnActive : btnCls} title="Search (Ctrl+F)">
          <Search size={15}/>
        </button>

        <div className={`w-px h-5 mx-0.5 ${darkMode ? 'bg-white/8' : 'bg-gray-200'}`}/>

        {/* Page nav */}
        <button onClick={() => goToPage(1)} className={btnCls} title="First page" disabled={page <= 1}>
          <ChevronsLeft size={14}/>
        </button>
        <button onClick={() => goToPage(page - 1)} className={btnCls} disabled={page <= 1}>
          <ChevronUp size={14}/>
        </button>
        <form onSubmit={handlePageInput} className="flex items-center gap-1">
          <input type="text" value={inputPage} onChange={e => setInputPage(e.target.value)}
            placeholder={String(page)}
            className={`w-10 text-center text-xs font-mono py-1 rounded border outline-none
              ${darkMode ? 'bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:ring-1 focus:ring-indigo-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:ring-1 focus:ring-indigo-500'}`}/>
        </form>
        <span className={`text-xs ${darkMode ? 'text-white/30' : 'text-gray-400'}`}>of {numPages || '?'}</span>
        <button onClick={() => goToPage(page + 1)} className={btnCls} disabled={page >= numPages}>
          <ChevronDown size={14}/>
        </button>
        <button onClick={() => goToPage(numPages)} className={btnCls} title="Last page" disabled={page >= numPages}>
          <ChevronsRight size={14}/>
        </button>

        <div className={`w-px h-5 mx-0.5 ${darkMode ? 'bg-white/8' : 'bg-gray-200'}`}/>

        {/* Zoom */}
        <button onClick={zoomOut} className={btnCls} title="Zoom out"><ZoomOut size={14}/></button>
        <select value={Math.round(scale * 100)} onChange={e => setScale(+e.target.value / 100)}
          className={`text-[11px] font-mono px-1 py-1 rounded border outline-none cursor-pointer
            ${darkMode ? 'bg-white/5 border-white/10 text-white/70' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
          {[50, 75, 90, 100, 110, 120, 130, 150, 175, 200, 250, 300].map(v => (
            <option key={v} value={v}>{v}%</option>
          ))}
        </select>
        <button onClick={zoomIn} className={btnCls} title="Zoom in"><ZoomIn size={14}/></button>

        <div className="flex-1"/>

        {/* Right side tools */}
        <button onClick={rotateCCW} className={btnCls} title="Rotate counterclockwise"><RotateCcw size={14}/></button>
        <button onClick={rotateCW} className={btnCls} title="Rotate clockwise"><RotateCw size={14}/></button>
        <div className={`w-px h-5 mx-0.5 ${darkMode ? 'bg-white/8' : 'bg-gray-200'}`}/>

        {/* Scroll mode */}
        <select value={scrollMode} onChange={e => setScrollMode(e.target.value)}
          className={`text-[11px] px-1 py-1 rounded border outline-none cursor-pointer
            ${darkMode ? 'bg-white/5 border-white/10 text-white/70' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
          <option value="vertical">Vertical Scroll</option>
          <option value="horizontal">Horizontal Scroll</option>
          <option value="wrapped">Wrapped Scroll</option>
        </select>

        <div className={`w-px h-5 mx-0.5 ${darkMode ? 'bg-white/8' : 'bg-gray-200'}`}/>
        <button onClick={() => setDarkMode(!darkMode)} className={btnCls} title="Toggle dark mode">
          {darkMode ? <Sun size={14}/> : <Moon size={14}/>}
        </button>
        <button onClick={() => {
          const el = document.querySelector('[data-pdf-container]')
          el?.requestFullscreen?.()
        }} className={btnCls} title="Fullscreen"><Maximize2 size={14}/></button>
      </div>

      {/* ═══ SEARCH BAR ═══ */}
      {showSearch && (
        <div className={`flex items-center gap-2 px-3 py-2 border-b shrink-0
          ${darkMode ? 'bg-[#15152a] border-white/8' : 'bg-blue-50/50 border-gray-200'}`}>
          <Search size={14} className={darkMode ? 'text-white/30' : 'text-gray-400'}/>
          <input type="text" placeholder="Find in document..." value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)} autoFocus
            className={`flex-1 text-sm bg-transparent outline-none ${darkMode ? 'text-white placeholder:text-white/30' : 'text-gray-900 placeholder:text-gray-400'}`}/>
          <button onClick={() => { setShowSearch(false); setSearchQuery('') }}
            className={`p-1 rounded ${darkMode ? 'hover:bg-white/10 text-white/40' : 'hover:bg-gray-200 text-gray-400'}`}>
            <X size={14}/>
          </button>
        </div>
      )}

      {/* ═══ MAIN CONTENT — sidebar + pages ═══ */}
      <div data-pdf-container className="flex-1 flex overflow-hidden">

        {/* Page thumbnails sidebar */}
        {showSidebar && (
          <div className={`w-44 shrink-0 flex flex-col border-r overflow-hidden
            ${darkMode ? 'bg-[#12121f] border-white/8' : 'bg-gray-50 border-gray-200'}`}>
            <div className={`px-3 py-2 border-b text-xs font-medium shrink-0
              ${darkMode ? 'border-white/8 text-white/50' : 'border-gray-200 text-gray-500'}`}>
              Pages
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2" style={{ scrollbarWidth: 'thin' }}>
              <Document file={src} loading={<div/>}>
                {allPages.map(p => (
                  <button key={p} onClick={() => goToPage(p)}
                    className={`w-full rounded-lg overflow-hidden border-2 transition-all cursor-pointer
                      ${page === p
                        ? darkMode ? 'border-indigo-500 ring-2 ring-indigo-500/30' : 'border-indigo-500 ring-2 ring-indigo-500/20'
                        : darkMode ? 'border-white/10 hover:border-white/20' : 'border-gray-200 hover:border-gray-300'
                      }`}>
                    <Page pageNumber={p} width={140} rotate={rotation}
                      renderTextLayer={false} renderAnnotationLayer={false}
                      loading={<div className={`w-full h-40 animate-pulse ${darkMode ? 'bg-white/5' : 'bg-gray-200'}`}/>}
                    />
                    <div className={`text-[10px] text-center py-1 font-mono
                      ${page === p
                        ? darkMode ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-50 text-indigo-600'
                        : darkMode ? 'text-white/30' : 'text-gray-400'
                      }`}>
                      {p}
                    </div>
                  </button>
                ))}
              </Document>
            </div>
          </div>
        )}

        {/* Main PDF pages area */}
        <div ref={scrollContainerRef}
          className={`flex-1 overflow-auto py-4 ${darkMode ? 'bg-[#1a1a2e]' : 'bg-gray-100'}
            ${scrollMode === 'horizontal' ? 'flex flex-row items-start gap-4 px-4 overflow-x-auto overflow-y-hidden' : ''}
            ${scrollMode === 'wrapped' ? 'flex flex-wrap items-start justify-center gap-4 px-4 content-start' : ''}
            ${scrollMode === 'vertical' ? 'flex flex-col items-center gap-4' : ''}`}
          style={{ scrollbarWidth: 'thin' }}>

          {loading && (
            <div className="flex items-center justify-center h-full w-full">
              <div className={`w-8 h-8 border-2 rounded-full animate-spin ${darkMode ? 'border-white/20 border-t-white' : 'border-gray-300 border-t-gray-600'}`}/>
            </div>
          )}

          <Document
            file={src}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={(err) => console.error('PDF load error:', err)}
            loading={<div/>}
            className={
              scrollMode === 'horizontal' ? 'flex flex-row gap-4' :
              scrollMode === 'wrapped' ? 'flex flex-wrap justify-center gap-4' :
              'flex flex-col items-center gap-4'
            }
          >
            {allPages.map(p => (
              <div key={p} ref={el => { if (el) pageRefs.current[p] = el }}
                className="shrink-0">
                <Page
                  pageNumber={p}
                  scale={scale}
                  rotate={rotation}
                  className={`shadow-xl rounded-sm overflow-hidden ${darkMode ? 'shadow-black/30' : 'shadow-gray-300/50'}`}
                  loading={
                    <div className={`rounded-sm animate-pulse ${darkMode ? 'bg-white/5' : 'bg-gray-200'}`}
                         style={{ width: 595 * scale, height: 842 * scale }}/>
                  }
                />
              </div>
            ))}
          </Document>
        </div>
      </div>

      {/* ═══ BOTTOM STATUS BAR ═══ */}
      <div className={`flex items-center justify-between px-3 py-1 border-t text-[10px] shrink-0
        ${darkMode ? 'bg-[#12121f] border-white/8 text-white/25' : 'bg-white border-gray-200 text-gray-400'}`}>
        <span>Page {page} of {numPages || '?'}</span>
        <span>{Math.round(scale * 100)}% · {scrollMode} · {rotation}°</span>
      </div>
    </div>
  )
}
