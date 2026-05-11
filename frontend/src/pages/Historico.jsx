import { useState } from 'react'

/**
 * Each entry shows real, verified snapshots from data/sns_arquivo.json plus a
 * "linha temporal completa" link to Arquivo.pt's calendar view (always works).
 */
const SITES = [
  {
    id: 'sns',
    nome: 'sns.gov.pt',
    descricao: 'Portal oficial do Serviço Nacional de Saúde, lançado em 2017 como ponto único de informação para os utentes.',
    rootUrl: 'sns.gov.pt',
    snapshots: [
      {
        ano: 2017,
        ts: '20170815235742',
        nota: 'Notícia: Dia Mundial do Médico de Família',
        url: 'https://www.sns.gov.pt/noticias/2017/05/19/dia-mundial-do-medico-de-familia-2/',
      },
      {
        ano: 2019,
        ts: '20191120150108',
        nota: 'Notícia: Gestão em Enfermagem',
        url: 'https://www.sns.gov.pt/noticias/2019/04/11/gestao-em-enfermagem/',
      },
      {
        ano: 2020,
        ts: '20200611175741',
        nota: 'Dataset: Atividade da Linha SNS 24',
        url: 'https://transparencia.sns.gov.pt/explore/dataset/atividade-operacional-sns-24/table/',
        domain: 'transparencia.sns.gov.pt',
      },
    ],
  },
  {
    id: 'acss',
    nome: 'acss.min-saude.pt',
    descricao: 'Administração Central do Sistema de Saúde — gestor financeiro e contratual do SNS.',
    rootUrl: 'acss.min-saude.pt',
    snapshots: [
      {
        ano: 2018,
        ts: '20181013165338',
        nota: 'Categoria: Cuidados de Saúde Primários',
        url: 'http://www.acss.min-saude.pt/category/cuidados-de-saude/primarios/',
      },
      {
        ano: 2019,
        ts: '20190323005645',
        nota: 'Categoria: Cuidados de Saúde Primários (1 ano depois)',
        url: 'http://www.acss.min-saude.pt/category/cuidados-de-saude/primarios/',
      },
    ],
  },
  {
    id: 'arslvt',
    nome: 'arslvt.min-saude.pt',
    descricao: 'Administração Regional de Saúde de Lisboa e Vale do Tejo — coordenação dos cuidados na maior região do país.',
    rootUrl: 'arslvt.min-saude.pt',
    snapshots: [
      {
        ano: 2017,
        ts: '20170806104717',
        nota: 'Página principal ARS LVT',
        url: 'http://www.arslvt.min-saude.pt/',
      },
      {
        ano: 2018,
        ts: '20181013190417',
        nota: 'Página principal ARS LVT (1 ano depois)',
        url: 'http://www.arslvt.min-saude.pt/',
      },
    ],
  },
]

function buildWaybackUrl(snap) {
  return `https://arquivo.pt/wayback/${snap.ts}/${snap.url}`
}

function buildCalendarUrl(rootUrl) {
  return `https://arquivo.pt/wayback/*/${rootUrl}`
}

function SnapshotCard({ snap, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`group relative aspect-[4/3] rounded-lg overflow-hidden border-2 transition-all flex flex-col items-center justify-center p-4 text-center ${
        isActive
          ? 'border-red-500 shadow-lg shadow-red-500/20 bg-gradient-to-br from-red-50 to-orange-50'
          : 'border-neutral-200 hover:border-neutral-400 bg-gradient-to-br from-neutral-50 to-white'
      }`}
    >
      <div className={`text-3xl font-extrabold tabular-nums ${isActive ? 'text-red-600' : 'text-neutral-900'}`}>
        {snap.ano}
      </div>
      <div className="text-[.7rem] font-semibold text-neutral-600 mt-1 line-clamp-2">{snap.nota}</div>
      <div className="text-[.6rem] text-neutral-400 mt-2 font-mono">{snap.ts.slice(0,8)}</div>
    </button>
  )
}

