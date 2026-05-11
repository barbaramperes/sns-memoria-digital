import { Link } from 'react-router-dom'
import Logo from './Logo'

const links = [
  { to: '/promessas', label: 'Compromissos' },
  { to: '/mapa', label: 'Mapa' },
  { to: '/comparador', label: 'Comparador' },
  { to: '/quiz', label: 'Quiz' },
  { to: '/glossario', label: 'Glossário' },
  { to: '/assistente', label: 'Agente IA' },
  { to: '/sobre', label: 'Sobre' },
]

export default function Footer() {
  return (
    <footer className="bg-neutral-950 text-white">
      <div className="max-w-6xl mx-auto px-5 pt-20 pb-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <Logo light size="sm" />
            <p className="text-xs text-neutral-500 mt-2 max-w-sm">
              Plataforma cívica que documenta a evolução do SNS com dados verificáveis no Arquivo.pt.
            </p>
          </div>
          <div className="flex flex-wrap gap-4">
            {links.map(l => (
              <Link key={l.to} to={l.to} className="text-xs text-neutral-500 hover:text-white transition-colors">
                {l.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="border-t border-white/10 mt-6 pt-4 flex items-center justify-between">
          <p className="text-[.65rem] text-neutral-600">
            Prémio Arquivo.pt 2026
          </p>
          <a href="https://arquivo.pt" target="_blank" rel="noopener noreferrer" className="text-[.65rem] text-neutral-600 hover:text-white transition-colors flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            arquivo.pt
          </a>
        </div>
      </div>
    </footer>
  )
}
