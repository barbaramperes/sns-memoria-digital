"""
SNS Memória Digital — Flask backend serving static files + API.
Candidatura ao Prémio Arquivo.pt 2026.
"""
import json, os, re, threading
from datetime import datetime
from urllib.parse import quote
from concurrent.futures import ThreadPoolExecutor
from flask import Flask, Response, jsonify, request, send_from_directory

_cache = {}
_lock = threading.Lock()
def cget(k):
    with _lock:
        it = _cache.get(k)
        if it and (datetime.now()-it[1]).seconds < 3600: return it[0]
    return None
def cset(k, v):
    with _lock: _cache[k] = (v, datetime.now())

def _load(name):
    p = os.path.join("data", name)
    if os.path.exists(p):
        with open(p, "r", encoding="utf-8") as f: return json.load(f)
    return {}

# Trusted sources: prefer these over blogs / random pages
_TRUSTED_DOMAINS = re.compile(
    r"(min-saude\.pt|sns\.gov\.pt|sns24\.gov\.pt|portugal\.gov\.pt|portaldasaude\.pt|"
    r"acss\.|transparencia\.|publico\.pt|sicnoticias\.pt|ionline\.|"
    r"economico\.sapo|diariodigital\.|dgtf\.pt|arslvt\.|ulsna\.|jornaldenegocios\.|"
    r"observador\.pt|expresso\.pt|dn\.pt|jornaleconomico\.|tsf\.pt|rtp\.pt)"
)

def _live_crawl_arquivo(query, max_results=3, max_text_chars=400):
    """Best-effort live crawl on Arquivo.pt for fresh evidence.
    Uses TextSearch (which already returns highlighted snippets) — single HTTP call.
    Prefers results from trusted health/news domains over blogs.
    Returns [] on any failure so the chat endpoint never blocks on this."""
    ck = f"crawl:{query}"
    cached = cget(ck)
    if cached is not None:
        return cached
    crawled = []
    try:
        import requests as req
        # Pull more results than needed so we can filter for trusted sources
        r = req.get(
            "https://arquivo.pt/textsearch",
            params={"q": f"{query} saúde SNS", "maxItems": max_results * 4, "prettyPrint": "false"},
            timeout=15,
            headers={"User-Agent": "SNS-Memoria-Digital/1.0 (Premio Arquivo.pt 2026)"},
        )
        if r.status_code != 200:
            cset(ck, [])
            return []
        all_items = r.json().get("response_items", [])
        # Two-pass selection: trusted sources first, then anything else, deduplicated by domain
        trusted, other = [], []
        seen_domains = set()
        for item in all_items:
            link = item.get("linkToArchive") or item.get("linkToNoFrame") or ""
            domain_match = re.search(r"wayback/\d+/(?:https?://)?(?:www\.)?([^/]+)", link)
            domain = domain_match.group(1) if domain_match else ""
            if domain in seen_domains:
                continue
            seen_domains.add(domain)
            (trusted if _TRUSTED_DOMAINS.search(link) else other).append(item)
        items = (trusted + other)[:max_results]
        for item in items:
            title = (item.get("title") or "").strip()
            link = item.get("linkToArchive") or item.get("linkToNoFrame") or ""
            ts = item.get("tstamp", "")
            raw_snippet = (item.get("snippet") or "").strip()
            snippet = re.sub(r"<[^>]+>", "", raw_snippet)
            snippet = re.sub(r"&[a-z]+;", " ", snippet)
            snippet = re.sub(r"\s+", " ", snippet).strip()[:max_text_chars]
            if title:
                crawled.append({
                    "title": title,
                    "url": link,
                    "year": ts[:4] if ts else "",
                    "snippet": snippet,
                })
    except Exception:
        pass
    cset(ck, crawled)
    return crawled

