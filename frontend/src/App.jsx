import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import RootLayout from './components/RootLayout'
import Home from './pages/Home'

const Promessas = lazy(() => import('./pages/Promessas'))
const Mapa = lazy(() => import('./pages/Mapa'))
const Quiz = lazy(() => import('./pages/Quiz'))
const Glossario = lazy(() => import('./pages/Glossario'))
const Comparador = lazy(() => import('./pages/Comparador'))
const Assistente = lazy(() => import('./pages/Assistente'))
const Historico = lazy(() => import('./pages/Historico'))
const Sobre = lazy(() => import('./pages/Sobre'))
const NotFound = lazy(() => import('./pages/NotFound'))

function PageLoader() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-6 h-6 border-2 border-neutral-200 border-t-red-500 rounded-full animate-spin" />
        <p className="text-sm text-neutral-400">A carregar...</p>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<RootLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/promessas" element={<Suspense fallback={<PageLoader />}><Promessas /></Suspense>} />
          <Route path="/mapa" element={<Suspense fallback={<PageLoader />}><Mapa /></Suspense>} />
          <Route path="/quiz" element={<Suspense fallback={<PageLoader />}><Quiz /></Suspense>} />
          <Route path="/glossario" element={<Suspense fallback={<PageLoader />}><Glossario /></Suspense>} />
          <Route path="/comparador" element={<Suspense fallback={<PageLoader />}><Comparador /></Suspense>} />
          <Route path="/assistente" element={<Suspense fallback={<PageLoader />}><Assistente /></Suspense>} />
          <Route path="/historico" element={<Suspense fallback={<PageLoader />}><Historico /></Suspense>} />
          <Route path="/sobre" element={<Suspense fallback={<PageLoader />}><Sobre /></Suspense>} />
          <Route path="*" element={<Suspense fallback={<PageLoader />}><NotFound /></Suspense>} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
