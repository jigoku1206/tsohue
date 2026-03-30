export function addMonths(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const year = y + Math.floor((m - 1 + n) / 12)
  const month = ((m - 1 + n) % 12) + 1
  const lastDay = new Date(year, month, 0).getDate()
  const day = Math.min(d, lastDay)
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function lastDayOfMonth(year: number, month: number): string {
  const d = new Date(year, month, 0).getDate()
  return `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

export function generateRecurringDates(
  start: string,
  frequency: 'monthly' | 'weekly',
  count: number
): string[] {
  const dates: string[] = []
  for (let i = 0; i < count; i++) {
    if (frequency === 'monthly') {
      dates.push(addMonths(start, i))
    } else {
      const date = new Date(start)
      date.setDate(date.getDate() + i * 7)
      dates.push(date.toISOString().split('T')[0])
    }
  }
  return dates
}

export function occurrencesInMonth(
  startDate: string,
  endDate: string | null,
  frequency: 'monthly' | 'weekly',
  year: number,
  month: number
): string[] {
  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`
  const monthEnd = lastDayOfMonth(year, month)
  const results: string[] = []

  if (frequency === 'monthly') {
    const [, , d] = startDate.split('-').map(Number)
    const lastDay = new Date(year, month, 0).getDate()
    const occDay = Math.min(d, lastDay)
    const occ = `${year}-${String(month).padStart(2, '0')}-${String(occDay).padStart(2, '0')}`
    if (occ >= startDate && (endDate === null || occ <= endDate)) {
      if (occ >= monthStart && occ <= monthEnd) {
        results.push(occ)
      }
    }
  } else {
    // weekly: find all occurrences of the weekday in this month
    const startMs = new Date(startDate).getTime()
    const monthStartMs = new Date(monthStart).getTime()
    const monthEndMs = new Date(monthEnd).getTime()
    const MS_PER_DAY = 86400000
    const MS_PER_WEEK = 7 * MS_PER_DAY

    const diffMs = monthStartMs - startMs
    const weeksNeeded = diffMs > 0 ? Math.ceil(diffMs / MS_PER_WEEK) : 0
    let cursor = startMs + weeksNeeded * MS_PER_WEEK

    while (cursor <= monthEndMs) {
      const occ = new Date(cursor).toISOString().split('T')[0]
      if (occ >= startDate && (endDate === null || occ <= endDate)) {
        results.push(occ)
      }
      cursor += MS_PER_WEEK
    }
  }

  return results
}

export function prevOccurrence(
  startDate: string,
  frequency: 'monthly' | 'weekly',
  beforeDate: string
): string | null {
  if (startDate >= beforeDate) return null

  if (frequency === 'monthly') {
    let prev: string | null = null
    let i = 0
    while (true) {
      const candidate = addMonths(startDate, i)
      if (candidate >= beforeDate) break
      prev = candidate
      i++
      if (i > 1200) break // safety: ~100 years
    }
    return prev
  } else {
    const startMs = new Date(startDate).getTime()
    const beforeMs = new Date(beforeDate).getTime()
    const MS_PER_DAY = 86400000
    const diffDays = Math.floor((beforeMs - startMs) / MS_PER_DAY)
    if (diffDays <= 0) return null
    const i = Math.floor((diffDays - 1) / 7)
    return new Date(startMs + i * 7 * MS_PER_DAY).toISOString().split('T')[0]
  }
}
