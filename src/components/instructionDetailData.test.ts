import test from 'node:test';
import assert from 'node:assert/strict';
import { buildInstructionDetail } from './instructionDetailData';
import type { InstructionListRow } from './instructionListTypes';

function row(overrides: Partial<InstructionListRow> = {}): InstructionListRow {
  return {
    id: 'selected-instruction', tab: '待确认', waybill: 'USSZ202608160010',
    instructionNo: 'CI20260816212041676418', names: ['拍照5', '拍照4', '换单2'],
    created: '2026-08-16 21:20:41', updated: '2026-08-16 21:23:46',
    shipment: 'FBA19KBC16CK', reference: '-', status: '已处理', customer: '郑志强',
    warehouse: 'FTW1', zip: '75241-7203', orderType: '亚马逊', instructionType: '放货',
    destination: 'MW003', salesman: '公司', merchandiser: '天惠', fee: '144',
    packages: '1', weight: '15', volume: '0.0358', arrived: '是',
    overseasTime: '2026-08-16 21:19:38', ...overrides,
  };
}

test('uses the list CNY total once without splitting it among instruction names', () => {
  for (const amount of ['144', '3.05', '0']) {
    const detail = buildInstructionDetail(row({ fee: amount }));
    assert.equal(detail.feeTotal, Number(amount));
    assert.equal(detail.feeRows.length, 1);
    assert.deepEqual(detail.feeRows.map(fee => [fee.name, fee.currency, fee.unit, fee.quantity, fee.exchangeRate]),
      [['拍照5 / 拍照4 / 换单2', 'CNY', '票', 1, 1]]);
    const fee = detail.feeRows[0];
    assert.equal(fee.unitPrice, Number(amount));
    assert.equal(fee.originalAmount, Number(amount));
    assert.equal(fee.rmbAmount, Number(amount));
    assert.equal(fee.addedBy, '—');
    assert.equal(fee.billingTime, '—');
    assert.equal(fee.addedAt, '—');
  }
});

test('missing or invalid fee is unknown, never silently converted to zero', () => {
  for (const fee of ['-', '', '  ', '—', '未知', 'NaN', 'Infinity']) {
    const detail = buildInstructionDetail(row({ fee }));
    assert.equal(detail.feeTotal, null);
    assert.deepEqual(detail.feeRows, []);
  }
});

test('operation instruction metadata uses the selected status without inventing remarks or image URLs', () => {
  for (const status of ['已处理', '待处理', '已取消', '已驳回'] as const) {
    const fee = buildInstructionDetail(row({ status, photo:'拍照5', customerNote:'客户填写的订单备注' })).feeRows[0];
    assert.equal(fee.status, status);
    assert.equal(fee.instructionRemark, undefined);
    assert.equal(fee.images, undefined);
    assert.equal(fee.addedAt, '—');
    assert.equal(fee.addedBy, '—');
  }
});

test('cargo is one source summary without fabricated box numbers or per-box measurements', () => {
  const detail = buildInstructionDetail(row({ packages: '6', weight: '82', volume: '0.2160' }));
  assert.equal(detail.cargoRows.length, 1);
  assert.deepEqual(detail.cargoRows[0], {
    id: 'selected-instruction:cargo-summary', boxNo: '—', packages: 6,
    customerLines: ['总件数：6 件', '总重量：82 KG', '总体积：0.2160 CBM'], pickingLines: ['—'],
  });
  for (const packages of ['-', '', '0', '1.5', '-1']) {
    assert.deepEqual(buildInstructionDetail(row({ packages })).cargoRows, []);
  }
  assert.deepEqual(buildInstructionDetail(row({ weight: '-', volume: '' })).cargoRows[0].customerLines,
    ['总件数：1 件', '总重量：—', '总体积：—']);
});

test('intercept result and failure reason match the selected list record', () => {
  const failed = buildInstructionDetail(row({ tab: '已完成', instructionType: '拦截',
    processingResult: '拦截失败', failureReason: '货物已完成出库，无法拦截' }));
  assert.equal(failed.statusText, '拦截失败');
  assert.equal(failed.processingResult, '拦截失败');
  assert.equal(failed.failureReason, '货物已完成出库，无法拦截');
  const successful = buildInstructionDetail(row({ tab: '已完成', instructionType: '拦截', processingResult: '拦截成功' }));
  assert.equal(successful.statusText, '拦截成功');
  assert.equal(successful.failureReason, '');
  const pending = buildInstructionDetail(row({ tab: '处理中', instructionType: '拦截', processingResult: undefined }));
  assert.equal(pending.statusText, '待海外仓回传');
  assert.equal(pending.processingResult, '');
  assert.equal(pending.currentStep, 2);
  const unprocessed = buildInstructionDetail(row({ instructionType: '拦截', status: '待处理', processingResult: '拦截成功' }));
  assert.equal(unprocessed.statusText, '待处理');
  assert.equal(unprocessed.processingResult, '');
});

test('workflow step follows the tab independently of processing status', () => {
  const tabs = ['待确认', '已确认', '已推送海外仓', '处理中', '已完成'] as const;
  tabs.forEach((tab, index) => {
    const detail = buildInstructionDetail(row({ tab, status: '已处理' }));
    assert.equal(detail.currentStep, [0,1,2,2,3][index]);
    assert.equal(detail.statusText, '已完成');
    assert.equal(detail.terminated, false);
  });
  for (const [tab, status] of [['取消', '已取消'], ['驳回', '已驳回']] as const) {
    const detail = buildInstructionDetail(row({ tab, status }));
    assert.equal(detail.flowSteps[3], status);
    assert.equal(detail.currentStep, 3);
    assert.equal(detail.terminated, true);
    assert.equal(detail.statusText, status);
    const updated = buildInstructionDetail(row({ tab:'待确认', status }));
    assert.equal(updated.flowSteps[3], status);
    assert.equal(updated.terminated, true);
  }
});

test('pickup rows use their own cargo and fee and the source object remains unchanged', () => {
  const source = row({ instructionType: '自提', names: ['自提-预约提货'], fee: '-', packages: '3',
    weight: '42', volume: '0.12', expectedPickupTime: '2026-10-22 14:30',
    pickupContact: '提货联系人', pickupPhone: '12345678' });
  const before = structuredClone(source);
  const detail = buildInstructionDetail(source);
  assert.equal(detail.cargoRows[0].packages, 3);
  assert.deepEqual(detail.cargoRows[0].customerLines,
    ['总件数：3 件', '总重量：42 KG', '总体积：0.12 CBM']);
  assert.equal(detail.feeTotal, null);
  detail.instructionNames.push('view-only change');
  detail.flowSteps[0] = 'view-only change';
  assert.deepEqual(source, before);
  assert.equal(buildInstructionDetail(source).flowSteps[0], '提交申请');
});
