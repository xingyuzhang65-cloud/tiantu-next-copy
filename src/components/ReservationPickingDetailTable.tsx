import { useEffect, useRef, useState } from 'react';
import type { Waybill } from '../types';
import { summarizeWaybillPicking, type ReservationLinks, type WaybillIdentity } from './reservationWaybillLinks';
import { reservationPickingStore, useReservationPicking } from './reservationPickingStore';
import { reservationMockWaybillDetails } from './reservationWaybillMocks';
import { summarizeReservationPickingMatches } from './reservationPickingMatches';

const columns = [
  { label: '运单号', width: 7.5 }, { label: '匹配来源', width: 7 }, { label: '客户单号', width: 8 }, { label: '客户', width: 6 }, { label: '渠道', width: 7 },
  { label: '件数', width: 4 }, { label: '收费重', width: 5 }, { label: '体积', width: 5 }, { label: '拣货方数', width: 5.5 },
  { label: '主品名', width: 7.5 }, { label: '当前货站', width: 6 }, { label: '拣货货站', width: 6 },
  { label: '创建时间', width: 8 }, { label: '拣货时间', width: 8 }, { label: '备注', width: 9.5 },
];
const formatTime = (value?: string) => !value ? '—' : new Date(value).toLocaleString('sv-SE', { timeZone: 'Asia/Shanghai' });

export default function ReservationPickingDetailTable({ links, ordinaryWaybills = [], catalog, waybills, onClose }: {
  links?: ReservationLinks; ordinaryWaybills?: WaybillIdentity[]; catalog: WaybillIdentity[]; waybills: Waybill[]; onClose: () => void;
}) {
  const snapshot = useReservationPicking();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const table = useRef<HTMLDivElement>(null);
  const totals = summarizeReservationPickingMatches(links, ordinaryWaybills, snapshot.records);
  const linked = totals.matches.map(match => catalog.find(item => item.id === match.waybill.id && item.customer === match.waybill.customer) || match.waybill);
  const sources = new Map(totals.matches.map(match => [match.waybill.id, match.source]));
  const signature = linked.map(item => item.id).sort().join('\0');
  const synchronize = async (ids: string[]) => {
    setLoading(true); setError('');
    try { await reservationPickingStore.sync(ids); }
    catch { setError('同步失败，已保留最近成功的拣货数据，请重试'); }
    finally { setLoading(false); }
  };
  useEffect(() => {
    if (!signature) return;
    const ids = signature.split('\0');
    void synchronize(ids);
    const refresh = () => void synchronize(ids);
    const timer = window.setInterval(refresh, 15000);
    window.addEventListener('focus', refresh);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, [signature]);
  useEffect(() => { table.current?.scrollTo({ top: 0 }); }, [page, pageSize, signature]);
  const pageCount = Math.max(1, Math.ceil(linked.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visible = linked.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const pageButtons = [...new Set([1, currentPage - 1, currentPage, currentPage + 1, pageCount])].filter(value => value > 0 && value <= pageCount).sort((a, b) => a - b);
  const syncErrors = linked.filter(item => snapshot.sync[item.id]?.error).map(item => `${item.systemNo}：${snapshot.sync[item.id].error}`);
  return <div className="reserved-picking-content">
    <div className="reserved-picking-totals" aria-label="拣货方数汇总"><span>拣货方数：<strong>{totals.volume} m³</strong></span><span className="reserved-picking-totals-divider" aria-hidden="true">｜</span><span>其中预留运单拣货：<strong>{totals.reservedVolume} m³</strong></span></div>
    {(error || syncErrors.length > 0) && <div className="reserved-picking-error" role="alert"><span>{error || `同步异常，保留最近成功数据。${syncErrors.join('；')}`}</span><button type="button" disabled={loading} onClick={() => void synchronize(linked.map(item => item.id))}>{loading ? '同步中…' : '重新同步'}</button></div>}
    <div className="reserved-picking-table-wrap" ref={table}>
      <table className="reserved-picking-table" aria-label="拣货明细">
        <colgroup>{columns.map(column => <col key={column.label} style={{ width: `${column.width}%` }} />)}</colgroup>
        <thead><tr>{columns.map(column => <th key={column.label} scope="col">{column.label}</th>)}</tr></thead>
        <tbody>{visible.map(identity => {
          const source = waybills.find(waybill => waybill.id === identity.id);
          const mock = reservationMockWaybillDetails[identity.id];
          const summary = summarizeWaybillPicking(identity, snapshot.records);
          const active = snapshot.records.filter(record => record.waybillId === identity.id && record.status === 'active');
          const pickedAt = active.reduce((latest, record) => Date.parse(record.updatedAt) > Date.parse(latest || '1970-01-01') ? record.updatedAt : latest, '');
          const values = [identity.systemNo, sources.get(identity.id)!, identity.customerNo || '—', identity.customer, mock?.channel || source?.carrier || '—', identity.expectedPieces,
            mock?.chargeableWeight ?? '—', mock?.volume ?? '—', summary.volume ?? 0, mock?.productName || source?.description || '—',
            source?.station || '—', active.length ? mock?.pickingStation || '—' : '—', source?.createTime || '—', formatTime(pickedAt),
            source?.remarks || (summary.volume === null ? '待回传' : summary.records === 0 ? '拣货已撤销' : '—')];
          return <tr key={identity.id}>{values.map((value, index) => <td key={columns[index].label} title={String(value)}>{index === 1 ? <span className={`reserved-match-source ${value === '预留运单' ? 'is-reserved' : 'is-ordinary'}`}>{value}</span> : value}</td>)}</tr>;
        })}{!visible.length && <tr><td colSpan={columns.length} className="reserved-picking-empty">暂无拣货明细</td></tr>}</tbody>
      </table>
    </div>
    <nav className="reserved-pagination reserved-picking-pagination" aria-label="拣货明细分页">
      <span>共 {linked.length} 条</span>
      <select aria-label="拣货明细每页条数" value={pageSize} onChange={event => { setPageSize(Number(event.target.value)); setPage(1); }}>{[100, 50, 20].map(size => <option value={size} key={size}>{size}条/页</option>)}</select>
      <button type="button" aria-label="拣货明细上一页" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>‹</button>
      {pageButtons.map((value, index) => <span key={value} className="reserved-picking-page-number">{index > 0 && value - pageButtons[index - 1] > 1 && <span>…</span>}<button type="button" aria-label={`拣货明细第${value}页`} aria-current={value === currentPage ? 'page' : undefined} className={value === currentPage ? 'active-page' : ''} onClick={() => setPage(value)}>{value}</button></span>)}
      <button type="button" aria-label="拣货明细下一页" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}>›</button>
      <span>前往</span><input aria-label="拣货明细前往页码" type="number" min={1} max={pageCount} value={currentPage} onChange={event => setPage(Math.min(pageCount, Math.max(1, Math.floor(Number(event.target.value) || 1))))} /><span>页</span>
    </nav>
    <footer className="reserved-dialog-footer"><button type="button" onClick={onClose}>关闭</button></footer>
  </div>;
}
