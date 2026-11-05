import { FileText } from 'lucide-react';

export const ATTACHMENT_TYPES = ['POD', 'ISA', '报关资料', '底单', '其他', '其它', '税金单', '递延资料', '提单'];

export interface DetailAttachment {
  id: string;
  name: string;
  type: string;
  customerVisible: '可见' | '不可见';
  fileSize: string;
  uploadedBy: string;
  uploadedAt: string;
  dataUrl: string;
}

export interface AttachmentForm {
  fileName: string;
  fileSize: string;
  type: string;
  customerVisible: '可见' | '不可见';
  dataUrl: string;
}

export function DetailAttachmentTable({ attachments, onUpload, onEdit, onDownload, onDelete }: {
  attachments: DetailAttachment[];
  onUpload: () => void;
  onEdit: (attachment: DetailAttachment) => void;
  onDownload: (attachment: DetailAttachment) => void;
  onDelete: (attachment: DetailAttachment) => void;
}) {
  return <>
    <div className="mb-3 flex items-center justify-between">
      <h3 className="text-sm font-bold text-slate-950">其它信息</h3>
      <button type="button" onClick={onUpload} className="rounded border border-slate-300 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">上传附件</button>
    </div>
    <div className="overflow-x-auto border border-slate-200">
      <table className="w-full min-w-[920px] table-fixed border-collapse text-[11px]">
        <thead className="bg-slate-50 text-slate-600"><tr>
          {['附件名称', '附件类型', '客户可见', '文件大小', '上传人', '上传时间', '操作'].map(head => <th key={head} className="border border-slate-200 px-3 py-2 text-left font-semibold">{head}</th>)}
        </tr></thead>
        <tbody>{attachments.length ? attachments.map(attachment => <tr key={attachment.id} className="h-10 text-slate-700 odd:bg-white even:bg-slate-50/70">
          <td className="border border-slate-200 px-3">{attachment.name}</td>
          <td className="border border-slate-200 px-3">{attachment.type}</td>
          <td className="border border-slate-200 px-3">{attachment.customerVisible}</td>
          <td className="border border-slate-200 px-3">{attachment.fileSize}</td>
          <td className="border border-slate-200 px-3">{attachment.uploadedBy}</td>
          <td className="border border-slate-200 px-3 font-mono text-slate-500">{attachment.uploadedAt}</td>
          <td className="border border-slate-200 px-3">
            <button type="button" onClick={() => onEdit(attachment)} className="mr-3 font-bold text-[#004bb1] hover:underline">编辑</button>
            <button type="button" onClick={() => onDownload(attachment)} className="mr-3 font-bold text-[#004bb1] hover:underline">下载</button>
            <button type="button" onClick={() => onDelete(attachment)} className="font-bold text-red-500 hover:underline">删除</button>
          </td>
        </tr>) : <tr><td colSpan={7} className="h-24 border border-slate-200 text-center text-slate-300"><FileText className="mx-auto mb-2 h-8 w-8 text-slate-200" />暂无附件</td></tr>}</tbody>
      </table>
    </div>
  </>;
}

export function DetailAttachmentEditor({ titleId, radioName, editing, form, readingFile, onRead, onRemoveFile, onChange, onCancel, onSave }: {
  titleId: string;
  radioName: string;
  editing: boolean;
  form: AttachmentForm;
  readingFile: boolean;
  onRead: (file?: File) => void;
  onRemoveFile: () => void;
  onChange: (patch: Partial<AttachmentForm>) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  return <section className="mc-intercept-attachment-modal" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
    <header><h2 id={titleId}>{editing ? '编辑附件' : '上传附件'}</h2><button type="button" onClick={onCancel} className="mc-intercept-close" aria-label="关闭附件弹窗">×</button></header>
    <div className="space-y-5 px-10 py-6 text-xs text-slate-700">
      <div className="flex items-start gap-3">
        <span className="w-24 shrink-0 pt-2 text-right font-bold text-slate-900"><span className="text-red-500">* </span>文件附件：</span>
        <div className="min-w-0 flex-1">
          <label className="inline-flex h-8 cursor-pointer items-center rounded bg-[#004bb1] px-5 text-xs font-bold text-white hover:bg-[#003b91]">点击上传<input type="file" className="hidden" aria-label="文件附件" onChange={event => { onRead(event.target.files?.[0]); event.currentTarget.value = ''; }} /></label>
          <div className="mt-3 text-[11px] text-slate-500">文件大小不超过3MB</div>
          <div className="mt-2 text-[11px] font-semibold text-red-500">若为报关件资料，文件类型请选择“报关资料”</div>
          {form.fileName && <div className="mt-3 flex items-center gap-2 rounded border border-slate-200 bg-slate-50 px-3 py-2"><span className="min-w-0 flex-1 truncate">{form.fileName}</span><span className="text-slate-400">{form.fileSize || '-'}</span><button type="button" onClick={onRemoveFile} className="font-bold text-red-500 hover:underline">删除</button></div>}
        </div>
      </div>
      <label className="flex items-center gap-3"><span className="w-24 shrink-0 text-right font-bold text-slate-900"><span className="text-red-500">* </span>文件类型：</span><select className="h-8 min-w-0 flex-1 rounded border border-slate-300 bg-white px-2 text-xs text-slate-700 outline-none focus:border-[#004bb1] focus:ring-1 focus:ring-[#004bb1]" value={form.type} onChange={event => onChange({ type: event.target.value })}>{ATTACHMENT_TYPES.map(type => <option key={type}>{type}</option>)}</select></label>
      <div className="flex items-center gap-3"><span className="w-24 shrink-0 text-right font-bold text-slate-900"><span className="text-red-500">* </span>客户是否可见：</span>{(['不可见', '可见'] as const).map(option => <label key={option} className="flex items-center gap-1.5"><input type="radio" name={radioName} checked={form.customerVisible === option} onChange={() => onChange({ customerVisible: option })} className="h-3.5 w-3.5 text-blue-600" /><span>{option}</span></label>)}</div>
    </div>
    <footer><button type="button" onClick={onCancel} className="rounded border border-slate-300 bg-white px-7 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">取消</button><button type="button" disabled={readingFile} onClick={onSave} className="rounded bg-blue-600 px-7 py-1.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50">{readingFile ? '读取中' : '确定'}</button></footer>
  </section>;
}

export function DetailAttachmentDeleteDialog({ titleId, name, onCancel, onConfirm }: {
  titleId: string;
  name: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return <section className="mc-intercept-attachment-modal mc-intercept-attachment-delete-modal" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
    <header><h2 id={titleId}>删除附件</h2><button type="button" onClick={onCancel} className="mc-intercept-close" aria-label="关闭删除附件弹窗">×</button></header>
    <div className="px-10 py-8 text-center text-sm text-slate-800">确定删除附件“{name}”吗？</div>
    <footer><button type="button" onClick={onCancel} className="rounded border border-slate-300 bg-white px-6 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">取消</button><button type="button" onClick={onConfirm} className="rounded bg-blue-600 px-6 py-1.5 text-xs font-bold text-white hover:bg-blue-700">确定</button></footer>
  </section>;
}
