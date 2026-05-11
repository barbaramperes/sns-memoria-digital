import { useState, useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import LoadingSkeleton from '../components/LoadingSkeleton'
import ErrorMessage from '../components/ErrorMessage'
import { useData } from '../hooks/useData'

const STATUS_COLORS = { sim: '#16a34a', parcial: '#d97706', nao: '#dc2626' }

function MiniDonut({ data, size = 80 }) {
  return (
    <ResponsiveContainer width={size} height={size}>
      <PieChart>
        <Pie data={data} dataKey="value" innerRadius={size * 0.3} outerRadius={size * 0.45} paddingAngle={2} strokeWidth={0}>
          {data.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  )
}

function GovSelector({ governos, selected, onSelect, side }) {
  return (
    <div className="space-y-1.5">
      {governos.map(g => {
        const isSelected = selected === g.id
        return (
          <button
            key={g.id}
            onClick={() => onSelect(g.id)}
            className={`w-full text-left px-3 py-2 rounded-lg border transition-all duration-200 ${
              isSelected
                ? side === 'left' ? 'border-red-500 bg-red-50' : 'border-blue-500 bg-blue-50'
                : 'border-neutral-200 bg-white hover:border-neutral-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-neutral-900">{g.id} <span className="font-normal text-neutral-500">{g.pm}</span></span>
              <span className="text-[.7rem] text-neutral-400">{g.partido}</span>
            </div>
          </button>
        )
      })}
    </div>
  )
}

function GovPanel({ gov, promessas, color }) {
  const total = promessas.length
  const sim = promessas.filter(p => p.cumprido === 'sim').length
  const parcial = promessas.filter(p => p.cumprido === 'parcial').length
  const nao = promessas.filter(p => p.cumprido === 'nao').length
  const score = total > 0 ? Math.round(((sim + parcial * 0.5) / total) * 100) : 0

  const donutData = [
    { name: 'Concretizados', value: sim, color: STATUS_COLORS.sim },
    { name: 'Parciais', value: parcial, color: STATUS_COLORS.parcial },
    { name: 'Em evolução', value: nao, color: STATUS_COLORS.nao },
  ]

  const temas = [...new Set(promessas.map(p => p.tema).filter(Boolean))]

  return (
    <div className={`border-2 rounded-2xl p-5 ${color === 'red' ? 'border-red-200 bg-red-50/30' : 'border-blue-200 bg-blue-50/30'}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-neutral-900">{gov.id} Governo</h3>
          <p className="text-sm text-neutral-600">{gov.pm}</p>
          <p className="text-[.65rem] text-neutral-400 mt-0.5">{gov.partido} · {gov.inicio} a {gov.fim || 'presente'}</p>
          {gov.ministros && <p className="text-[.7rem] text-neutral-400 mt-1">Ministra/Ministro da Saúde: {gov.ministros}</p>}
        </div>
        <div className="text-right">
          <div className={`text-3xl font-extrabold ${score >= 50 ? 'text-emerald-600' : score >= 25 ? 'text-amber-600' : 'text-red-600'}`}>
            {score}%
          </div>
          <div className="text-[.65rem] text-neutral-400 uppercase tracking-wider">Índice de concretização</div>
        </div>
      </div>

      {/* Donut + stats */}
      <div className="flex items-center gap-4 mb-4">
        <MiniDonut data={donutData} size={72} />
        <div className="flex-1 grid grid-cols-3 gap-2">
          {[
            { n: sim, label: 'Concret.', color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { n: parcial, label: 'Parcial', color: 'text-amber-600', bg: 'bg-amber-50' },
            { n: nao, label: 'Em evol.', color: 'text-red-600', bg: 'bg-red-50' },
          ].map(s => (
            <div key={s.label} className={`text-center p-2 rounded-lg ${s.bg}`}>
              <div className={`text-lg font-extrabold ${s.color}`}>{s.n}</div>
              <div className="text-[.6rem] text-neutral-500 uppercase">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Archived screenshot of government portal at the time */}
      {/* Context */}
      {gov.contexto && (
        <div className="bg-white/60 rounded-lg p-3 mb-4 border border-neutral-200/50">
          <p className="text-[.65rem] text-neutral-500 leading-relaxed">{gov.contexto}</p>
        </div>
      )}

      {/* Temas */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {temas.map(t => (
          <span key={t} className="text-[.65rem] font-medium px-2 py-0.5 rounded-full bg-white border border-neutral-200 text-neutral-600">{t}</span>
        ))}
      </div>

      {/* Promise list */}
      <div className="space-y-2">
        {promessas.length === 0 && (
          <p className="text-[.7rem] text-neutral-400 text-center py-4">Sem compromissos documentados neste Governo.</p>
        )}
        {promessas.map(p => (
          <div key={p.id} className="bg-white rounded-lg border border-neutral-200 p-3">
            <div className="flex items-start gap-2">
              <span className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
                p.cumprido === 'sim' ? 'bg-emerald-500' : p.cumprido === 'parcial' ? 'bg-amber-500' : 'bg-red-500'
              }`} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-neutral-800 leading-relaxed">{p.texto}</p>
                {p.verificacao && (
                  <p className="text-[.65rem] text-neutral-500 mt-1 leading-relaxed">{p.verificacao}</p>
                )}
                {p.link_arquivo && (
                  <a href={p.link_arquivo} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[.7rem] text-emerald-600 hover:text-emerald-800 mt-1.5 font-medium">
                    Ver fonte no Arquivo.pt →
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Comparador() {
  const { data, loading, error } = useData()
  const [govA, setGovA] = useState(null)
  const [govB, setGovB] = useState(null)

  const governos = useMemo(() => data?.governos || [], [data])
  const promessas = useMemo(() => data?.promessas || [], [data])

  const govAData = useMemo(() => governos.find(g => g.id === govA), [governos, govA])
  const govBData = useMemo(() => governos.find(g => g.id === govB), [governos, govB])
  const promessasA = useMemo(() => promessas.filter(p => p.governo === govA), [promessas, govA])
  const promessasB = useMemo(() => promessas.filter(p => p.governo === govB), [promessas, govB])

  if (loading) return <LoadingSkeleton lines={5} />
  if (error) return <ErrorMessage message={error} />

  const bothSelected = govAData && govBData

  return (
    <>
      {/* Hero — compact */}
      <section className="bg-neutral-950 text-white border-b border-white/10">
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between">
          <h1 className="font-serif text-xl font-bold tracking-tight">Comparador de Governos</h1>
          <span className="text-xs text-neutral-500">Fontes verificáveis no Arquivo.pt</span>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-5 py-6">
        {!bothSelected ? (
          <>
            <p className="text-sm text-neutral-500 mb-4">Selecione dois Governos para comparar lado a lado.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="text-sm font-semibold text-neutral-700">Governo A</span>
                </div>
                <GovSelector governos={governos.filter(g => g.id !== govB)} selected={govA} onSelect={setGovA} side="left" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-sm font-semibold text-neutral-700">Governo B</span>
                </div>
                <GovSelector governos={governos.filter(g => g.id !== govA)} selected={govB} onSelect={setGovB} side="right" />
              </div>
            </div>

            {(govA || govB) && (
              <div className="mt-6 text-center">
                <p className="text-[.7rem] text-neutral-400">
                  {govA && !govB && 'Agora selecione o Governo B.'}
                  {!govA && govB && 'Agora selecione o Governo A.'}
                </p>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Controls */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-neutral-900">
                {govAData.id} vs {govBData.id}
              </h2>
              <button
                onClick={() => { setGovA(null); setGovB(null) }}
                className="text-[.7rem] font-semibold text-neutral-500 hover:text-neutral-900 transition-colors px-3 py-1.5 rounded-lg border border-neutral-200 hover:border-neutral-400"
              >
                Alterar seleção
              </button>
            </div>

            {/* Summary bar */}
            <div className="bg-neutral-50 rounded-xl border border-neutral-200 p-5 mb-8">
              <div className="grid grid-cols-2 gap-6">
                {[
                  { gov: govAData, ps: promessasA },
                  { gov: govBData, ps: promessasB },
                ].map(({ gov, ps }) => {
                  const total = ps.length
                  const sim = ps.filter(p => p.cumprido === 'sim').length
                  const parcial = ps.filter(p => p.cumprido === 'parcial').length
                  const nao = ps.filter(p => p.cumprido === 'nao').length
                  const score = total > 0 ? Math.round(((sim + parcial * 0.5) / total) * 100) : 0
                  return (
                    <div key={gov.id} className="text-center">
                      <div className={`text-4xl font-extrabold ${score >= 50 ? 'text-emerald-600' : score >= 25 ? 'text-amber-600' : 'text-red-600'}`}>
                        {score}%
                      </div>
                      <div className="text-sm font-bold text-neutral-700 mt-1">{gov.id} — {gov.pm}</div>
                      <div className="text-[.7rem] text-neutral-400">{total} compromissos · {gov.partido}</div>
                      {total > 0 && (
                        <div className="w-full h-2 bg-neutral-200 rounded-full mt-2 overflow-hidden flex">
                          <div className="bg-emerald-500 h-full" style={{ width: `${(sim / total) * 100}%` }} />
                          <div className="bg-amber-400 h-full" style={{ width: `${(parcial / total) * 100}%` }} />
                          <div className="bg-red-400 h-full" style={{ width: `${(nao / total) * 100}%` }} />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Side by side panels */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <GovPanel gov={govAData} promessas={promessasA} color="red" />
              <GovPanel gov={govBData} promessas={promessasB} color="blue" />
            </div>
          </>
        )}
      </section>

    </>
  )
}
