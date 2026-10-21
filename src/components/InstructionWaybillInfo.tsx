import type { InstructionWaybillFields } from './instructionDetailStore';
import './InstructionWaybillInfo.css';

export type InstructionWaybillSummary = {
  customer: string;
  waybill: string;
  instructionType: string;
  deliveryMethod: string;
  palletLabel: string;
  waybillType: string;
  destination: string;
  boxCount: string;
  customerNote: string;
};

type InstructionWaybillInfoProps = {
  summary: InstructionWaybillSummary;
  value: InstructionWaybillFields;
  onChange: (patch: Partial<InstructionWaybillFields>) => void;
  onCancel: () => void;
  onSave: () => void;
  error?: string;
  saved?: boolean;
  dirty?: boolean;
  required?: boolean;
  readOnly?: boolean;
};

const display = (value: string) => value.trim() && value.trim() !== '-' ? value : '—';

export default function InstructionWaybillInfo({
  summary, value, onChange, onCancel, onSave, error, saved, dirty, required = false, readOnly = false,
}: InstructionWaybillInfoProps) {
  const requiredMark = required && !readOnly ? <span className="instruction-waybill-info-required" aria-hidden="true">* </span> : null;

  return <section className="mc-intercept-detail-card instruction-waybill-info">
    <header className="instruction-waybill-info-header">
      <h3 className="mc-intercept-detail-card-title">运单信息</h3>
      {!readOnly && <div className="instruction-waybill-info-actions">
        {saved && !dirty && <span className="instruction-waybill-info-saved" role="status">已保存</span>}
        <button className="mc-btn" type="button" onClick={onCancel}>取消</button>
        <button className="mc-btn primary" type="button" onClick={onSave}>保存修改</button>
      </div>}
    </header>

    <dl className="instruction-waybill-info-summary">
      {([
        ['客户简称', summary.customer],
        ['运单号', summary.waybill],
        ['指令单类型', summary.instructionType],
        ['发货件数', summary.boxCount],
        ['客户备注', summary.customerNote],
      ] as const).map(([label, content]) => <div key={label} className={label === '客户备注' ? 'instruction-waybill-customer-note' : undefined}><dt>{label}：</dt><dd>{display(content)}</dd></div>)}
    </dl>

    <div className="instruction-waybill-info-form">
      <label>
        <span>{requiredMark}运单类型</span>
        <select aria-label="运单类型" disabled value={display(summary.waybillType)}>
          <option value={display(summary.waybillType)}>{display(summary.waybillType)}</option>
        </select>
      </label>
      <label>
        <span>{requiredMark}目的地</span>
        <select aria-label="目的地" disabled value={display(summary.destination)}>
          <option value={display(summary.destination)}>{display(summary.destination)}</option>
        </select>
      </label>
      <label>
        <span>{requiredMark}ShipmentID</span>
        <input aria-label="ShipmentID" value={value.shipmentId} onChange={(event) => { if (!readOnly) onChange({ shipmentId: event.target.value }); }} readOnly={readOnly} aria-readonly={readOnly || undefined} maxLength={200} placeholder="请输入" aria-required={!readOnly && required || undefined} />
      </label>
      <label>
        <span>{requiredMark}派送方式</span>
        <select aria-label="派送方式" disabled value={display(summary.deliveryMethod)}>
          <option value={display(summary.deliveryMethod)}>{display(summary.deliveryMethod)}</option>
        </select>
      </label>
      <label>
        <span>{requiredMark}ReferenceID</span>
        <input aria-label="ReferenceID" value={value.referenceId} onChange={(event) => { if (!readOnly) onChange({ referenceId: event.target.value }); }} readOnly={readOnly} aria-readonly={readOnly || undefined} maxLength={200} placeholder="请输入" aria-required={!readOnly && required || undefined} />
      </label>
      <label>
        <span>{requiredMark}箱数</span>
        <input aria-label="箱数" value={display(summary.boxCount)} readOnly aria-readonly="true" />
      </label>
      <label>
        <span>{requiredMark}预约发货时间</span>
        <input aria-label="预约发货时间" type="date" value={value.scheduledAt.slice(0, 10)} onChange={(event) => { if (!readOnly) onChange({ scheduledAt: event.target.value }); }} readOnly={readOnly} aria-readonly={readOnly || undefined} aria-required={!readOnly && required || undefined} />
      </label>
      <label>
        <span>备注</span>
        <input aria-label="备注" value={value.remark} onChange={(event) => { if (!readOnly) onChange({ remark: event.target.value }); }} readOnly={readOnly} aria-readonly={readOnly || undefined} maxLength={1000} placeholder="请输入" />
      </label>
    </div>
    {error && <p className="instruction-waybill-info-error" role="alert">{error}</p>}
  </section>;
}
