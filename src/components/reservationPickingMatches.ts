import { summarizeReservationPicking, type PickingRecord, type ReservationLinks, type WaybillIdentity } from './reservationWaybillLinks';

export function getReservationPickingMatches(links?: ReservationLinks, ordinary: WaybillIdentity[] = []) {
  const matches = new Map<string, { waybill: WaybillIdentity; source: '普通匹配' | '预留运单' }>();
  // Deduplicate within each source; the two sources remain independent.
  ordinary.forEach(waybill => matches.set('ordinary:' + waybill.id, { waybill, source: '普通匹配' }));
  links?.waybills.forEach(waybill => matches.set('reserved:' + waybill.id, { waybill, source: '预留运单' }));
  return [...matches.values()];
}

export function summarizeReservationPickingMatches(links: ReservationLinks | undefined, ordinary: WaybillIdentity[], records: PickingRecord[]) {
  return {
    matches: getReservationPickingMatches(links, ordinary),
    volume: summarizeReservationPicking(ordinary, records).volume ?? 0,
    reservedVolume: summarizeReservationPicking(links?.waybills || [], records).volume ?? 0,
  };
}
