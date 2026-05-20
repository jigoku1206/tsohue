import { describe, it, expect } from 'vitest'
import { buildSeedState, DEMO_USER_ID, DEMO_PUBLIC_LEDGER_ID, DEMO_TRAVEL_LEDGER_ID } from '@/lib/demo/seed'

describe('buildSeedState', () => {
  it('returns state with correct shape', () => {
    const state = buildSeedState()
    expect(state).toHaveProperty('transactions')
    expect(state).toHaveProperty('categories')
    expect(state).toHaveProperty('ledgers')
    expect(state).toHaveProperty('profile')
    expect(state).toHaveProperty('recurring_rules')
    expect(state).toHaveProperty('ledger_budgets')
  })

  it('starts with empty transactions', () => {
    const state = buildSeedState()
    expect(state.transactions).toEqual([])
  })

  it('starts with empty recurring rules', () => {
    const state = buildSeedState()
    expect(state.recurring_rules).toEqual([])
  })

  it('starts with empty ledger budgets', () => {
    const state = buildSeedState()
    expect(state.ledger_budgets).toEqual([])
  })

  it('has two ledgers', () => {
    const state = buildSeedState()
    expect(state.ledgers).toHaveLength(2)
  })

  it('public ledger has correct id and is_public=true', () => {
    const state = buildSeedState()
    const pub = state.ledgers.find((l) => l.id === DEMO_PUBLIC_LEDGER_ID)
    expect(pub).toBeDefined()
    expect(pub!.is_public).toBe(true)
    expect(pub!.owner_id).toBe(DEMO_USER_ID)
  })

  it('travel ledger has correct id and is_public=false', () => {
    const state = buildSeedState()
    const travel = state.ledgers.find((l) => l.id === DEMO_TRAVEL_LEDGER_ID)
    expect(travel).toBeDefined()
    expect(travel!.is_public).toBe(false)
  })

  it('has 12 categories', () => {
    const state = buildSeedState()
    expect(state.categories).toHaveLength(12)
  })

  it('categories have unique ids', () => {
    const state = buildSeedState()
    const ids = state.categories.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('categories all have parent_id=null (top-level)', () => {
    const state = buildSeedState()
    state.categories.forEach((c) => {
      expect(c.parent_id).toBeNull()
    })
  })

  it('subcategories have correct parent_id', () => {
    const state = buildSeedState()
    state.categories.forEach((cat) => {
      cat.subcategories.forEach((sub) => {
        expect(sub.parent_id).toBe(cat.id)
      })
    })
  })

  it('subcategories within a category have unique ids', () => {
    const state = buildSeedState()
    state.categories.forEach((cat) => {
      const ids = cat.subcategories.map((s) => s.id)
      expect(new Set(ids).size).toBe(ids.length)
    })
  })

  it('categories are ordered by position', () => {
    const state = buildSeedState()
    state.categories.forEach((cat, i) => {
      expect(cat.position).toBe(i)
    })
  })

  it('profile has a nickname', () => {
    const state = buildSeedState()
    expect(typeof state.profile.nickname).toBe('string')
    expect(state.profile.nickname.length).toBeGreaterThan(0)
  })

  it('returns a fresh state each call (no shared references)', () => {
    const s1 = buildSeedState()
    const s2 = buildSeedState()
    s1.transactions.push({ id: 'test' } as never)
    expect(s2.transactions).toHaveLength(0)
  })
})
