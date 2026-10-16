import { ChevronDown, ChevronLeft, ChevronRight, RotateCcw, Search, Settings, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import './InstructionManagementPage.css';
import { instructionManagementCatalog } from './instructionManagementCatalog';

type FeeRow = {
  code: string;
  name: string;
  type: string;
  unit: string;
  price: number;
  cost: number;
  currency: string;
  status: '启用' | '停用';
  description: string;
};
type Filters = { code: string; type: string; status: string };
type ChangeLog = { id: string; code: string; time: string; changes: string[] };
type SavedState = { rows: FeeRow[]; logs: ChangeLog[] };
type ColumnKey = Exclude<keyof FeeRow, never> | 'actions';
type Props = { addToast?: (text: string, type?: 'success' | 'info' | 'warning') => void };

// The reference footer shows 40 records. Only its 21 visible records are available.
const REFERENCE_TOTAL = 40;
const STORAGE_KEY = 'tiantu-instruction-management-reference-v1';
const EMPTY_FILTERS: Filters = { code: '', type: '', status: '' };
const REFERENCE_ROWS: FeeRow[] = instructionManagementCatalog;
const COLUMNS: { key: ColumnKey; label: string; width: number }[] = [
  { key: 'code', label: '费用代码', width: 214 },
  { key: 'name', label: '费用名称', width: 215 },
  { key: 'type', label: '费用类型', width: 158 },
  { key: 'unit', label: '计费单位', width: 159 },
  { key: 'price', label: '计费单价（元）', width: 183 },
  { key: 'cost', label: '成本单价（元）', width: 183 },
  { key: 'currency', label: '币种', width: 159 },
  { key: 'status', label: '状态', width: 159 },
  { key: 'description', label: '描述', width: 208 },
  { key: 'actions', label: '操作', width: 145 },
];

function readSavedState(): SavedState {
  const fallback = { rows: REFERENCE_ROWS.map((row) => ({ ...row })), logs: [] };
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') as SavedState | null;
    if (!parsed || !Array.isArray(parsed.rows) || !Array.isArray(parsed.logs)) return fallback;
    return {
      rows: REFERENCE_ROWS.map((original) => {
        const saved = parsed.rows.find((row) => row.code === original.code);
        if (!saved || COLUMNS.some(({ key }) => key !== 'actions' && typeof saved[key] !== typeof original[key])) return { ...original };
        if (!Number.isFinite(saved.price) || !Number.isFinite(saved.cost) || saved.price < 0 || saved.cost < 0 || !['启用', '停用'].includes(saved.status)) return { ...original };
        return { ...original, ...saved, code: original.code };
      }),
      logs: parsed.logs.filter((log) => REFERENCE_ROWS.some((row) => row.code === log.code) && typeof log.id === 'string' && typeof log.time === 'string' && Array.isArray(log.changes) && log.changes.every((value) => typeof value === 'string')),
    };
  } catch {
    return fallback;
  }
}

