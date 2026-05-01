import { type DayEntry, type AppSettings, type SubmitResult } from '@/types'

// ================================================================
// Time Pro VG (タイムプロVG) Playwright 自動化
//
// ⚠️ セレクタの設定について:
//   実際のTime Pro VG画面を確認し、下記セレクタを調整してください。
//   ブラウザの開発者ツール → 要素を右クリック → 「コピー > CSSセレクタ」
// ================================================================

const SELECTORS = {
  // ログイン画面
  login: {
    companyId: 'input[name="companyId"], input[id*="company"], input[placeholder*="会社"]',
    username:  'input[name="userId"], input[name="loginId"], input[id*="user"], input[type="text"]',
    password:  'input[name="password"], input[type="password"]',
    submit:    'button[type="submit"], input[type="submit"], button:has-text("ログイン"), button:has-text("LOGIN")',
  },
  // ログイン後: 打刻修正申請ページへのリンク or メニュー
  nav: {
    correctionMenu: 'a:has-text("打刻修正"), a:has-text("修正申請"), a[href*="correct"], a[href*="fix"]',
  },
  // 打刻修正申請フォーム
  correction: {
    // 日付選択（日付入力 or カレンダー）
    dateInput:   'input[name="date"], input[id*="date"], input[type="date"]',
    // 出勤時刻
    clockInHour:  'select[name="attendanceHour"], select[id*="inHour"]',
    clockInMin:   'select[name="attendanceMin"], select[id*="inMin"]',
    clockInTime:  'input[name="attendanceTime"], input[id*="clockIn"]',
    // 退勤時刻
    clockOutHour: 'select[name="leaveHour"], select[id*="outHour"]',
    clockOutMin:  'select[name="leaveMin"], select[id*="outMin"]',
    clockOutTime: 'input[name="leaveTime"], input[id*="clockOut"]',
    // 理由・コメント
    reason:      'textarea[name="reason"], input[name="reason"], textarea[id*="reason"]',
    // 申請ボタン
    submit:      'button[type="submit"]:has-text("申請"), button:has-text("申請する"), input[value="申請"]',
    // 確認ダイアログの「OK」
    confirmOk:   'button:has-text("OK"), button:has-text("確認"), button:has-text("はい")',
  },
}

export type AutomationLog = (msg: string) => void

export async function runAutomation(
  entries: DayEntry[],
  settings: AppSettings,
  log: AutomationLog = console.log,
): Promise<SubmitResult[]> {
  // Playwright は Node.js 実行時のみ import
  const { chromium } = await import('playwright')

  const results: SubmitResult[] = entries.map(e => ({
    date: e.date,
    status: 'pending',
  }))

  const browser = await chromium.launch({ headless: settings.headless })
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    // ─── ログイン ───
    log(`[LOGIN] ${settings.timeproUrl} へアクセス中...`)
    await page.goto(settings.timeproUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })

    // ユーザー名・パスワードを入力してログイン
    try {
      await page.fill(SELECTORS.login.username, settings.username)
      await page.fill(SELECTORS.login.password, settings.password)
      await page.click(SELECTORS.login.submit)
      await page.waitForLoadState('domcontentloaded')
      log('[LOGIN] ログイン完了')
    } catch {
      log('[LOGIN] ⚠️ ログインフォームが見つかりませんでした。URLとセレクタを確認してください。')
      throw new Error('LOGIN_FAILED')
    }

    // ─── 各日の打刻修正申請 ───
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]
      log(`[${i + 1}/${entries.length}] ${entry.date} の修正申請を開始...`)

      try {
        await submitOneDay(page, entry, settings.correctionReason, log)
        results[i].status = 'success'
        log(`[${i + 1}/${entries.length}] ✓ ${entry.date} 完了`)
      } catch (err) {
        results[i].status = 'error'
        results[i].message = err instanceof Error ? err.message : String(err)
        log(`[${i + 1}/${entries.length}] ✗ ${entry.date} エラー: ${results[i].message}`)
      }

      // サーバー負荷軽減のため少し待機
      await page.waitForTimeout(1000)
    }
  } catch (err) {
    log(`[ERROR] 自動化エラー: ${err instanceof Error ? err.message : String(err)}`)
    // 未処理のエントリをエラーに設定
    for (const r of results) {
      if (r.status === 'pending') {
        r.status = 'error'
        r.message = '処理前にエラーが発生しました'
      }
    }
  } finally {
    await browser.close()
  }

  return results
}

async function submitOneDay(
  page: Awaited<ReturnType<typeof import('playwright')['chromium']['launch']>> extends infer B
    ? B extends { newContext(): Promise<infer C> }
      ? C extends { newPage(): Promise<infer P> }
        ? P
        : never
      : never
    : never,
  entry: DayEntry,
  reason: string,
  log: AutomationLog,
) {
  // 打刻修正申請ページへ遷移
  // ※ 実際のURLに合わせて修正が必要な場合があります
  // Time Pro VG では、月次カレンダーから日付をクリックして修正画面を開く場合が多い

  const [hIn, mIn] = entry.clockIn.split(':')
  const [hOut, mOut] = entry.clockOut.split(':')

  // ① カレンダー上の該当日付セルをクリック
  const dateParts = entry.date.split('-')
  const dayNum = parseInt(dateParts[2], 10)

  // カレンダーセルのセレクタ（日付番号でマッチ）
  // 実際のTime Pro VGの実装によって変わります
  const dayCell = page.locator(`td:has-text("${dayNum}"), a:has-text("${dayNum}")`).first()
  await dayCell.click({ timeout: 10000 })
  await page.waitForLoadState('domcontentloaded')
  log(`  → ${dayNum}日のセルをクリック`)

  // ② 修正申請フォームを探して入力
  // 出勤時刻 (select型の場合)
  const inHourSel = page.locator(SELECTORS.correction.clockInHour).first()
  if (await inHourSel.isVisible({ timeout: 3000 }).catch(() => false)) {
    await inHourSel.selectOption(hIn)
    await page.locator(SELECTORS.correction.clockInMin).first().selectOption(mIn)
    await page.locator(SELECTORS.correction.clockOutHour).first().selectOption(hOut)
    await page.locator(SELECTORS.correction.clockOutMin).first().selectOption(mOut)
  } else {
    // input型の場合
    const inTimeSel = page.locator(SELECTORS.correction.clockInTime).first()
    if (await inTimeSel.isVisible({ timeout: 3000 }).catch(() => false)) {
      await inTimeSel.fill(entry.clockIn)
      await page.locator(SELECTORS.correction.clockOutTime).first().fill(entry.clockOut)
    }
  }

  // ③ 申請理由を入力
  const reasonField = page.locator(SELECTORS.correction.reason).first()
  if (await reasonField.isVisible({ timeout: 2000 }).catch(() => false)) {
    await reasonField.fill(reason)
  }

  // ④ 申請ボタンを押す
  await page.locator(SELECTORS.correction.submit).first().click({ timeout: 10000 })

  // ⑤ 確認ダイアログが出た場合はOKを押す
  const confirmBtn = page.locator(SELECTORS.correction.confirmOk).first()
  if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await confirmBtn.click()
  }

  await page.waitForLoadState('domcontentloaded')
}
