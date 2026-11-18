import { createStoredZip } from './overtimeWorkbook';

export const sfuk8TemplateFiles = [
  { sourceName: '柜号 CIPL模板1015.xlsx', assetPath: 'templates/sfuk8/cipl-1015.xlsx' },
  { sourceName: '柜号 Delivery Instructions Template 1015.xlsx', assetPath: 'templates/sfuk8/delivery-instructions-1015.xlsx' },
  { sourceName: '柜号 destin8 manifest 1015.xlsx', assetPath: 'templates/sfuk8/destin8-manifest-1015.xlsx' },
] as const;

export type SfukTemplateLoader = (assetPath: string) => Promise<Uint8Array>;

const loadLocalTemplate: SfukTemplateLoader = async assetPath => {
  const base = (import.meta as ImportMeta & { env?: { BASE_URL?: string } }).env?.BASE_URL || '/tiantu-next-copy/';
  const response = await fetch(`${base}${assetPath}`);
  if (!response.ok) throw new Error('读取SFUK模版8模板失败，请刷新后重试');
  return new Uint8Array(await response.arrayBuffer());
};

export async function buildSfuk8Export(records: { container: string }[], loadTemplate = loadLocalTemplate) {
  if (!records.length) throw new Error('请先勾选需要导出的提单');
  const containers = [...new Set(records.map(record => {
    const container = String(record.container ?? '').trim();
    if (!container || container === '.' || container === '..' || /[\\/:*?"<>|\u0000-\u001f]/.test(container)) {
      throw new Error('柜号为空或格式无效，请检查所选提单的柜号');
    }
    return container;
  }))];
  const templates = await Promise.all(sfuk8TemplateFiles.map(async template => {
    const bytes = await loadTemplate(template.assetPath);
    if (bytes.length < 4 || bytes[0] !== 0x50 || bytes[1] !== 0x4b || bytes[2] !== 0x03 || bytes[3] !== 0x04) {
      throw new Error('SFUK模版8模板文件无效，请检查模板配置');
    }
    return { ...template, bytes };
  }));
  const files: Record<string, Uint8Array> = {};
  containers.forEach(container => templates.forEach(template => {
    const filename = template.sourceName.replace(/^柜号/, container);
    const folder = containers.length > 1 ? `${container}/` : '';
    files[`${folder}${filename}`] = template.bytes;
  }));
  return {
    filename: 'SFUK模版8.zip',
    blob: createStoredZip(files),
    fileCount: Object.keys(files).length,
  };
}
