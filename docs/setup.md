# 安裝與設定

請按照以下步驟在您的本地環境建立 Price Tracker。

## 1. 環境需求
*   Node.js 18+
*   Python 3.12+
*   Supabase 帳號
*   LINE Messaging API 帳號 (可申請開發者帳號)

## 2. 安裝步驟

### 下載專案
```bash
git clone https://github.com/your-repo/price-tracker.git
cd price-tracker
```

### 前端設定
1. 安裝套件：
   ```bash
   npm install
   ```
2. 建立 `.env.local` 文件：
   ```env
   NEXT_PUBLIC_SUPABASE_URL=你的_URL
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=你的_Key
   ```
3. 啟動開發伺服器：
   ```bash
   npm run dev
   ```

### 爬蟲設定
1. 進入爬蟲資料夾並安裝環境：
   ```bash
   cd scraper
   uv sync
   ```
2. 設定環境變數 `.env`：
   ```env
   SUPABASE_URL=你的_URL
   SUPABASE_SERVICE_ROLE_KEY=你的_Service_Role_Key
   LINE_CHANNEL_ACCESS_TOKEN=你的_LINE_Token
   LINE_USER_ID=你的_LINE_ID
   ```
3. 初始化 Playwright：
   ```bash
   uv run playwright install chromium
   ```

## 3. 資料庫初始化
請參考 [Supabase Setup Guide](https://github.com/your-repo/price-tracker/blob/main/supabase_setup.md) 執行 SQL 腳本建立資料表與 RLS 權限。

## 4. 如何啟動巡檢
當您在前端加入商品後，隨時點擊手動檢查或是設定定時任務執行：
```bash
uv run main.py
```
