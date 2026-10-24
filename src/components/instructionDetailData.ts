import type { InstructionListRow } from './instructionListTypes';

export interface InstructionCargoRow {
  id: string;
  boxNo: string;
  packages: number;
  customerLines: string[];
  pickingLines: string[];
}

export interface InstructionFeeImage {
  id: string;
  name: string;
  dataUrl?: string;
}

export interface InstructionFeeRow {
  id: string;
  name: string;
  type: string;
  unit: string;
  currency: string;
  billingTime: string;
  addedAt: string;
  addedBy: string;
  remark: string;
  instructionRemark?: string;
  images?: InstructionFeeImage[];
  status?: string;
  exchangeRate: number;
  unitPrice: number;
  quantity: number;
  originalAmount: number;
  rmbAmount: number;
}

export interface InstructionDetailModel {
  statusText: string;
  processingResult: string;
  failureReason: string;
  flowSteps: string[];
  currentStep: number;
  terminated: boolean;
  cargoRows: InstructionCargoRow[];
  feeRows: InstructionFeeRow[];
  feeTotal: number | null;
  instructionNames: string[];
}

const FLOW_STEPS = ['提交申请', '已确认', '处理中', '已完成'];

// The list contains a CNY total, not itemised prices. Missing totals must remain
// unknown rather than becoming a numeric zero through Number('') conversion.
function readAmount(value: string): number | null {
  const text = value.trim();
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) return null;
  const amount = Number(text);
  return Number.isFinite(amount) ? amount : null;
}

function measurement(value: string, unit: string): string {
  const text = value.trim();
  return !text || text === '-' || text === '—' ? '—' : `${text} ${unit}`;
}

/** Build a read-only view of the selected instruction; no fixture or lookup data. */
export function buildInstructionDetail(row: InstructionListRow): InstructionDetailModel {
  const interceptResult = row.processingResult === '拦截成功' || row.processingResult === '拦截失败'
    ? row.processingResult
    : '';
  const processingResult = row.status !== '已处理'
    ? ''
    : row.instructionType === '拦截' ? interceptResult : '已处理';
  const statusText = row.instructionType === '拦截' && row.status === '已处理'
    ? interceptResult || '待海外仓回传'
    : row.status === '已处理' ? '已完成' : row.status;
  const failureReason = row.tab === '已完成' && row.instructionType === '拦截' && statusText === '拦截失败'
    ? row.failureReason?.trim() || ''
    : '';

  // The tab is the workflow stage. Processing status is an independent field.
  const terminated = row.tab === '取消' || row.tab === '驳回' || row.status === '已取消' || row.status === '已驳回';
  const flowSteps = [...FLOW_STEPS];
  if (row.instructionType === '拦截') flowSteps[2] = '拦截中';
  if (terminated) flowSteps[flowSteps.length - 1] = row.tab === '取消' || row.status === '已取消' ? '已取消' : '已驳回';
  const currentStep = terminated ? flowSteps.length - 1 : row.tab === '已完成' ? 3 : row.tab === '处理中' || row.tab === '已推送海外仓' ? 2 : row.tab === '已确认' ? 1 : 0;

  const packageCount = Number(row.packages.trim());
  const cargoRows: InstructionCargoRow[] = Number.isInteger(packageCount) && packageCount > 0
    ? [{
      id: `${row.id}:cargo-summary`,
      boxNo: '—',
      packages: packageCount,
      customerLines: [
        `总件数：${row.packages} 件`,
        `总重量：${measurement(row.weight, 'KG')}`,
        `总体积：${measurement(row.volume, 'CBM')}`,
      ],
      pickingLines: ['—'],
    }]
    : [];

  const feeTotal = readAmount(row.fee);
  const feeRows: InstructionFeeRow[] = row.operationFees ? row.operationFees.map(fee => ({ ...fee })) : feeTotal === null ? [] : [{
    id: `${row.id}:fee-summary`,
    name: row.names.join(' / ') || row.instructionType || '指令费用',
    type: '—',
    unit: '票',
    currency: 'CNY',
    billingTime: '—',
    addedAt: '—',
    addedBy: '—',
    remark: '指令列表费用合计，原始记录未提供费用明细。',
    status: row.status,
    exchangeRate: 1,
    unitPrice: feeTotal,
    quantity: 1,
    originalAmount: feeTotal,
    rmbAmount: feeTotal,
  }];

  return {
    statusText, processingResult, failureReason, flowSteps, currentStep, terminated,
    cargoRows, feeRows, feeTotal, instructionNames: [...row.names],
  };
}

export default buildInstructionDetail;
