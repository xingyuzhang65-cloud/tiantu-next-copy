import { useEffect, useId, useRef } from 'react';
import { Plus, X } from 'lucide-react';
import './CatalogFeeDrawer.css';

export type CatalogFeeDrawerRow = {
  id: string;
  code: string;
  name: string;
  type: string;
  unit: string;
  unitPrice: string | number;
  quantity: string | number;
  currency: string;
  remark: string;
};

export type CatalogFeeOption = { code: string; name: string };

type CatalogFeeDrawerProps = {
  rows: CatalogFeeDrawerRow[];
  catalogRows: CatalogFeeOption[];
  title?: string;
  focusedRowId?: string | null;
  error?: string;
  onAdd: () => void;
  onSelect: (id: string, code: string) => void;
  onUpdate: (id: string, field: 'unitPrice' | 'quantity' | 'remark', value: string) => void;
  onRemove: (id: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
};

const focusableSelector = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function CatalogFeeDrawer({ rows, catalogRows, title = '添加费用', focusedRowId, error, onAdd, onSelect, onUpdate, onRemove, onCancel, onConfirm }: CatalogFeeDrawerProps) {
  const titleId = useId();
  const drawerRef = useRef<HTMLElement>(null);
  const selectRefs = useRef(new Map<string, HTMLSelectElement>());
  const initialFocusId = useRef(focusedRowId);
  const previousCount = useRef(rows.length);

  useEffect(() => {
    const origin = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const target = initialFocusId.current ? selectRefs.current.get(initialFocusId.current) : selectRefs.current.values().next().value;
    (target ?? drawerRef.current?.querySelector<HTMLElement>(focusableSelector) ?? drawerRef.current)?.focus({ preventScroll: true });
    return () => { if (origin?.isConnected) origin.focus({ preventScroll: true }); };
  }, []);

  useEffect(() => {
    if (rows.length > previousCount.current) {
      const lastRow = rows[rows.length - 1];
      if (lastRow) selectRefs.current.get(lastRow.id)?.focus({ preventScroll: true });
    }
    previousCount.current = rows.length;
  }, [rows]);

  return <div className="catalog-fee-overlay" onMouseDown={event => {
    if (event.target === event.currentTarget) { event.preventDefault(); onCancel(); }
  }} onKeyDown={event => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onCancel(); return; }
    if (event.key !== 'Tab') return;
    const items: HTMLElement[] = drawerRef.current ? Array.from(drawerRef.current.querySelectorAll<HTMLElement>(focusableSelector)) : [];
    const visibleItems = items.filter(item => item.getClientRects().length > 0);
    const first = visibleItems[0];
    const last = visibleItems[visibleItems.length - 1];
    const active = document.activeElement;
    if (!first) { event.preventDefault(); drawerRef.current?.focus(); }
    else if (event.shiftKey && (active === first || !drawerRef.current?.contains(active))) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && (active === last || !drawerRef.current?.contains(active))) { event.preventDefault(); first.focus(); }
    event.stopPropagation();
  }}>
    <aside ref={drawerRef} className="catalog-fee-drawer" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
      <header className="catalog-fee-header">
        <h2 id={titleId}>{title}</h2>
        <button className="catalog-fee-close" type="button" aria-label="关闭添加费用" onClick={onCancel}><X size={18} /></button>
      </header>
      <div className="catalog-fee-body">
        <div className="catalog-fee-toolbar"><button className="catalog-fee-button catalog-fee-primary" type="button" onClick={onAdd}><Plus size={14} />添加</button></div>
        <div className="catalog-fee-table-scroll">
          <table className="catalog-fee-table">
            <colgroup><col className="catalog-fee-index-column" /><col className="catalog-fee-name-column" /><col className="catalog-fee-type-column" /><col className="catalog-fee-unit-column" /><col className="catalog-fee-price-column" /><col className="catalog-fee-quantity-column" /><col className="catalog-fee-currency-column" /><col className="catalog-fee-remark-column" /><col className="catalog-fee-action-column" /></colgroup>
            <thead><tr>{['#', '费用名称', '费用类型', '单位', '单价', '数量', '币种', '费用备注', '操作'].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead>
            <tbody>{rows.map((row, index) => {
              const catalogOption = catalogRows.find(option => option.code === row.code);
              const legacyValue = row.name && !catalogOption ? `legacy-${row.id}` : '';
              return <tr key={row.id}>
                <td>{index + 1}</td>
                <td><select ref={element => { if (element) selectRefs.current.set(row.id, element); else selectRefs.current.delete(row.id); }} aria-label={`费用名称${index + 1}`} value={catalogOption ? row.code : legacyValue} onChange={event => onSelect(row.id, event.target.value)}>
                  <option value="">请选择费用名称</option>
                  {legacyValue && <option value={legacyValue}>{row.name}</option>}
                  {catalogRows.map(option => <option key={option.code} value={option.code}>{option.name}</option>)}
                </select></td>
                <td title={row.type}>{row.type || '—'}</td>
                <td title={row.unit}>{row.unit || '—'}</td>
                <td><input aria-label={`单价${index + 1}`} type="number" min="0" step="any" value={row.unitPrice} onChange={event => onUpdate(row.id, 'unitPrice', event.target.value)} /></td>
                <td><input aria-label={`数量${index + 1}`} type="number" min="0" step="any" value={row.quantity} onChange={event => onUpdate(row.id, 'quantity', event.target.value)} /></td>
                <td title={row.currency}>{row.name ? row.currency || '—' : '—'}</td>
                <td><input aria-label={`费用备注${index + 1}`} type="text" value={row.remark} maxLength={1000} onChange={event => onUpdate(row.id, 'remark', event.target.value)} /></td>
                <td><button className="catalog-fee-remove" type="button" aria-label={`删除费用${index + 1}`} onClick={() => onRemove(row.id)}>删除</button></td>
              </tr>;
            })}</tbody>
          </table>
        </div>
        {error && <div className="catalog-fee-error" role="alert">{error}</div>}
        <footer className="catalog-fee-footer">
          <button className="catalog-fee-button catalog-fee-primary" type="button" onClick={onConfirm}>确定</button>
          <button className="catalog-fee-button" type="button" onClick={onCancel}>取消</button>
        </footer>
      </div>
    </aside>
  </div>;
}
