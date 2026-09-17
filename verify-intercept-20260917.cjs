/**
 * 拦截选单页（步骤 2 · 整票选择）端到端验证。
 *
 * 用法：
 *   node verify-intercept-20260917.cjs
 *   BASE_URL=http://127.0.0.1:4175/ node verify-intercept-20260917.cjs
 *   PLAYWRIGHT_PATH=<path> CHROMIUM_PATH=<path> node verify-intercept-20260917.cjs
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

(async () => {
  const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1100 } });
  page.setDefaultTimeout(10000);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.getByText('创建客户指令', { exact: true }).first().click();

  // 选择「拦截」指令类型
  await page.getByRole('button', { name: '拦截 无需填写收件地址', exact: true }).click();
  await page.getByRole('button', { name: '下一步：选择运单箱子', exact: true }).click();

  await page.getByRole('heading', { name: '全部运单（按运单选择拦截）', exact: true }).waitFor();

  const body = await page.locator('body').innerText();
  const firstArticle = page.locator('article').first();
  const headerText = await firstArticle.locator(':scope > div > button').innerText();
  const detailText = await firstArticle.locator('dl').innerText();

  // 1. 拦截模式下不再显示箱数统计
  assert.ok(!body.includes('原始箱数'), 'FAIL: 仍显示「原始箱数」');
  assert.ok(!body.includes('可下单箱数'), 'FAIL: 仍显示「可下单箱数」');
  assert.ok(!body.includes('当前可同单箱数'), 'FAIL: 仍显示「当前可同单箱数」');
  console.log('PASS 1: 拦截模式已隐藏 原始箱数 / 可下单箱数');

  // 2. 表头包含 客户单号 / 服务 / 仓库代码 / 国家 / 总箱数
  for (const field of ['客户单号：', '服务：', '仓库代码：', '国家：', '总箱数：']) {
    assert.ok(headerText.includes(field), `FAIL: 表头缺少「${field}」，实际: ${headerText}`);
  }
  assert.match(headerText, /总箱数：2 箱/, `FAIL: 表头总箱数不正确，实际: ${headerText}`);
  assert.match(headerText, /客户单号：TX20260914001/, `FAIL: 表头客户单号不正确`);
  for (const gone of ['收件人', '公司', '地址一', '城市', '州', '邮编']) {
    assert.ok(!headerText.includes(gone), `FAIL: 表头残留「${gone}」`);
  }
  console.log('PASS 2: 表头含 客户单号/服务/仓库代码/国家/总箱数');

  // 2b. 几何校验：运单号靠左、信息组贴右边缘
  const headerBox = await firstArticle.locator(':scope > div > button').boundingBox();
  const idBox = await firstArticle.getByText('USSZ202609140011', { exact: true }).boundingBox();
  const countBox = await firstArticle.getByText('总箱数：2 箱', { exact: true }).boundingBox();
  const rightGap = headerBox.x + headerBox.width - (countBox.x + countBox.width);
  const idLeftGap = idBox.x - headerBox.x;
  assert.ok(idLeftGap < headerBox.width * 0.3, `FAIL: 运单号未靠左，距左边 ${Math.round(idLeftGap)}px`);
  assert.ok(rightGap < 30, `FAIL: 信息组未贴右边缘，右侧余量 ${Math.round(rightGap)}px`);
  console.log(`PASS 2b: 运单号靠左(距边 ${Math.round(idLeftGap)}px)、信息组贴右(余量 ${Math.round(rightGap)}px)`);

  // 3. 展开区只保留地址类 6 个字段
  for (const field of ['收件人：', '公司：', '地址一：', '城市：', '州：', '邮编：']) {
    assert.ok(detailText.includes(field), `FAIL: 详情区缺少「${field}」，实际: ${detailText}`);
  }
  for (const moved of ['客户单号', '服务', '仓库代码', '国家']) {
    assert.ok(!detailText.includes(moved), `FAIL: 详情区残留「${moved}」，应已移至表头`);
  }
  // dt / dd 是 flex 兄弟节点，innerText 之间会插分隔符，故标签与取值分开断言
  for (const value of ['张伟', 'Amazon FBA LAX9', '1234 S Main St', '洛杉矶', 'CA', '90014']) {
    assert.ok(detailText.includes(value), `FAIL: 详情区缺少取值「${value}」`);
  }
  console.log('PASS 3: 展开区只保留 收件人/公司/地址一/城市/州/邮编 6 个字段');

  // 4. 拦截详情区不含旧字段
  for (const removed of ['Shipment ID', 'Reference ID', '客户名称', '海外仓合作代码']) {
    assert.ok(!detailText.includes(removed), `FAIL: 旧字段「${removed}」未删除`);
  }
  console.log('PASS 4: 拦截详情区不含 Shipment ID / Reference ID / 客户名称');

  // 5. 不支持单独勾选箱子
  const boxCheckboxes = await page.locator('tbody input[type="checkbox"]').count();
  assert.equal(boxCheckboxes, 0, `FAIL: 存在 ${boxCheckboxes} 个箱子复选框`);
  const headerCheckboxes = await page.locator('thead input[type="checkbox"]').count();
  assert.equal(headerCheckboxes, 0, `FAIL: 存在 ${headerCheckboxes} 个全选复选框`);
  console.log('PASS 5: 明细表无可勾选箱子（无行复选框、无全选）');

  // 6. 右上角不再展示「当前可拦截运单」，改为展示已勾选运单数（初始 0）
  assert.ok(!body.includes('当前可拦截运单'), 'FAIL: 右上角仍展示「当前可拦截运单」');
  const badge = page.getByText(/已勾选运单/).first();
  assert.match(await badge.innerText(), /已勾选运单：\s*0\s*票/, 'FAIL: 初始已勾选数不是 0');

  const waybillChecks = page.getByRole('checkbox', { name: /选择运单 USSZ2026091400\d+/ });
  const waybillTotal = await waybillChecks.count();
  assert.equal(waybillTotal, 4, `FAIL: 运单复选框数量 = ${waybillTotal}，应为 4`);
  console.log('PASS 6: 右上角展示「已勾选运单：0 票」，无「当前可拦截运单」');

  // 7. 全部运单均可勾选（无禁用），且勾选后右上角计数实时更新
  for (let i = 0; i < waybillTotal; i += 1) {
    assert.equal(await waybillChecks.nth(i).isDisabled(), false, `FAIL: 第 ${i + 1} 票运单被禁用`);
  }
  console.log('PASS 7: 4 票运单复选框全部可勾选（无禁用）');

  await waybillChecks.nth(0).check();
  await page.getByText('已选整票').first().waitFor();
  assert.match(await badge.innerText(), /已勾选运单：\s*1\s*票/, 'FAIL: 勾选 1 票后右上角未更新');

  await waybillChecks.nth(3).check();
  await page.waitForFunction(() => {
    const el = [...document.querySelectorAll('span')].find((node) => node.textContent.includes('已勾选运单'));
    return el && /2/.test(el.textContent);
  }, null, { timeout: 5000 });
  assert.match(await badge.innerText(), /已勾选运单：\s*2\s*票/, 'FAIL: 勾选 2 票后右上角未更新');
  assert.match(await page.locator('footer').innerText(), /已选择 2 票运单/, 'FAIL: 底部计数不正确');
  console.log('PASS 8: 右上角计数随勾选实时更新 0 → 1 → 2 票');

  await page.screenshot({ path: path.join(SHOT_DIR, 'tiantu-intercept-20260917.png'), fullPage: false });
  console.log(`SCREENSHOT: ${path.join(SHOT_DIR, 'tiantu-intercept-20260917.png')}`);

  assert.equal(errors.length, 0, `页面报错: ${errors.join(' | ')}`);
  console.log('PASS 9: 无页面 JS 报错');
  await browser.close();
  console.log('\nALL CHECKS PASSED');
})().catch((error) => { console.error(error.message); process.exit(1); });
