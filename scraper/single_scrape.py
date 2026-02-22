import asyncio
import sys
import re
import json
from playwright.async_api import async_playwright
from playwright_stealth import Stealth

async def scrape_momo(page, url):
    try:
        await page.goto(url, wait_until="load", timeout=30000)
        # momo needs a bit of time for JS price to settle
        await asyncio.sleep(3)
        
        content = await page.content()
        title_match = re.search(r'<meta property="og:title" content="([^"]+)">', content)
        title = title_match.group(1) if title_match else "Unknown Title"
        
        price_val = await page.evaluate('''() => {
            const priceMeta = document.querySelector('meta[property="product:price:amount"]');
            if (priceMeta) return priceMeta.content;
            
            const selectors = ['.priceInfo .price', '.goodsPrice #price', '#priceSale', '.totalPrice'];
            for (const s of selectors) {
                const el = document.querySelector(s);
                if (el && el.innerText.replace(/[^\\d]/g, '')) {
                    return el.innerText.replace(/[^\\d]/g, '');
                }
            }
            return "0";
        }''')
        return {"title": title, "price": int(price_val) if price_val != "0" else 0}
    except Exception as e:
        return {"error": str(e), "price": 0}

async def scrape_pchome(page, url):
    try:
        await page.goto(url, wait_until="load", timeout=30000)
        await asyncio.sleep(4)
        
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
        
        return {"title": title, "price": int(price_val) if price_val != "0" else 0}
    except Exception as e:
        return {"error": str(e), "price": 0}

async def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No URL provided"}))
        return

    url = sys.argv[1]
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
        )
        page = await context.new_page()
        stealth_obj = Stealth()
        await stealth_obj.apply_stealth_async(page)
        
        result = {"error": "Platform not supported", "price": 0}
        if "momoshop.com.tw" in url:
            result = await scrape_momo(page, url)
        elif "pchome.com.tw" in url:
            result = await scrape_pchome(page, url)
            
        print(json.dumps(result))
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
