import type { InstructionListRow } from './instructionListTypes';
import type { InventoryRecord } from './overseasStorageInventoryData';

// The original instruction and inventory reference datasets predate each other.
// Keep their identities intact and record the demo relationship explicitly.
const exampleGroups: readonly [string, string, readonly string[]][] = [
  ['USSZ202608160010', 'staging-1', ['CI20260816212041676418']],
  ['USSZ202608160007', 'staging-2', ['CI20260816204724154817', 'CI20260816193802324353', 'CI20260816195234275586']],
  ['USSZ202608160008', 'staging-3', ['CI20260816203326240194', 'CI20260816202855497409', 'CI20260816202623348225']],
  ['USSZ202608160006', 'staging-4', ['CI20260816184242053121', 'CI20260816184014763649']],
  ['USSZ202608130006', 'staging-5', ['CI202608161612771649']],
  ['USSZ202608180013', 'staging-6', ['CI20260818103028623540']],
  ['USSZ202608180014', 'staging-7', ['CI20260818094516178205']],
  ['USSZ202608120002', 'ready-1', ['CI202608151005320118']],
  ['USSZ202608120003', 'ready-2', ['CI202608151130450102']],
  ['USSZ202608120004', 'ready-3', ['CI202608151402338719']],
  ['USSZ202608120005', 'ready-4', ['CI202608160910156642']],
  ['USSZ202608110001', 'ready-5', ['CI202608141024190021']],
  ['USSZ202608110002', 'ready-6', ['CI202608141210336655']],
  ['USSZ202608110003', 'ready-7', ['CI202608141530276612']],
  ['USSZ202608110004', 'ready-8', ['CI202608150945128803']],
  ['USSZ202608090001', 'ready-9', ['CI202608121045332201']],
  ['USSZ202608090002', 'ready-10', ['CI202608121420556677']],
  ['USSZ202608090003', 'ready-11', ['CI202608130910334488']],
  ['USSZ202608090004', 'ready-12', ['CI202608131520117799']],
  ['USSZ202608120006', 'shipped-1', ['CI202608161120337788']],
  ['USSZ202608110005', 'shipped-2', ['CI202608151610447755']],
  ['USSZ202608050001', 'shipped-3', ['CI202608080930112233']],
  ['USSZ202608050002', 'shipped-4', ['CI202608081510445566']],
  ['USSZ202608040001', 'shipped-5', ['CI202608071015223344']],
  ['USSZ202608040002', 'shipped-6', ['CI202608071430551122']],
  ['USSZ202608070001', 'staging-8', ['CI202608101020304050']],
  ['USSZ202608070002', 'staging-9', ['CI202608101430556677']],
  ['USSZ202608070003', 'staging-10', ['CI202608110910223344']],
  ['USSZ202608070004', 'staging-11', ['CI202608111610556699']],
  ['USSZ202608060001', 'staging-12', ['CI202608091030445511']],
  ['USSZ202608060002', 'staging-13', ['CI202608091425336622']],
  ['USSZ202608060003', 'ready-13', ['CI202608101615227733']],
];

const normalized = (value: string | undefined) => value?.trim().toLowerCase() || '';
const exampleLinks = new Map(exampleGroups.flatMap(([waybill, recordId, instructionNos]) =>
  instructionNos.map(instructionNo => [`${normalized(waybill)}:${instructionNo}`, recordId] as const)));

/** Only call for the bundled original CI rows; user-created rows retain their own relationships. */
export function withInstructionInventoryLink<T extends InstructionListRow>(row: T): T {
  if (row.inventoryRecordIds?.length) return row;
  const recordId = exampleLinks.get(`${normalized(row.waybill)}:${row.instructionNo}`);
  return recordId ? { ...row, inventoryRecordIds: [recordId], inventoryLinkSource: 'example' } : row;
}

function isUntouchedExample(record: InventoryRecord): boolean {
  const match = /^(staging|ready|shipped)-([1-9]\d*)$/.exec(record.id);
  if (!match) return false;
  const ordinal = Number(match[2]) + (match[1] === 'ready' ? 100 : match[1] === 'shipped' ? 200 : 0);
  return normalized(record.waybillNo) === normalized('TT20261019' + String(ordinal).padStart(6, '0'));
}

/** Resolve the same inventory records for the list, search, export and detail header. */
export function getInstructionInventoryRecords(
  row: Pick<InstructionListRow, 'waybill' | 'inventoryRecordIds' | 'inventoryLinkSource'>,
  inventory: readonly InventoryRecord[],
): InventoryRecord[] {
  const waybill = normalized(row.waybill);
  const exactMatches = waybill ? inventory.filter(record => normalized(record.waybillNo) === waybill) : [];
  if (exactMatches.length) return exactMatches;
  const ids = new Set(row.inventoryRecordIds || []);
  return inventory.filter(record => ids.has(record.id) && (row.inventoryLinkSource !== 'example' || isUntouchedExample(record)));
}

export function getInstructionPalletLabel(row: InstructionListRow, inventory: readonly InventoryRecord[]): string {
  const records = getInstructionInventoryRecords(row, inventory);
  if (!records.length) return row.palletLabel?.trim() || '';
  return [...new Set(records.map(record => record.pallet.trim()).filter(Boolean))].join('；');
}
