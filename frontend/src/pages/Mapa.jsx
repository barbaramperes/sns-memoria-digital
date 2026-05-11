import { useState, useEffect, useCallback, useMemo } from 'react'
import { geoMercator, geoPath } from 'd3-geo'
import { scaleLinear } from 'd3-scale'
import { useData } from '../hooks/useData'
import LoadingSkeleton from '../components/LoadingSkeleton'
import ErrorMessage from '../components/ErrorMessage'

/* ─────────── helpers ─────────── */

const normalizeName = (name) =>
  (name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

function findHealth(geoName, healthData) {
  if (!healthData) return null
  const norm = normalizeName(geoName)
  const entry = Object.entries(healthData).find(([key]) => normalizeName(key) === norm)
  return entry ? { name: entry[0], ...entry[1] } : null
}

const formatNumber = (n) => (n == null ? '—' : Number(n).toLocaleString('pt-PT'))

const formatCompact = (n) => {
  if (n == null) return '—'
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}k`
  return String(n)
}

/* ─────────── metrics ─────────── */

const METRICS = [
  {
    key: 'sem_medico_pct',
    label: '% sem médico (taxa ARS regional)',
    shortLabel: '% sem médico',
    accessor: (d) => (d.populacao ? (d.sem_medico / d.populacao) * 100 : 0),
    format: (v) => `${v.toFixed(1)}%`,
    invert: true,
    description: 'Taxa da ARS regional aplicada ao distrito. Distritos da mesma região partilham a mesma taxa — a ACSS não publica este indicador por distrito.',
    source: 'ACSS (taxa regional ARS) × INE (população do distrito)',
    isRegional: true,
  },
  {
    key: 'sem_medico',
    label: 'Utentes sem médico (estimativa)',
    shortLabel: 'Sem médico',
    accessor: (d) => d.sem_medico || 0,
    format: (v) => formatNumber(v),
    invert: true,
    description: 'Estimativa: taxa ARS regional × população do distrito. Não é leitura directa do Portal da Transparência.',
    source: 'ACSS (taxa regional ARS) × INE (população do distrito)',
    isRegional: true,
  },
  {
    key: 'hab_por_centro',
    label: 'Habitantes por centro de saúde',
    shortLabel: 'Hab./centro',
    accessor: (d) => (d.centros_saude ? Math.round(d.populacao / d.centros_saude) : 0),
    format: (v) => formatNumber(Math.round(v)),
    invert: true,
    description: 'Rácio de habitantes por centro de saúde existente no distrito.',
    source: 'ACSS, INE',
  },
  {
    key: 'urgencias',
    label: 'Urgências hospitalares',
    shortLabel: 'Urgências',
    accessor: (d) => d.urgencias || 0,
    format: (v) => formatNumber(v),
    invert: false,
    description: 'Serviços de urgência documentados em funcionamento no distrito.',
    source: 'ACSS',
  },
  {
    key: 'hospitais',
    label: 'Hospitais do SNS',
    shortLabel: 'Hospitais',
    accessor: (d) => d.hospitais || 0,
    format: (v) => formatNumber(v),
    invert: false,
    description: 'Hospitais do SNS documentados no distrito.',
    source: 'ACSS',
  },
]

/* ─────────── color scale ─────────── */

// Green (good) to red (bad) — universal health convention
// Mono-red ramp: light to dark (clean, professional)
const RED_RAMP = ['#fef2f2', '#fecaca', '#fca5a5', '#f87171', '#dc2626', '#991b1b']

function buildColorScale(metric, districts) {
  const values = districts.map((d) => metric.accessor(d)).filter((v) => !Number.isNaN(v))
  if (!values.length) return () => '#f5f5f5'
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min
  const ramp = metric.invert ? RED_RAMP : [...RED_RAMP].reverse()
  const stops = [0, 0.2, 0.4, 0.6, 0.8, 1].map((t) => min + range * t)
  return scaleLinear().domain(stops).range(ramp).clamp(true)
}

/* ─────────── geo split ─────────── */

function splitGeoData(geoData) {
  if (!geoData) return { mainland: null, madeira: null, azores: null }
  const mainland = { type: 'FeatureCollection', features: [] }
  const madeira = { type: 'FeatureCollection', features: [] }
  const azores = { type: 'FeatureCollection', features: [] }
  geoData.features.forEach((f) => {
    const name = normalizeName(f.properties.name || '')
    if (name.includes('madeira')) madeira.features.push(f)
    else if (name.includes('azor') || name.includes('acor')) azores.features.push(f)
    else mainland.features.push(f)
  })
  return { mainland, madeira, azores }
}

/* ─────────── district path ─────────── */

function DistrictPath({ feature, healthData, selected, hovered, onSelect, onHover, pathGen, colorScale, metric }) {
  const health = findHealth(feature.properties.name, healthData)
  const dName = health?.name || feature.properties.name
  const isSelected = selected === dName
  const isHovered = hovered === dName
  const value = health ? metric.accessor(health) : 0
  return (
    <path
      d={pathGen(feature)}
      fill={health ? colorScale(value) : '#f5f5f5'}
      stroke={isSelected ? '#dc2626' : isHovered ? '#737373' : '#ffffff'}
      strokeWidth={isSelected ? 1.5 : isHovered ? 1 : 0.75}
      strokeLinejoin="round"
      strokeLinecap="round"
      opacity={selected && !isSelected ? 0.35 : 1}
      className="cursor-pointer focus:outline-none transition-[opacity,stroke-width,stroke,fill] duration-200 ease-out"
      role="button"
      tabIndex={0}
      aria-label={`${dName} — ${metric.format(value)}`}
      onClick={(e) => { e.currentTarget.blur(); onSelect(isSelected ? null : dName) }}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect(isSelected ? null : dName)}
      onMouseEnter={() => onHover(dName)}
      onMouseLeave={() => onHover(null)}
      onDragStart={(e) => e.preventDefault()}
      draggable="false"
      style={{ outline: 'none' }}
    />
  )
}

/* Simplified "region marker" for islands — avoids broken projections on scattered archipelagos. */
function IslandMarker({ name, health, selected, hovered, onSelect, onHover, colorScale, metric, x, y }) {
  if (!health) return null
  const isSelected = selected === health.name
  const isHovered = hovered === health.name
  const value = metric.accessor(health)
  const fill = colorScale(value)
  return (
    <g
      transform={`translate(${x}, ${y})`}
      className="cursor-pointer"
      role="button"
      aria-label={`${health.name} — ${metric.format(value)}`}
      onClick={(e) => { e.currentTarget.blur?.(); onSelect(isSelected ? null : health.name) }}
      onMouseEnter={() => onHover(health.name)}
      onMouseLeave={() => onHover(null)}
      onDragStart={(e) => e.preventDefault()}
      tabIndex={0}
      style={{ outline: 'none' }}
    >
      <rect
        x="0"
        y="0"
        width="110"
        height="32"
        rx="4"
        fill={fill}
        stroke={isSelected ? '#dc2626' : isHovered ? '#737373' : '#ffffff'}
        strokeWidth={isSelected ? 1.5 : isHovered ? 1 : 0.75}
        opacity={selected && !isSelected ? 0.35 : 1}
        className="transition-[opacity,stroke-width,stroke,fill] duration-200 ease-out"
      />
      <text x="8" y="13" fontSize="7" fontWeight="700" letterSpacing="1" fill="#525252" fontFamily="ui-sans-serif, system-ui">
        {name.toUpperCase()}
      </text>
      <text x="8" y="26" fontSize="10" fontWeight="800" fill="#171717" fontFamily="ui-sans-serif, system-ui">
        {metric.format(value)}
      </text>
    </g>
  )
}

/* ─────────── main ─────────── */

export default function Mapa() {
  const [geoData, setGeoData] = useState(null)
  const [healthData, setHealthData] = useState(null)
  const [selected, setSelected] = useState(null)
  const [hovered, setHovered] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [metricKey, setMetricKey] = useState('sem_medico_pct')

  const { data: promessasData } = useData('/api/promessas')
  const maternidades = useMemo(() => promessasData?.maternidades?.fechadas || [], [promessasData])

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetch('/data/portugal_distritos.geojson').then((r) => {
        if (!r.ok) throw new Error(`GeoJSON: ${r.status}`)
        return r.json()
      }),
      fetch('/data/distritos_saude.json').then((r) => {
        if (!r.ok) throw new Error(`Health: ${r.status}`)
        return r.json()
      }),
    ])
      .then(([geo, health]) => {
        if (!cancelled) {
          setGeoData(geo)
          setHealthData(health)
        }
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err.message)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const metric = useMemo(() => METRICS.find((m) => m.key === metricKey) || METRICS[0], [metricKey])
  const districts = useMemo(
    () => (healthData ? Object.entries(healthData).map(([name, d]) => ({ name, ...d })) : []),
    [healthData],
  )
  const colorScale = useMemo(() => buildColorScale(metric, districts), [metric, districts])
  const split = useMemo(() => splitGeoData(geoData), [geoData])

  const getMaternidades = useCallback(
    (districtName) => {
      if (!maternidades.length) return []
      const norm = normalizeName(districtName)
      return maternidades.filter((m) => normalizeName(m.distrito) === norm)
    },
    [maternidades],
  )

  /* Compact layout. viewBox 500×560. Mainland dominates; islands are labelled markers. */
  const mainlandProjection = useMemo(() => {
    if (!split.mainland?.features.length) return null
    return geoMercator().fitSize([360, 540], split.mainland)
  }, [split.mainland])
  const mainlandPath = useMemo(
    () => (mainlandProjection ? geoPath().projection(mainlandProjection) : null),
    [mainlandProjection],
  )

  const madeiraHealth = useMemo(() => (healthData ? findHealth('Madeira', healthData) : null), [healthData])
  const azoresHealth = useMemo(() => (healthData ? findHealth('Acores', healthData) : null), [healthData])

  const nationals = useMemo(() => {
    if (!districts.length) return null
    const pop = districts.reduce((s, d) => s + (d.populacao || 0), 0)
    const semMedico = districts.reduce((s, d) => s + (d.sem_medico || 0), 0)
    const hospitais = districts.reduce((s, d) => s + (d.hospitais || 0), 0)
    const centros = districts.reduce((s, d) => s + (d.centros_saude || 0), 0)
    const urgencias = districts.reduce((s, d) => s + (d.urgencias || 0), 0)
    return {
      populacao: pop,
      sem_medico: semMedico,
      sem_medico_pct: pop ? (semMedico / pop) * 100 : 0,
      hospitais,
      centros_saude: centros,
      urgencias,
      hab_por_centro: centros ? Math.round(pop / centros) : 0,
    }
  }, [districts])

  const ranked = useMemo(() => {
    if (!districts.length) return []
    return [...districts]
      .map((d) => ({ ...d, metricValue: metric.accessor(d) }))
      .sort((a, b) => (metric.invert ? b.metricValue - a.metricValue : a.metricValue - b.metricValue))
  }, [districts, metric])

  const metricMax = useMemo(() => Math.max(...ranked.map((d) => d.metricValue), 0.0001), [ranked])

  if (!geoData || !healthData) {
    if (loadError) return <ErrorMessage message={loadError} />
    return <LoadingSkeleton lines={6} />
  }

  const activeName = selected || hovered
  const activeHealth = activeName ? findHealth(activeName, healthData) : null
  const activeMaternidades = activeName ? getMaternidades(activeName) : []

  const commonPathProps = { healthData, selected, hovered, onSelect: setSelected, onHover: setHovered, colorScale, metric }

  return (
    <div className="bg-neutral-50 min-h-screen">
      {/* ═════════ HERO — compact single bar ═════════ */}
      <section className="bg-neutral-950 text-white border-b border-white/10">
        <div className="max-w-6xl mx-auto px-5 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <h1 className="font-serif text-xl font-bold tracking-tight">Saúde por Distrito</h1>
              {nationals && (
                <div className="hidden md:flex items-center gap-4 text-[.65rem]">
                  <span className="text-neutral-500"><strong className="text-white font-extrabold">{formatCompact(nationals.populacao)}</strong> hab.</span>
                  <span className="text-neutral-500"><strong className="text-red-400 font-extrabold">{formatCompact(nationals.sem_medico)}</strong> sem médico</span>
                  <span className="text-neutral-500"><strong className="text-white font-extrabold">{nationals.hospitais}</strong> hospitais</span>
                </div>
              )}
            </div>
            <span className="text-xs text-neutral-500 hidden sm:block">Fontes: ACSS, INE, Portal da Transparência</span>
          </div>
        </div>
      </section>

      {/* ═════════ METRIC SELECTOR (sticky) ═════════ */}
      <section className="border-b border-neutral-200 bg-white/95 backdrop-blur sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-5 py-2">
          <div className="flex items-center gap-2 overflow-x-auto">
            <div className="flex gap-1.5">
              {METRICS.map((m) => (
                <button
                  key={m.key}
                  onClick={() => setMetricKey(m.key)}
                  className={`text-[.7rem] font-semibold px-3 py-1 rounded-full border transition-colors shrink-0 ${
                    metricKey === m.key
                      ? 'bg-neutral-900 text-white border-neutral-900'
                      : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400'
                  }`}
                >
                  {m.shortLabel}
                </button>
              ))}
            </div>
            <span className="text-[.65rem] text-neutral-400 ml-auto hidden md:block shrink-0">{metric.source}</span>
          </div>
          <p className="text-[.65rem] text-neutral-500 mt-1">
            {metric.isRegional && (
              <span className="inline-block bg-amber-50 text-amber-800 border border-amber-200 rounded px-1.5 py-px font-bold mr-1.5">
                ⚠ Estimativa regional
              </span>
            )}
            <span className="font-semibold text-neutral-700">{metric.label}.</span> {metric.description}{' '}
            <span className="text-neutral-400">Fonte: {metric.source}.</span>
          </p>
        </div>
      </section>

      {/* ═════════ MAP + RANKING ═════════ */}
      <section className="max-w-6xl mx-auto px-5 mt-3 pb-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* MAP CARD */}
          <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden min-w-0">
            {activeHealth && (
              <div className="px-3 py-1.5 border-b border-neutral-100 flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-700">{activeHealth.name}</span>
                <span className="text-sm font-extrabold tabular-nums" style={{ color: colorScale(metric.accessor(activeHealth)) }}>
                  {metric.format(metric.accessor(activeHealth))}
                </span>
              </div>
            )}

            <div className="px-2">
              <svg
                viewBox="0 0 500 560"
                className="w-full select-none"
                style={{ outline: 'none', height: 'calc(100vh - 240px)', minHeight: '500px', maxHeight: '820px' }}
                role="img"
                aria-label={`Mapa de Portugal colorido por ${metric.label}`}
              >
                {/* MAINLAND */}
                {mainlandPath && (
                  <g transform="translate(130, 10)">
                    {split.mainland.features.map((f, i) => (
                      <DistrictPath key={`m-${i}`} feature={f} pathGen={mainlandPath} {...commonPathProps} />
                    ))}
                  </g>
                )}

                {/* ISLAND MARKERS (simplified) */}
                <IslandMarker
                  name="Madeira"
                  dataKey="Madeira"
                  health={madeiraHealth}
                  selected={selected}
                  hovered={hovered}
                  onSelect={setSelected}
                  onHover={setHovered}
                  colorScale={colorScale}
                  metric={metric}
                  x={10}
                  y={450}
                />
                <IslandMarker
                  name="Açores"
                  dataKey="Acores"
                  health={azoresHealth}
                  selected={selected}
                  hovered={hovered}
                  onSelect={setSelected}
                  onHover={setHovered}
                  colorScale={colorScale}
                  metric={metric}
                  x={10}
                  y={495}
                />
              </svg>
            </div>

            {/* LEGEND — compact inline */}
            <div className="px-4 py-2 border-t border-neutral-100 flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full overflow-hidden flex">
                {RED_RAMP.map((c, i) => (
                  <div key={i} className="flex-1" style={{ backgroundColor: metric.invert ? c : RED_RAMP[RED_RAMP.length - 1 - i] }} />
                ))}
              </div>
              <span className="text-[.6rem] text-neutral-400 shrink-0">{metric.invert ? 'menor é melhor' : 'maior é melhor'}</span>
            </div>
          </div>

          {/* RANKING / DETAIL */}
          <div className="flex flex-col gap-3 min-w-0">
            {selected && activeHealth ? (
              <DetailPanel
                health={activeHealth}
                metric={metric}
                colorScale={colorScale}
                nationals={nationals}
                maternidades={activeMaternidades}
                onClose={() => setSelected(null)}
              />
            ) : (
              <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 200px)', minHeight: '560px', maxHeight: '880px' }}>
                <div className="px-4 py-2 border-b border-neutral-100 shrink-0">
                  <h3 className="text-xs font-bold text-neutral-900">{metric.shortLabel}</h3>
                </div>
                <div className="overflow-y-auto flex-1">
                  {ranked.map((d, i) => {
                    const isHovered = hovered === d.name
                    const barWidth = (d.metricValue / metricMax) * 100
                    const fill = colorScale(d.metricValue)
                    return (
                      <button
                        key={d.name}
                        onClick={() => setSelected(d.name)}
                        onMouseEnter={() => setHovered(d.name)}
                        onMouseLeave={() => setHovered(null)}
                        className={`w-full text-left px-3 py-1 transition-colors ${
                          isHovered ? 'bg-neutral-50' : 'hover:bg-neutral-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[.6rem] font-bold text-neutral-300 w-3 tabular-nums shrink-0">
                            {i + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-semibold truncate text-neutral-700">{d.name}</span>
                              <span className="text-xs font-extrabold tabular-nums text-neutral-900 shrink-0">{metric.format(d.metricValue)}</span>
                            </div>
                            <div className="h-1 bg-neutral-100 rounded-full overflow-hidden mt-0.5">
                              <div
                                className="h-full rounded-full transition-[width,background-color] duration-500 ease-out"
                                style={{ width: `${barWidth}%`, backgroundColor: fill }}
                              />
                            </div>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
                {/* Insights inline */}
                {nationals && (() => {
                  const sorted = [...districts].sort((a, b) => metric.accessor(b) - metric.accessor(a))
                  const highest = sorted[0], lowest = sorted[sorted.length - 1]
                  const worst = metric.invert ? highest : lowest
                  const best = metric.invert ? lowest : highest
                  const avg = districts.reduce((s, d) => s + metric.accessor(d), 0) / districts.length
                  return (
                    <div className="grid grid-cols-3 gap-px border-t border-neutral-100">
                      <button onClick={() => setSelected(best.name)} className="p-2 text-left hover:bg-neutral-50 transition-colors">
                        <p className="text-[.6rem] text-neutral-400 uppercase font-semibold">Melhor</p>
                        <p className="text-xs font-bold text-neutral-900">{best.name}</p>
                        <p className="text-xs font-extrabold tabular-nums" style={{ color: colorScale(metric.accessor(best)) }}>{metric.format(metric.accessor(best))}</p>
                      </button>
                      <button onClick={() => setSelected(worst.name)} className="p-2 text-left hover:bg-neutral-50 transition-colors border-x border-neutral-100">
                        <p className="text-[.6rem] text-neutral-400 uppercase font-semibold">Pior</p>
                        <p className="text-xs font-bold text-neutral-900">{worst.name}</p>
                        <p className="text-xs font-extrabold tabular-nums" style={{ color: colorScale(metric.accessor(worst)) }}>{metric.format(metric.accessor(worst))}</p>
                      </button>
                      <div className="p-2">
                        <p className="text-[.6rem] text-neutral-400 uppercase font-semibold">Média</p>
                        <p className="text-xs font-bold text-neutral-900">Portugal</p>
                        <p className="text-xs font-extrabold tabular-nums text-neutral-900">{metric.format(avg)}</p>
                      </div>
                    </div>
                  )
                })()}
              </div>
            )}
          </div>
        </div>
      </section>

    </div>
  )
}

