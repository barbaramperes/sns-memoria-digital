import { useMemo, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import LoadingSkeleton from '../components/LoadingSkeleton'
import ErrorMessage from '../components/ErrorMessage'
import { useData } from '../hooks/useData'

export default function Glossario() {
  const { data, loading, error } = useData('/data/vocabulario.json')
  const [openTermo, setOpenTermo] = useState(null)

  const termos = useMemo(() => data?.termos || [], [data])

  const chartData = useMemo(() => {
    if (!termos.length) return []
    const periodos = data?.meta?.periodos || [2005, 2010, 2015, 2020, 2024]
    return periodos.map(ano => {
      const point = { ano }
      termos.forEach(t => {
        const d = t.dados.find(d => d.ano === ano)
        point[t.termo] = d ? d.contagem : 0
      })
      return point
    })
  }, [termos, data])

  const handleDotClick = (termoKey, anoValue) => {
    const termo = termos.find(t => t.termo === termoKey)
    const ponto = termo?.dados.find(d => d.ano === anoValue)
    if (ponto?.link_arquivo) {
      window.open(ponto.link_arquivo, '_blank', 'noopener,noreferrer')
    }
  }

  if (loading) return <LoadingSkeleton lines={5} />
  if (error) return <ErrorMessage message={error} />

  return (
    <>
      {/* Hero — compact */}
      <section className="bg-neutral-950 text-white border-b border-white/10">
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between gap-4">
          <h1 className="font-serif text-xl font-bold tracking-tight">Glossário de Saúde</h1>
          <div className="flex items-center gap-3 text-xs text-neutral-500">
            <span>API TextSearch · Arquivo.pt</span>
          </div>
        </div>
      </section>

      {/* Chart */}
      <section className="max-w-6xl mx-auto px-5 mt-6">
        <div className="bg-white rounded-xl border border-neutral-200 p-5 chart-glow">
          <div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
            <h2 className="text-base font-bold text-neutral-900">Tendência de termos ao longo do tempo</h2>
            <span className="text-[.7rem] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5 font-semibold">
              ↗ Cada ponto abre o Arquivo.pt
            </span>
          </div>
          <p className="text-xs text-neutral-500 mb-4">Tendência <strong>ilustrativa</strong> calibrada pelos marcos legislativos (USF em 2007, ACES em 2008, SNS 24 em 2017, ULS em 2024). A escala vertical é oculta porque os valores absolutos não são comparáveis entre termos — para a contagem real num ano específico, clique no ponto e o Arquivo.pt mostra-lhe.</p>

          <ResponsiveContainer width="100%" height={340}>
            <LineChart data={chartData}>
              <XAxis dataKey="ano" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} hide />
              <Tooltip
                contentStyle={{ fontSize: '0.75rem', borderRadius: '0.5rem', border: '1px solid #e5e5e5' }}
                labelFormatter={v => `Ano: ${v}`}
                formatter={(value, name) => {
                  const t = termos.find(t => t.termo === name)
                  return ['(ver no Arquivo.pt)', t?.nome_completo || name]
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: '0.7rem' }}
                formatter={value => {
                  const t = termos.find(t => t.termo === value)
                  return t?.nome_completo || value
                }}
              />
              {termos.map(t => (
                <Line
                  key={t.termo}
                  type="linear"
                  dataKey={t.termo}
                  stroke={t.cor}
                  strokeWidth={2}
                  strokeDasharray="4 3"
                  name={t.termo}
                  activeDot={{ r: 7 }}
                  dot={({ cx, cy, payload }) => (
                    <circle
                      key={`${t.termo}-${payload.ano}`}
                      cx={cx}
                      cy={cy}
                      r={5}
                      fill={t.cor}
                      stroke="#fff"
                      strokeWidth={2}
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleDotClick(t.termo, payload.ano)}
                    />
                  )}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>

        </div>
      </section>

      {/* Insights + Verificar */}
      <section className="max-w-6xl mx-auto px-5 mt-6 pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Insights */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-neutral-200 p-5">
            <h2 className="text-base font-bold text-neutral-900 mb-3">O que revela a evolução do vocabulário?</h2>
            <div className="space-y-2 text-sm text-neutral-600 leading-relaxed">
              <p>A criação das <strong>USF em 2006</strong> introduziu novo vocabulário que rapidamente dominou a comunicação oficial.</p>
              <p>A pandemia de <strong>COVID-19 em 2020</strong> provocou um pico histórico nas menções ao SNS 24.</p>
              <p>Em <strong>2024</strong>, a reorganização em ULS marca a mais recente evolução organizacional do sistema.</p>
            </div>
            <p className="text-[.7rem] text-neutral-400 mt-4 pt-3 border-t border-neutral-100">
              Metodologia: a forma da curva é uma representação esquemática do que se passou em cada termo (criação, expansão, substituição) — calibrada pelos diplomas que introduziram cada conceito. As contagens absolutas no Arquivo.pt variam consoante quando o crawler indexou cada página, pelo que não são comparáveis entre termos. Para a contagem real, cada ponto abre a pesquisa correspondente no Arquivo.pt.
            </p>
          </div>

          {/* Verificar no Arquivo.pt — interactive */}
          <div className="bg-white rounded-xl border border-neutral-200 p-5">
            <div className="flex items-baseline justify-between mb-1">
              <h3 className="text-sm font-bold text-neutral-900">Verificar no Arquivo.pt</h3>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" aria-hidden="true" />
            </div>
            <p className="text-[.7rem] text-neutral-500 mb-3">
              Cada termo abre as capturas reais do ano no Arquivo.pt.
            </p>
            <div className="space-y-1">
              {termos.map(t => {
                const isOpen = openTermo === t.termo
                return (
                  <div key={t.termo} className="border-b border-neutral-100 last:border-0">
                    <button
                      onClick={() => setOpenTermo(isOpen ? null : t.termo)}
                      className="w-full flex items-center gap-2 py-2 text-left hover:bg-neutral-50 px-1 -mx-1 rounded transition-colors"
                      aria-expanded={isOpen}
                    >
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: t.cor }} />
                      <span className="text-xs font-semibold text-neutral-800">{t.termo}</span>
                      <span className="text-[.65rem] text-neutral-400 truncate flex-1">{t.nome_completo}</span>
                      <svg
                        className={`w-3 h-3 text-neutral-400 transition-transform shrink-0 ${isOpen ? 'rotate-90' : ''}`}
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                    {isOpen && (
                      <div className="pb-3 pl-5 flex flex-wrap gap-1">
                        {t.dados.map(d => (
                          <a
                            key={d.ano}
                            href={d.link_arquivo}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[.65rem] px-2 py-0.5 rounded-full bg-neutral-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 border border-neutral-200 transition-colors flex items-center gap-1.5"
                            title={`Pesquisar "${t.termo}" em capturas de ${d.ano} no Arquivo.pt`}
                          >
                            <span className="font-bold tabular-nums">{d.ano}</span>
                            <svg className="w-2.5 h-2.5 text-neutral-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                              <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                              <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                            </svg>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

    </>
  )
}
