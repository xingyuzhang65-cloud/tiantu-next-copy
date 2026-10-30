import { summarizeReservationPicking, type PickingRecord, type ReservationLinks, type WaybillIdentity } from './reservationWaybillLinks';

export function getReservationPickingMatches(links?: ReservationLinks, ordinary: WaybillIdentity[] = []) {
  const matches = new Map<string, { waybill: WaybillIdentity; source: '普通匹配' | '预留运单' }>();
  ordinary.forEach(waybill => matches.set(waybill.id, { waybill, source: '普通匹配' }));
  // A reserved association takes precedence if the same waybill also matched normally.
  links?.waybills.forEach(waybill => matches.set(waybill.id, { waybill, source: '预留运单' }));
  return [...matches.values()];
}

export function summarizeReservationPickingMatches(links: ReservationLinks | undefined, ordinary: WaybillIdentity[], records: PickingRecord[]) {
  const matches = getReservationPickingMatches(links, ordinary);
  return {
    matches,
    volume: summarizeReservationPicking(matches.map(match => match.waybill), records).volume ?? 0,
    reservedVolume: summarizeReservationPicking(matches.filter(match => match.source === '预留运单').map(match => match.waybill), records).volume ?? 0,
  };
}
