import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { toInterceptInstructionRow, type InterceptInstructionSource } from './overseasInterceptInstructions';
import { getInstructionOperations } from './instructionOperationDisplay';
import { loadInstructionDetail, saveInstructionDetail } from './instructionDetailStore';
import OverseasWarehouseInterceptPage, { getInterceptInstructionRows } from './OverseasWarehouseInterceptPage';
import InstructionListPage from './InstructionListPage';

const memory = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => memory.set(key, value),
} });
beforeEach(() => memory.clear());

const source = (patch: Partial<InterceptInstructionSource> = {}): InterceptInstructionSource => ({
  id: 123, no: 'INT-123', waybillNo: 'WB-123', customer: '测试客户', status: '拦截中',
  appliedAt: '2026-10-24 10:00:00', handleAt: '', applicant: '测试员', boxes: 10, actualBoxes: '',
  reason: '暂缓派送', failReason: '', customerNote: '', internalRemark: '', instructionFees: [
    { code: 'PHOTO', name: '拍照', type: '操作费', unit: '张', price: '2.5', quantity: '3', currency: '美元', exchangeRate: '7.1', description: '拍摄箱唛', status: '已处理' },
    { code: 'LABEL', name: '换标', type: '操作费', unit: '箱', price: '4', quantity: '10', currency: '人民币', description: '核对标签' },
  ], ...patch,
});

test('counts instruction entries independently from billed quantities and uses the list formatter', () => {
  const task = source();
  const before = structuredClone(task);
  const row = toInterceptInstructionRow(task);
  const operations = getInstructionOperations(row);
  assert.equal(operations.length, 2);
  assert.equal(operations.filter(operation => operation.done).length, 1);
  assert.equal(operations[0].description, '7.5 USD 拍照 (2.5/张)');
  assert.equal(operations[1].description, '40 CNY 换标 (4/箱)');
  assert.equal(row.fee, '93.25');
  assert.deepEqual(task, before);
  assert.deepEqual(getInstructionOperations(toInterceptInstructionRow(source({ instructionFees: [] }))), []);
  assert.equal(getInstructionOperations(toInterceptInstructionRow(source({ status: '已完成' })))[1].done, false, 'intercept outcome must not mark unrelated operations complete');
});

test('both views read saved detail edits and isolate repeated intercepts and other waybills', () => {
  const row = toInterceptInstructionRow(source());
  const state = loadInstructionDetail(row);
  saveInstructionDetail(row, { ...state, feesEdited: true, fees: state.fees.map(fee => ({ ...fee, status: '已处理' })) });
  assert.equal(getInstructionOperations(toInterceptInstructionRow(source())).filter(operation => operation.done).length, 2);
  const repeated = toInterceptInstructionRow(source({ id: 124, no: 'INT-124' }));
  assert.equal(getInstructionOperations(repeated).filter(operation => operation.done).length, 1);
  assert.equal(getInstructionOperations(toInterceptInstructionRow(source({ waybillNo: 'WB-OTHER' }))).filter(operation => operation.done).length, 1);
  saveInstructionDetail(row, { ...loadInstructionDetail(row), feesEdited: true, fees: [] });
  assert.deepEqual(getInstructionOperations(row), [], 'deleting all instructions must not restore the source names');
});

test('zero quantities stay zero and duplicate fee codes retain independent identities', () => {
  const task = source();
  task.instructionFees = [task.instructionFees![0], { ...task.instructionFees![0], quantity: '0', status: '待处理' }];
  const operations = getInstructionOperations(toInterceptInstructionRow(task));
  assert.equal(new Set(operations.map(operation => operation.id)).size, 2);
  assert.equal(operations[1].description, '0 USD 拍照 (2.5/张)');
  assert.equal(operations[1].done, false);
});

test('intercept and instruction list render the same saved count and operation text', () => {
  const row = getInterceptInstructionRows()[0];
  assert.ok(row);
  const state = loadInstructionDetail(row);
  saveInstructionDetail(row, { ...state, feesEdited: true, fees: [
    { ...state.fees[0], id: 'completed-op', name: '关联拍照', status: '已处理' },
    { ...state.fees[0], id: 'pending-op', name: '关联换标', status: '待处理' },
  ] });
  const intercept = renderToStaticMarkup(<OverseasWarehouseInterceptPage />);
  assert.match(intercept, /<th[^>]*>指令数量<\/th>/);
  assert.match(intercept, /<th[^>]*>指令<\/th>/);
  assert.ok(!intercept.includes('>指令费用</th>'));
  assert.ok(intercept.includes('aria-label="指令数量 1/2"'));
  assert.ok(intercept.includes('关联拍照') && intercept.includes('关联换标'));
  const list = renderToStaticMarkup(<InstructionListPage interceptRows={[{ ...row, tab: '待确认' }]} />);
  assert.match(list, /<th[^>]*>运单类型<\/th>/);
  assert.match(list, /<th[^>]*>下单类型<\/th>/);
  assert.ok(!list.includes('指令单类型'));
  assert.ok(list.includes('aria-label="指令数量 1/2"'));
  assert.ok(list.includes('关联拍照') && list.includes('关联换标'));
});
