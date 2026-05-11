import { useEffect, useState, useRef, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../hooks/useData'

/* ───────── helpers ───────── */

function CountUp({ end, duration = 2000 }) {
  const [val, setVal] = useState(0)
  const ref = useRef(null)
  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      observer.disconnect()
      const start = performance.now()
      const step = (now) => {
        const t = Math.min((now - start) / duration, 1)
        setVal(Math.round((1 - Math.pow(1 - t, 4)) * end))
        if (t < 1) requestAnimationFrame(step)
      }
      requestAnimationFrame(step)
    }, { threshold: 0.3 })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [end, duration])
  return <span ref={ref}>{val.toLocaleString('pt-PT')}</span>
}

function FadeIn({ children, className = '', delay = 0 }) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setTimeout(() => setVisible(true), delay); observer.disconnect() }
    }, { threshold: 0.1 })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [delay])
  return (
    <div ref={ref} className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'} ${className}`}>
      {children}
    </div>
  )
}

/* ───────── main ───────── */

export default function Home() {
  const { data } = useData()

  const totalCompromissos = data?.promessas?.length ?? 0
  const totalGovernos = data?.governos?.length ?? 0
  const totalArquivo = data?.arquivo_pt?.noticias_saude?.length ?? 0
  const concretizados = useMemo(() => data?.promessas?.filter(p => p.cumprido === 'sim').length ?? 0, [data])
  const parciais = useMemo(() => data?.promessas?.filter(p => p.cumprido === 'parcial').length ?? 0, [data])

  // Facto do Dia — pick a daily fact based on the date
  const factoDoDia = useMemo(() => {
    const noticias = data?.arquivo_pt?.noticias_saude || []
    if (!noticias.length) return null
    const today = new Date()
    const dayIndex = (today.getFullYear() * 366 + today.getMonth() * 31 + today.getDate()) % noticias.length
    return noticias[dayIndex]
  }, [data])

  return (
    <div className="min-h-screen bg-white text-neutral-900">

      {/* ══════ HERO ══════ */}
      <section className="relative bg-[#0a0a0a] overflow-hidden">
        <div className="pointer-events-none absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.15) 1px, transparent 1px)', backgroundSize: '64px 64px' }} />
        <div className="pointer-events-none absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-600/5 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-6xl mx-auto px-5 pt-20 pb-14 lg:pt-28 lg:pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left — text */}
            <div>
              <FadeIn>
                <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-3 py-1.5 mb-5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-xs text-white/50 font-semibold">Prémio Arquivo.pt 2026</span>
                </div>
              </FadeIn>
              <FadeIn delay={100}>
                <h1 className="font-serif text-4xl sm:text-5xl lg:text-[3.5rem] font-bold leading-[1.08] tracking-tight text-white">
                  A Memória Digital<br />da Saúde <span className="text-red-500">Portuguesa</span>
                </h1>
              </FadeIn>
              <FadeIn delay={200}>
                <p className="mt-5 text-base text-white/40 max-w-md leading-relaxed">
                  20 anos de evolução do SNS documentados com o Arquivo.pt.
                  Dados verificáveis. Zero opinião.
                </p>
              </FadeIn>
              <FadeIn delay={300}>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Link to="/promessas" className="group inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-6 py-3 rounded-full transition-all hover:shadow-lg hover:shadow-red-600/20">
                    Explorar dados
                    <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 8h10m-4-4 4 4-4 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </Link>
                  <Link to="/mapa" className="inline-flex items-center gap-2 border border-white/15 hover:border-white/30 text-white/60 hover:text-white text-sm font-semibold px-6 py-3 rounded-full transition-all">
                    Ver mapa
                  </Link>
                  <Link to="/quiz" className="inline-flex items-center gap-2 border border-white/15 hover:border-white/30 text-white/60 hover:text-white text-sm font-semibold px-6 py-3 rounded-full transition-all">
                    Jogar quiz
                  </Link>
                </div>
              </FadeIn>
            </div>

            {/* Right — live stats dashboard */}
            <FadeIn delay={400}>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                  <div className="text-3xl font-extrabold text-white tabular-nums"><CountUp end={totalCompromissos} /></div>
                  <div className="text-xs text-white/30 mt-1">compromissos</div>
                  {totalCompromissos > 0 && (
                    <div className="flex rounded-full overflow-hidden h-1.5 mt-3">
                      <div className="bg-emerald-500" style={{ width: `${(concretizados / totalCompromissos) * 100}%` }} />
                      <div className="bg-amber-400" style={{ width: `${(parciais / totalCompromissos) * 100}%` }} />
                      <div className="bg-red-400 flex-1" />
                    </div>
                  )}
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                  <div className="text-3xl font-extrabold text-white tabular-nums"><CountUp end={totalGovernos} /></div>
                  <div className="text-xs text-white/30 mt-1">governos analisados</div>
                  <div className="text-xs text-white/20 mt-3">2005 — 2026</div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                  <div className="text-3xl font-extrabold text-white tabular-nums"><CountUp end={20} /></div>
                  <div className="text-xs text-white/30 mt-1">distritos mapeados</div>
                  <div className="text-xs text-white/20 mt-3">continente + ilhas</div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                  <div className="text-3xl font-extrabold text-emerald-400 tabular-nums"><CountUp end={totalArquivo} /></div>
                  <div className="text-xs text-white/30 mt-1">fontes no Arquivo.pt</div>
                  <div className="flex items-center gap-1.5 mt-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-xs text-emerald-400/60">links verificáveis</span>
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ══════ FEATURES — 3x2 grid ══════ */}
      <section className="py-12 lg:py-14 bg-white border-t border-neutral-100">
        <div className="max-w-6xl mx-auto px-5">
          <FadeIn>
            <h2 className="font-serif text-2xl font-bold tracking-tight text-neutral-900 mb-6">O que pode fazer</h2>
          </FadeIn>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { to: '/mapa', title: 'Mapa', desc: 'Hospitais, médicos e urgências por distrito' },
              { to: '/promessas', title: 'Compromissos', desc: '51 compromissos de saúde de 7 governos' },
              { to: '/comparador', title: 'Comparador', desc: 'Analise governos lado a lado' },
              { to: '/quiz', title: 'Quiz', desc: 'Que governo disse isto? Teste-se' },
              { to: '/glossario', title: 'Glossário', desc: 'Como o vocabulário de saúde evoluiu' },
              { to: '/historico', title: 'Antes/Depois', desc: '20 anos de evolução visual de sites de saúde' },
              { to: '/assistente', title: 'Agente IA', desc: 'Pesquisa em linguagem natural sobre os dados arquivados' },
            ].map((p, i) => (
              <FadeIn key={p.to} delay={i * 50}>
                <Link to={p.to} className="group block border border-neutral-200 rounded-xl p-4 hover:shadow-md hover:border-neutral-300 transition-all h-full">
                  <div className="inline-block text-xs font-bold px-2 py-0.5 rounded-md mb-2 bg-red-50 text-red-600">{p.title}</div>
                  <p className="text-sm text-neutral-600 leading-relaxed group-hover:text-neutral-900 transition-colors">{p.desc}</p>
                </Link>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ FACTO DO DIA — from Arquivo.pt ══════ */}
      {factoDoDia && (
        <section className="py-8 bg-neutral-950">
          <div className="max-w-4xl mx-auto px-5">
            <FadeIn>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[.7rem] font-semibold text-red-400 uppercase tracking-wider mb-1">Arquivo do Dia</p>
                  <p className="text-sm text-white font-semibold leading-relaxed">{factoDoDia.titulo}</p>
                  <div className="flex items-center gap-3 mt-2">
                    {factoDoDia.ano && <span className="text-xs text-white/40">{factoDoDia.ano}</span>}
                    {factoDoDia.tema && <span className="text-xs text-white/30">{factoDoDia.tema}</span>}
                    {factoDoDia.url_arquivo && (
                      <a href={factoDoDia.url_arquivo} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Ver no Arquivo.pt
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>
        </section>
      )}

      {/* ══════ QUOTE — Lei 56/79 ══════ */}
      <section className="py-12 lg:py-14 bg-neutral-950">
        <div className="max-w-4xl mx-auto px-5">
          <FadeIn>
            <blockquote className="font-serif text-xl sm:text-2xl lg:text-3xl text-white leading-[1.3] font-medium">
              &ldquo;O direito à protecção da saúde é realizado através de um Serviço Nacional de Saúde universal e geral.&rdquo;
            </blockquote>
            <div className="flex items-center justify-between mt-5 pt-4 border-t border-white/10">
              <p className="text-sm text-white/40">Lei n.º 56/79 — 15 de Setembro de 1979</p>
              <div className="flex gap-6 text-xs text-white/30">
                <span><strong className="text-white font-bold">47</strong> anos</span>
                <span><strong className="text-emerald-400 font-bold">Universal</strong></span>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ══════ GOVERNOS ══════ */}
      <section className="py-12 lg:py-14 bg-neutral-50 border-t border-neutral-100">
        <div className="max-w-6xl mx-auto px-5">
          <FadeIn>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-serif text-2xl font-bold tracking-tight text-neutral-900">7 Governos documentados</h2>
              <Link to="/comparador" className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-500 hover:text-red-600 transition-colors">
                Comparar →
              </Link>
            </div>
          </FadeIn>
          <FadeIn delay={100}>
            <div className="grid grid-cols-4 lg:grid-cols-7 gap-2">
              {[
                { id: 'XVII', pm: 'Sócrates', p: 'PS', anos: '05-09' },
                { id: 'XVIII', pm: 'Sócrates', p: 'PS', anos: '09-11' },
                { id: 'XIX', pm: 'Passos C.', p: 'PSD/CDS', anos: '11-15' },
                { id: 'XXI', pm: 'Costa', p: 'PS', anos: '15-19' },
                { id: 'XXII', pm: 'Costa', p: 'PS', anos: '19-22' },
                { id: 'XXIII', pm: 'Costa', p: 'PS', anos: '22-24' },
                { id: 'XXIV', pm: 'Montenegro', p: 'AD', anos: '24-' },
              ].map(g => (
                <Link key={g.id} to="/comparador" className="bg-white border border-neutral-200 rounded-lg p-3 text-center hover:border-neutral-400 transition-all">
                  <div className="text-sm font-extrabold text-neutral-900">{g.id}</div>
                  <div className="text-xs text-neutral-500 mt-0.5">{g.pm}</div>
                  <div className="text-[.65rem] text-neutral-400">{g.p} · {g.anos}</div>
                </Link>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ══════ TIMELINE ══════ */}
      <section className="py-12 lg:py-14 bg-neutral-950">
        <div className="max-w-6xl mx-auto px-5">
          <FadeIn>
            <h2 className="font-serif text-2xl font-bold tracking-tight text-white mb-6">Marcos do SNS</h2>
          </FadeIn>
          <FadeIn delay={100}>
            <div className="grid grid-cols-5 gap-3">
              {[
                { ano: 1979, t: 'Criação do SNS', d: 'Lei 56/79' },
                { ano: 2006, t: 'USF e Saúde 24', d: 'Cuidados primários' },
                { ano: 2011, t: 'Troika', d: 'Ajustamentos OCDE' },
                { ano: 2020, t: 'COVID-19', d: 'Vacinação em massa' },
                { ano: 2024, t: 'Novo Estatuto', d: 'Dedicação plena' },
              ].map(item => (
                <div key={item.ano} className="bg-white/5 border border-white/10 rounded-lg p-3 hover:bg-white/10 transition-colors">
                  <span className="text-xs font-bold text-red-400">{item.ano}</span>
                  <h3 className="text-sm font-bold text-white mt-1">{item.t}</h3>
                  <p className="text-xs text-neutral-500 mt-0.5">{item.d}</p>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ══════ CTA ══════ */}
      <section className="py-12 lg:py-14 bg-neutral-50 border-t border-neutral-100">
        <div className="max-w-3xl mx-auto px-5 text-center">
          <FadeIn>
            <h2 className="font-serif text-2xl font-bold tracking-tight text-neutral-900 mb-3">
              Cada facto tem uma fonte verificável
            </h2>
            <p className="text-neutral-500 text-sm mb-6 max-w-md mx-auto">
              Todos os dados ligados ao Arquivo.pt. Nada é opinião — tudo é documentação.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link to="/promessas" className="group inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-7 py-3 rounded-full transition-all hover:shadow-lg hover:shadow-red-600/20">
                Começar a explorar
                <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 8h10m-4-4 4 4-4 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </Link>
              <a href="https://arquivo.pt" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 border border-neutral-300 hover:border-neutral-400 text-neutral-600 hover:text-neutral-900 text-sm font-semibold px-7 py-3 rounded-full transition-all">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Arquivo.pt
              </a>
            </div>
          </FadeIn>
        </div>
      </section>
    </div>
  )
}
