import { useState, useEffect } from 'react'

const cache = {}
const inflight = {}
const DEFAULT_TIMEOUT_MS = 45000
const IS_DEV = import.meta.env?.DEV

/**
 * Fetch JSON from an endpoint with caching, timeout and abort on unmount.
 * Requests to the same endpoint are deduplicated while in flight.
 */
export function useData(endpoint = '/api/promessas', { timeout = DEFAULT_TIMEOUT_MS } = {}) {
  const [data, setData] = useState(cache[endpoint] || null)
  const [loading, setLoading] = useState(!cache[endpoint])
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!endpoint) return
    if (cache[endpoint]) {
      // Already cached — state was initialized from cache in useState above,
      // so we only need to fetch when there's genuinely no cached data.
      return
    }

    let cancelled = false
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeout)

    const run = inflight[endpoint] || (inflight[endpoint] = fetch(endpoint, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    }).then(async r => {
      if (!r.ok) {
        throw new Error(`Erro ${r.status}: ${r.statusText || 'pedido recusado'}`)
      }
      const ct = r.headers.get('content-type') || ''
      if (!ct.includes('json')) {
        throw new Error('Resposta inesperada do servidor.')
      }
      return r.json()
    }).finally(() => {
      delete inflight[endpoint]
    }))

    run
      .then(d => {
        if (cancelled) return
        cache[endpoint] = d
        setData(d)
        setLoading(false)
      })
      .catch(err => {
        if (cancelled) return
        if (err.name === 'AbortError') {
          setError(IS_DEV
            ? 'Sem resposta do servidor. Inicie o backend primeiro.'
            : 'O servidor está a iniciar (pode demorar até 1 minuto na primeira visita). Tente recarregar dentro de momentos.')
        } else {
          setError(err.message || 'Não foi possível carregar os dados.')
        }
        setLoading(false)
      })
      .finally(() => clearTimeout(timer))

    return () => {
      cancelled = true
      clearTimeout(timer)
      controller.abort()
    }
  }, [endpoint, timeout])

  return { data, loading, error }
}

/** Manually clear the module-level cache (e.g. after a retry). */
export function clearDataCache(endpoint) {
  if (endpoint) delete cache[endpoint]
  else Object.keys(cache).forEach(k => delete cache[k])
}
