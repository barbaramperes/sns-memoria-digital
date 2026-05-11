const apis = [
  {
    nome: 'TextSearch',
    desc: 'Pesquisa integral em páginas preservadas. Usado para construir o glossário de termos de saúde.',
    ex: 'q=USF+saúde&from=20050101&to=20241231',
    url: 'https://arquivo.pt/page/search?q=USF+saúde&from=20050101&to=20241231',
  },
  {
    nome: 'CDX',
    desc: 'Índice de capturas de um URL ao longo do tempo. Usado para mapear a evolução de sites como sns.gov.pt.',
    ex: 'wayback/cdx?url=sns.gov.pt',
    url: 'https://arquivo.pt/wayback/cdx?url=sns.gov.pt&output=json&limit=20',
  },
  {
    nome: 'Wayback',
    desc: 'Acesso directo às versões arquivadas. Usado para citar capturas concretas de programas de governo.',
    ex: 'wayback/20210101/sns.gov.pt',
    url: 'https://arquivo.pt/wayback/20210101000000/https://sns.gov.pt',
  },
  {
    nome: 'Screenshot',
    desc: 'Captura visual de páginas numa data específica. Usado para evidenciar o estado da informação pública num dado momento.',
    ex: 'screenshot?url=sns.gov.pt&timestamp=20210101',
    url: 'https://arquivo.pt/screenshot?url=https://sns.gov.pt&timestamp=20210101000000',
  },
]

const fontes = [
  'Arquivo.pt — Preservação da web portuguesa',
  'ACSS — Administração Central do Sistema de Saúde',
  'INE — Instituto Nacional de Estatística (Census 2021, Estimativas Anuais 2023)',
  'Portal da Transparência do SNS (transparencia.sns.gov.pt)',
  'Direcção Executiva do SNS (sns.min-saude.pt)',
  'Diário da República — Decretos-Lei citados (101/2006, 28/2008, 102/2023, etc.)',
  'Portal Histórico do Governo (historico.portugal.gov.pt) — composição dos Governos Constitucionais',
  'Programas dos Governos Constitucionais (XVII a XXIV) preservados no Arquivo.pt',
]

const transparencia = [
  {
    t: 'Compromissos (Promessas)',
    d: 'Texto do compromisso e diploma legal: verificáveis no Diário da República. Os números nos campos "verificação" são estimativas ou referências; quando há link directo para fonte oficial, está citado.',
  },
  {
    t: 'Mapa por distrito',
    d: 'A ACSS reporta utentes sem médico de família por ARS regional, não por distrito. Os números mostrados são derivados (taxa regional × população do distrito) — mantêm a comparação justa entre regiões mas não são leitura directa do portal SNS. Fonte das taxas regionais: ACSS via HealthNews (Nov 2025): Norte 2.6%, Centro 12.6%, LVT 27.7%, Alentejo 17.3%, Algarve 20% (média nacional 14.5% em Dez/2024, ~1,5M utentes).',
  },
  {
    t: 'Glossário',
    d: 'A linha de tendência é uma representação esquemática calibrada pelos marcos legislativos (USF 2007, ACES 2008, SNS 24 em 2017, ULS em 2024). Os valores absolutos não são apresentados — cada ponto abre a pesquisa no Arquivo.pt para o utilizador ver a contagem real.',
  },
  {
    t: 'Antes / Depois',
    d: 'Todas as 8 capturas embebidas (sns.gov.pt, acss.min-saude.pt, arslvt.min-saude.pt) foram verificadas — resolvem em HTTP 200 no Arquivo.pt na data indicada.',
  },
]

