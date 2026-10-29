import { useState } from 'react';
import type { FormEvent } from 'react';
import type { Waybill } from '../types';
import { getWaybillIdentity, summarizeWaybillPicking, type PickingRecord } from './reservationWaybillLinks';
import { reservationPickingStore, useReservationPicking } from './reservationPickingStore';
import './reservationWaybill.css';

export default function WaybillPickingEditor({ waybill, onClose, notify }: { waybill: Waybill; onClose: () => void; notify: (text: string, type: 'success' | 'warning') => void }) {
  const snapshot = useReservationPicking();
  const records = snapshot.records.filter(record => record.waybillId === waybill.id);
  const [editing, setEditing] = useState<PickingRecord | null>(null);
  const [draft, setDraft] = useState({ pieces: '', volume: '', weight: '' });
  const [error, setError] = useState('');
  const summary = summarizeWaybillPicking(getWaybillIdentity(waybill), records);
  const reset = () => { setEditing(null); setDraft({ pieces: '', volume: '', weight: '' }); setError(''); };
  const save = (event: FormEvent) => {
    event.preventDefault();
    const pieces = Number(draft.pieces), volume = Number(draft.volume), weight = Number(draft.weight);
    if (!Number.isSafeInteger(pieces) || pieces <= 0 || ![volume, weight].every(value => Number.isFinite(value) && value > 0) || Object.values(draft).some(value => !String(value).trim())) return setError('请填写有效的拣货件数（正整数）、实际方数和重量（大于0）');
    if (editing && records.find(record => record.id === editing.id)?.revision !== editing.revision) return setError('该批次已更新，请重新打开编辑后再保存');
    try {
      reservationPickingStore.receive({ id: editing?.id || crypto.randomUUID(), waybillId: waybill.id, revision: (editing?.revision || 0) + 1, pieces, volume, weight, status: 'active', updatedAt: new Date().toISOString() });
      reset(); notify('拣货数据已保存，关联预留单已同步更新', 'success');
    } catch (caught) { setError(caught instanceof Error ? caught.message : '拣货数据保存失败'); }
  };
  const revoke = (record: PickingRecord) => {
    if (!window.confirm('确认撤销本批次拣货？关联预留单将重新计算实际拣货数据。')) return;
    try { reservationPickingStore.receive({ ...record, revision: record.revision + 1, status: 'revoked', updatedAt: new Date().toISOString() }); if (editing?.id === record.id) reset(); notify('本批次已撤销，关联预留单已更新', 'success'); }
    catch (caught) { setError(caught instanceof Error ? caught.message : '撤销失败'); }
  };
  return <div className="rwl-editor-backdrop"><section className="rwl-editor" role="dialog" aria-modal="true" aria-labelledby="picking-editor-title">
    <header><h2 id="picking-editor-title">拣货数据 · {waybill.id}</h2><button type="button" onClick={onClose} aria-label="关闭拣货数据">×</button></header>
    <div className="rwl-editor-body"><p>计划件数：{waybill.packagesCount} · 已拣：{summary.pieces ?? '—'} · {summary.status}</p><p className="rwl-hint">分批保存拣货数据，更正或撤销后将重新汇总并回传至关联预留单。</p>
      <form onSubmit={save}><h3>{editing ? '更正拣货批次' : '新增拣货批次'}</h3><div className="rwl-editor-fields">{(['pieces', 'volume', 'weight'] as const).map(key => <label key={key}>{({ pieces: '拣货件数', volume: '实际拣货方数（m³）', weight: '拣货重量（kg）' })[key]}<input type="number" required min={key === 'pieces' ? 1 : 0.000001} step={key === 'pieces' ? 1 : 'any'} value={draft[key]} onChange={event => setDraft(value => ({ ...value, [key]: event.target.value }))} /></label>)}</div>
        {error && <p className="rwl-error" role="alert">{error}</p>}<div className="rwl-editor-actions">{editing && <button type="button" className="rwl-button" onClick={reset}>取消更正</button>}<button className="rwl-button is-primary" type="submit">保存并回传</button></div>
      </form>
      <h3>拣货批次记录</h3>{!records.length ? <p className="rwl-empty">尚无拣货数据</p> : <div className="rwl-table-wrap"><table className="rwl-picking-table"><thead><tr><th>批次</th><th>件数</th><th>方数 / 重量</th><th>状态 / 更新时间</th><th>操作</th></tr></thead><tbody>{records.map((record, index) => <tr key={record.id}><td>第{index + 1}批</td><td>{record.pieces}</td><td>{record.volume} m³<br />{record.weight} kg</td><td>{record.status === 'revoked' ? '已撤销' : '有效'}<small>{new Date(record.updatedAt).toLocaleString('zh-CN')}</small></td><td>{record.status === 'active' && <><button type="button" className="rwl-button" onClick={() => { setEditing(record); setDraft({ pieces: String(record.pieces), volume: String(record.volume), weight: String(record.weight) }); setError(''); }}>更正</button><button type="button" className="rwl-button" onClick={() => revoke(record)}>撤销</button></>}</td></tr>)}</tbody></table></div>}
    </div><footer><button className="rwl-button" type="button" onClick={onClose}>关闭</button></footer>
  </section></div>;
}
