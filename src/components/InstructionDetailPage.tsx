import { FileText } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { InstructionListRow } from './instructionListTypes';
import type { InstructionFeeRow } from './instructionDetailData';
import { getCargoTransferNumbers, getInstructionFeeTotal, loadInstructionDetail, saveInstructionDetail, updateCargoTransferNumbers } from './instructionDetailStore';
import type { InstructionAttachment, InstructionDetailState, InstructionWaybillFields } from './instructionDetailStore';
import CatalogFeeDrawer from './CatalogFeeDrawer';
import type { CatalogFeeDrawerRow } from './CatalogFeeDrawer';
import OperationInstructionTable from './OperationInstructionTable';
import { getInventoryFeeCatalog, loadOverseasInventory } from './overseasStorageInventoryData';
import InstructionWaybillInfo from './InstructionWaybillInfo';
import InstructionCargoTransfers from './InstructionCargoTransfers';
import InstructionFeeEditDialog from './InstructionFeeEditDialog';
import { instructionManagementCatalog } from './instructionManagementCatalog';
import { getInstructionWaybillContext } from './instructionWaybillContext';
import { getInstructionCargoRows } from './instructionCargoRows';
import InstructionTrackingTimeline from './InstructionTrackingTimeline';
import { getInstructionTrackingEvents, isInstructionTrackingEvent, type InstructionTrackingType } from './instructionTracking';
import countryOptions from './niuKuTemplateOptions.json';
import './InstructionDetailPage.css';

const tabs = ['货箱信息', '运踪信息', '费用信息', '其它信息'] as const;
const attachmentTypes = ['POD', 'ISA', '报关资料', '底单', '其他', '其它', '税金单', '递延资料', '提单'];
type DetailTab = typeof tabs[number];
type NestedModal = 'fee' | 'feeEdit' | 'attachment' | 'deleteAttachment' | 'tracking' | 'processing' | null;
const trackingTypes: InstructionTrackingType[] = ['正常运踪', '异常运踪'];
const nowText = () => new Date().toLocaleString('sv-SE', { hour12: false });
const uniqueId = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const show = (value: unknown) => value == null || !String(value).trim() || String(value).trim() === '-' ? '—' : String(value);
const amount = (value: number | null | undefined) => typeof value === 'number' && Number.isFinite(value) ? value.toFixed(2) : '—';
const statusClass = (value: string) => /失败|驳回/.test(value) ? 'is-failed' : /取消/.test(value) ? 'is-canceled' : /完成|成功/.test(value) ? 'is-success' : /待/.test(value) ? 'is-pending' : 'is-processing';

function DetailField({ label, value, highlight = false }: { label: string; value: ReactNode; highlight?: boolean }) {
  return <div className="mc-intercept-detail-field"><dt>{label}</dt><dd className={highlight ? 'mc-intercept-detail-highlight' : undefined}>{value || '—'}</dd></div>;
}

type FeeDraft = CatalogFeeDrawerRow & { billingTime: string; exchangeRate: string } & Pick<InstructionFeeRow, 'instructionRemark' | 'images' | 'status'>;
const displayCurrency = (currency: string) => ({ CNY: '人民币', USD: '美元', EUR: '欧元', GBP: '英镑' }[currency] || currency);
const currencyCode = (currency: string) => ({ '人民币': 'CNY', '美元': 'USD', '欧元': 'EUR', '英镑': 'GBP' }[currency] || currency);

function emptyFee(): FeeDraft {
  return { id: uniqueId(), code: '', billingTime: nowText(), name: '', type: '', unit: '', exchangeRate: '1', unitPrice: '', quantity: '1', currency: '', remark: '', instructionRemark: '', images: [], status: '待处理' };
}

function feeDraft(fee: InstructionFeeRow): FeeDraft {
  return { id: fee.id, code: getInventoryFeeCatalog().find((item) => item.name === fee.name)?.code || '', billingTime: fee.billingTime === '—' ? '' : fee.billingTime, name: fee.name, type: fee.type,
    unit: fee.unit,
    exchangeRate: Number.isFinite(fee.exchangeRate) ? String(fee.exchangeRate) : '', unitPrice: Number.isFinite(fee.unitPrice) ? String(fee.unitPrice) : '',
    quantity: Number.isFinite(fee.quantity) ? String(fee.quantity) : '', currency: displayCurrency(fee.currency), remark: fee.remark,
    instructionRemark: fee.instructionRemark, images: fee.images, status: fee.status };
}

