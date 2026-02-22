import asyncio
import os
import re
import json
from datetime import datetime
from dotenv import load_dotenv
from playwright.async_api import async_playwright
from playwright_stealth import Stealth
from supabase import create_client, Client
from linebot import LineBotApi
from linebot.models import TextSendMessage

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
LINE_TOKEN = os.getenv("LINE_CHANNEL_ACCESS_TOKEN")
LINE_USER_ID = os.getenv("LINE_USER_ID")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not found in environment.")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
# Note: LineBotApi is from v2, line-bot-sdk v3 has different patterns but v2 compatibility is often kept
line_bot_api = LineBotApi(LINE_TOKEN) if LINE_TOKEN else None

def send_line_notification(product_name, old_price, new_price, url):
    if not line_bot_api or not LINE_USER_ID:
        print("LINE notification skipped: Token or User ID missing.")
        return
    
    message = f"📉 降價通知！\n【{product_name}】\n舊價格: ${old_price}\n新價格: ${new_price}\n連結: {url}"
    try:
        line_bot_api.push_message(LINE_USER_ID, TextSendMessage(text=message))
        print(f"Sent LINE notification for {product_name}")
    except Exception as e:
        print(f"Error sending LINE notification: {e}")

async def scrape_momo(page, url):
    try:
        await page.goto(url, wait_until="load", timeout=60000)
        await asyncio.sleep(5)
        content = await page.content()
        title_match = re.search(r'<meta property="og:title" content="([^"]+)">', content)
        title = title_match.group(1) if title_match else "Unknown Title"
        price_val = await page.evaluate('''() => {
            const priceMeta = document.querySelector('meta[property="product:price:amount"]');
            if (priceMeta) return priceMeta.content;
            const selectors = ['.priceInfo .price', '.goodsPrice #price', '#priceSale', '.totalPrice'];
            for (const s of selectors) {
                const el = document.querySelector(s);
                if (el && el.innerText.replace(/[^\\d]/g, '')) return el.innerText.replace(/[^\\d]/g, '');
            }
            return "0";
        }''')
        return title, price_val
    except Exception as e:
        print(f"Error scraping momo: {e}")
        return None, "0"

async def scrape_pchome(page, url):
    try:
        await page.goto(url, wait_until="load", timeout=60000)
        await asyncio.sleep(7)
        price_val = await page.evaluate('''() => {
            const selectors = ['#Price_Real', '.prod_price .price', '.price_main .price', 'span[id*="price"]', 'span[class*="price"]'];
            for (const s of selectors) {
                const el = document.querySelector(s);
                if (el) {
                    const val = el.innerText.replace(/[^\\d]/g, '');
                    if (val && parseInt(val) > 0) return val;
                }
            }
            const matches = document.body.innerText.match(/(?:NT\\$|\\$)\\s*([\\d,]+)/);
            return matches ? matches[1].replace(/[^\\d]/g, '') : "0";
        }''')
        
        title_element = await page.query_selector('meta[property="og:title"]')
        title = await title_element.get_attribute("content") if title_element else "Unknown Title"
        return title, price_val
    except Exception as e:
        print(f"Error scraping PChome: {e}")
        return None, "0"

async def run_scraper():
    response = supabase.table("tracked_items").select("*").execute()
    items = response.data
    if not items:
        print("No items to track.")
        return

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        page = await context.new_page()
        stealth_obj = Stealth()
        await stealth_obj.apply_stealth_async(page)

        for item in items:
            item_id = item["id"]
            url = item["url"]
            old_price = item.get("current_price", 0)
            print(f"Checking {item['name']} ({url})...")
            
            title, price = None, "0"
            if "momoshop.com.tw" in url:
                title, price = await scrape_momo(page, url)
            elif "pchome.com.tw" in url:
                title, price = await scrape_pchome(page, url)
            
            if price != "0":
                price_num = int(price)
                print(f"Current price: {price_num}")
                
                if old_price > 0 and price_num < old_price:
                    send_line_notification(item['name'], old_price, price_num, url)
                
                supabase.table("tracked_items").update({
                    "current_price": price_num,
                    "last_checked_at": datetime.now().isoformat()
                }).eq("id", item_id).execute()
                
                supabase.table("price_history").insert({"item_id": item_id, "price": price_num}).execute()
            else:
                print(f"Failed to fetch price for {url}")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run_scraper())
