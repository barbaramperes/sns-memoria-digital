"""
agents.py - Sistema Multi-Agente para Análise do Arquivo.pt

Agentes:
- Planeador: define estratégia de análise
- Coletor: recolhe dados do Arquivo.pt
- Analista: extrai métricas e padrões
- Verificador: valida conclusões
- Relator: gera relatórios auditáveis
"""

from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field
from datetime import datetime
import re
from urllib.parse import urlparse


@dataclass
class Plano:
    """Plano de execução gerado pelo Planeador."""
    query: str
    anos: List[int]
    max_por_ano: int
    metricas: List[str] = field(default_factory=list)
    descricao: str = ""


@dataclass 
class Analise:
    """Resultado de análise de um snapshot."""
    url_original: str
    url_arquivo: str
    titulo: str
    ano: int
    dominio: str
    estado_atual: str = "desconhecido"
    metricas: Dict[str, Any] = field(default_factory=dict)
    sumario_llm: str = ""


class Planeador:
    """
    Agente Planeador: define a estratégia de análise.
    
    Responsabilidades:
    - Definir períodos temporais
    - Selecionar queries
    - Estabelecer métricas a extrair
    """
    
    def criar_plano(self, 
                    query: str,
                    anos: List[int],
                    max_por_ano: int) -> Plano:
        """
        Cria um plano de execução.
        """
        metricas = [
            "google_analytics",
            "google_tag_manager", 
            "facebook_pixel",
            "cookie_consent",
            "https_ratio",
            "scripts_externos"
        ]
        
        plano = Plano(
            query=query,
            anos=sorted(anos),
            max_por_ano=max_por_ano,
            metricas=metricas,
            descricao=f"Análise de '{query}' entre {min(anos)} e {max(anos)}"
        )
        
        print(f"   ✓ Plano criado: {len(anos)} períodos, max {max_por_ano}/período")
        return plano


class Coletor:
    """
    Agente Coletor: recolhe dados do Arquivo.pt.
    
    Responsabilidades:
    - Executar pesquisas via API
    - Filtrar resultados duplicados
    - Registar metadados
    """
    
    def __init__(self, api):
        self.api = api
        self.urls_vistos = set()
    
    def recolher(self, plano: Plano) -> List[Dict]:
        """
        Recolhe snapshots segundo o plano.
        Deduplicação por domínio+path para permitir múltiplas páginas do mesmo site.
        """
        resultados = []
        self.urls_vistos.clear()

        for ano in plano.anos:
            print(f"   📥 Recolhendo {ano}...")

            snapshots = self.api.pesquisar(
                query=plano.query,
                max_items=plano.max_por_ano,
                from_year=ano,
                to_year=ano
            )

            for s in snapshots:
                # Extrair domínio
                try:
                    parsed = urlparse(s.url_original)
                    dominio = parsed.netloc
                    # Chave de dedup: domínio + path simplificado
                    path_base = parsed.path.rstrip("/").rsplit("/", 1)[0] if parsed.path else ""
                    chave_dedup = f"{dominio}{path_base}_{ano}"
                except Exception:
                    dominio = s.url_original
                    chave_dedup = f"{dominio}_{ano}"

                # Evitar duplicados
                if chave_dedup in self.urls_vistos:
                    continue
                self.urls_vistos.add(chave_dedup)

                resultados.append({
                    "url_original": s.url_original,
                    "url_arquivo": s.url_arquivo,
                    "titulo": s.titulo,
                    "ano": ano,
                    "timestamp": s.timestamp,
                    "dominio": dominio
                })

        print(f"   ✓ Total recolhido: {len(resultados)} snapshots únicos")
        return resultados


