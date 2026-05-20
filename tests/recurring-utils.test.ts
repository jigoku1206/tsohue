import assert from 'node:assert/strict'
import test from 'node:test'
import {
  addMonths,
  generateRecurringDates,
  occurrencesInMonth,
  prevOccurrence,
} from '../lib/recurring-utils.ts'

test('addMonths clamps to the last day of shorter months', () => {
  assert.equal(addMonths('2026-01-31', 1), '2026-02-28')
  assert.equal(addMonths('2026-01-31', 2), '2026-03-31')
})

test('generateRecurringDates creates bounded monthly and weekly schedules', () => {
  assert.deepEqual(generateRecurringDates('2026-01-31', 'monthly', 3), [
    '2026-01-31',
    '2026-02-28',
    '2026-03-31',
  ])
  assert.deepEqual(generateRecurringDates('2026-05-06', 'weekly', 3), [
    '2026-05-06',
    '2026-05-13',
    '2026-05-20',
  ])
})

test('occurrencesInMonth respects start and end dates', () => {
  assert.deepEqual(
    occurrencesInMonth('2026-01-31', null, 'monthly', 2026, 2),
    ['2026-02-28']
  )
  assert.deepEqual(
    occurrencesInMonth('2026-05-06', '2026-05-20', 'weekly', 2026, 5),
    ['2026-05-06', '2026-05-13', '2026-05-20']
  )
})

test('prevOccurrence returns the occurrence immediately before a date', () => {
  assert.equal(prevOccurrence('2026-01-31', 'monthly', '2026-04-01'), '2026-03-31')
  assert.equal(prevOccurrence('2026-05-06', 'weekly', '2026-05-20'), '2026-05-13')
  assert.equal(prevOccurrence('2026-05-06', 'weekly', '2026-05-06'), null)
})
