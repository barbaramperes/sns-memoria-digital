import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import Logo from './Logo'

const links = [
  { to: '/promessas', label: 'Compromissos' },
  { to: '/mapa', label: 'Mapa' },
  { to: '/comparador', label: 'Comparador' },
  { to: '/quiz', label: 'Quiz' },
  { to: '/glossario', label: 'Glossário' },
  { to: '/historico', label: 'Antes/Depois' },
  { to: '/assistente', label: 'Agente IA' },
  { to: '/sobre', label: 'Sobre' },
]

export default function Nav({ transparent }) {
  const [open, setOpen] = useState(false)

  const linkClass = ({ isActive }) =>
    `text-xs font-medium px-2.5 py-2 rounded-lg whitespace-nowrap transition-all duration-200 ${
      isActive
        ? 'text-red-600 font-semibold'
        : transparent
          ? 'text-white/50 hover:text-white'
          : 'text-neutral-400 hover:text-neutral-900'
    }`

  return (
    <nav className={`sticky top-0 z-50 transition-all duration-300 ${
      transparent
        ? 'bg-transparent'
        : 'bg-white/95 backdrop-blur-md border-b border-neutral-200/80 shadow-sm'
    }`}>
      <div className="max-w-6xl mx-auto px-5 flex items-center justify-between h-14">
        <Logo light={transparent} size="sm" />

        {/* Desktop — all links visible */}
        <div className="hidden lg:flex items-center gap-0.5">
          {links.map(l => (
            <NavLink key={l.to} to={l.to} className={linkClass}>
              {l.label}
            </NavLink>
          ))}
        </div>

        {/* Mobile hamburger */}
        <button onClick={() => setOpen(!open)} className="lg:hidden p-2" aria-label="Menu">
          <div className="w-5 h-4 flex flex-col justify-between">
            {[0,1,2].map(i => (
              <span key={i} className={`block w-full h-[2px] rounded-full transition-all duration-300 ${
                transparent ? 'bg-white' : 'bg-neutral-900'
              } ${open && i === 0 ? 'rotate-45 translate-y-[7px]' : ''} ${open && i === 1 ? 'opacity-0 scale-0' : ''} ${open && i === 2 ? '-rotate-45 -translate-y-[7px]' : ''}`} />
            ))}
          </div>
        </button>
      </div>

      {/* Mobile menu */}
      <div className={`lg:hidden overflow-hidden transition-all duration-300 ${open ? 'max-h-[600px] border-b border-neutral-200' : 'max-h-0'}`}>
        <div className="bg-white px-5 py-4 space-y-1">
          {links.map(l => (
            <NavLink
              key={l.to}
              to={l.to}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `block text-[.9rem] font-medium px-3 py-3 rounded-lg transition-colors ${
                  isActive ? 'text-red-600 font-semibold bg-red-50' : 'text-neutral-600 hover:bg-neutral-50'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  )
}
