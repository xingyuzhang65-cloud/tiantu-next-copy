import test from 'node:test';
import assert from 'node:assert/strict';
import { buildReservationLinks, getLinkedWaybillIds, mergePickingRecords, parseReservationNumbers, resolveReservationNumbers, summarizeReservationPicking, summarizeWaybillPicking, validateReservationLinks, type PickingRecord, type WaybillIdentity } from './reservationWaybillLinks';
import { createReservationPickingStore } from './reservationPickingStore';

const a: WaybillIdentity = { id: 'internal-a', systemNo: 'YD001', customerNo: 'KH001', fbaNo: 'FBA001', customer: '甲客户', expectedPieces: 5 };
const b: WaybillIdentity = { id: 'internal-b', systemNo: 'YD002', customerNo: 'KH002', fbaNo: 'FBA002', customer: '甲客户', expectedPieces: 3 };
const other: WaybillIdentity = { ...a, id: 'other-customer', customer: '乙客户' };
const record = (patch: Partial<PickingRecord> = {}): PickingRecord => ({ id: 'batch-1', waybillId: a.id, revision: 1, pieces: 2, volume: 2, weight: 10, status: 'active', updatedAt: '2026-10-29T10:00:00Z', ...patch });
const storage = () => {
  const data = new Map<string, string>();
  return { getItem: (key: string) => data.get(key) || null, setItem: (key: string, value: string) => { data.set(key, value); } };
};

test('三种编号在客户范围内按内部运单ID关联和去重，不重复计算方数', () => {
  const bindings = resolveReservationNumbers(a.customer, parseReservationNumbers('YD001,KH001\nFBA001'), [a, b, other]);
  const links = buildReservationLinks(a.customer, bindings, [a, b, other]);
  assert.equal(bindings.length, 3);
  assert.deepEqual(links.waybills.map(waybill => waybill.id), [a.id]);
  const total = summarizeReservationPicking(links.waybills, [record()]);
  assert.equal(total.waybills, 1);
  assert.equal(total.volume, 2);
});

test('分次添加及重复粘贴仍只关联一次，移除一个别名不会移除其余别名指向的运单', () => {
  const first = resolveReservationNumbers(a.customer, ['YD001'], [a]);
  const added = resolveReservationNumbers(a.customer, ['YD001', 'KH001', 'yd001'], [a], first);
  assert.equal(added.length, 2);
  assert.deepEqual(getLinkedWaybillIds(added), [a.id]);
  assert.deepEqual(getLinkedWaybillIds(added.filter(binding => binding.number === 'KH001')), [a.id]);
});

test('一个FBA号匹配多票时不默认选择，允许显式勾选多票', () => {
  const catalog = [a, { ...b, fbaNo: a.fbaNo }];
  const bindings = resolveReservationNumbers(a.customer, ['FBA001'], catalog);
  assert.deepEqual(bindings[0].selectedIds, []);
  assert.match(validateReservationLinks(bindings), /勾选/);
  bindings[0].selectedIds = [a.id, b.id];
  assert.equal(buildReservationLinks(a.customer, bindings, catalog).waybills.length, 2);
});

test('未匹配编号阻止保存，选填为空不影响原有预留', () => {
  const missing = resolveReservationNumbers(a.customer, ['不存在'], [a]);
  assert.match(validateReservationLinks(missing), /未匹配/);
  assert.throws(() => buildReservationLinks(a.customer, missing, [a]), /未匹配/);
  assert.deepEqual(buildReservationLinks(a.customer, [], [a]), { identifiers: [], waybills: [] });
});

test('切换客户后重新匹配全部编号，不沿用其他客户的内部ID', () => {
  const original = resolveReservationNumbers(a.customer, ['YD001'], [a, other]);
  const switched = resolveReservationNumbers(other.customer, ['YD001'], [a, other], original);
  assert.deepEqual(switched[0].selectedIds, [other.id]);
  const unmatched = resolveReservationNumbers('无运单客户', ['YD001'], [a, other], original);
  assert.match(validateReservationLinks(unmatched), /未匹配/);
});

test('保存后未拣货展示待回传及空数值，分批数据驱动待拣货/部分/完成', () => {
  assert.deepEqual(summarizeWaybillPicking(a, []), { status: '待拣货', pieces: null, volume: null, weight: null, records: 0 });
  assert.equal(summarizeWaybillPicking(a, [record()]).status, '部分拣货');
  assert.equal(summarizeWaybillPicking(a, [record(), record({ id: 'batch-2', pieces: 3, volume: 1 })]).status, '拣货完成');
});

