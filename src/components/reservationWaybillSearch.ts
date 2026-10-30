import { parseReservationNumbers, type ReservationLinks } from './reservationWaybillLinks';

export function matchesReservationWaybillNumbers(links: ReservationLinks | undefined, query: string): boolean {
  const terms = parseReservationNumbers(query).map(number => number.toUpperCase());
  if (!terms.length) return true;
  const numbers = new Set([
    ...(links?.identifiers || []).map(binding => binding.number),
    ...(links?.waybills || []).flatMap(waybill => [waybill.systemNo, waybill.customerNo, waybill.fbaNo]),
  ].filter(Boolean).map(number => number.trim().toUpperCase()));
  return terms.length === 1 ? [...numbers].some(number => number.includes(terms[0])) : terms.some(term => numbers.has(term));
}
