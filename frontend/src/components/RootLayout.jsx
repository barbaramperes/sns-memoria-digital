import { Outlet, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Nav from './Nav'
import Footer from './Footer'

export default function RootLayout() {
  const { pathname } = useLocation()
  const isHome = pathname === '/'
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    if (!isHome) {
      const id = requestAnimationFrame(() => setScrolled(false))
      return () => cancelAnimationFrame(id)
    }
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [isHome])

  return (
    <div className="flex flex-col min-h-screen">
      {isHome ? (
        <div className="fixed top-0 inset-x-0 z-50">
          <Nav transparent={!scrolled} />
        </div>
      ) : (
        <Nav />
      )}
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
