// 日本の祝日 (2025-2027)
// 振替休日は考慮しない（簡易版）

function nthWeekday(year: number, month: number, weekday: number, n: number): string {
  // month: 1-12, weekday: 0=Sun..6=Sat, n: 1-based nth
  let count = 0
  const d = new Date(year, month - 1, 1)
  while (d.getMonth() === month - 1) {
    if (d.getDay() === weekday) {
      count++
      if (count === n) return `${year}-${String(month).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    }
    d.setDate(d.getDate() + 1)
  }
  return ''
}

function fixed(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function getJapaneseHolidays(year: number): Set<string> {
  const h = new Set<string>()

  // 元日
  h.add(fixed(year, 1, 1))
  // 成人の日 (1月第2月曜)
  h.add(nthWeekday(year, 1, 1, 2))
  // 建国記念日
  h.add(fixed(year, 2, 11))
  // 天皇誕生日
  h.add(fixed(year, 2, 23))
  // 春分の日 (概算: 3/20 or 3/21)
  h.add(fixed(year, 3, year <= 2026 ? 20 : 20))
  // 昭和の日
  h.add(fixed(year, 4, 29))
  // 憲法記念日
  h.add(fixed(year, 5, 3))
  // みどりの日
  h.add(fixed(year, 5, 4))
  // こどもの日
  h.add(fixed(year, 5, 5))
  // 海の日 (7月第3月曜)
  h.add(nthWeekday(year, 7, 1, 3))
  // 山の日
  h.add(fixed(year, 8, 11))
  // 敬老の日 (9月第3月曜)
  h.add(nthWeekday(year, 9, 1, 3))
  // 秋分の日 (概算: 9/22 or 9/23)
  h.add(fixed(year, 9, 22))
  // スポーツの日 (10月第2月曜)
  h.add(nthWeekday(year, 10, 1, 2))
  // 文化の日
  h.add(fixed(year, 11, 3))
  // 勤労感謝の日
  h.add(fixed(year, 11, 23))
  // 天皇誕生日 (12/23 was old, now 2/23)
  // 振替休日（簡易: 日曜祝日の翌月曜）
  const arr = [...h]
  for (const dateStr of arr) {
    const d = new Date(dateStr + 'T00:00:00')
    if (d.getDay() === 0) {
      const next = new Date(d)
      next.setDate(next.getDate() + 1)
      const y = next.getFullYear()
      const m = String(next.getMonth() + 1).padStart(2, '0')
      const day = String(next.getDate()).padStart(2, '0')
      h.add(`${y}-${m}-${day}`)
    }
  }

  h.delete('')
  return h
}
