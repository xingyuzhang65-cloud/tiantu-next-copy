import { buildInstructionDetail } from './instructionDetailData';
import type { InstructionFeeRow } from './instructionDetailData';
import type { InstructionListRow } from './instructionListTypes';
import { isInstructionTrackingEvent, type InstructionTrackingEvent } from './instructionTracking';

export interface InstructionAttachment {
  id: string; name: string; type: string; customerVisible: '可见' | '不可见';
  fileSize: string; uploadedBy: string; uploadedAt: string; dataUrl: string;
}
export interface InstructionWaybillFields {
  shipmentId: string; referenceId: string; scheduledAt: string; remark: string;
}
export interface InstructionDetailState {
  fees: InstructionFeeRow[]; feesEdited: boolean; attachments: InstructionAttachment[];
  customerNote: string; internalRemark: string; failureReason: string; updatedAt?: string;
  waybillInfo?: InstructionWaybillFields;
  boxSelectionMode?: '指定' | '随机';
  cargoTransferNumbers?: Record<string, string>;
  cargoTransferOrder?: string[];
  trackingEvents?: InstructionTrackingEvent[];
}
type StoredDetail = InstructionDetailState & { instructionNo: string; waybill: string };
export const INSTRUCTION_DETAIL_STORAGE_KEY = 'tiantu-instruction-details-v1';
const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

function validScheduledAt(value: string): boolean {
  if (value === '') return true;
  const parts = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?)?$/.exec(value);
  if (!parts) return false;
  const [,yearText,monthText,dayText,hourText,minuteText,secondText] = parts;
  const year = Number(yearText), month = Number(monthText), day = Number(dayText);
  const days = [31,year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28,31,30,31,30,31,31,30,31,30,31];
  return year > 0 && month >= 1 && month <= 12 && day >= 1 && day <= days[month - 1]
    && (hourText === undefined || Number(hourText) <= 23 && Number(minuteText) <= 59 && Number(secondText || 0) <= 59);
}
function validWaybillFields(value: InstructionWaybillFields): boolean {
  return !!value && typeof value === 'object' && !Array.isArray(value)
    && ['shipmentId','referenceId','scheduledAt','remark'].every(key => typeof value[key as keyof InstructionWaybillFields] === 'string')
    && validScheduledAt(value.scheduledAt);
}
function normalizedWaybillFields(value: InstructionWaybillFields): InstructionWaybillFields {
  return {shipmentId:value.shipmentId,referenceId:value.referenceId,scheduledAt:value.scheduledAt,remark:value.remark};
}

