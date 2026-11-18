import { createStoredZip, createWorkbook } from './overtimeWorkbook';
import { buildSfuk8Export, type SfukTemplateLoader } from './sfukBillExport';

export type BillExportRecord = {
  container: string; bill: string; ref: string; type: string; route: string;
  business: string; order: string; line: string; boxes: number; actual: string;
  volume: string; weight: string; fee: string; consignee: string; ratio: string;
};

export const billExportTemplates = [
  'ISF', 'SI', 'VGM', 'XY', '清关资料', '箱单', 'MeiW', 'MeiW-Other',
  '欧线-模板二', '欧线-模板一', '欧线-模板三', '英国空运出口报关', 'SFUK模版8',
] as const;

export async function buildBillExport(templateNames: string[], records: BillExportRecord[], date = new Date(), options: { loadSfukTemplate?: SfukTemplateLoader } = {}) {
  if (!records.length) throw new Error('请先勾选需要导出的提单');
  const names = [...new Set(templateNames)];
  if (!names.length) throw new Error('请先勾选需要导出的模板');
  if (names.some(name => !billExportTemplates.some(template => template === name))) throw new Error('请选择有效的导出模板');
  const stamp = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const headers = ['导出说明', '模板名称', '提单号', '参考号', '柜号', '类型', '线路', '经营单位', '挂单', '航线', '箱数', '实重', '体积', '材重', '收费量', '收货人信息', '体积比'];
  const entries = await Promise.all(names.map(async name => {
    if (name === 'SFUK模版8') return buildSfuk8Export(records, options.loadSfukTemplate);
    const values = records.map(row => [
      '原型示例数据', name, row.bill, row.ref, row.container, row.type, row.route,
      row.business, row.order, row.line, row.boxes, row.actual, row.volume,
      row.weight, row.fee, row.consignee, row.ratio,
    ]);
    const blob = createWorkbook(headers, values, name);
    return { filename: `${name}_提单示例_${stamp}.xlsx`, blob, fileCount: 1 };
  }));
  if (entries.length === 1) return entries[0];
  const files: Record<string, Uint8Array> = {};
  for (const entry of entries) files[entry.filename] = new Uint8Array(await entry.blob.arrayBuffer());
  return { filename: `提单批量导出示例_${stamp}.zip`, blob: createStoredZip(files), fileCount: entries.length };
}
