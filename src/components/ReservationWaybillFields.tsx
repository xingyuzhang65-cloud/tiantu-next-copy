import { useEffect, useState } from 'react';

import { summarizeReservationPicking, summarizeWaybillPicking, type ReservationLinks, type WaybillIdentity } from './reservationWaybillLinks';
import { reservationPickingStore, useReservationPicking } from './reservationPickingStore';
import './reservationWaybill.css';

export { default as ReservationWaybillFields } from './ReservationWaybillTags';

const numberText = (value: number | null, suffix = '') => value === null ? '—' : `${value}${suffix}`;
export function ReservationPickingDetails({ links, catalog }: { links?: ReservationLinks; catalog: WaybillIdentity[] }) {
  const state = useReservationPicking();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const savedWaybills = [...new Map((links?.waybills || []).map(item => [item.id, item])).values()];
  const waybills = savedWaybills.map(saved => catalog.find(item => item.id === saved.id && item.customer === saved.customer) || saved);
  const signature = waybills.map(item => item.id).sort().join('\0');
  const synchronize = async (ids: string[]) => {
    setLoading(true); setError('');
    try { await reservationPickingStore.sync(ids); } catch { setError('同步失败，已保留上次成功的数据，请重试'); }
    finally { setLoading(false); }
  };
  useEffect(() => {
    const ids = signature ? signature.split('\0') : [];
    if (!ids.length) return;
    void synchronize(ids);
    const timer = window.setInterval(() => void synchronize(ids), 15000);
    const refresh = () => void synchronize(ids);
    window.addEventListener('focus', refresh);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, [signature]);
  const total = summarizeReservationPicking(waybills, state.records);
  return <section className="rwl-picking-section">
    <div className="rwl-section-heading"><h3>关联运单及拣货数据</h3>{waybills.length > 0 && <button className="rwl-button" type="button" disabled={loading} onClick={() => void synchronize(waybills.map(item => item.id))}>{loading ? '同步中…' : '重新同步'}</button>}</div>
    <p className="rwl-hint">人工预留方数保持不变，以下为关联运单的实际拣货数据。</p>
    {!waybills.length ? <p className="rwl-empty">未关联运单</p> : <div className="rwl-table-wrap"><table className="rwl-picking-table"><thead><tr><th>系统运单号 / 客户单号 / FBA号</th><th>拣货状态</th><th>拣货件数</th><th>实际拣货方数</th><th>拣货重量</th><th>同步信息</th></tr></thead><tbody>{waybills.map(waybill => {
      const summary = summarizeWaybillPicking(waybill, state.records);
      const sync = state.sync[waybill.id];
      return <tr key={waybill.id}><td><b>{waybill.systemNo}</b><small>{waybill.customerNo || '—'}<br />{waybill.fbaNo || '—'}</small></td><td><span className={`rwl-status ${summary.status === '拣货完成' ? 'is-complete' : ''}`}>{summary.status}</span>{summary.pieces === null && <small>待回传</small>}</td><td>{numberText(summary.pieces)}</td><td>{numberText(summary.volume, ' m³')}</td><td>{numberText(summary.weight, ' kg')}</td><td>{sync?.lastSyncedAt ? new Date(sync.lastSyncedAt).toLocaleString('zh-CN', { hour12: false }) : '待回传'}{sync?.error && <><p className="rwl-error" role="alert">同步异常：{sync.error}；保留上次成功数据</p><button type="button" className="rwl-button" disabled={loading} onClick={() => void synchronize([waybill.id])}>重试</button></>}</td></tr>;
    })}</tbody><tfoot><tr><td>去重合计：{total.waybills}票</td><td>{total.waiting ? `${total.waiting}票待回传` : '已回传'}</td><td>{numberText(total.pieces)}</td><td>{numberText(total.volume, ' m³')}</td><td>{numberText(total.weight, ' kg')}</td><td>按有效拣货批次汇总</td></tr></tfoot></table></div>}
    {error && <p className="rwl-error" role="alert">{error}</p>}
  </section>;
}