/* ─────────── Detail panel ─────────── */

function DetailPanel({ health, metric, colorScale, nationals, maternidades, onClose }) {
  if (!health || !nationals) return null
  const value = metric.accessor(health)
  const fill = colorScale(value)
  const nationalAvg = (() => {
    if (metric.key === 'sem_medico_pct') return nationals.sem_medico_pct
    if (metric.key === 'hab_por_centro') return nationals.hab_por_centro
    if (metric.key === 'sem_medico') return nationals.sem_medico / 20
    if (metric.key === 'urgencias') return nationals.urgencias / 20
    if (metric.key === 'hospitais') return nationals.hospitais / 20
    return 0
  })()
  const vsNational = nationalAvg > 0 ? ((value - nationalAvg) / nationalAvg) * 100 : 0
  const isAboveAverage = vsNational > 0
  const semMedicoPct = health.populacao ? (health.sem_medico / health.populacao) * 100 : 0

  return (
    <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden animate-fade-up">
      <div className="px-5 pt-5 pb-4 border-b border-neutral-100 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[.65rem] uppercase tracking-[.15em] text-neutral-400 font-semibold">
            Distrito
          </p>
          <h2 className="text-2xl font-bold text-neutral-900 font-serif mt-0.5 truncate">
            {health.name}
          </h2>
          <p className="text-[.7rem] text-neutral-500 mt-1">
            {formatNumber(health.populacao)} habitantes
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label="Fechar detalhe"
          className="text-neutral-400 hover:text-neutral-800 transition-colors p-1 -m-1 shrink-0"
        >
          <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>

      <div className="p-5 space-y-4">
        {/* Headline metric */}
        <div
          className="rounded-xl p-4 border"
          style={{ backgroundColor: `${fill}12`, borderColor: `${fill}55` }}
        >
          <p className="text-[.65rem] uppercase tracking-[.15em] text-neutral-600 font-semibold">
            {metric.label}
          </p>
          <p className="text-4xl font-extrabold tabular-nums mt-1 leading-none" style={{ color: fill }}>
            {metric.format(value)}
          </p>
          {metric.isRegional ? (
            <p className="text-[.7rem] text-neutral-500 mt-2 leading-relaxed">
              <span className="font-semibold text-amber-800">⚠ Estimativa regional.</span>{' '}
              Taxa da ARS <strong>{health.regiao || '—'}</strong>
              {health.taxa_regional_pct ? ` (${health.taxa_regional_pct}%)` : ''} aplicada à população do distrito. Todos os distritos desta região partilham a mesma taxa.
            </p>
          ) : nationalAvg > 0 ? (
            <p className="text-[.7rem] text-neutral-500 mt-2">
              <span className={isAboveAverage ? 'font-semibold text-red-600' : 'font-semibold text-neutral-700'}>
                {vsNational > 0 ? '+' : ''}
                {vsNational.toFixed(0)}%
              </span>{' '}
              face à média nacional
            </p>
          ) : null}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-2">
          <StatCard label="Sem médico" value={formatNumber(health.sem_medico)} sub={`${semMedicoPct.toFixed(1)}% da população`} accent />
          <StatCard label="Urgências" value={health.urgencias} sub="em funcionamento" />
          <StatCard label="Hospitais" value={health.hospitais} sub="do SNS" />
          <StatCard
            label="Centros de saúde"
            value={health.centros_saude}
            sub={
              health.centros_saude
                ? `1 : ${formatNumber(Math.round(health.populacao / health.centros_saude))}`
                : '—'
            }
          />
        </div>

        {/* Maternidades */}
        {maternidades.length > 0 && (
          <div className="pt-3 border-t border-neutral-100">
            <h3 className="text-[.65rem] font-bold uppercase tracking-[.15em] text-neutral-500 mb-2">
              Maternidades documentadas
            </h3>
            <div className="space-y-1.5">
              {maternidades.slice(0, 4).map((m, i) => (
                <div key={i} className="text-[.72rem] text-neutral-600 leading-relaxed">
                  <strong className="text-neutral-800">{m.nome}</strong>
                  <span className="text-neutral-400"> · {m.ano_fecho}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, sub, accent }) {
  return (
    <div className="bg-neutral-50 rounded-lg p-3 border border-neutral-100">
      <p className="text-[.65rem] uppercase tracking-wide text-neutral-500 font-semibold">{label}</p>
      <p
        className={`text-xl font-extrabold tabular-nums mt-0.5 ${
          accent ? 'text-red-700' : 'text-neutral-900'
        }`}
      >
        {value}
      </p>
      <p className="text-[.7rem] text-neutral-500">{sub}</p>
    </div>
  )
}

/* ─────────── Insights strip ─────────── */

function Insights({ districts, metric, colorScale, onSelect }) {
  const sorted = [...districts].sort((a, b) => metric.accessor(b) - metric.accessor(a))
  const highest = sorted[0]
  const lowest = sorted[sorted.length - 1]
  const worst = metric.invert ? highest : lowest
  const best = metric.invert ? lowest : highest
  const avg = districts.reduce((s, d) => s + metric.accessor(d), 0) / districts.length

  return (
    <section className="max-w-6xl mx-auto px-5 mt-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <InsightCard label="Menor pressão" district={best} metric={metric} colorScale={colorScale} onSelect={onSelect} />
        <InsightCard label="Maior pressão" district={worst} metric={metric} colorScale={colorScale} onSelect={onSelect} />
        <div className="bg-white rounded-xl border border-neutral-200 p-4">
          <p className="text-[.65rem] uppercase tracking-[.15em] text-neutral-400 font-semibold">
            Média nacional
          </p>
          <p className="text-sm font-bold text-neutral-900 mt-2">Portugal</p>
          <p className="text-2xl font-extrabold text-neutral-900 tabular-nums mt-1 leading-none">
            {metric.format(avg)}
          </p>
          <p className="text-[.65rem] text-neutral-500 mt-1">{metric.shortLabel}</p>
        </div>
      </div>
    </section>
  )
}

function InsightCard({ label, district, metric, colorScale, onSelect }) {
  const value = metric.accessor(district)
  const fill = colorScale(value)
  return (
    <button
      onClick={() => onSelect(district.name)}
      className="bg-white rounded-xl border border-neutral-200 p-4 text-left hover:border-neutral-400 hover:shadow-sm transition-all group relative overflow-hidden"
    >
      <div
        className="absolute inset-y-0 left-0 w-1"
        style={{ backgroundColor: fill }}
        aria-hidden="true"
      />
      <p className="text-[.65rem] uppercase tracking-[.15em] text-neutral-400 font-semibold pl-2">
        {label}
      </p>
      <p className="text-sm font-bold text-neutral-900 mt-2 pl-2 group-hover:underline underline-offset-2">
        {district.name}
      </p>
      <p className="text-2xl font-extrabold tabular-nums mt-1 leading-none pl-2" style={{ color: fill }}>
        {metric.format(value)}
      </p>
      <p className="text-[.65rem] text-neutral-500 mt-1 pl-2">{metric.shortLabel}</p>
    </button>
  )
}
