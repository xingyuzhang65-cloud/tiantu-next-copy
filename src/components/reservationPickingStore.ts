import { useSyncExternalStore } from 'react';
import { mergePickingRecords, validatePickingRecord, type PickingRecord } from './reservationWaybillLinks';

export type PickingSync = { lastSyncedAt?: string; error?: string };
export type PickingState = { records: PickingRecord[]; sync: Record<string, PickingSync> };
export type PickingSource = (waybillId: string) => Promise<PickingRecord[]>;
type Storage = { getItem(key: string): string | null; setItem(key: string, value: string): void };
export const pickingStorageKey = 'tiantu-reservation-picking-v1';

export function createReservationPickingStore(storage?: Storage) {
  const listeners = new Set<() => void>();
  const generations = new Map<string, number>();
  const read = (): PickingState => {
    const raw = storage?.getItem(pickingStorageKey);
    if (!raw) return { records: [], sync: {} };
    const saved = JSON.parse(raw);
    if (!Array.isArray(saved.records) || !saved.sync || typeof saved.sync !== 'object') throw new Error('本地拣货缓存格式不正确');
    return { records: mergePickingRecords([], saved.records), sync: saved.sync };
  };
  let state: PickingState;
  try { state = read(); } catch { state = { records: [], sync: {} }; }
  let source: PickingSource = async id => state.records.filter(record => record.waybillId === id);
  const commit = (next: PickingState) => {
    storage?.setItem(pickingStorageKey, JSON.stringify(next));
    state = next;
    listeners.forEach(listener => listener());
  };
  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    configureSource: (next: PickingSource) => { source = next; },
    reload: () => { state = read(); listeners.forEach(listener => listener()); },
    receive: (record: PickingRecord) => {
      validatePickingRecord(record);
      const records = mergePickingRecords(state.records, [record]);
      generations.set(record.waybillId, (generations.get(record.waybillId) || 0) + 1);
      commit({ records, sync: { ...state.sync, [record.waybillId]: { lastSyncedAt: new Date().toISOString() } } });
    },
    sync: async (ids: string[]) => Promise.all([...new Set(ids)].map(async id => {
      const generation = (generations.get(id) || 0) + 1;
      generations.set(id, generation);
      try {
        const records = await source(id);
        if (generations.get(id) !== generation) return;
        if (!Array.isArray(records) || records.some(record => record.waybillId !== id)) throw new Error('回传的运单与关联运单不一致');
        commit({ records: mergePickingRecords(state.records, records), sync: { ...state.sync, [id]: { lastSyncedAt: new Date().toISOString() } } });
      } catch (error) {
        if (generations.get(id) !== generation) return;
        commit({ ...state, sync: { ...state.sync, [id]: { ...state.sync[id], error: error instanceof Error ? error.message : '同步失败' } } });
      }
    })),
  };
}

const storage = (() => { try { return typeof window !== 'undefined' ? window.localStorage : undefined; } catch { return undefined; } })();
export const reservationPickingStore = createReservationPickingStore(storage);
export const useReservationPicking = () => useSyncExternalStore(reservationPickingStore.subscribe, reservationPickingStore.getSnapshot, reservationPickingStore.getSnapshot);
if (typeof window !== 'undefined') {
  window.addEventListener('storage', event => { if (event.key === pickingStorageKey) reservationPickingStore.reload(); });
}
