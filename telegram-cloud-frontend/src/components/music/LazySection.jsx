import { useEffect, useRef, useState } from 'react'

export default function LazySection({
  children,
  placeholder = null,
  rootMargin = '240px 0px',
  once = true,
  className = '',
}) {
  const hostRef = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const element = hostRef.current
    if (!element) return undefined

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        setVisible(true)
        if (once) observer.disconnect()
      },
      { rootMargin }
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [once, rootMargin])

  return (
    <section ref={hostRef} className={className}>
      {visible ? children : placeholder}
    </section>
  )
}
