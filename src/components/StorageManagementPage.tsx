import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, ChevronLeft, ChevronRight, Download, MapPin, RotateCcw, Search, Settings, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import './InstructionManagementPage.css';
import './StorageManagementPage.css';

type StorageStatus = 'stored' | 'ready' | 'departed';
type StorageRow = {
  id: string; customer: string; container: string; systemNo: string; inbound: string;
  intercept: boolean; transfer: string; destination: string; dispatch: string; label: string;
  arrival: string; weight: number; volume: number; total: number; pending: number;
  unshipped: number; shipped: number; location: string; status: StorageStatus;
};
type StorageLog = { id: string; rowId: string; time: string; title: string; details: string[] };
type LocalOrder = { id: string; rowId: string; boxes: number; destination: string; dispatch: string; remark: string; time: string };
type SavedState = { rows: StorageRow[]; logs: StorageLog[]; orders: LocalOrder[] };
type Filters = { keyword: string; customer: string; inbound: string; transfer: string; destination: string; dispatch: string; from: string; to: string; intercept: string };
type ColumnKey = Exclude<keyof StorageRow, 'id' | 'status'> | 'actions';
type SortKey = 'arrival' | 'weight' | 'volume' | 'total';
type Props = { addToast?: (text: string, type?: 'success' | 'info' | 'warning') => void };

const STORAGE_KEY = 'tiantu-storage-management-v1';
const EMPTY_FILTERS: Filters = { keyword: '', customer: '', inbound: '', transfer: '', destination: '', dispatch: '', from: '', to: '', intercept: '' };
const TABS: { id: StorageStatus; label: string }[] = [{ id: 'stored', label: '暂存' }, { id: 'ready', label: '指令处理完成，待出库' }, { id: 'departed', label: '已出库' }];
const COLUMNS: { key: ColumnKey; label: string; width: number; sortable?: SortKey }[] = [
  { key: 'customer', label: '客户名称', width: 90 }, { key: 'container', label: '柜号', width: 112 },
  { key: 'systemNo', label: '系统柜号', width: 145 }, { key: 'inbound', label: '入仓号', width: 135 },
  { key: 'intercept', label: '是否拦截', width: 80 }, { key: 'transfer', label: '转运方式', width: 85 },
  { key: 'destination', label: '目的地', width: 145 }, { key: 'dispatch', label: '派送方式', width: 120 },
  { key: 'label', label: '托盘标签', width: 245 }, { key: 'arrival', label: '入库时间', width: 166, sortable: 'arrival' },
  { key: 'weight', label: '重量', width: 80, sortable: 'weight' }, { key: 'volume', label: '体积', width: 80, sortable: 'volume' },
  { key: 'total', label: '总箱数', width: 85, sortable: 'total' }, { key: 'pending', label: '待审核箱数', width: 100 },
  { key: 'unshipped', label: '未发货箱数', width: 100 }, { key: 'shipped', label: '已发货箱数', width: 100 },
  { key: 'location', label: '库位', width: 100 }, { key: 'actions', label: '操作', width: 112 },
];

function seedRow(id: string, container: string, inbound: string, suffix: string, arrival: string, total: number, pending: number, unshipped: number, shipped: number, options: Partial<StorageRow> = {}): StorageRow {
  return { id, customer: 'TTTX', container, systemNo: `${container}-260912`, inbound, intercept: true, transfer: '拆转', destination: 'ABE4', dispatch: 'Truck-Amazon', label: `${container}-260912-${inbound}-${suffix}`, arrival, weight: total * 40, volume: Number((total * .036).toFixed(3)), total, pending, unshipped, shipped, location: `A-01-${id.padStart(2, '0')}`, status: 'stored', ...options };
}

