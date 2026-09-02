import { CalendarDays, ChevronDown, Download, ImageIcon, RotateCcw, Search, Settings2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';

type Tab = '待确认' | '已确认' | '已下单' | '转运中' | '签收' | '取消' | '全部';
type Status = '已处理' | '待处理' | '已取消';
type ProcessingResult = '\u62e6\u622a\u6210\u529f' | '\u62e6\u622a\u5931\u8d25' | '\u5df2\u5904\u7406' | '\u5f85\u5904\u7406' | '-';
type Row = {
  id: string; tab: Tab; waybill: string; instructionNo: string; names: string[]; created: string; updated: string;
  shipment: string; reference: string; status: Status; processingResult?: ProcessingResult; photo?: string; customer: string; warehouse: string; zip: string;
  orderType: string; instructionType: string; destination: string; salesman: string; merchandiser: string; fee: string;
  packages: string; weight: string; volume: string; arrived: '是' | '否'; overseasTime: string;
};
type Filters = {
  instructionNo: string; waybill: string; shipment: string; reference: string; customer: string; salesman: string;
  merchandiser: string; warehouse: string; orderType: string; instructionType: string; arrived: string; dateFrom: string; dateTo: string;
};

const emptyFilters: Filters = { instructionNo: '', waybill: '', shipment: '', reference: '', customer: '', salesman: '', merchandiser: '', warehouse: '', orderType: '', instructionType: '', arrived: '', dateFrom: '', dateTo: '' };

// Local fixtures mirror the two reference screenshots and keep the static GitHub Pages build usable without an API.
const rawRows: Row[] = [
  { id: '1', tab: '待确认', waybill: 'USSZ202608160010', instructionNo: 'CI20260816212041676418', names: ['拍照5', '拍照4', '换单2'], created: '2026-08-16 21:20:41', updated: '2026-08-16 21:23:46', shipment: 'FBA19KBC16CK', reference: '-', status: '已处理', photo: '拍照5', customer: '郑志强', warehouse: 'FTW1', zip: '75241-7203', orderType: '亚马逊', instructionType: '放货', destination: 'MW003', salesman: '公司', merchandiser: '天惠', fee: '144', packages: '1', weight: '15', volume: '0.0358', arrived: '是', overseasTime: '2026-08-16 21:19:38' },
  { id: '2', tab: '待确认', waybill: 'USSZ202608160007', instructionNo: 'CI20260816204724154817', names: ['拍照4'], created: '2026-08-16 20:47:24', updated: '2026-08-17 12:14:31', shipment: 'FBA19ACB16CK', reference: '-', status: '待处理', customer: '郑志强', warehouse: '-', zip: '-', orderType: '-', instructionType: '不放货', destination: 'MW003', salesman: '公司', merchandiser: '天惠', fee: '48', packages: '1', weight: '15', volume: '0.0358', arrived: '是', overseasTime: '2026-08-16 18:49:46' },
  { id: '3', tab: '待确认', waybill: 'USSZ202608160008', instructionNo: 'CI20260816203326240194', names: ['拍照4'], created: '2026-08-16 20:33:26', updated: '2026-08-16 20:33:36', shipment: 'FBA19BBA16CK', reference: '-', status: '待处理', photo: '拍照4', customer: '郑志强', warehouse: 'RDU4', zip: '28303', orderType: '沃尔玛', instructionType: '放货', destination: 'MW003', salesman: '公司', merchandiser: '天惠', fee: '48', packages: '1', weight: '15', volume: '0.0358', arrived: '是', overseasTime: '2026-08-16 20:24:17' },
  { id: '4', tab: '待确认', waybill: 'USSZ202608160008', instructionNo: 'CI20260816202855497409', names: ['拍照5'], created: '2026-08-16 20:28:56', updated: '2026-08-16 20:29:03', shipment: 'FBA19BBA16CK', reference: '-', status: '待处理', photo: '拍照5', customer: '郑志强', warehouse: '-', zip: '-', orderType: '-', instructionType: '不放货', destination: 'MW003', salesman: '公司', merchandiser: '天惠', fee: '56', packages: '1', weight: '15', volume: '0.0358', arrived: '是', overseasTime: '2026-08-16 20:24:17' },
  { id: '5', tab: '待确认', waybill: 'USSZ202608160008', instructionNo: 'CI20260816202623348225', names: ['拦截照片8.16'], created: '2026-08-16 20:26:23', updated: '2026-08-16 20:39:01', shipment: 'FBA19ABA16CK', reference: '-', status: '已处理', photo: '拦截照片8.16', customer: '郑志强', warehouse: 'AVP3', zip: '18424-9492', orderType: '亚马逊', instructionType: '放货', destination: 'MW003', salesman: '公司', merchandiser: '天惠', fee: '3.05', packages: '1', weight: '15', volume: '0.0358', arrived: '是', overseasTime: '2026-08-16 20:24:17' },
  { id: '6', tab: '待确认', waybill: 'USSZ202608160007', instructionNo: 'CI20260816193802324353', names: ['拦截照片8.16'], created: '2026-08-16 19:38:02', updated: '2026-08-16 19:38:12', shipment: 'FBA19ACB16CK', reference: '-', status: '待处理', customer: '郑志强', warehouse: 'ABE3', zip: '18031-1536', orderType: '亚马逊', instructionType: '放货', destination: 'MW003', salesman: '公司', merchandiser: '天惠', fee: '3', packages: '1', weight: '15', volume: '0.0358', arrived: '是', overseasTime: '2026-08-16 18:49:46' },
  { id: '7', tab: '待确认', waybill: 'USSZ202608160007', instructionNo: 'CI20260816195234275586', names: ['拦截照片8.16'], created: '2026-08-16 19:52:34', updated: '2026-08-16 19:52:43', shipment: 'FBA19ACB16CK', reference: '-', status: '待处理', customer: '郑志强', warehouse: 'ABE3', zip: '18031-1536', orderType: '亚马逊', instructionType: '放货', destination: 'MW003', salesman: '公司', merchandiser: '天惠', fee: '3', packages: '1', weight: '15', volume: '0.0358', arrived: '是', overseasTime: '2026-08-16 18:49:46' },
  { id: '8', tab: '待确认', waybill: 'USSZ202608160006', instructionNo: 'CI20260816184242053121', names: ['拦截照片8.16'], created: '2026-08-16 18:42:42', updated: '2026-08-16 19:39:40', shipment: 'FBA19AAB16CK', reference: '-', status: '已处理', photo: '拦截照片8.16', customer: '郑志强', warehouse: 'RDU2', zip: '27577', orderType: '沃尔玛', instructionType: '放货', destination: 'MW003', salesman: '公司', merchandiser: '天惠', fee: '3', packages: '1', weight: '15', volume: '0.0358', arrived: '是', overseasTime: '2026-08-16 17:01:00' },
  { id: '9', tab: '待确认', waybill: 'USSZ202608160006', instructionNo: 'CI20260816184014763649', names: ['人工照片8.16'], created: '2026-08-16 18:41:04', updated: '2026-08-16 18:47:19', shipment: 'FBA19AAB16CK', reference: '-', status: '已处理', photo: '人工照片8.16', customer: '郑志强', warehouse: 'ABE3', zip: '18031-1536', orderType: '亚马逊', instructionType: '放货', destination: 'MW003', salesman: '公司', merchandiser: '天惠', fee: '48', packages: '1', weight: '15', volume: '0.0358', arrived: '是', overseasTime: '2026-08-16 17:01:00' },
  { id: '10', tab: '待确认', waybill: 'USSZ202608130006', instructionNo: 'CI202608161612771649', names: ['人工照片8.16'], created: '2026-08-16 16:16:12', updated: '2026-08-16 16:16:30', shipment: 'FBAFPXRWE32K', reference: 'ABCDEFG12345', status: '待处理', customer: '福奈测试客户', warehouse: 'ABE3', zip: '18031-1536', orderType: '亚马逊', instructionType: '放货', destination: 'MW003', salesman: '管理员', merchandiser: '天顺', fee: '48', packages: '1', weight: '15', volume: '0.0358', arrived: '是', overseasTime: '2026-08-13 16:18:01' },
  { id: '13', tab: '待确认', waybill: 'USSZ202608180013', instructionNo: 'CI20260818103028623540', names: ['拦截-退回仓库'], created: '2026-08-18 10:30:28', updated: '2026-08-18 10:31:12', shipment: 'FBA1INTERCEPT01', reference: 'INT-20260818-01', status: '待处理', customer: '郑志强', warehouse: 'FTW1', zip: '75241-7203', orderType: '亚马逊', instructionType: '拦截', destination: 'MW003', salesman: '公司', merchandiser: '天惠', fee: '8', packages: '2', weight: '28', volume: '0.0640', arrived: '是', overseasTime: '2026-08-18 10:15:06' },
  { id: '14', tab: '待确认', waybill: 'USSZ202608180014', instructionNo: 'CI20260818094516178205', names: ['销毁-整票销毁'], created: '2026-08-18 09:45:16', updated: '2026-08-18 09:48:36', shipment: 'FBA1DESTROY01', reference: 'DES-20260818-01', status: '待处理', customer: '福奈测试客户', warehouse: 'RDU4', zip: '28303', orderType: '沃尔玛', instructionType: '销毁', destination: 'MW003', salesman: '管理员', merchandiser: '天顺', fee: '5', packages: '1', weight: '15', volume: '0.0358', arrived: '是', overseasTime: '2026-08-18 09:30:00' },
  { id: '11', tab: '已确认', waybill: 'USSZ202608120002', instructionNo: 'CI202608151005320118', names: ['贴标'], created: '2026-08-15 10:05:32', updated: '2026-08-15 10:20:01', shipment: 'FBA1CONF16CK', reference: '-', status: '已处理', photo: '贴标', customer: '深圳天图', warehouse: 'FTW1', zip: '75241-7203', orderType: '亚马逊', instructionType: '放货', destination: 'MW003', salesman: '公司', merchandiser: '天惠', fee: '12', packages: '2', weight: '20', volume: '0.0480', arrived: '是', overseasTime: '2026-08-15 09:58:10' },
  { id: '12', tab: '已下单', waybill: 'USSZ202608110001', instructionNo: 'CI202608141024190021', names: ['换单'], created: '2026-08-14 10:24:19', updated: '2026-08-14 10:40:18', shipment: 'FBA1ORDER16CK', reference: '-', status: '已处理', customer: '郑志强', warehouse: 'RDU4', zip: '28303', orderType: '沃尔玛', instructionType: '放货', destination: 'MW003', salesman: '公司', merchandiser: '天惠', fee: '20', packages: '1', weight: '12', volume: '0.0250', arrived: '是', overseasTime: '2026-08-14 10:20:03' },
];

// 仅“放货”需要在创建页填写收件地址；其它指令类型不产生地址/货件标识字段。
const rows: Row[] = rawRows.map((row) => {
  if (row.instructionType === '放货') return row;
  return {
    ...row,
    shipment: '-',
    reference: '-',
    warehouse: '-',
    zip: '-',
    orderType: '-',
  };
});

const tabs: Array<{ key: Tab; count: number }> = [
  { key: '待确认', count: 1 }, { key: '已确认', count: 56 }, { key: '已下单', count: 30 }, { key: '转运中', count: 0 }, { key: '签收', count: 0 }, { key: '取消', count: 21 }, { key: '全部', count: 115 },
];
const inputClass = 'h-8 min-w-0 flex-1 rounded border border-[#dfe5ee] bg-white px-2 text-xs text-slate-700 outline-none placeholder:text-slate-300 focus:border-[#0759b6] focus:ring-1 focus:ring-[#0759b6]';

const getProcessingResult = (row: Row): ProcessingResult => {
  if (row.instructionType !== '\u62e6\u622a') return '\u5df2\u5904\u7406';
  if (row.processingResult) return row.processingResult;
  if (row.status === '\u5df2\u5904\u7406') return '\u62e6\u622a\u6210\u529f';
  if (row.status === '\u5df2\u53d6\u6d88') return '\u62e6\u622a\u5931\u8d25';
  return '\u5f85\u5904\u7406';
};

function Filter({ label, children }: { label: string; children: ReactNode }) {
  return <label className="flex min-w-0 items-center gap-2"><span className="shrink-0 text-xs font-semibold text-slate-700">{label}</span><span className="relative flex min-w-0 flex-1">{children}</span></label>;
}
function Select({ value, onChange, placeholder, options }: { value: string; onChange: (value: string) => void; placeholder: string; options: string[] }) {
  return <><select className={`${inputClass} appearance-none pr-7`} value={value} onChange={(event) => onChange(event.target.value)}><option value="">{placeholder}</option>{options.map((option) => <option key={option}>{option}</option>)}</select><ChevronDown className="pointer-events-none absolute right-2 top-2 h-3.5 w-3.5 text-slate-400" /></>;
}
function Photo({ label }: { label?: string }) {
  return label ? <div className="mx-auto flex h-12 w-[118px] items-center gap-2 overflow-hidden rounded border border-slate-200 bg-slate-50 px-2"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-slate-200 text-slate-500"><ImageIcon className="h-4 w-4" /></div><span className="line-clamp-2 text-left text-[11px] leading-4">{label}</span></div> : <span className="text-slate-400">-</span>;
}

export default function InstructionListPage({ addToast }: { addToast?: (text: string, type?: 'success' | 'info' | 'warning') => void }) {
  const [draft, setDraft] = useState<Filters>(emptyFilters);
  const [applied, setApplied] = useState<Filters>(emptyFilters);
  const [tab, setTab] = useState<Tab>('待确认');
  const [selected, setSelected] = useState<string[]>([]);
  const [expanded, setExpanded] = useState(true);
  const [data, setData] = useState(rows);
  const setFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const visible = useMemo(() => data.filter((row) => {
    const includes = (source: string, filter: string) => !filter || source.toLowerCase().includes(filter.trim().toLowerCase());
    const inDate = (!applied.dateFrom || row.created.slice(0, 10) >= applied.dateFrom) && (!applied.dateTo || row.created.slice(0, 10) <= applied.dateTo);
    return (tab === '全部' || row.tab === tab) && includes(row.instructionNo, applied.instructionNo) && includes(row.waybill, applied.waybill) && includes(row.shipment, applied.shipment) && includes(row.reference, applied.reference) && includes(row.customer, applied.customer) && includes(row.salesman, applied.salesman) && includes(row.merchandiser, applied.merchandiser) && includes(row.warehouse, applied.warehouse) && (!applied.orderType || row.orderType === applied.orderType) && (!applied.instructionType || row.instructionType === applied.instructionType) && (!applied.arrived || row.arrived === applied.arrived) && inDate;
  }), [applied, data, tab]);
  const allSelected = visible.length > 0 && visible.every((row) => selected.includes(row.id));
  const applyQuery = () => { setApplied(draft); setSelected([]); addToast?.('已按筛选条件查询', 'success'); };
  const reset = () => { setDraft(emptyFilters); setApplied(emptyFilters); setSelected([]); addToast?.('筛选条件已重置', 'info'); };
  const toggleAll = () => setSelected((current) => allSelected ? current.filter((id) => !visible.some((row) => row.id === id)) : Array.from(new Set([...current, ...visible.map((row) => row.id)])));
  const updateStatus = (status: Status, message: string) => {
    if (!selected.length) { addToast?.('请先勾选需要处理的指令', 'warning'); return; }
    setData((current) => current.map((row) => selected.includes(row.id) ? { ...row, status, updated: '2026-08-28 09:30:00' } : row));
    addToast?.(message.replace('{count}', String(selected.length)), 'success'); setSelected([]);
  };
  const exportRows = () => {
    const picked = selected.length ? visible.filter((row) => selected.includes(row.id)) : visible;
    const csv = [['运单号', '指令单号', '指令名称', '创建时间', '指令处理状态', '处理结果', '客户简称', '仓库代码', '下单类型', '指令单类型'].join(','), ...picked.map((row) => [row.waybill, row.instructionNo, row.names.join(' / '), row.created, row.status, getProcessingResult(row), row.customer, row.warehouse, row.orderType, row.instructionType].map((value) => `"${value.replace(/"/g, '""')}"`).join(','))].join('\n');
    const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })); link.download = '指令列表.csv'; link.click(); addToast?.(`已导出 ${picked.length} 条指令`, 'success');
  };

  return <main className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#f4f6fa] p-3 text-slate-700">
    <section className="shrink-0 rounded border border-[#e7ebf1] bg-white px-3 py-3 shadow-sm">
      <div className="grid grid-cols-1 gap-x-4 gap-y-2 xl:grid-cols-4">
        <Filter label="指令单号"><input className={inputClass} value={draft.instructionNo} onChange={(event) => setFilter('instructionNo', event.target.value)} placeholder="支持批量搜索" /></Filter>
        <Filter label="运单号"><input className={inputClass} value={draft.waybill} onChange={(event) => setFilter('waybill', event.target.value)} placeholder="支持批量搜索" /></Filter>
        <Filter label="Shipment ID"><input className={inputClass} value={draft.shipment} onChange={(event) => setFilter('shipment', event.target.value)} placeholder="支持批量搜索" /></Filter>
        <Filter label="Reference ID"><input className={inputClass} value={draft.reference} onChange={(event) => setFilter('reference', event.target.value)} placeholder="支持批量搜索" /></Filter>
        {expanded && <>
          <Filter label="客户简称"><input className={inputClass} value={draft.customer} onChange={(event) => setFilter('customer', event.target.value)} placeholder="客户简称" /></Filter>
          <Filter label="业务员"><Select value={draft.salesman} onChange={(value) => setFilter('salesman', value)} placeholder="请选择" options={['公司', '管理员']} /></Filter>
          <Filter label="跟单代表"><input className={inputClass} value={draft.merchandiser} onChange={(event) => setFilter('merchandiser', event.target.value)} placeholder="跟单代表" /></Filter>
          <Filter label="仓库代码"><input className={inputClass} value={draft.warehouse} onChange={(event) => setFilter('warehouse', event.target.value)} placeholder="仓库代码" /></Filter>
          <Filter label="下单类型"><Select value={draft.orderType} onChange={(value) => setFilter('orderType', value)} placeholder="下单类型" options={['亚马逊', '沃尔玛']} /></Filter>
          <Filter label="指令单类型"><Select value={draft.instructionType} onChange={(value) => setFilter('instructionType', value)} placeholder="指令单类型" options={['放货', '不放货', '拦截', '销毁']} /></Filter>
          <Filter label="入仓时间"><span className="flex h-8 min-w-0 flex-1 items-center gap-1 rounded border border-[#dfe5ee] px-2"><CalendarDays className="h-3.5 w-3.5 shrink-0 text-slate-300" /><input aria-label="开始日期" className="min-w-0 flex-1 text-center text-xs outline-none placeholder:text-slate-300" value={draft.dateFrom} onChange={(event) => setFilter('dateFrom', event.target.value)} placeholder="开始日期" /><span className="text-slate-400">-</span><input aria-label="结束日期" className="min-w-0 flex-1 text-center text-xs outline-none placeholder:text-slate-300" value={draft.dateTo} onChange={(event) => setFilter('dateTo', event.target.value)} placeholder="结束日期" /></span></Filter>
          <Filter label="是否到达海外仓"><Select value={draft.arrived} onChange={(value) => setFilter('arrived', value)} placeholder="是否到达海外仓" options={['是', '否']} /></Filter>
        </>}
      </div>
      <div className="mt-3 flex items-center gap-3"><button type="button" onClick={applyQuery} className="inline-flex h-8 w-[138px] items-center justify-center gap-1.5 rounded bg-[#0759b6] text-xs font-semibold text-white hover:bg-[#00479a]"><Search className="h-3.5 w-3.5" />查询</button><button type="button" onClick={reset} className="inline-flex h-8 w-[138px] items-center justify-center gap-1.5 rounded border border-[#dfe5ee] bg-white text-xs font-semibold text-slate-600"><RotateCcw className="h-3.5 w-3.5" />重置</button><button type="button" onClick={() => setExpanded((value) => !value)} className="inline-flex h-8 w-[138px] items-center justify-center gap-1.5 rounded border border-[#dfe5ee] bg-white text-xs font-semibold text-slate-600"><ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />{expanded ? '收起' : '展开'}</button></div>
    </section>
    <section className="mt-3 flex min-h-0 flex-1 flex-col overflow-hidden rounded border border-[#e7ebf1] bg-white shadow-sm">
      <div className="flex shrink-0 items-end gap-6 border-b border-[#dfe5ee] px-3 pt-2">{tabs.map((item) => <button key={item.key} type="button" onClick={() => { setTab(item.key); setSelected([]); }} className={`relative h-8 whitespace-nowrap text-xs font-medium ${tab === item.key ? 'text-[#0759b6]' : 'text-slate-600'}`}>{item.key}({item.count}){tab === item.key && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-[#0759b6]" />}</button>)}</div>
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-[#edf0f4] px-3"><div className="flex items-center gap-3"><button type="button" onClick={() => updateStatus('已取消', '已取消 {count} 条待确认指令')} className="h-7 rounded bg-[#0759b6] px-4 text-xs font-semibold text-white">取消下单</button><button type="button" onClick={() => updateStatus('已处理', '已确认 {count} 条指令')} className="h-7 rounded bg-[#0759b6] px-4 text-xs font-semibold text-white">已确认</button><button type="button" onClick={exportRows} className="inline-flex h-7 items-center gap-1 rounded border border-[#dfe5ee] bg-white px-4 text-xs font-semibold text-slate-600"><Download className="h-3.5 w-3.5" />导出</button><button type="button" onClick={() => addToast?.('当前列表暂无新的操作日志', 'info')} className="h-7 rounded border border-[#dfe5ee] bg-white px-4 text-xs font-semibold text-slate-600">查看日志</button></div><button type="button" aria-label="列表设置" onClick={() => addToast?.('列表支持横向滚动查看全部字段', 'info')} className="flex h-7 w-7 items-center justify-center rounded bg-[#0759b6] text-white"><Settings2 className="h-3.5 w-3.5" /></button></div>
      <div className="min-h-0 flex-1 overflow-auto"><table className="min-w-[2720px] table-fixed border-collapse text-[11px] text-slate-600"><thead className="sticky top-0 z-20 bg-[#f7f9fc]"><tr className="h-8"><th className="sticky left-0 z-30 w-10 border border-[#e5e9ef] bg-[#f7f9fc] text-center"><input aria-label="全选" type="checkbox" checked={allSelected} onChange={toggleAll} className="h-3.5 w-3.5 accent-[#0759b6]" /></th><th className="sticky left-10 z-30 w-40 border border-[#e5e9ef] bg-[#f7f9fc] text-center">运单号</th><th className="sticky left-[200px] z-30 w-40 border border-[#e5e9ef] bg-[#f7f9fc] text-center shadow-[5px_0_8px_-7px_rgba(15,23,42,0.55)]">指令单号</th>{['指令名称', '创建时间', '修改时间', 'Shipment ID', 'Reference ID', '指令处理状态', '\u5904\u7406\u7ed3\u679c', '指令操作图片', '客户简称', '仓库代码', '邮编', '下单类型', '指令单类型', '目的地', '业务员', '跟单员', '指令费用(CNY)', '发货件数', '重量', '方数', '是否到达海外仓', '入仓时间（海外仓）'].map((head) => <th key={head} className="w-32 border border-[#e5e9ef] px-2 text-center font-semibold">{head}</th>)}</tr></thead><tbody>{visible.map((row) => { const checked = selected.includes(row.id); return <tr key={row.id} className={`h-[80px] ${checked ? 'bg-[#f0f6ff]' : 'bg-white'}`}><td className="sticky left-0 z-10 border border-[#eef1f5] bg-inherit text-center"><input aria-label={`选择${row.instructionNo}`} type="checkbox" checked={checked} onChange={() => setSelected((current) => current.includes(row.id) ? current.filter((id) => id !== row.id) : [...current, row.id])} className="h-3.5 w-3.5 accent-[#0759b6]" /></td><td className="sticky left-10 z-10 border border-[#eef1f5] bg-inherit px-2 text-center whitespace-nowrap">{row.waybill}</td><td className="sticky left-[200px] z-10 border border-[#eef1f5] bg-inherit px-2 text-center text-[#3885d6] shadow-[5px_0_8px_-7px_rgba(15,23,42,0.55)]"><button type="button" onClick={() => addToast?.(`已打开指令单 ${row.instructionNo}`, 'info')} className="whitespace-nowrap hover:underline">{row.instructionNo}</button></td><td className="border border-[#eef1f5] px-2 text-center leading-5">{row.names.map((name) => <div key={name}>{name}</div>)}</td><td className="border border-[#eef1f5] px-2 text-center whitespace-nowrap">{row.created}</td><td className="border border-[#eef1f5] px-2 text-center whitespace-nowrap">{row.updated}</td><td className="border border-[#eef1f5] px-2 text-center whitespace-nowrap">{row.shipment}</td><td className="border border-[#eef1f5] px-2 text-center">{row.reference}</td><td className={`border border-[#eef1f5] px-2 text-center ${row.status === '待处理' ? 'text-amber-600' : row.status === '已取消' ? 'text-slate-400' : ''}`}>{row.status}</td><td className="border border-[#eef1f5] px-2 text-center">{getProcessingResult(row)}</td><td className="border border-[#eef1f5] px-2 text-center"><Photo label={row.photo} /></td><td className="border border-[#eef1f5] px-2 text-center whitespace-nowrap">{row.customer}</td><td className="border border-[#eef1f5] px-2 text-center">{row.warehouse}</td><td className="border border-[#eef1f5] px-2 text-center whitespace-nowrap">{row.zip}</td><td className="border border-[#eef1f5] px-2 text-center">{row.orderType}</td><td className="border border-[#eef1f5] px-2 text-center">{row.instructionType}</td><td className="border border-[#eef1f5] px-2 text-center">{row.destination}</td><td className="border border-[#eef1f5] px-2 text-center">{row.salesman}</td><td className="border border-[#eef1f5] px-2 text-center">{row.merchandiser}</td><td className="border border-[#eef1f5] px-2 text-center">{row.fee}</td><td className="border border-[#eef1f5] px-2 text-center">{row.packages}</td><td className="border border-[#eef1f5] px-2 text-center">{row.weight}</td><td className="border border-[#eef1f5] px-2 text-center">{row.volume}</td><td className="border border-[#eef1f5] px-2 text-center">{row.arrived}</td><td className="border border-[#eef1f5] px-2 text-center whitespace-nowrap">{row.overseasTime}</td></tr>; })}{visible.length === 0 && <tr><td colSpan={25} className="h-48 border border-[#eef1f5] text-center text-slate-400">暂无符合筛选条件的指令数据</td></tr>}</tbody></table></div>
      <footer className="flex h-10 shrink-0 items-center justify-end gap-4 border-t border-[#edf0f4] px-4 text-xs text-slate-500"><span>共 {visible.length} 条</span><select aria-label="每页条数" className="h-6 rounded border border-slate-200 bg-white px-2 text-xs"><option>100条/页</option></select><button type="button">‹</button><span className="text-[#0759b6]">1</span><button type="button">›</button><span>前往</span><input aria-label="页码" className="h-6 w-9 rounded border border-slate-200 text-center text-xs" value="1" readOnly /><span>页</span></footer>
    </section>
  </main>;
}
