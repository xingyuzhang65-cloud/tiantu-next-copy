import type { InstructionListRow } from './instructionListTypes';

export type InstructionTrackingType = '正常运踪' | '异常运踪';

export interface InstructionTrackingEvent {
  id: string;
  occurredAt: string;
  operator: string;
  status: string;
  type?: InstructionTrackingType;
  country?: string;
}

function parseTime(value: string) {
  const parts = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?)?$/.exec(value.trim());
  if (!parts) return null;
  const [, yearText, monthText, dayText, hourText = '00', minuteText = '00', secondText = '00', fraction = '0'] = parts;
  const year = Number(yearText), month = Number(monthText), day = Number(dayText);
  const days = [31, year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > days[month - 1]
    || Number(hourText) > 23 || Number(minuteText) > 59 || Number(secondText) > 59) return null;
  const date = `${yearText}-${monthText}-${dayText}`;
  return { date, key: `${date}T${hourText}:${minuteText}:${secondText}.${fraction.padEnd(3, '0')}` };
}

export function isInstructionTrackingEvent(value: unknown): value is InstructionTrackingEvent {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const event = value as InstructionTrackingEvent;
  return (['id', 'occurredAt', 'operator', 'status'] as const).every(key => typeof event[key] === 'string'
    && !!event[key].trim()) && !!parseTime(event.occurredAt)
    && (event.type === undefined || event.type === '正常运踪' || event.type === '异常运踪')
    && (event.country === undefined || typeof event.country === 'string');
}

export function formatInstructionTrackingDate(value: string): string {
  const time = parseTime(value);
  if (!time) return '—';
  const weekday = new Date(`${time.date}T00:00:00Z`).getUTCDay();
  return `${time.date}（星期${['日', '一', '二', '三', '四', '五', '六'][weekday]}）`;
}

/** Keep actual instruction/arrival dates; fee and waybill edits are not shipment events. */
export function getInstructionTrackingEvents(row: InstructionListRow, additions: readonly InstructionTrackingEvent[] = []): InstructionTrackingEvent[] {
  const events: InstructionTrackingEvent[] = [];
  if (parseTime(row.created)) events.push({ id: `${row.id}:tracking-created`, occurredAt: row.created,
    operator: row.customer?.trim() && !['-', '—'].includes(row.customer.trim()) ? row.customer : '客户', status: '已下单' });
  if (row.arrived === '是' && parseTime(row.overseasTime)) events.push({ id: `${row.id}:tracking-arrived`, occurredAt: row.overseasTime,
    operator: '海外仓', status: '已入海外仓' });
  if (row.instructionType === '放货' && row.estimatedDeliveryAt && parseTime(row.estimatedDeliveryAt)) events.push({
    id: `${row.id}:tracking-estimated-delivery`, occurredAt: row.estimatedDeliveryAt, operator: '—', status: '预计送达时间',
  });
  events.push(...additions.filter(isInstructionTrackingEvent).map(event => ({ ...event })));
  return events.sort((a, b) => parseTime(a.occurredAt)!.key.localeCompare(parseTime(b.occurredAt)!.key));
}
