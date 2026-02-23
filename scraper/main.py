import asyncio
import os
import re
from datetime import datetime
from dotenv import load_dotenv
from playwright.async_api import async_playwright, Page
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
line_bot_api = LineBotApi(LINE_TOKEN) if LINE_TOKEN else None

def send_line_notification(product_name, old_price, new_price, url):
    if not line_bot_api or not LINE_USER_ID:
        print("LINE notification skipped: Token or User ID missing.")
        return
    
    message = f"📉 降價通知！\n【{product_name}】\n舊價格: ${old_price}\n新價格: ${new_price}\n連結: {url}"
    try:
        line_bot_api.push_message(LINE_USER_ID, TextSendMessage(text=message))
        print(f"    => Sent LINE notification for {product_name}")
    except Exception as e:
        print(f"    => Error sending LINE notification: {e}")

def _process_successful_scrape(item: dict, price_num: int, title: str):
    """Helper function to process a successful scrape and update database."""
    item_id = item["id"]
    url = item["url"]
    old_price = item.get("current_price")

    print(f"  - Success for '{item['name']}'. Price: {price_num}")

    # Check for name changes from scrape
    if title and title != "Unknown Title" and item['name'] != title:
         print(f"    - Product name changed from '{item['name']}' to '{title}'. Updating.")
         supabase.table("tracked_items").update({"name": title}).eq("id", item_id).execute()
         item['name'] = title # Update name for potential notification

    # Check for price drop and send notification
    if old_price is not None and old_price > 0 and price_num < old_price:
        send_line_notification(item['name'], old_price, price_num, url)

    # Update item price and timestamp
    supabase.table("tracked_items").update({
        "current_price": price_num,
        "last_checked_at": datetime.now().isoformat(),
    }).eq("id", item_id).execute()
    
    # Record price history
    supabase.table("price_history").insert({"item_id": item_id, "price": price_num}).execute()


async def scrape_momo(page, url):
    try:
        await page.goto(url, wait_until="load", timeout=60000)
        await asyncio.sleep(5)
        content = await page.content()
        title_match = re.search(r'<meta property="og:title" content="([^"]+)">', content)
        title = title_match.group(1).strip() if title_match else "Unknown Title"
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
            const script_matches = document.body.innerHTML.match(/"price"\\s*:\\s*(\\d+)/);
            if(script_matches && script_matches[1]) return script_matches[1];
            
            const text_matches = document.body.innerText.match(/(?:NT\\$|\\$)\\s*([\\d,]+)/);
            return text_matches ? text_matches[1].replace(/[^\\d]/g, '') : "0";
        }''')
        
        title_element = await page.query_selector('meta[property="og:title"]')
        title = await title_element.get_attribute("content") if title_element else "Unknown Title"
        return title.strip(), price_val
    except Exception as e:
        print(f"Error scraping PChome: {e}")
        return None, "0"

async def _scrape_item(page: Page, item: dict):
    """Selects the correct scraper for an item and executes it."""
    url = item["url"]
    if "momoshop.com.tw" in url:
        return await scrape_momo(page, url)
    elif "pchome.com.tw" in url:
        return await scrape_pchome(page, url)
    return None, "0" # Platform not supported

async def run_scraper():
    response = supabase.table("tracked_items").select("*").execute()
    all_items = response.data
    if not all_items:
        print("No items to track.")
        return

    # Filter out items that have already been checked today
    items_to_scrape = []
    today = datetime.now().date()
    for item in all_items:
        last_checked_str = item.get("last_checked_at")
        if last_checked_str:
            if last_checked_str.endswith('Z'):
                last_checked_str = last_checked_str[:-1] + '+00:00'
            last_checked_date = datetime.fromisoformat(last_checked_str).date()
            if last_checked_date == today:
                print(f"Skipping '{item['name']}' - already checked today.")
                continue
        items_to_scrape.append(item)

    if not items_to_scrape:
        print("All items are up-to-date for today.")
        return

    failed_items = []
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        page = await context.new_page()
        stealth_obj = Stealth()
        await stealth_obj.apply_stealth_async(page)

        # --- Initial Scrape Pass ---
        print(f"\n--- Starting initial scrape for {len(items_to_scrape)} items ---")
        for item in items_to_scrape:
            print(f"Checking '{item['name']}'...")
            title, price = await _scrape_item(page, item)
            
            if price and price != "0":
                _process_successful_scrape(item, int(price), title)
            else:
                print(f"  - Initial attempt failed for '{item['name']}'. Will retry.")
                failed_items.append(item)
        
        # --- Retry Passes ---
        total_attempts = 3
        delay = 10 # Start with a 10-second delay before the first retry
        for i in range(1, total_attempts): # Starts from attempt #2
            if not failed_items:
                break
            
            print(f"\n--- Retrying {len(failed_items)} failed items (Attempt {i+1}/{total_attempts}) after {delay}s ---")
            await asyncio.sleep(delay)
            
            still_failing = []
            for item in failed_items:
                print(f"Retrying '{item['name']}'...")
                title, price = await _scrape_item(page, item)

                if price and price != "0":
                    _process_successful_scrape(item, int(price), title)
                else:
                    still_failing.append(item)
            
            failed_items = still_failing
            delay *= 2 # Exponential backoff for the next retry pass

        if failed_items:
            print(f"\n--- Completed all retries. {len(failed_items)} items still failing. ---")
            for item in failed_items:
                 print(f"  - Final failure for: '{item['name']}' ({item['url']})")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run_scraper())
