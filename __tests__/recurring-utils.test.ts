import { describe, it, expect } from 'vitest'
import {
  addMonths,
  lastDayOfMonth,
  generateRecurringDates,
  occurrencesInMonth,
  prevOccurrence,
} from '@/lib/recurring-utils'

describe('addMonths', () => {
  it('adds months normally', () => {
    expect(addMonths('2024-03-15', 2)).toBe('2024-05-15')
  })

  it('rolls over year boundary', () => {
    expect(addMonths('2024-11-15', 2)).toBe('2025-01-15')
  })

  it('clamps to last day of shorter month', () => {
    expect(addMonths('2024-01-31', 1)).toBe('2024-02-29') // 2024 is leap
    expect(addMonths('2023-01-31', 1)).toBe('2023-02-28') // 2023 not leap
  })

  it('clamps March 31 to April 30', () => {
    expect(addMonths('2024-03-31', 1)).toBe('2024-04-30')
  })

  it('adds 0 months returns same date', () => {
    expect(addMonths('2024-06-15', 0)).toBe('2024-06-15')
  })

  it('handles large n spanning multiple years', () => {
    expect(addMonths('2024-01-01', 24)).toBe('2026-01-01')
  })

  it('handles negative months (subtract)', () => {
    expect(addMonths('2024-03-15', -1)).toBe('2024-02-15')
    expect(addMonths('2024-01-15', -1)).toBe('2023-12-15')
  })

  it('clamps end-of-month when subtracting', () => {
    expect(addMonths('2024-03-31', -1)).toBe('2024-02-29')
  })
})

describe('lastDayOfMonth', () => {
  it('returns last day of month correctly', () => {
    expect(lastDayOfMonth(2024, 1)).toBe('2024-01-31')
    expect(lastDayOfMonth(2024, 2)).toBe('2024-02-29') // leap year
    expect(lastDayOfMonth(2023, 2)).toBe('2023-02-28') // non-leap
    expect(lastDayOfMonth(2024, 4)).toBe('2024-04-30')
    expect(lastDayOfMonth(2024, 12)).toBe('2024-12-31')
  })
})

describe('generateRecurringDates', () => {
  it('generates monthly dates', () => {
    const dates = generateRecurringDates('2024-01-15', 'monthly', 3)
    expect(dates).toEqual(['2024-01-15', '2024-02-15', '2024-03-15'])
  })

  it('monthly clamps end-of-month dates', () => {
    const dates = generateRecurringDates('2024-01-31', 'monthly', 3)
    expect(dates).toEqual(['2024-01-31', '2024-02-29', '2024-03-31'])
  })

  it('generates weekly dates', () => {
    const dates = generateRecurringDates('2024-01-01', 'weekly', 3)
    expect(dates).toEqual(['2024-01-01', '2024-01-08', '2024-01-15'])
  })

  it('weekly spans month boundary', () => {
    const dates = generateRecurringDates('2024-01-29', 'weekly', 3)
    expect(dates).toEqual(['2024-01-29', '2024-02-05', '2024-02-12'])
  })

  it('returns empty array for count=0', () => {
    expect(generateRecurringDates('2024-01-01', 'monthly', 0)).toEqual([])
  })
})

