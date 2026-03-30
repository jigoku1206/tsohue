import type { ActionsContextValue } from '@/lib/actions-context'
import type { DemoState } from './storage'
import { saveState } from './storage'
import { DEMO_USER_ID } from './seed'
import { fetchExchangeRates } from '@/lib/fetch-exchange-rates'
import type { ImportRow } from '@/app/actions/import'
import type { RecurringRule } from '@/app/actions/recurring'
import {
  generateRecurringDates,
  occurrencesInMonth,
  prevOccurrence,
  lastDayOfMonth,
} from '@/lib/recurring-utils'

type SetState = (updater: (prev: DemoState) => DemoState) => void
type GetState = () => DemoState

let _uid = 1
function uid() {
  return `demo-new-${Date.now()}-${_uid++}`
}

// ── Local lazy-generation helper ──────────────────────────────────────────────

export function demoEnsureRecurringForMonth(
  state: DemoState,
  year: number,
  month: number,
  ledgerId: string | null | undefined
): DemoState {
  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`
  const monthEnd = lastDayOfMonth(year, month)

  const activeRules = state.recurring_rules.filter((r) => {
    if (ledgerId && r.ledger_id !== ledgerId) return false
    if (r.start_date > monthEnd) return false
    if (r.end_date !== null && r.end_date < monthStart) return false
    return true
  })

  if (activeRules.length === 0) return state

  const existingSet = new Set(
    state.transactions
      .filter((tx) => tx.recurring_id !== null && tx.date >= monthStart && tx.date <= monthEnd)
      .map((tx) => `${tx.recurring_id}|${tx.date}`)
  )

  const newTxs = []
  for (const rule of activeRules) {
    const dates = occurrencesInMonth(rule.start_date, rule.end_date, rule.frequency, year, month)
    for (const date of dates) {
      if (!existingSet.has(`${rule.id}|${date}`)) {
        newTxs.push({
          id: uid(),
          date,
          amount: rule.amount,
          currency: rule.currency,
          exchange_rate: rule.exchange_rate,
          category: rule.category,
          subcategory: rule.subcategory,
          note: rule.note,
          paid_by: rule.paid_by,
          user_id: DEMO_USER_ID,
          ledger_id: rule.ledger_id,
          recurring_id: rule.id,
          created_at: new Date().toISOString(),
        })
      }
    }
  }

  if (newTxs.length === 0) return state
  return { ...state, transactions: [...newTxs, ...state.transactions] }
}

// ── Demo actions factory ──────────────────────────────────────────────────────

export function createDemoActions(setState: SetState, getState: GetState): ActionsContextValue {
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
        recurring_id: null,
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

    // ── Recurring ─────────────────────────────────────────────────────────────

    async createRecurringRule(formData) {
      const startDate = formData.get('date') as string
      const frequency = formData.get('recurring_frequency') as 'monthly' | 'weekly'
      const rawCount = formData.get('recurring_count') as string
      const ledgerId = (formData.get('ledger_id') as string) || null

      let endDate: string | null = null
      if (rawCount !== 'indefinite') {
        const count = parseInt(rawCount) || 3
        const dates = generateRecurringDates(startDate, frequency, count)
        endDate = dates[dates.length - 1]
      }

      const ruleId = `demo-rule-${Date.now()}-${_uid++}`
      const rule: RecurringRule = {
        id: ruleId,
        user_id: DEMO_USER_ID,
        ledger_id: ledgerId,
        amount: parseFloat(formData.get('amount') as string),
        currency: (formData.get('currency') as string) || 'TWD',
        exchange_rate: parseFloat(formData.get('exchange_rate') as string) || 1,
        category: formData.get('category') as string,
        subcategory: (formData.get('subcategory') as string) || null,
        note: (formData.get('note') as string) || null,
        paid_by: formData.get('paid_by') as string,
        frequency,
        start_date: startDate,
        end_date: endDate,
        created_at: new Date().toISOString(),
      }

      mutate((prev) => {
        const withRule = { ...prev, recurring_rules: [...prev.recurring_rules, rule] }
        const [y, m] = startDate.split('-').map(Number)
        return demoEnsureRecurringForMonth(withRule, y, m, ledgerId)
      })
      return { error: null }
    },

    async updateRecurringByScope(ruleId, fromDate, scope, formData) {
      mutate((prev) => {
        const rule = prev.recurring_rules.find((r) => r.id === ruleId)
        if (!rule) return prev

        const newFields = {
          amount: parseFloat(formData.get('amount') as string),
          currency: (formData.get('currency') as string) || 'TWD',
          exchange_rate: parseFloat(formData.get('exchange_rate') as string) || 1,
          category: formData.get('category') as string,
          subcategory: (formData.get('subcategory') as string) || null,
          note: (formData.get('note') as string) || null,
          paid_by: formData.get('paid_by') as string,
        }
        const newDate = formData.get('date') as string

        if (scope === 'all') {
          return {
            ...prev,
            recurring_rules: prev.recurring_rules.map((r) =>
              r.id === ruleId ? { ...r, ...newFields } : r
            ),
            transactions: prev.transactions.map((tx) =>
              tx.recurring_id === ruleId ? { ...tx, ...newFields } : tx
            ),
          }
        }

        // from_date scope
        const prev_occ = prevOccurrence(rule.start_date, rule.frequency, fromDate)

        if (prev_occ === null) {
          return {
            ...prev,
            recurring_rules: prev.recurring_rules.map((r) =>
              r.id === ruleId ? { ...r, ...newFields, start_date: newDate } : r
            ),
            transactions: prev.transactions.map((tx) =>
              tx.recurring_id === ruleId ? { ...tx, ...newFields } : tx
            ),
          }
        }

        const newRuleId = `demo-rule-${Date.now()}-${_uid++}`
        const newRule: RecurringRule = {
          ...rule,
          ...newFields,
          id: newRuleId,
          start_date: newDate,
          end_date: rule.end_date,
          created_at: new Date().toISOString(),
        }

        return {
          ...prev,
          recurring_rules: [
            ...prev.recurring_rules.map((r) =>
              r.id === ruleId ? { ...r, end_date: prev_occ } : r
            ),
            newRule,
          ],
          transactions: prev.transactions.map((tx) =>
            tx.recurring_id === ruleId && tx.date >= fromDate
              ? { ...tx, recurring_id: newRuleId, ...newFields }
              : tx
          ),
        }
      })
      return { error: null }
    },

    async deleteRecurringByScope(ruleId, fromDate, scope) {
      mutate((prev) => {
        const rule = prev.recurring_rules.find((r) => r.id === ruleId)
        if (!rule) return prev

        if (scope === 'all') {
          return {
            ...prev,
            recurring_rules: prev.recurring_rules.filter((r) => r.id !== ruleId),
            transactions: prev.transactions.filter((tx) => tx.recurring_id !== ruleId),
          }
        }

        // from_date scope
        const prev_occ = prevOccurrence(rule.start_date, rule.frequency, fromDate)
        const filteredTxs = prev.transactions.filter(
          (tx) => !(tx.recurring_id === ruleId && tx.date >= fromDate)
        )

        if (prev_occ === null) {
          return {
            ...prev,
            recurring_rules: prev.recurring_rules.filter((r) => r.id !== ruleId),
            transactions: filteredTxs,
          }
        }

        return {
          ...prev,
          recurring_rules: prev.recurring_rules.map((r) =>
            r.id === ruleId ? { ...r, end_date: prev_occ } : r
          ),
          transactions: filteredTxs,
        }
      })
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

    // ── Import / Export ───────────────────────────────────────────────────────

    async getTransactionsRange(startYear, startMonth, endYear, endMonth, ledgerId) {
      const start = `${startYear}-${String(startMonth).padStart(2, '0')}-01`
      const endLastDay = new Date(endYear, endMonth, 0).getDate()
      const end = `${endYear}-${String(endMonth).padStart(2, '0')}-${String(endLastDay).padStart(2, '0')}`
      const state = getState()
      return state.transactions
        .filter((tx) => {
          if (tx.date < start || tx.date > end) return false
          if (ledgerId && tx.ledger_id !== ledgerId) return false
          return true
        })
        .sort((a, b) => a.date.localeCompare(b.date))
    },

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
        ledger_id: ledgerId ?? null,
        recurring_id: null,
        created_at: new Date().toISOString(),
      }))
      mutate((prev) => ({
        ...prev,
        transactions: [...newTxs, ...prev.transactions],
      }))
      return { imported: rows.length }
    },

    // ── Budgets ───────────────────────────────────────────────────────────────

    async getLedgerBudgets(ledgerId: string) {
      return getState().ledger_budgets.filter((b) => b.ledger_id === ledgerId)
    },

    async upsertLedgerBudget(ledgerId: string, category: string | null, limit: number | null) {
      mutate((prev) => {
        const filtered = prev.ledger_budgets.filter(
          (b) => !(b.ledger_id === ledgerId && b.category === category)
        )
        if (!limit || limit <= 0) {
          return { ...prev, ledger_budgets: filtered }
        }
        return {
          ...prev,
          ledger_budgets: [
            ...filtered,
            { id: uid(), ledger_id: ledgerId, category, monthly_limit: limit },
          ],
        }
      })
      return {}
    },
  }
}
