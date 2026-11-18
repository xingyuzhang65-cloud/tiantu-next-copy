import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { billExportTemplates, buildBillExport, type BillExportRecord } from './billOfLadingExport';
import './BillOfLadingExportDialog.css';

export default function BillOfLadingExportDialog({ open, records, onClose }: {
  open: boolean; records: BillExportRecord[]; onClose: () => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState({ text: '', error: false });
  const dialog = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const selectAll = useRef<HTMLInputElement>(null);
  const allChecked = selected.length === billExportTemplates.length;

  useEffect(() => {
    if (!open) return;
    setSelected([]); setNotice({ text: '', error: false });
    const previous = document.activeElement as HTMLElement | null;
    closeButton.current?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose(); }
      if (event.key !== 'Tab') return;
      const controls = [...(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled)') || [])];
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', keydown, true);
    return () => { document.removeEventListener('keydown', keydown, true); previous?.focus(); };
  }, [open, onClose]);

  useEffect(() => {
    if (selectAll.current) selectAll.current.indeterminate = selected.length > 0 && !allChecked;
  }, [selected, allChecked, open]);

  if (!open) return null;
  const toggle = (name: string) => {
    setSelected(current => current.includes(name) ? current.filter(item => item !== name) : [...current, name]);
    setNotice({ text: '', error: false });
  };
  const exportTemplates = async (names: string[]) => {
    if (busy) return;
    setBusy(true); setNotice({ text: '', error: false });
    try {
      const file = await buildBillExport(names, records);
      const url = URL.createObjectURL(file.blob);
      const link = document.createElement('a');
      link.href = url; link.download = file.filename;
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice({ text: `已生成 ${file.fileCount} 个文件`, error: false });
    } catch (error) {
      setNotice({ text: error instanceof Error ? error.message : '导出失败，请重试', error: true });
    } finally { setBusy(false); }
  };

  return <div className="bill-export-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="bill-export-dialog" ref={dialog} role="dialog" aria-modal="true" aria-labelledby="bill-export-title" aria-busy={busy}>
      <header className="bill-export-header"><h2 id="bill-export-title">提单导出</h2><button type="button" ref={closeButton} onClick={onClose} aria-label="关闭提单导出"><X size={17} /></button></header>
      <div className="bill-export-body">
        <div className="bill-export-table-wrap">
          <table className="bill-export-table">
            <colgroup><col className="bill-export-check-col" /><col /><col className="bill-export-action-col" /></colgroup>
            <thead><tr><th><input type="checkbox" ref={selectAll} aria-label="全选导出模板" checked={allChecked} disabled={busy} onChange={event => { setSelected(event.target.checked ? [...billExportTemplates] : []); setNotice({ text: '', error: false }); }} /></th><th>模板名称</th><th>操作</th></tr></thead>
            <tbody>{billExportTemplates.map(name => <tr key={name}>
              <td><input type="checkbox" aria-label={`选择${name}模板`} checked={selected.includes(name)} disabled={busy} onChange={() => toggle(name)} /></td>
              <td>{name}</td>
              <td><button type="button" className="bill-export-row-action" aria-label={`导出${name}模板`} disabled={busy} onClick={() => void exportTemplates([name])}>导出</button></td>
            </tr>)}</tbody>
          </table>
        </div>
      </div>
      <footer className="bill-export-footer">
        <span className={notice.error ? 'is-error' : ''} role={notice.error ? 'alert' : 'status'}>{notice.text}</span>
        <button type="button" className="bill-export-batch" disabled={busy} onClick={() => void exportTemplates(selected)}>{busy ? '正在导出…' : '批量导出'}</button>
      </footer>
    </div>
  </div>;
}
