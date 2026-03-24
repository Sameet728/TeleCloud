import { useRef, useState, useEffect, useCallback } from 'react'
import useStore from '../store/useStore'

/**
 * Wraps a file-grid and enables Windows-style rubber-band selection.
 * - Drag on EMPTY space → draws a translucent selection box
 * - Any child with [data-file-id] that overlaps the box gets selected
 * - Click on empty space → clears selection
 */
export default function RubberBandSelect({ children, className = '' }) {
  const containerRef = useRef(null)
  const [box, setBox]           = useState(null)   // { x, y, w, h } in viewport px
  const startClient = useRef(null)
  const animFrame   = useRef(null)
  const { selectAll, clearSelected } = useStore()

  // ── helpers ──────────────────────────────────────────────────────
  const rectFromTwo = (ax, ay, bx, by) => ({
    x: Math.min(ax, bx),
    y: Math.min(ay, by),
    w: Math.abs(bx - ax),
    h: Math.abs(by - ay),
  })

  const getIntersecting = useCallback((selRect) => {
    if (!containerRef.current) return []
    const cards = containerRef.current.querySelectorAll('[data-file-id]')
    const ids = []
    cards.forEach((el) => {
      const r = el.getBoundingClientRect()
      const overlap =
        r.left   < selRect.x + selRect.w &&
        r.right  > selRect.x &&
        r.top    < selRect.y + selRect.h &&
        r.bottom > selRect.y
      if (overlap) ids.push(el.dataset.fileId)
    })
    return ids
  }, [])

  // ── mouse down ───────────────────────────────────────────────────
  const onMouseDown = useCallback((e) => {
    if (e.button !== 0) return
    // Don't start rubber-band if clicking ON a card or its children
    if (e.target.closest('[data-file-id]')) return
    // Don't start if clicking a button / interactive element inside a card
    if (e.target.closest('button, a, input')) return

    e.preventDefault()
    clearSelected()
    startClient.current = { x: e.clientX, y: e.clientY }
    setBox({ x: e.clientX, y: e.clientY, w: 0, h: 0 })
  }, [clearSelected])

  // ── mouse move ───────────────────────────────────────────────────
  const onMouseMove = useCallback((e) => {
    if (!startClient.current) return
    cancelAnimationFrame(animFrame.current)
    animFrame.current = requestAnimationFrame(() => {
      const newBox = rectFromTwo(
        startClient.current.x, startClient.current.y,
        e.clientX, e.clientY,
      )
      setBox(newBox)
      // Only update selection when box has meaningful size
      if (newBox.w > 4 || newBox.h > 4) {
        const ids = getIntersecting(newBox)
        selectAll(ids)
      }
    })
  }, [getIntersecting, selectAll])

  // ── mouse up ─────────────────────────────────────────────────────
  const onMouseUp = useCallback(() => {
    if (!startClient.current) return
    startClient.current = null
    setBox(null)
    cancelAnimationFrame(animFrame.current)
  }, [])

  // Attach window-level listeners so selection continues even if mouse
  // leaves the container
  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup',   onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup',   onMouseUp)
    }
  }, [onMouseMove, onMouseUp])

  return (
    <div
      ref={containerRef}
      onMouseDown={onMouseDown}
      className={`relative select-none ${className}`}
      style={{ userSelect: 'none' }}
    >
      {children}

      {/* Selection rectangle – fixed so it works over scroll */}
      {box && box.w + box.h > 8 && (
        <div
          style={{
            position: 'fixed',
            left:   box.x,
            top:    box.y,
            width:  box.w,
            height: box.h,
            pointerEvents: 'none',
            zIndex: 9999,
            border: '1.5px solid #6366f1',
            background: 'rgba(99,102,241,0.12)',
            borderRadius: 4,
          }}
        />
      )}
    </div>
  )
}