// Visible records from the reference are used as editable local examples.
const REFERENCE_ROWS: StorageRow[] = [
  seedRow('1', 'TEST0280745', 'USSZ202609050004', 'ABE4-4', '2026-09-05 16:48:29', 2, 2, 0, 0),
  seedRow('2', 'TEST0280745', 'USSZ202609050004', 'ABE4-2', '2026-09-05 16:48:29', 2, 0, 0, 2),
  seedRow('3', 'TTTX2609105', 'USSZ202609100006', 'ABE4-1', '2026-09-10 17:55:03', 12, 6, 1, 5, { label: 'TTTX2609105-260912-ABE4-1' }),
  seedRow('4', 'TTTX2609191', '001', 'BWI9-1', '2026-09-19 11:41:48', 3, 0, 2, 1, { customer: 'FA102', systemNo: 'TTTX2609191-260809', label: 'TTTX2609191-260809-BWI9-1', destination: 'BWI9', weight: 9, volume: 13.5 }),
  seedRow('5', 'TEST0280753', 'USSZ202609100001', '2', '2026-09-10 11:07:30', 2, 1, 0, 1, { destination: 'ABE4,650 Boulder Drive', dispatch: 'Truck-Other' }),
  seedRow('6', 'TEST0280753', 'USSZ202609100001', '3', '2026-09-10 11:07:30', 2, 2, 0, 0, { destination: 'ABE4,650 Boulder Drive', dispatch: 'Truck-Other' }),
  seedRow('7', 'TEST0280753', 'USSZ202609100001', '4', '2026-09-10 11:07:30', 2, 1, 1, 0, { destination: 'ABE4,650 Boulder Drive', dispatch: 'Truck-Other' }),
  seedRow('8', 'TEST0280750', 'USSZ202609070007', '1', '2026-09-07 19:27:38', 1, 0, 1, 0, { intercept: false, destination: '650 Boulder Drive', dispatch: 'Storage' }),
  seedRow('9', 'TEST0280753', 'USSZ202609100001', '5', '2026-09-10 11:07:30', 2, 1, 0, 1, { destination: 'ABE4,650 Boulder Drive', dispatch: 'Truck-Other' }),
  seedRow('10', 'TEST0280753', 'USSZ202609100001', '1', '2026-09-10 11:07:30', 2, 2, 0, 0, { destination: 'ABE4,650 Boulder Drive', dispatch: 'Truck-Other' }),
  seedRow('11', 'TEST0280752', 'USSZ202609070010', 'ABE4-10', '2026-09-07 21:27:00', 1, 1, 0, 0, { label: 'TEST0280752-260912-ABE4-10' }),
  seedRow('12', 'TEST0280752', 'USSZ202609070010', 'ABE4-8', '2026-09-07 21:27:00', 1, 1, 0, 0, { label: 'TEST0280752-260912-ABE4-8' }),
  seedRow('13', 'TEST0280751', 'USSZ202609070009', 'ABE4-1', '2026-09-07 20:06:38', 2, 1, 0, 1, { label: 'TEST0280751-260912-ABE4-1' }),
  seedRow('14', 'TEST0280750', 'USSZ202609070007', '2', '2026-09-07 19:27:38', 2, 0, 2, 0, { intercept: false, status: 'ready' }),
  seedRow('15', 'TEST0280752', 'USSZ202609070010', 'ABE4-9', '2026-09-07 21:27:00', 1, 0, 1, 0, { intercept: false, status: 'ready' }),
  seedRow('16', 'TEST0280751', 'USSZ202609070009', 'ABE4-7', '2026-09-07 20:06:38', 2, 0, 0, 2, { intercept: false, status: 'departed' }),
];