export default function InstructionDetailPage({ row, onClose, onUpdate }: {
  row: InstructionListRow; onClose: () => void; onUpdate?: (patch: Partial<InstructionListRow>) => void;
}) {
  const canEdit = row.tab === '待确认';
  const displayStatus = row.status === '已处理' ? '已完成' : row.status;
  const [state, setState] = useState<InstructionDetailState>(() => loadInstructionDetail(row));
  const inventory = useMemo(loadOverseasInventory, []);
  const cargoRows = useMemo(()=>getInstructionCargoRows(row,inventory),[row,inventory]);
  const waybillContext = useMemo(() => getInstructionWaybillContext(row, inventory), [row, inventory]);
  const [waybillDraft, setWaybillDraft] = useState<InstructionWaybillFields>(() => ({ ...(state.waybillInfo || waybillContext.fields) }));
  const [waybillError, setWaybillError] = useState('');
  const [waybillSaved, setWaybillSaved] = useState(false);
  const requiredWaybill = waybillContext.summary.waybillType === 'FBA' && row.instructionType === '放货';
  const savedWaybill = state.waybillInfo || waybillContext.fields;
  const waybillDirty = (Object.keys(waybillDraft) as (keyof InstructionWaybillFields)[]).some((key) => waybillDraft[key] !== savedWaybill[key]);
  const [tab, setTab] = useState<DetailTab>('货箱信息');
  const [nested, setNested] = useState<NestedModal>(null);
  const [error, setError] = useState('');
  const [feeRows, setFeeRows] = useState<FeeDraft[]>([]);
  const feeCatalog = useMemo(getInventoryFeeCatalog, []);
  const editedFeeCost=useMemo(()=>{
    const fee=feeRows[0];if(!fee)return undefined;
    const original=instructionManagementCatalog.find(item=>item.code===fee.code||item.name===fee.name);
    try{const saved=JSON.parse(localStorage.getItem('tiantu-instruction-management-reference-v1')||'null');const item=saved?.rows?.find((item:{code:string;name:string})=>item.code===fee.code||item.name===fee.name);if(typeof item?.cost==='number'&&Number.isFinite(item.cost)&&item.cost>=0)return item.cost;}catch{/* Use the original cost when no saved dictionary is available. */}
    return original?.cost;
  },[feeRows]);
  const [feeFocusId, setFeeFocusId] = useState<string | null>(null);
  const [selectedOperations,setSelectedOperations] = useState<string[]>([]);
  const [processingStatus,setProcessingStatus] = useState<'待处理'|'已处理'>('已处理');
  const doneOperations=state.fees.filter(fee=>['已处理','已完成'].includes(fee.status||row.status)).length;
  const trackingEvents = useMemo(() => getInstructionTrackingEvents(row, state.trackingEvents), [row, state.trackingEvents]);
  const [trackingForm, setTrackingForm] = useState<{ occurredAt: string; description: string; country: string; type: InstructionTrackingType }>({ occurredAt: '', description: '', country: '', type: '正常运踪' });
  const [editingAttachment, setEditingAttachment] = useState<InstructionAttachment | null>(null);
  const [deletingAttachment, setDeletingAttachment] = useState<InstructionAttachment | null>(null);
  const [attachmentForm, setAttachmentForm] = useState({ fileName: '', fileSize: '', type: '其他', customerVisible: '可见' as '可见' | '不可见', dataUrl: '' });
  const [readingFile, setReadingFile] = useState(false);
  const portalRef = useRef<HTMLDivElement>(null);
  const fileReadId = useRef(0);
  const callbacks = useRef({ onClose });
  callbacks.current = { onClose };
  const id = useId().replace(/:/g, '');
  const titleId = `instructionDetailTitle-${id}`;
  const labelId = (name: DetailTab) => `instructionDetailTab-${id}-${tabs.indexOf(name)}`;
  const panelId = (name: DetailTab) => `instructionDetailPanel-${id}-${tabs.indexOf(name)}`;

  const closeNested = () => { fileReadId.current += 1; setReadingFile(false); setNested(null); setError(''); };
  useEffect(() => {
    if (!canEdit && (nested === 'fee'||nested==='feeEdit')) { setNested(null); setError(''); }
  }, [canEdit, nested]);
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; fileReadId.current += 1; };
  }, []);
  useEffect(() => {
    const origin = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialogs = portalRef.current?.querySelectorAll('[role="dialog"]') as NodeListOf<HTMLElement> | undefined;
    const top = dialogs?.[dialogs.length - 1];
    const focusables = () => Array.from((top?.querySelectorAll('button:not([disabled]), input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex="0"]') || []) as NodeListOf<HTMLElement>).filter((element) => element.getClientRects().length > 0);
    const preferred = nested ? top?.querySelector<HTMLElement>('textarea, input:not([type="file"]), select') : null;
    (preferred || focusables()[0] || top)?.focus();
    const handleKey = (event: globalThis.KeyboardEvent) => {
      if (nested === 'fee' || document.querySelector('.operation-instruction-preview')) return;
      if (event.key === 'Escape') {
        event.preventDefault(); event.stopPropagation();
        if (nested) { fileReadId.current += 1; setReadingFile(false); setNested(null); setError(''); }
        else callbacks.current.onClose();
      } else if (event.key === 'Tab') {
        const items = focusables(); const first = items[0]; const last = items[items.length - 1];
        if (!first) { event.preventDefault(); top?.focus(); }
        else if (event.shiftKey && (document.activeElement === first || !top?.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && (document.activeElement === last || !top?.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', handleKey, true);
    return () => { document.removeEventListener('keydown', handleKey, true); if (origin?.isConnected) origin.focus({preventScroll:true}); };
  }, [nested]);

  function persist(next: InstructionDetailState): boolean {
    const updated = nowText();
    const saved = { ...next, updatedAt: updated };
    try {
      saveInstructionDetail(row, saved);
      setState(saved);
      onUpdate?.({ updated, customerNote: saved.customerNote, internalRemark: saved.internalRemark, failureReason: saved.failureReason,
        boxSelectionMode:saved.boxSelectionMode||row.boxSelectionMode||'随机',
        ...(saved.cargoTransferNumbers === undefined ? {} : {transferNumbers:getCargoTransferNumbers(saved.cargoTransferNumbers,saved.cargoTransferOrder)}),
        ...(saved.waybillInfo ? { shipment: saved.waybillInfo.shipmentId || '-', reference: saved.waybillInfo.referenceId || '-',
          scheduledAt: saved.waybillInfo.scheduledAt, waybillRemark: saved.waybillInfo.remark } : {}),
        ...(saved.feesEdited ? { fee: String(getInstructionFeeTotal(saved.fees)) } : {}) });
      setError('');
      return true;
    } catch { setError('保存失败，本地存储空间不足或不可用，请保留当前内容后重试。'); return false; }
  }

  function saveWaybill() {
    if (!canEdit) return;
    const fields = { shipmentId: waybillDraft.shipmentId.trim(), referenceId: waybillDraft.referenceId.trim(),
      scheduledAt: waybillDraft.scheduledAt.trim(), remark: waybillDraft.remark.trim() };
    if (requiredWaybill && (!fields.shipmentId || !fields.referenceId || !fields.scheduledAt)) {
      setWaybillError('请填写 ShipmentID、ReferenceID 和预约发货时间。'); return;
    }
    if (persist({ ...state, waybillInfo: fields })) {
      setWaybillDraft(fields); setWaybillError(''); setWaybillSaved(true);
    } else {
      setError(''); setWaybillError('保存失败，本地存储空间不足或不可用，请保留当前内容后重试。');
    }
  }


  function cancelWaybill() {
    setWaybillDraft({ ...(state.waybillInfo || waybillContext.fields) });
    setWaybillError(''); setWaybillSaved(false);
  }

  function openFee(focusId: string | null = null) {
    if (!canEdit) return;
    const editing = state.fees.find((fee) => fee.id === focusId);
    setFeeRows(editing ? [feeDraft(editing)] : [emptyFee()]);
    setFeeFocusId(focusId); setError(''); setNested(focusId?'feeEdit':'fee');
  }
  function saveProcessing() {
    const selected=new Set(selectedOperations);
    if(!state.fees.some(fee=>selected.has(fee.id))){setError('请先勾选需要处理的操作指令');return;}
    if(persist({...state,fees:state.fees.map(fee=>selected.has(fee.id)?{...fee,status:processingStatus}:fee)})){
      setSelectedOperations([]);closeNested();
    }
  }
  function selectFee(id: string, code: string) {
    if (!canEdit) return;
    setError('');
    const selected = feeCatalog.find((fee) => fee.code === code);
    setFeeRows((current) => current.map((fee) => fee.id !== id ? fee : {
      ...fee, code, name: selected?.name || '', type: selected?.type || '', unit: selected?.unit || '',
      unitPrice: selected ? String(selected.unitPrice) : '', currency: selected?.currency || '',
      exchangeRate: selected ? String(selected.exchangeRate) : '1',
      instructionRemark: fee.instructionRemark || selected?.instructionRemark || '',
    }));
  }
  function updateFee(id: string, field: 'unitPrice' | 'quantity' | 'remark', value: string) {
    if (!canEdit) return;
    setError('');
    setFeeRows((current) => current.map((fee) => fee.id === id ? { ...fee, [field]: value } : fee));
  }
  function saveFees() {
    if (!canEdit) return;
    if (!feeRows.length) { setError('请添加至少一条费用'); return; }
    const invalid = feeRows.find((fee) => !fee.name.trim() || !fee.unit.trim() || !fee.currency
      || !fee.exchangeRate.trim() || !Number.isFinite(Number(fee.exchangeRate)) || Number(fee.exchangeRate) <= 0
      || !String(fee.unitPrice).trim() || !Number.isFinite(Number(fee.unitPrice)) || Number(fee.unitPrice) < 0
      || !String(fee.quantity).trim() || !Number.isFinite(Number(fee.quantity)) || Number(fee.quantity) <= 0
      || !Number.isFinite(Number(fee.unitPrice) * Number(fee.quantity) * Number(fee.exchangeRate) * 100));
    if (invalid) { setError('请选择费用名称，单价须为大于或等于0的有效数字，数量须大于0。'); return; }
    const time = nowText();
    const fees: InstructionFeeRow[] = feeRows.map((fee) => {
      const previous = state.fees.find((item) => item.id === fee.id);
      const unitPrice = Number(fee.unitPrice); const quantity = Number(fee.quantity); const exchangeRate = Number(fee.exchangeRate);
      const originalAmount = Math.round(unitPrice * quantity * 100) / 100;
      return { id: fee.id, billingTime: fee.billingTime.trim() || time, name: fee.name.trim(), type: fee.type.trim() || '其他', unit: fee.unit,
        exchangeRate, unitPrice, quantity, currency: currencyCode(fee.currency),
        originalAmount, rmbAmount: Math.round(unitPrice * quantity * exchangeRate * 100) / 100,
        remark: fee.remark.trim(), addedAt: previous?.addedAt && previous.addedAt !== '—' ? previous.addedAt : time,
        addedBy: previous?.addedBy && previous.addedBy !== '—' ? previous.addedBy : '当前用户',
        instructionRemark: fee.instructionRemark || '', images: previous?.images || fee.images || [],
        status: previous?.status || fee.status || (previous ? row.status : '待处理') };
    });
    const merged = feeFocusId
      ? [...state.fees.map((fee) => fee.id === feeFocusId ? { ...fees[0], id: feeFocusId } : fee), ...fees.slice(1)]
      : [...state.fees, ...fees];
    if (persist({ ...state, fees: merged, feesEdited: true })) closeNested();
  }
  function removeFee(feeId: string) {
    if (!canEdit) return;
    const fee = state.fees.find((item) => item.id === feeId);
    if (fee && window.confirm(`确定删除费用“${fee.name}”吗？`)) {
      persist({ ...state, fees: state.fees.filter((item) => item.id !== feeId), feesEdited: true });
    }
  }
  function openAttachment(attachment?: InstructionAttachment) {
    setEditingAttachment(attachment || null);
    setAttachmentForm(attachment ? { fileName: attachment.name, fileSize: attachment.fileSize, type: attachment.type, customerVisible: attachment.customerVisible, dataUrl: attachment.dataUrl }
      : { fileName: '', fileSize: '', type: '其他', customerVisible: '可见', dataUrl: '' });
    setError(''); setNested('attachment');
  }
  function openTracking() {
    setTrackingForm({ occurredAt: '', description: '', country: '', type: '正常运踪' });
    setError(''); setNested('tracking');
  }
  function saveTracking() {
    if (!trackingForm.description.trim()) { setError('请输入节点描述。'); return; }
    const event = { id: uniqueId(), occurredAt: trackingForm.occurredAt.trim() || nowText().replace(' ', 'T'), operator: '当前用户',
      status: trackingForm.description.trim(), type: trackingForm.type, country: trackingForm.country };
    if (!isInstructionTrackingEvent(event)) { setError('请选择有效的运踪类型和时间。'); return; }
    if (persist({ ...state, trackingEvents: [...(state.trackingEvents || []), event] })) closeNested();
  }
  function readAttachment(file?: File) {
    if (!file) return;
    const readId = ++fileReadId.current;
    if (file.size > 3 * 1024 * 1024) { setReadingFile(false); setError('附件大小不能超过3MB'); return; }
    setReadingFile(true); setError('');
    const reader = new FileReader();
    reader.onload = () => {
      if (readId !== fileReadId.current) return;
      setAttachmentForm((form) => ({ ...form, fileName: file.name, fileSize: file.size >= 1024 * 1024 ? `${(file.size / 1024 / 1024).toFixed(1)}MB` : `${Math.max(1, Math.ceil(file.size / 1024))}KB`, dataUrl: String(reader.result) }));
      setReadingFile(false);
    };
    reader.onerror = () => { if (readId === fileReadId.current) { setError('文件读取失败，请重新选择附件'); setReadingFile(false); } };
    reader.readAsDataURL(file);
  }
  function saveAttachment() {
    if (readingFile) { setError('附件正在读取，请稍候'); return; }
    if (!attachmentForm.fileName.trim() || !attachmentForm.dataUrl.startsWith('data:')) { setError('请先选择附件文件'); return; }
    const attachment: InstructionAttachment = { id: editingAttachment?.id || uniqueId(), name: attachmentForm.fileName.trim(), type: attachmentForm.type,
      customerVisible: attachmentForm.customerVisible, fileSize: attachmentForm.fileSize, dataUrl: attachmentForm.dataUrl,
      uploadedBy: editingAttachment?.uploadedBy || '当前用户', uploadedAt: editingAttachment?.uploadedAt || nowText() };
    const attachments = editingAttachment ? state.attachments.map((item) => item.id === attachment.id ? attachment : item) : [...state.attachments, attachment];
    if (persist({ ...state, attachments })) closeNested();
  }
  function downloadAttachment(attachment: InstructionAttachment) {
    if (!attachment.dataUrl.startsWith('data:')) { setError('附件文件不可用'); return; }
    const link = document.createElement('a'); link.href = attachment.dataUrl; link.download = attachment.name; document.body.appendChild(link); link.click(); link.remove();
  }
  function tabKey(event: KeyboardEvent<HTMLButtonElement>, name: DetailTab) {
    let next = tabs.indexOf(name);
    if (event.key === 'ArrowRight') next = (next + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') next = (next + tabs.length - 1) % tabs.length;
    else if (event.key === 'Home') next = 0; else if (event.key === 'End') next = tabs.length - 1; else return;
    event.preventDefault(); setTab(tabs[next]); document.getElementById(labelId(tabs[next]))?.focus();
  }
  const totalRmb = getInstructionFeeTotal(state.fees);

  return createPortal(<div ref={portalRef} className="instruction-detail-portal">
    <div className="mc-intercept-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget && !nested) { event.preventDefault(); onClose(); } }}>
      <aside className="mc-intercept-drawer instruction-detail-drawer" role="dialog" aria-modal="true" aria-hidden={nested ? true : undefined} aria-labelledby={titleId} tabIndex={-1}>
        <header className="mc-intercept-drawer-header">
          <div><h2 id={titleId}>指令详情 · {row.instructionNo}</h2><p><span className={`mc-intercept-status ${statusClass(displayStatus)}`}>{displayStatus}</span> <span>{row.waybill}</span></p></div>
          <button className="mc-intercept-close" type="button" aria-label="关闭指令详情" onClick={onClose}>×</button>
        </header>
        <div className="mc-intercept-detail-content">
          {row.tab === '驳回' && <section className="mb-3 rounded border border-rose-200 bg-rose-50 p-4"><h3 className="mb-2 text-sm font-semibold text-rose-800">驳回原因</h3><p className="whitespace-pre-wrap break-words text-sm text-rose-700">{row.rejectionReason || '—'}</p></section>}
          <InstructionWaybillInfo summary={{ ...waybillContext.summary, customerNote: state.customerNote }} value={canEdit ? waybillDraft : savedWaybill} required={requiredWaybill} readOnly={!canEdit}
            onChange={(patch) => { if (!canEdit) return; setWaybillDraft((current) => ({ ...current, ...patch })); setWaybillError(''); setWaybillSaved(false); }}
            onCancel={cancelWaybill} onSave={saveWaybill} error={waybillError} saved={waybillSaved} dirty={waybillDirty} />
          {row.instructionType === '自提' && <section className="mc-intercept-detail-card"><div className="mc-intercept-basic-grid"><DetailField label="预计提货时间" value={show(row.expectedPickupTime)} /><DetailField label="提货联系人" value={show(row.pickupContact)} /><DetailField label="联系电话" value={show(row.pickupPhone)} /></div></section>}
          <div className="mc-intercept-detail-tabs" role="tablist" aria-label="指令详情内容">
            {tabs.map((name) => <button key={name} id={labelId(name)} type="button" role="tab" aria-selected={tab === name} aria-controls={panelId(name)} tabIndex={tab === name ? 0 : -1} onKeyDown={(event) => tabKey(event, name)} onClick={() => setTab(name)} className={`mc-intercept-detail-tab ${tab === name ? 'active' : ''}`}>{name}{tab === name && <span className="mc-intercept-detail-tab-indicator" />}</button>)}
          </div>
          {tab === '货箱信息' && <section id={panelId('货箱信息')} role="tabpanel" aria-labelledby={labelId('货箱信息')} className="mc-intercept-detail-card">
            <InstructionCargoTransfers rows={cargoRows} numbers={state.cargoTransferNumbers} onSave={(numbers,editedIds)=>persist(updateCargoTransferNumbers(state,numbers,editedIds))}/>
          </section>}
          {tab === '运踪信息' && <section id={panelId('运踪信息')} role="tabpanel" aria-labelledby={labelId('运踪信息')} className="mc-intercept-detail-card">
            <h3 className="mc-intercept-detail-card-title">运踪节点信息</h3>
            <InstructionTrackingTimeline events={trackingEvents} onAdd={openTracking} />
          </section>}
          {tab === '费用信息' && <section id={panelId('费用信息')} role="tabpanel" aria-labelledby={labelId('费用信息')} className="mc-intercept-detail-card">
            <div className="mc-intercept-detail-toolbar"><h3 className="mc-intercept-detail-card-title">操作指令</h3>{canEdit && <button type="button" className="mc-btn primary" onClick={() => openFee()}>新增费用</button>}</div>
            <div className="instruction-processing-toolbar"><span className="instruction-processing-count">待处理 {state.fees.length-doneOperations} 项，已处理 {doneOperations} 项</span><button type="button" className="mc-btn primary" disabled={!state.fees.some(fee=>selectedOperations.includes(fee.id))} onClick={()=>{setProcessingStatus('已处理');setError('');setNested('processing');}}>处理</button><span>已选 {state.fees.filter(fee=>selectedOperations.includes(fee.id)).length} 项</span></div>
            <OperationInstructionTable rows={state.fees.map((fee) => ({ ...fee, feeRemark: fee.remark, status: fee.status || row.status }))}
              selectedIds={selectedOperations} onSelectionChange={setSelectedOperations}
              onEdit={canEdit ? openFee : undefined} onRemove={canEdit ? removeFee : undefined} />
            <div className="oi-fee-summary"><span>共 {state.fees.length} 条</span><strong>人民币合计 {amount(totalRmb)}</strong></div>
          </section>}
          {tab === '其它信息' && <section id={panelId('其它信息')} role="tabpanel" aria-labelledby={labelId('其它信息')} className="m-[14px] rounded-md bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-bold text-slate-950">其它信息</h3><button type="button" onClick={() => openAttachment()} className="rounded border border-slate-300 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">上传附件</button></div>
            <div className="overflow-x-auto border border-slate-200"><table className="w-full min-w-[920px] table-fixed border-collapse text-[11px]"><thead className="bg-slate-50 text-slate-600"><tr>{['附件名称', '附件类型', '客户可见', '文件大小', '上传人', '上传时间', '操作'].map((head) => <th key={head} className="border border-slate-200 px-3 py-2 text-left font-semibold">{head}</th>)}</tr></thead>
              <tbody>{state.attachments.length ? state.attachments.map((attachment) => <tr key={attachment.id} className="h-10 text-slate-700 odd:bg-white even:bg-slate-50/70"><td className="border border-slate-200 px-3">{attachment.name}</td><td className="border border-slate-200 px-3">{attachment.type}</td><td className="border border-slate-200 px-3">{attachment.customerVisible}</td><td className="border border-slate-200 px-3">{attachment.fileSize}</td><td className="border border-slate-200 px-3">{attachment.uploadedBy}</td><td className="border border-slate-200 px-3 font-mono text-slate-500">{attachment.uploadedAt}</td><td className="border border-slate-200 px-3"><button type="button" onClick={() => openAttachment(attachment)} className="mr-3 font-bold text-[#004bb1] hover:underline">编辑</button><button type="button" onClick={() => downloadAttachment(attachment)} className="mr-3 font-bold text-[#004bb1] hover:underline">下载</button><button type="button" onClick={() => { setDeletingAttachment(attachment); setError(''); setNested('deleteAttachment'); }} className="font-bold text-red-500 hover:underline">删除</button></td></tr>) : <tr><td colSpan={7} className="h-24 border border-slate-200 text-center text-slate-300"><FileText className="mx-auto mb-2 h-8 w-8 text-slate-200" />暂无附件</td></tr>}</tbody>
            </table></div>
          </section>}
        </div>
        <footer className="mc-intercept-drawer-footer"><button className="mc-btn" type="button" onClick={onClose}>关闭</button></footer>
      </aside>
    </div>

    {canEdit && nested === 'fee' && <CatalogFeeDrawer rows={feeRows} catalogRows={feeCatalog} focusedRowId={feeFocusId} error={error} onAdd={() => { if (!canEdit) return; setError(''); setFeeRows((current) => [...current, emptyFee()]); }} onSelect={selectFee} onUpdate={updateFee} onRemove={(feeId) => { if (!canEdit) return; setError(''); setFeeRows((current) => current.filter((fee) => fee.id !== feeId)); }} onCancel={closeNested} onConfirm={saveFees} />}
    {canEdit&&nested==='feeEdit'&&feeRows[0]&&<InstructionFeeEditDialog row={feeRows[0]} cost={editedFeeCost} error={error} onUpdate={(field,value)=>updateFee(feeRows[0].id,field,value)} onCancel={closeNested} onConfirm={saveFees}/>}

    {nested === 'attachment' && <div className="mc-intercept-overlay mc-intercept-feedback-overlay mc-intercept-attachment-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) closeNested(); }}><section className="mc-intercept-attachment-modal" role="dialog" aria-modal="true" aria-labelledby={`instructionAttachmentTitle-${id}`} tabIndex={-1}>
      <header><h2 id={`instructionAttachmentTitle-${id}`}>{editingAttachment ? '编辑附件' : '上传附件'}</h2><button type="button" onClick={closeNested} className="mc-intercept-close" aria-label="关闭附件弹窗">×</button></header>
      <div className="space-y-5 px-10 py-6 text-xs text-slate-700"><div className="flex items-start gap-3"><span className="w-24 shrink-0 pt-2 text-right font-bold text-slate-900"><span className="text-red-500">* </span>文件附件：</span><div className="min-w-0 flex-1"><label className="inline-flex h-8 cursor-pointer items-center rounded bg-[#004bb1] px-5 text-xs font-bold text-white hover:bg-[#003b91]">点击上传<input type="file" className="hidden" aria-label="文件附件" onChange={(event) => { readAttachment(event.target.files?.[0]); event.currentTarget.value = ''; }} /></label><div className="mt-3 text-[11px] text-slate-500">文件大小不超过3MB</div><div className="mt-2 text-[11px] font-semibold text-red-500">若为报关件资料，文件类型请选择“报关资料”</div>{attachmentForm.fileName && <div className="mt-3 flex items-center gap-2 rounded border border-slate-200 bg-slate-50 px-3 py-2"><span className="min-w-0 flex-1 truncate">{attachmentForm.fileName}</span><span className="text-slate-400">{attachmentForm.fileSize || '-'}</span><button type="button" onClick={() => { fileReadId.current += 1; setReadingFile(false); setAttachmentForm((form) => ({ ...form, fileName: '', fileSize: '', dataUrl: '' })); }} className="font-bold text-red-500 hover:underline">删除</button></div>}</div></div>
        <label className="flex items-center gap-3"><span className="w-24 shrink-0 text-right font-bold text-slate-900"><span className="text-red-500">* </span>文件类型：</span><select className="h-8 min-w-0 flex-1 rounded border border-slate-300 bg-white px-2 text-xs text-slate-700 outline-none focus:border-[#004bb1] focus:ring-1 focus:ring-[#004bb1]" value={attachmentForm.type} onChange={(event) => setAttachmentForm((form) => ({ ...form, type: event.target.value }))}>{attachmentTypes.map((type) => <option key={type}>{type}</option>)}</select></label>
        <div className="flex items-center gap-3"><span className="w-24 shrink-0 text-right font-bold text-slate-900"><span className="text-red-500">* </span>客户是否可见：</span>{(['不可见', '可见'] as const).map((option) => <label key={option} className="flex items-center gap-1.5"><input type="radio" name={`instructionAttachmentVisible-${id}`} checked={attachmentForm.customerVisible === option} onChange={() => setAttachmentForm((form) => ({ ...form, customerVisible: option }))} className="h-3.5 w-3.5 text-blue-600" /><span>{option}</span></label>)}</div>
      </div><footer><button type="button" onClick={closeNested} className="rounded border border-slate-300 bg-white px-7 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">取消</button><button type="button" disabled={readingFile} onClick={saveAttachment} className="rounded bg-blue-600 px-7 py-1.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50">{readingFile ? '读取中' : '确定'}</button></footer>
    </section></div>}

    {nested === 'deleteAttachment' && deletingAttachment && <div className="mc-intercept-overlay mc-intercept-feedback-overlay mc-intercept-attachment-overlay"><section className="mc-intercept-attachment-modal mc-intercept-attachment-delete-modal" role="dialog" aria-modal="true" aria-labelledby={`instructionDeleteAttachmentTitle-${id}`} tabIndex={-1}><header><h2 id={`instructionDeleteAttachmentTitle-${id}`}>删除附件</h2><button type="button" onClick={closeNested} className="mc-intercept-close" aria-label="关闭删除附件弹窗">×</button></header><div className="px-10 py-8 text-center text-sm text-slate-800">确定删除附件“{deletingAttachment.name}”吗？</div><footer><button type="button" onClick={closeNested} className="rounded border border-slate-300 bg-white px-6 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">取消</button><button type="button" onClick={() => { if (persist({ ...state, attachments: state.attachments.filter((item) => item.id !== deletingAttachment.id) })) closeNested(); }} className="rounded bg-blue-600 px-6 py-1.5 text-xs font-bold text-white hover:bg-blue-700">确定</button></footer></section></div>}
    {nested === 'tracking' && <div className="mc-intercept-overlay mc-intercept-feedback-overlay mc-intercept-attachment-overlay instruction-tracking-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) closeNested(); }}><section className="mc-intercept-attachment-modal instruction-tracking-modal" role="dialog" aria-modal="true" aria-labelledby={`instructionTrackingTitle-${id}`} tabIndex={-1}>
      <header><h2 id={`instructionTrackingTitle-${id}`}>添加运踪节点</h2><button type="button" onClick={closeNested} className="mc-intercept-close" aria-label="关闭添加运踪">×</button></header>
      <div className="instruction-tracking-form">
        <div className="instruction-tracking-type" role="group" aria-labelledby={`instructionTrackingType-${id}`}><span id={`instructionTrackingType-${id}`}><b>* </b>运踪类型：</span><div className="instruction-tracking-type-choices">{trackingTypes.map(type => <label key={type} className={trackingForm.type === type ? 'is-selected' : undefined}><input type="radio" name={`instructionTrackingType-${id}`} checked={trackingForm.type === type} onChange={() => { setTrackingForm(form => ({ ...form, type })); setError(''); }} />{type}</label>)}</div></div>
        <label><span>国家：</span><select aria-label="国家" value={trackingForm.country} onChange={event => { setTrackingForm(form => ({ ...form, country: event.target.value })); setError(''); }}><option value="">请选择国家</option>{countryOptions.countries.map(country => <option key={country}>{country}</option>)}</select></label>
        <label><span><b>* </b>节点描述：</span><input aria-label="节点描述" aria-required="true" maxLength={1000} placeholder="请输入节点描述" value={trackingForm.description} onChange={event => { setTrackingForm(form => ({ ...form, description: event.target.value })); setError(''); }} /></label>
        <label><span>时间：</span><input aria-label="时间" type="datetime-local" placeholder="选择日期时间" value={trackingForm.occurredAt} onChange={event => { setTrackingForm(form => ({ ...form, occurredAt: event.target.value })); setError(''); }} /></label>
        {error && <p className="instruction-tracking-form-error" role="alert">{error}</p>}
      </div>
      <footer><button className="mc-btn primary" type="button" onClick={saveTracking}>保存</button><button className="mc-btn" type="button" onClick={closeNested}>取消</button></footer>
    </section></div>}
    {nested==='processing'&&<div className="mc-intercept-overlay mc-intercept-feedback-overlay mc-intercept-attachment-overlay instruction-processing-overlay" onMouseDown={event=>{if(event.target===event.currentTarget)closeNested();}}><section className="mc-intercept-attachment-modal instruction-processing-modal" role="dialog" aria-modal="true" aria-labelledby={`instructionProcessingTitle-${id}`} tabIndex={-1}><header><h2 id={`instructionProcessingTitle-${id}`}>处理操作指令</h2><button type="button" className="mc-intercept-close" aria-label="关闭处理操作指令" onClick={closeNested}>×</button></header><div className="instruction-processing-form"><p>已选择 {state.fees.filter(fee=>selectedOperations.includes(fee.id)).length} 项操作指令</p><label><span>处理状态：</span><select aria-label="处理状态" value={processingStatus} onChange={event=>setProcessingStatus(event.target.value as '待处理'|'已处理')}><option>已处理</option><option>待处理</option></select></label><p className="instruction-processing-hint">仅修改所选操作指令的处理状态。</p>{error&&<p role="alert" className="instruction-transfer-batch-error">{error}</p>}</div><footer><button type="button" className="mc-btn primary" onClick={saveProcessing}>保存</button><button type="button" className="mc-btn" onClick={closeNested}>取消</button></footer></section></div>}
    {error && nested !== 'fee' && nested !== 'feeEdit' && nested !== 'tracking' && nested !== 'processing' && <div role="alert" className="instruction-detail-error">{error}</div>}
  </div>, document.body);
}
