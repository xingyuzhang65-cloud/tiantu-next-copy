import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { crc32 } from 'node:zlib';
import { billExportTemplates, buildBillExport, type BillExportRecord } from './billOfLadingExport';
import { createWorkbook } from './overtimeWorkbook';
import { sfuk8TemplateFiles, type SfukTemplateLoader } from './sfukBillExport';

const record: BillExportRecord = {
  container: 'TEST-CONT-001', bill: 'TEST-BILL-001', ref: 'A&B <reference>', type: '海运',
  route: '美线', business: '深圳天图', order: '未挂单', line: '盐田 - 长滩',
  boxes: 12, actual: '100.5', volume: '2.3', weight: '300', fee: '300', consignee: '测试客户', ratio: '43',
};
const date = new Date(2026, 10, 17, 10, 30);
const decode = (bytes: Uint8Array) => new TextDecoder().decode(bytes);
const loadSfukTemplate: SfukTemplateLoader = async assetPath => new Uint8Array(await readFile(new URL(`../../public/${assetPath}`, import.meta.url)));

async function readZip(blob: Blob) {
  const buffer = await blob.arrayBuffer();
  const view = new DataView(buffer);
  const entries = new Map<string, Uint8Array>();
  let offset = 0;
  while (view.getUint32(offset, true) === 0x04034b50) {
    assert.equal(view.getUint16(offset + 8, true), 0, '测试读取无压缩ZIP');
    assert.ok(view.getUint16(offset + 6, true) & 0x0800, '文件名标记为UTF-8');
    const length = view.getUint32(offset + 18, true);
    const nameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);
    const name = decode(new Uint8Array(buffer, offset + 30, nameLength));
    const start = offset + 30 + nameLength + extraLength;
    assert.equal(entries.has(name), false);
    const bytes = new Uint8Array(buffer.slice(start, start + length));
    assert.equal(crc32(bytes), view.getUint32(offset + 14, true), `${name} CRC校验`);
    entries.set(name, bytes);
    offset = start + length;
  }
  assert.equal(view.getUint32(offset, true), 0x02014b50);
  assert.equal(view.getUint32(buffer.byteLength - 22, true), 0x06054b50);
  assert.equal(view.getUint16(buffer.byteLength - 12, true), entries.size);
  return entries;
}

test('模板列表保留原有顺序并新增SFUK模版8', () => {
  assert.deepEqual([...billExportTemplates], ['ISF', 'SI', 'VGM', 'XY', '清关资料', '箱单', 'MeiW', 'MeiW-Other', '欧线-模板二', '欧线-模板一', '欧线-模板三', '英国空运出口报关', 'SFUK模版8']);
});

test('没有提单、没有模板或模板无效时不生成文件', async () => {
  await assert.rejects(buildBillExport(['SI'], []), /勾选需要导出的提单/);
  await assert.rejects(buildBillExport([], [record]), /勾选需要导出的模板/);
  await assert.rejects(buildBillExport(['../../invalid'], [record]), /有效的导出模板/);
});