test('相同批次重复回传不累加，更正到2.3方及撤销后重新汇总', () => {
  const initial = mergePickingRecords([], [record(), record()]);
  assert.equal(summarizeWaybillPicking(a, initial).volume, 2);
  const corrected = mergePickingRecords(initial, [record({ revision: 2, volume: 2.3 })]);
  assert.equal(summarizeWaybillPicking(a, corrected).volume, 2.3);
  const canceled = mergePickingRecords(corrected, [record({ revision: 3, volume: 2.3, status: 'revoked' })]);
  assert.equal(summarizeWaybillPicking(a, canceled).volume, 0);
  assert.equal(summarizeWaybillPicking(a, canceled).pieces, 0);
  assert.equal(summarizeWaybillPicking(a, mergePickingRecords(canceled, [record()])).volume, 0);
});

test('相同版本冲突及非法数据拒绝写入，不破坏旧数据', () => {
  const initial = [record()];
  assert.throws(() => mergePickingRecords(initial, [record({ volume: 5 })]), /版本数据冲突/);
  assert.throws(() => mergePickingRecords(initial, [record({ revision: 2, pieces: -1 })]), /无效/);
  assert.equal(initial[0].volume, 2);
});

test('预留单内部去重但不限制跨预留单关联；人工预留方数不受回传改变', () => {
  const bindings = resolveReservationNumbers(a.customer, ['YD001'], [a]);
  const first = { id: 'reserve-1', volume: 9, links: buildReservationLinks(a.customer, bindings, [a]) };
  const second = { id: 'reserve-2', volume: 12, links: buildReservationLinks(a.customer, bindings, [a]) };
  assert.equal(summarizeReservationPicking([...first.links.waybills, ...first.links.waybills], [record()]).volume, 2);
  assert.equal(summarizeReservationPicking(second.links.waybills, [record()]).volume, 2);
  assert.equal(first.volume, 9);
  assert.equal(second.volume, 12);
});

test('保存后立即查询已有拣货，失败保留最近成功数据，重试后恢复', async () => {
  const store = createReservationPickingStore(storage());
  store.configureSource(async () => [record()]);
  await store.sync([a.id]);
  assert.equal(store.getSnapshot().records[0].volume, 2);
  const successfulAt = store.getSnapshot().sync[a.id].lastSyncedAt;
  store.configureSource(async () => { throw new Error('仓库接口暂不可用'); });
  await store.sync([a.id]);
  assert.equal(store.getSnapshot().records[0].volume, 2);
  assert.equal(store.getSnapshot().sync[a.id].lastSyncedAt, successfulAt);
  assert.match(store.getSnapshot().sync[a.id].error!, /暂不可用/);
  store.configureSource(async () => [record({ revision: 2, volume: 2.3 })]);
  await store.sync([a.id]);
  assert.equal(store.getSnapshot().records[0].volume, 2.3);
  assert.equal(store.getSnapshot().sync[a.id].error, undefined);
});

test('回传事件自动通知，刷新读取保存数据，旧的异步查询不会覆盖新回传', async () => {
  const memory = storage(), store = createReservationPickingStore(memory);
  let notifications = 0;
  store.subscribe(() => notifications++);
  let finish: (records: PickingRecord[]) => void;
  store.configureSource(() => new Promise(resolve => { finish = resolve; }));
  const pending = store.sync([a.id]);
  store.receive(record({ revision: 2, volume: 2.3 }));
  finish!([record()]);
  await pending;
  assert.equal(store.getSnapshot().records[0].volume, 2.3);
  assert.equal(notifications, 1);
  assert.equal(createReservationPickingStore(memory).getSnapshot().records[0].volume, 2.3);
});

test('回传错运单时标记异常且保留数据，持久化失败时不发布半写入状态', async () => {
  const store = createReservationPickingStore(storage());
  store.receive(record());
  store.configureSource(async () => [record({ waybillId: b.id })]);
  await store.sync([a.id]);
  assert.match(store.getSnapshot().sync[a.id].error!, /不一致/);
  assert.equal(store.getSnapshot().records[0].volume, 2);
  const failing = createReservationPickingStore({ getItem: () => null, setItem: () => { throw new Error('存储已满'); } });
  assert.throws(() => failing.receive(record()), /存储已满/);
  assert.equal(failing.getSnapshot().records.length, 0);
});
