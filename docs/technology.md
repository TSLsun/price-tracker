# 技術架構

Price Tracker 採用前後端分離的架構，並透過雲端資料庫進行數據同步。

## 前端 (Frontend)
*   **框架**：Next.js 15 (App Router)
*   **樣式**：Vanilla CSS + Tailwind CSS v4
*   **動畫**：Framer Motion (用於流暢的彈窗與列表動畫)
*   **圖標**：Lucide React
*   **API**：內建 Next.js API Routes 作為爬蟲橋接器

## 後端 (Backend/Scraper)
*   **語言**：Python 3.12+
*   **環境管理**：`uv` (高速 Python 套件管理工具)
*   **爬蟲核心**：Playwright + `playwright-stealth`
*   **通知**：`line-bot-sdk` (LINE Messaging API)

## 資料庫 (Database)
*   **服務商**：Supabase (Postgres)
*   **安全**：Row Level Security (RLS) 確保數據安全。
*   **重要資料表**：
    *   `categories`: 儲存商品分類。
    *   `tracked_items`: 儲存追蹤商品的連結、當前價格與單位規格。
    *   `price_history`: 儲存歷史價格。

## 自動化 (Automation)
*   **排程**：建議使用 GitHub Actions 定時執行 `scraper/main.py`。
