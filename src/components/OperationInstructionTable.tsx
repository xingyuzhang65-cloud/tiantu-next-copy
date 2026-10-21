import { useEffect, useRef, useState } from 'react';
import { Eye, X } from 'lucide-react';
import './OperationInstructionTable.css';

export type OperationInstructionRow = {
  id: string;
  name: string;
  type: string;
  unit: string;
  unitPrice: number;
  quantity: number;
  currency: string;
  addedAt: string;
  addedBy: string;
  feeRemark: string;
  instructionRemark?: string;
  images?: { id: string; name: string; dataUrl?: string }[];
  status?: string;
};

type OperationInstructionTableProps = {
  rows: OperationInstructionRow[];
  onEdit?: (id: string) => void;
  onRemove?: (id: string) => void;
  emptyText?: string;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
};

type PreviewImage = { name: string; dataUrl: string };

const columns = ['#', '费用名称', '费用类型', '计费单位', '计费单价', '计费数量', '币种', '添加时间', '添加人', '费用备注', '指令备注', '图片', '状态'];
const currencies: Record<string, string> = { CNY: '人民币', RMB: '人民币', USD: '美元', EUR: '欧元', GBP: '英镑' };
const display = (value?: string) => value?.trim() || '—';
const numberText = (value: number) => Number.isFinite(value) ? String(Number(value.toFixed(6))) : '—';

function statusClass(status?: string) {
  if (status === '已处理') return 'operation-instruction-status-done';
  if (status === '待处理') return 'operation-instruction-status-pending';
  if (status === '已取消' || status === '已驳回') return 'operation-instruction-status-rejected';
  return 'operation-instruction-status-neutral';
}

export default function OperationInstructionTable({ rows, onEdit, onRemove, emptyText = '暂无数据', selectedIds = [], onSelectionChange }: OperationInstructionTableProps) {
  const [preview, setPreview] = useState<PreviewImage | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const previewOrigin = useRef<HTMLElement | null>(null);
  const hasActions = Boolean(onEdit || onRemove);
  const selectable = Boolean(onSelectionChange);
  const allSelected = !!rows.length && rows.every(row=>selectedIds.includes(row.id));

  useEffect(() => {
    if (!preview) return;
    previewRef.current?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
    return () => {
      if (previewOrigin.current?.isConnected) previewOrigin.current.focus({ preventScroll: true });
    };
  }, [preview]);

  const openPreview = (image: PreviewImage) => {
    previewOrigin.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setPreview(image);
  };

  return <div className="operation-instruction-table-container">
    <div className="operation-instruction-table-scroll" tabIndex={0} role="region" aria-label="操作指令明细，可横向滚动">
      <table className={`operation-instruction-table${hasActions ? ' operation-instruction-table-with-actions' : ''}`}>
        <colgroup>
          <col className="operation-instruction-column-index" />
          {selectable&&<col style={{width:40}}/>}
          <col className="operation-instruction-column-name" />
          <col className="operation-instruction-column-type" />
          <col className="operation-instruction-column-unit" />
          <col className="operation-instruction-column-price" />
          <col className="operation-instruction-column-quantity" />
          <col className="operation-instruction-column-currency" />
          <col className="operation-instruction-column-added-at" />
          <col className="operation-instruction-column-added-by" />
          <col className="operation-instruction-column-remark" />
          <col className="operation-instruction-column-remark" />
          <col className="operation-instruction-column-images" />
          <col className="operation-instruction-column-status" />
          {hasActions && <col className="operation-instruction-column-actions" />}
        </colgroup>
        <thead><tr><th scope="col">#</th>{selectable&&<th scope="col"><input type="checkbox" aria-label="全选操作指令" checked={allSelected} disabled={!rows.length} onChange={event=>onSelectionChange?.(event.target.checked?rows.map(row=>row.id):[])}/></th>}{columns.slice(1).map(label => <th key={label} scope="col">{label}</th>)}{hasActions && <th scope="col">操作</th>}</tr></thead>
        <tbody>{rows.length ? rows.map((row, index) => {
          const images = (row.images ?? []).filter((image): image is typeof image & { dataUrl: string } => Boolean(image.dataUrl));
          const currency = currencies[row.currency.toUpperCase()] ?? display(row.currency);
          return <tr key={row.id}>
            <td className="operation-instruction-index">{index + 1}</td>
            {selectable&&<td><input type="checkbox" aria-label={`选择操作指令${index+1}`} checked={selectedIds.includes(row.id)} onChange={event=>onSelectionChange?.(event.target.checked?[...selectedIds,row.id]:selectedIds.filter(id=>id!==row.id))}/></td>}
            <td title={display(row.name)}>{display(row.name)}</td>
            <td title={display(row.type)}>{display(row.type)}</td>
            <td title={display(row.unit)}>{display(row.unit)}</td>
            <td>{numberText(row.unitPrice)}</td>
            <td>{numberText(row.quantity)}</td>
            <td>{currency}</td>
            <td title={display(row.addedAt)}>{display(row.addedAt)}</td>
            <td title={display(row.addedBy)}>{display(row.addedBy)}</td>
            <td className="operation-instruction-remark" title={display(row.feeRemark)}>{display(row.feeRemark)}</td>
            <td className="operation-instruction-remark" title={display(row.instructionRemark)}>{display(row.instructionRemark)}</td>
            <td>{images.length ? <div className="operation-instruction-images">
              {images.slice(0, 3).map(image => <button key={image.id} className="operation-instruction-thumbnail" type="button" aria-label={`预览${image.name}`} title={image.name} onClick={() => openPreview(image)}>
                <img src={image.dataUrl} alt={image.name} />
                <span className="operation-instruction-image-overlay"><Eye size={16} /></span>
              </button>)}
              {images.length > 3 && <span className="operation-instruction-image-count" title={`共 ${images.length} 张图片`}>+{images.length - 3}</span>}
            </div> : '—'}</td>
            <td>{row.status ? <span className={`operation-instruction-status ${statusClass(row.status)}`}>{row.status}</span> : '—'}</td>
            {hasActions && <td><div className="operation-instruction-actions">
              {onEdit && <button type="button" onClick={() => onEdit(row.id)} aria-label={`编辑操作指令${index + 1}`}>编辑</button>}
              {onRemove && <button type="button" className="operation-instruction-remove" onClick={() => onRemove(row.id)} aria-label={`删除操作指令${index + 1}`}>删除</button>}
            </div></td>}
          </tr>;
        }) : <tr className="operation-instruction-empty"><td colSpan={columns.length + Number(hasActions) + Number(selectable)}>{emptyText}</td></tr>}</tbody>
      </table>
    </div>
    {preview && <div ref={previewRef} className="operation-instruction-preview" role="dialog" aria-modal="true" aria-label="图片预览" onMouseDown={event => {
      if (event.currentTarget === event.target) { event.preventDefault(); setPreview(null); }
    }} onKeyDown={event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setPreview(null); }
      if (event.key === 'Tab') {
        event.preventDefault();
        event.stopPropagation();
        previewRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
      }
    }}>
      <section className="operation-instruction-preview-content">
        <header><span title={preview.name}>{preview.name}</span><button type="button" aria-label="关闭图片预览" onClick={() => setPreview(null)}><X size={20} /></button></header>
        <img src={preview.dataUrl} alt={preview.name} />
      </section>
    </div>}
  </div>;
}
