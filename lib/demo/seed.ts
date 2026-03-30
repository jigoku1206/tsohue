import type { DemoState } from './storage'

export const DEMO_USER_ID = 'demo-user'
export const DEMO_PUBLIC_LEDGER_ID = 'demo-public-ledger'
export const DEMO_TRAVEL_LEDGER_ID = 'demo-travel-ledger'

// ── Seed categories (mirrors DEFAULT_CATEGORIES in app/actions/categories.ts) ─

const CAT_DEFS: { name: string; subs: string[] }[] = [
  { name: '餐飲', subs: ['早餐', '午餐', '晚餐', '宵夜', '飲料', '零食', '外送', '聚餐'] },
  { name: '交通', subs: ['捷運', '公車', '計程車', 'Uber', '停車費', '油費', '高鐵', '台鐵', '飛機', '機車維修', '汽車維修'] },
  { name: '購物', subs: ['超市／食材', '日用品', '衣物', '3C／電器', '傢俱', '書籍', '文具', '保養品'] },
  { name: '娛樂', subs: ['電影', 'KTV', '遊戲', '旅遊', '運動', '展覽', '演唱會', '訂閱服務'] },
  { name: '醫療健康', subs: ['掛號', '藥品', '保健品', '牙醫', '眼科', '健身房'] },
  { name: '居家', subs: ['房租', '水費', '電費', '瓦斯', '網路', '管理費', '修繕', '清潔用品'] },
  { name: '教育', subs: ['學費', '補習班', '線上課程', '書籍／講義', '考照／證照'] },
  { name: '美容', subs: ['美髮', '美甲', '美睫', '化妝品', '保養品'] },
  { name: '寵物', subs: ['飼料', '寵物醫療', '寵物美容', '寵物用品'] },
  { name: '保險', subs: ['健保費', '車險', '壽險', '意外險', '其他保險'] },
  { name: '人情往來', subs: ['婚喪喜慶', '禮物', '聚餐請客', '捐款'] },
  { name: '其他', subs: ['雜費', '罰款', '手續費'] },
]

function buildCategories() {
  const cats = CAT_DEFS.map((def, pi) => {
    const parentId = `cat-${pi}`
    return {
      id: parentId,
      name: def.name,
      parent_id: null as string | null,
      position: pi,
      subcategories: def.subs.map((sub, si) => ({
        id: `cat-${pi}-${si}`,
        name: sub,
        parent_id: parentId,
        position: si,
        subcategories: [],
      })),
    }
  })
  return cats
}

// ── Seed transactions ─────────────────────────────────────────────────────────

function buildTransactions() {
  return []
}

// ── Seed builder ──────────────────────────────────────────────────────────────

export function buildSeedState(): DemoState {
  return {
    transactions: buildTransactions(),
    categories: buildCategories(),
    recurring_rules: [],
    ledgers: [
      {
        id: DEMO_PUBLIC_LEDGER_ID,
        name: '作伙帳本',
        owner_id: DEMO_USER_ID,
        is_public: true,
        default_currency: 'TWD',
        created_at: new Date().toISOString(),
      },
      {
        id: DEMO_TRAVEL_LEDGER_ID,
        name: '旅遊帳本',
        owner_id: DEMO_USER_ID,
        is_public: false,
        default_currency: 'TWD',
        created_at: new Date().toISOString(),
      },
    ],
    profile: { nickname: '訪客' },
    ledger_budgets: [],
  }
}
