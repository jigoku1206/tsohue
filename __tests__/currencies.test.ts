import { describe, it, expect } from 'vitest'
import { formatAmount, CURRENCIES } from '@/lib/currencies'

describe('formatAmount', () => {
  it('formats TWD with NT$ symbol and no decimals', () => {
    const result = formatAmount(1234, 'TWD')
    expect(result).toContain('1,234')
    expect(result).toContain('$')
  })

  it('formats USD with US$ prefix and 2 decimals', () => {
    const result = formatAmount(12.5, 'USD')
    expect(result).toBe('US$12.50')
  })

  it('formats JPY with ¥ prefix and no decimals', () => {
    const result = formatAmount(1000, 'JPY')
    expect(result).toBe('¥1,000')
  })

  it('formats EUR with € prefix and 2 decimals', () => {
    const result = formatAmount(9.99, 'EUR')
    expect(result).toBe('€9.99')
  })

  it('formats CNY with CN¥ prefix and 2 decimals', () => {
    const result = formatAmount(100, 'CNY')
    expect(result).toBe('CN¥100.00')
  })

  it('formats TRY with ₺ prefix and 2 decimals', () => {
    const result = formatAmount(50.5, 'TRY')
    expect(result).toBe('₺50.50')
  })

  it('falls back to TWD formatting for unknown currency', () => {
    const result = formatAmount(100, 'XYZ')
    expect(result).toContain('100')
  })

  it('handles zero amount', () => {
    expect(formatAmount(0, 'TWD')).toContain('0')
    expect(formatAmount(0, 'USD')).toBe('US$0.00')
  })

  it('handles large amounts with thousands separator', () => {
    const result = formatAmount(1000000, 'JPY')
    expect(result).toBe('¥1,000,000')
  })
})

describe('CURRENCIES constant', () => {
  it('has all 6 currencies', () => {
    expect(CURRENCIES).toHaveLength(6)
  })

  it('TWD has 0 decimals', () => {
    const twd = CURRENCIES.find((c) => c.code === 'TWD')
    expect(twd?.decimals).toBe(0)
  })

  it('USD has 2 decimals', () => {
    const usd = CURRENCIES.find((c) => c.code === 'USD')
    expect(usd?.decimals).toBe(2)
  })

  it('all currency codes are unique', () => {
    const codes = CURRENCIES.map((c) => c.code)
    expect(new Set(codes).size).toBe(codes.length)
  })
})
