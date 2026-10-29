import type { Waybill } from '../types';

export type WaybillIdentity = { id: string; systemNo: string; customerNo: string; fbaNo: string; customer: string; expectedPieces: number };
export type ReservationIdentifier = { number: string; customer: string; candidateIds: string[]; selectedIds: string[] };
export type ReservationLinks = { identifiers: ReservationIdentifier[]; waybills: WaybillIdentity[] };
export type PickingRecord = { id: string; waybillId: string; revision: number; pieces: number; volume: number; weight: number; status: 'active' | 'revoked'; updatedAt: string };
export type PickingSummary = { status: '待拣货' | '部分拣货' | '拣货完成'; pieces: number | null; volume: number | null; weight: number | null; records: number };
const normalized = (value: string) => value.trim().toUpperCase();
const rounded = (value: number) => Math.round((value + Number.EPSILON) * 1e6) / 1e6;

export const getWaybillCustomerOrderNo = (waybill: Waybill) => waybill.customerOrderNo || `YP${waybill.id.replace(/^HD/, '')}000301`;
export const getWaybillIdentity = (waybill: Waybill): WaybillIdentity => ({
  id: waybill.id, systemNo: waybill.id, customerNo: getWaybillCustomerOrderNo(waybill), fbaNo: waybill.fbaCode || '',
  customer: waybill.customerName || '塘厦测试客户', expectedPieces: waybill.packagesCount,
});
export const parseReservationNumbers = (text: string): string[] => text.split(/[\s,，;；]+/).map(value => value.trim()).filter(Boolean);

export function resolveReservationNumbers(customer: string, numbers: string[], catalog: WaybillIdentity[], previous: ReservationIdentifier[] = []): ReservationIdentifier[] {
  const uniqueNumbers = [...new Map(numbers.map(number => [normalized(number), number.trim()])).values()];
  return uniqueNumbers.map(number => {
    const candidates = catalog.filter(waybill => waybill.customer === customer && [waybill.systemNo, waybill.customerNo, waybill.fbaNo].some(value => value && normalized(value) === normalized(number)));
    const candidateIds = [...new Set(candidates.map(waybill => waybill.id))];
    const old = previous.find(binding => binding.customer === customer && normalized(binding.number) === normalized(number));
    const sameCandidates = old && old.candidateIds.length === candidateIds.length && old.candidateIds.every(id => candidateIds.includes(id));
    return { number, customer, candidateIds, selectedIds: candidateIds.length === 1 ? [...candidateIds] : sameCandidates ? old.selectedIds.filter(id => candidateIds.includes(id)) : [] };
  });
}

export function getLinkedWaybillIds(bindings: ReservationIdentifier[]): string[] {
  return [...new Set(bindings.flatMap(binding => binding.selectedIds.filter(id => binding.candidateIds.includes(id))))];
}

export function validateReservationLinks(bindings: ReservationIdentifier[]): string {
  const missing = bindings.filter(binding => binding.candidateIds.length === 0);
  if (missing.length) return `以下编号未匹配当前客户的运单，请修正或移除：${missing.map(binding => binding.number).join('、')}`;
  const ambiguous = bindings.filter(binding => !binding.selectedIds.length || binding.selectedIds.some(id => !binding.candidateIds.includes(id)));
  return ambiguous.length ? `请为以下编号勾选需要关联的运单：${ambiguous.map(binding => binding.number).join('、')}` : '';
}

export function buildReservationLinks(customer: string, bindings: ReservationIdentifier[], catalog: WaybillIdentity[]): ReservationLinks {
  const checked = resolveReservationNumbers(customer, bindings.map(binding => binding.number), catalog, bindings);
  const problem = validateReservationLinks(checked);
  if (problem) throw new Error(problem);
  const ids = getLinkedWaybillIds(checked);
  return { identifiers: checked, waybills: ids.map(id => catalog.find(waybill => waybill.id === id && waybill.customer === customer)!) };
}

export function validatePickingRecord(record: PickingRecord): void {
  if (!record || !record.id?.trim() || !record.waybillId?.trim() || !Number.isSafeInteger(record.revision) || record.revision < 1 || !['active', 'revoked'].includes(record.status)
    || !Number.isSafeInteger(record.pieces) || record.pieces < 0 || ![record.volume, record.weight].every(value => typeof value === 'number' && Number.isFinite(value) && value >= 0)
    || !Number.isFinite(Date.parse(record.updatedAt))) throw new Error('拣货回传数据无效，请检查记录编号、版本、件数、方数和重量');
}

export function mergePickingRecords(current: PickingRecord[], incoming: PickingRecord[]): PickingRecord[] {
  const records = new Map(current.map(record => [`${record.waybillId}\0${record.id}`, record]));
  for (const record of incoming) {
    validatePickingRecord(record);
    const key = `${record.waybillId}\0${record.id}`;
    const old = records.get(key);
    if (old && record.revision < old.revision) continue;
    if (old && record.revision === old.revision) {
      if (['pieces', 'volume', 'weight', 'status'].some(field => old[field] !== record[field])) throw new Error('同一拣货版本数据冲突，请使用更新的版本');
      continue;
    }
    records.set(key, { ...record });
  }
  return [...records.values()];
}

export function summarizeWaybillPicking(waybill: WaybillIdentity, records: PickingRecord[]): PickingSummary {
  const unique = mergePickingRecords([], records.filter(record => record.waybillId === waybill.id));
  if (!unique.length) return { status: '待拣货', pieces: null, volume: null, weight: null, records: 0 };
  const active = unique.filter(record => record.status === 'active');
  const pieces = active.reduce((sum, record) => sum + record.pieces, 0);
  return { status: pieces === 0 ? '待拣货' : waybill.expectedPieces > 0 && pieces >= waybill.expectedPieces ? '拣货完成' : '部分拣货', pieces,
    volume: rounded(active.reduce((sum, record) => sum + record.volume, 0)), weight: rounded(active.reduce((sum, record) => sum + record.weight, 0)), records: active.length };
}

export function summarizeReservationPicking(waybills: WaybillIdentity[], records: PickingRecord[]) {
  const unique = [...new Map(waybills.map(waybill => [waybill.id, waybill])).values()];
  const summaries = unique.map(waybill => summarizeWaybillPicking(waybill, records));
  const received = summaries.filter(summary => summary.pieces !== null);
  return { waybills: unique.length, waiting: unique.length - received.length,
    pieces: received.length ? received.reduce((sum, summary) => sum + summary.pieces!, 0) : null,
    volume: received.length ? rounded(received.reduce((sum, summary) => sum + summary.volume!, 0)) : null,
    weight: received.length ? rounded(received.reduce((sum, summary) => sum + summary.weight!, 0)) : null };
}