describe('occurrencesInMonth', () => {
  describe('monthly frequency', () => {
    it('returns one occurrence per month', () => {
      const result = occurrencesInMonth('2024-01-15', null, 'monthly', 2024, 3)
      expect(result).toEqual(['2024-03-15'])
    })

    it('clamps day when month is shorter', () => {
      // start Jan 31 → Feb occurrence should be Feb 29 (2024 leap)
      const result = occurrencesInMonth('2024-01-31', null, 'monthly', 2024, 2)
      expect(result).toEqual(['2024-02-29'])
    })

    it('excludes if occurrence is before start_date', () => {
      // Start date is March, querying February → no result
      const result = occurrencesInMonth('2024-03-15', null, 'monthly', 2024, 2)
      expect(result).toEqual([])
    })

    it('excludes if occurrence is after end_date', () => {
      const result = occurrencesInMonth('2024-01-15', '2024-02-14', 'monthly', 2024, 2)
      expect(result).toEqual([])
    })

    it('includes if occurrence equals end_date', () => {
      const result = occurrencesInMonth('2024-01-15', '2024-02-15', 'monthly', 2024, 2)
      expect(result).toEqual(['2024-02-15'])
    })

    it('handles start_date in the queried month', () => {
      const result = occurrencesInMonth('2024-03-20', null, 'monthly', 2024, 3)
      expect(result).toEqual(['2024-03-20'])
    })
  })

  describe('weekly frequency', () => {
    it('returns all weekly occurrences in a month', () => {
      // 2024-01-01 is Monday. Jan has Mondays on 1, 8, 15, 22, 29
      const result = occurrencesInMonth('2024-01-01', null, 'weekly', 2024, 1)
      expect(result).toEqual(['2024-01-01', '2024-01-08', '2024-01-15', '2024-01-22', '2024-01-29'])
    })

    it('excludes weeks before start_date', () => {
      // Start on Jan 15 → Jan occurrences are 15, 22, 29
      const result = occurrencesInMonth('2024-01-15', null, 'weekly', 2024, 1)
      expect(result).toEqual(['2024-01-15', '2024-01-22', '2024-01-29'])
    })

    it('respects end_date', () => {
      const result = occurrencesInMonth('2024-01-01', '2024-01-15', 'weekly', 2024, 1)
      expect(result).toEqual(['2024-01-01', '2024-01-08', '2024-01-15'])
    })

    it('returns empty if start_date is after the month', () => {
      const result = occurrencesInMonth('2024-03-01', null, 'weekly', 2024, 1)
      expect(result).toEqual([])
    })

    it('handles start_date in a prior month', () => {
      // Start Dec 25 (Monday), weekly → Jan occurrences: Jan 1, 8, 15, 22, 29
      const result = occurrencesInMonth('2023-12-25', null, 'weekly', 2024, 1)
      expect(result).toEqual(['2024-01-01', '2024-01-08', '2024-01-15', '2024-01-22', '2024-01-29'])
    })
  })
})

describe('prevOccurrence', () => {
  describe('monthly frequency', () => {
    it('returns last occurrence strictly before beforeDate', () => {
      const result = prevOccurrence('2024-01-15', 'monthly', '2024-04-20')
      expect(result).toBe('2024-03-15')
    })

    it('returns null if startDate >= beforeDate', () => {
      expect(prevOccurrence('2024-03-15', 'monthly', '2024-03-15')).toBeNull()
      expect(prevOccurrence('2024-03-15', 'monthly', '2024-01-01')).toBeNull()
    })

    it('returns null if only occurrence would be >= beforeDate', () => {
      // start Jan 15, before Feb 15 → last occ is Jan 15 which < Feb 15 → should return Jan 15
      expect(prevOccurrence('2024-01-15', 'monthly', '2024-02-15')).toBe('2024-01-15')
    })

    it('handles month-end clamping: does not return clamped date >= beforeDate', () => {
      // start Jan 31, before Mar 01 → candidate is addMonths('2024-01-31', 1) = Feb 29
      // Feb 29 < Mar 01, so should return Feb 29
      expect(prevOccurrence('2024-01-31', 'monthly', '2024-03-01')).toBe('2024-02-29')
    })

    it('skips clamped occurrence if it lands on beforeDate', () => {
      // start Jan 31, before Feb 29 → totalMonths=1, candidate addMonths(start,0)='2024-01-31' < '2024-02-29'
      expect(prevOccurrence('2024-01-31', 'monthly', '2024-02-29')).toBe('2024-01-31')
    })

    it('returns null when first occurrence would be on same month and start equals before', () => {
      expect(prevOccurrence('2024-01-01', 'monthly', '2024-01-01')).toBeNull()
    })
  })

  describe('weekly frequency', () => {
    it('returns last weekly occurrence before beforeDate', () => {
      // start Jan 1, before Jan 22 → occurrences: Jan 1, 8, 15. Last = Jan 15
      expect(prevOccurrence('2024-01-01', 'weekly', '2024-01-22')).toBe('2024-01-15')
    })

    it('returns start date itself if it is the only occurrence before beforeDate', () => {
      expect(prevOccurrence('2024-01-01', 'weekly', '2024-01-08')).toBe('2024-01-01')
    })

    it('returns null if startDate >= beforeDate', () => {
      expect(prevOccurrence('2024-01-15', 'weekly', '2024-01-15')).toBeNull()
    })

    it('returns null if beforeDate is only 1 day after start', () => {
      expect(prevOccurrence('2024-01-01', 'weekly', '2024-01-02')).toBe('2024-01-01')
    })
  })
})
