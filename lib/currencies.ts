export const CURRENCIES = [
  { code: 'TWD', label: '新台幣', symbol: 'NT$', decimals: 0 },
  { code: 'USD', label: '美元',   symbol: 'US$', decimals: 2 },
  { code: 'JPY', label: '日圓',   symbol: '¥',   decimals: 0 },
  { code: 'EUR', label: '歐元',   symbol: '€',   decimals: 2 },
  { code: 'CNY', label: '人民幣', symbol: 'CN¥', decimals: 2 },
  { code: 'TRY', label: '土耳其里拉', symbol: '₺',   decimals: 2 },
] as const

export type CurrencyCode = (typeof CURRENCIES)[number]['code']

export type ExchangeRates = Partial<Record<CurrencyCode, number>>

export function formatAmount(amount: number, currency: string): string {
  const c = CURRENCIES.find((x) => x.code === currency) ?? CURRENCIES[0]
  if (currency === 'TWD') {
    return new Intl.NumberFormat('zh-TW', {
      style: 'currency',
      currency: 'TWD',
      minimumFractionDigits: 0,
    }).format(amount)
  }
  return `${c.symbol}${new Intl.NumberFormat('zh-TW', {
    minimumFractionDigits: c.decimals,
    maximumFractionDigits: c.decimals,
  }).format(amount)}`
}
