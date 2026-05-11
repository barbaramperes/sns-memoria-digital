import { useState, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts'
import LoadingSkeleton from '../components/LoadingSkeleton'
import ErrorMessage from '../components/ErrorMessage'
import { useData } from '../hooks/useData'

const STATUS = {
  sim:     { label: 'Concretizado', dot: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  parcial: { label: 'Parcial',      dot: 'bg-amber-500',   bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200' },
  nao:     { label: 'Em evolução',  dot: 'bg-red-500',     bg: 'bg-red-50',      text: 'text-red-700',     border: 'border-red-200' },
}

export default function Promessas() {
  const { data, loading, error } = useData()
  const [filtroGoverno, setFiltroGoverno] = useState('Todos')
  const [filtroTema, setFiltroTema] = useState('Todos')

  const promessas = useMemo(() => data?.promessas || [], [data])
  const governos = useMemo(() => data?.governos || [], [data])

  const governoIds = useMemo(() => ['Todos', ...governos.map(g => g.id)], [governos])
  const temas = useMemo(() => {
    const set = new Set(promessas.map(p => p.tema).filter(Boolean))
    return ['Todos', ...Array.from(set).sort()]
  }, [promessas])

  const filtered = useMemo(() => {
    let result = promessas
    if (filtroGoverno !== 'Todos') result = result.filter(p => p.governo === filtroGoverno)
    if (filtroTema !== 'Todos') result = result.filter(p => p.tema === filtroTema)
    return result
  }, [promessas, filtroGoverno, filtroTema])

  const total = promessas.length
  const sim = promessas.filter(p => p.cumprido === 'sim').length
  const parcial = promessas.filter(p => p.cumprido === 'parcial').length
  const nao = promessas.filter(p => p.cumprido === 'nao').length

  const govChartData = useMemo(() => {
    return governos.map(g => {
      const ps = promessas.filter(p => p.governo === g.id)
      return {
        name: g.id,
        Concretizados: ps.filter(p => p.cumprido === 'sim').length,
        Parciais: ps.filter(p => p.cumprido === 'parcial').length,
        'Em evolução': ps.filter(p => p.cumprido === 'nao').length,
      }
    })
  }, [governos, promessas])


  if (loading) return <LoadingSkeleton lines={5} />
  if (error) return <ErrorMessage message={error} />

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Hero */}
      <section className="bg-neutral-950 text-white border-b border-white/10">
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between">
          <h1 className="font-serif text-xl font-bold tracking-tight">Compromissos de Saúde</h1>
          <span className="text-xs text-neutral-500">{total} documentados · 2005—2025</span>
        </div>
      </section>

      {/* Stats overview */}
      <section className="max-w-6xl mx-auto px-5 -mt-px">
        <div className="bg-white rounded-b-2xl border border-neutral-200 border-t-0 p-5">
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-3xl font-extrabold text-neutral-900">{total}</div>
              <div className="text-xs text-neutral-500 mt-1">total</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-extrabold text-emerald-600">{sim}</div>
              <div className="text-xs text-neutral-500 mt-1">concretizados</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-extrabold text-amber-600">{parcial}</div>
              <div className="text-xs text-neutral-500 mt-1">parciais</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-extrabold text-red-600">{nao}</div>
              <div className="text-xs text-neutral-500 mt-1">em evolução</div>
            </div>
          </div>
          <div className="flex rounded-full overflow-hidden h-3">
            <div className="bg-emerald-500 transition-all" style={{ width: `${(sim / total) * 100}%` }} />
            <div className="bg-amber-400 transition-all" style={{ width: `${(parcial / total) * 100}%` }} />
            <div className="bg-red-400 transition-all" style={{ width: `${(nao / total) * 100}%` }} />
          </div>
          <div className="flex justify-between mt-2 text-[.65rem] text-neutral-400">
            <span>{Math.round((sim / total) * 100)}% concretizado</span>
            <span>{Math.round(((sim + parcial * 0.5) / total) * 100)}% índice global</span>
          </div>
        </div>
      </section>

      {/* Charts — side by side */}
      <section className="max-w-6xl mx-auto px-5 mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-neutral-200 p-5">
            <h3 className="text-sm font-bold text-neutral-900 mb-3">Por Governo</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={govChartData}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={25} />
                <Tooltip contentStyle={{ fontSize: '0.75rem', borderRadius: '0.5rem' }} />
                <Bar dataKey="Concretizados" stackId="a" fill="#16a34a" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Parciais" stackId="a" fill="#d97706" />
                <Bar dataKey="Em evolução" stackId="a" fill="#dc2626" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white rounded-xl border border-neutral-200 p-5">
            <h3 className="text-sm font-bold text-neutral-900 mb-3">Por Governo — scorecard</h3>
            <div className="space-y-2">
              {governos.map(g => {
                const ps = promessas.filter(p => p.governo === g.id)
                const s = ps.filter(p => p.cumprido === 'sim').length
                const pa = ps.filter(p => p.cumprido === 'parcial').length
                const score = ps.length > 0 ? Math.round(((s + pa * 0.5) / ps.length) * 100) : 0
                return (
                  <div key={g.id} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-neutral-700 w-10">{g.id}</span>
                    <div className="flex-1 h-2 bg-neutral-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${score >= 50 ? 'bg-emerald-500' : score >= 30 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${score}%` }} />
                    </div>
                    <span className={`text-xs font-extrabold w-10 text-right ${score >= 50 ? 'text-emerald-600' : score >= 30 ? 'text-amber-600' : 'text-red-600'}`}>{score}%</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Filters + List */}
      <section className="max-w-6xl mx-auto px-5 mt-6">
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          {/* Filter bar */}
          <div className="px-5 py-3 border-b border-neutral-100 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex flex-wrap gap-1.5">
                {governoIds.map(gov => (
                  <button
                    key={gov}
                    onClick={() => setFiltroGoverno(gov)}
                    className={`text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${
                      filtroGoverno === gov
                        ? 'bg-neutral-900 text-white border-neutral-900'
                        : 'bg-white text-neutral-500 border-neutral-200 hover:border-neutral-400'
                    }`}
                  >
                    {gov}
                  </button>
                ))}
              </div>
              {temas.length > 2 && (
                <select
                  value={filtroTema}
                  onChange={e => setFiltroTema(e.target.value)}
                  className="text-xs border border-neutral-200 rounded-lg px-2 py-1 text-neutral-600 bg-white"
                >
                  {temas.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              )}
            </div>
            <span className="text-xs text-neutral-400">{filtered.length} resultados</span>
          </div>

          {/* List */}
          <div className="divide-y divide-neutral-100">
            {filtered.map((p, i) => {
              const cfg = STATUS[p.cumprido] || STATUS.nao
              return (
                <div key={p.id || i} className="px-5 py-4 hover:bg-neutral-50/50 transition-colors">
                  <div className="flex items-start gap-3">
                    <span className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${cfg.dot}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs font-bold text-neutral-900 bg-neutral-100 px-2 py-0.5 rounded">{p.governo}</span>
                        <span className="text-xs text-neutral-400">{p.ano}</span>
                        <span className={`text-[.65rem] font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text} border ${cfg.border}`}>{cfg.label}</span>
                        {p.tema && <span className="text-[.65rem] text-neutral-400">{p.tema}</span>}
                      </div>
                      <p className="text-sm text-neutral-800 leading-relaxed">{p.texto}</p>
                      {p.verificacao && (
                        <p className="text-xs text-neutral-500 mt-1.5 leading-relaxed">{p.verificacao}</p>
                      )}
                      {p.fonte_doc && (
                        <p className="text-[.65rem] text-neutral-400 italic mt-2">Fonte: {p.fonte_doc}</p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {filtered.length === 0 && (
            <div className="px-5 py-12 text-center text-neutral-400 text-sm">Nenhum compromisso para estes filtros.</div>
          )}
        </div>
      </section>

    </div>
  )
}
