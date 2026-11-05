import type { WaybillAttachment } from '../types';

export const WAYBILL_ATTACHMENT_STORAGE_PREFIX = 'tiantu-waybill-attachments-v1:';

function validAttachment(value: unknown): value is WaybillAttachment {
  if (!value || typeof value !== 'object') return false;
  const attachment = value as WaybillAttachment;
  return typeof attachment.id === 'string' && !!attachment.id.trim()
    && typeof attachment.name === 'string' && !!attachment.name.trim()
    && typeof attachment.type === 'string'
    && typeof attachment.size === 'number' && Number.isFinite(attachment.size) && attachment.size >= 0
    && typeof attachment.uploadedAt === 'string'
    && (attachment.dataUrl === undefined || typeof attachment.dataUrl === 'string' && attachment.dataUrl.startsWith('data:'))
    && (attachment.category === undefined || typeof attachment.category === 'string')
    && (attachment.uploadedBy === undefined || typeof attachment.uploadedBy === 'string')
    && (attachment.customerVisible === undefined || ['可见', '不可见'].includes(attachment.customerVisible));
}

function validAttachments(value: unknown): value is WaybillAttachment[] {
  return Array.isArray(value) && value.every(validAttachment)
    && new Set(value.map(attachment => attachment.id)).size === value.length;
}

export function loadWaybillAttachments(waybillId: string, fallback: WaybillAttachment[] = []): WaybillAttachment[] {
  try {
    const raw = localStorage.getItem(WAYBILL_ATTACHMENT_STORAGE_PREFIX + waybillId);
    if (raw !== null) {
      const saved: unknown = JSON.parse(raw);
      if (validAttachments(saved)) return saved.map(attachment => ({ ...attachment }));
    }
  } catch { /* Preserve existing waybill data if local storage is unavailable. */ }
  return fallback.map(attachment => ({ ...attachment }));
}

export function saveWaybillAttachments(waybillId: string, attachments: WaybillAttachment[]): void {
  if (!waybillId.trim() || !validAttachments(attachments)) throw new Error('附件信息无效，请重新上传');
  // Write before updating the screen so a quota error cannot appear to save successfully.
  localStorage.setItem(WAYBILL_ATTACHMENT_STORAGE_PREFIX + waybillId, JSON.stringify(attachments));
}
