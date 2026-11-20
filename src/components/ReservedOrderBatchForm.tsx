import { CalendarDays, ChevronDown } from 'lucide-react';
import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ReservationWaybillFields } from './ReservationWaybillFields';
import { parseReservationNumbers, resolveReservationNumbers, type ReservationIdentifier, type WaybillIdentity } from './reservationWaybillLinks';
import { findReservationConflicts, type ReservationOwner } from './reservationWaybillUniqueness';
import './ReservedOrderBatchForm.css';

export type BatchReservationRow = {
  id: number;
  channel: string;
  volume: string;
  deliveryPlace: string;
  scheduledTime: string;
  remark: string;
  waybillBindings: ReservationIdentifier[];
  waybillDraft: string;
};

const emptyRow: Omit<BatchReservationRow, 'id'> = {
  channel: '', volume: '', deliveryPlace: '', scheduledTime: '', remark: '', waybillBindings: [], waybillDraft: '',
};

type BatchOptions = { customer: string[]; channel: string[]; deliveryPlace: string[] };

export const batchReservationOwnerId = (id: number) => `batch-draft-${id}`;

export const getBatchReservationOwners = (rows: readonly BatchReservationRow[]): ReservationOwner[] => rows.map((row, index) => ({
  id: batchReservationOwnerId(row.id),
  reserveNo: `本批第 ${index + 1} 行`,
  status: '待保存',
  links: { identifiers: row.waybillBindings, waybills: [] },
}));

