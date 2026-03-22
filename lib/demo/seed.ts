import type { DemoState } from './storage'

export const DEMO_USER_ID = 'demo-user'
export const DEMO_PUBLIC_LEDGER_ID = 'demo-public-ledger'
export const DEMO_TRAVEL_LEDGER_ID = 'demo-travel-ledger'

// ── Helper ───────────────────────────────────────────────────────────────────

let _uid = 1
function uid() {
  return `demo-${Date.now()}-${_uid++}`
}

function thisMonth(day: number): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}-${String(day).padStart(2, '0')}`
}

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
  const now = new Date()
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const safeDay = (d: number) => Math.min(d, lastDay)

  const pub = DEMO_PUBLIC_LEDGER_ID
  const trv = DEMO_TRAVEL_LEDGER_ID

  return [
    // Public ledger — 作伙帳本
    { id: uid(), date: thisMonth(safeDay(3)),  amount: 85,   currency: 'TWD', exchange_rate: 1, category: '餐飲',     subcategory: '早餐',    paid_by: '小美', note: null,       user_id: DEMO_USER_ID, ledger_id: pub, created_at: '' },
    { id: uid(), date: thisMonth(safeDay(4)),  amount: 320,  currency: 'TWD', exchange_rate: 1, category: '餐飲',     subcategory: '外送',    paid_by: '阿明', note: '晚餐外送',  user_id: DEMO_USER_ID, ledger_id: pub, created_at: '' },
    { id: uid(), date: thisMonth(safeDay(5)),  amount: 120,  currency: 'TWD', exchange_rate: 1, category: '交通',     subcategory: '捷運',    paid_by: '小美', note: null,       user_id: DEMO_USER_ID, ledger_id: pub, created_at: '' },
    { id: uid(), date: thisMonth(safeDay(6)),  amount: 850,  currency: 'TWD', exchange_rate: 1, category: '購物',     subcategory: '超市／食材', paid_by: '阿明', note: '週末採買', user_id: DEMO_USER_ID, ledger_id: pub, created_at: '' },
    { id: uid(), date: thisMonth(safeDay(8)),  amount: 540,  currency: 'TWD', exchange_rate: 1, category: '娛樂',     subcategory: '電影',    paid_by: '小美', note: '兩人',     user_id: DEMO_USER_ID, ledger_id: pub, created_at: '' },
    { id: uid(), date: thisMonth(safeDay(10)), amount: 1250, currency: 'TWD', exchange_rate: 1, category: '居家',     subcategory: '電費',    paid_by: '阿明', note: null,       user_id: DEMO_USER_ID, ledger_id: pub, created_at: '' },
    { id: uid(), date: thisMonth(safeDay(12)), amount: 1680, currency: 'TWD', exchange_rate: 1, category: '餐飲',     subcategory: '聚餐',    paid_by: '小美', note: '朋友聚餐', user_id: DEMO_USER_ID, ledger_id: pub, created_at: '' },
    { id: uid(), date: thisMonth(safeDay(13)), amount: 380,  currency: 'TWD', exchange_rate: 1, category: '醫療健康', subcategory: '藥品',    paid_by: '阿明', note: null,       user_id: DEMO_USER_ID, ledger_id: pub, created_at: '' },
    { id: uid(), date: thisMonth(safeDay(15)), amount: 250,  currency: 'TWD', exchange_rate: 1, category: '交通',     subcategory: 'Uber',    paid_by: '小美', note: null,       user_id: DEMO_USER_ID, ledger_id: pub, created_at: '' },
    { id: uid(), date: thisMonth(safeDay(16)), amount: 460,  currency: 'TWD', exchange_rate: 1, category: '購物',     subcategory: '日用品',  paid_by: '阿明', note: null,       user_id: DEMO_USER_ID, ledger_id: pub, created_at: '' },
    { id: uid(), date: thisMonth(safeDay(18)), amount: 180,  currency: 'TWD', exchange_rate: 1, category: '餐飲',     subcategory: '午餐',    paid_by: '小美', note: null,       user_id: DEMO_USER_ID, ledger_id: pub, created_at: '' },
    { id: uid(), date: thisMonth(safeDay(19)), amount: 149,  currency: 'TWD', exchange_rate: 1, category: '娛樂',     subcategory: '訂閱服務', paid_by: '阿明', note: 'Netflix', user_id: DEMO_USER_ID, ledger_id: pub, created_at: '' },
    { id: uid(), date: thisMonth(safeDay(20)), amount: 840,  currency: 'TWD', exchange_rate: 1, category: '交通',     subcategory: '高鐵',    paid_by: '小美', note: '回家',     user_id: DEMO_USER_ID, ledger_id: pub, created_at: '' },
    { id: uid(), date: thisMonth(safeDay(21)), amount: 130,  currency: 'TWD', exchange_rate: 1, category: '餐飲',     subcategory: '飲料',    paid_by: '阿明', note: null,       user_id: DEMO_USER_ID, ledger_id: pub, created_at: '' },
    { id: uid(), date: thisMonth(safeDay(22)), amount: 2390, currency: 'TWD', exchange_rate: 1, category: '購物',     subcategory: '衣物',    paid_by: '小美', note: null,       user_id: DEMO_USER_ID, ledger_id: pub, created_at: '' },
    { id: uid(), date: thisMonth(safeDay(23)), amount: 499,  currency: 'TWD', exchange_rate: 1, category: '居家',     subcategory: '網路',    paid_by: '阿明', note: null,       user_id: DEMO_USER_ID, ledger_id: pub, created_at: '' },
    { id: uid(), date: thisMonth(safeDay(24)), amount: 280,  currency: 'TWD', exchange_rate: 1, category: '餐飲',     subcategory: '晚餐',    paid_by: '小美', note: null,       user_id: DEMO_USER_ID, ledger_id: pub, created_at: '' },
    // JPY transaction
    { id: uid(), date: thisMonth(safeDay(25)), amount: 18500, currency: 'JPY', exchange_rate: 0.2198, category: '娛樂', subcategory: '旅遊', paid_by: '阿明', note: '東京景點', user_id: DEMO_USER_ID, ledger_id: pub, created_at: '' },
    // Travel ledger — 旅遊帳本
    { id: uid(), date: thisMonth(safeDay(14)), amount: 680,  currency: 'TWD', exchange_rate: 1, category: '餐飲',     subcategory: null,      paid_by: '小美', note: '旅途中',   user_id: DEMO_USER_ID, ledger_id: trv, created_at: '' },
    { id: uid(), date: thisMonth(safeDay(14)), amount: 9800, currency: 'TWD', exchange_rate: 1, category: '交通',     subcategory: '飛機',    paid_by: '阿明', note: '來回機票', user_id: DEMO_USER_ID, ledger_id: trv, created_at: '' },
    { id: uid(), date: thisMonth(safeDay(15)), amount: 480,  currency: 'TWD', exchange_rate: 1, category: '娛樂',     subcategory: '展覽',    paid_by: '小美', note: null,       user_id: DEMO_USER_ID, ledger_id: trv, created_at: '' },
    { id: uid(), date: thisMonth(safeDay(16)), amount: 4200, currency: 'TWD', exchange_rate: 1, category: '居家',     subcategory: null,      paid_by: '阿明', note: '住宿',     user_id: DEMO_USER_ID, ledger_id: trv, created_at: '' },
  ]
}

// ── Seed builder ──────────────────────────────────────────────────────────────

export function buildSeedState(): DemoState {
  return {
    transactions: buildTransactions(),
    categories: buildCategories(),
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
  }
}