function validFee(fee: InstructionFeeRow): boolean {
  return !!fee && ['id','name','type','unit','currency','billingTime','addedAt','addedBy','remark'].every(key => typeof fee[key as keyof InstructionFeeRow] === 'string')
    && !!fee.name.trim() && !!fee.unit.trim() && !!fee.currency.trim()
    && (fee.instructionRemark === undefined || typeof fee.instructionRemark === 'string')
    && (fee.status === undefined || typeof fee.status === 'string')
    && (fee.images === undefined || Array.isArray(fee.images) && fee.images.every(image => !!image
      && typeof image.id === 'string' && typeof image.name === 'string'
      && (image.dataUrl === undefined || typeof image.dataUrl === 'string')))
    && [fee.unitPrice,fee.quantity,fee.exchangeRate].every(value => typeof value === 'number' && Number.isFinite(value) && value >= 0)
    && fee.exchangeRate > 0 && Number.isFinite(fee.unitPrice * fee.quantity * fee.exchangeRate);
}
function normalizedFee(fee: InstructionFeeRow): InstructionFeeRow {
  return {...fee,...(fee.images === undefined ? {} : {images:fee.images.map(image => ({...image}))}),
    originalAmount:roundMoney(fee.unitPrice * fee.quantity),rmbAmount:roundMoney(fee.unitPrice * fee.quantity * fee.exchangeRate)};
}
function validAttachment(item: InstructionAttachment): boolean {
  return !!item && ['id','name','type','fileSize','uploadedBy','uploadedAt','dataUrl'].every(key => typeof item[key as keyof InstructionAttachment] === 'string')
    && !!item.name.trim() && ['可见','不可见'].includes(item.customerVisible) && /^data:[^,]*;base64,/.test(item.dataUrl);
}
function validState(value: InstructionDetailState): boolean {
  return !!value && Array.isArray(value.fees) && value.fees.every(validFee) && Number.isFinite(getInstructionFeeTotal(value.fees)) && new Set(value.fees.map(fee => fee.id)).size === value.fees.length
    && typeof value.feesEdited === 'boolean' && Array.isArray(value.attachments) && value.attachments.every(validAttachment)
    && new Set(value.attachments.map(file => file.id)).size === value.attachments.length
    && ['customerNote','internalRemark','failureReason'].every(key => typeof value[key as keyof InstructionDetailState] === 'string')
    && (value.updatedAt === undefined || typeof value.updatedAt === 'string')
    && (value.waybillInfo === undefined || validWaybillFields(value.waybillInfo))
    && (value.boxSelectionMode === undefined || ['指定','随机'].includes(value.boxSelectionMode))
    && (value.cargoTransferNumbers === undefined || !!value.cargoTransferNumbers && typeof value.cargoTransferNumbers === 'object'
      && !Array.isArray(value.cargoTransferNumbers) && Object.entries(value.cargoTransferNumbers).every(([id,number]) => !!id.trim() && typeof number === 'string' && number.length <= 200))
    && (value.cargoTransferOrder === undefined || Array.isArray(value.cargoTransferOrder)
      && value.cargoTransferOrder.every(id=>typeof id==='string'&&!!value.cargoTransferNumbers?.[id]?.trim())
      && new Set(value.cargoTransferOrder).size===value.cargoTransferOrder.length)
    && (value.trackingEvents === undefined || Array.isArray(value.trackingEvents) && value.trackingEvents.every(isInstructionTrackingEvent)
      && new Set(value.trackingEvents.map(event => event.id)).size === value.trackingEvents.length);
}
function readStored(row: InstructionListRow): StoredDetail | null {
  try {
    const entries = JSON.parse(localStorage.getItem(INSTRUCTION_DETAIL_STORAGE_KEY) || '{}') as Record<string,StoredDetail>;
    for(const key of [row.instructionNo,row.legacyInstructionNo].filter((key):key is string=>!!key)){
      const value=entries?.[key];
      if(validState(value)&&value.instructionNo===key&&value.waybill===row.waybill)return value;
    }
    return null;
  } catch { return null; }
}
export function loadInstructionDetail(row: InstructionListRow): InstructionDetailState {
  const saved = readStored(row);
  if (saved) return {fees:saved.fees.map(normalizedFee),feesEdited:saved.feesEdited,attachments:saved.attachments.map(file => ({...file})),
    customerNote:saved.customerNote,internalRemark:saved.internalRemark,failureReason:saved.failureReason,updatedAt:saved.updatedAt,
    ...(saved.waybillInfo === undefined ? {} : {waybillInfo:normalizedWaybillFields(saved.waybillInfo)}),
    ...(saved.boxSelectionMode === undefined ? {} : {boxSelectionMode:saved.boxSelectionMode}),
    ...(saved.cargoTransferNumbers === undefined ? {} : {cargoTransferNumbers:{...saved.cargoTransferNumbers}}),
    ...(saved.cargoTransferOrder === undefined ? {} : {cargoTransferOrder:[...saved.cargoTransferOrder]}),
    ...(saved.trackingEvents === undefined ? {} : {trackingEvents:saved.trackingEvents.map(event => ({...event}))})};
  return {fees:buildInstructionDetail(row).feeRows.map(normalizedFee),feesEdited:false,attachments:[],
    customerNote:row.customerNote || '',internalRemark:row.internalRemark || '',failureReason:row.failureReason || ''};
}
export function getInstructionFeeTotal(fees: InstructionFeeRow[]): number {
  return roundMoney(fees.reduce((sum,fee) => sum + normalizedFee(fee).rmbAmount,0));
}
export function saveInstructionDetail(row: InstructionListRow, state: InstructionDetailState): void {
  if (!validState(state)) throw new Error('请完整填写费用或附件信息，金额不可为负数且汇率须大于0');
  let entries: Record<string,StoredDetail> = {};
  try {
    const raw = JSON.parse(localStorage.getItem(INSTRUCTION_DETAIL_STORAGE_KEY) || '{}');
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) entries = raw;
  } catch { /* A broken detail cache does not affect instruction list data. */ }
  const next: StoredDetail = {instructionNo:row.instructionNo,waybill:row.waybill,
    fees:state.fees.map(normalizedFee),attachments:state.attachments.map(file => ({...file})),
    feesEdited:state.feesEdited,customerNote:state.customerNote,internalRemark:state.internalRemark,failureReason:state.failureReason,
    ...(state.waybillInfo === undefined ? {} : {waybillInfo:normalizedWaybillFields(state.waybillInfo)}),
    ...(state.boxSelectionMode === undefined ? {} : {boxSelectionMode:state.boxSelectionMode}),
    ...(state.cargoTransferNumbers === undefined ? {} : {cargoTransferNumbers:{...state.cargoTransferNumbers}}),
    ...(state.cargoTransferOrder === undefined ? {} : {cargoTransferOrder:[...state.cargoTransferOrder]}),
    ...(state.trackingEvents === undefined ? {} : {trackingEvents:state.trackingEvents.map(event => ({...event}))}),
    updatedAt:state.updatedAt || new Date().toLocaleString('sv-SE')};
  localStorage.setItem(INSTRUCTION_DETAIL_STORAGE_KEY,JSON.stringify({...entries,[row.instructionNo]:next}));
}
export function applyInstructionDetailOverrides(row: InstructionListRow): InstructionListRow {
  const saved = readStored(row);
  if (!saved) return row;
  return {...row,...(saved.feesEdited ? {fee:String(getInstructionFeeTotal(saved.fees))} : {}),
    boxSelectionMode:saved.boxSelectionMode||row.boxSelectionMode||'随机',
    ...(saved.cargoTransferNumbers === undefined ? {} : {transferNumbers:getCargoTransferNumbers(saved.cargoTransferNumbers,saved.cargoTransferOrder)}),
    ...(saved.waybillInfo === undefined ? {} : {shipment:saved.waybillInfo.shipmentId || '-',reference:saved.waybillInfo.referenceId || '-',
      scheduledAt:saved.waybillInfo.scheduledAt,waybillRemark:saved.waybillInfo.remark}),
    customerNote:saved.customerNote,internalRemark:saved.internalRemark,failureReason:saved.failureReason,
    updated:saved.updatedAt || row.updated};
}

export function getCargoTransferNumbers(numbers: Record<string,string>, order?: string[]): string[] {
  const latest=[...(order||Object.keys(numbers))].reverse().map(id=>numbers[id]?.trim()).find(Boolean);
  return latest?[latest]:[];
}

export function updateCargoTransferNumbers(state: InstructionDetailState, numbers: Record<string,string>, editedIds: string[]): InstructionDetailState {
  const normalized=Object.fromEntries(Object.entries(numbers).map(([id,number])=>[id,number.trim()]));
  const changed=Object.keys(normalized).filter(id=>normalized[id]&&(state.cargoTransferNumbers?.[id]||'').trim()!==normalized[id]);
  const previous=state.cargoTransferOrder||Object.keys(state.cargoTransferNumbers||{});
  const edits=[...new Set([...editedIds,...changed])].filter(id=>changed.includes(id));
  const order=[...previous.filter(id=>normalized[id]&&!changed.includes(id)),...edits];
  return {...state,cargoTransferNumbers:normalized,cargoTransferOrder:order};
}