class Analista:
    """
    Agente Analista: extrai métricas e padrões.

    Responsabilidades:
    - Analisar conteúdo HTML
    - Extrair métricas técnicas (GA, GTM, Facebook Pixel, cookies, HTTPS)
    """

    def __init__(self, api=None):
        self.api = api

    def _extrair_metricas_html(self, html: str, url: str) -> Dict[str, Any]:
        """Extrai métricas técnicas do conteúdo HTML."""
        html_lower = html.lower()

        metricas = {
            "google_analytics": bool(re.search(r'(ua-\d{4,10}|g-[a-z0-9]+|gtag|google-analytics)', html_lower)),
            "google_tag_manager": bool(re.search(r'(gtm-[a-z0-9]+|googletagmanager)', html_lower)),
            "facebook_pixel": bool(re.search(r'(fbq\(|facebook\.net/|fb-pixel)', html_lower)),
            "cookie_consent": bool(re.search(r'(cookie.?consent|cookie.?banner|cookie.?policy|gdpr|rgpd|aceitar cookies)', html_lower)),
            "https": url.startswith("https://"),
            "meta_charset": bool(re.search(r'charset\s*=\s*["\']?utf-8', html_lower)),
            "responsive": bool(re.search(r'viewport', html_lower)),
            "tamanho_bytes": len(html.encode('utf-8', errors='ignore')),
        }

        # Contar scripts externos
        scripts = re.findall(r'<script[^>]+src\s*=\s*["\']([^"\']+)', html, re.IGNORECASE)
        metricas["scripts_externos"] = len([s for s in scripts if '://' in s])
        metricas["scripts_total"] = len(scripts)

        # Contar links externos
        links = re.findall(r'href\s*=\s*["\']https?://([^"\'\/]+)', html, re.IGNORECASE)
        dominios_externos = set(links)
        metricas["links_externos"] = len(dominios_externos)

        return metricas

    def analisar(self, snapshots: List[Dict], max_analise: int = 50) -> List[Analise]:
        """
        Analisa snapshots e extrai métricas.
        Faz fetch do HTML arquivado para extrair métricas técnicas.
        """
        import time
        analises = []
        total = min(len(snapshots), max_analise)

        for i, snap in enumerate(snapshots[:max_analise]):
            print(f"   🔬 [{i+1}/{total}] {snap['dominio'][:30]}...")

            analise = Analise(
                url_original=snap["url_original"],
                url_arquivo=snap["url_arquivo"],
                titulo=snap["titulo"],
                ano=snap["ano"],
                dominio=snap["dominio"],
                metricas={"ano": snap["ano"], "tem_titulo": bool(snap["titulo"])}
            )

            # Fetch HTML e extrair métricas técnicas
            if self.api and snap.get("url_arquivo"):
                try:
                    html = self.api.obter_conteudo(snap["url_arquivo"])
                    if html:
                        metricas_html = self._extrair_metricas_html(html, snap["url_original"])
                        analise.metricas.update(metricas_html)

                        analise.metricas["categoria"] = self._classificar_basico(snap["url_original"])

                    time.sleep(0.5)  # Rate limiting
                except Exception as e:
                    print(f"      ⚠️ Erro ao analisar HTML: {str(e)[:50]}")

            analises.append(analise)

        # Sumário de métricas extraídas
        com_ga = sum(1 for a in analises if a.metricas.get("google_analytics"))
        com_cookies = sum(1 for a in analises if a.metricas.get("cookie_consent"))
        com_https = sum(1 for a in analises if a.metricas.get("https"))
        print(f"   ✓ Analisados: {len(analises)} snapshots")
        print(f"     GA: {com_ga} | Cookies: {com_cookies} | HTTPS: {com_https}")
        return analises

    def _classificar_basico(self, url: str) -> str:
        """Classificação básica por padrões de URL."""
        url_lower = url.lower()
        if ".gov.pt" in url_lower:
            return "governo"
        elif any(m in url_lower for m in ["publico", "jn.", "expresso", "rtp.", "dn.", "tsf."]):
            return "media"
        elif ".edu.pt" in url_lower or "universidade" in url_lower:
            return "educacao"
        elif "museu" in url_lower or "cultura" in url_lower:
            return "cultura"
        return "outro"


class Verificador:
    """
    Agente Verificador: valida conclusões e verifica estado atual.
    
    Responsabilidades:
    - Testar se URLs ainda estão online
    - Classificar estado (ativo, redirecionado, desaparecido)
    - Validar consistência dos dados
    """
    
    def __init__(self):
        from .tools import ArquivoPtAPI
        self.api = ArquivoPtAPI()
    
    def verificar(self, analises: List[Analise]) -> List[Analise]:
        """
        Verifica estado atual de cada URL.
        """
        import time
        
        for i, analise in enumerate(analises):
            print(f"   ✔️ [{i+1}/{len(analises)}] Verificando {analise.dominio[:30]}...")
            
            # Verificar estado atual
            estado = self.api.verificar_url_atual(analise.dominio)
            
            if estado["ativo"]:
                if estado["redirecionado"]:
                    analise.estado_atual = "REDIRECIONADO"
                else:
                    analise.estado_atual = "ATIVO"
            elif estado["erro"]:
                if "conexão" in estado["erro"].lower() or "timeout" in estado["erro"].lower():
                    analise.estado_atual = "DESAPARECIDO"
                else:
                    analise.estado_atual = "ERRO"
            else:
                analise.estado_atual = "DESAPARECIDO"
            
            analise.metricas["estado_atual"] = analise.estado_atual
            analise.metricas["verificacao"] = estado
            
            # Pausa para não sobrecarregar
            time.sleep(0.3)
        
        # Estatísticas
        estados = {}
        for a in analises:
            estados[a.estado_atual] = estados.get(a.estado_atual, 0) + 1
        
        print(f"   ✓ Verificação completa: {estados}")
        return analises


