<p align="center">
  <img src="public/tsohue_banner.jpg" alt="做伙 Tsohue Banner" width="640" />
</p>

<h1 align="center">做伙 Tsohue</h1>

<p align="center">
  輕鬆記錄、即時同步的共同帳本。適合情侶、家庭或小團體。
</p>

<p align="center">
  <a href="https://tsohue-demo.vercel.app/dashboard" target="_blank" rel="noopener noreferrer">🌐 線上 Demo</a>
</p>

---

## 功能特色

- **共同帳本** — 多人共用同一帳本，即時同步每筆支出
- **多帳本管理** — 建立多個帳本（例如：日常帳本、旅遊帳本），分開管理
- **多幣別支援** — 支援 TWD、USD、JPY、EUR、CNY，自動換算匯率
- **月曆檢視** — 以月曆方式瀏覽每日支出，一目了然
- **報表分析** — 圓餅圖呈現各類別消費比例
- **CSV 匯入／匯出** — 支援資料備份與批次匯入
- **類別管理** — 自訂消費類別與子類別，支援拖曳排序
- **PWA 支援** — 可安裝至手機主畫面，離線瀏覽

## 技術架構

| 層級 | 技術 |
|------|------|
| 前端框架 | Next.js 16 (App Router + Turbopack) |
| 語言 | TypeScript |
| 樣式 | Tailwind CSS v4 + shadcn/ui |
| 資料庫 | Supabase (PostgreSQL + RLS) |
| 認證 | Supabase Auth（Email / 密碼） |
| 部署 | Vercel |

---

## 自行部署

### 事前準備

- [Node.js](https://nodejs.org/) 18 以上
- [Supabase](https://supabase.com/) 帳號（免費方案即可）
- [Vercel](https://vercel.com/) 帳號（選用，也可本地執行）

### 步驟一：取得原始碼

```bash
git clone https://github.com/jigoku1206/tsohue.git
cd tsohue
npm install
```

### 步驟二：建立 Supabase 專案

1. 前往 [supabase.com](https://supabase.com/)，建立新專案
2. 進入 **SQL Editor**，貼上 `supabase/schema.sql` 的全部內容並執行
3. 至 **Project Settings → API** 頁面，複製以下兩個值：
   - `Project URL`
   - `anon public` key

### 步驟三：設定環境變數

```bash
cp .env.local.example .env.local
```

編輯 `.env.local`：

```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

### 步驟四：本地執行

```bash
npm run dev
```

開啟瀏覽器前往 [http://localhost:3000](http://localhost:3000)，即可開始使用。

### 步驟五：部署至 Vercel（選用）

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/jigoku1206/tsohue)

或透過 Vercel CLI：

```bash
npm i -g vercel
vercel --prod
```

部署時在 Vercel 的 **Environment Variables** 設定 `NEXT_PUBLIC_SUPABASE_URL` 與 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 即可。

---

## 本地開發指令

```bash
npm run dev    # 啟動開發伺服器
npm run build  # 正式版建置
npm run lint   # ESLint 檢查
```

---

## 關於此專案

> 本專案的程式碼、架構設計、資料庫 Schema、UI 元件與文件，**均由 AI（Claude）全程生成**。
> 人工參與的部分僅包含：需求定義、功能方向決策、代碼 Review 與實際測試驗證。
>
> 此專案作為 AI 輔助開發的實驗性成果公開，歡迎參考或延伸使用。
