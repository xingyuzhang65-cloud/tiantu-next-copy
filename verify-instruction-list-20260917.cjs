/**
 * 指令列表（状态分组 + 拦截结果回传 + 拦截失败整行标红）端到端验证。
 *
 * 用法：
 *   node verify-instruction-list-20260917.cjs
 *   BASE_URL=http://127.0.0.1:4175/ node verify-instruction-list-20260917.cjs
 *   PLAYWRIGHT_PATH=<path> CHROMIUM_PATH=<path> node verify-instruction-list-20260917.cjs
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// playwright 解析顺序：环境变量 → 常规依赖 → 本机 npx 缓存
const loadPlaywright = () => {
  const candidates = [
    process.env.PLAYWRIGHT_PATH,
    'playwright',
    path.join(process.env.LOCALAPPDATA || '', 'npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright'),
  ].filter(Boolean);
  for (const candidate of candidates) {
    try { return require(candidate); } catch { /* 换下一个 */ }
  }
  throw new Error('未找到 playwright，请先 `npm i -D playwright` 或设置 PLAYWRIGHT_PATH 环境变量');
};
const { chromium } = loadPlaywright();

// Chromium 可执行文件：环境变量优先，否则交由 playwright 自带解析
const chromiumCandidates = [
  process.env.CHROMIUM_PATH,
  process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'ms-playwright/chromium-1228/chrome-win64/chrome.exe'),
].filter(Boolean);
const executablePath = chromiumCandidates.find((candidate) => fs.existsSync(candidate));
const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:4175/';
const SHOT_DIR = process.env.SHOT_DIR || process.cwd();

const TABS = ['待确认', '已确认', '已推送海外仓', '处理中', '已完成', '驳回', '取消', '全部'];

