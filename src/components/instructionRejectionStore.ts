import type { InstructionListRow } from './instructionListTypes';

export const REJECTION_STORAGE_KEY = 'tiantu-instruction-rejections-v1';
type Rejection = { waybill: string; reason: string; updated: string };
function read(): Record<string, Rejection> {
  try {
    const value = JSON.parse(localStorage.getItem(REJECTION_STORAGE_KEY) || '{}');
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch { return {}; }
}
export function applyInstructionRejection(row: InstructionListRow): InstructionListRow {
  const saved = read()[row.instructionNo];
  return saved && saved.waybill === row.waybill && typeof saved.reason === 'string' && saved.reason.trim() && typeof saved.updated === 'string'
    ? { ...row, tab: '驳回', status: '已驳回', rejectionReason: saved.reason, updated: saved.updated } : row;
}
export function rejectInstructions(rows: InstructionListRow[], reason: string): InstructionListRow[] {
  const trimmed = reason.trim();
  if (!trimmed) throw new Error('请填写驳回原因');
  if (trimmed.length > 500) throw new Error('驳回原因不能超过500字');
  if (!rows.length || rows.some(row => row.tab !== '待确认')) throw new Error('请选择待确认的指令');
  const updated = new Date().toLocaleString('sv-SE', { hour12: false });
  const saved = read();
  rows.forEach(row => { saved[row.instructionNo] = {waybill: row.waybill, reason: trimmed, updated}; });
  localStorage.setItem(REJECTION_STORAGE_KEY, JSON.stringify(saved));
  return rows.map(row => ({ ...row, tab: '驳回', status: '已驳回', rejectionReason: trimmed, updated }));
}
