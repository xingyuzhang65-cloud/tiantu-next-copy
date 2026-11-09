import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import CatalogFeeDrawer, { type CatalogFeeDrawerRow } from './CatalogFeeDrawer';
import InstructionFeeEditDialog from './InstructionFeeEditDialog';
import OperationInstructionTable from './OperationInstructionTable';
import { instructionManagementCatalog } from './instructionManagementCatalog';
import { getInventoryFeeCatalog } from './overseasStorageInventoryData';
import type { InstructionFeeImage } from './instructionDetailData';
import './InstructionDetailPage.css';

export interface InterceptFee {
  id: number | string;
  code?: string;
  billingTime?: string;
  name: string;
  type: string;
  unit: string;
  exchangeRate?: number;
  unitPrice: number;
  quantity: number;
  currency: string;
  total: number;
  addedAt: string;
  addedBy: string;
  description: string;
  remark?: string;
  instructionRemark?: string;
  images?: InstructionFeeImage[];
  status?: string;
}

type FeeDraft = CatalogFeeDrawerRow & { billingTime: string; exchangeRate: string; instructionRemark: string };
type Modal = 'add' | 'edit' | 'processing' | null;
type Props = {
  fees: InterceptFee[];
  onSave: (fees: InterceptFee[]) => void;
  onModalOpenChange: (open: boolean) => void;
};

const nowText = () => new Date().toLocaleString('sv-SE', { hour12: false });
const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const currencyNames: Record<string, string> = { CNY: '人民币', RMB: '人民币', USD: '美元', EUR: '欧元', GBP: '英镑' };

