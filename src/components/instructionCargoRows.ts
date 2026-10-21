import type { InstructionListRow } from './instructionListTypes';
import type { InventoryState } from './overseasStorageInventoryData';
import type { InstructionCargoRow } from './instructionDetailData';
import { getInstructionInventoryRecords } from './instructionInventoryLinks';
import { buildInstructionDetail } from './instructionDetailData';

export function getInstructionCargoRows(row: InstructionListRow, inventory: InventoryState): InstructionCargoRow[] {
  const count = Number(row.packages);
  if (!Number.isSafeInteger(count) || count < 1) return [];
  const boxes = getInstructionInventoryRecords(row, inventory.records).flatMap(record => record.cargoBoxes);
  if (boxes.length === count) return boxes.map(box => ({ id: box.id, boxNo: box.boxNo, packages: 1,
    customerLines: [`重量：${box.weight} KG`, `尺寸：${box.dimensions}`], pickingLines: [`${box.systemWeight} KG`] }));
  const summary = buildInstructionDetail(row).cargoRows[0];
  return Array.from({ length: count }, (_, index) => ({
    id: `${row.id}:cargo:${index + 1}`, boxNo: '—', packages: 1,
    customerLines: count === 1 ? summary.customerLines : ['件数：1 件', '重量：—', '尺寸：—'], pickingLines: ['—'],
  }));
}
