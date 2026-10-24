import type { InventoryRecord, InventoryStatus } from './overseasStorageInventoryData';

export const emptyInventoryFilters = {
  customer: '', waybillNo: '', fbaNo: '', warehouseCode: '', service: '', blocked: '', from: '', to: '',
  applicationNo: '', waybillType: '', releaseType: '', shipmentId: '', referenceId: '', financialAudit: '',
};
export type InventoryFilters = typeof emptyInventoryFilters;

const orderTextFields = ['applicationNo', 'shipmentId', 'referenceId'] as const;
const orderChoiceFields = ['waybillType', 'releaseType', 'financialAudit'] as const;

function matchesText(value: string | undefined, query: string): boolean {
  const terms = query.toLowerCase().split(/[,，;；\s]+/).filter(Boolean);
  if (!terms.length) return true;
  const text = (value || '').trim().toLowerCase();
  if (!text || text === '-' || text === '—') return false;
  return terms.length === 1 ? text.includes(terms[0]) : terms.includes(text);
}

export function matchesInventoryFilters(row: InventoryRecord, filters: InventoryFilters, status: InventoryStatus): boolean {
  return row.status === status
    && (['waybillNo', 'fbaNo'] as const).every(key => matchesText(row[key], filters[key]))
    && (['customer', 'warehouseCode', 'service', 'blocked'] as const).every(key => !filters[key] || row[key] === filters[key])
    && (!filters.from || row.time.slice(0, 10) >= filters.from)
    && (!filters.to || row.time.slice(0, 10) <= filters.to)
    && (status === '暂存' || (
      orderTextFields.every(key => matchesText(row[key], filters[key]))
      && orderChoiceFields.every(key => !filters[key] || row[key] === filters[key])
    ));
}

export function clearInventoryOrderFilters(filters: InventoryFilters): InventoryFilters {
  const next = { ...filters };
  for (const key of [...orderTextFields, ...orderChoiceFields]) next[key] = '';
  return next;
}