def criar_app(output_dir="data"):
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    static_dir = os.path.join(base_dir, "static")
    react_dir = os.path.join(base_dir, "static-react")

    # Use React build if available, otherwise fall back to old static
    if os.path.exists(os.path.join(react_dir, "index.html")):
        serve_dir = react_dir
    else:
        serve_dir = static_dir

    print(f"[boot] base_dir={base_dir}", flush=True)
    print(f"[boot] serve_dir={serve_dir}", flush=True)
    print(f"[boot] index.html exists: {os.path.exists(os.path.join(serve_dir, 'index.html'))}", flush=True)

    app = Flask(__name__, static_folder=os.path.join(serve_dir, "assets"), static_url_path="/assets")
    DB = _load("promessas.json")
    ARQUIVO = _load("sns_arquivo.json")

    @app.route("/data/<path:filename>")
    def serve_data(filename):
        return send_from_directory(os.path.abspath(output_dir), filename)

    @app.route("/api/promessas")
    def api_promessas():
        gov = request.args.get("governo")
        tema = request.args.get("tema")
        ps = DB.get("promessas", [])
        if gov: ps = [p for p in ps if p["governo"] == gov]
        if tema: ps = [p for p in ps if p["tema"] == tema]
        return jsonify({
            "promessas": ps,
            "total": len(ps),
            "governos": DB.get("governos", []),
            "dados_chave": DB.get("dados_chave", {}),
            "factos_chave": DB.get("factos_chave", []),
            "arquivo": DB.get("arquivo", {}),
            "meta": DB.get("meta", {}),
            "maternidades": DB.get("maternidades", {}),
            "promessas_repetidas": DB.get("promessas_repetidas", []),
            "timeline_eventos": DB.get("timeline_eventos", []),
            "antes_depois": DB.get("antes_depois", []),
            "arquivo_pt": {
                "noticias_saude": ARQUIVO.get("noticias_saude", []),
                "sites_governo_saude": ARQUIVO.get("sites_governo_saude", []),
                "programas_encontrados": ARQUIVO.get("promessas_encontradas", []),
                "conteudos_governo": ARQUIVO.get("conteudos_governo", []),
                "total_items_arquivo": len(ARQUIVO.get("noticias_saude", [])) + len(ARQUIVO.get("sites_governo_saude", [])) + len(ARQUIVO.get("promessas_encontradas", [])),
            },
        })

    @app.route("/api/pesquisa-arquivo")
    def api_pesquisa():
        import requests as req
        q = request.args.get("q", "").strip()
        if not q:
            return jsonify({"erro": "Parâmetro 'q' é obrigatório."}), 400
        if len(q) > 120:
            return jsonify({"erro": "Pesquisa demasiado longa."}), 400
        ck = f"sns:{q}"
        cached = cget(ck)
        if cached:
            return jsonify(cached)
        results = []
        try:
            r = req.get(
                "https://arquivo.pt/textsearch",
                params={"q": f"{q} saúde SNS", "maxItems": 15, "prettyPrint": "false"},
                timeout=10,
                headers={"User-Agent": "Vigia.pt/1.0 (Premio Arquivo.pt 2026)"},
            )
            if r.status_code == 200:
                for item in r.json().get("response_items", []):
                    titulo = item.get("title", "").strip()
                    if titulo and len(titulo) > 10:
                        ts = item.get("tstamp", "")
                        results.append({
                            "titulo": titulo,
                            "ano": int(ts[:4]) if len(ts) >= 4 else None,
                            "url": item.get("linkToArchive", item.get("originalURL", "")),
                        })
        except Exception as exc:
            app.logger.warning("Arquivo.pt search failed: %s", exc)
        # Fallback: search local news data if API returned nothing
        if not results:
            noticias = ARQUIVO.get("noticias_saude", [])
            q_lower = q.lower()
            for n in noticias:
                titulo = n.get("titulo", "")
                if any(w in titulo.lower() for w in q_lower.split()):
                    results.append({"titulo": titulo, "ano": n.get("ano"), "url": n.get("link", n.get("url", ""))})
                if len(results) >= 10:
                    break
        resp = {"query": q, "resultados": results[:15]}
        if results:
            cset(ck, resp)
        return jsonify(resp)

    @app.route("/api/screenshot")
    def api_screenshot():
        """Proxy for Arquivo.pt Screenshot API to avoid CORS issues."""
        import requests as req
        url = request.args.get("url", "")
        timestamp = request.args.get("timestamp", "")
        if not url or not timestamp:
            return jsonify({"erro": "url and timestamp required"}), 400

        ck = f"screenshot:{url}:{timestamp}"
        cached = cget(ck)
        if cached:
            return Response(cached, mimetype="image/png")

        try:
            arquivo_url = f"https://arquivo.pt/screenshot?url={quote(url)}&timestamp={timestamp}"
            resp = req.get(arquivo_url, timeout=15, headers={"User-Agent": "Vigia.pt/1.0 (Premio Arquivo.pt 2026)"})
            if resp.status_code == 200 and resp.content:
                cset(ck, resp.content)
                return Response(resp.content, mimetype=resp.headers.get("Content-Type", "image/png"))
            else:
                return jsonify({"erro": "Screenshot not available"}), resp.status_code
        except Exception as e:
            return jsonify({"erro": str(e)}), 502

    @app.route("/api/textextracted")
    def api_textextracted():
        """Proxy for Arquivo.pt Text Extraction API (avoids CORS)."""
        import requests as req
        wayback_url = request.args.get("url", "")
        if not wayback_url:
            return jsonify({"erro": "url parameter required"}), 400

        ck = f"textextracted:{wayback_url}"
        cached = cget(ck)
        if cached:
            return jsonify(cached)

        try:
            api_url = f"https://arquivo.pt/textextracted?m={quote(wayback_url, safe='/:?=&')}"
            resp = req.get(api_url, timeout=12, headers={"User-Agent": "Vigia.pt/1.0 (Premio Arquivo.pt 2026)"})
            if resp.status_code == 200:
                try:
                    payload = resp.json()
                except Exception:
                    payload = {"texto": resp.text[:2000]}
                result = {
                    "texto": (payload.get("extracted_text") or payload.get("texto") or resp.text)[:2000],
                    "url": wayback_url,
                }
                cset(ck, result)
                return jsonify(result)
            return jsonify({"erro": "Text extraction unavailable", "status": resp.status_code}), resp.status_code
        except Exception as e:
            return jsonify({"erro": str(e)[:200]}), 502

    @app.route("/api/chat", methods=["POST"])
    def api_chat():
        """AI-powered assistant using Groq (Llama) with broad knowledge + SNS data context."""
        data = request.get_json(silent=True) or {}
        question = (data.get("question") or "").strip()
        chat_history = data.get("history") or []
        if not question:
            return jsonify({"erro": "Pergunta vazia."}), 400
        if len(question) > 500:
            return jsonify({"erro": "Pergunta demasiado longa (máx. 500 caracteres)."}), 400

        # ── RAG: Retrieve relevant documents based on the question ──
        import unicodedata
        def _norm(s): return unicodedata.normalize('NFD', (s or '').lower()).encode('ascii', 'ignore').decode()
        q_norm = _norm(question)
        q_words = [w for w in q_norm.split() if len(w) > 3]

        all_promessas = DB.get("promessas", [])
        governos = DB.get("governos", [])
        all_noticias = ARQUIVO.get("noticias_saude", [])
        dados_chave = DB.get("dados_chave", {})

        # Retrieve: find promessas relevant to the question
        def _score(text):
            tn = _norm(text)
            return sum(1 for w in q_words if w in tn)

        relevant_promessas = sorted(all_promessas, key=lambda p: _score(p.get("texto","") + " " + p.get("verificacao","")), reverse=True)[:5]
        relevant_promessas = [p for p in relevant_promessas if _score(p.get("texto","") + " " + p.get("verificacao","")) > 0]

        # Retrieve: find noticias relevant to the question
        relevant_noticias = sorted(all_noticias, key=lambda n: _score(n.get("titulo","") + " " + n.get("tema","")), reverse=True)[:3]
        relevant_noticias = [n for n in relevant_noticias if _score(n.get("titulo","") + " " + n.get("tema","")) > 0]

        # Load district health data
        distritos = _load("distritos_saude.json")
        total_hospitais = sum(d.get("hospitais", 0) for d in distritos.values())
        total_centros = sum(d.get("centros_saude", 0) for d in distritos.values())
        total_urgencias = sum(d.get("urgencias", 0) for d in distritos.values())
        total_sem_medico = sum(d.get("sem_medico", 0) for d in distritos.values())
        total_pop = sum(d.get("populacao", 0) for d in distritos.values())

        noticias = all_noticias[:10]

        context_data = {
            "governos": [{"id": g.get("id"), "pm": g.get("pm"), "partido": g.get("partido"), "anos": f"{g.get('inicio','')}—{g.get('fim','')}"} for g in governos],
            "compromissos_por_governo": {},
            "factos_chave": {
                "populacao": total_pop,
                "hospitais": total_hospitais,
                "centros_saude": total_centros,
                "urgencias": total_urgencias,
                "utentes_sem_medico": total_sem_medico,
                "pct_sem_medico": round(total_sem_medico / total_pop * 100, 1) if total_pop else 0,
                "maternidades_encerradas": len(DB.get("maternidades", {}).get("fechadas", [])),
                "total_compromissos": len(all_promessas),
                "concretizados": len([p for p in all_promessas if p.get("cumprido") == "sim"]),
                "parciais": len([p for p in all_promessas if p.get("cumprido") == "parcial"]),
                "nao_cumpridos": len([p for p in all_promessas if p.get("cumprido") == "nao"]),
            },
            "dados_chave": dados_chave,
        }
        # Add per-government summary
        for g in governos:
            gid = g.get("id")
            gps = [p for p in all_promessas if p.get("governo") == gid]
            context_data["compromissos_por_governo"][gid] = {
                "pm": g.get("pm"), "total": len(gps),
                "exemplos": [p.get("texto","")[:80] for p in gps[:3]],
            }

        # ── LIVE CRAWL: query Arquivo.pt in real time for the user's question ──
        crawled = _live_crawl_arquivo(question)

        # RAG context — retrieved documents relevant to the question
        rag_context = ""
        if relevant_promessas:
            rag_context += "\n\nDOCUMENTOS RELEVANTES (compromissos do SNS):\n"
            for p in relevant_promessas:
                rag_context += f"- [{p.get('governo')} {p.get('ano')}] {p.get('texto','')} (Estado: {p.get('cumprido','')}). {p.get('verificacao','')}\n"
        if relevant_noticias:
            rag_context += "\nNOTICIAS RELEVANTES (do Arquivo.pt):\n"
            for n in relevant_noticias:
                rag_context += f"- [{n.get('ano','')}] {n.get('titulo','')} (Tema: {n.get('tema','')})\n"
        if crawled:
            rag_context += "\nCAPTURAS LIVE DO ARQUIVO.PT (extraidas agora via TextSearch + TextExtracted):\n"
            for c in crawled:
                snippet = (c.get("snippet") or "").strip()
                if snippet:
                    rag_context += f"- [{c.get('year','')}] {c.get('title','')}\n  Excerto: {snippet[:400]}\n"

        system_prompt = (
            "Es o assistente do SNS Memoria Digital, uma plataforma que usa RAG (Retrieval-Augmented Generation) "
            "sobre 20 anos de evolucao do SNS portugues.\n\n"
            "COMO FUNCIONA: O sistema fez pesquisa em duas fontes para esta pergunta:\n"
            "1) Base local de 51 compromissos de saude e estatisticas dos distritos.\n"
            "2) Crawl em tempo real ao Arquivo.pt via TextSearch + TextExtracted, com excertos de paginas arquivadas.\n"
            "Usa toda essa evidencia (abaixo) para fundamentar a resposta.\n\n"
            "REGRAS:\n"
            "- Portugues europeu, 3-5 frases, texto corrido.\n"
            "- Cita dados concretos dos documentos recuperados, mencionando ano e fonte quando possivel.\n"
            "- Se houver excerto do Arquivo.pt, prioriza-o como evidencia primaria.\n"
            "- Tom informado e conversacional. Nunca critico de governos.\n"
            "- Sem bullets, sem listas, sem markdown.\n"
            "- Se nao tiveres informacao suficiente, diz honestamente."
        )

        context_str = json.dumps(context_data, ensure_ascii=False) + rag_context

        # Suggest relevant page based on keywords
        q_lower = question.lower()
        suggestion = None
        if any(w in q_lower for w in ["distrito", "regiao", "lisboa", "porto", "mapa"]):
            suggestion = {"link": "/mapa", "label": "Abrir mapa interativo"}
        elif any(w in q_lower for w in ["governo", "partido", "comparar"]):
            suggestion = {"link": "/comparador", "label": "Comparar governos"}
        elif any(w in q_lower for w in ["vocabulario", "termo", "palavra", "evolu"]):
            suggestion = {"link": "/glossario", "label": "Ver glossario"}
        elif any(w in q_lower for w in ["quiz", "jogo", "teste"]):
            suggestion = {"link": "/quiz", "label": "Jogar quiz"}
        elif any(w in q_lower for w in ["sobre", "projecto", "projeto", "metodologia", "fonte"]):
            suggestion = {"link": "/sobre", "label": "Sobre o projecto"}
        else:
            suggestion = {"link": "/promessas", "label": "Ver compromissos"}

        # Groq API (Llama 3.3 70B com fallback ao 3.1 8B)
        groq_key = os.environ.get("GROQ_API_KEY")
        if groq_key:
            import requests as req
            import time as _time
            groq_messages = [{"role": "system", "content": f"{system_prompt}\n\nDados da plataforma:\n{context_str}"}]
            for msg in chat_history[-6:]:
                role = msg.get("role", "")
                content = msg.get("content", "")
                if role in ("user", "assistant") and content:
                    groq_messages.append({"role": role, "content": content})
                groq_messages.append({"role": "user", "content": question})
            # Try Llama 3.3 70B (richer) first, fall back to 3.1 8B (faster, always-on)
            for model_id, label in [("llama-3.3-70b-versatile", "Llama 3.3 70B (open source)"),
                                     ("llama-3.1-8b-instant", "Llama 3.1 (open source)")]:
                try:
                    groq_resp = None
                    for attempt in range(2):
                        groq_resp = req.post(
                            "https://api.groq.com/openai/v1/chat/completions",
                            json={"model": model_id, "messages": groq_messages, "max_tokens": 500, "temperature": 0.3},
                            headers={"Authorization": f"Bearer {groq_key}", "Content-Type": "application/json"},
                            timeout=15,
                        )
                        if groq_resp.status_code != 429:
                            break
                        _time.sleep(2)
                    if groq_resp and groq_resp.status_code == 200:
                        groq_data = groq_resp.json()
                        text = groq_data.get("choices", [{}])[0].get("message", {}).get("content", "")
                        if text.strip():
                            return jsonify({
                                "mode": "ai",
                                "answer": text.strip()[:1500],
                                "suggestion": suggestion,
                                "model": label,
                                "crawled": [{"title": c["title"], "url": c["url"], "year": c["year"]} for c in crawled],
                            })
                    if groq_resp is not None:
                        app.logger.warning("Groq %s returned %s", model_id, groq_resp.status_code)
                except Exception as e:
                    app.logger.warning("Groq %s failed: %s", model_id, e)

        # Final fallback: local search only — but still surface the live crawl results
        return jsonify({
            "mode": "no_key",
            "message": "IA indisponível neste momento. A usar pesquisa local.",
            "crawled": [{"title": c["title"], "url": c["url"], "year": c["year"]} for c in crawled],
        }), 200

    @app.route("/healthz")
    def healthz():
        index_path = os.path.join(serve_dir, "index.html")
        return jsonify({
            "status": "ok",
            "service": "SNS Memória Digital",
            "serve_dir": serve_dir,
            "index_exists": os.path.exists(index_path),
            "files": sorted(os.listdir(serve_dir))[:20] if os.path.isdir(serve_dir) else [],
        })

    # SPA catch-all: serve React app for all non-API, non-data paths
    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def catch_all(path):
        # Serve static assets (JS, CSS, images) if file exists
        if path and '.' in path.split('/')[-1]:
            try:
                return send_from_directory(serve_dir, path)
            except Exception:
                pass
        return send_from_directory(serve_dir, 'index.html')

    return app

def servir(port=8080, output_dir="data"):
    print(f"\n  SNS Memória Digital")
    print(f"  http://localhost:{port}")
    print(f"  Ctrl+C para parar\n")
    app = criar_app(output_dir)
    app.run(host="0.0.0.0", port=port)

# Production WSGI entry point (used by gunicorn)
app = criar_app()
