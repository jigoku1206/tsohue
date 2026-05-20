// @vitest-environment jsdom
// Node.js 22+ provides a built-in `localStorage` global that lacks .clear() and overrides
// jsdom's implementation. Stub it with a proper Map-backed mock before any imports run.
import { vi, describe, it, expect, beforeEach } from 'vitest'

const store = new Map<string, string>()
const mockLocalStorage = {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => { store.set(key, value) },
  removeItem: (key: string) => { store.delete(key) },
  clear: () => { store.clear() },
  get length() { return store.size },
  key: (i: number) => [...store.keys()][i] ?? null,
}
vi.stubGlobal('localStorage', mockLocalStorage)

// Import after stubbing so the module captures the patched global
const { loadState, saveState, clearState } = await import('@/lib/demo/storage')
const { buildSeedState } = await import('@/lib/demo/seed')

beforeEach(() => {
  store.clear()
})

describe('loadState', () => {
  it('returns null when localStorage is empty', () => {
    expect(loadState()).toBeNull()
  })

  it('returns null for invalid JSON', () => {
    localStorage.setItem('demo_state_v1', 'not-json{{{')
    expect(loadState()).toBeNull()
  })

  it('returns parsed state after saveState', () => {
    const state = buildSeedState()
    saveState(state)
    const loaded = loadState()
    expect(loaded).not.toBeNull()
    expect(loaded!.profile.nickname).toBe(state.profile.nickname)
    expect(loaded!.ledgers).toHaveLength(2)
  })

  it('backfills missing recurring_rules field', () => {
    const state = buildSeedState()
    const { recurring_rules: _rr, ...withoutField } = state
    localStorage.setItem('demo_state_v1', JSON.stringify(withoutField))
    const loaded = loadState()
    expect(loaded!.recurring_rules).toEqual([])
  })

  it('backfills missing ledger_budgets field', () => {
    const state = buildSeedState()
    const { ledger_budgets: _lb, ...withoutField } = state
    localStorage.setItem('demo_state_v1', JSON.stringify(withoutField))
    const loaded = loadState()
    expect(loaded!.ledger_budgets).toEqual([])
  })
})

describe('saveState', () => {
  it('persists state to localStorage', () => {
    const state = buildSeedState()
    saveState(state)
    const raw = localStorage.getItem('demo_state_v1')
    expect(raw).not.toBeNull()
    const parsed = JSON.parse(raw!)
    expect(parsed.profile.nickname).toBe(state.profile.nickname)
  })

  it('overwrites previous state', () => {
    const s1 = buildSeedState()
    s1.profile.nickname = 'Alice'
    saveState(s1)

    const s2 = buildSeedState()
    s2.profile.nickname = 'Bob'
    saveState(s2)

    const loaded = loadState()
    expect(loaded!.profile.nickname).toBe('Bob')
  })
})

describe('clearState', () => {
  it('removes state from localStorage', () => {
    saveState(buildSeedState())
    expect(loadState()).not.toBeNull()
    clearState()
    expect(loadState()).toBeNull()
  })

  it('is idempotent — no error if called when empty', () => {
    expect(() => clearState()).not.toThrow()
  })
})
