import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-neutral-50">
      <div className="text-center px-5">
        <div className="text-[8rem] font-extrabold leading-none text-neutral-100 select-none">404</div>
        <h1 className="text-xl font-bold text-neutral-900 -mt-6 mb-2">Página não encontrada</h1>
        <p className="text-neutral-500 text-sm mb-8 max-w-xs mx-auto">A página que procura não existe ou foi movida.</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-6 py-3 rounded-full transition-colors"
          >
            Voltar ao início
          </Link>
          <Link
            to="/promessas"
            className="text-sm font-medium text-neutral-500 hover:text-neutral-900 transition-colors"
          >
            Ver compromissos
          </Link>
        </div>
      </div>
    </div>
  )
}
