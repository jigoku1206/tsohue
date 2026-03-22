import type { ActionsContextValue } from '@/lib/actions-context'
import type { DemoState } from './storage'
import { saveState } from './storage'
import { DEMO_USER_ID, DEMO_PUBLIC_LEDGER_ID } from './seed'
import { fetchExchangeRates } from '@/lib/fetch-exchange-rates'
import type { ImportRow } from '@/app/actions/import'

type SetState = (updater: (prev: DemoState) => DemoState) => void

let _uid = 1
function uid() {
  return `demo-new-${Date.now()}-${_uid++}`
}

export function createDemoActions(setState: SetState): ActionsContextValue {
  function mutate(fn: (prev: DemoState) => DemoState) {
    setState((prev) => {
      const next = fn(prev)
      saveState(next)
      return next
    })
  }

  return {
    isDemo: true,

    // ── Transactions ──────────────────────────────────────────────────────────

    async addTransaction(formData) {
      const tx = {
        id: uid(),
        date: formData.get('date') as string,
        amount: parseFloat(formData.get('amount') as string),
        currency: (formData.get('currency') as string) || 'TWD',
        exchange_rate: parseFloat(formData.get('exchange_rate') as string) || 1,
        category: formData.get('category') as string,
        subcategory: (formData.get('subcategory') as string) || null,
        note: (formData.get('note') as string) || null,
        paid_by: formData.get('paid_by') as string,
        user_id: DEMO_USER_ID,
        ledger_id: (formData.get('ledger_id') as string) || null,
        created_at: new Date().toISOString(),
      }
      mutate((prev) => ({ ...prev, transactions: [tx, ...prev.transactions] }))
      return { error: null }
    },

    async updateTransaction(id, formData) {
      mutate((prev) => ({
        ...prev,
        transactions: prev.transactions.map((tx) =>
          tx.id === id
            ? {
                ...tx,
                date: formData.get('date') as string,
                amount: parseFloat(formData.get('amount') as string),
                currency: (formData.get('currency') as string) || 'TWD',
                exchange_rate: parseFloat(formData.get('exchange_rate') as string) || 1,
                category: formData.get('category') as string,
                subcategory: (formData.get('subcategory') as string) || null,
                note: (formData.get('note') as string) || null,
                paid_by: formData.get('paid_by') as string,
              }
            : tx
        ),
      }))
      return { error: null }
    },

    async deleteTransaction(id) {
      mutate((prev) => ({
        ...prev,
        transactions: prev.transactions.filter((tx) => tx.id !== id),
      }))
      return { error: null }
    },

    // ── Categories ────────────────────────────────────────────────────────────

    async createCategory(name, parentId) {
      const newCat = {
        id: uid(),
        name: name.trim(),
        parent_id: parentId ?? null,
        position: 999,
        subcategories: [],
      }
      mutate((prev) => {
        if (!parentId) {
          return { ...prev, categories: [...prev.categories, newCat] }
        }
        return {
          ...prev,
          categories: prev.categories.map((c) =>
            c.id === parentId
              ? { ...c, subcategories: [...c.subcategories, newCat] }
              : c
          ),
        }
      })
      return { error: null }
    },

    async updateCategory(id, name) {
      mutate((prev) => ({
        ...prev,
        categories: prev.categories.map((c) => {
          if (c.id === id) return { ...c, name }
          return {
            ...c,
            subcategories: c.subcategories.map((s) =>
              s.id === id ? { ...s, name } : s
            ),
          }
        }),
      }))
      return { error: null }
    },

    async deleteCategory(id) {
      mutate((prev) => ({
        ...prev,
        categories: prev.categories
          .filter((c) => c.id !== id)
          .map((c) => ({
            ...c,
            subcategories: c.subcategories.filter((s) => s.id !== id),
          })),
      }))
      return { error: null }
    },

    async updateCategoryPositions(updates) {
      const posMap = new Map(updates.map(({ id, position }) => [id, position]))
      mutate((prev) => ({
        ...prev,
        categories: prev.categories
          .map((c) => {
            const newPos = posMap.get(c.id)
            const newSubs = [...c.subcategories]
              .map((s) => ({ ...s, position: posMap.get(s.id) ?? s.position }))
              .sort((a, b) => a.position - b.position)
            return newPos !== undefined
              ? { ...c, position: newPos, subcategories: newSubs }
              : { ...c, subcategories: newSubs }
          })
          .sort((a, b) => a.position - b.position),
      }))
      return { error: null }
    },

    // ── Ledgers ───────────────────────────────────────────────────────────────

    async createLedger(name) {
      const id = uid()
      mutate((prev) => ({
        ...prev,
        ledgers: [
          ...prev.ledgers,
          {
            id,
            name,
            owner_id: DEMO_USER_ID,
            is_public: false,
            default_currency: 'TWD',
            created_at: new Date().toISOString(),
          },
        ],
      }))
      return { id }
    },

    async updateLedger(id, name, currency) {
      mutate((prev) => ({
        ...prev,
        ledgers: prev.ledgers.map((l) =>
          l.id === id
            ? { ...l, name, ...(currency ? { default_currency: currency } : {}) }
            : l
        ),
      }))
      return { error: null }
    },

    async deleteLedger(id) {
      mutate((prev) => ({
        ...prev,
        ledgers: prev.ledgers.filter((l) => l.id !== id),
        transactions: prev.transactions.filter((tx) => tx.ledger_id !== id),
      }))
      return { error: null }
    },

    async getLedgerMembers() {
      return []
    },

    async getAllUsers() {
      return []
    },

    async setLedgerMembers() {
      return { error: null }
    },

    // ── Profile ───────────────────────────────────────────────────────────────

    async updateProfile(_prev, formData) {
      const nickname = (formData.get('nickname') as string)?.trim()
      if (!nickname) return { error: '請填寫暱稱' }
      mutate((prev) => ({ ...prev, profile: { nickname } }))
      return null
    },

    // ── Exchange rates ────────────────────────────────────────────────────────

    fetchExchangeRates,

    // ── Import ────────────────────────────────────────────────────────────────

    async importTransactions(rows: ImportRow[], ledgerId?: string) {
      const newTxs = rows.map((row) => ({
        id: uid(),
        date: row.date,
        amount: row.amount,
        currency: row.currency || 'TWD',
        exchange_rate: row.exchange_rate || 1,
        category: row.category,
        subcategory: row.subcategory || null,
        note: row.note || null,
        paid_by: row.paid_by || '',
        user_id: DEMO_USER_ID,
        ledger_id: ledgerId ?? DEMO_PUBLIC_LEDGER_ID,
        created_at: new Date().toISOString(),
      }))
      mutate((prev) => ({
        ...prev,
        transactions: [...newTxs, ...prev.transactions],
      }))
      return { imported: rows.length }
    },
  }
}