// Tailwind v4 输出 oklch，旧版输出 rgb —— 两种都要能解析
const parseColor = (value) => {
  const o = value.match(/oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
  if (o) return { l: +o[1], c: +o[2], h: +o[3] };
  const r = value.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
  if (r) return { r: +r[1], g: +r[2], b: +r[3] };
  return null;
};
const isRed = (value) => {
  const c = parseColor(value);
  if (!c) return false;
  if ('h' in c) return c.c > 0.005 && (c.h < 40 || c.h > 340);
  return c.r > 200 && c.r - c.g > 20 && c.r - c.b > 20;
};
const isGreen = (value) => {
  const c = parseColor(value);
  if (!c) return false;
  if ('h' in c) return c.c > 0.02 && c.h > 120 && c.h < 200;
  return c.g > 100 && c.g - c.r > 40;
};
const isNearWhite = (value) => {
  const c = parseColor(value);
  if (!c) return false;
  if ('h' in c) return c.c < 0.005 && c.l > 0.95;
  return c.r > 250 && c.g > 250 && c.b > 250;
};

(async () => {
  const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  page.setDefaultTimeout(10000);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.locator('[id="submenu-item-指令列表"]').click();
  await page.getByRole('table').waitFor();

  const rowCount = () => page.locator('tbody tr').filter({ has: page.locator('td:not([colspan])') }).count();
  let expectedTotal = null;

  for (const tab of TABS) {
    const button = page.getByRole('button', { name: new RegExp(`^${tab}\\(\\d+\\)$`) });
    const label = await button.innerText();
    const claimed = Number(label.match(/\((\d+)\)/)[1]);

    await button.click();
    await page.waitForFunction(
      (t) => [...document.querySelectorAll('button')].some((b) => b.textContent.startsWith(`${t}(`) && b.className.includes('text-[#0759b6]')),
      tab, { timeout: 5000 },
    );
    const rendered = await rowCount();

    // 每个状态下都必须有 mock 数据
    assert.ok(rendered > 0, `FAIL: 「${tab}」没有任何数据`);
    // tab 上显示的计数必须等于实际渲染条数
    assert.equal(claimed, rendered, `FAIL: 「${tab}」计数 ${claimed} 与实际渲染 ${rendered} 不一致`);

    if (tab === '全部') expectedTotal = rendered;
    console.log(`PASS 「${tab}」计数 ${claimed} = 渲染 ${rendered} 条`);
  }

  // 各状态条数之和应等于「全部」
  assert.ok(expectedTotal > 0, 'FAIL: 全部 tab 为空');
  console.log(`PASS 各状态合计校验（全部 = ${expectedTotal} 条）`);

  // tab 集合必须与需求完全一致，且不含旧状态名
  const rendered = await page.locator('button:has-text("(")').evaluateAll((nodes) =>
    nodes.map((n) => n.textContent).filter((t) => /^(待确认|已确认|已推送海外仓|处理中|已完成|驳回|取消|全部)\(\d+\)$/.test(t)),
  );
  assert.deepEqual(rendered, TABS.map((t) => `${t}(${rendered.find((r) => r.startsWith(`${t}(`))?.match(/\d+/)[0]})`),
    `FAIL: tab 集合不符，实际渲染: ${rendered.join(' ')}`);
  const allText = await page.locator('body').innerText();
  for (const old of ['已下单', '转运中', '签收']) {
    assert.ok(!new RegExp(`${old}\\(\\d+\\)`).test(allText), `FAIL: 旧状态「${old}」仍作为 tab 存在`);
  }
  console.log('PASS tab 集合为 待确认/已确认/已推送海外仓/处理中/已完成/驳回/取消/全部，无旧状态残留');

  // 拦截类指令：处理状态由海外仓回传，只出现「拦截成功 / 拦截失败」，不出现通用的「已完成」
  await page.getByRole('button', { name: /^已完成\(\d+\)$/ }).click();
  const doneText = await page.locator('tbody').innerText();
  assert.match(doneText, /拦截成功/, 'FAIL: 已完成缺少「拦截成功」样例');
  assert.match(doneText, /拦截失败/, 'FAIL: 已完成缺少「拦截失败」样例');
  console.log('PASS 已完成 tab 中拦截指令回传「拦截成功 / 拦截失败」均有样例');

  // 逐行扫描全部状态：凡指令单类型为拦截且状态为已完成的，处理状态列不得显示「已完成」
  // 从表头动态取列索引，避免写死列号
  const headers = await page.locator('thead th').allInnerTexts();
  const colType = headers.indexOf('指令单类型');
  const colStatus = headers.indexOf('指令处理状态');
  assert.ok(colType > 0 && colStatus > 0, `FAIL: 未能在表头定位列，headers=${headers.join('|')}`);

  let interceptRows = 0;
  for (const tab of TABS.filter((t) => t !== '全部')) {
    await page.getByRole('button', { name: new RegExp(`^${tab}\\(\\d+\\)$`) }).click();
    await page.waitForTimeout(120);
    const rows = await page.locator('tbody tr').all();
    for (const row of rows) {
      const cells = await row.locator('td').allInnerTexts();
      if (cells.length <= colType) continue;         // 跳过空数据行
      const instructionType = cells[colType];
      const statusCell = cells[colStatus];
      if (instructionType !== '拦截') continue;
      interceptRows += 1;
      assert.ok(
        !statusCell.includes('已完成'),
        `FAIL: 「${tab}」中拦截指令 ${cells[1]} 的处理状态显示了通用的「已完成」：${statusCell}`,
      );
      assert.ok(
        /拦截成功|拦截失败|待海外仓回传|待处理|已取消|已驳回/.test(statusCell),
        `FAIL: 「${tab}」中拦截指令 ${cells[1]} 的处理状态非法：${statusCell}`,
      );
    }
  }
  assert.ok(interceptRows >= 3, `FAIL: 拦截指令样例过少，仅扫描到 ${interceptRows} 条`);
  console.log(`PASS 全状态扫描 ${interceptRows} 条拦截指令，处理状态列均未出现通用「已完成」`);

  // 拦截失败整行标红；拦截成功不标红
  await page.getByRole('button', { name: /^已完成\(\d+\)$/ }).click();
  await page.waitForTimeout(150);

  const failedRows = page.locator('tbody tr').filter({ hasText: '拦截失败' });
  const failedCount = await failedRows.count();
  assert.ok(failedCount >= 1, 'FAIL: 已完成 tab 中没有拦截失败的样例');
  for (let i = 0; i < failedCount; i += 1) {
    const row = failedRows.nth(i);
    const bg = await row.evaluate((el) => getComputedStyle(el).backgroundColor);
    assert.ok(isRed(bg), `FAIL: 拦截失败行背景不是红色系，实际 ${bg}`);
    const statusColor = await row.locator('td').nth(colStatus).evaluate((el) => getComputedStyle(el).color);
    assert.ok(isRed(statusColor), `FAIL: 拦截失败状态文字不是红色，实际 ${statusColor}`);
  }
  console.log(`PASS ${failedCount} 条拦截失败行：整行红色背景 + 状态文字红色`);

  const successRows = page.locator('tbody tr').filter({ hasText: '拦截成功' });
  const successCount = await successRows.count();
  for (let i = 0; i < successCount; i += 1) {
    const row = successRows.nth(i);
    const bg = await row.evaluate((el) => getComputedStyle(el).backgroundColor);
    assert.ok(isNearWhite(bg), `FAIL: 拦截成功行不应标红，实际 ${bg}`);
    const color = await row.locator('td').nth(colStatus).evaluate((el) => getComputedStyle(el).color);
    assert.ok(isGreen(color), `FAIL: 拦截成功状态文字不是绿色，实际 ${color}`);
  }
  console.log(`PASS ${successCount} 条拦截成功行：白色背景 + 状态文字绿色`);

  await page.screenshot({ path: path.join(SHOT_DIR, 'tiantu-instruction-list-20260917.png'), fullPage: false });
  console.log(`SCREENSHOT: ${path.join(SHOT_DIR, 'tiantu-instruction-list-20260917.png')}`);

  assert.equal(errors.length, 0, `页面报错: ${errors.join(' | ')}`);
  console.log('PASS 无页面 JS 报错');
  await browser.close();
  console.log('\nALL CHECKS PASSED');
})().catch((error) => { console.error(error.message); process.exit(1); });