export default function Historico() {
  const [activeSite, setActiveSite] = useState(SITES[0])
  const [activeSnap, setActiveSnap] = useState(SITES[0].snapshots[0] || null)

  const handleSiteChange = (site) => {
    setActiveSite(site)
    setActiveSnap(site.snapshots[0] || null)
  }

  return (
    <div className="bg-neutral-50 min-h-screen">
      {/* Hero */}
      <section className="bg-neutral-950 text-white border-b border-white/10">
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between gap-4">
          <h1 className="font-serif text-xl font-bold tracking-tight">Antes / Depois</h1>
          <span className="text-xs text-neutral-500 hidden sm:block">Wayback · Arquivo.pt</span>
        </div>
      </section>

      {/* Intro */}
      <section className="max-w-6xl mx-auto px-5 mt-4">
        <p className="text-sm text-neutral-600 max-w-3xl leading-relaxed">
          A web da saúde pública portuguesa preservada e <strong className="text-neutral-900">navegável</strong>.
          Cada captura é uma página real arquivada — clica num ano para a abrir aqui dentro, ou abre a linha temporal completa para ver todas as datas disponíveis.
        </p>
      </section>

      {/* Site selector */}
      <section className="max-w-6xl mx-auto px-5 mt-5">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {SITES.map(site => (
            <button
              key={site.id}
              onClick={() => handleSiteChange(site)}
              className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                activeSite.id === site.id
                  ? 'bg-neutral-900 text-white border-neutral-900'
                  : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-400'
              }`}
            >
              {site.nome}
            </button>
          ))}
        </div>
      </section>

      {/* Site description + calendar link */}
      <section className="max-w-6xl mx-auto px-5 mt-4">
        <div className="bg-white rounded-xl border border-neutral-200 p-4 flex items-start justify-between gap-4 flex-wrap">
          <p className="text-sm text-neutral-600 flex-1 min-w-[250px] leading-relaxed">{activeSite.descricao}</p>
          <a
            href={buildCalendarUrl(activeSite.rootUrl)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 inline-flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-full px-3 py-1.5 transition-colors shrink-0"
            title="Ver todas as capturas deste site no Arquivo.pt"
          >
            <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor"><path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z"/><path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z"/></svg>
            Linha temporal completa
          </a>
        </div>
      </section>

      {/* Snapshot cards */}
      {activeSite.snapshots.length > 0 ? (
        <>
          <section className="max-w-6xl mx-auto px-5 mt-4">
            <div className={`grid gap-3 ${activeSite.snapshots.length >= 3 ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-2 lg:grid-cols-3'}`}>
              {activeSite.snapshots.map(snap => (
                <SnapshotCard
                  key={snap.ts}
                  snap={snap}
                  isActive={activeSnap?.ts === snap.ts}
                  onClick={() => setActiveSnap(snap)}
                />
              ))}
            </div>
          </section>

          {/* Active snapshot iframe */}
          {activeSnap && (
            <section className="max-w-6xl mx-auto px-5 mt-6 pb-10">
              <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
                <div className="px-5 py-3 border-b border-neutral-100 flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <p className="text-[.65rem] text-neutral-400 uppercase tracking-wider font-semibold">{activeSnap.domain || activeSite.nome}</p>
                    <h2 className="text-base font-bold text-neutral-900">{activeSnap.nota} · {activeSnap.ano}</h2>
                  </div>
                  <a
                    href={buildWaybackUrl(activeSnap)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-neutral-600 hover:text-neutral-900 inline-flex items-center gap-1 border border-neutral-200 hover:border-neutral-400 rounded-full px-3 py-1 transition-colors"
                  >
                    Abrir em nova janela ↗
                  </a>
                </div>
                <div className="bg-neutral-100 relative" style={{ height: '70vh', minHeight: '500px' }}>
                  <iframe
                    key={activeSnap.ts}
                    src={buildWaybackUrl(activeSnap)}
                    title={`Captura de ${activeSite.nome} em ${activeSnap.ano}`}
                    className="w-full h-full border-0"
                    loading="lazy"
                    sandbox="allow-same-origin allow-scripts allow-popups"
                  />
                </div>
                <div className="px-5 py-3 border-t border-neutral-100 flex items-center justify-between text-[.65rem] text-neutral-400 flex-wrap gap-2">
                  <span className="truncate max-w-full">URL: <code className="bg-neutral-50 px-1.5 py-0.5 rounded">{activeSnap.url}</code></span>
                  <span className="flex items-center gap-1.5 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {activeSnap.ts.slice(0,4)}-{activeSnap.ts.slice(4,6)}-{activeSnap.ts.slice(6,8)}
                  </span>
                </div>
              </div>
            </section>
          )}
        </>
      ) : (
        <section className="max-w-6xl mx-auto px-5 mt-6 pb-10">
          <div className="bg-white rounded-2xl border border-neutral-200 p-10 text-center">
            <p className="text-sm text-neutral-500 mb-3">Capturas específicas indisponíveis na nossa base local.</p>
            <a
              href={buildCalendarUrl(activeSite.rootUrl)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-5 py-2.5 rounded-full transition-colors"
            >
              Abrir todas as capturas no Arquivo.pt
              <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor"><path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z"/><path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z"/></svg>
            </a>
          </div>
        </section>
      )}
    </div>
  )
}
