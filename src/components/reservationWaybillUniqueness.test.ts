import test from 'node:test';
import assert from 'node:assert/strict';
import { buildReservationLinks, getLinkedWaybillIds, getWaybillIdentity, resolveReservationNumbers, validateReservationLinks, type WaybillIdentity } from './reservationWaybillLinks';
import { findReservationConflicts, getReservationCandidateState, removeConflictingReservationBindings, reservationConflictMessage, type ReservationOwner } from './reservationWaybillUniqueness';
import { createReservationWaybillMocks, mergeReservationWaybillMocks, reservationMultiFbaDemo as demo, reservationMultiFbaMockWaybills } from './reservationWaybillMocks';

const a: WaybillIdentity = { id: 'waybill-a', systemNo: 'YD001', customerNo: 'KH001', fbaNo: 'FBA001', customer: '客户甲', expectedPieces: 5 };
const b: WaybillIdentity = { ...a, id: 'waybill-b', systemNo: 'YD002', customerNo: 'KH002', fbaNo: 'FBA002' };
const bindings = (numbers: string[], catalog = [a, b]) => resolveReservationNumbers(a.customer, numbers, catalog);
const owner = (patch: Partial<ReservationOwner> = {}): ReservationOwner => ({
  id: 'reservation-a', reserveNo: 'YL001', status: '已预留', links: buildReservationLinks(a.customer, bindings(['YD001']), [a, b]), ...patch,
});

test('系统运单号、客户单号和FBA号均按实际运单识别跨单重复', () => {
  for (const number of ['YD001', ' kh001 ', 'fba001']) {
    const conflicts = findReservationConflicts(getLinkedWaybillIds(bindings([number])), [owner()]);
    assert.equal(conflicts.length, 1);
    assert.equal(conflicts[0].systemNo, 'YD001');
    assert.match(reservationConflictMessage(conflicts[0]), /YL001（已预留）/);
  }
});

test('编辑排除自身，但仍识别其他预留单，且保留全部历史冲突来源', () => {
  assert.deepEqual(findReservationConflicts([a.id], [owner()], 'reservation-a'), []);
  const other = owner({ id: 'reservation-b', reserveNo: 'YL002' });
  assert.equal(findReservationConflicts([a.id], [owner(), other], 'reservation-a')[0].owners[0].reserveNo, 'YL002');
  assert.deepEqual(findReservationConflicts([a.id, a.id], [owner(), other])[0].owners.map(item => item.reserveNo), ['YL001', 'YL002']);
});

test('预留、送仓、取消均校验；普通匹配来源不占用预留关联', () => {
  for (const status of ['已预留', '已送仓', '已取消']) {
    assert.equal(findReservationConflicts([a.id], [owner({ status })]).length, 1);
  }
  assert.deepEqual(findReservationConflicts([a.id], [owner({ links: undefined })]), []);
});

test('批量输入只定位冲突运单，移除全部重复项保留有效编号和未识别编号', () => {
  const input = bindings(['YD001', 'KH001', 'YD002', 'NOT-FOUND']);
  const conflicts = findReservationConflicts(getLinkedWaybillIds(input), [owner()]);
  const remaining = removeConflictingReservationBindings(input, conflicts);
  assert.deepEqual(remaining.map(item => item.number), ['YD002', 'NOT-FOUND']);
  assert.deepEqual(getLinkedWaybillIds(remaining), [b.id]);
  assert.equal(input.length, 4);
});

test('一号多票移除占用运单后保留已选择的可用运单', () => {
  const catalog = [a, { ...b, fbaNo: a.fbaNo }];
  const input = resolveReservationNumbers(a.customer, ['FBA001'], catalog).map(item => ({ ...item, selectedIds: [a.id, b.id] }));
  const remaining = removeConflictingReservationBindings(input, findReservationConflicts([a.id, b.id], [owner()]));
  assert.deepEqual(remaining[0].selectedIds, [b.id]);
  assert.deepEqual(buildReservationLinks(a.customer, remaining, catalog).waybills.map(item => item.id), [b.id]);
});

test('未选择的一号多票仅在所有候选被占用时整条移除', () => {
  const catalog = [a, { ...b, fbaNo: a.fbaNo }];
  const input = resolveReservationNumbers(a.customer, ['FBA001'], catalog);
  const first = findReservationConflicts([a.id, b.id], [owner()]);
  assert.equal(removeConflictingReservationBindings(input, first).length, 1);
  const secondOwner = owner({ id: 'reservation-b', links: buildReservationLinks(a.customer, bindings(['YD002']), [a, b]) });
  assert.deepEqual(removeConflictingReservationBindings(input, findReservationConflicts([a.id, b.id], [owner(), secondOwner])), []);
});

test('保存前用最新数据重查可发现表单打开后新增的占用', () => {
  const ids = getLinkedWaybillIds(bindings(['KH001']));
  assert.deepEqual(findReservationConflicts(ids, []), []);
  assert.equal(findReservationConflicts(ids, [owner()]).length, 1);
});

test('同单多个编号按运单ID去重；相同别名对应另一实际运单时可关联', () => {
  const linked = buildReservationLinks(a.customer, bindings(['YD001', 'KH001', 'FBA001']), [a, b]);
  assert.equal(linked.waybills.length, 1);
  const sameAlias = { ...b, customer: '客户乙', customerNo: a.customerNo };
  const otherBinding = resolveReservationNumbers(sameAlias.customer, ['KH001'], [a, sameAlias]);
  assert.deepEqual(findReservationConflicts(getLinkedWaybillIds(otherBinding), [owner()]), []);
});

