import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { getInventoryInstructionDetail } from './inventoryInstructionDetail';
import { createInitialOverseasInventory, createReleaseDraft } from './overseasStorageInventoryData';
import { getInstructionCargoRows } from './instructionCargoRows';
import { getInstructionWaybillContext } from './instructionWaybillContext';
import { loadInstructionDetail, saveInstructionDetail } from './instructionDetailStore';

const memory = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
  getItem: (key: string) => memory.get(key) ?? null, setItem: (key: string, value: string) => memory.set(key, value),
} });
beforeEach(() => memory.clear());

test('pending outbound and shipped details use processing permissions and their own cargo and itemized fees', () => {
  const inventory = createInitialOverseasInventory();
  const original = structuredClone(inventory);
  for (const record of inventory.records.filter(record => record.status !== '暂存')) {
    const detail = getInventoryInstructionDetail(record, inventory);
    assert.equal(detail.row.tab, '处理中');
    assert.equal(detail.row.instructionNo, record.applicationNo);
    assert.equal(detail.row.waybill, record.waybillNo);
    assert.equal(detail.row.packages, String(record.boxes));
    assert.deepEqual(getInstructionCargoRows(detail.row, detail.inventory).map(box => box.id), record.cargoBoxes.map(box => box.id));
    assert.equal(detail.row.operationFees?.length, record.instructions?.length);
    assert.deepEqual(detail.row.operationFees?.map(fee => fee.images), record.instructions?.map(fee => fee.images?.map(image => ({ id: image.id, name: image.name, dataUrl: image.dataUrl }))));
  }
  assert.deepEqual(inventory, original);
});

test('duplicate application numbers preserve independent saved details across both inventory stages and the instruction list', () => {
  const inventory = createInitialOverseasInventory();
  const ready = getInventoryInstructionDetail(inventory.records.find(record => record.id === 'ready-1')!, inventory).row;
  const shipped = getInventoryInstructionDetail(inventory.records.find(record => record.id === 'shipped-1')!, inventory).row;
  assert.equal(ready.instructionNo, shipped.instructionNo);
  const readyState = loadInstructionDetail(ready);
  const shippedState = loadInstructionDetail(shipped);
  saveInstructionDetail(ready, { ...readyState, customerNote: '待出库记录', cargoTransferNumbers: { 'ready-1:box:1': 'TRANSFER-READY' } });
  saveInstructionDetail(shipped, { ...shippedState, customerNote: '已出库记录' });
  const listRow = { ...ready, detailStorageKey: undefined };
  saveInstructionDetail(listRow, { ...loadInstructionDetail(listRow), customerNote: '指令列表记录' });
  assert.equal(loadInstructionDetail(ready).customerNote, '待出库记录');
  assert.equal(loadInstructionDetail(shipped).customerNote, '已出库记录');
  assert.equal(loadInstructionDetail(listRow).customerNote, '指令列表记录');
});

test('only the matching release supplies attachments, fields and fees without changing its multi-record identity', () => {
  const inventory = createInitialOverseasInventory();
  const record = inventory.records.find(record => record.id === 'ready-1')!;
  const other = inventory.records.find(record => record.id === 'ready-2')!;
  const draft = createReleaseDraft([record]);
  inventory.orders = [{ ...draft, id: 'matching', applicationNo: record.applicationNo!, recordIds: [record.id, other.id],
    createdAt: '2026-11-09 10:00:00', status: '待审批', scheduledAt: '2026-11-10', deliveryMethod: 'FEDEX',
    attachments: [{ id: 'source-file', name: '原始附件.txt', size: 4, type: 'text/plain', dataUrl: 'data:text/plain;base64,dGVzdA==' }],
  }, { ...draft, id: 'unrelated', applicationNo: 'OTHER', recordIds: [record.id], createdAt: '2026-11-09 11:00:00', status: '待审批',
    attachments: [{ id: 'unrelated-file', name: '无关文件.txt', size: 4, type: 'text/plain', dataUrl: 'data:text/plain;base64,dGVzdA==' }],
  }];
  const detail = getInventoryInstructionDetail(record, inventory);
  assert.deepEqual(detail.attachments.map(file => file.id), ['source-file']);
  const context = getInstructionWaybillContext(detail.row, detail.inventory);
  assert.equal(context.summary.deliveryMethod, 'FEDEX');
  assert.equal(context.fields.scheduledAt, '2026-11-10');
  assert.deepEqual(inventory.orders[0].recordIds, [record.id, other.id]);
  const initial = loadInstructionDetail(detail.row, detail.attachments);
  assert.equal(initial.attachments[0].name, '原始附件.txt');
  saveInstructionDetail(detail.row, { ...initial, attachments: [] });
  assert.deepEqual(loadInstructionDetail(detail.row, detail.attachments).attachments, [], 'deleted source attachments must not return on reopen');
});

test('scoping the detail prevents another stock record with the same waybill from replacing its cargo', () => {
  const inventory = createInitialOverseasInventory();
  const record = inventory.records.find(record => record.id === 'ready-1')!;
  inventory.records.find(record => record.id === 'ready-2')!.waybillNo = record.waybillNo;
  const detail = getInventoryInstructionDetail(record, inventory);
  assert.deepEqual(getInstructionCargoRows(detail.row, detail.inventory).map(box => box.id), record.cargoBoxes.map(box => box.id));
});