class Relator:
    """
    Agente Relator: gera relatórios auditáveis.
    
    Responsabilidades:
    - Agregar estatísticas
    - Formatar relatório legível
    - Incluir links verificáveis para Arquivo.pt
    """
    
    def gerar(self, analises: List[Analise], plano: Plano) -> Dict:
        """
        Gera relatório completo com estatísticas e texto.
        """
        # Estatísticas por estado
        por_estado = {}
        for a in analises:
            por_estado[a.estado_atual] = por_estado.get(a.estado_atual, 0) + 1
        
        # Estatísticas por ano
        por_ano = {}
        for a in analises:
            if a.ano not in por_ano:
                por_ano[a.ano] = {"total": 0, "desaparecidos": 0}
            por_ano[a.ano]["total"] += 1
            if a.estado_atual == "DESAPARECIDO":
                por_ano[a.ano]["desaparecidos"] += 1
        
        # Taxa de desaparecimento
        total = len(analises)
        desaparecidos = por_estado.get("DESAPARECIDO", 0)
        taxa = (desaparecidos / total * 100) if total > 0 else 0
        
        # Lista de desaparecidos
        lista_desaparecidos = [
            {
                "dominio": a.dominio,
                "titulo": a.titulo,
                "ano": a.ano,
                "link_arquivo": a.url_arquivo
            }
            for a in analises if a.estado_atual == "DESAPARECIDO"
        ]
        
        # Gerar texto
        texto = self._formatar_texto(plano, total, por_estado, por_ano, lista_desaparecidos, taxa)
        
        relatorio = {
            "timestamp": datetime.now().isoformat(),
            "plano": {
                "query": plano.query,
                "anos": plano.anos,
                "descricao": plano.descricao
            },
            "estatisticas": {
                "total_analisados": total,
                "por_estado": por_estado,
                "por_ano": por_ano,
                "taxa_desaparecimento": round(taxa, 1)
            },
            "desaparecidos": lista_desaparecidos,
            "resultados": [
                {
                    "dominio": a.dominio,
                    "titulo": a.titulo,
                    "ano": a.ano,
                    "estado": a.estado_atual,
                    "link_arquivo": a.url_arquivo,
                    "metricas": a.metricas,
                    "sumario_llm": a.sumario_llm
                }
                for a in analises
            ],
            "texto": texto
        }
        
        print(f"   ✓ Relatório gerado: {total} sites, {desaparecidos} desaparecidos ({taxa:.1f}%)")
        return relatorio
    
    def _formatar_texto(self, plano, total, por_estado, por_ano, desaparecidos, taxa) -> str:
        """Formata relatório em texto."""
        linhas = []
        linhas.append("=" * 70)
        linhas.append("VIGIA.PT - RELATÓRIO DE ANÁLISE")
        linhas.append("=" * 70)
        linhas.append("")
        linhas.append(f"Data: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
        linhas.append(f"Query: {plano.query}")
        linhas.append(f"Períodos: {min(plano.anos)} - {max(plano.anos)}")
        linhas.append("")
        
        linhas.append("## SUMÁRIO")
        linhas.append(f"Total analisados: {total}")
        linhas.append(f"Taxa de desaparecimento: {taxa:.1f}%")
        linhas.append("")
        
        linhas.append("## ESTADO ATUAL")
        for estado, count in sorted(por_estado.items(), key=lambda x: -x[1]):
            pct = count / total * 100
            linhas.append(f"  {estado}: {count} ({pct:.1f}%)")
        linhas.append("")
        
        if desaparecidos:
            linhas.append("## SITES DESAPARECIDOS")
            for d in desaparecidos[:15]:
                linhas.append(f"  • {d['dominio']}")
                linhas.append(f"    {d['titulo'][:60]}...")
                linhas.append(f"    Arquivo: {d['link_arquivo']}")
                linhas.append("")
        
        linhas.append("=" * 70)
        linhas.append("Fonte: Arquivo.pt (https://arquivo.pt)")
        linhas.append("=" * 70)
        
        return "\n".join(linhas)


# Criar __init__.py vazio
if __name__ == "__main__":
    print("Módulo de agentes carregado.")