const demoCatalog = reservationMultiFbaMockWaybills.map(getWaybillIdentity);
const demoBindings = () => resolveReservationNumbers(demo.customer, [demo.fbaNo], demoCatalog);
const demoOwners = () => createReservationWaybillMocks(demoCatalog).orders;

test('FBA测试号匹配3票：1票已占用、2票可关联，初次输入必须选择', () => {
  const bindings = demoBindings();
  assert.equal(bindings[0].candidateIds.length, 3);
  assert.deepEqual(bindings[0].selectedIds, []);
  assert.match(validateReservationLinks(bindings), /勾选需要关联的运单/);
  const conflicts = findReservationConflicts(bindings[0].candidateIds, demoOwners());
  const state = getReservationCandidateState(bindings[0], conflicts);
  assert.deepEqual(state.occupiedIds, [demo.occupiedWaybillId]);
  assert.deepEqual(state.availableIds, demo.availableWaybillIds);
  assert.deepEqual(state.blockingConflicts, []);
  assert.equal(conflicts[0].owners[0].reserveNo, demo.reserveNo);
});

test('选择可用票后只关联该票，同一FBA中未选的占用票不阻止保存', () => {
  const bindings = demoBindings().map(binding => ({ ...binding, selectedIds: [demo.availableWaybillIds[0]] }));
  const candidates = findReservationConflicts(bindings[0].candidateIds, demoOwners());
  assert.deepEqual(getReservationCandidateState(bindings[0], candidates).blockingConflicts, []);
  const links = buildReservationLinks(demo.customer, bindings, demoCatalog);
  assert.deepEqual(links.waybills.map(waybill => waybill.id), [demo.availableWaybillIds[0]]);
  assert.deepEqual(findReservationConflicts(getLinkedWaybillIds(links.identifiers), demoOwners()), []);
  assert.equal(links.identifiers[0].number, demo.fbaNo);
});

test('同一FBA下两票可分别关联不同预留单，再次打开后按实际票数展示占用', () => {
  const owners: ReservationOwner[] = [...demoOwners()];
  demo.availableWaybillIds.forEach((id, index) => {
    const selected = demoBindings().map(binding => ({ ...binding, selectedIds: [id] }));
    const links = buildReservationLinks(demo.customer, selected, demoCatalog);
    assert.deepEqual(findReservationConflicts(links.waybills.map(waybill => waybill.id), owners), []);
    owners.push({ id: `user-${index}`, reserveNo: `YL-TEST-${index}`, status: '已预留', links });
  });
  const binding = demoBindings()[0];
  const conflicts = findReservationConflicts(binding.candidateIds, owners);
  const state = getReservationCandidateState(binding, conflicts);
  assert.equal(state.availableIds.length, 0);
  assert.equal(state.occupiedIds.length, 3);
  assert.equal(state.blockingConflicts.length, 3);
  assert.deepEqual(removeConflictingReservationBindings([binding], conflicts), []);
  assert.equal(new Set(owners.flatMap(order => order.links!.waybills.map(waybill => waybill.id))).size, 3);
});

test('已选择的可用票变为占用时只阻止该票，移除冲突后仍可选择同FBA的其他可用票', () => {
  const bindings = demoBindings().map(binding => ({ ...binding, selectedIds: [demo.availableWaybillIds[0]] }));
  const owners: ReservationOwner[] = [...demoOwners(), {
    id: 'new-owner', reserveNo: 'YL-NEW', status: '已预留', links: buildReservationLinks(demo.customer, bindings, demoCatalog),
  }];
  const conflicts = findReservationConflicts(bindings[0].candidateIds, owners);
  const state = getReservationCandidateState(bindings[0], conflicts);
  assert.deepEqual(state.blockingConflicts.map(conflict => conflict.waybillId), [demo.availableWaybillIds[0]]);
  const remaining = removeConflictingReservationBindings(bindings, state.blockingConflicts);
  assert.equal(remaining.length, 1);
  assert.equal(remaining[0].number, demo.fbaNo);
  assert.deepEqual(remaining[0].selectedIds, []);
  remaining[0].selectedIds = [demo.availableWaybillIds[1]];
  const links = buildReservationLinks(demo.customer, remaining, demoCatalog);
  assert.deepEqual(findReservationConflicts(links.waybills.map(waybill => waybill.id), owners), []);
});

test('编辑占用预留单排除自身；刷新Mock不重置用户对同FBA其他运单的关联', () => {
  const fixtures = demoOwners();
  assert.deepEqual(findReservationConflicts(demoBindings()[0].candidateIds, fixtures, fixtures[0].id), []);
  const selected = demoBindings().map(binding => ({ ...binding, selectedIds: [demo.availableWaybillIds[0]] }));
  const userOrder = { ...fixtures[0], id: 'user-order', reserveNo: 'YL-USER', submitter: '用户', links: buildReservationLinks(demo.customer, selected, demoCatalog) };
  const saved = [userOrder, ...fixtures];
  const reloaded = mergeReservationWaybillMocks(saved, demoOwners());
  assert.deepEqual(reloaded, saved);
  const conflicts = findReservationConflicts(demoBindings()[0].candidateIds, reloaded);
  assert.equal(conflicts.length, 2);
  assert.deepEqual(getReservationCandidateState(demoBindings()[0], conflicts).availableIds, [demo.availableWaybillIds[1]]);
});
