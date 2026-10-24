import type { OverseasInterceptInstructionFee } from '../types';
import type { InstructionListRow, InstructionListTab } from './instructionListTypes';
import { getInstructionFeeTotal } from './instructionDetailStore';
import type { InstructionFeeRow } from './instructionDetailData';

export interface InterceptInstructionSource {
  id: number; no: string; waybillNo: string; customer: string; status: string;
  appliedAt: string; handleAt: string; applicant: string; boxes: number; actualBoxes: string;
  reason: string; failReason: string; customerNote: string; internalRemark: string;
  instructionFees?: OverseasInterceptInstructionFee[];
}

const amount = (value: string | undefined, fallback = 0) => {
  if (value === undefined || !value.trim()) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

/** Match the intercept number and waybill together; repeated requests keep separate details. */
export function toInterceptInstructionRow(task: InterceptInstructionSource): InstructionListRow {
  const operationFees: InstructionFeeRow[] = (task.instructionFees || []).map((fee, index) => {
    const unitPrice = amount(fee.price), quantity = amount(fee.quantity, 1);
    const exchangeRate = amount(fee.exchangeRate, 1) || 1;
    return {
      id: `intercept-${task.id}:fee:${index}:${fee.code}`, name: fee.name, type: fee.type, unit: fee.unit,
      currency: fee.currency, unitPrice, quantity, exchangeRate,
      originalAmount: unitPrice * quantity, rmbAmount: unitPrice * quantity * exchangeRate,
      status: fee.status || '待处理', billingTime: fee.billingTime || fee.addedAt || task.appliedAt,
      addedAt: fee.addedAt || task.appliedAt, addedBy: fee.addedBy || task.applicant,
      remark: fee.remark || fee.description, instructionRemark: fee.description,
    };
  });
  const workflow: Record<string, InstructionListTab> = {
    待处理: '待确认', 已确认: '已确认', 拦截中: '处理中', 已完成: '已完成', 已驳回: '驳回', 已取消: '取消',
  };
  return {
    id: `intercept-${task.id}`, instructionNo: task.no, waybill: task.waybillNo,
    names: operationFees.map(fee => fee.name), operationFees,
    tab: workflow[task.status] || '待确认',
    status: operationFees.length && operationFees.every(fee => fee.status === '已处理' || fee.status === '已完成') ? '已处理' : '待处理',
    created: task.appliedAt, updated: task.handleAt || task.appliedAt, customer: task.customer,
    instructionType: '拦截', interceptReason: task.reason, failureReason: task.failReason,
    processingResult: task.status === '已完成' ? task.failReason ? '拦截失败' : '拦截成功' : undefined,
    packages: task.actualBoxes || String(task.boxes), customerNote: task.customerNote, internalRemark: task.internalRemark,
    fee: String(getInstructionFeeTotal(operationFees)), shipment: '-', reference: '-', warehouse: '-', zip: '-',
    orderType: '-', destination: '-', salesman: task.applicant, merchandiser: '-', weight: '-', volume: '-',
    arrived: '是', overseasTime: '-',
  };
}
