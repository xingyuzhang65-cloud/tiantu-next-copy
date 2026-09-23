import { ChevronDown, RotateCcw, Search, Settings2, X } from 'lucide-react';
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import './ReservedOrderPage.css';

type ReservedStatus = '已预留' | '已送仓' | '已取消';
type ReservedOrder = {
  id: string; reserveNo: string; customer: string; merchandiser: string; channel: string; volume: string;
  deliveryPlace: string; scheduledTime: string; submitter: string; latestUpdated: string; firstSubmitted: string;
  remark: string; transferredVolume: string; untransferredVolume: string; returnedVolume: string; status: ReservedStatus;
};

const rows: ReservedOrder[] = [
  { id: '1', reserveNo: 'ASYL2609220005', customer: '郑志强', merchandiser: '天翊', channel: '2-纽约海铁30日达', volume: '11.403', deliveryPlace: '金华仓', scheduledTime: '2026-09-24', submitter: '安莹', latestUpdated: '2026-09-22 14:17:32', firstSubmitted: '2026-09-22 14:17:32', remark: '', transferredVolume: '0', untransferredVolume: '11.403', returnedVolume: '0', status: '已预留' },
  { id: '2', reserveNo: 'ASYL2609220004', customer: '郑志强', merchandiser: '天翊', channel: '2-纽约海铁30日达', volume: '0.068', deliveryPlace: '福州仓', scheduledTime: '2026-09-24', submitter: '安莹', latestUpdated: '2026-09-22 14:11:12', firstSubmitted: '2026-09-22 14:11:12', remark: '', transferredVolume: '0', untransferredVolume: '0.068', returnedVolume: '0', status: '已预留' },
  { id: '3', reserveNo: 'ASYL2609220003', customer: '郑志强', merchandiser: '天翊', channel: '2-纽约海铁30日达', volume: '4', deliveryPlace: '福州仓', scheduledTime: '2026-09-23', submitter: '安莹', latestUpdated: '2026-09-22 14:06:01', firstSubmitted: '2026-09-22 14:06:01', remark: 'USXMSA2609180747', transferredVolume: '0', untransferredVolume: '4', returnedVolume: '0', status: '已预留' },
  { id: '4', reserveNo: 'YL20260922006', customer: '长沙海泽通', merchandiser: '天怒（谢海胜）', channel: '2-纽约直航38日达', volume: '12.5', deliveryPlace: '汕头仓', scheduledTime: '2026-09-23', submitter: '天齐（谢海胜）', latestUpdated: '2026-09-22 13:13:17', firstSubmitted: '2026-09-22 13:13:17', remark: 'USSZ202609220248，客户在意时效，大货走直航', transferredVolume: '0', untransferredVolume: '12.5', returnedVolume: '0', status: '已预留' },
  { id: '5', reserveNo: 'YL20260922005', customer: '长沙海泽通', merchandiser: '天怒（谢海胜）', channel: '2-纽约直航36日达', volume: '12.5', deliveryPlace: '汕头仓', scheduledTime: '2026-09-23', submitter: '天齐（谢海胜）', latestUpdated: '2026-09-22 13:13:17', firstSubmitted: '2026-09-22 13:13:17', remark: 'USSZ202609220247，客户在意时效，大货走直航', transferredVolume: '0', untransferredVolume: '12.5', returnedVolume: '0', status: '已预留' },
  { id: '6', reserveNo: 'YL20260922004', customer: '长沙海泽通', merchandiser: '天怒（谢海胜）', channel: '萨凡纳直航36日达', volume: '12.5', deliveryPlace: '汕头仓', scheduledTime: '2026-09-23', submitter: '天齐（谢海胜）', latestUpdated: '2026-09-22 13:13:17', firstSubmitted: '2026-09-22 13:13:17', remark: 'USSZ202609220246，客户在意时效，大货走直航', transferredVolume: '0', untransferredVolume: '12.5', returnedVolume: '0', status: '已预留' },
  { id: '7', reserveNo: 'YL20260922003', customer: '长沙海泽通', merchandiser: '天怒（谢海胜）', channel: '洛杉矶CLX26日达', volume: '12.5', deliveryPlace: '汕头仓', scheduledTime: '2026-09-23', submitter: '天齐（谢海胜）', latestUpdated: '2026-09-22 13:10:06', firstSubmitted: '2026-09-22 13:10:06', remark: 'USSZ202609220245，大货走直航', transferredVolume: '0', untransferredVolume: '12.5', returnedVolume: '0', status: '已预留' },
  { id: '8', reserveNo: 'YL20260922002', customer: '长沙海泽通', merchandiser: '天怒（谢海胜）', channel: '2-休斯顿直航38日达', volume: '12.5', deliveryPlace: '汕头仓', scheduledTime: '2026-09-23', submitter: '天齐（谢海胜）', latestUpdated: '2026-09-22 13:08:48', firstSubmitted: '2026-09-22 13:08:48', remark: 'USSZ202609220244，大货走直航', transferredVolume: '0', untransferredVolume: '12.5', returnedVolume: '0', status: '已预留' },
  { id: '9', reserveNo: 'ASYL2609220002', customer: '郑志强', merchandiser: '天翊', channel: '洛杉矶CLX22日达', volume: '6.7', deliveryPlace: '金华仓', scheduledTime: '2026-09-23', submitter: '安莹', latestUpdated: '2026-09-22 12:41:00', firstSubmitted: '2026-09-22 12:41:00', remark: 'USSZAS2609200162', transferredVolume: '0', untransferredVolume: '6.7', returnedVolume: '0', status: '已预留' },
  { id: '10', reserveNo: 'ASYL2609220001', customer: '郑志强', merchandiser: '天翊', channel: '2-芝加哥海铁32日达', volume: '28', deliveryPlace: '广州仓', scheduledTime: '2026-09-22', submitter: '安莹', latestUpdated: '2026-09-22 11:42:56', firstSubmitted: '2026-09-22 11:42:56', remark: '3件今天进仓', transferredVolume: '0', untransferredVolume: '28', returnedVolume: '0', status: '已预留' },
  { id: '11', reserveNo: 'YL20260921001', customer: '深圳海天星', merchandiser: '天旺', channel: '洛杉矶MAX34日达', volume: '16', deliveryPlace: '塘厦仓', scheduledTime: '2026-09-30', submitter: '天旺', latestUpdated: '2026-09-22 10:52:09', firstSubmitted: '2026-09-22 10:52:09', remark: '', transferredVolume: '0', untransferredVolume: '16', returnedVolume: '0', status: '已预留' },
  { id: '12', reserveNo: 'ASYL2609210034', customer: '郑志强', merchandiser: '天翊', channel: '2-美铁加加尔加25日达', volume: '24', deliveryPlace: '金华仓', scheduledTime: '2026-09-24', submitter: '系统', latestUpdated: '2026-09-21 22:34:05', firstSubmitted: '2026-09-21 22:34:05', remark: 'USSZAS2609150235 USSZAS2609140242', transferredVolume: '1.315', untransferredVolume: '22.685', returnedVolume: '0', status: '已预留' },
  { id: '13', reserveNo: 'ASYL2609210033', customer: '郑志强', merchandiser: '天翊', channel: '洛杉矶CLX13日达', volume: '0.14', deliveryPlace: '塘厦仓', scheduledTime: '2026-09-21', submitter: '系统', latestUpdated: '2026-09-21 22:17:18', firstSubmitted: '2026-09-21 22:17:18', remark: 'USSZAS2609210470', transferredVolume: '0.156', untransferredVolume: '-0.016', returnedVolume: '0', status: '已预留' },
  { id: '14', reserveNo: 'ASYL2609210032', customer: '郑志强', merchandiser: '天翊', channel: '洛杉矶EXX16日达', volume: '1', deliveryPlace: '塘厦仓', scheduledTime: '2026-09-21', submitter: '系统', latestUpdated: '2026-09-21 22:17:18', firstSubmitted: '2026-09-21 22:17:18', remark: 'USSZAS2609210523', transferredVolume: '0.736', untransferredVolume: '0.264', returnedVolume: '0', status: '已预留' },
  { id: '15', reserveNo: 'ASYL2609210030', customer: '郑志强', merchandiser: '天翊', channel: '纽约海铁24日达', volume: '0.4', deliveryPlace: '塘厦仓', scheduledTime: '2026-09-21', submitter: '系统', latestUpdated: '2026-09-21 22:16:05', firstSubmitted: '2026-09-21 22:16:05', remark: 'USSZAS2609210647', transferredVolume: '0.32', untransferredVolume: '0.08', returnedVolume: '0', status: '已预留' },
  { id: '16', reserveNo: 'ASYL2609210029', customer: '郑志强', merchandiser: '天翊', channel: '2-芝加哥海铁28日达', volume: '0.4', deliveryPlace: '塘厦仓', scheduledTime: '2026-09-21', submitter: '系统', latestUpdated: '2026-09-21 22:16:05', firstSubmitted: '2026-09-21 22:16:05', remark: 'USSZAS2609210648', transferredVolume: '0.35', untransferredVolume: '0.05', returnedVolume: '0', status: '已预留' },
  { id: '17', reserveNo: 'ASYL2609210028', customer: '郑志强', merchandiser: '天翊', channel: '洛杉矶CLX13日达', volume: '0.1', deliveryPlace: '塘厦仓', scheduledTime: '2026-09-25', submitter: '系统', latestUpdated: '2026-09-21 22:11:05', firstSubmitted: '2026-09-21 22:11:05', remark: 'USSZAS2609161226 USSZAS260916122...', transferredVolume: '0.058', untransferredVolume: '0.042', returnedVolume: '0', status: '已预留' },
  { id: '18', reserveNo: 'ASYL2609210027', customer: '郑志强', merchandiser: '天翊', channel: '休斯顿海铁32日达', volume: '0.1', deliveryPlace: '塘厦仓', scheduledTime: '2026-09-25', submitter: '系统', latestUpdated: '2026-09-21 22:11:05', firstSubmitted: '2026-09-21 22:11:05', remark: 'USSZAS2609161224 USSZAS2609210615', transferredVolume: '0.053', untransferredVolume: '0.047', returnedVolume: '0', status: '已预留' },
  { id: '19', reserveNo: 'ASYL2609210026', customer: '郑志强', merchandiser: '天翊', channel: '休斯顿海铁24日达', volume: '0.1', deliveryPlace: '塘厦仓', scheduledTime: '2026-09-25', submitter: '系统', latestUpdated: '2026-09-21 22:11:05', firstSubmitted: '2026-09-21 22:11:05', remark: 'USSZAS2609161223 USSZAS2609210614', transferredVolume: '0', untransferredVolume: '0.1', returnedVolume: '0', status: '已预留' },
  { id: '20', reserveNo: 'YL20260921013', customer: '深圳满天星', merchandiser: '天旺', channel: '洛杉矶CLX13日达', volume: '15', deliveryPlace: '金华仓', scheduledTime: '2026-09-21', submitter: '天德（朱柏登）', latestUpdated: '2026-09-21 21:39:41', firstSubmitted: '2026-09-21 21:39:41', remark: '23点到', transferredVolume: '15.541', untransferredVolume: '-0.541', returnedVolume: '0', status: '已预留' },
  { id: '21', reserveNo: 'ASYL2609210024', customer: '郑志强', merchandiser: '天翊', channel: '芝加哥海铁28日达', volume: '4', deliveryPlace: '塘厦仓', scheduledTime: '2026-09-23', submitter: '安莹', latestUpdated: '2026-09-21 20:48:23', firstSubmitted: '2026-09-21 20:48:23', remark: 'USSZAS2609181425 USSZAS2609181424', transferredVolume: '0', untransferredVolume: '4', returnedVolume: '0', status: '已预留' },
  { id: '22', reserveNo: 'ASYL2609210023', customer: '郑志强', merchandiser: '天翊', channel: '纽约海铁24日达', volume: '2', deliveryPlace: '仓洲仓', scheduledTime: '2026-09-21', submitter: '安娜', latestUpdated: '2026-09-21 20:45:20', firstSubmitted: '2026-09-21 20:45:20', remark: 'USSZAS2609210499 USSZAS260921049...', transferredVolume: '0', untransferredVolume: '2', returnedVolume: '0', status: '已预留' },
  { id: '23', reserveNo: 'ASYL2609210022', customer: '郑志强', merchandiser: '天翊', channel: '洛杉矶CLX20日达', volume: '0.7', deliveryPlace: '仓洲仓', scheduledTime: '2026-09-21', submitter: '安娜', latestUpdated: '2026-09-21 20:45:20', firstSubmitted: '2026-09-21 20:45:20', remark: 'USSZAS2609210498 USSZAS2609210497', transferredVolume: '0', untransferredVolume: '0.7', returnedVolume: '0', status: '已预留' },
  { id: '24', reserveNo: 'ASYL2609210021', customer: '郑志强', merchandiser: '天翊', channel: '洛杉矶EXX16日达', volume: '6', deliveryPlace: '金华仓', scheduledTime: '2026-09-21', submitter: '系统', latestUpdated: '2026-09-21 19:17:46', firstSubmitted: '2026-09-21 19:17:46', remark: '', transferredVolume: '5.963', untransferredVolume: '0.037', returnedVolume: '0', status: '已预留' },
  { id: '25', reserveNo: 'ASYL2609210020', customer: '郑志强', merchandiser: '天翊', channel: '2-芝加哥海铁28日达', volume: '1.2', deliveryPlace: '金华仓', scheduledTime: '2026-09-25', submitter: '安莹', latestUpdated: '2026-09-21 18:59:49', firstSubmitted: '2026-09-21 18:59:49', remark: '', transferredVolume: '0', untransferredVolume: '1.2', returnedVolume: '0', status: '已预留' },
  { id: '26', reserveNo: 'ASYL2609210019', customer: '郑志强', merchandiser: '天翊', channel: '休斯顿海铁38日达', volume: '1.9', deliveryPlace: '金华仓', scheduledTime: '2026-09-25', submitter: '安莹', latestUpdated: '2026-09-21 18:38:14', firstSubmitted: '2026-09-21 18:38:14', remark: '', transferredVolume: '0', untransferredVolume: '1.9', returnedVolume: '0', status: '已预留' },
  { id: '27', reserveNo: 'RS202609200012', customer: '福奈测试客户', merchandiser: '天顺', channel: '纽约海铁24日达', volume: '5.6', deliveryPlace: '塘厦仓', scheduledTime: '2026-09-20', submitter: '系统', latestUpdated: '2026-09-20 17:26:11', firstSubmitted: '2026-09-20 17:26:11', remark: '已完成交仓', transferredVolume: '5.6', untransferredVolume: '0', returnedVolume: '0', status: '已送仓' },
  { id: '28', reserveNo: 'RS202609190009', customer: '深圳天图', merchandiser: '天惠', channel: '洛杉矶CLX13日达', volume: '3.2', deliveryPlace: '塘厦仓', scheduledTime: '2026-09-19', submitter: '系统', latestUpdated: '2026-09-19 17:12:09', firstSubmitted: '2026-09-19 17:12:09', remark: '客户取消', transferredVolume: '0', untransferredVolume: '0', returnedVolume: '3.2', status: '已取消' },
];