export default function InstructionManagementPage({ addToast }: Props) {
  const [saved, setSaved] = useState<SavedState>(readSavedState);
  const [draft, setDraft] = useState<Filters>({ ...EMPTY_FILTERS });
  const [applied, setApplied] = useState<Filters>({ ...EMPTY_FILTERS });
  const [selected, setSelected] = useState<string[]>([]);
  const [hiddenColumns, setHiddenColumns] = useState<ColumnKey[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editing, setEditing] = useState<FeeRow | null>(null);
  const [logCode, setLogCode] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState(100);
  const [page, setPage] = useState(1);
  const [pageInput, setPageInput] = useState('1');
  const [formError, setFormError] = useState('');
  const checkAllRef = useRef<HTMLInputElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const feeTypes = useMemo(() => Array.from(new Set(saved.rows.map((row) => row.type))), [saved.rows]);
  const visibleColumns = COLUMNS.filter((column) => !hiddenColumns.includes(column.key));
  const hasFilter = Boolean(applied.code || applied.type || applied.status);
  const filtered = useMemo(() => saved.rows.filter((row) => row.code.toLowerCase().includes(applied.code.trim().toLowerCase()) && (!applied.type || row.type === applied.type) && (!applied.status || row.status === applied.status)), [saved.rows, applied]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);
  const allSelected = pageRows.length > 0 && pageRows.every((row) => selected.includes(row.code));
  const selectedOnPage = pageRows.filter((row) => selected.includes(row.code)).length;
  const totalWidth = 39 + visibleColumns.reduce((sum, column) => sum + column.width, 0);
  const logs = saved.logs.filter((log) => log.code === logCode);

  useEffect(() => { if (checkAllRef.current) checkAllRef.current.indeterminate = selectedOnPage > 0 && !allSelected; }, [selectedOnPage, allSelected]);
  useEffect(() => { setPageInput(String(page)); }, [page]);
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setEditing(null); setLogCode(null); setSettingsOpen(false); }
    };
    const closeSettings = (event: MouseEvent) => { if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) setSettingsOpen(false); };
    document.addEventListener('keydown', closeOnEscape);
    document.addEventListener('mousedown', closeSettings);
    return () => { document.removeEventListener('keydown', closeOnEscape); document.removeEventListener('mousedown', closeSettings); };
  }, []);

  const applyQuery = () => { setApplied({ ...draft }); setPage(1); setSelected([]); };
  const reset = () => { setDraft({ ...EMPTY_FILTERS }); setApplied({ ...EMPTY_FILTERS }); setPage(1); setSelected([]); };
  const changePage = (next: number) => { const normalized = Math.max(1, Math.min(pageCount, next || 1)); setPage(normalized); setPageInput(String(normalized)); };
  const toggleAll = () => setSelected((current) => allSelected ? current.filter((code) => !pageRows.some((row) => row.code === code)) : Array.from(new Set([...current, ...pageRows.map((row) => row.code)])));
  const exportCsv = () => {
    const rows = selected.length ? filtered.filter((row) => selected.includes(row.code)) : filtered;
    const columns = visibleColumns.filter((column) => column.key !== 'actions');
    const escape = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
    const csv = [columns.map((column) => escape(column.label)).join(','), ...rows.map((row) => columns.map((column) => escape(row[column.key as keyof FeeRow])).join(','))].join('\r\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = '指令管理-费用列表.csv'; document.body.appendChild(link); link.click(); link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    addToast?.(`已导出 ${rows.length} 条费用记录`, 'success');
  };
  const saveEdit = () => {
    if (!editing) return;
    if (!editing.name.trim() || !editing.type.trim() || !editing.unit.trim()) { setFormError('请填写费用名称、费用类型和计费单位'); return; }
    if (!Number.isFinite(editing.price) || !Number.isFinite(editing.cost) || editing.price < 0 || editing.cost < 0) { setFormError('单价须为不小于0的有效数字'); return; }
    const original = saved.rows.find((row) => row.code === editing.code)!;
    const nextRow = { ...editing, name: editing.name.trim(), type: editing.type.trim(), unit: editing.unit.trim() };
    const logValue = (value: string | number) => value === '' ? '空' : String(value);
    const changes = COLUMNS.filter(({ key }) => key !== 'actions' && original[key] !== nextRow[key]).map(({ key, label }) => `${label}：${logValue(original[key as keyof FeeRow])} → ${logValue(nextRow[key as keyof FeeRow])}`);
    if (!changes.length) { setEditing(null); addToast?.('内容未发生修改', 'info'); return; }
    const now = new Date();
    const next: SavedState = { rows: saved.rows.map((row) => row.code === nextRow.code ? nextRow : row), logs: [{ id: `${now.getTime()}-${Math.random().toString(36).slice(2)}`, code: nextRow.code, time: now.toLocaleString('zh-CN', { hour12: false }), changes }, ...saved.logs] };
    setSaved(next); setEditing(null);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); addToast?.('费用修改已保存', 'success'); }
    catch { addToast?.('费用已更新，浏览器未能保存本地数据', 'warning'); }
  };
  const renderCell = (row: FeeRow, key: ColumnKey) => {
    if (key === 'actions') return <span className="im-actions"><button type="button" onClick={() => { setEditing({ ...row }); setFormError(''); }}>编辑</button><button type="button" onClick={() => setLogCode(row.code)}>日志</button></span>;
    if (key === 'status') return <span className={`im-status ${row.status === '停用' ? 'im-status-disabled' : ''}`}>{row.status}</span>;
    if (key === 'description') return <span className="im-description" title={row.description}>{row.description}</span>;
    return row[key];
  };

  return <main className="im-page">
    <form className="im-filters" onSubmit={(event) => { event.preventDefault(); applyQuery(); }}>
      <label className="im-filter im-filter-code"><span>费用代码</span><input aria-label="费用代码" placeholder="费用代码" value={draft.code} onChange={(event) => setDraft({ ...draft, code: event.target.value })} /></label>
      <label className="im-filter im-filter-type"><span>费用类型</span><span className="im-select"><select aria-label="费用类型" value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value })}><option value="">费用类型</option>{feeTypes.map((type) => <option key={type}>{type}</option>)}</select><ChevronDown /></span></label>
      <label className="im-filter im-filter-status"><span>状态</span><span className="im-select"><select aria-label="状态" value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })}><option value="">状态</option><option>启用</option><option>停用</option></select><ChevronDown /></span></label>
      <button className="im-button im-primary im-query" type="submit"><Search />查询</button>
      <button className="im-button im-reset" type="button" onClick={reset}><RotateCcw />重置</button>
    </form>
    <section className="im-list-card">
      <div className="im-toolbar"><button className="im-button im-primary im-export" type="button" onClick={exportCsv}>导出</button><div className="im-settings" ref={settingsRef}><button className="im-button im-primary im-settings-button" type="button" aria-label="列设置" aria-expanded={settingsOpen} onClick={() => setSettingsOpen(!settingsOpen)}><Settings /></button>{settingsOpen && <div className="im-settings-panel"><div className="im-settings-title">显示列<button type="button" onClick={() => setHiddenColumns([])}>重置</button></div>{COLUMNS.map((column) => <label className="im-column-option" key={column.key}><input type="checkbox" checked={!hiddenColumns.includes(column.key)} onChange={() => setHiddenColumns((current) => current.includes(column.key) ? current.filter((key) => key !== column.key) : current.length < COLUMNS.length - 1 ? [...current, column.key] : current)} /><span>{column.label}</span></label>)}</div>}</div></div>
      <div className="im-table-scroll">
        <table className="im-table"><colgroup><col style={{ width: `${39 / totalWidth * 100}%` }} />{visibleColumns.map((column) => <col key={column.key} style={{ width: `${column.width / totalWidth * 100}%` }} />)}</colgroup>
          <thead><tr><th className="im-checkbox-cell"><input ref={checkAllRef} type="checkbox" aria-label="全选费用" checked={allSelected} onChange={toggleAll} /></th>{visibleColumns.map((column) => <th key={column.key}>{column.label}</th>)}</tr></thead>
          <tbody>{pageRows.map((row) => <tr key={row.code} className={selected.includes(row.code) ? 'im-row-selected' : ''}><td className="im-checkbox-cell"><input type="checkbox" aria-label={`选择${row.code}`} checked={selected.includes(row.code)} onChange={() => setSelected((current) => current.includes(row.code) ? current.filter((code) => code !== row.code) : [...current, row.code])} /></td>{visibleColumns.map((column) => <td key={column.key}>{renderCell(row, column.key)}</td>)}</tr>)}{pageRows.length === 0 && <tr className="im-empty"><td colSpan={visibleColumns.length + 1}>暂无数据</td></tr>}</tbody>
        </table>
      </div>
      <footer className="im-footer"><span>共 {hasFilter ? filtered.length : REFERENCE_TOTAL} 条</span><span className="im-page-size im-select"><select aria-label="每页条数" value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}><option value="100">100条/页</option><option value="50">50条/页</option><option value="20">20条/页</option></select><ChevronDown /></span><button className="im-page-arrow" type="button" aria-label="上一页" disabled={page <= 1} onClick={() => changePage(page - 1)}><ChevronLeft /></button><button className="im-page-current" type="button" aria-label={`第${page}页`}>{page}</button><button className="im-page-arrow" type="button" aria-label="下一页" disabled={page >= pageCount} onClick={() => changePage(page + 1)}><ChevronRight /></button><label className="im-page-jump">前往<input aria-label="页码" inputMode="numeric" value={pageInput} onChange={(event) => setPageInput(event.target.value.replace(/\D/g, ''))} onBlur={() => changePage(Number(pageInput))} onKeyDown={(event) => { if (event.key === 'Enter') changePage(Number(pageInput)); }} />页</label></footer>
    </section>
    {editing && <div className="im-modal-mask" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditing(null); }}><section className="im-dialog" role="dialog" aria-modal="true" aria-labelledby="im-edit-title"><header className="im-dialog-header"><h2 id="im-edit-title">编辑费用</h2><button type="button" aria-label="关闭编辑" onClick={() => setEditing(null)}><X /></button></header><form onSubmit={(event) => { event.preventDefault(); saveEdit(); }}><div className="im-edit-fields"><label>费用代码<input value={editing.code} readOnly /></label><label>费用名称<input value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} /></label><label>费用类型<input list="im-fee-types" value={editing.type} onChange={(event) => setEditing({ ...editing, type: event.target.value })} /><datalist id="im-fee-types">{feeTypes.map((type) => <option key={type} value={type} />)}</datalist></label><label>计费单位<input value={editing.unit} onChange={(event) => setEditing({ ...editing, unit: event.target.value })} /></label><label>计费单价（元）<input type="number" min="0" step="any" value={editing.price} onChange={(event) => setEditing({ ...editing, price: Number(event.target.value) })} /></label><label>成本单价（元）<input type="number" min="0" step="any" value={editing.cost} onChange={(event) => setEditing({ ...editing, cost: Number(event.target.value) })} /></label><label>币种<select value={editing.currency} onChange={(event) => setEditing({ ...editing, currency: event.target.value })}><option>美元</option><option>人民币</option><option>欧元</option></select></label><label>状态<select value={editing.status} onChange={(event) => setEditing({ ...editing, status: event.target.value as FeeRow['status'] })}><option>启用</option><option>停用</option></select></label><label className="im-edit-description">描述<textarea value={editing.description} onChange={(event) => setEditing({ ...editing, description: event.target.value })} /></label></div>{formError && <p className="im-form-error" role="alert">{formError}</p>}<footer className="im-dialog-footer"><button type="button" className="im-button" onClick={() => setEditing(null)}>取消</button><button type="submit" className="im-button im-primary">保存</button></footer></form></section></div>}
    {logCode && <div className="im-modal-mask" onMouseDown={(event) => { if (event.target === event.currentTarget) setLogCode(null); }}><section className="im-dialog im-log-dialog" role="dialog" aria-modal="true" aria-labelledby="im-log-title"><header className="im-dialog-header"><h2 id="im-log-title">操作日志</h2><button type="button" aria-label="关闭日志" onClick={() => setLogCode(null)}><X /></button></header><div className="im-log-body"><div className="im-log-code">费用代码：{logCode}</div>{logs.length ? logs.map((log) => <article className="im-log-entry" key={log.id}><time>{log.time}</time><strong>编辑费用</strong>{log.changes.map((change, index) => <p key={index}>{change}</p>)}</article>) : <div className="im-log-empty">暂无操作日志</div>}</div><footer className="im-dialog-footer"><button type="button" className="im-button" onClick={() => setLogCode(null)}>关闭</button></footer></section></div>}
  </main>;
}