export default function InterceptFeesPanel({ fees, onSave, onModalOpenChange }: Props) {
  const catalog = useMemo(getInventoryFeeCatalog, []);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [modal, setModal] = useState<Modal>(null);
  const [drafts, setDrafts] = useState<FeeDraft[]>([]);
  const [error, setError] = useState('');
  const [processingStatus, setProcessingStatus] = useState('已处理');
  const portalRef = useRef<HTMLDivElement>(null);
  const selected = fees.filter(fee => selectedIds.includes(String(fee.id)));
  const doneCount = fees.filter(fee => ['已处理', '已完成'].includes(fee.status || '待处理')).length;
  const total = roundMoney(fees.reduce((sum, fee) => sum + roundMoney(fee.unitPrice * fee.quantity * (fee.exchangeRate ?? 1)), 0));
  const editedFee = drafts[0];
  const editedCost = useMemo(() => {
    if (!editedFee) return undefined;
    const original = instructionManagementCatalog.find(item => item.code === editedFee.code || item.name === editedFee.name);
    try {
      const saved = JSON.parse(localStorage.getItem('tiantu-instruction-management-reference-v1') || 'null');
      const item = saved?.rows?.find((item: { code: string; name: string }) => item.code === editedFee.code || item.name === editedFee.name);
      if (typeof item?.cost === 'number' && Number.isFinite(item.cost) && item.cost >= 0) return item.cost;
    } catch { /* Use the original dictionary when no saved version is available. */ }
    return original?.cost;
  }, [editedFee]);

  function closeModal() { setModal(null); setDrafts([]); setError(''); }

  useEffect(() => {
    onModalOpenChange(modal !== null);
    return () => onModalOpenChange(false);
  }, [modal, onModalOpenChange]);

  useEffect(() => {
    if (!modal || modal === 'add') return;
    const origin = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = portalRef.current?.querySelector<HTMLElement>('[role="dialog"]');
    const focusables = () => Array.from((dialog?.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]):not([readonly]),select:not([disabled]),textarea:not([disabled])') || []) as NodeListOf<HTMLElement>).filter(item => item.getClientRects().length > 0);
    (dialog?.querySelector<HTMLElement>('input:not([readonly]),select:not([disabled])') || focusables()[0] || dialog)?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault(); event.stopPropagation(); closeModal();
      } else if (event.key === 'Tab') {
        const items = focusables(); const first = items[0]; const last = items[items.length - 1];
        if (!first) { event.preventDefault(); dialog?.focus(); }
        else if (event.shiftKey && (document.activeElement === first || !dialog?.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && (document.activeElement === last || !dialog?.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', handleKey, true);
    return () => {
      document.removeEventListener('keydown', handleKey, true);
      if (origin?.isConnected) origin.focus({ preventScroll: true });
    };
  }, [modal]);

  function openFee(id?: string) {
    const fee = fees.find(item => String(item.id) === id);
    setDrafts(fee ? [{
      id: String(fee.id), code: fee.code || catalog.find(item => item.name === fee.name)?.code || '',
      name: fee.name, type: fee.type, unit: fee.unit, unitPrice: String(fee.unitPrice), quantity: String(fee.quantity),
      currency: currencyNames[fee.currency.toUpperCase()] || fee.currency, exchangeRate: String(fee.exchangeRate ?? 1),
      billingTime: fee.billingTime || fee.addedAt, remark: fee.remark ?? fee.description ?? '', instructionRemark: fee.instructionRemark || '',
    }] : [emptyFee()]);
    setError(''); setModal(fee ? 'edit' : 'add');
  }

  function emptyFee(): FeeDraft {
    return { id: crypto.randomUUID(), code: '', name: '', type: '', unit: '', unitPrice: '', quantity: '1', currency: '',
      billingTime: nowText(), exchangeRate: '1', remark: '', instructionRemark: '' };
  }

  function updateDraft(id: string, field: 'unitPrice' | 'quantity' | 'remark', value: string) {
    setError(''); setDrafts(rows => rows.map(row => row.id === id ? { ...row, [field]: value } : row));
  }

  function selectFee(id: string, code: string) {
    const fee = catalog.find(item => item.code === code);
    setError(''); setDrafts(rows => rows.map(row => row.id === id ? {
      ...row, code, name: fee?.name || '', type: fee?.type || '', unit: fee?.unit || '',
      unitPrice: fee ? String(fee.unitPrice) : '', currency: fee?.currency || '',
      exchangeRate: fee ? String(fee.exchangeRate) : '1', instructionRemark: fee?.instructionRemark || '',
    } : row));
  }

  function saveFees() {
    if (!drafts.length) { setError('请添加至少一条费用'); return; }
    const invalid = drafts.some(fee => !fee.name.trim() || !fee.unit.trim() || !fee.currency.trim()
      || !fee.exchangeRate.trim() || !Number.isFinite(Number(fee.exchangeRate)) || Number(fee.exchangeRate) <= 0
      || !String(fee.unitPrice).trim() || !Number.isFinite(Number(fee.unitPrice)) || Number(fee.unitPrice) < 0
      || !String(fee.quantity).trim() || !Number.isFinite(Number(fee.quantity)) || Number(fee.quantity) <= 0
      || !Number.isFinite(Number(fee.unitPrice) * Number(fee.quantity) * Number(fee.exchangeRate) * 100));
    if (invalid) { setError('请选择费用名称，单价须为大于或等于0的有效数字，数量须大于0。'); return; }
    const time = nowText();
    const saved = drafts.map(draft => {
      const previous = fees.find(fee => String(fee.id) === draft.id);
      const unitPrice = Number(draft.unitPrice), quantity = Number(draft.quantity), exchangeRate = Number(draft.exchangeRate);
      return {
        ...previous, id: previous?.id ?? draft.id, code: draft.code, billingTime: draft.billingTime || time,
        name: draft.name, type: draft.type || '其他', unit: draft.unit, unitPrice, quantity, exchangeRate,
        currency: draft.currency, total: roundMoney(unitPrice * quantity * exchangeRate),
        remark: draft.remark.trim(), description: previous?.description || draft.instructionRemark,
        instructionRemark: draft.instructionRemark, addedAt: previous?.addedAt || time,
        addedBy: previous?.addedBy || '当前用户', status: previous?.status || '待处理',
      } satisfies InterceptFee;
    });
    const next = modal === 'edit' ? fees.map(fee => String(fee.id) === saved[0].id.toString() ? saved[0] : fee) : [...fees, ...saved];
    if (!Number.isFinite(next.reduce((sum, fee) => sum + fee.unitPrice * fee.quantity * (fee.exchangeRate ?? 1), 0) * 100)) {
      setError('费用合计超出有效范围，请调整单价或数量。'); return;
    }
    onSave(next); closeModal();
  }

  function removeFee(id: string) {
    const fee = fees.find(item => String(item.id) === id);
    if (!fee || !window.confirm(`确定删除费用“${fee.name}”吗？`)) return;
    onSave(fees.filter(item => String(item.id) !== id));
    setSelectedIds(ids => ids.filter(item => item !== id));
  }

  function saveProcessing() {
    if (!selected.length) { setError('请先勾选需要处理的操作指令'); return; }
    onSave(fees.map(fee => selectedIds.includes(String(fee.id)) ? { ...fee, status: processingStatus } : fee));
    setSelectedIds([]); closeModal();
  }

  return <>
    <div className="mc-intercept-detail-toolbar"><h3 className="mc-intercept-detail-card-title">操作指令</h3><button type="button" className="mc-btn primary" onClick={() => openFee()}>新增费用</button></div>
    <div className="instruction-processing-toolbar">
      <span className="instruction-processing-count">待处理 {fees.length - doneCount} 项，已处理 {doneCount} 项</span>
      <button type="button" className="mc-btn primary" disabled={!selected.length} onClick={() => { setProcessingStatus('已处理'); setError(''); setModal('processing'); }}>处理</button>
      <span>已选 {selected.length} 项</span>
    </div>
    <OperationInstructionTable rows={fees.map(fee => ({ ...fee, id: String(fee.id), feeRemark: fee.remark ?? fee.description ?? '', status: fee.status || '待处理' }))}
      selectedIds={selectedIds} onSelectionChange={setSelectedIds} onEdit={openFee} onRemove={removeFee} emptyText="暂无费用记录" />
    <div className="oi-fee-summary"><span>共 {fees.length} 条</span><strong>人民币合计 {total.toFixed(2)}</strong></div>
    {modal && createPortal(<div ref={portalRef} className="instruction-detail-portal">
      {modal === 'add' && <CatalogFeeDrawer rows={drafts} catalogRows={catalog} error={error}
        onAdd={() => { setError(''); setDrafts(rows => [...rows, emptyFee()]); }} onSelect={selectFee} onUpdate={updateDraft}
        onRemove={id => { setError(''); setDrafts(rows => rows.filter(row => row.id !== id)); }} onCancel={closeModal} onConfirm={saveFees} />}
      {modal === 'edit' && editedFee && <InstructionFeeEditDialog row={editedFee} cost={editedCost} error={error}
        onUpdate={(field, value) => updateDraft(editedFee.id, field, value)} onCancel={closeModal} onConfirm={saveFees} />}
      {modal === 'processing' && <div className="mc-intercept-overlay mc-intercept-feedback-overlay mc-intercept-attachment-overlay instruction-processing-overlay" onMouseDown={event => { if (event.target === event.currentTarget) closeModal(); }}>
        <section className="mc-intercept-attachment-modal instruction-processing-modal" role="dialog" aria-modal="true" aria-label="处理操作指令" tabIndex={-1}>
          <header><h2>处理操作指令</h2><button type="button" className="mc-intercept-close" aria-label="关闭处理操作指令" onClick={closeModal}>×</button></header>
          <div className="instruction-processing-form"><p>已选择 {selected.length} 项操作指令</p><label><span>处理状态：</span><select aria-label="处理状态" value={processingStatus} onChange={event => setProcessingStatus(event.target.value)}><option>已处理</option><option>待处理</option></select></label><p className="instruction-processing-hint">仅修改所选操作指令的处理状态。</p>{error && <p role="alert" className="instruction-transfer-batch-error">{error}</p>}</div>
          <footer><button type="button" className="mc-btn primary" onClick={saveProcessing}>保存</button><button type="button" className="mc-btn" onClick={closeModal}>取消</button></footer>
        </section>
      </div>}
    </div>, document.body)}
  </>;
}
