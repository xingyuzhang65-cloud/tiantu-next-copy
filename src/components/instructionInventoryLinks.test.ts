import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createInitialOverseasInventory } from './overseasStorageInventoryData';
import { getInstructionInventoryRecords, getInstructionPalletLabel, withInstructionInventoryLink } from './instructionInventoryLinks';
import type { InstructionListRow } from './instructionListTypes';

const originalList = readFileSync(new URL('./InstructionListPage.tsx', import.meta.url), 'utf8').split('// 仅“放货”')[0];
const fixtures = [...originalList.matchAll(/id: '([^']+)', tab: '[^']+', waybill: '([^']+)', instructionNo: '([^']+)'/g)]
  .map(match => ({ id: match[1], waybill: match[2], instructionNo: match[3] } as InstructionListRow));

test('every original CI keeps its identity and shares an existing canonical inventory pallet', () => {
  const inventory = createInitialOverseasInventory().records;
  const pool = new Set(inventory.map(record => record.pallet));
  const groupLabels = new Map<string, string>();
  assert.equal(fixtures.length, 37);
  for (const row of fixtures) {
    const linked = withInstructionInventoryLink(row);
    assert.equal(linked.instructionNo, row.instructionNo);
    assert.equal(linked.waybill, row.waybill);
    const records = getInstructionInventoryRecords(linked, inventory);
    assert.equal(records.length, 1, row.instructionNo);
    const label = getInstructionPalletLabel(linked, inventory);
    assert.ok(label && pool.has(label), row.instructionNo);
    if (groupLabels.has(row.waybill)) assert.equal(label, groupLabels.get(row.waybill));
    groupLabels.set(row.waybill, label);
  }
});

test('real same-waybill inventory supersedes the example link and deduplicates current pallet values', () => {
  const inventory = createInitialOverseasInventory().records;
  const row = withInstructionInventoryLink(fixtures[0]);
  const current = { ...inventory[1], id: 'real-stock', waybillNo: ' ' + row.waybill.toLowerCase() + ' ', pallet: 'CURRENT-PALLET' };
  const duplicate = { ...current, id: 'real-stock-2' };
  assert.deepEqual(getInstructionInventoryRecords(row, [...inventory, current, duplicate]).map(record => record.id), ['real-stock', 'real-stock-2']);
  assert.equal(getInstructionPalletLabel(row, [...inventory, current, duplicate]), 'CURRENT-PALLET');
  assert.equal(getInstructionPalletLabel(row, [...inventory, { ...current, pallet: '' }]), '');
});

test('editing an example pallet is reflected directly, but repurposing its record cannot leak a custom customer pallet', () => {
  const inventory = createInitialOverseasInventory().records;
  const row = withInstructionInventoryLink(fixtures[0]);
  const target = inventory.find(record => record.id === row.inventoryRecordIds![0])!;
  assert.equal(getInstructionPalletLabel(row, [{ ...target, pallet: 'UPDATED-EXAMPLE-PALLET' }]), 'UPDATED-EXAMPLE-PALLET');
  assert.equal(getInstructionPalletLabel(row, [{ ...target, waybillNo: 'CUSTOM-WAYBILL', pallet: 'PRIVATE-PALLET' }]), '');
});

test('user-created instructions receive no inferred demo link and explicit real links remain supported', () => {
  const inventory = createInitialOverseasInventory().records;
  const custom = { ...fixtures[0], instructionNo: 'CI-CUSTOM', palletLabel: 'SAVED-SNAPSHOT' };
  assert.equal(withInstructionInventoryLink(custom), custom);
  assert.equal(getInstructionPalletLabel(custom, inventory), 'SAVED-SNAPSHOT');
  const target = { ...inventory[0], waybillNo: 'CUSTOM-WAYBILL', pallet: 'EXPLICIT-REAL-PALLET' };
  assert.equal(getInstructionPalletLabel({ ...custom, inventoryRecordIds: [target.id] }, [target]), target.pallet);
});
