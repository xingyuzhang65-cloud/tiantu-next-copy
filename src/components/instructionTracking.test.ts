import test from 'node:test';
import assert from 'node:assert/strict';
import { formatInstructionTrackingDate, getInstructionTrackingEvents, isInstructionTrackingEvent } from './instructionTracking';
import type { InstructionListRow } from './instructionListTypes';

const row: InstructionListRow = { id: 'ci-1', tab: '待确认', waybill: 'WB-1', instructionNo: 'CI-1', names: ['发货'],
  created: '2026-10-19 10:00:00', updated: '2026-10-20 15:00:00', shipment: '', reference: '', status: '待处理',
  customer: '信永国际', warehouse: 'FTW1', zip: '', orderType: '亚马逊', instructionType: '放货', destination: 'MW003',
  salesman: '', merchandiser: '', fee: '12', packages: '2', weight: '15', volume: '0.1', arrived: '是', overseasTime: '2026-10-20 09:00:00' };

test('default tracking uses actual instruction and warehouse timestamps, in chronological order', () => {
  const original = structuredClone(row);
  const events = getInstructionTrackingEvents(row);
  assert.deepEqual(events.map(event => [event.operator, event.occurredAt, event.status]), [
    ['信永国际', row.created, '已下单'], ['海外仓', row.overseasTime, '已入海外仓'],
  ]);
  const arrivedFirst = getInstructionTrackingEvents({ ...row, overseasTime: '2026-10-18 09:00:00' });
  assert.equal(arrivedFirst[0].status, '已入海外仓');
  assert.deepEqual(row, original);
});

test('unconfirmed arrival and invalid or absent times do not invent tracking milestones', () => {
  assert.deepEqual(getInstructionTrackingEvents({ ...row, arrived: '否' }).map(event => event.status), ['已下单']);
  assert.equal(getInstructionTrackingEvents({ ...row, overseasTime: '-' }).length, 1);
  assert.deepEqual(getInstructionTrackingEvents({ ...row, created: '-', overseasTime: '2026-02-30' }), []);
  assert.deepEqual(getInstructionTrackingEvents({ ...row, tab: '已完成', status: '已处理', updated: '2026-10-25 12:00:00' }), getInstructionTrackingEvents(row));
});

test('release ETA is a dated tracking node and absent, invalid or other instruction ETAs are not invented', () => {
  const eta='2026-10-23T14:30';
  const events=getInstructionTrackingEvents({...row,estimatedDeliveryAt:eta});
  assert.deepEqual(events.map(event=>event.status),['已下单','已入海外仓','预计送达时间']);
  assert.equal(events.at(-1)?.occurredAt,eta);
  assert.equal(events.at(-1)?.operator,'—');
  assert.deepEqual(getInstructionTrackingEvents({...row,estimatedDeliveryAt:''}),getInstructionTrackingEvents(row));
  assert.deepEqual(getInstructionTrackingEvents({...row,estimatedDeliveryAt:'2026-02-30'}),getInstructionTrackingEvents(row));
  assert.deepEqual(getInstructionTrackingEvents({...row,instructionType:'自提',estimatedDeliveryAt:eta}),getInstructionTrackingEvents(row));
});

test('manual nodes retain their own times, sort with actual events and do not mutate saved input', () => {
  const additions = [{ id: 'manual-1', occurredAt: '2026-10-19T14:30', operator: '天旭', status: '已揽货' }];
  const original = structuredClone(additions);
  const events = getInstructionTrackingEvents(row, additions);
  assert.deepEqual(events.map(event => event.status), ['已下单', '已揽货', '已入海外仓']);
  events[1].operator = '只改视图';
  assert.deepEqual(additions, original);
});

test('dates show the calendar weekday and invalid timestamps cannot become stored tracking events', () => {
  assert.equal(formatInstructionTrackingDate('2026-10-19 23:30:00'), '2026-10-19（星期一）');
  assert.equal(formatInstructionTrackingDate('2026-10-20T00:30'), '2026-10-20（星期二）');
  assert.equal(formatInstructionTrackingDate('bad time'), '—');
  const event = { id: 'node', occurredAt: '2028-02-29T10:30', operator: '操作方', status: '已揽货' };
  assert(isInstructionTrackingEvent(event));
  assert(isInstructionTrackingEvent({ ...event, type: '正常运踪', country: '' }));
  assert(isInstructionTrackingEvent({ ...event, type: '异常运踪', country: '美国' }));
  for (const occurredAt of ['2026-02-29T10:30', '2026-04-31', '2026-10-19T24:00', '2026-10-19T12:60', 'bad time']) {
    assert.equal(isInstructionTrackingEvent({ ...event, occurredAt }), false);
  }
  for (const invalid of [{ ...event, id: '' }, { ...event, operator: ' ' }, { ...event, status: '' }, { ...event, occurredAt: 12 }, { ...event, type: '未定义类型' }, { ...event, country: 12 }, null, []]) {
    assert.equal(isInstructionTrackingEvent(invalid), false);
  }
});
