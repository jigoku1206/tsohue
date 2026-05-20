import type { CurrencyCode, ExchangeRates } from '@/lib/currencies'
import { CURRENCIES } from '@/lib/currencies'

// In-memory cache: keyed by fetch date string, expires after 6 hours.
// Shared across all calls in the same JS runtime (browser tab or server module).
const TTL = 6 * 60 * 60 * 1000
const rateCache = new Map<string, { rates: ExchangeRates; ts: number }>()

/**
 * Fetch exchange rates (TWD per 1 unit of foreign currency) for a given date.
 * Results are cached in memory for 6 hours to avoid hammering the external CDN
 * on every dialog open. Returns {} on failure — callers should prompt manual entry.
 */
export async function fetchExchangeRates(date?: string): Promise<ExchangeRates> {
  const today = new Date().toISOString().split('T')[0]
  const isFuture = date ? date > today : false
  const fetchDate = isFuture || !date ? today : date
  const isToday = fetchDate === today

  const cached = rateCache.get(fetchDate)
  if (cached && Date.now() - cached.ts < TTL) return cached.rates

  const url = isToday
    ? 'https://latest.currency-api.pages.dev/v1/currencies/twd.json'
    : `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${fetchDate}/v1/currencies/twd.json`

  try {
    const res = await fetch(url)
    if (!res.ok) return {}
    const data = await res.json()
    const r = data.twd as Record<string, number>

    const rates: ExchangeRates = {}
    for (const c of CURRENCIES) {
      if (c.code === 'TWD') continue
      const raw = r[c.code.toLowerCase()]
      if (raw) {
        rates[c.code as CurrencyCode] = Math.round((1 / raw) * 10000) / 10000
      }
    }
    rateCache.set(fetchDate, { rates, ts: Date.now() })
    return rates
  } catch {
    return {}
  }
}