// Additional local examples keep the pagination shown in the reference usable.
const reservedExamples = rows.filter(row => row.status === '已预留');
const initialRows: ReservedOrder[] = [
  ...reservedExamples,
  ...Array.from({ length: 238 - reservedExamples.length }, (_, index) => {
    const source = reservedExamples[index % reservedExamples.length];
    return { ...source, id: 'example-' + index, reserveNo: 'ASYL260920' + String(index + 1).padStart(4, '0'), latestUpdated: '2026-09-20 16:20:00', firstSubmitted: '2026-09-20 16:20:00', remark: '' };
  }),
  ...rows.filter(row => row.status !== '已预留'),
];
const tabs: ReservedStatus[] = ['已预留', '已送仓', '已取消'];
const columns: { key: keyof ReservedOrder; label: string; width: number }[] = [
  { key: 'reserveNo', label: '预留单号', width: 8.2 },
  { key: 'customer', label: '客户', width: 5.2 },
  { key: 'merchandiser', label: '跟单', width: 5.2 },
  { key: 'channel', label: '渠道', width: 6.7 },
  { key: 'volume', label: '预留方数', width: 5.6 },
  { key: 'deliveryPlace', label: '交仓地点', width: 5.6 },
  { key: 'scheduledTime', label: '预计送仓时间', width: 7.8 },
  { key: 'submitter', label: '提交人', width: 5.7 },
  { key: 'latestUpdated', label: '最近更新时间', width: 7.8 },
  { key: 'firstSubmitted', label: '首次提交时间', width: 7.8 },
  { key: 'remark', label: '备注', width: 10.8 },
  { key: 'transferredVolume', label: '转货方数', width: 5.2 },
  { key: 'untransferredVolume', label: '未转方数', width: 5.2 },
  { key: 'returnedVolume', label: '退件方数', width: 5.2 },
];
type Filters = { customer: string; merchandiser: string; reserveNo: string; channel: string; deliveryPlace: string; dateFrom: string; dateTo: string };
const emptyFilters: Filters = { customer: '', merchandiser: '', reserveNo: '', channel: '', deliveryPlace: '', dateFrom: '', dateTo: '' };
const editableFields = ['customer', 'merchandiser', 'channel', 'volume', 'deliveryPlace', 'scheduledTime', 'remark'] as const;
type Form = Pick<ReservedOrder, typeof editableFields[number]>;
const emptyForm: Form = { customer: '', merchandiser: '', channel: '', volume: '', deliveryPlace: '', scheduledTime: '', remark: '' };
type Panel = { kind: 'create' | 'batch' | 'stats' | 'settings' } | { kind: 'edit' | 'detail' | 'cancel'; row: ReservedOrder } | null;
const now = () => new Date().toLocaleString('sv-SE');
const isValidDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T00:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
};
const csvEscape = (value: string) => '"' + (/^[=+\-@]/.test(value) && !Number.isFinite(Number(value)) ? "'" + value : value).replace(/"/g, '""') + '"';

export default function ReservedOrderPage({ addToast }: { addToast?: (text: string, type?: 'success' | 'info' | 'warning') => void }) {
  const [data, setData] = useState(initialRows);
  const [tab, setTab] = useState<ReservedStatus>('已预留');
  const [filters, setFilters] = useState(emptyFilters);
  const [applied, setApplied] = useState(emptyFilters);
  const [expanded, setExpanded] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [selection, setSelection] = useState<string[]>([]);
  const [panel, setPanel] = useState<Panel>(null);
  const [form, setForm] = useState<Form>(emptyForm);
  const [batchText, setBatchText] = useState('');
  const [error, setError] = useState('');
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
  const tableWrap = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDivElement>(null);

  const visible = useMemo(() => data.filter(row => {
    const includes = (value: string, query: string) => value.toLowerCase().includes(query.trim().toLowerCase());
    return row.status === tab && includes(row.customer, applied.customer) && includes(row.merchandiser, applied.merchandiser)
      && includes(row.reserveNo, applied.reserveNo) && includes(row.channel, applied.channel)
      && includes(row.deliveryPlace, applied.deliveryPlace)
      && (!applied.dateFrom || row.scheduledTime >= applied.dateFrom) && (!applied.dateTo || row.scheduledTime <= applied.dateTo);
  }), [data, tab, applied]);
  const pageCount = Math.max(1, Math.ceil(visible.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageRows = visible.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const shownColumns = columns.filter(column => !hiddenColumns.includes(column.key));
  const allSelected = pageRows.length > 0 && pageRows.every(row => selection.includes(row.id));
  const selectedRows = visible.filter(row => selection.includes(row.id));
  const statsRows = selectedRows.length ? selectedRows : visible;
  const total = (key: 'volume' | 'transferredVolume' | 'untransferredVolume' | 'returnedVolume') => Number(statsRows.reduce((sum, row) => sum + Number(row[key]), 0).toFixed(3));
  const notify = (message: string, type: 'success' | 'info' | 'warning' = 'info') => addToast?.(message, type);

  useEffect(() => { tableWrap.current?.scrollTo({ top: 0 }); }, [currentPage, tab, applied, pageSize]);
  useEffect(() => {
    if (!panel) return;
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.focus();
    return () => previous?.focus();
  }, [panel]);
  const openPanel = (next: Exclude<Panel, null>) => {
    setError('');
    if (next.kind === 'create') setForm(emptyForm);
    if (next.kind === 'edit') setForm(next.row);
    if (next.kind === 'batch') setBatchText('');
    setPanel(next);
  };
  const switchTab = (next: ReservedStatus) => { setTab(next); setSelection([]); setPage(1); };
  const reset = () => { setFilters(emptyFilters); setApplied(emptyFilters); setPage(1); setSelection([]); };
  const applyQuery = (event: FormEvent) => {
    event.preventDefault();
    if ((filters.dateFrom && !isValidDate(filters.dateFrom)) || (filters.dateTo && !isValidDate(filters.dateTo))) {
      notify('请输入有效的预计送仓日期', 'warning'); return;
    }
    if (filters.dateFrom && filters.dateTo && filters.dateFrom > filters.dateTo) {
      notify('开始日期不能晚于结束日期', 'warning'); return;
    }
    setApplied(filters); setPage(1); setSelection([]);
  };
  const toggleAll = () => setSelection(current => allSelected ? current.filter(id => !pageRows.some(row => row.id === id)) : [...new Set([...current, ...pageRows.map(row => row.id)])]);
  const changeStatus = (ids: string[], status: ReservedStatus) => {
    setData(current => current.map(row => ids.includes(row.id) ? { ...row, status, latestUpdated: now() } : row));
    setSelection([]); setPanel(null);
    notify('已更新 ' + ids.length + ' 条预留单为' + status, 'success');
  };
  const markDelivered = () => {
    if (tab !== '已预留' || !selectedRows.length) { notify('请勾选需要送仓的已预留单', 'warning'); return; }
    changeStatus(selectedRows.map(row => row.id), '已送仓');
  };
  const validate = (value: Form) => {
    if (!value.customer.trim() || !value.channel.trim() || !value.deliveryPlace.trim() || !value.scheduledTime) return '请填写客户、渠道、交仓地点及预计送仓时间';
    if (!value.volume.trim() || !Number.isFinite(Number(value.volume)) || Number(value.volume) <= 0) return '预留方数须为大于 0 的数字';
    if (!isValidDate(value.scheduledTime)) return '预计送仓时间请按 YYYY-MM-DD 填写有效日期';
    return '';
  };
  const createRow = (value: Form, index = 0): ReservedOrder => {
    const stamp = now();
    const suffix = String(Date.now()).slice(-8) + String(index).padStart(2, '0');
    return { ...value, id: 'new-' + suffix, reserveNo: 'YL' + stamp.slice(0, 10).replaceAll('-', '') + suffix, submitter: '天朗（付豪）', latestUpdated: stamp, firstSubmitted: stamp, transferredVolume: '0', untransferredVolume: value.volume, returnedVolume: '0', status: '已预留' };
  };
  const saveForm = (event: FormEvent) => {
    event.preventDefault();
    const problem = validate(form);
    if (problem) { setError(problem); return; }
    if (panel?.kind === 'edit') {
      setData(current => current.map(row => row.id === panel.row.id ? { ...row, ...form, untransferredVolume: String(Number((Number(form.volume) - Number(row.transferredVolume) - Number(row.returnedVolume)).toFixed(3))), latestUpdated: now() } : row));
    } else {
      setData(current => [createRow(form), ...current]);
      reset(); switchTab('已预留');
    }
    setPanel(null); notify('预留单已保存', 'success');
  };
  const saveBatch = () => {
    const lines = batchText.trim().split(/\r?\n/).filter(line => line.trim());
    if (!batchText.trim()) { setError('请输入需要批量预留的数据'); return; }
    const parsed: Form[] = [];
    for (let index = 0; index < lines.length; index++) {
      const [customer = '', merchandiser = '', channel = '', volume = '', deliveryPlace = '', scheduledTime = '', ...remarks] = lines[index].split(/[,，\t]/).map(value => value.trim());
      const value: Form = { customer, merchandiser, channel, volume, deliveryPlace, scheduledTime, remark: remarks.join('，') };
      const problem = validate(value);
      if (problem) { setError('第 ' + (index + 1) + ' 行：' + problem); return; }
      parsed.push(value);
    }
    setData(current => [...parsed.map(createRow), ...current]);
    reset(); switchTab('已预留'); setPanel(null); notify('已新增 ' + parsed.length + ' 条预留单', 'success');
  };
  const exportRows = () => {
    const picked = selectedRows.length ? selectedRows : visible;
    const csv = [columns.map(column => column.label).join(','), ...picked.map(row => columns.map(column => csvEscape(row[column.key])).join(','))].join('\r\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = '预留单列表.csv'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000); notify('已导出 ' + picked.length + ' 条预留单', 'success');
  };
  const updateFilters = (key: keyof Filters, value: string) => setFilters(current => ({ ...current, [key]: value }));
  const panelTitle = panel ? { create: '新增预留', batch: '批量预留', edit: '编辑预留单', detail: '预留单详细', cancel: '取消预留', stats: '预留统计', settings: '列表字段设置' }[panel.kind] : '';
  const pageButtons = [...new Set([1, currentPage - 1, currentPage, currentPage + 1, pageCount])].filter(value => value >= 1 && value <= pageCount).sort((a, b) => a - b);

  return (
    <main className="reserved-page">
      <form className="reserved-filter-card" onSubmit={applyQuery}>
        <div className="reserved-filter-grid">
          <label><span>客户</span><input aria-label="客户" value={filters.customer} onChange={event => updateFilters('customer', event.target.value)} placeholder="客户" /></label>
          <label><span>跟单代表</span><input aria-label="跟单代表" value={filters.merchandiser} onChange={event => updateFilters('merchandiser', event.target.value)} placeholder="跟单代表" /></label>
          <label><span>预留单号</span><input aria-label="预留单号" value={filters.reserveNo} onChange={event => updateFilters('reserveNo', event.target.value)} placeholder="预留单号" /></label>
          <div className="reserved-filter-actions">
            <button type="submit"><Search />查询</button>
            <button type="button" onClick={reset}><RotateCcw />重置</button>
            <button type="button" onClick={() => setExpanded(current => !current)} aria-expanded={expanded}><ChevronDown className={expanded ? 'rotated' : ''} />{expanded ? '收起' : '展开'}</button>
          </div>
        </div>
        {expanded && <div className="reserved-extra-filters">
          <label>渠道<input aria-label="渠道" value={filters.channel} onChange={event => updateFilters('channel', event.target.value)} /></label>
          <label>交仓地点<input aria-label="交仓地点" value={filters.deliveryPlace} onChange={event => updateFilters('deliveryPlace', event.target.value)} /></label>
          <label>预计送仓时间<input aria-label="预计送仓时间开始" type="date" value={filters.dateFrom} onChange={event => updateFilters('dateFrom', event.target.value)} /><span>至</span><input aria-label="预计送仓时间结束" type="date" value={filters.dateTo} onChange={event => updateFilters('dateTo', event.target.value)} /></label>
        </div>}
      </form>
      <section className="reserved-list-card">
        <div className="reserved-tabs" role="tablist" aria-label="预留单状态">{tabs.map(key => <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => switchTab(key)} className={tab === key ? 'active' : ''}>{key}</button>)}</div>
        <div className="reserved-toolbar"><div className="reserved-toolbar-left">
          <button type="button" onClick={() => openPanel({ kind: 'create' })}>新增预留</button>
          <button type="button" onClick={() => openPanel({ kind: 'batch' })}>批量预留</button>
          <button type="button" onClick={markDelivered}>已送仓</button>
          <button type="button" onClick={() => openPanel({ kind: 'stats' })}>统计</button>
          <button type="button" onClick={exportRows}>导出</button>
        </div><button type="button" aria-label="预留单列表设置" onClick={() => openPanel({ kind: 'settings' })} className="reserved-settings"><Settings2 /></button></div>
        <div className="reserved-table-wrap" ref={tableWrap}><table>
          <colgroup><col style={{ width: '2.1%' }} />{shownColumns.map(column => <col key={column.key} style={{ width: column.width + '%' }} />)}<col style={{ width: '6.4%' }} /></colgroup>
          <thead><tr><th className="check-col"><input aria-label="全选预留单" type="checkbox" checked={allSelected} onChange={toggleAll} /></th>{shownColumns.map(column => <th key={column.key}>{column.label}</th>)}<th className="operation-col">操作</th></tr></thead>
          <tbody>{pageRows.map(row => <tr key={row.id} className={selection.includes(row.id) ? 'is-selected' : ''}>
            <td className="check-col"><input aria-label={'选择预留单' + row.reserveNo} type="checkbox" checked={selection.includes(row.id)} onChange={() => setSelection(current => current.includes(row.id) ? current.filter(id => id !== row.id) : [...current, row.id])} /></td>
            {shownColumns.map(column => <td key={column.key} title={row[column.key]}>{row[column.key]}</td>)}
            <td className="operation-cell"><button type="button" onClick={() => openPanel({ kind: 'edit', row })} disabled={row.status !== '已预留' || row.reserveNo.startsWith('ASYL')}>编辑</button><button type="button" onClick={() => openPanel({ kind: 'cancel', row })} disabled={row.status !== '已预留' || row.reserveNo.startsWith('ASYL')}>取消</button><button type="button" onClick={() => openPanel({ kind: 'detail', row })}>详细</button></td>
          </tr>)}{!pageRows.length && <tr><td colSpan={shownColumns.length + 2} className="reserved-empty">暂无符合条件的预留单</td></tr>}</tbody>
        </table></div>
        <footer className="reserved-pagination"><span>共 {visible.length} 条</span><select aria-label="每页条数" value={pageSize} onChange={event => { setPageSize(Number(event.target.value)); setPage(1); setSelection([]); }}>{[100, 50, 20].map(size => <option key={size} value={size}>{size}条/页</option>)}</select><button type="button" aria-label="上一页" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>‹</button>{pageButtons.map((value, index) => <Fragment key={value}>{index > 0 && value - pageButtons[index - 1] > 1 && <span>…</span>}<button type="button" aria-label={'第' + value + '页'} aria-current={value === currentPage ? 'page' : undefined} className={value === currentPage ? 'active-page' : ''} onClick={() => setPage(value)}>{value}</button></Fragment>)}<button type="button" aria-label="下一页" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}>›</button><span>前往</span><input aria-label="前往页码" type="number" min={1} max={pageCount} value={currentPage} onChange={event => setPage(Math.min(pageCount, Math.max(1, Math.floor(Number(event.target.value) || 1))))} /><span>页</span></footer>
      </section>
      {panel && <div className="reserved-dialog-backdrop" onClick={event => { if (event.target === event.currentTarget) setPanel(null); }}><div className="reserved-dialog" role="dialog" aria-modal="true" aria-labelledby="reserved-dialog-title" ref={dialog} tabIndex={-1} onKeyDown={event => {
        if (event.key === 'Escape') setPanel(null);
        if (event.key === 'Tab') {
          const controls = dialog.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), textarea, select');
          if (controls?.length) {
            const first = controls[0], last = controls[controls.length - 1];
            if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
          }
        }
      }}>
        <header className="reserved-dialog-header"><h2 id="reserved-dialog-title">{panelTitle}</h2><button type="button" aria-label="关闭弹窗" onClick={() => setPanel(null)}><X size={16} /></button></header>
        {(panel.kind === 'create' || panel.kind === 'edit') && <form onSubmit={saveForm}><div className="reserved-dialog-body reserved-form-grid">
          {editableFields.map(key => <label key={key} className={key === 'remark' ? 'reserved-form-wide' : ''}><span>{columns.find(column => column.key === key)?.label}{!['remark', 'merchandiser'].includes(key) && <b>*</b>}</span>{key === 'remark' ? <textarea value={form[key]} onChange={event => setForm(current => ({ ...current, [key]: event.target.value }))} /> : <input required={key !== 'merchandiser'} type={key === 'volume' ? 'number' : key === 'scheduledTime' ? 'date' : 'text'} min={key === 'volume' ? 0.001 : undefined} step={key === 'volume' ? 'any' : undefined} value={form[key]} onChange={event => setForm(current => ({ ...current, [key]: event.target.value }))} />}</label>)}
          {error && <p className="reserved-dialog-error" role="alert">{error}</p>}
        </div><footer className="reserved-dialog-footer"><button type="button" onClick={() => setPanel(null)}>取消</button><button type="submit" className="reserved-dialog-primary">保存</button></footer></form>}
        {panel.kind === 'detail' && <><div className="reserved-dialog-body"><dl className="reserved-detail-grid">{[...columns, { key: 'status' as const, label: '状态' }].map(column => <div key={column.key}><dt>{column.label}</dt><dd>{panel.row[column.key] || '—'}</dd></div>)}</dl></div><footer className="reserved-dialog-footer"><button type="button" onClick={() => setPanel(null)}>关闭</button></footer></>}
        {panel.kind === 'cancel' && <><div className="reserved-dialog-body">确认取消预留单 {panel.row.reserveNo}？</div><footer className="reserved-dialog-footer"><button type="button" onClick={() => setPanel(null)}>返回</button><button type="button" className="reserved-dialog-primary" onClick={() => changeStatus([panel.row.id], '已取消')}>确认取消</button></footer></>}
        {panel.kind === 'batch' && <><div className="reserved-dialog-body"><p>每行一条，使用逗号或制表符分隔：客户、跟单、渠道、预留方数、交仓地点、预计送仓时间、备注（选填）。</p><textarea className="reserved-batch-input" aria-label="批量预留数据" placeholder="客户名称,跟单代表,渠道名称,1.5,金华仓,2026-09-24,备注" value={batchText} onChange={event => setBatchText(event.target.value)} />{error && <p className="reserved-dialog-error" role="alert">{error}</p>}</div><footer className="reserved-dialog-footer"><button type="button" onClick={() => setPanel(null)}>取消</button><button type="button" className="reserved-dialog-primary" onClick={saveBatch}>保存预留</button></footer></>}
        {panel.kind === 'stats' && <><div className="reserved-dialog-body"><p>{selectedRows.length ? '已选预留单' : '当前查询结果'}：{statsRows.length} 条</p><dl className="reserved-stat-grid">{(['volume', 'transferredVolume', 'untransferredVolume', 'returnedVolume'] as const).map(key => <div key={key}><dt>{columns.find(column => column.key === key)?.label}</dt><dd>{total(key)}</dd></div>)}</dl></div><footer className="reserved-dialog-footer"><button type="button" onClick={() => setPanel(null)}>关闭</button></footer></>}
        {panel.kind === 'settings' && <><div className="reserved-dialog-body reserved-column-options">{columns.map(column => <label key={column.key}><input type="checkbox" checked={!hiddenColumns.includes(column.key)} disabled={column.key === 'reserveNo'} onChange={() => setHiddenColumns(current => current.includes(column.key) ? current.filter(key => key !== column.key) : [...current, column.key])} />{column.label}</label>)}</div><footer className="reserved-dialog-footer"><button type="button" onClick={() => setHiddenColumns([])}>恢复默认</button><button type="button" className="reserved-dialog-primary" onClick={() => setPanel(null)}>完成</button></footer></>}
      </div></div>}
    </main>
  );
}
