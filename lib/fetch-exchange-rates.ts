import type { CurrencyCode, ExchangeRates } from '@/lib/currencies'
import { CURRENCIES } from '@/lib/currencies'

/**
 * Fetch exchange rates (TWD per 1 unit of foreign currency) for a given date.
 * Browser-safe version — no 'use server', no Next.js fetch cache options.
 * Used directly by both the production server action and the demo context.
 */
export async function fetchExchangeRates(date?: string): Promise<ExchangeRates> {
  const today = new Date().toISOString().split('T')[0]
  const isFuture = date ? date > today : false
  const fetchDate = isFuture || !date ? today : date
  const isToday = fetchDate === today

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
    return rates
  } catch {
    return {}
  }
}