function readSavedState(): SavedState {
  const fallback: SavedState = { rows: REFERENCE_ROWS.map((row) => ({ ...row })), logs: [], orders: [] };
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') as SavedState | null;
    if (!value || !Array.isArray(value.rows) || !Array.isArray(value.logs) || !Array.isArray(value.orders)) return fallback;
    return {
      rows: fallback.rows.map((seed) => {
        const row = value.rows.find((item) => item.id === seed.id);
        if (!row || Object.keys(seed).some((key) => typeof row[key as keyof StorageRow] !== typeof seed[key as keyof StorageRow])) return seed;
        if (![row.total, row.pending, row.unshipped, row.shipped, row.weight, row.volume].every((n) => Number.isFinite(n) && n >= 0) || row.pending + row.unshipped + row.shipped !== row.total || !TABS.some((tab) => tab.id === row.status)) return seed;
        return row;
      }),
      logs: value.logs.filter((log) => typeof log.id === 'string' && typeof log.rowId === 'string' && typeof log.time === 'string' && typeof log.title === 'string' && Array.isArray(log.details) && log.details.every((item) => typeof item === 'string')),
      orders: value.orders.filter((order) => typeof order.id === 'string' && typeof order.rowId === 'string' && Number.isInteger(order.boxes) && order.boxes > 0 && ['destination', 'dispatch', 'remark', 'time'].every((key) => typeof order[key as keyof LocalOrder] === 'string')),
    };
  } catch { return fallback; }
}

