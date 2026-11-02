import type { Waybill } from '../types';
import { buildReservationLinks, resolveReservationNumbers, summarizeReservationPicking, type PickingRecord, type WaybillIdentity } from './reservationWaybillLinks';

export const reservationMockWaybillDetails: Record<string, { chargeableWeight: number; volume: number; productName: string; pickingStation: string; channel: string }> = {
  HD2606161063: { chargeableWeight: 345, volume: 3.2, productName: '家居收纳盒', pickingStation: '金华仓', channel: '2-纽约海铁30日达' },
  HD2606162231: { chargeableWeight: 720, volume: 4.8, productName: '蓝牙耳机充电仓', pickingStation: '金华仓', channel: '2-纽约海铁30日达' },
  HD2606161099: { chargeableWeight: 180, volume: 1.2, productName: '锂电池配件', pickingStation: '', channel: '美线空派' },
  HD2606163345: { chargeableWeight: 240, volume: 1.6, productName: '塑料配件', pickingStation: '', channel: '德线空派' },
};


const sourceCustomers = ['深圳天图电子有限公司 (VIP)', '付豪跨境电商事业群', '常晟供应链集团'];
const sourceProducts = ['家居收纳盒', '蓝牙耳机', '厨房用品', '服装配件'];
export const reservationSourceMockWaybills: Waybill[] = sourceCustomers.flatMap((customerName, group) =>
  Array.from({ length: 4 }, (_, index): Waybill => {
    const serial = String(group * 4 + index + 1).padStart(4, '0');
    return {
      id: 'HD261102' + serial, customerOrderNo: 'KHMOCK261102' + serial, fbaCode: 'FBAMOCK261102' + serial,
      customerName, description: sourceProducts[index], packagesCount: 10 + group * 2 + index * 4,
      createTime: '2026-11-02 09:' + String(group * 10 + index).padStart(2, '0') + ':00',
      pickupTime: index === 2 ? '未揽收' : '2026-11-02 10:00:00', groupCode: 'MOCK-USSZ20261102-' + (group + 1),
      carrier: ['美线海卡', '美线空派', '英线海卡'][group], zipCode: group === 2 ? 'EC1A-1BB' : '90001',
      station: ['金华仓', '塘厦仓', '广州仓'][group], customerType: group === 0 ? 'vip' : '普通客户',
      status: index === 2 ? '待揽收' : '已收货', country: group === 2 ? '英国' : '美国', insurance: false,
      remarks: 'MOCK · ' + ['分批拣货', '拣货完成', '待回传', '已撤销拣货'][index],
    };
  }),
);
reservationSourceMockWaybills.forEach((waybill, index) => {
  reservationMockWaybillDetails[waybill.id] = {
    chargeableWeight: 180 + index * 35, volume: Number((1.2 + index * .25).toFixed(2)),
    productName: waybill.description, pickingStation: waybill.station, channel: waybill.carrier,
  };
});

