import type { InstructionListRow } from './instructionListTypes';
import type { InventoryState } from './overseasStorageInventoryData';
import type { InstructionWaybillFields } from './instructionDetailStore';
import type { InstructionWaybillSummary } from './InstructionWaybillInfo';
import { getInstructionInventoryRecords } from './instructionInventoryLinks';

const clean = (value?: string) => value && !['-', '—'].includes(value.trim()) ? value.trim() : '';
const join = (values: (string | undefined)[]) => [...new Set(values.map(clean).filter(Boolean))].join('；');
const agreed = (values: (string | undefined)[]) => {
  const entries = values.map(clean);
  return entries.length && entries.every((value) => value && value === entries[0]) ? entries[0] : '';
};

/** Use only the selected waybill's stock and unambiguous release information. */
export function getInstructionWaybillContext(row: InstructionListRow, inventory: InventoryState): {
  summary: InstructionWaybillSummary;
  fields: InstructionWaybillFields;
} {
  const records = getInstructionInventoryRecords(row, inventory.records);
  const ids = new Set(records.map((record) => record.id));
  const orders = inventory.orders.filter((order) => order.recordIds.length && order.recordIds.every((id) => ids.has(id)));
  const orderType = clean(row.orderType);
  const waybillType = agreed(orders.map((order) => order.waybillType)) || agreed(records.map((record) => record.waybillType))
    || ({ '亚马逊': 'FBA', '沃尔玛': 'Walmart', FBA: 'FBA', Walmart: 'Walmart', Tiktok: 'Tiktok', '私人地址': '私人地址' }[orderType] || '');
  const deliveryMethod = agreed(orders.map((order) => order.deliveryMethod)) || join(records.map((record) => record.dispatch));
  return {
    summary: {
      customer: clean(row.customer), waybill: clean(row.waybill), instructionType: clean(row.instructionType), deliveryMethod,
      palletLabel: records.length ? join(records.map((record) => record.pallet)) : clean(row.palletLabel),
      waybillType,
      destination: agreed(orders.map((order) => order.destination)) || join(records.map((record) => record.destination)) || clean(row.warehouse) || clean(row.destination),
      boxCount: clean(row.packages),
      customerNote: row.customerNote || '',
    },
    fields: {
      shipmentId: clean(row.shipment) || agreed(orders.map((order) => order.shipmentId)) || agreed(records.map((record) => record.shipmentId)),
      referenceId: clean(row.reference) || agreed(orders.map((order) => order.referenceId)) || agreed(records.map((record) => record.referenceId)),
      scheduledAt: clean(row.scheduledAt) || agreed(orders.map((order) => order.scheduledAt)),
      remark: row.waybillRemark !== undefined ? row.waybillRemark : agreed(orders.map((order) => order.remark)),
    },
  };
}
