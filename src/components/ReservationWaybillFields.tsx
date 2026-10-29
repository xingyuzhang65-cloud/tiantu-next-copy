import { useEffect, useState } from 'react';
import { getLinkedWaybillIds, parseReservationNumbers, resolveReservationNumbers, summarizeReservationPicking, summarizeWaybillPicking, type ReservationIdentifier, type ReservationLinks, type WaybillIdentity } from './reservationWaybillLinks';
import { reservationPickingStore, useReservationPicking } from './reservationPickingStore';
import './reservationWaybill.css';

export function ReservationWaybillFields({ customer, catalog, bindings, onChange, draft, onDraftChange }: {
  customer: string; catalog: WaybillIdentity[]; bindings: ReservationIdentifier[]; onChange: (bindings: ReservationIdentifier[]) => void;
  draft: string; onDraftChange: (draft: string) => void;
}) {
  const [message, setMessage] = useState('');
  useEffect(() => setMessage(''), [customer]);
  const identify = () => {
    if (!customer) return setMessage('请先选择客户');
    const numbers = parseReservationNumbers(draft);
    if (!numbers.length) return setMessage('请输入需要识别的编号');
    onChange(resolveReservationNumbers(customer, [...bindings.map(binding => binding.number), ...numbers], catalog, bindings));
    onDraftChange(''); setMessage('');
  };
  const unique = getLinkedWaybillIds(bindings);
  const duplicated = bindings.reduce((sum, binding) => sum + binding.selectedIds.length, 0) > unique.length;
  return <div className="reserved-create-field rwl-field">
    <label htmlFor="reserved-waybill-numbers">预留运单号:</label>
    <div className="rwl-entry">
      <textarea id="reserved-waybill-numbers" value={draft} onChange={event => onDraftChange(event.target.value)} placeholder="可批量粘贴，换行或逗号分隔" rows={3} />
      <p className="rwl-hint">支持运单号、客户单号、FBA号，同一运单自动去重。</p>
      <button type="button" className="rwl-button" onClick={identify}>识别并关联</button>
      {message && <p className="rwl-error" role="alert">{message}</p>}
      {bindings.length > 0 && <p className="rwl-result" role="status">输入{bindings.length}个编号，关联{unique.length}票运单{duplicated ? '，已合并重复关联' : ''}。</p>}
      <div className="rwl-results">{bindings.map(binding => <div key={binding.number} className={`rwl-match ${!binding.candidateIds.length ? 'is-unmatched' : ''}`}>
        <div className="rwl-match-heading"><strong>{binding.number}</strong><button type="button" onClick={() => onChange(bindings.filter(item => item.number !== binding.number))} aria-label={`移除编号${binding.number}`}>移除</button></div>
        {!binding.candidateIds.length && <p className="rwl-error">未匹配当前客户的运单，请修正或移除</p>}
        {binding.candidateIds.length > 1 && <p className="rwl-warning">匹配到{binding.candidateIds.length}票，请勾选实际需要关联的运单</p>}
        {binding.candidateIds.map(id => {
          const waybill = catalog.find(item => item.id === id);
          if (!waybill) return null;
          return <label className="rwl-candidate" key={id}>
            {binding.candidateIds.length > 1 && <input type="checkbox" aria-label={`关联${binding.number}对应的${waybill.systemNo}`} checked={binding.selectedIds.includes(id)} onChange={event => onChange(bindings.map(item => item.number === binding.number ? {
              ...item, selectedIds: event.target.checked ? [...new Set([...item.selectedIds, id])] : item.selectedIds.filter(value => value !== id),
            } : item))} />}
            <span><b>{waybill.systemNo}</b><small>客户单号：{waybill.customerNo || '—'}<br />FBA号：{waybill.fbaNo || '—'}</small></span>
          </label>;
        })}
      </div>)}</div>
    </div>
  </div>;
}

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