// Demo fixtures use the application's existing waybills so lookup, details and
// picking corrections all refer to the same identities and batch records.
export function createReservationWaybillMocks(catalog: WaybillIdentity[]) {
  const specifications = [
    { suffix: '001', ids: ['HD2606161063'], volume: 5, picked: 2.3, remark: 'MOCK · 单票部分拣货，两个批次合计 2.3 m³' },
    { suffix: '002', ids: ['HD2606162231'], volume: 6, picked: 4.8, remark: 'MOCK · 单票拣货完成，30 件 / 4.8 m³' },
    { suffix: '003', ids: ['HD2606161063', 'HD2606162231'], volume: 10, picked: 7.1, remark: 'MOCK · 多票汇总，2.3 + 4.8 = 7.1 m³' },
    { suffix: '004', ids: ['HD2606161099'], volume: 4, picked: 0, remark: 'MOCK · 已关联运单，拣货数据待回传' },
    { suffix: '005', ids: ['HD2606163345'], volume: 1.6, picked: 0, remark: 'MOCK · 拣货批次已撤销，实际拣货方数归零' },
  ];
  const orders = specifications.flatMap(specification => {
    const waybills = specification.ids.map(id => catalog.find(waybill => waybill.id === id));
    if (waybills.some(waybill => !waybill)) return [];
    const customer = waybills[0]!.customer;
    if (waybills.some(waybill => waybill!.customer !== customer)) return [];
    const bindings = resolveReservationNumbers(customer, specification.ids, catalog);
    return [{
      id: `mock-reservation-picking-${specification.suffix}`, reserveNo: `MOCKYL20261030${specification.suffix}`,
      customer, merchandiser: '天翊', channel: '2-纽约海铁30日达', volume: String(specification.volume),
      deliveryPlace: '金华仓', scheduledTime: '2026-11-03 10:00', submitter: 'MOCK',
      latestUpdated: '2026-10-30 14:00:00', firstSubmitted: '2026-10-30 14:00:00', remark: specification.remark,
      transferredVolume: String(specification.picked), untransferredVolume: String(Number((specification.volume - specification.picked).toFixed(3))),
      returnedVolume: '0', status: '已预留' as const, links: buildReservationLinks(customer, bindings, catalog),
      ...(specification.suffix === '003' ? { matchedWaybills: waybills.filter((waybill): waybill is WaybillIdentity => !!waybill) } : {}),
    }];
  });
  const ordinaryWaybill = catalog.find(waybill => waybill.id === 'HD2606162231');
  const ordinaryCustomer = ordinaryWaybill?.customer;
  if (ordinaryWaybill && ordinaryCustomer && catalog.some(waybill => waybill.id === 'HD2606161063' && waybill.customer === ordinaryCustomer)) orders.push({
    id: 'mock-reservation-picking-006', reserveNo: 'MOCKYL20261030006', customer: ordinaryCustomer,
    merchandiser: '天翊', channel: '2-纽约海铁30日达', volume: '10', deliveryPlace: '金华仓', scheduledTime: '2026-11-03 10:00',
    submitter: 'MOCK', latestUpdated: '2026-10-30 14:00:00', firstSubmitted: '2026-10-30 14:00:00',
    remark: 'MOCK · 普通匹配 4.8 方 + 预留运单 2.3 方，共 7.1 方', transferredVolume: '7.1', untransferredVolume: '2.9',
    returnedVolume: '0', status: '已预留', matchedWaybills: [ordinaryWaybill],
    links: buildReservationLinks(ordinaryCustomer, resolveReservationNumbers(ordinaryCustomer, ['HD2606161063'], catalog), catalog),
  });
  const records: PickingRecord[] = [
    { id: 'MOCK-PICK-1063-01', waybillId: 'HD2606161063', revision: 1, pieces: 3, volume: 0.8, weight: 120, status: 'active', updatedAt: '2026-10-30T02:00:00Z' },
    { id: 'MOCK-PICK-1063-02', waybillId: 'HD2606161063', revision: 1, pieces: 5, volume: 1.5, weight: 225, status: 'active', updatedAt: '2026-10-30T03:30:00Z' },
    { id: 'MOCK-PICK-2231-01', waybillId: 'HD2606162231', revision: 1, pieces: 30, volume: 4.8, weight: 720, status: 'active', updatedAt: '2026-10-30T04:00:00Z' },
    { id: 'MOCK-PICK-3345-01', waybillId: 'HD2606163345', revision: 2, pieces: 8, volume: 1.6, weight: 240, status: 'revoked', updatedAt: '2026-10-30T05:00:00Z' },
  ].filter(record => catalog.some(waybill => waybill.id === record.waybillId)) as PickingRecord[];
  reservationSourceMockWaybills.forEach((waybill, index) => {
    if (!catalog.some(item => item.id === waybill.id) || index % 4 === 2) return;
    const volume = reservationMockWaybillDetails[waybill.id].volume;
    if (index % 4 === 0) {
      [0.35, 0.45].forEach((ratio, batch) => records.push({
        id: 'MOCK-SOURCE-PICK-' + waybill.id + '-' + batch, waybillId: waybill.id, revision: 1,
        pieces: batch === 0 ? 3 : 4, volume: Number((volume * ratio).toFixed(3)), weight: 60 + batch * 20,
        status: 'active', updatedAt: '2026-11-02T02:' + (batch ? '30' : '00') + ':00Z',
      }));
    } else records.push({
      id: 'MOCK-SOURCE-PICK-' + waybill.id, waybillId: waybill.id, revision: 1,
      pieces: waybill.packagesCount, volume, weight: reservationMockWaybillDetails[waybill.id].chargeableWeight,
      status: index % 4 === 3 ? 'revoked' : 'active', updatedAt: '2026-11-02T03:00:00Z',
    });
  });
  const scenarios = [
    { name: '多票普通匹配', ordinary: [0, 1], reserved: [] },
    { name: '多票预留运单', ordinary: [], reserved: [0, 1] },
    { name: '普通与预留混合', ordinary: [0], reserved: [1] },
    { name: '四票混合：预留待回传及撤销', ordinary: [0, 1], reserved: [2, 3] },
    { name: '四票混合：两种来源均有有效拣货', ordinary: [0, 2], reserved: [1, 3] },
    { name: '双重命中去重：预留来源优先', ordinary: [0, 1, 2], reserved: [1, 3] },
    { name: '一票普通与三票预留', ordinary: [0], reserved: [1, 2, 3] },
    { name: '三票普通与一票预留', ordinary: [0, 1, 2], reserved: [3] },
  ];
  sourceCustomers.forEach((customer, group) => {
    const groupIds = reservationSourceMockWaybills.slice(group * 4, group * 4 + 4).map(item => item.id);
    const waybills = groupIds.map(id => catalog.find(item => item.id === id && item.customer === customer));
    if (waybills.some(item => !item)) return;
    scenarios.forEach((scenario, index) => {
      const serial = String(group * scenarios.length + index + 7).padStart(3, '0');
      const matchedWaybills = scenario.ordinary.map(index => waybills[index]!);
      const reserved = scenario.reserved.map(index => waybills[index]!.systemNo);
      const links = buildReservationLinks(customer, resolveReservationNumbers(customer, reserved, catalog), catalog);
      const unique = [...new Map([...matchedWaybills, ...links.waybills].map(item => [item.id, item])).values()];
      const picked = summarizeReservationPicking(unique, records).volume ?? 0;
      const volume = Number((picked + 2.5 + group).toFixed(3));
      orders.push({
        id: 'mock-reservation-sources-' + serial, reserveNo: 'MOCKYL20261102' + serial,
        customer, merchandiser: ['天翊', '天惠', '天旺'][group], channel: reservationSourceMockWaybills[group * 4].carrier,
        volume: String(volume), deliveryPlace: reservationSourceMockWaybills[group * 4].station,
        scheduledTime: '2026-11-04 10:00', submitter: 'MOCK', latestUpdated: '2026-11-02 10:00:00', firstSubmitted: '2026-11-02 10:00:00',
        remark: 'MOCK · ' + scenario.name, transferredVolume: String(picked), untransferredVolume: String(Number((volume - picked).toFixed(3))),
        returnedVolume: '0', status: '已预留', matchedWaybills, links,
      });
    });
  });
  return { orders, records };
}

// Seed once per batch, preserving user corrections, revocations and previously
// entered picking data. Reloads must never restore an older demo batch version.
export function missingMockPickingRecords(fixtures: PickingRecord[], existing: PickingRecord[]) {
  const mockIds = new Set(fixtures.map(record => `${record.waybillId}\0${record.id}`));
  const manuallyEntered = new Set(existing.filter(record => !mockIds.has(`${record.waybillId}\0${record.id}`)).map(record => record.waybillId));
  return fixtures.filter(record => !manuallyEntered.has(record.waybillId)
    && !existing.some(saved => saved.waybillId === record.waybillId && saved.id === record.id));
}
