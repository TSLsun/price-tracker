import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

const execAsync = promisify(exec)

// Use service role key on the server side for direct DB writes
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
    try {
        const { url, item_id } = await request.json()

        if (!url || !item_id) {
            return NextResponse.json({ error: 'url and item_id are required' }, { status: 400 })
        }

        // Fire-and-forget: run the scraper in the background
        // The result will be written directly to Supabase, triggering Realtime on the client
        ; (async () => {
            try {
                const scraperDir = path.join(process.cwd(), 'scraper')
                const scriptPath = path.join(scraperDir, 'single_scrape.py')
                console.log(`[scrape] Starting background scrape for item ${item_id}: ${url}`)

                const { stdout, stderr } = await execAsync(
                    `cd "${scraperDir}" && uv run python single_scrape.py "${url}"`,
                    { timeout: 120_000 } // 2 min hard timeout
                )

                if (stderr && !stdout) {
                    throw new Error('Scraper produced no output: ' + stderr)
                }

                const result = JSON.parse(stdout.trim())

                if (result.error || !result.price) {
                    await supabaseAdmin
                        .from('tracked_items')
                        .update({
                            status: 'error',
                            error_message: result.error || '無法取得價格',
                            last_checked_at: new Date().toISOString(),
                        })
                        .eq('id', item_id)
                    return
                }

                const updates: Record<string, unknown> = {
                    current_price: result.price,
                    status: 'done',
                    error_message: null,
                    last_checked_at: new Date().toISOString(),
                }

                // If a name wasn't provided by the user, use the scraped title
                if (result.title) {
                    // Only overwrite if the DB still has the placeholder value
                    const { data: existing } = await supabaseAdmin
                        .from('tracked_items')
                        .select('name')
                        .eq('id', item_id)
                        .single()
                    if (existing?.name === '抓取中...' || existing?.name === '') {
                        updates.name = result.title
                    }
                }

                await supabaseAdmin
                    .from('tracked_items')
                    .update(updates)
                    .eq('id', item_id)

                // Insert into price history
                await supabaseAdmin
                    .from('price_history')
                    .insert({ item_id, price: result.price })

                console.log(`[scrape] Done for item ${item_id}: price=${result.price}`)
            } catch (err: any) {
                console.error(`[scrape] Background scrape failed for item ${item_id}:`, err.message)
                await supabaseAdmin
                    .from('tracked_items')
                    .update({
                        status: 'error',
                        error_message: err.message || '爬蟲執行失敗',
                        last_checked_at: new Date().toISOString(),
                    })
                    .eq('id', item_id)
            }
        })()

        // Return immediately — the client listens via Realtime for the actual result
        return NextResponse.json({ ok: true, item_id }, { status: 202 })
    } catch (error: any) {
        console.error('[scrape] API Error:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}
