# SNS Memória Digital

Plataforma cívica que documenta 20 anos de evolução do Serviço Nacional de Saúde português (2005–2026), ligando cada facto a uma fonte verificável no **Arquivo.pt**.

Candidatura ao **Prémio Arquivo.pt 2026**.

---

## Páginas

| Página | O que faz |
|---|---|
| **Compromissos** | 51 compromissos de saúde de 7 Governos Constitucionais (XVII–XXIV), classificados por concretização (sim / parcial / em evolução). Cada item tem botão *Verificar no Arquivo.pt* que abre uma pesquisa contextual (tema + janela do governo respectivo). |
| **Mapa** | Saúde por distrito — população, % de utentes sem médico de família, hospitais e urgências. Permite alternar entre métricas e seleccionar distritos para detalhe. |
| **Comparador** | Análise lado a lado de dois governos: contexto, ministros, compromissos cumpridos vs em evolução. |
| **Quiz** | *Que Governo disse isto?* — 10 perguntas com excertos reais de programas de governo. |
| **Glossário** | Linha do tempo dos termos-chave (USF, ACES, ULS, SNS 24, …) entre 2005 e 2024. Cada ponto abre a pesquisa correspondente no Arquivo.pt. |
| **Antes / Depois** | Navegação visual de 4 sites institucionais (sns.gov.pt, acss.min-saude.pt, arslvt.min-saude.pt, min-saude.pt) em capturas de diferentes datas, embebidas a partir do Arquivo.pt. |
| **Agente IA** | Resposta em linguagem natural sobre o SNS via RAG (compromissos + crawl ao vivo no Arquivo.pt). Usa Groq Llama 3.3 70B (fallback Llama 3.1 8B); sem chave faz pesquisa local nos dados. |

---

## Uso do Arquivo.pt

| API | Onde é usada |
|---|---|
| **TextSearch** | `/api/pesquisa-arquivo` consultado pelo Agente IA durante o crawl ao vivo. URLs `arquivo.pt/page/search?...` em todos os botões *Verificar no Arquivo.pt*. |
| **Wayback** | Capturas embebidas na página *Antes / Depois* e referenciadas em *Compromissos*. Todas verificadas (HTTP 200). |
| **CDX** | Linha temporal dos sites institucionais (calendário do Arquivo.pt) acessível a partir de *Antes / Depois*. |
| **Screenshot** | Proxy backend com cache (`/api/screenshot`) — usado para preview visual quando disponível. |

---

## Verificação dos dados

Para uma plataforma de documentação cívica é essencial saber o que é leitura directa de fontes oficiais e o que é derivado:

| Dado | Estado | Fonte |
|---|---|---|
| Decretos-Lei citados (DL 101/2006 RNCCI, DL 102/2023 ULS, DL 131/2020 taxas, Lei 95/2019 LBS, …) | ✅ Verificado | Diário da República |
| Composição dos Governos Constitucionais XVII–XXIV (PMs, Ministros da Saúde, datas) | ✅ Verificado | historico.portugal.gov.pt |
| 35 URLs Wayback do Arquivo.pt em `data/sns_arquivo.json` | ✅ Verificado (HTTP 200) | Arquivo.pt |
| 8 capturas embebidas em *Antes / Depois* | ✅ Verificado (HTTP 200) | Arquivo.pt |
| Taxas regionais de utentes sem médico de família (Norte 2.6%, Centro 12.6%, LVT 27.7%, Alentejo 17.3%, Algarve 20%; média nacional 14.5%, ~1,5M utentes em Dez/2024) | ✅ Verificado | ACSS — Portal da Transparência do SNS |
| População por distrito (mapa) | ✅ Verificado | INE — Estimativas Anuais 2023 |
| Utentes sem médico **por distrito** (mapa) | ⚠️ Derivado | Taxa regional ARS × população do distrito (a ACSS reporta por região, não por distrito) |
| Hospitais e urgências por distrito | ⚠️ Aproximação | Compilado a partir da listagem de Entidades de Saúde do SNS |
| Tendência do Glossário | ⚠️ Esquemático | Calibrada por marcos legislativos; eixo Y oculto no UI; cada ponto liga ao Arquivo.pt para o utilizador ver a contagem real |

A página **Sobre** dentro do site repete esta tabela para o utilizador final.

---

## Stack

- **Frontend** — React 19, Vite 8, Tailwind CSS 4, Recharts, D3-geo, React Router 7
- **Backend** — Flask 3, Gunicorn (Python 3.13)
- **IA (opcional)** — Groq Llama 3.3 70B (com fallback Llama 3.1 8B), modelos open source

---

## Como correr localmente

```bash
# 1. Backend (Python)
pip install -r requirements.txt

# 2. Frontend (build commitado em static-react/, mas podes regenerar)
cd frontend && npm ci && npm run build && cd ..

# 3. Servir (porta 4000)
python3 -c "from src.web import servir; servir(4000)"
```

Para activar o Agente IA, exporta a chave Groq antes de servir:

```bash
export GROQ_API_KEY="..."
```

Sem chave, o Agente continua a responder a partir dos dados locais e do crawl ao vivo no Arquivo.pt — apenas perde a geração em linguagem natural.

---

## Deploy

`render.yaml` incluído para [Render](https://render.com). O build do frontend está commitado em `static-react/` para o deploy não depender de `npm` em produção.

---

## Estrutura

```
src/
  web.py        Servidor Flask + rotas /api/* + healthz
  agents.py     Agente IA (RAG sobre compromissos + crawl Arquivo.pt)
  tools.py      Cliente das APIs do Arquivo.pt
data/
  promessas.json          51 compromissos × 7 governos
  distritos_saude.json    20 entradas (18 distritos + Madeira + Açores)
  vocabulario.json        7 termos × 5 períodos (tendência esquemática)
  sns_arquivo.json        35 URLs Wayback verificadas
  portugal_distritos.geojson
frontend/src/
  pages/        7 páginas + Home + NotFound
  components/   Logo, Nav, Footer, ErrorMessage, LoadingSkeleton, RootLayout
  hooks/        useData (fetch + cache)
static-react/   Build do frontend (commitado para deploy)
```

---

## Licença

MIT

## Autora

**Bárbara Peres** — Prémio Arquivo.pt 2026
