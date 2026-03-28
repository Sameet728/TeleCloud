import { useState, useEffect, useRef } from 'react'
import * as XLSX from 'xlsx'
import { ChevronDown } from 'lucide-react'

export default function SpreadsheetViewer({ src, fileName, dark }) {
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(false)
  const [sheets, setSheets]   = useState([])
  const [activeSheet, setActiveSheet] = useState(0)
  const [data, setData]       = useState([])
  const [sortCol, setSortCol] = useState(null)
  const [sortDir, setSortDir] = useState('asc')
  const workbookRef = useRef(null)

  useEffect(() => {
    setLoading(true); setError(false); setSheets([]); setData([])
    fetch(src)
      .then(r => r.arrayBuffer())
      .then(buf => {
        const wb = XLSX.read(buf, { type: 'array' })
        workbookRef.current = wb
        setSheets(wb.SheetNames)
        setActiveSheet(0)
        loadSheet(wb, wb.SheetNames[0])
        setLoading(false)
      })
      .catch(() => { setError(true); setLoading(false) })
  }, [src])

  const loadSheet = (wb, name) => {
    const ws = wb.Sheets[name]
    const json = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
    setData(json)
    setSortCol(null)
  }

  const switchSheet = (idx) => {
    setActiveSheet(idx)
    loadSheet(workbookRef.current, sheets[idx])
  }

  const handleSort = (colIdx) => {
    if (data.length < 2) return
    const dir = sortCol === colIdx && sortDir === 'asc' ? 'desc' : 'asc'
    setSortCol(colIdx)
    setSortDir(dir)

    const header = data[0]
    const body = [...data.slice(1)].sort((a, b) => {
      const va = a[colIdx] ?? '', vb = b[colIdx] ?? ''
      if (typeof va === 'number' && typeof vb === 'number') return dir === 'asc' ? va - vb : vb - va
      return dir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va))
    })
    setData([header, ...body])
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className={`w-8 h-8 border-2 rounded-full animate-spin ${dark ? 'border-white/30 border-t-white' : 'border-gray-300 border-t-gray-600'}`}/>
    </div>
  )

  if (error) return (
    <div className={`flex items-center justify-center h-64 text-sm ${dark ? 'text-white/40' : 'text-gray-400'}`}>Could not load spreadsheet.</div>
  )

  const headers = data[0] || []
  const rows = data.slice(1)

  return (
    <div className={`w-full h-full flex flex-col rounded-xl overflow-hidden border ${dark ? 'bg-[#111214] border-white/10' : 'bg-white border-gray-200'}`}
         onContextMenu={e => e.preventDefault()}>
      {/* Sheet tabs */}
      {sheets.length > 1 && (
        <div className={`flex items-center gap-1 px-3 py-2 border-b overflow-x-auto shrink-0 ${dark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'}`}
             style={{ scrollbarWidth: 'none' }}>
          {sheets.map((name, i) => (
            <button key={name} onClick={() => switchSheet(i)}
              className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all
                ${i === activeSheet
                  ? dark ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30' : 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200'
                  : dark ? 'text-white/40 hover:text-white/70 hover:bg-white/5' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
                }`}>
              {name}
            </button>
          ))}
        </div>
      )}

      {/* Stats bar */}
      <div className={`flex items-center gap-3 px-4 py-1.5 border-b text-xs shrink-0 ${dark ? 'bg-white/3 border-white/5 text-white/30' : 'bg-gray-50/50 border-gray-100 text-gray-400'}`}>
        <span>{rows.length} rows</span>
        <span>{headers.length} columns</span>
        <span className={`px-1.5 py-0.5 rounded ${dark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
          {fileName?.split('.').pop()?.toUpperCase()}
        </span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead className={`sticky top-0 z-10 ${dark ? 'bg-[#1a1c1e]' : 'bg-gray-50'}`}>
            <tr>
              <th className={`sticky left-0 z-20 w-10 px-2 py-2.5 text-center text-xs font-medium border-b ${dark ? 'bg-[#1a1c1e] border-white/10 text-white/30' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>#</th>
              {headers.map((h, i) => (
                <th key={i} onClick={() => handleSort(i)}
                  className={`px-3 py-2.5 text-left text-xs font-semibold border-b cursor-pointer select-none group whitespace-nowrap
                    ${dark ? 'border-white/10 text-white/60 hover:text-white hover:bg-white/5' : 'border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}>
                  <span className="flex items-center gap-1">
                    {h || `Col ${i + 1}`}
                    {sortCol === i && <ChevronDown size={12} className={`transition-transform ${sortDir === 'desc' ? 'rotate-180' : ''}`}/>}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className={`transition-colors ${dark ? 'hover:bg-white/3' : 'hover:bg-blue-50/40'}`}>
                <td className={`sticky left-0 z-10 w-10 px-2 py-2 text-center text-xs font-mono border-b ${dark ? 'bg-[#111214] border-white/5 text-white/20' : 'bg-white border-gray-100 text-gray-300'}`}>{ri + 1}</td>
                {headers.map((_, ci) => (
                  <td key={ci} className={`px-3 py-2 border-b whitespace-nowrap max-w-[300px] truncate ${dark ? 'border-white/5 text-white/80' : 'border-gray-100 text-gray-700'}`}>
                    {row[ci] ?? ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <div className={`flex items-center justify-center h-32 text-sm ${dark ? 'text-white/30' : 'text-gray-400'}`}>
            Empty sheet
          </div>
        )}
      </div>
    </div>
  )
}
