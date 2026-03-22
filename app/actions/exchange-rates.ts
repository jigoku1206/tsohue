'use server'

// Re-export for backward compatibility — server action wrapper delegates to the shared lib.
import { fetchExchangeRates as _fetch } from '@/lib/fetch-exchange-rates'
export type { ExchangeRates } from '@/lib/currencies'

export async function fetchExchangeRates(date?: string) {
  return _fetch(date)
}
