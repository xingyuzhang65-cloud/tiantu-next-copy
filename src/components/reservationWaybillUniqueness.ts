import { getLinkedWaybillIds, type ReservationIdentifier, type ReservationLinks } from './reservationWaybillLinks';

export type ReservationOwner = {
  id: string;
  reserveNo: string;
  status: string;
  links?: ReservationLinks;
};
export type ReservationConflict = {
  waybillId: string;
  systemNo: string;
  owners: Pick<ReservationOwner, 'id' | 'reserveNo' | 'status'>[];
};

// Compare internal waybill IDs so system/customer/FBA aliases share one owner.
// All statuses participate until the cancellation/reuse policy is confirmed.
export function findReservationConflicts(waybillIds: string[], orders: ReservationOwner[], editingId?: string): ReservationConflict[] {
  const requested = new Set(waybillIds);
  const conflicts = new Map<string, ReservationConflict>();
  for (const order of orders) {
    if (order.id === editingId || !order.links) continue;
    const ownedIds = new Set([...order.links.waybills.map(waybill => waybill.id), ...getLinkedWaybillIds(order.links.identifiers)]);
    for (const id of ownedIds) {
      if (!requested.has(id)) continue;
      const conflict = conflicts.get(id) || {
        waybillId: id,
        systemNo: order.links.waybills.find(waybill => waybill.id === id)?.systemNo || id,
        owners: [],
      };
      if (!conflict.owners.some(owner => owner.id === order.id)) {
        conflict.owners.push({ id: order.id, reserveNo: order.reserveNo, status: order.status });
      }
      conflicts.set(id, conflict);
    }
  }
  return [...conflicts.values()];
}

export const reservationConflictMessage = (conflict: ReservationConflict) =>
  `运单 ${conflict.systemNo} 已关联预留单 ${conflict.owners.map(owner => `${owner.reserveNo}（${owner.status}）`).join('、')}，不可重复预留。`;

export function getReservationCandidateState(binding: ReservationIdentifier, conflicts: ReservationConflict[]) {
  const candidateIds = [...new Set(binding.candidateIds)];
  const selectedIds = [...new Set(binding.selectedIds)].filter(id => candidateIds.includes(id));
  const occupiedIds = candidateIds.filter(id => conflicts.some(conflict => conflict.waybillId === id));
  const availableIds = candidateIds.filter(id => !occupiedIds.includes(id));
  const allOccupied = candidateIds.length > 0 && availableIds.length === 0;
  const blockingConflicts = conflicts.filter(conflict => selectedIds.includes(conflict.waybillId)
    || (allOccupied && occupiedIds.includes(conflict.waybillId)));
  return { candidateIds, selectedIds, occupiedIds, availableIds, blockingConflicts };
}

export function removeConflictingReservationBindings(bindings: ReservationIdentifier[], conflicts: ReservationConflict[]): ReservationIdentifier[] {
  const blocked = new Set(conflicts.map(conflict => conflict.waybillId));
  return bindings.flatMap(binding => {
    if (!binding.selectedIds.length) return binding.candidateIds.length && binding.candidateIds.every(id => blocked.has(id)) ? [] : [binding];
    const selectedIds = binding.selectedIds.filter(id => !blocked.has(id));
    return selectedIds.length || binding.candidateIds.some(id => !blocked.has(id)) ? [{ ...binding, selectedIds }] : [];
  });
}
