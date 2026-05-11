import { useState, useCallback, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../hooks/useData'

const SUGESTOES = [
  { text: 'Quantos portugueses estão sem médico de família?' },
  { text: 'Conta-me um facto surpreendente sobre o SNS' },
  { text: 'Compara o governo Costa com o Montenegro na saúde' },
  { text: 'O que mudou nas urgências nos últimos anos?' },
  { text: 'Quantos hospitais e centros de saúde existem?' },
  { text: 'Que compromissos de saúde foram realmente cumpridos?' },
]

function normalize(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, '')
}

function matchTerms(text, terms) {
  const t = normalize(text)
  return terms.some(term => t.includes(normalize(term)))
}

function searchData(query, data) {
  if (!data) return []
  const results = []
  const promessas = data?.promessas || []
  const governos = data?.governos || []
  const maternidades = data?.maternidades?.fechadas || []

  if (matchTerms(query, ['sem medico', 'medico familia', 'medico de familia', 'medicos'])) {
    results.push({ type: 'stat', title: 'Utentes sem médico de família', value: '≈ 1,5 milhões', detail: 'Cerca de 1,5 milhões de utentes sem médico de família (Portal da Transparência do SNS).', source: 'ACSS' })
    const related = promessas.filter(p => matchTerms(p.texto, ['medico', 'familia'])).slice(0, 3)
    if (related.length) results.push({ type: 'promessas', title: `${related.length} compromissos`, items: related })
  }

  if (matchTerms(query, ['governo', 'promessa', 'compromisso', 'cumprida', 'cumprido', 'concret'])) {
    const govStats = governos.map(g => {
      const ps = promessas.filter(p => p.governo === g.id)
      const sim = ps.filter(p => p.cumprido === 'sim').length
      const parcial = ps.filter(p => p.cumprido === 'parcial').length
      return { ...g, total: ps.length, sim, parcial, score: ps.length > 0 ? Math.round(((sim + parcial * 0.5) / ps.length) * 100) : 0 }
    }).sort((a, b) => b.total - a.total)
    results.push({ type: 'govs', title: 'Por Governo', items: govStats })
  }

  if (matchTerms(query, ['urgencia', 'urgencias', 'emergencia'])) {
    results.push({ type: 'stat', title: 'Urgências hospitalares', value: '438 dias', detail: 'Dias de encerramento parcial de urgências no 1.º trimestre de 2024 (316 obstetrícia, 113 pediatria, 9 adultos), segundo o SDM/SNS.', source: 'Direção Executiva do SNS' })
  }

  if (matchTerms(query, ['maternidade', 'maternidades', 'parto'])) {
    results.push({ type: 'stat', title: 'Maternidades', value: `${maternidades.length} encerradas`, detail: 'Reestruturação 2006-2013. Concentração em unidades com equipas 24h.', source: 'CNSM' })
    if (maternidades.length) results.push({ type: 'maternidades', title: 'Lista', items: maternidades.slice(0, 3) })
  }

  if (matchTerms(query, ['lista', 'espera', 'cirurgia'])) {
    results.push({ type: 'action', title: 'Listas de espera', desc: 'Os tempos de espera para consulta e cirurgia no SNS são publicados no Portal da Transparência (SIGIC).', link: 'https://transparencia.sns.gov.pt', linkLabel: 'Abrir Portal da Transparência ↗' })
  }

  if (matchTerms(query, ['hospital', 'hospitais', 'centro de saude', 'centros'])) {
    results.push({ type: 'action', title: 'Mapa da Saúde', desc: 'Hospitais e centros de saúde por distrito.', link: '/mapa', linkLabel: 'Abrir mapa' })
  }

  if (matchTerms(query, ['usf', 'unidade familiar', 'unidades familiares', 'cuidados primarios'])) {
    results.push({ type: 'stat', title: 'USF', value: 'Desde 2006', detail: 'As Unidades de Saúde Familiar foram criadas em 2006 e tornaram-se a forma dominante de organização dos cuidados primários.', source: 'ACSS' })
    results.push({ type: 'action', title: 'Glossário', desc: 'Evolução do termo USF ao longo do tempo.', link: '/glossario', linkLabel: 'Ver glossário' })
  }

  if (matchTerms(query, ['covid', 'pandemia', 'sns 24', 'linha sns'])) {
    results.push({ type: 'stat', title: 'COVID-19', value: '2020-2022', detail: 'Pico histórico de utilização da Linha SNS 24 e da telessaúde durante a pandemia.', source: 'DGS / SPMS' })
  }

  if (matchTerms(query, ['enfermeiro', 'enfermeiros', 'medico', 'medicos', 'recursos humanos', 'profissionais'])) {
    const related = promessas.filter(p => matchTerms(p.tema || '', ['enfermeiros', 'recursos_humanos'])).slice(0, 3)
    if (related.length) results.push({ type: 'promessas', title: `Compromissos sobre profissionais (${related.length})`, items: related })
  }

  if (matchTerms(query, ['saude mental', 'depressao', 'psiquiatra', 'psicolog'])) {
    const related = promessas.filter(p => matchTerms(p.tema || '', ['saude_mental'])).slice(0, 3)
    if (related.length) results.push({ type: 'promessas', title: `Compromissos sobre saúde mental`, items: related })
  }

  if (matchTerms(query, ['saude oral', 'cheque dentista', 'dentista'])) {
    const related = promessas.filter(p => matchTerms(p.tema || '', ['saude_oral'])).slice(0, 3)
    if (related.length) results.push({ type: 'promessas', title: `Compromissos sobre saúde oral`, items: related })
  }

  if (matchTerms(query, ['ula', 'uls', 'unidade local'])) {
    results.push({ type: 'stat', title: 'Unidades Locais de Saúde', value: '2024', detail: 'A reorganização em ULS é a mais recente alteração estrutural do SNS, juntando hospitais e cuidados primários numa só unidade.', source: 'Portal SNS' })
  }

  if (matchTerms(query, ['distrito', 'lisboa', 'porto', 'coimbra', 'braga', 'faro', 'mapa', 'regiao'])) {
    results.push({ type: 'action', title: 'Mapa da Saúde', desc: 'Dados por distrito.', link: '/mapa', linkLabel: 'Abrir mapa' })
  }

  if (matchTerms(query, ['comparar', 'compara', 'comparacao', 'lado a lado'])) {
    results.push({ type: 'action', title: 'Comparador de Governos', desc: 'Análise lado a lado entre governos.', link: '/comparador', linkLabel: 'Abrir comparador' })
  }

  // Generic fallback — search promessas
  if (results.length === 0) {
    const words = query.split(/\s+/).filter(w => w.length > 3)
    const matched = promessas.filter(p =>
      matchTerms(p.texto, words) || matchTerms(p.verificacao || '', words) || matchTerms(p.tema || '', words)
    ).slice(0, 3)
    if (matched.length) results.push({ type: 'promessas', title: `${matched.length} resultado(s)`, items: matched })
  }

  return results.slice(0, 3)
}

