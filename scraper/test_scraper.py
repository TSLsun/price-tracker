import asyncio
from playwright.async_api import async_playwright
from playwright_stealth import Stealth
import json
import re
import requests

async def scrape_momo(url):
    print(f"Scraping momo: {url}")
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = await context.new_page()
        stealth_obj = Stealth()
        await stealth_obj.apply_stealth_async(page)
        
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
                    if (el && el.innerText.replace(/[^\\d]/g, '')) {
                        return el.innerText.replace(/[^\\d]/g, '');
                    }
                }
                return "0";
            }''')
            
            return {
                "platform": "momo",
                "title": title,
                "price": price_val,
                "url": url
            }
        except Exception as e:
            print(f"Error scraping momo: {e}")
            return None
        finally:
            await browser.close()

async def scrape_pchome(url):
    print(f"Scraping PChome: {url}")
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = await context.new_page()
        stealth_obj = Stealth()
        await stealth_obj.apply_stealth_async(page)
        
        try:
            await page.goto(url, wait_until="load", timeout=60000)
            await asyncio.sleep(7) # More time for PChome
            
            # Robust price extraction for PChome
            price_info = await page.evaluate('''() => {
                const results = [];
                
                // 1. Try common selectors
                const selectors = ['#Price_Real', '.prod_price .price', '.price_main .price', 'span[id*="price"]', 'span[class*="price"]'];
                for (const s of selectors) {
                    const el = document.querySelector(s);
                    if (el) {
                        const val = el.innerText.replace(/[^\\d]/g, '');
                        if (val && parseInt(val) > 0) results.push({source: 'selector:'+s, val: val});
                    }
                }
                
                // 2. Search all text for currency patterns
                const allText = document.body.innerText;
                const matches = allText.match(/(?:NT\\$|\\$)\\s*([\\d,]+)/g);
                if (matches) {
                    for (const m of matches) {
                        const val = m.replace(/[^\\d]/g, '');
                        if (val && parseInt(val) > 100) results.push({source: 'regex', val: val});
                    }
                }
                
                // 3. Check for Out of Stock
                const isOutOfStock = /缺貨中|售完|補貨中/.test(allText);
                
                return {results, isOutOfStock};
            }''')
            
            title_element = await page.query_selector('meta[property="og:title"]')
            title = await title_element.get_attribute("content") if title_element else "Unknown Title"
            
            # Pick the best price candidate (usually the first or highest)
            price_val = "0"
            if price_info['results']:
                # Simple logic: pick the first one matching the target price roughly
                price_val = price_info['results'][0]['val']
            elif price_info['isOutOfStock']:
                price_val = "OUT_OF_STOCK"

            return {
                "platform": "pchome",
                "title": title,
                "price": price_val,
                "url": url,
                "debug_info": price_info['results']
            }
        except Exception as e:
            print(f"Error scraping PChome: {e}")
            return None
        finally:
            await browser.close()

async def main():
    momo_url = "https://www.momoshop.com.tw/goods/GoodsDetail.jsp?i_code=10028667&Area=search&mdiv=403&oid=1_4&cid=index&kw=%E6%BF%BE%E7%B6%B2"
    pchome_url = "https://24h.pchome.com.tw/prod/DMAU0D-A900BLC20?recommend_id=recapi-568575bff5-cx4m5_test01_1771721187_557599"
    
    results = []
    
    momo_result = await scrape_momo(momo_url)
    if momo_result:
        results.append(momo_result)
        
    pchome_result = await scrape_pchome(pchome_url)
    if pchome_result:
        results.append(pchome_result)
        
    print("\n--- Scraper Results ---")
    print(json.dumps(results, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    asyncio.run(main())