function BatchSelect({ id, label, value, options, onChange }: {
  id?: string;
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return <div className="reserved-create-select">
    <select id={id} aria-label={label} className={value ? '' : 'is-placeholder'} required value={value} onChange={event => onChange(event.target.value)}>
      <option value="" disabled>请选择</option>
      {options.map(option => <option key={option} value={option}>{option}</option>)}
    </select>
    <ChevronDown size={13} aria-hidden="true" />
  </div>;
}

export function ReservedOrderBatchForm({ options, catalog, orders, onSave, onCancel }: {
  options: BatchOptions;
  catalog: WaybillIdentity[];
  orders: ReservationOwner[];
  onSave: (customer: string, rows: readonly BatchReservationRow[]) => string;
  onCancel: () => void;
}) {
  const [customer, setCustomer] = useState('');
  const [rows, setRows] = useState<BatchReservationRow[]>([{ id: 0, ...emptyRow }]);
  const [error, setError] = useState('');
  const nextRowId = useRef(1);
  const owners = [...orders, ...getBatchReservationOwners(rows)];

  const resolveRowWaybills = (row: BatchReservationRow, nextCustomer: string): BatchReservationRow => ({
    ...row,
    waybillBindings: resolveReservationNumbers(nextCustomer, [
      ...row.waybillBindings.map(binding => binding.number), ...parseReservationNumbers(row.waybillDraft),
    ], catalog, row.waybillBindings),
    waybillDraft: '',
  });

  const changeCustomer = (value: string) => {
    setCustomer(value);
    setRows(current => current.map(row => resolveRowWaybills(row, value)));
    setError('');
  };

  const addRow = () => {
    const id = nextRowId.current++;
    setRows(current => [...current, { id, ...emptyRow }]);
    setError('');
  };

  const updateRow = <Key extends Exclude<keyof BatchReservationRow, 'id'>>(id: number, field: Key, value: BatchReservationRow[Key]) => {
    setRows(current => current.map(row => row.id === id ? { ...row, [field]: value } : row));
    setError('');
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const prepared = rows.map(row => row.waybillDraft ? resolveRowWaybills(row, customer) : row);
    const problem = onSave(customer, prepared);
    if (problem) {
      setRows(prepared);
      setError(problem);
    }
  };

  return <div className="reserved-batch-surface">
    <form className="reserved-batch-form" onSubmit={submit} noValidate>
      <div className="reserved-batch-customer">
        <label htmlFor="reserved-batch-customer"><span aria-hidden="true">*</span>客户：</label>
        <BatchSelect id="reserved-batch-customer" label="客户" value={customer} options={options.customer} onChange={changeCustomer} />
        <p className="reserved-batch-waybill-hint">预留运单号选填，支持系统运单号、客户单号、FBA号。同一票运单只能关联一张预留单。</p>
      </div>
      <div className="reserved-batch-table-wrap">
        <table className="reserved-batch-table">
          <thead><tr>
            <th scope="col">*渠道</th>
            <th scope="col">*预约方数</th>
            <th scope="col">*交仓地点</th>
            <th scope="col">*预计送仓时间</th>
            <th scope="col" className="reserved-batch-waybill-col">预留运单号</th>
            <th scope="col">备注</th>
            <th scope="col">操作</th>
          </tr></thead>
          <tbody>{rows.map((row, index) => {
            const rowLabel = `第 ${index + 1} 行`;
            return <tr key={row.id}>
              <td><BatchSelect label={`${rowLabel}渠道`} value={row.channel} options={options.channel} onChange={value => updateRow(row.id, 'channel', value)} /></td>
              <td><div className="reserved-create-stepper">
                <button type="button" aria-label={`${rowLabel}减少预约方数`} disabled={!row.volume || Number(row.volume) <= 0.001} onClick={() => updateRow(row.id, 'volume', adjustedVolume(row.volume, -1))}>−</button>
                <input type="number" aria-label={`${rowLabel}预约方数`} placeholder="请输入数值" required min="0.001" step="any" value={row.volume} onChange={event => updateRow(row.id, 'volume', event.target.value)} />
                <button type="button" aria-label={`${rowLabel}增加预约方数`} onClick={() => updateRow(row.id, 'volume', adjustedVolume(row.volume, 1))}>+</button>
              </div></td>
              <td><BatchSelect label={`${rowLabel}交仓地点`} value={row.deliveryPlace} options={options.deliveryPlace} onChange={value => updateRow(row.id, 'deliveryPlace', value)} /></td>
              <td><div className={`reserved-create-datetime ${row.scheduledTime ? '' : 'is-empty'}`}>
                <CalendarDays size={13} aria-hidden="true" />
                <input type="datetime-local" aria-label={`${rowLabel}预计送仓时间`} required value={row.scheduledTime} onChange={event => updateRow(row.id, 'scheduledTime', event.target.value)} />
                {!row.scheduledTime && <span aria-hidden="true">选择日期时间</span>}
              </div></td>
              <td><ReservationWaybillFields
                tableLabel={`${rowLabel}预留运单号`}
                customer={customer}
                catalog={catalog}
                bindings={row.waybillBindings}
                conflicts={findReservationConflicts(row.waybillBindings.flatMap(binding => binding.candidateIds), owners, batchReservationOwnerId(row.id))}
                onChange={value => updateRow(row.id, 'waybillBindings', value)}
                draft={row.waybillDraft}
                onDraftChange={value => updateRow(row.id, 'waybillDraft', value)}
              /></td>
              <td><div className="reserved-create-remark">
                <textarea aria-label={`${rowLabel}备注`} aria-describedby={`reserved-batch-remark-${row.id}`} placeholder="请输入" maxLength={1000} value={row.remark} onChange={event => updateRow(row.id, 'remark', event.target.value)} />
                <span id={`reserved-batch-remark-${row.id}`}>{row.remark.length}/1000</span>
              </div></td>
              <td><div className="reserved-batch-actions">
                {rows.length > 1 && <button type="button" aria-label={`删除${rowLabel}`} onClick={() => {
                  setRows(current => current.filter(item => item.id !== row.id));
                  setError('');
                }}>−</button>}
                {index === rows.length - 1 && <button type="button" className="reserved-batch-add" aria-label="新增一行" onClick={addRow}>+</button>}
              </div></td>
            </tr>;
          })}</tbody>
        </table>
      </div>
      {error && <p className="reserved-dialog-error" role="alert">{error}</p>}
      <footer className="reserved-dialog-footer">
        <button type="submit" className="reserved-dialog-primary">保存</button>
        <button type="button" onClick={onCancel}>取消</button>
      </footer>
    </form>
  </div>;
}

function adjustedVolume(volume: string, delta: number) {
  return String(Math.max(0.001, Math.round(((Number(volume) || 0) + delta) * 1000) / 1000));
}
