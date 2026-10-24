import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialOverseasInventory } from './overseasStorageInventoryData';
import { clearInventoryOrderFilters, emptyInventoryFilters, matchesInventoryFilters } from './overseasStorageInventoryFilters';

const records = createInitialOverseasInventory().records;
const row = {
  ...records[0], waybillNo: 'WB-001', fbaNo: 'FBA-002', warehouseCode: 'ONT8', destination: 'ABE2',
  service: '美森15日达-快递派', applicationNo: 'APP-003', shipmentId: 'SHIP-004', referenceId: 'REF-005',
  waybillType: 'FBA', releaseType: '发货' as const, financialAudit: '已审核', time: '2026-10-24 18:00:00',
};

test('inventory filters match the displayed column, including warehouse code rather than the old FBA destination', () => {
  for (const key of ['customer', 'waybillNo', 'fbaNo', 'warehouseCode', 'service', 'blocked'] as const) {
    assert(matchesInventoryFilters(row, { ...emptyInventoryFilters, [key]: row[key] }, '暂存'), key);
    assert(!matchesInventoryFilters(row, { ...emptyInventoryFilters, [key]: 'not-a-match' }, '暂存'), key);
  }
  assert(!matchesInventoryFilters(row, { ...emptyInventoryFilters, warehouseCode: row.destination }, '暂存'));
  assert(!matchesInventoryFilters(row, { ...emptyInventoryFilters, waybillNo: row.fbaNo }, '暂存'));
  assert(!matchesInventoryFilters(row, { ...emptyInventoryFilters, waybillNo: row.inbound }, '暂存'));
});

test('identifier searches support a partial single value and exact batches with common separators', () => {
  for (const key of ['waybillNo', 'fbaNo', 'applicationNo', 'shipmentId', 'referenceId'] as const) {
    const ready = { ...row, status: '待出库' as const };
    assert(matchesInventoryFilters(ready, { ...emptyInventoryFilters, [key]: row[key].slice(-3) }, '待出库'), key);
    for (const separator of [',', '，', ';', '；', '\n', ' ']) {
      assert(matchesInventoryFilters(ready, { ...emptyInventoryFilters, [key]: 'OTHER' + separator + row[key].toLowerCase() }, '待出库'), key);
      assert(!matchesInventoryFilters(ready, { ...emptyInventoryFilters, [key]: 'OTHER' + separator + row[key].slice(-3) }, '待出库'), key);
    }
    assert(!matchesInventoryFilters({ ...ready, [key]: undefined }, { ...emptyInventoryFilters, [key]: row[key] }, '待出库'), key);
  }
});

test('status, combined filters, and inclusive dates limit results together', () => {
  assert(matchesInventoryFilters(row, { ...emptyInventoryFilters, from: '2026-10-24', to: '2026-10-24', warehouseCode: 'ONT8', fbaNo: '002' }, '暂存'));
  assert(!matchesInventoryFilters(row, { ...emptyInventoryFilters, from: '2026-10-25' }, '暂存'));
  assert(!matchesInventoryFilters(row, { ...emptyInventoryFilters, to: '2026-10-23' }, '暂存'));
  assert(!matchesInventoryFilters(row, emptyInventoryFilters, '待出库'));
  for (const status of ['暂存', '待出库', '已出库'] as const) {
    assert.equal(records.filter(record => matchesInventoryFilters(record, emptyInventoryFilters, status)).length, records.filter(record => record.status === status).length);
  }
});

test('order filters apply to outgoing lists and are cleared when switching tabs', () => {
  for (const key of ['applicationNo', 'shipmentId', 'referenceId', 'waybillType', 'releaseType', 'financialAudit'] as const) {
    for (const status of ['待出库', '已出库'] as const) {
      assert(matchesInventoryFilters({ ...row, status }, { ...emptyInventoryFilters, [key]: row[key] }, status), key);
      assert(!matchesInventoryFilters({ ...row, status }, { ...emptyInventoryFilters, [key]: 'not-a-match' }, status), key);
    }
    const filters = { ...emptyInventoryFilters, warehouseCode: 'ONT8', [key]: 'not-a-match' };
    assert(matchesInventoryFilters(row, filters, '暂存'), 'hidden order fields must not filter stored inventory');
    const cleared = clearInventoryOrderFilters(filters);
    assert.equal(cleared[key], '');
    assert.equal(cleared.warehouseCode, 'ONT8');
    assert.equal(filters[key], 'not-a-match', 'clearing must preserve the previous state object');
  }
});