export default function Sobre() {
  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Hero */}
      <section className="bg-neutral-950 text-white border-b border-white/10">
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between">
          <h1 className="font-serif text-xl font-bold tracking-tight">Sobre o Projecto</h1>
          <span className="text-xs text-neutral-500">Prémio Arquivo.pt 2026</span>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-5 py-8 space-y-8">
        {/* What */}
        <div className="bg-white rounded-xl border border-neutral-200 p-6">
          <h2 className="text-lg font-bold text-neutral-900 mb-3">O que é</h2>
          <p className="text-sm text-neutral-600 leading-relaxed mb-3">
            O <strong>SNS Memória Digital</strong> utiliza o Arquivo.pt para documentar 20 anos de evolução do Serviço Nacional de Saúde português. Através de visualizações interactivas e um agente de IA com RAG (Retrieval-Augmented Generation), os cidadãos podem explorar como a saúde pública evoluiu ao longo de sete governos.
          </p>
          <p className="text-sm text-neutral-600 leading-relaxed">
            Cada facto é ligado directamente à sua fonte no Arquivo.pt — nada é opinião, tudo é documentação verificável.
          </p>
        </div>

        {/* Numbers */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { n: '51', label: 'compromissos documentados' },
            { n: '7', label: 'governos analisados' },
            { n: '20', label: 'distritos mapeados' },
            { n: '4', label: 'APIs do Arquivo.pt' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-neutral-200 p-4 text-center">
              <div className="text-2xl font-extrabold text-neutral-900">{s.n}</div>
              <div className="text-xs text-neutral-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Methodology */}
        <div className="bg-white rounded-xl border border-neutral-200 p-6">
          <h2 className="text-lg font-bold text-neutral-900 mb-4">Metodologia</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { n: '1', t: 'Recolha', d: 'APIs do Arquivo.pt para encontrar documentos, notícias e sites governamentais sobre saúde.' },
              { n: '2', t: 'Verificação', d: 'Cada compromisso é cruzado com fontes primárias arquivadas no Arquivo.pt.' },
              { n: '3', t: 'Classificação', d: 'Organização por governo, tema e estado de concretização.' },
              { n: '4', t: 'Visualização', d: 'Mapa interativo, gráficos comparativos, quiz e agente IA com RAG.' },
            ].map(m => (
              <div key={m.n} className="flex gap-3">
                <span className="w-7 h-7 rounded-full bg-neutral-900 text-white flex items-center justify-center text-xs font-bold shrink-0">{m.n}</span>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">{m.t}</h3>
                  <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">{m.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* APIs */}
        <div className="bg-white rounded-xl border border-neutral-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-neutral-900">APIs do Arquivo.pt</h2>
            <a href="https://arquivo.pt/api" target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-red-600 hover:text-red-800">
              Documentação →
            </a>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {apis.map(api => (
              <div key={api.nome} className="border border-neutral-100 rounded-lg p-3 hover:border-emerald-300 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-sm font-bold text-neutral-900">{api.nome}</div>
                  <a
                    href={api.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[.65rem] font-semibold text-emerald-700 hover:text-emerald-900 inline-flex items-center gap-1"
                    title={`Executar exemplo de ${api.nome} no Arquivo.pt`}
                  >
                    Testar ↗
                  </a>
                </div>
                <p className="text-xs text-neutral-500 mb-2 leading-relaxed">{api.desc}</p>
                <code className="text-[.65rem] bg-neutral-50 text-neutral-500 px-2 py-1 rounded block truncate">{api.ex}</code>
              </div>
            ))}
          </div>
          <p className="text-[.7rem] text-neutral-400 mt-3">
            Cada exemplo é uma chamada real às APIs, executável no browser.
          </p>
        </div>

        {/* Sources */}
        <div className="bg-white rounded-xl border border-neutral-200 p-6">
          <h2 className="text-lg font-bold text-neutral-900 mb-3">Fontes de dados</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {fontes.map(f => (
              <div key={f} className="flex items-start gap-2 text-sm text-neutral-600">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                {f}
              </div>
            ))}
          </div>
        </div>

        {/* Transparency — what is verified vs derived */}
        <div className="bg-white rounded-xl border border-amber-200 p-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <h2 className="text-lg font-bold text-neutral-900">Transparência sobre os dados</h2>
          </div>
          <p className="text-xs text-neutral-500 mb-4 leading-relaxed">
            Para que o utilizador saiba exactamente o que está a ler, esclarecemos onde os números são leitura directa de fontes oficiais e onde são derivados.
          </p>
          <div className="space-y-3">
            {transparencia.map(item => (
              <div key={item.t} className="border-l-2 border-amber-200 pl-4">
                <h3 className="text-sm font-bold text-neutral-900 mb-1">{item.t}</h3>
                <p className="text-xs text-neutral-600 leading-relaxed">{item.d}</p>
              </div>
            ))}
          </div>
          <p className="text-[.7rem] text-neutral-400 mt-4 pt-3 border-t border-neutral-100">
            Para dados oficiais actualizados, consultar <a href="https://transparencia.sns.gov.pt" target="_blank" rel="noopener noreferrer" className="text-emerald-700 hover:text-emerald-900 font-semibold">transparencia.sns.gov.pt</a> e <a href="https://www.ine.pt" target="_blank" rel="noopener noreferrer" className="text-emerald-700 hover:text-emerald-900 font-semibold">ine.pt</a>.
          </p>
        </div>

        {/* Principles */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { t: 'Neutralidade', d: 'Factos documentados sem juízos de valor.' },
            { t: 'Verificabilidade', d: 'Dados cruzados com fontes públicas e o Arquivo.pt.' },
            { t: 'Utilidade', d: 'Ferramentas práticas para os cidadãos.' },
          ].map(p => (
            <div key={p.t} className="bg-white rounded-xl border border-neutral-200 p-4">
              <h3 className="text-sm font-bold text-neutral-900 mb-1">{p.t}</h3>
              <p className="text-xs text-neutral-500 leading-relaxed">{p.d}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="bg-neutral-950 rounded-xl p-6 text-center text-white">
          <p className="text-sm text-white/60 mb-3">
            Candidatura ao <strong className="text-white">Prémio Arquivo.pt 2026</strong>
          </p>
          <a href="https://arquivo.pt" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            arquivo.pt
          </a>
        </div>
      </section>
    </div>
  )
}