test('单行导出生成对应模板的XLSX，正确转义内容并标记示例数据', async () => {
  const file = await buildBillExport(['SI'], [record], date);
  assert.equal(file.filename, 'SI_提单示例_20261117.xlsx');
  assert.equal(file.fileCount, 1);
  assert.equal(file.blob.type, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  const entries = await readZip(file.blob);
  assert.match(decode(entries.get('xl/workbook.xml')!), /sheet name="SI"/);
  const sheet = decode(entries.get('xl/worksheets/sheet1.xml')!);
  assert.match(sheet, /TEST-BILL-001/);
  assert.match(sheet, /TEST-CONT-001/);
  assert.match(sheet, /A&amp;B &lt;reference&gt;/);
  assert.match(sheet, /原型示例数据/);
  assert.equal((sheet.match(/<row /g) || []).length, 2);
});

test('批量导出打包已选模板，中文文件名可识别，重复模板只生成一次', async () => {
  const file = await buildBillExport(['清关资料', '箱单', '清关资料'], [record], date);
  assert.equal(file.filename, '提单批量导出示例_20261117.zip');
  assert.equal(file.fileCount, 2);
  assert.equal(file.blob.type, 'application/zip');
  const entries = await readZip(file.blob);
  assert.deepEqual([...entries.keys()], ['清关资料_提单示例_20261117.xlsx', '箱单_提单示例_20261117.xlsx']);
  for (const [name, bytes] of entries) {
    const workbook = await readZip(new Blob([bytes as BlobPart]));
    assert.match(decode(workbook.get('xl/worksheets/sheet1.xml')!), /TEST-BILL-001/);
    assert.ok(decode(workbook.get('xl/workbook.xml')!).includes(`sheet name="${name.split('_')[0]}"`));
  }
});

test('全选导出包含12个示例工作簿及SFUK原始模板ZIP', async () => {
  const second = { ...record, container: 'TEST-CONT-002', bill: 'TEST-BILL-002' };
  const file = await buildBillExport([...billExportTemplates], [record, second], date, { loadSfukTemplate });
  const entries = await readZip(file.blob);
  assert.equal(entries.size, 13);
  const sfuk = entries.get('SFUK模版8.zip');
  assert.ok(sfuk);
  assert.equal((await readZip(new Blob([sfuk as BlobPart]))).size, 6);
  for (const [name, bytes] of entries) {
    if (!name.endsWith('.xlsx')) continue;
    const workbook = await readZip(new Blob([bytes as BlobPart]));
    const sheet = decode(workbook.get('xl/worksheets/sheet1.xml')!);
    assert.match(sheet, /TEST-BILL-001/);
    assert.match(sheet, /TEST-BILL-002/);
    assert.equal((sheet.match(/<row /g) || []).length, 3);
  }
});

test('共享工作簿工具保留超时运单原有默认工作表', async () => {
  const entries = await readZip(createWorkbook(['运单号'], [['YD-ORIGINAL']]));
  assert.match(decode(entries.get('xl/workbook.xml')!), /sheet name="超时运单"/);
  assert.match(decode(entries.get('xl/worksheets/sheet1.xml')!), /YD-ORIGINAL/);
});

test('SFUK单柜导出三个原始模板，文件名使用实际柜号且内容逐字节一致', async () => {
  const selected = { ...record, container: 'CSGU8040079' };
  const file = await buildBillExport(['SFUK模版8'], [selected], date, { loadSfukTemplate });
  assert.equal(file.filename, 'SFUK模版8.zip');
  assert.equal(file.blob.type, 'application/zip');
  assert.equal(file.fileCount, 3);
  const entries = await readZip(file.blob);
  assert.deepEqual([...entries.keys()], [
    'CSGU8040079 CIPL模板1015.xlsx',
    'CSGU8040079 Delivery Instructions Template 1015.xlsx',
    'CSGU8040079 destin8 manifest 1015.xlsx',
  ]);
  for (const template of sfuk8TemplateFiles) {
    assert.deepEqual(entries.get(template.sourceName.replace(/^柜号/, selected.container)), await loadSfukTemplate(template.assetPath));
  }
});

test('SFUK多柜按实际柜号分文件夹，同柜重复记录只生成一组三个文件', async () => {
  const records = [record, { ...record, container: 'MATU2609748' }, { ...record, container: ` ${record.container} ` }];
  const requested: string[] = [];
  const file = await buildBillExport(['SFUK模版8'], records, date, { loadSfukTemplate: async path => { requested.push(path); return loadSfukTemplate(path); } });
  assert.equal(file.filename, 'SFUK模版8.zip');
  assert.equal(file.fileCount, 6);
  assert.equal(requested.length, 3, '多个柜共用模板下载');
  const entries = await readZip(file.blob);
  for (const container of [record.container, 'MATU2609748']) {
    assert.equal([...entries.keys()].filter(name => name.startsWith(`${container}/`)).length, 3);
    for (const template of sfuk8TemplateFiles) {
      assert.deepEqual(entries.get(`${container}/${template.sourceName.replace(/^柜号/, container)}`), await loadSfukTemplate(template.assetPath));
    }
  }
});

test('批量同时导出SFUK和普通模板时，SFUK保留三个文件的独立ZIP', async () => {
  const file = await buildBillExport(['SI', 'SFUK模版8'], [record], date, { loadSfukTemplate });
  const entries = await readZip(file.blob);
  assert.equal(entries.size, 2);
  assert.ok(entries.has('SI_提单示例_20261117.xlsx'));
  const sfuk = entries.get('SFUK模版8.zip')!;
  assert.equal((await readZip(new Blob([sfuk as BlobPart]))).size, 3);
});

test('SFUK模板读取失败或返回HTML时拒绝导出，不以示例文件替代', async () => {
  await assert.rejects(buildBillExport(['SFUK模版8'], [record], date, { loadSfukTemplate: async () => { throw new Error('读取失败'); } }), /读取失败/);
  await assert.rejects(buildBillExport(['SFUK模版8'], [record], date, { loadSfukTemplate: async () => new TextEncoder().encode('<html>Not found</html>') }), /模板文件无效/);
});

test('SFUK缺少柜号或柜号含路径字符时在读取模板前拦截', async () => {
  let reads = 0;
  for (const container of ['', ' ', '..', '../other', 'A/B', 'A\\B', 'A:B']) {
    await assert.rejects(buildBillExport(['SFUK模版8'], [{ ...record, container }], date, { loadSfukTemplate: async () => { reads++; return new Uint8Array(); } }), /柜号为空或格式无效/);
  }
  assert.equal(reads, 0);
});
