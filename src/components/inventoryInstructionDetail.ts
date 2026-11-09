import type { InstructionListRow } from './instructionListTypes';
import type { InstructionFeeRow } from './instructionDetailData';
import type { InstructionAttachment } from './instructionDetailStore';
import { applyInstructionDetailOverrides, getInstructionFeeTotal } from './instructionDetailStore';
import type { InventoryRecord, InventoryState } from './overseasStorageInventoryData';

/** Bind the processing detail to the selected stock record without changing its workflow. */
export function getInventoryInstructionDetail(record: InventoryRecord, inventory: InventoryState) {
  const order = inventory.orders.find(item => item.recordIds.includes(record.id)
    && (!record.applicationNo || item.applicationNo === record.applicationNo));
  const fees = [...new Map([...(record.instructions || []), ...(order?.instructions || [])].map(fee => [fee.id, fee])).values()];
  const operationFees: InstructionFeeRow[] = fees.map(fee => ({
    id: fee.id, name: fee.name, type: fee.type, unit: fee.unit, unitPrice: fee.unitPrice,
    quantity: fee.quantity, currency: fee.currency, exchangeRate: fee.exchangeRate,
    originalAmount: fee.unitPrice * fee.quantity, rmbAmount: fee.unitPrice * fee.quantity * fee.exchangeRate,
    billingTime: fee.billingTime || fee.addedAt, addedAt: fee.addedAt, addedBy: fee.addedBy,
    remark: fee.feeRemark, instructionRemark: fee.instructionRemark, status: fee.status,
    images: fee.images?.map(image => ({ id: image.id, name: image.name, dataUrl: image.dataUrl })),
  }));
  const kind = record.releaseType || order?.kind;
  const row: InstructionListRow = {
    id: `inventory-${record.id}`, detailStorageKey: `inventory:${record.id}:${record.applicationNo || order?.applicationNo || ''}`,
    instructionNo: record.applicationNo || order?.applicationNo || '—', waybill: record.waybillNo || '',
    tab: '处理中', status: operationFees.length && operationFees.every(fee => fee.status === '已处理') ? '已处理' : '待处理',
    names: operationFees.map(fee => fee.name), operationFees, fee: String(getInstructionFeeTotal(operationFees)),
    created: order?.createdAt || '', updated: order?.createdAt || '', customer: record.customer,
    shipment: record.shipmentId || order?.shipmentId || record.fbaNo || '-', reference: record.referenceId || order?.referenceId || '-',
    warehouse: record.destination, zip: order?.postalCode || '-', orderType: record.waybillType || order?.waybillType || '-',
    instructionType: kind ? { 发货: '放货', 增值服务: '不放货', 销毁: '销毁', 自提: '自提' }[kind] : '-',
    destination: record.destination, salesman: '-', merchandiser: '-', packages: String(record.boxes),
    weight: String(record.weight), volume: String(record.volume), arrived: '是', overseasTime: record.time,
    palletLabel: record.pallet, scheduledAt: order?.scheduledAt || '', waybillRemark: order?.remark || record.remark,
    expectedPickupTime: order?.pickupAt, pickupContact: order?.contact, pickupPhone: order?.phone,
    inventoryRecordIds: [record.id],
  };
  const attachments: InstructionAttachment[] = (order?.attachments || [])
    .filter(file => /^data:[^,]*;base64,/.test(file.dataUrl || ''))
    .map(file => ({
      id: file.id, name: file.name, type: '其他', customerVisible: '可见', dataUrl: file.dataUrl!,
      fileSize: file.size >= 1024 * 1024 ? `${(file.size / 1024 / 1024).toFixed(1)}MB` : `${Math.max(1, Math.ceil(file.size / 1024))}KB`,
      uploadedAt: order?.createdAt || '—', uploadedBy: '—',
    }));
  return {
    row: applyInstructionDetailOverrides(row), attachments,
    inventory: { ...inventory, records: [record], orders: order ? [{ ...order, recordIds: [record.id] }] : [] },
  };
}
