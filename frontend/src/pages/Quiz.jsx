import { useState, useCallback, useMemo, useRef } from 'react'
import { toPng } from 'html-to-image'
import { useData } from '../hooks/useData'
import LoadingSkeleton from '../components/LoadingSkeleton'

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function Quiz() {
  const { data, loading } = useData()
  const [started, setStarted] = useState(false)
  const [finished, setFinished] = useState(false)
  const [questions, setQuestions] = useState([])
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState(null)
  const [flash, setFlash] = useState(null)
  const [answers, setAnswers] = useState([])
  const [generating, setGenerating] = useState(false)
  const resultCardRef = useRef(null)

  const promessas = useMemo(() => data?.promessas || [], [data])
  const governos = useMemo(() => data?.governos || [], [data])

  // Build unique governo list for answer buttons
  const govOptions = useMemo(() => {
    if (!governos.length) return []
    return governos.filter(g => promessas.some(p => p.governo === g.id)).map(g => ({
      id: g.id,
      pm: `${g.pm} (${g.partido})`,
      anos: `${g.inicio?.slice(0,4) || '?'}—${g.fim?.slice(0,4) || ''}`,
    }))
  }, [governos, promessas])

  const numQuestions = 10

  const startQuiz = useCallback(() => {
    // Use ALL promessas from API as quiz source — never the same quiz twice
    const quizReady = promessas.filter(p => p.texto && p.governo)
    setQuestions(shuffle(quizReady).slice(0, numQuestions))
    setCurrent(0)
    setSelected(null)
    setFlash(null)
    setAnswers([])
    setFinished(false)
    setStarted(true)
  }, [promessas])

  const handleAnswer = useCallback((govId) => {
    if (selected) return
    setSelected(govId)
    const q = questions[current]
    const correct = govId === q.governo
    if (correct) setFlash('correct')
    else setFlash('wrong')
    setAnswers(prev => [...prev, { question: q, answer: govId, correct }])
  }, [selected, questions, current])

  // Manual advance — user clicks "Proxima" when ready
  const handleNext = useCallback(() => {
    setFlash(null)
    setSelected(null)
    if (current + 1 >= questions.length) {
      setFinished(true)
    } else {
      setCurrent(c => c + 1)
    }
  }, [current, questions])

  const score = useMemo(() => answers.filter(a => a.correct).length, [answers])

  const shareText = useMemo(() => {
    if (!finished) return ''
    return `Acertei ${score}/${numQuestions} no Quiz do SNS Memória Digital. Sabes que Governo anunciou o quê? → sns-memoria-digital (Prémio Arquivo.pt 2026)`
  }, [finished, score])

  const generateCard = useCallback(async () => {
    if (!resultCardRef.current || generating) return
    setGenerating(true)
    try {
      const dataUrl = await toPng(resultCardRef.current, { pixelRatio: 2, backgroundColor: '#0a0a0a' })
      const link = document.createElement('a')
      link.download = `quiz-sns-memoria-${score}-de-${numQuestions}.png`
      link.href = dataUrl
      link.click()
    } catch (err) { console.error('Error generating image:', err) }
    setGenerating(false)
  }, [generating, score])

  const handleShare = useCallback(async () => {
    if (!resultCardRef.current) return
    try {
      const dataUrl = await toPng(resultCardRef.current, { pixelRatio: 2, backgroundColor: '#0a0a0a' })
      const res = await fetch(dataUrl)
      const blob = await res.blob()
      const file = new File([blob], `quiz-sns-memoria-${score}-de-${numQuestions}.png`, { type: 'image/png' })
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], text: shareText })
      } else if (navigator.share) {
        await navigator.share({ text: shareText })
      } else {
        await navigator.clipboard.writeText(shareText)
      }
    } catch {
      try { await navigator.clipboard.writeText(shareText) } catch { /* clipboard unavailable */ }
    }
  }, [score, shareText])

  if (loading) return <LoadingSkeleton lines={5} />

  return (
    <div className="flex-1 flex flex-col bg-neutral-950">
      {flash && (
        <div className={`fixed inset-0 z-40 pointer-events-none transition-opacity duration-300 ${
          flash === 'correct' ? 'bg-emerald-500/10' : 'bg-red-500/10'
        }`} />
      )}

      {/* ── START SCREEN ── */}
      {!started && (
        <section className="flex-1 flex items-center justify-center bg-neutral-950 text-white relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.15) 1px, transparent 1px)', backgroundSize: '64px 64px' }} />
          <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-600/5 rounded-full blur-3xl" />
          <div className="relative max-w-lg mx-auto px-5 text-center">
            <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2 mb-8">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[.7rem] uppercase tracking-[.2em] text-white/50 font-semibold">Quiz interativo</span>
            </div>
            <h1 className="font-serif text-3xl md:text-4xl font-bold tracking-tight leading-tight mb-5">
              Que Governo
              <br />
              <span className="gradient-text">Disse Isto?</span>
            </h1>
            <p className="text-neutral-400 text-sm mb-4 leading-relaxed max-w-sm mx-auto">
              {promessas.length} compromissos reais, com fontes no Arquivo.pt. As perguntas mudam a cada partida.
            </p>
            <div className="flex items-center justify-center gap-4 mb-8 text-[.7rem] text-neutral-500">
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 8v4l3 3" strokeLinecap="round"/><circle cx="12" cy="12" r="9"/></svg>
                ~3 min
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="9"/></svg>
                {numQuestions} perguntas
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Partilhável
              </span>
            </div>
            <button
              onClick={startQuiz}
              disabled={promessas.length === 0}
              className="group bg-red-600 text-white font-bold text-sm px-10 py-4 rounded-full hover:bg-red-700 transition-all duration-300 hover:shadow-lg hover:shadow-red-600/20 hover:scale-105 disabled:opacity-40"
            >
              Começar Quiz
              <svg className="inline-block w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 8h10m-4-4 4 4-4 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <div className="mt-8">
              <span className="text-[.65rem] text-emerald-600 font-semibold">Verificado no Arquivo.pt</span>
            </div>
          </div>
        </section>
      )}

      {/* ── QUESTION SCREEN ── */}
      {started && !finished && questions[current] && (
        <section className="flex-1 bg-neutral-50 py-10">
          <div className="max-w-2xl mx-auto px-5">
            {/* Progress */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-[.65rem] font-semibold text-neutral-400 uppercase tracking-wider">
                {current + 1} / {questions.length}
              </span>
              <span className="text-[.65rem] font-bold text-emerald-600">
                {score} correctas
              </span>
            </div>
            <div className="w-full h-1.5 bg-neutral-200 rounded-full mb-8">
              <div className="h-full bg-red-500 rounded-full transition-all duration-500" style={{ width: `${((current + 1) / questions.length) * 100}%` }} />
            </div>

            {/* Question */}
            <div className="bg-white rounded-2xl border border-neutral-200 p-8 mb-6 text-center shadow-sm">
              <p className="text-[.7rem] text-neutral-400 uppercase tracking-wider mb-3">Que Governo fez este compromisso?</p>
              <p className="text-lg md:text-xl font-bold text-neutral-900 leading-relaxed font-serif">
                &ldquo;{questions[current].texto}&rdquo;
              </p>
              {questions[current].tema && (
                <span className="inline-block mt-3 text-[.7rem] font-medium px-3 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                  {questions[current].tema}
                </span>
              )}
            </div>

            {/* Answer buttons */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {govOptions.map(g => {
                const isCorrect = g.id === questions[current].governo
                const isSelected = selected === g.id
                let btnClass = 'bg-white border-neutral-200 text-neutral-700 hover:border-neutral-400 hover:shadow-sm'
                if (selected) {
                  if (isCorrect) btnClass = 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-200'
                  else if (isSelected) btnClass = 'bg-red-50 border-red-500 text-red-800 ring-2 ring-red-200'
                  else btnClass = 'bg-neutral-50 border-neutral-200 text-neutral-300'
                }
                return (
                  <button
                    key={g.id}
                    onClick={() => handleAnswer(g.id)}
                    disabled={!!selected}
                    className={`border rounded-xl p-3 text-center transition-all duration-200 ${btnClass}`}
                  >
                    <div className="text-sm font-bold">{g.id} Gov.</div>
                    <div className="text-[.7rem] text-neutral-400 mt-0.5">{g.pm}</div>
                  </button>
                )
              })}
            </div>

            {/* Verification + Next button */}
            {selected && (
              <div className="mt-6 animate-fade-up">
                <div className="bg-white rounded-xl border border-neutral-200 p-5 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[.7rem] font-semibold uppercase tracking-wider text-neutral-400">Verificação</span>
                    {questions[current].link_arquivo && <span className="text-[.65rem] text-emerald-600 font-semibold">Verificado no Arquivo.pt</span>}
                  </div>
                  <p className="text-sm text-neutral-700 leading-relaxed">{questions[current].verificacao}</p>
                  {questions[current].link_arquivo && (
                    <a href={questions[current].link_arquivo} target="_blank" rel="noopener noreferrer" className="inline-block mt-2 text-[.65rem] text-emerald-700 hover:text-emerald-900 font-medium underline underline-offset-2">
                      Ver fonte no Arquivo.pt →
                    </a>
                  )}
                </div>
                <button
                  onClick={handleNext}
                  className="w-full bg-neutral-900 text-white font-bold text-sm py-3.5 rounded-xl hover:bg-neutral-800 transition-colors"
                >
                  {current + 1 >= questions.length ? 'Ver resultado' : 'Próxima pergunta'}
                  <svg className="inline-block w-4 h-4 ml-2" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 8h10m-4-4 4 4-4 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── RESULTS SCREEN ── */}
      {finished && (
        <section className="flex-1 flex items-center justify-center bg-neutral-950 text-white">
          <div className="max-w-lg mx-auto px-5 text-center">
            {/* Shareable result card */}
            <div ref={resultCardRef} className="bg-gradient-to-br from-neutral-900 to-neutral-950 rounded-2xl p-8 mb-8 border border-neutral-800">
              <p className="text-[.7rem] uppercase tracking-[.25em] text-red-400 font-semibold mb-2">SNS Memória Digital</p>
              <div className={`text-5xl font-extrabold mb-2 ${score >= 7 ? 'text-emerald-400' : score >= 4 ? 'text-amber-400' : 'text-red-400'}`}>
                {score}/{numQuestions}
              </div>
              <p className="text-white/60 text-sm mb-4">
                {score >= 7 ? 'Excelente conhecimento!' : score >= 4 ? 'Bom resultado!' : 'Tente outra vez!'}
              </p>
              <p className="text-[.65rem] text-white/30">Que Governo anunciou isto? · arquivo.pt</p>
            </div>

            <div className="flex justify-center mb-4"><span className="text-[.65rem] text-emerald-600 font-semibold">Verificado no Arquivo.pt</span></div>

            {/* Results list */}
            <div className="text-left space-y-2 mb-8">
              {answers.map((a, i) => (
                <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${a.correct ? 'bg-emerald-950/30 border-emerald-800/30' : 'bg-red-950/30 border-red-800/30'}`}>
                  <span className={`text-lg leading-none ${a.correct ? 'text-emerald-400' : 'text-red-400'}`}>{a.correct ? '✓' : '✕'}</span>
                  <div>
                    <p className="text-[.7rem] text-white/80 leading-relaxed">&ldquo;{a.question.texto}&rdquo;</p>
                    <p className="text-[.65rem] text-neutral-500 mt-1">
                      Resposta: {a.answer} · Correcto: {a.question.governo} ({a.question.ano})
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button onClick={startQuiz} className="bg-red-600 text-white font-bold text-sm px-8 py-3 rounded-xl hover:bg-red-700 transition-colors">
                Jogar outra vez
              </button>
              <button onClick={generateCard} disabled={generating} className="bg-white/10 text-white font-bold text-sm px-8 py-3 rounded-xl hover:bg-white/20 transition-colors disabled:opacity-50">
                {generating ? 'A gerar...' : 'Descarregar imagem'}
              </button>
              <button onClick={handleShare} className="bg-white/10 text-white font-bold text-sm px-8 py-3 rounded-xl hover:bg-white/20 transition-colors">
                Partilhar
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
