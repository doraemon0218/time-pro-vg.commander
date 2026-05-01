import { NextRequest } from 'next/server'
import fs from 'fs'
import path from 'path'

const SETTINGS_PATH = path.join(process.cwd(), 'data', 'settings.json')

export async function GET() {
  try {
    const raw = fs.readFileSync(SETTINGS_PATH, 'utf-8')
    return Response.json(JSON.parse(raw))
  } catch {
    return Response.json({ error: 'Settings not found' }, { status: 404 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(body, null, 2), 'utf-8')
    return Response.json({ ok: true })
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
