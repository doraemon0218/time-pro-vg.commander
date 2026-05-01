import { NextRequest } from 'next/server'
import fs from 'fs'
import path from 'path'

const SCHEDULES_DIR = path.join(process.cwd(), 'data', 'schedules')

function schedulePath(year: number, month: number): string {
  return path.join(SCHEDULES_DIR, `${year}-${String(month).padStart(2, '0')}.json`)
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const year = parseInt(searchParams.get('year') ?? '')
  const month = parseInt(searchParams.get('month') ?? '')
  if (isNaN(year) || isNaN(month)) {
    return Response.json({ error: 'year and month required' }, { status: 400 })
  }
  const fp = schedulePath(year, month)
  if (!fs.existsSync(fp)) {
    return Response.json(null)
  }
  return Response.json(JSON.parse(fs.readFileSync(fp, 'utf-8')))
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { year, month } = body
    if (!year || !month) {
      return Response.json({ error: 'year and month required' }, { status: 400 })
    }
    if (!fs.existsSync(SCHEDULES_DIR)) {
      fs.mkdirSync(SCHEDULES_DIR, { recursive: true })
    }
    fs.writeFileSync(schedulePath(year, month), JSON.stringify(body, null, 2), 'utf-8')
    return Response.json({ ok: true })
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
