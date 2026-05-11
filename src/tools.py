"""
tools.py - Ligação às APIs do Arquivo.pt
"""

import requests
from typing import Optional, List, Dict
from dataclasses import dataclass
import time


@dataclass
class Snapshot:
    """Representa uma página arquivada."""
    url_original: str
    url_arquivo: str
    titulo: str
    timestamp: str
    ano: int
    digest: str = ""
    conteudo: str = ""


class ArquivoPtAPI:
    """
    Cliente para as APIs do Arquivo.pt.

    APIs disponíveis:
    - TextSearch: pesquisa por texto
    - ImageSearch: pesquisa por imagens
    - CDX: metadados de versões arquivadas
    - Wayback: acesso ao conteúdo
    """

    BASE_URL = "https://arquivo.pt"
    TEXTSEARCH_URL = f"{BASE_URL}/textsearch"
    IMAGESEARCH_URL = f"{BASE_URL}/imagesearch"
    CDX_URL = f"{BASE_URL}/wayback/cdx"
    
    def __init__(self, timeout: int = 30):
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "Vigia.pt/1.0 (Premio Arquivo.pt 2026)"
        })
        # Retry logic for API rate limiting
        from requests.adapters import HTTPAdapter
        from urllib3.util.retry import Retry
        retry = Retry(total=3, backoff_factor=2, status_forcelist=[429, 500, 502, 503, 504])
        self.session.mount("https://", HTTPAdapter(max_retries=retry))
        self.session.mount("http://", HTTPAdapter(max_retries=retry))
    
    def pesquisar(self,
                  query: str,
                  max_items: int = 50,
                  from_year: Optional[int] = None,
                  to_year: Optional[int] = None) -> List[Snapshot]:
        """
        Pesquisa no Arquivo.pt via TextSearch API.

        Args:
            query: Termos de pesquisa. Suporta "site:dominio.pt" que é
                   convertido automaticamente para o parâmetro siteSearch.
            max_items: Máximo de resultados
            from_year: Ano inicial
            to_year: Ano final

        Returns:
            Lista de Snapshots encontrados
        """
        params = {
            "maxItems": max_items,
            "prettyPrint": "false"
        }

        # Tratar sintaxe "site:dominio.pt [query]" -> parâmetro siteSearch
        import re
        site_match = re.match(r'^site:(\S+)\s*(.*)?$', query.strip())
        if site_match:
            dominio = site_match.group(1)
            extra_query = (site_match.group(2) or "").strip()
            params["siteSearch"] = dominio
            params["q"] = extra_query if extra_query else dominio.replace(".", " ")
        else:
            params["q"] = query

        if from_year:
            params["from"] = f"{from_year}0101000000"
        if to_year:
            params["to"] = f"{to_year}1231235959"
        
        try:
            response = self.session.get(
                self.TEXTSEARCH_URL,
                params=params,
                timeout=self.timeout
            )
            response.raise_for_status()
            data = response.json()
            
            snapshots = []
            for item in data.get("response_items", []):
                ts = item.get("tstamp", "")
                ano = int(ts[:4]) if ts and len(ts) >= 4 else 0
                
                snapshots.append(Snapshot(
                    url_original=item.get("originalURL", ""),
                    url_arquivo=item.get("linkToArchive", ""),
                    titulo=item.get("title", ""),
                    timestamp=ts,
                    ano=ano,
                    digest=item.get("digest", "")
                ))
            
            return snapshots
            
        except Exception as e:
            print(f"  [ERRO] Pesquisa falhou: {e}")
            return []
    
    def pesquisar_imagens(self,
                          query: str,
                          max_items: int = 20,
                          from_date: Optional[str] = None,
                          to_date: Optional[str] = None) -> List[Dict]:
        """
        Pesquisa imagens no Arquivo.pt via ImageSearch API.

        Args:
            query: Termos de pesquisa
            max_items: Máximo de resultados
            from_date: Data inicial formato YYYYMMDDHHMMSS
            to_date: Data final formato YYYYMMDDHHMMSS

        Returns:
            Lista de dicts com imgLinkToArchive, imgSrc, pageURL, tstamp, title, etc.
        """
        params = {
            "q": query,
            "maxItems": max_items,
            "prettyPrint": "false"
        }
        if from_date:
            params["from"] = from_date
        if to_date:
            params["to"] = to_date

        try:
            response = self.session.get(
                self.IMAGESEARCH_URL,
                params=params,
                timeout=self.timeout
            )
            response.raise_for_status()
            data = response.json()
            return data.get("responseItems", []) or data.get("response_items", []) or []
        except Exception as e:
            print(f"  [ERRO] ImageSearch falhou: {e}")
            return []

    @staticmethod
    def data_para_timestamp(ano: int, mes: int = 1, dia: int = 1) -> str:
        """Converte ano/mes/dia para formato timestamp do Arquivo.pt (YYYYMMDDHHMMSS)."""
        return f"{ano:04d}{mes:02d}{dia:02d}000000"

    @staticmethod
    def data_range_para_ano(ano: int):
        """Retorna (from_date, to_date) para cobrir um ano inteiro."""
        return (f"{ano}0101000000", f"{ano}1231235959")

    def obter_versoes(self, url: str, limit: int = 100) -> List[Dict]:
        """
        Obtém todas as versões arquivadas de um URL via CDX API.
        
        Args:
            url: URL a pesquisar
            limit: Máximo de versões
            
        Returns:
            Lista de registos CDX
        """
        params = {
            "url": url,
            "output": "json",
            "limit": limit
        }
        
        try:
            response = self.session.get(
                self.CDX_URL,
                params=params,
                timeout=self.timeout
            )
            response.raise_for_status()
            # CDX API returns JSON lines (one JSON object per line)
            import json as _json
            results = []
            for line in response.text.strip().split('\n'):
                line = line.strip()
                if line:
                    try:
                        results.append(_json.loads(line))
                    except:
                        pass
            return results
        except Exception as e:
            print(f"  [ERRO] CDX falhou para {url}: {e}")
            return []
    
    def obter_conteudo(self, url_arquivo: str) -> str:
        """
        Obtém o conteúdo HTML de uma página arquivada.
        
        Args:
            url_arquivo: URL completo no Arquivo.pt
            
        Returns:
            Conteúdo HTML
        """
        try:
            response = self.session.get(url_arquivo, timeout=self.timeout)
            response.raise_for_status()
            return response.text
        except Exception as e:
            print(f"  [ERRO] Falha ao obter conteúdo: {e}")
            return ""
    
    def verificar_url_atual(self, url: str) -> Dict:
        """
        Verifica o estado atual de um URL (se ainda está online).
        
        Args:
            url: URL a verificar
            
        Returns:
            Dicionário com estado, código HTTP, etc.
        """
        if not url.startswith("http"):
            url = f"https://{url}"
        
        resultado = {
            "url": url,
            "status_code": None,
            "ativo": False,
            "redirecionado": False,
            "url_final": None,
            "erro": None
        }
        
        try:
            response = self.session.head(
                url,
                timeout=10,
                allow_redirects=True
            )
            resultado["status_code"] = response.status_code
            resultado["url_final"] = response.url
            resultado["ativo"] = response.status_code < 400
            resultado["redirecionado"] = response.url != url
            
        except requests.exceptions.SSLError:
            # Tentar HTTP
            try:
                url_http = url.replace("https://", "http://")
                response = self.session.head(url_http, timeout=10, allow_redirects=True)
                resultado["status_code"] = response.status_code
                resultado["ativo"] = response.status_code < 400
                resultado["erro"] = "SSL falhou, HTTP ok"
            except:
                resultado["erro"] = "SSL e HTTP falharam"
                
        except requests.exceptions.ConnectionError:
            resultado["erro"] = "Conexão recusada"
            
        except requests.exceptions.Timeout:
            resultado["erro"] = "Timeout"
            
        except Exception as e:
            resultado["erro"] = str(e)[:100]
        
        return resultado


# Teste rápido
if __name__ == "__main__":
    api = ArquivoPtAPI()
    
    print("=== Teste ArquivoPtAPI ===\n")
    
    results = api.pesquisar("site:gov.pt", max_items=3, from_year=2010, to_year=2012)
    
    for r in results:
        print(f"- {r.titulo[:50]}...")
        print(f"  URL: {r.url_arquivo}")
        print(f"  Ano: {r.ano}")
        print()
