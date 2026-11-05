import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { WaybillAttachment } from '../types';
import { DetailAttachmentTable, DetailAttachmentEditor, DetailAttachmentDeleteDialog } from './DetailAttachments';
import type { AttachmentForm, DetailAttachment } from './DetailAttachments';
import './InstructionDetailPage.css';

type FileForm = AttachmentForm & { size: number; mimeType: string };
const emptyForm = (): FileForm => ({ fileName: '', fileSize: '', type: '其他', customerVisible: '可见', dataUrl: '', size: 0, mimeType: '' });
const formatSize = (size: number) => size >= 1024 * 1024 ? `${(size / 1024 / 1024).toFixed(1)}MB` : `${Math.max(1, Math.ceil(size / 1024))}KB`;
const toDetailAttachment = (attachment: WaybillAttachment): DetailAttachment => ({
  id: attachment.id, name: attachment.name, type: attachment.category || '其他',
  customerVisible: attachment.customerVisible || '可见', fileSize: formatSize(attachment.size),
  uploadedBy: attachment.uploadedBy || '当前用户', uploadedAt: attachment.uploadedAt, dataUrl: attachment.dataUrl || '',
});

export default function WaybillOtherInformation({ attachments, onChange }: {
  key?: string;
  attachments: WaybillAttachment[];
  onChange: (attachments: WaybillAttachment[]) => void;
}) {
  const [modal, setModal] = useState<'attachment' | 'deleteAttachment' | null>(null);
  const [editing, setEditing] = useState<WaybillAttachment | null>(null);
  const [deleting, setDeleting] = useState<WaybillAttachment | null>(null);
  const [form, setForm] = useState<FileForm>(emptyForm);
  const [readingFile, setReadingFile] = useState(false);
  const [error, setError] = useState('');
  const readId = useRef(0);
  const readerRef = useRef<FileReader | null>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const id = useId().replace(/:/g, '');

  function cancelRead() {
    readId.current += 1;
    if (readerRef.current?.readyState === FileReader.LOADING) readerRef.current.abort();
    readerRef.current = null;
  }

  function closeModal() {
    cancelRead();
    setReadingFile(false);
    setModal(null);
    setError('');
  }

  useEffect(() => () => cancelRead(), []);

  useEffect(() => {
    if (!modal) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const origin = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = portalRef.current?.querySelector<HTMLElement>('[role="dialog"]');
    const focusables = () => Array.from(dialog?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]):not([type="file"]), select:not([disabled])') || []) as HTMLElement[];
    (dialog?.querySelector<HTMLElement>('select') || focusables()[0] || dialog)?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeModal(); }
      if (event.key === 'Tab') {
        const items = focusables(), first = items[0], last = items[items.length - 1];
        if (!first) { event.preventDefault(); dialog?.focus(); }
        else if (event.shiftKey && (document.activeElement === first || !dialog?.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && (document.activeElement === last || !dialog?.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKey, true);
      if (origin?.isConnected) origin.focus({ preventScroll: true });
    };
  }, [modal]);

  function openEditor(attachment?: DetailAttachment) {
    cancelRead();
    const original = attachments.find(item => item.id === attachment?.id) || null;
    setEditing(original);
    setForm(original ? { fileName: original.name, fileSize: formatSize(original.size), type: original.category || '其他',
      customerVisible: original.customerVisible || '可见', dataUrl: original.dataUrl || '', size: original.size, mimeType: original.type } : emptyForm());
    setReadingFile(false);
    setError('');
    setModal('attachment');
  }

  function readFile(file?: File) {
    if (!file) return;
    cancelRead();
    const requestId = readId.current;
    if (file.size > 3 * 1024 * 1024) { setReadingFile(false); setError('附件大小不能超过3MB'); return; }
    setReadingFile(true);
    setError('');
    const reader = new FileReader();
    readerRef.current = reader;
    reader.onload = () => {
      if (readId.current !== requestId) return;
      setForm(current => ({ ...current, fileName: file.name, fileSize: formatSize(file.size), dataUrl: String(reader.result), size: file.size, mimeType: file.type || 'application/octet-stream' }));
      setReadingFile(false);
    };
    reader.onerror = () => { if (readId.current === requestId) { setReadingFile(false); setError('文件读取失败，请重新选择附件'); } };
    reader.readAsDataURL(file);
  }

  function persist(next: WaybillAttachment[]) {
    try { onChange(next); closeModal(); }
    catch { setError('保存失败，本地存储空间不足或不可用，请保留当前内容后重试。'); }
  }

  function saveAttachment() {
    if (readingFile) { setError('附件正在读取，请稍候'); return; }
    if (!form.fileName.trim() || !form.dataUrl.startsWith('data:')) { setError('请先选择附件文件'); return; }
    const attachment: WaybillAttachment = {
      id: editing?.id || globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: form.fileName.trim(), type: form.mimeType, size: form.size, category: form.type, customerVisible: form.customerVisible,
      dataUrl: form.dataUrl, uploadedBy: editing?.uploadedBy || '当前用户', uploadedAt: editing?.uploadedAt || new Date().toLocaleString('sv-SE', { hour12: false }),
    };
    persist(editing ? attachments.map(item => item.id === editing.id ? attachment : item) : [...attachments, attachment]);
  }

  function downloadAttachment(attachment: DetailAttachment) {
    if (!attachment.dataUrl.startsWith('data:')) { setError('附件文件不可用'); return; }
    const link = document.createElement('a');
    link.href = attachment.dataUrl;
    link.download = attachment.name;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  return <>
    <section className="instruction-detail-portal rounded-md bg-white p-4 shadow-sm">
      <DetailAttachmentTable attachments={attachments.map(toDetailAttachment)} onUpload={() => openEditor()} onEdit={openEditor} onDownload={downloadAttachment}
        onDelete={attachment => { setDeleting(attachments.find(item => item.id === attachment.id) || null); setError(''); setModal('deleteAttachment'); }} />
    </section>
    {createPortal(<div ref={portalRef} className="instruction-detail-portal">
      {modal === 'attachment' && <div className="mc-intercept-overlay mc-intercept-feedback-overlay mc-intercept-attachment-overlay" onMouseDown={event => { if (event.target === event.currentTarget) closeModal(); }}>
        <DetailAttachmentEditor titleId={`waybillAttachmentTitle-${id}`} radioName={`waybillAttachmentVisible-${id}`} editing={!!editing} form={form} readingFile={readingFile}
          onRead={readFile} onRemoveFile={() => { cancelRead(); setReadingFile(false); setForm(current => ({ ...current, fileName: '', fileSize: '', dataUrl: '', size: 0, mimeType: '' })); }}
          onChange={patch => setForm(current => ({ ...current, ...patch }))} onCancel={closeModal} onSave={saveAttachment} />
      </div>}
      {modal === 'deleteAttachment' && deleting && <div className="mc-intercept-overlay mc-intercept-feedback-overlay mc-intercept-attachment-overlay">
        <DetailAttachmentDeleteDialog titleId={`waybillDeleteAttachmentTitle-${id}`} name={deleting.name} onCancel={closeModal}
          onConfirm={() => persist(attachments.filter(item => item.id !== deleting.id))} />
      </div>}
      {error && <div className="instruction-detail-error" role="alert">{error}</div>}
    </div>, document.body)}
  </>;
}
