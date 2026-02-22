import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'

const execAsync = promisify(exec)

export async function POST(request: Request) {
    try {
        const { url } = await request.json()

        if (!url) {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 })
        }

        // Path to the scraper script
        const scraperDir = path.join(process.cwd(), 'scraper')
        const scriptPath = path.join(scraperDir, 'single_scrape.py')

        console.log(`Executing single scrape for: ${url}`)

        // Execute using 'uv run' to ensure the environment is correct
        // We wrap in a promise to handle stderr if needed
        const { stdout, stderr } = await execAsync(`cd "${scraperDir}" && uv run python single_scrape.py "${url}"`)

        if (stderr && !stdout) {
            console.error('Scraper stderr:', stderr)
            return NextResponse.json({ error: 'Scraper execution failed' }, { status: 500 })
        }

        try {
            const result = JSON.parse(stdout.trim())
            return NextResponse.json(result)
        } catch (parseError) {
            console.error('Failed to parse scraper output:', stdout)
            return NextResponse.json({ error: 'Invalid scraper output' }, { status: 500 })
        }

    } catch (error: any) {
        console.error('API Error:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}