/* ───────── Result cards ───────── */

function ResultCard({ result }) {
  if (result.type === 'ai') {
    return (
      <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 rounded-xl p-4 text-white">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-lg bg-red-600 flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a3 3 0 00-3 3v1a3 3 0 006 0V5a3 3 0 00-3-3z"/><path d="M19 10H5a2 2 0 00-2 2v1a7 7 0 0014 0v-1a2 2 0 00-2-2z"/></svg>
          </div>
          <div>
            <span className="text-xs font-bold text-white">Agente SNS</span>
            {result.model && <span className="text-[.6rem] text-white/40 ml-2">{result.model} · RAG</span>}
          </div>
        </div>
        <p className="text-sm text-white/90 leading-relaxed whitespace-pre-wrap">{result.answer}</p>
        {result.crawled && result.crawled.length > 0 && (
          <div className="mt-3 pt-2 border-t border-white/10">
            <p className="text-[.6rem] text-white/40 font-semibold uppercase tracking-wider mb-1.5">
              Capturas crawled ao vivo no Arquivo.pt
            </p>
            <div className="space-y-1">
              {result.crawled.slice(0, 3).map((c, i) => (
                <a
                  key={i}
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-[.65rem] text-emerald-300 hover:text-emerald-200 truncate"
                  title={c.title}
                >
                  ↗ [{c.year}] {c.title}
                </a>
              ))}
            </div>
          </div>
        )}
        {result.model && (
          <div className="flex items-center gap-2 mt-3 pt-2 border-t border-white/10">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-[.6rem] text-white/30">Resposta gerada com {result.model} sobre dados do Arquivo.pt</span>
          </div>
        )}
      </div>
    )
  }

  if (result.type === 'arquivo') {
    return (
      <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span className="text-xs font-bold text-neutral-700">{result.total} resultados no Arquivo.pt</span>
        </div>
        <div className="space-y-1.5">
          {result.items.map((r, i) => (
            <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" className="block p-2.5 bg-white rounded-lg border border-emerald-100 hover:border-emerald-300 transition-colors">
              <p className="text-xs font-semibold text-neutral-800 line-clamp-1">{r.titulo}</p>
              <p className="text-[.65rem] text-neutral-400 mt-0.5">{r.ano} · arquivo.pt</p>
            </a>
          ))}
        </div>
      </div>
    )
  }

  if (result.type === 'stat') {
    return (
      <div className="bg-white rounded-xl border border-neutral-200 p-4">
        <p className="text-[.65rem] font-semibold uppercase tracking-wider text-red-400">{result.title}</p>
        <p className="text-xl font-extrabold text-neutral-900 mt-1">{result.value}</p>
        <p className="text-xs text-neutral-500 mt-1">{result.detail}</p>
        <p className="text-[.65rem] text-neutral-400 mt-1">Fonte: {result.source}</p>
      </div>
    )
  }

  if (result.type === 'promessas') {
    return (
      <div className="bg-white rounded-xl border border-neutral-200 p-4">
        <p className="text-xs font-bold text-neutral-700 mb-2">{result.title}</p>
        {result.items.map((p, i) => (
          <div key={p.id || i} className="flex items-start gap-2 py-2 border-t border-neutral-50 first:border-0">
            <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${p.cumprido === 'sim' ? 'bg-emerald-500' : p.cumprido === 'parcial' ? 'bg-amber-500' : 'bg-red-500'}`} />
            <div>
              <p className="text-xs text-neutral-800">{p.texto}</p>
              <p className="text-[.65rem] text-neutral-400">{p.governo} · {p.ano}</p>
            </div>
          </div>
        ))}
        <Link to="/promessas" className="text-[.7rem] font-semibold text-red-600 mt-2 inline-block">Ver todos →</Link>
      </div>
    )
  }

  if (result.type === 'govs') {
    return (
      <div className="bg-white rounded-xl border border-neutral-200 p-4">
        <p className="text-xs font-bold text-neutral-700 mb-2">{result.title}</p>
        {result.items.filter(g => g.total > 0).map(g => (
          <div key={g.id} className="flex items-center justify-between py-1.5 border-t border-neutral-50 first:border-0">
            <span className="text-xs text-neutral-700"><strong>{g.id}</strong> {g.pm}</span>
            <span className={`text-xs font-bold ${g.score >= 50 ? 'text-emerald-600' : g.score >= 25 ? 'text-amber-600' : 'text-red-600'}`}>{g.score}%</span>
          </div>
        ))}
        <Link to="/comparador" className="text-[.7rem] font-semibold text-red-600 mt-2 inline-block">Comparar →</Link>
      </div>
    )
  }

  if (result.type === 'maternidades') {
    return (
      <div className="bg-white rounded-xl border border-neutral-200 p-4">
        {result.items.map((m, i) => (
          <div key={i} className="py-1.5 border-t border-neutral-50 first:border-0">
            <p className="text-xs text-neutral-800 font-medium">{m.nome}</p>
            <p className="text-[.65rem] text-neutral-400">{m.hospital} · {m.ano_fecho}</p>
          </div>
        ))}
      </div>
    )
  }

  if (result.type === 'action') {
    return (
      <Link to={result.link} className="block bg-white rounded-xl border border-neutral-200 p-4 hover:shadow-sm transition-all">
        <p className="text-xs font-bold text-neutral-800">{result.title}</p>
        <p className="text-[.65rem] text-neutral-500">{result.desc}</p>
      </Link>
    )
  }

  if (result.type === 'empty') {
    return (
      <div className="bg-neutral-50 rounded-xl border border-neutral-200 p-5">
        <p className="text-sm text-neutral-700 font-semibold mb-2">{result.title}</p>
        <p className="text-xs text-neutral-500 mb-3">Tente uma das sugestões abaixo, ou explore directamente:</p>
        <div className="flex flex-wrap gap-2">
          <Link to="/promessas" className="text-xs font-semibold px-3 py-1.5 rounded-full bg-white border border-neutral-200 hover:border-red-300 hover:text-red-600 transition-colors">Compromissos</Link>
          <Link to="/mapa" className="text-xs font-semibold px-3 py-1.5 rounded-full bg-white border border-neutral-200 hover:border-red-300 hover:text-red-600 transition-colors">Mapa</Link>
          <Link to="/glossario" className="text-xs font-semibold px-3 py-1.5 rounded-full bg-white border border-neutral-200 hover:border-red-300 hover:text-red-600 transition-colors">Glossário</Link>
          <Link to="/comparador" className="text-xs font-semibold px-3 py-1.5 rounded-full bg-white border border-neutral-200 hover:border-red-300 hover:text-red-600 transition-colors">Comparador</Link>
        </div>
      </div>
    )
  }

  return null
}

/* ───────── Main component ───────── */

export default function Assistente() {
  const { data, loading } = useData()
  const [query, setQuery] = useState('')
  const [history, setHistory] = useState([])
  const [thinking, setThinking] = useState(false)
  const inputRef = useRef(null)
  const chatRef = useRef(null)

  const handleSearch = useCallback(async (q) => {
    const searchQuery = q || query
    if (!searchQuery.trim()) return

    setThinking(true)
    setQuery('')

    const chatHistory = history.slice(-4).flatMap(h => {
      const aiAnswer = h.results.find(r => r.type === 'ai')
      return [
        { role: 'user', content: h.query },
        ...(aiAnswer ? [{ role: 'assistant', content: aiAnswer.answer }] : []),
      ]
    })

    let results = []

    // 1. Remote AI (Groq via /api/chat)
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 20000)
      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: searchQuery, history: chatHistory }),
        signal: controller.signal,
      })
      clearTimeout(timeout)
      const json = await resp.json()
      if (json.mode === 'ai' && json.answer) {
        results.push({ type: 'ai', answer: json.answer, model: json.model, crawled: json.crawled || [] })
      } else if (json.crawled && json.crawled.length) {
        results.push({ type: 'arquivo', items: json.crawled.map(c => ({ titulo: c.title, ano: c.year, url: c.url })), total: json.crawled.length })
      }
    } catch { /* AI unavailable */ }

    // 2. Live Arquivo.pt search
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10000)
      const resp = await fetch(`/api/pesquisa-arquivo?q=${encodeURIComponent(searchQuery + ' SNS saúde')}`, { signal: controller.signal })
      clearTimeout(timeout)
      const json = await resp.json()
      const items = (json.resultados || []).slice(0, 4)
      if (items.length) {
        results.push({ type: 'arquivo', items, total: items.length })
      }
    } catch { /* Arquivo.pt search unavailable */ }

    // 3. Supporting cards (stats, related promessas, actions)
    if (data) {
      const local = searchData(searchQuery, data)
      results.push(...local)
    }

    if (results.length === 0) {
      results.push({ type: 'empty', title: 'Sem resultados. Tente reformular a pergunta.' })
    }

    setHistory(prev => [...prev, { query: searchQuery, results }])
    setThinking(false)
    setTimeout(() => chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' }), 100)
  }, [query, data, history])

  useEffect(() => { inputRef.current?.focus() }, [])

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 56px)' }}>
      {/* Chat area — scrollable */}
      <div ref={chatRef} className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-5 py-6">

          {/* Empty state */}
          {history.length === 0 && (
            <div className="text-center pt-8 pb-4">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-red-100 to-orange-100 flex items-center justify-center">
                <svg className="w-8 h-8 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-neutral-800 mb-1">Agente de Saúde</h2>
              <p className="text-sm text-neutral-400 mb-6">
                Pergunte sobre hospitais, médicos, compromissos de governo, urgências ou qualquer tema do SNS.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-md mx-auto">
                {SUGESTOES.map(s => (
                  <button
                    key={s.text}
                    onClick={() => { setQuery(s.text); handleSearch(s.text) }}
                    className="text-left text-xs font-medium px-3 py-2.5 rounded-lg border border-neutral-200 bg-white text-neutral-600 hover:border-red-300 hover:text-red-600 transition-all"
                  >
                    {s.text}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Conversation */}
          {history.map((entry, i) => (
            <div key={i} className="mb-6">
              {/* User bubble */}
              <div className="flex justify-end mb-3">
                <div className="bg-red-600 text-white px-4 py-2 rounded-2xl rounded-br-sm max-w-[80%] text-sm font-medium">
                  {entry.query}
                </div>
              </div>
              {/* Results */}
              <div className="space-y-2 max-w-[90%]">
                {entry.results.map((r, j) => <ResultCard key={j} result={r} />)}
              </div>
            </div>
          ))}

          {/* Thinking — agent steps panel showing live crawl */}
          {thinking && (
            <div className="bg-white rounded-xl border border-neutral-200 p-4 mb-4 space-y-2 animate-fade-up">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs text-neutral-500">A pesquisar nos 51 compromissos locais...</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" style={{ animationDelay: '0.3s' }} />
                <span className="text-xs text-neutral-500">A fazer crawl ao vivo no Arquivo.pt (TextSearch + TextExtracted)...</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" style={{ animationDelay: '0.6s' }} />
                <span className="text-xs text-neutral-500">A sintetizar resposta com base nas evidências recolhidas...</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input bar — fixed at bottom */}
      <div className="border-t border-neutral-200 bg-white px-5 py-3">
        <div className="max-w-2xl mx-auto">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !thinking && handleSearch()}
              placeholder="Pergunte sobre o SNS..."
              className="flex-1 border border-neutral-200 rounded-xl px-4 py-2.5 text-sm text-neutral-900 focus:ring-2 focus:ring-red-100 focus:border-red-300 outline-none transition-all placeholder:text-neutral-300"
              disabled={loading || thinking}
              maxLength={500}
            />
            <button
              onClick={() => handleSearch()}
              disabled={!query.trim() || loading || thinking}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-colors shrink-0"
            >
              {thinking ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13" /><path d="M22 2L15 22L11 13L2 9L22 2Z" /></svg>
              )}
            </button>
          </div>
          {history.length > 0 && (
            <button
              onClick={() => { setHistory([]); inputRef.current?.focus() }}
              className="text-[.65rem] text-neutral-400 hover:text-red-600 mt-2 transition-colors"
            >
              Limpar conversa
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
