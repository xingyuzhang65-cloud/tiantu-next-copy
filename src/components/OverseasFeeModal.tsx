import React from 'react';
import { Plus, Trash2, X } from 'lucide-react';

export type OverseasFeeDraftId = string | number;

export type OverseasFeeDraftRow<Id extends OverseasFeeDraftId = OverseasFeeDraftId> = {
  id: Id;
  billingTime: string;
  name: string;
  type: string;
  unit: string;
  exchangeRate: string;
  unitPrice: string;
  quantity: string;
  currency: string;
  remark: string;
};

export type OverseasFeeEditableField = Exclude<keyof OverseasFeeDraftRow, 'id'>;

export type OverseasFeeCatalogRow = {
  code: string;
  name: string;
};

type OverseasFeeModalProps<Id extends OverseasFeeDraftId> = {
  rows: OverseasFeeDraftRow<Id>[];
  catalogRows?: OverseasFeeCatalogRow[];
  focusedRowId?: Id | null;
  onAdd: () => void;
  onUpdate: (id: Id, field: OverseasFeeEditableField, value: string) => void;
  onRemove: (id: Id) => void;
  onCancel: () => void;
  onConfirm: () => void;
};

const feeInputClass =
  'h-7 w-full min-w-0 rounded border border-slate-200 bg-white px-2 text-xs text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200';

const parseFeeNumber = (value: string) => Number(String(value || '0').replace(/[^\d.-]/g, '')) || 0;
const formatFeeAmount = (value: number) => value.toFixed(2);
const getOriginalAmount = (row: Pick<OverseasFeeDraftRow, 'unitPrice' | 'quantity'>) =>
  parseFeeNumber(row.unitPrice) * (parseFeeNumber(row.quantity) || 1);
const getRmbAmount = (row: Pick<OverseasFeeDraftRow, 'unitPrice' | 'quantity' | 'exchangeRate'>) =>
  getOriginalAmount(row) * (parseFeeNumber(row.exchangeRate) || 1);

export default function OverseasFeeModal<Id extends OverseasFeeDraftId>({
  rows,
  catalogRows = [],
  focusedRowId = null,
  onAdd,
  onUpdate,
  onRemove,
  onCancel,
  onConfirm,
}: OverseasFeeModalProps<Id>) {
  const catalogId = 'overseas-fee-catalog';
  const originalTotal = rows.reduce((sum, row) => sum + getOriginalAmount(row), 0);
  const rmbTotal = rows.reduce((sum, row) => sum + getRmbAmount(row), 0);

  return (
    <div
      className="mc-intercept-overlay mc-intercept-feedback-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <section className="mc-storage-fee-modal" role="dialog" aria-modal="true" aria-labelledby="overseasFeeTitle">
        <header className="mc-storage-fee-modal-header">
          <h2 id="overseasFeeTitle">添加费用</h2>
          <div className="mc-storage-fee-modal-actions">
            <button type="button" className="mc-btn primary" onClick={onAdd} title="添加费用明细">
              <Plus className="h-3.5 w-3.5" />
              添加
            </button>
            <button type="button" onClick={onCancel} className="mc-intercept-close" aria-label="关闭添加费用">
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        <form className="flex min-h-0 flex-1 flex-col" onSubmit={(event) => { event.preventDefault(); onConfirm(); }}>
          <div className="mc-storage-fee-modal-body">
            <div className="mc-storage-fee-summary">
              <span>费用明细</span>
              <div>
                <span>共 <strong>{rows.length}</strong> 条</span>
                <span>原币合计 <strong>{formatFeeAmount(originalTotal)}</strong></span>
                <span>人民币合计 <strong>{formatFeeAmount(rmbTotal)}</strong></span>
              </div>
            </div>

            <div className="mc-storage-fee-table-wrap">
              {catalogRows.length > 0 && (
                <datalist id={catalogId}>
                  {catalogRows.map((row) => <option key={row.code} value={row.name}>{row.code}</option>)}
                </datalist>
              )}
              <table className="mc-intercept-fee-table mc-storage-fee-table">
                <thead>
                  <tr>
                    <th>计费时间</th>
                    <th>费用名称</th>
                    <th>费用类型</th>
                    <th>*单位</th>
                    <th>*汇率</th>
                    <th>*单价</th>
                    <th>*数量</th>
                    <th>*币种</th>
                    <th>原币应收金额</th>
                    <th>人民币应收金额</th>
                    <th>费用备注</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length > 0 ? rows.map((row) => {
                    const originalAmount = getOriginalAmount(row);
                    const rmbAmount = getRmbAmount(row);
                    return (
                      <tr key={row.id} className={focusedRowId === row.id ? 'bg-blue-50/60' : ''}>
                        <td><input className={feeInputClass} value={row.billingTime} onChange={(event) => onUpdate(row.id, 'billingTime', event.target.value)} aria-label="计费时间" /></td>
                        <td><input list={catalogRows.length > 0 ? catalogId : undefined} className={feeInputClass} value={row.name} placeholder="请选择或输入费用名称" onChange={(event) => onUpdate(row.id, 'name', event.target.value)} aria-label="费用名称" /></td>
                        <td><input className={feeInputClass} value={row.type} onChange={(event) => onUpdate(row.id, 'type', event.target.value)} aria-label="费用类型" /></td>
                        <td>
                          <select className={feeInputClass} value={row.unit} onChange={(event) => onUpdate(row.id, 'unit', event.target.value)} aria-label="计费单位">
                            <option value="票">票</option>
                            <option value="箱">箱</option>
                            <option value="KG">KG</option>
                            <option value="CBM">CBM</option>
                          </select>
                        </td>
                        <td><input type="number" min="0" step="any" className={feeInputClass} value={row.exchangeRate} onChange={(event) => onUpdate(row.id, 'exchangeRate', event.target.value)} aria-label="汇率" /></td>
                        <td><input type="number" min="0" step="any" className={feeInputClass} value={row.unitPrice} onChange={(event) => onUpdate(row.id, 'unitPrice', event.target.value)} aria-label="单价" /></td>
                        <td><input type="number" min="0" step="any" className={feeInputClass} value={row.quantity} onChange={(event) => onUpdate(row.id, 'quantity', event.target.value)} aria-label="数量" /></td>
                        <td>
                          <select className={feeInputClass} value={row.currency} onChange={(event) => onUpdate(row.id, 'currency', event.target.value)} aria-label="币种">
                            <option value="人民币">人民币</option>
                            <option value="USD">USD</option>
                          </select>
                        </td>
                        <td className="mc-storage-fee-amount">{formatFeeAmount(originalAmount)}</td>
                        <td className="mc-storage-fee-amount">{formatFeeAmount(rmbAmount)}</td>
                        <td><input className={feeInputClass} value={row.remark} onChange={(event) => onUpdate(row.id, 'remark', event.target.value)} aria-label="费用备注" /></td>
                        <td>
                          <button type="button" className="mc-storage-fee-delete" onClick={() => onRemove(row.id)} aria-label={`删除费用 ${row.name || '明细'}`} title="删除费用明细">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan={12} className="mc-intercept-fee-empty">暂无数据</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <footer className="mc-storage-fee-modal-footer">
            <button type="button" className="mc-btn" onClick={onCancel}>取消</button>
            <button type="submit" className="mc-btn primary">确认</button>
          </footer>
        </form>
      </section>
    </div>
  );
}