export default function StorageManagementPage({ addToast }: Props) {
  const [saved, setSaved] = useState<SavedState>(readSavedState);
  const [tab, setTab] = useState<StorageStatus>('stored');
  const [draft, setDraft] = useState<Filters>({ ...EMPTY_FILTERS });
  const [applied, setApplied] = useState<Filters>({ ...EMPTY_FILTERS });
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [hiddenColumns, setHiddenColumns] = useState<ColumnKey[]>(['location']);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sort, setSort] = useState<{ key: SortKey; ascending: boolean } | null>(null);
  const [pageSize, setPageSize] = useState(100);
  const [page, setPage] = useState(1);
  const [pageInput, setPageInput] = useState('1');
  const [locationOpen, setLocationOpen] = useState(false);
  const [nextLocation, setNextLocation] = useState('');
  const [orderRowId, setOrderRowId] = useState<string | null>(null);
  const [orderDraft, setOrderDraft] = useState({ boxes: '1', destination: '', dispatch: '', remark: '' });
  const [logRowId, setLogRowId] = useState<string | null>(null);
  const [formError, setFormError] = useState('');
  const checkAllRef = useRef<HTMLInputElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const visibleColumns = COLUMNS.filter((column) => !hiddenColumns.includes(column.key));
  const customers = Array.from(new Set<string>(saved.rows.map((row: StorageRow) => row.customer)));
  const dispatches = Array.from(new Set<string>(saved.rows.map((row: StorageRow) => row.dispatch)));
  const transfers = Array.from(new Set<string>(saved.rows.map((row: StorageRow) => row.transfer)));
  const filtered = useMemo(() => {
    const keywords = applied.keyword.trim().toLowerCase();
    const inbounds = applied.inbound.split(/[,，;；\s]+/).map((value) => value.trim().toLowerCase()).filter(Boolean);
    const result = saved.rows.filter((row) => row.status === tab
      && (!keywords || [row.container, row.systemNo, row.inbound, row.label].some((value) => value.toLowerCase() === keywords))
      && (!applied.customer || row.customer === applied.customer)
      && (!inbounds.length || inbounds.includes(row.inbound.toLowerCase()))
      && (!applied.transfer || row.transfer === applied.transfer)
      && (!applied.destination || row.destination.toLowerCase().includes(applied.destination.trim().toLowerCase()))
      && (!applied.dispatch || row.dispatch === applied.dispatch)
      && (!applied.from || row.arrival.slice(0, 10) >= applied.from)
      && (!applied.to || row.arrival.slice(0, 10) <= applied.to)
      && (!applied.intercept || row.intercept === (applied.intercept === 'yes')));
    if (sort) result.sort((a, b) => (typeof a[sort.key] === 'number' ? Number(a[sort.key]) - Number(b[sort.key]) : String(a[sort.key]).localeCompare(String(b[sort.key]))) * (sort.ascending ? 1 : -1));
    return result;
  }, [saved.rows, applied, tab, sort]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);
  const selectedRows = saved.rows.filter((row) => selected.includes(row.id));
  const allSelected = pageRows.length > 0 && pageRows.every((row) => selected.includes(row.id));
  const selectedOnPage = pageRows.filter((row) => selected.includes(row.id)).length;
  const totals = selectedRows.reduce((sum, row) => ({ boxes: sum.boxes + row.total, weight: sum.weight + row.weight, volume: sum.volume + row.volume }), { boxes: 0, weight: 0, volume: 0 });
  const orderRow = saved.rows.find((row) => row.id === orderRowId);
  const logRow = saved.rows.find((row) => row.id === logRowId);
  const logs = saved.logs.filter((log) => log.rowId === logRowId);
  const rowOrders = saved.orders.filter((order) => order.rowId === logRowId);
  const totalWidth = 74 + visibleColumns.reduce((sum, column) => sum + column.width, 0);
  const fmt = (value: number) => Number(value.toFixed(3)).toLocaleString('zh-CN', { maximumFractionDigits: 3 });

  useEffect(() => { if (checkAllRef.current) checkAllRef.current.indeterminate = selectedOnPage > 0 && !allSelected; }, [selectedOnPage, allSelected]);
  useEffect(() => { setPageInput(String(page)); }, [page]);
  useEffect(() => { if (page > pageCount) setPage(pageCount); }, [page, pageCount]);
  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setSettingsOpen(false); setOrderRowId(null); setLogRowId(null); setLocationOpen(false); } };
    const closeSettings = (event: MouseEvent) => { if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) setSettingsOpen(false); };
    document.addEventListener('keydown', onEscape); document.addEventListener('mousedown', closeSettings);
    return () => { document.removeEventListener('keydown', onEscape); document.removeEventListener('mousedown', closeSettings); };
  }, []);

  function persist(next: SavedState, message: string) {
    setSaved(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); addToast?.(message, 'success'); }
    catch { addToast?.(`${message}，浏览器未能保存本地数据`, 'warning'); }
  }
  function applyQuery() {
    if (draft.from && draft.to && draft.from > draft.to) { addToast?.('入库开始日期不能晚于结束日期', 'warning'); return; }
    setApplied({ ...draft }); setPage(1); setSelected([]);
  }
  function reset() { setDraft({ ...EMPTY_FILTERS }); setApplied({ ...EMPTY_FILTERS }); setPage(1); setSelected([]); }
  function changePage(next: number) { const value = Math.max(1, Math.min(pageCount, next || 1)); setPage(value); setPageInput(String(value)); }
  function toggleAll() { setSelected((current) => allSelected ? current.filter((id) => !pageRows.some((row) => row.id === id)) : Array.from(new Set([...current, ...pageRows.map((row) => row.id)]))); }
  function exportCsv() {
    const rows = selected.length ? selectedRows : filtered;
    if (!rows.length) { addToast?.('暂无可导出的记录', 'info'); return; }
    const columns = visibleColumns.filter((column) => column.key !== 'actions');
    const escape = (value: string | number | boolean) => { const text = String(value); return `"${(/^[=+@-]/.test(text) ? `'${text}` : text).replace(/"/g, '""')}"`; };
    const csv = [columns.map((column) => escape(column.label)).join(','), ...rows.map((row) => columns.map((column) => escape(column.key === 'intercept' ? row.intercept ? '拦截' : '否' : row[column.key as keyof StorageRow])).join(','))].join('\r\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = `暂存管理-${TABS.find((item) => item.id === tab)?.label}.csv`; document.body.appendChild(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    addToast?.(`已导出 ${rows.length} 条记录`, 'success');
  }
  function saveLocation() {
    const location = nextLocation.trim();
    if (!location) { setFormError('请输入新的库位'); return; }
    if (!selectedRows.length) { setFormError('请先选择需要更换库位的记录'); return; }
    const changed = selectedRows.filter((row) => row.location !== location);
    if (!changed.length) { setLocationOpen(false); addToast?.('所选记录已在该库位', 'info'); return; }
    const now = new Date(); const time = now.toLocaleString('zh-CN', { hour12: false });
    persist({ ...saved, rows: saved.rows.map((row) => selected.includes(row.id) ? { ...row, location } : row), logs: [...changed.map((row) => ({ id: `location-${now.getTime()}-${row.id}`, rowId: row.id, time, title: '更换库位', details: [`库位：${row.location} → ${location}`] })), ...saved.logs] }, `已更新 ${changed.length} 条记录的库位`);
    setLocationOpen(false);
  }
  function openOrder(row: StorageRow) { setOrderRowId(row.id); setOrderDraft({ boxes: '1', destination: row.destination, dispatch: row.dispatch, remark: '' }); setFormError(''); }
  function submitOrder() {
    if (!orderRow) return;
    if (orderRow.intercept) { setFormError('该批货物处于拦截状态，请先完成拦截处理后再下单。'); return; }
    if (orderRow.status !== 'stored') { setFormError('仅暂存中的货物可以提交下单。'); return; }
    const boxes = Number(orderDraft.boxes);
    if (!Number.isInteger(boxes) || boxes <= 0 || boxes > orderRow.unshipped) { setFormError(`下单箱数须为 1 至 ${orderRow.unshipped} 之间的整数。`); return; }
    if (!orderDraft.destination.trim() || !orderDraft.dispatch.trim()) { setFormError('请填写目的地和派送方式。'); return; }
    const now = new Date(); const time = now.toLocaleString('zh-CN', { hour12: false });
    const order: LocalOrder = { id: `ZC${now.getTime()}`, rowId: orderRow.id, boxes, destination: orderDraft.destination.trim(), dispatch: orderDraft.dispatch.trim(), remark: orderDraft.remark.trim(), time };
    const log: StorageLog = { id: `order-${now.getTime()}-${orderRow.id}`, rowId: orderRow.id, time, title: '提交下单（待审核）', details: [`指令单号：${order.id}`, `箱数：${boxes}，目的地：${order.destination}`, `派送方式：${order.dispatch}`, ...(order.remark ? [`备注：${order.remark}`] : [])] };
    persist({ rows: saved.rows.map((row) => row.id === orderRow.id ? { ...row, pending: row.pending + boxes, unshipped: row.unshipped - boxes } : row), orders: [order, ...saved.orders], logs: [log, ...saved.logs] }, '下单已保存，等待审核');
    setOrderRowId(null);
  }
  function renderCell(row: StorageRow, key: ColumnKey) {
    if (key === 'actions') return <span className="im-actions"><button type="button" disabled={row.status !== 'stored'} onClick={() => openOrder(row)}>下单</button><button type="button" onClick={() => setLogRowId(row.id)}>日志</button></span>;
    if (key === 'intercept') return row.intercept ? <span className="sm-intercept">拦截</span> : <span className="sm-muted">否</span>;
    if (key === 'weight' || key === 'volume') return fmt(row[key]);
    return <span className={key === 'label' ? 'sm-pallet-label' : undefined} title={String(row[key])}>{row[key]}</span>;
  }
  function renderSelect(label: string, key: 'customer' | 'transfer' | 'dispatch' | 'intercept', values: { value: string; label: string }[]) {
    return <label className="sm-filter"><span>{label}</span><span className="im-select"><select aria-label={label} value={draft[key]} onChange={(event) => setDraft({ ...draft, [key]: event.target.value })}><option value="">{label}</option>{values.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select><ChevronDown /></span></label>;
  }

  return <main className="im-page sm-page">
    <form className="sm-filters" onSubmit={(event) => { event.preventDefault(); applyQuery(); }}>
      <div className="sm-filter-grid">
        <label className="sm-filter"><span>关键字</span><input aria-label="关键字" placeholder="单个精准搜索" value={draft.keyword} onChange={(event) => setDraft({ ...draft, keyword: event.target.value })} /></label>
        {renderSelect('客户名称', 'customer', customers.map((value) => ({ value, label: value })))}
        <label className="sm-filter"><span>入仓号</span><input aria-label="入仓号" placeholder="多个入仓号用逗号或分号隔开" value={draft.inbound} onChange={(event) => setDraft({ ...draft, inbound: event.target.value })} /></label>
        {renderSelect('转运方式', 'transfer', transfers.map((value) => ({ value, label: value })))}
        {expanded && <>
          <label className="sm-filter"><span>目的地</span><input aria-label="目的地" placeholder="目的地" value={draft.destination} onChange={(event) => setDraft({ ...draft, destination: event.target.value })} /></label>
          {renderSelect('派送方式', 'dispatch', dispatches.map((value) => ({ value, label: value })))}
          <label className="sm-filter sm-date-filter"><span>入库时间</span><span className="sm-date-range"><input aria-label="入库开始日期" type="date" value={draft.from} onChange={(event) => setDraft({ ...draft, from: event.target.value })} /><i>至</i><input aria-label="入库结束日期" type="date" value={draft.to} onChange={(event) => setDraft({ ...draft, to: event.target.value })} /></span></label>
          {renderSelect('是否拦截', 'intercept', [{ value: 'yes', label: '拦截' }, { value: 'no', label: '未拦截' }])}
        </>}
      </div>
      <div className="sm-filter-actions"><button className="im-button im-primary" type="submit"><Search />查询</button><button className="im-button" type="button" onClick={reset}><RotateCcw />重置</button><button className="im-button sm-expand" type="button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}><ChevronDown className={expanded ? 'sm-rotated' : ''} />{expanded ? '收起' : '展开'}</button></div>
    </form>
    <section className="im-list-card sm-list-card">
      <div className="sm-list-heading"><div className="sm-tabs" role="tablist" aria-label="暂存状态">{TABS.map((item) => <button key={item.id} id={`sm-tab-${item.id}`} type="button" role="tab" aria-selected={tab === item.id} aria-controls="sm-records" className={tab === item.id ? 'sm-tab-active' : ''} onClick={() => { setTab(item.id); setPage(1); setSelected([]); }}>{item.label}<span>({saved.rows.filter((row) => row.status === item.id).length})</span></button>)}</div><div className="sm-toolbar-actions"><button type="button" className="im-button" disabled={!selected.length} onClick={() => { setLocationOpen(true); setNextLocation(''); setFormError(''); }}><MapPin />更换库位</button><button type="button" className="im-button im-primary" onClick={exportCsv}><Download />导出</button></div></div>
      <div className="sm-summary-bar"><div className="sm-summary"><span>已选择内容：</span><span>总托盘数：<b>{selectedRows.length}</b></span><span>总箱数：<b>{totals.boxes}</b></span><span>总柜数：<b>{new Set(selectedRows.map((row) => row.systemNo)).size}</b></span><span>总重量：<b>{fmt(totals.weight)}</b></span><span>总体积：<b>{fmt(totals.volume)}</b></span></div><div className="im-settings" ref={settingsRef}><button type="button" className="im-button im-primary im-settings-button" aria-label="暂存列设置" aria-expanded={settingsOpen} onClick={() => setSettingsOpen(!settingsOpen)}><Settings /></button>{settingsOpen && <div className="im-settings-panel sm-settings-panel"><div className="im-settings-title">显示列<button type="button" onClick={() => setHiddenColumns(['location'])}>重置</button></div>{COLUMNS.map((column) => <label className="im-column-option" key={column.key}><input type="checkbox" checked={!hiddenColumns.includes(column.key)} onChange={() => setHiddenColumns((current) => current.includes(column.key) ? current.filter((key) => key !== column.key) : current.length < COLUMNS.length - 1 ? [...current, column.key] : current)} /><span>{column.label}</span></label>)}</div>}</div></div>
      <div className="im-table-scroll sm-table-scroll" id="sm-records" role="tabpanel" aria-labelledby={`sm-tab-${tab}`}>
        <table className="im-table sm-table" style={{ minWidth: totalWidth }}><colgroup><col style={{ width: 36 }} /><col style={{ width: 38 }} />{visibleColumns.map((column) => <col key={column.key} style={{ width: column.width }} />)}</colgroup><thead><tr><th>#</th><th className="im-checkbox-cell"><input ref={checkAllRef} type="checkbox" aria-label="全选暂存记录" checked={allSelected} onChange={toggleAll} /></th>{visibleColumns.map((column) => <th key={column.key} className={column.key === 'actions' ? 'sm-actions-cell' : undefined} aria-sort={column.sortable ? sort?.key === column.sortable ? sort.ascending ? 'ascending' : 'descending' : 'none' : undefined}>{column.sortable ? <button className="sm-sort-button" type="button" onClick={() => { setSort((current) => ({ key: column.sortable!, ascending: current?.key === column.sortable ? !current.ascending : true })); setPage(1); }}>{column.label}{sort?.key === column.sortable ? sort.ascending ? <ArrowUp /> : <ArrowDown /> : <ArrowUpDown />}</button> : column.label}</th>)}</tr></thead><tbody>{pageRows.map((row, index) => <tr key={row.id} className={selected.includes(row.id) ? 'im-row-selected' : ''}><td>{(page - 1) * pageSize + index + 1}</td><td className="im-checkbox-cell"><input type="checkbox" aria-label={`选择暂存记录${row.id}`} checked={selected.includes(row.id)} onChange={() => setSelected((current) => current.includes(row.id) ? current.filter((id) => id !== row.id) : [...current, row.id])} /></td>{visibleColumns.map((column) => <td key={column.key} className={column.key === 'actions' ? 'sm-actions-cell' : undefined}>{renderCell(row, column.key)}</td>)}</tr>)}{!pageRows.length && <tr className="im-empty"><td colSpan={visibleColumns.length + 2}>暂无数据</td></tr>}</tbody></table>
      </div>
      <footer className="im-footer sm-footer"><span>共 {filtered.length} 条</span><span className="im-page-size im-select"><select aria-label="暂存每页条数" value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}><option value="100">100条/页</option><option value="50">50条/页</option><option value="20">20条/页</option></select><ChevronDown /></span><button className="im-page-arrow" type="button" aria-label="暂存上一页" disabled={page <= 1} onClick={() => changePage(page - 1)}><ChevronLeft /></button><button className="im-page-current" type="button" aria-label={`暂存第${page}页`}>{page}</button><button className="im-page-arrow" type="button" aria-label="暂存下一页" disabled={page >= pageCount} onClick={() => changePage(page + 1)}><ChevronRight /></button><label className="im-page-jump">前往<input aria-label="暂存页码" inputMode="numeric" value={pageInput} onChange={(event) => setPageInput(event.target.value.replace(/\D/g, ''))} onBlur={() => changePage(Number(pageInput))} onKeyDown={(event) => { if (event.key === 'Enter') changePage(Number(pageInput)); }} />页</label></footer>
    </section>
    {locationOpen && <div className="im-modal-mask" onMouseDown={(event) => { if (event.target === event.currentTarget) setLocationOpen(false); }}><section className="im-dialog sm-location-dialog" role="dialog" aria-modal="true" aria-labelledby="sm-location-title"><header className="im-dialog-header"><h2 id="sm-location-title">更换库位</h2><button type="button" aria-label="关闭更换库位" onClick={() => setLocationOpen(false)}><X /></button></header><form onSubmit={(event) => { event.preventDefault(); saveLocation(); }}><div className="sm-location-body"><p>已选择 <strong>{selectedRows.length}</strong> 个托盘</p><div className="sm-location-current">当前库位：{Array.from(new Set(selectedRows.map((row) => row.location))).join('、')}</div><label>新库位<input autoFocus aria-label="新库位" placeholder="请输入库位，例如 A-02-01" maxLength={50} value={nextLocation} onChange={(event) => setNextLocation(event.target.value)} /></label></div>{formError && <p className="im-form-error" role="alert">{formError}</p>}<footer className="im-dialog-footer"><button className="im-button" type="button" onClick={() => setLocationOpen(false)}>取消</button><button className="im-button im-primary" type="submit">保存</button></footer></form></section></div>}
    {orderRow && <div className="im-modal-mask" onMouseDown={(event) => { if (event.target === event.currentTarget) setOrderRowId(null); }}><section className="im-dialog sm-order-dialog" role="dialog" aria-modal="true" aria-labelledby="sm-order-title"><header className="im-dialog-header"><h2 id="sm-order-title">暂存下单</h2><button type="button" aria-label="关闭暂存下单" onClick={() => setOrderRowId(null)}><X /></button></header><div className="sm-order-context"><p>托盘标签：<strong>{orderRow.label}</strong></p><p>总箱数：{orderRow.total}<span>可下单箱数：<strong>{orderRow.unshipped}</strong></span></p>{orderRow.intercept && <div className="sm-order-warning">该批货物处于拦截状态，暂不能确认下单。</div>}{!orderRow.intercept && orderRow.unshipped === 0 && <div className="sm-order-warning">暂无可下单箱数，请查看待审核及已发货记录。</div>}</div><form onSubmit={(event) => { event.preventDefault(); submitOrder(); }}><div className="im-edit-fields sm-order-fields"><label>下单箱数<input autoFocus aria-label="下单箱数" type="number" min="1" max={orderRow.unshipped} step="1" value={orderDraft.boxes} onChange={(event) => setOrderDraft({ ...orderDraft, boxes: event.target.value })} /></label><label>目的地<input aria-label="下单目的地" maxLength={200} value={orderDraft.destination} onChange={(event) => setOrderDraft({ ...orderDraft, destination: event.target.value })} /></label><label>派送方式<span className="im-select"><select aria-label="下单派送方式" value={orderDraft.dispatch} onChange={(event) => setOrderDraft({ ...orderDraft, dispatch: event.target.value })}><option value="">请选择派送方式</option>{dispatches.map((dispatch) => <option key={dispatch}>{dispatch}</option>)}</select><ChevronDown /></span></label><label className="im-edit-description">备注<textarea aria-label="下单备注" placeholder="请输入备注" maxLength={1000} value={orderDraft.remark} onChange={(event) => setOrderDraft({ ...orderDraft, remark: event.target.value })} /></label></div><p className="sm-order-hint">提交后生成待审核指令，审核及出库状态以仓库处理结果为准。</p>{formError && <p className="im-form-error" role="alert">{formError}</p>}<footer className="im-dialog-footer"><button type="button" className="im-button" onClick={() => setOrderRowId(null)}>取消</button><button type="submit" className="im-button im-primary" disabled={orderRow.intercept || orderRow.unshipped === 0}>确认下单</button></footer></form></section></div>}
    {logRow && <div className="im-modal-mask" onMouseDown={(event) => { if (event.target === event.currentTarget) setLogRowId(null); }}><section className="im-dialog im-log-dialog" role="dialog" aria-modal="true" aria-labelledby="sm-log-title"><header className="im-dialog-header"><h2 id="sm-log-title">操作日志</h2><button type="button" aria-label="关闭暂存日志" onClick={() => setLogRowId(null)}><X /></button></header><div className="im-log-body"><div className="im-log-code">托盘标签：{logRow.label}</div>{rowOrders.length > 0 && <div className="sm-order-history"><strong>已提交指令</strong>{rowOrders.map((order) => <div key={order.id}><span>{order.id}</span><span>{order.boxes} 箱</span><span className="sm-pending-tag">待审核</span></div>)}</div>}{logs.length ? logs.map((log) => <article className="im-log-entry" key={log.id}><time>{log.time}</time><strong>{log.title}</strong>{log.details.map((detail, index) => <p key={index}>{detail}</p>)}</article>) : <div className="im-log-empty">暂无操作日志</div>}</div><footer className="im-dialog-footer"><button className="im-button" type="button" onClick={() => setLogRowId(null)}>关闭</button></footer></section></div>}
  </main>;
}
