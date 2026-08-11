import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FileText } from 'lucide-react';
import OverseasFeeModal from './OverseasFeeModal';
import type { OverseasFeeEditableField } from './OverseasFeeModal';
import type { OverseasInterceptInstructionFee, OverseasInterceptRequest } from '../types';

type InterceptStatus = '待处理' | '拦截中' | '拦截成功' | '拦截失败' | '已取消';
type InterceptReconciliationStatus = '待核销' | '部分核销' | '已核销';
type CargoStatus = '未拆柜' | '已拆柜' | '已出库' | '暂存中';

interface InterceptLog {
  time: string;
  user: string;
  action: string;
  change: string;
  note: string;
}

interface InterceptFee {
  id: number;
  billingTime?: string;
  name: string;
  type: string;
  unit: string;
  exchangeRate?: number;
  unitPrice: number;
  quantity: number;
  currency: string;
  total: number;
  addedAt: string;
  addedBy: string;
  description: string;
  remark?: string;
}

type InterceptInstructionFee = OverseasInterceptInstructionFee;

interface InterceptTask {
  id: number;
  no: string;
  container: string;
  customer: string;
  waybillNo: string;
  customerOrderNo: string;
  latestTracking: string;
  cargoStatus: CargoStatus;
  inventoryStatus: string;
  outboundStatus: string;
  boxes: number;
  status: InterceptStatus;
  reconciliationStatus?: InterceptReconciliationStatus;
  reason: string;
  attachment: string;
  remark: string;
  applicant: string;
  appliedAt: string;
  handler: string;
  handleAt: string;
  failReason: string;
  actualBoxes: string;
  storageNo: string;
  resultRemark: string;
  fees: InterceptFee[];
  instructionFees?: InterceptInstructionFee[];
  valueAddedServices: string[];
  valueAddedRemark: string;
  warehouseRemark: string;
  customerNote: string;
  overseasWarehouseNote: string;
  internalRemark: string;
  attachments: string[];
  logs: InterceptLog[];
}

interface FilterState {
  no: string;
  container: string;
  customer: string;
  waybillNo: string;
  customerOrderNo: string;
  latestTracking: string;
  reconciliationStatus: string;
  dateFrom: string;
  dateTo: string;
}

interface OverseasWarehouseInterceptPageProps {
  addToast?: (text: string, type?: 'success' | 'info' | 'warning') => void;
  onOpenStorage?: (storageNo?: string) => void;
  incomingRequests?: OverseasInterceptRequest[];
}

const emptyFilters: FilterState = {
  no: '',
  container: '',
  customer: '',
  waybillNo: '',
  customerOrderNo: '',
  latestTracking: '',
  reconciliationStatus: '',
  dateFrom: '',
  dateTo: '',
};

const statusTabs: Array<InterceptStatus | '全部'> = ['待处理', '拦截中', '拦截成功', '拦截失败', '已取消', '全部'];
const tableHeaders = ['客户名称', '拦截单号', '运单号', '客户单号', '柜号', '最新运踪', '拦截原因', '拦截箱数', '指令费用', '核销状态', '客户备注', '内部备注', '申请人', '申请时间', '处理人', '处理时间', '操作'];

const initialTasks: InterceptTask[] = [
  {
    id: 1,
    no: '202608040001',
    container: 'WEMA1131231',
    customer: 'TTTX',
    waybillNo: 'YDH2026080401',
    customerOrderNo: 'CO-20260804-01',
    latestTracking: '2026-08-04 08:30 到达洛杉矶港，等待清关',
    cargoStatus: '未拆柜',
    inventoryStatus: '待拆柜',
    outboundStatus: '未出库',
    boxes: 11,
    status: '待处理',
    reconciliationStatus: '待核销',
    reason: '客户调整运输计划，申请暂缓出库',
    attachment: '拦截申请-20260804-01.pdf',
    remark: '等待客户确认新运输计划',
    applicant: '客服-张敏',
    appliedAt: '2026-08-04 09:18:22',
    handler: '',
    handleAt: '',
    failReason: '',
    actualBoxes: '',
    storageNo: '',
    resultRemark: '',
    fees: [
      { id: 1, name: '卸柜费', type: '操作费', unit: '箱', unitPrice: 15, quantity: 11, currency: '人民币', total: 165, addedAt: '2026-08-04 09:20:00', addedBy: '系统', description: '按箱计费' },
      { id: 2, name: '仓储费', type: '仓储费', unit: '票', unitPrice: 50, quantity: 1, currency: '人民币', total: 50, addedAt: '2026-08-04 09:20:00', addedBy: '系统', description: '暂存期间仓储费' },
    ],
    instructionFees: [{ code: 'FY202509260004', name: '拦截-免仓7天', type: '仓储费', unit: '票', price: '4', quantity: '1', currency: '人民币', exchangeRate: '1', description: '提柜入仓当天起算', addedAt: '2026-08-04 09:20:00', addedBy: '系统' }],
    valueAddedServices: ['拍照', '验货'],
    valueAddedRemark: '客户要求拍照确认货物外观',
    warehouseRemark: '货物状态良好，等待客户确认',
    customerNote: '请尽快处理拦截申请',
    overseasWarehouseNote: '优先处理，客户已催促',
    internalRemark: '需在8月7日前完成处理',
    attachments: ['拦截申请-20260804-01.pdf', '客户确认邮件.pdf'],
    logs: [{ time: '2026-08-04 09:18:22', user: '客服-张敏', action: '提交申请', change: '- -> 待处理', note: '客户申请拦截' }],
  },
  {
    id: 2,
    no: '202608040002',
    container: 'MSCU7654321',
    customer: 'ABC-US',
    waybillNo: 'YDH2026080402',
    customerOrderNo: 'CO-20260804-02',
    latestTracking: '2026-08-03 15:00 已入库美仓1号仓',
    cargoStatus: '已拆柜',
    inventoryStatus: '已入库',
    outboundStatus: '未出库',
    boxes: 4,
    status: '待处理',
    reconciliationStatus: '已核销',
    reason: '订单信息异常，客户要求暂缓处理',
    attachment: '-',
    remark: '请仓库优先确认货物位置',
    applicant: '客服-刘洋',
    appliedAt: '2026-08-04 10:06:15',
    handler: '',
    handleAt: '',
    failReason: '',
    actualBoxes: '',
    storageNo: '',
    resultRemark: '',
    fees: [
      { id: 3, name: '卸柜费', type: '操作费', unit: '箱', unitPrice: 12, quantity: 4, currency: '人民币', total: 48, addedAt: '2026-08-04 10:08:00', addedBy: '系统', description: '按箱计费' },
    ],
    valueAddedServices: ['贴标'],
    valueAddedRemark: '',
    warehouseRemark: '货物已入库，等待处理',
    customerNote: '订单信息待客户复核',
    overseasWarehouseNote: '',
    internalRemark: '',
    attachments: [],
    logs: [{ time: '2026-08-04 10:06:15', user: '客服-刘洋', action: '提交申请', change: '- -> 待处理', note: '订单信息待客户复核' }],
  },
  {
    id: 3,
    no: '202608030015',
    container: '8889990',
    customer: '23',
    waybillNo: 'YDH2026080303',
    customerOrderNo: 'CO-20260803-03',
    latestTracking: '2026-08-03 12:00 货物在库，拦截中',
    cargoStatus: '已拆柜',
    inventoryStatus: '已入库',
    outboundStatus: '未出库',
    boxes: 5,
    status: '拦截中',
    reconciliationStatus: '部分核销',
    reason: '客户申请暂停出库',
    attachment: '客户邮件截图.png',
    remark: '仓库正在核对货物位置',
    applicant: '客服-张敏',
    appliedAt: '2026-08-03 15:20:31',
    handler: '仓库-李明',
    handleAt: '2026-08-03 15:34:06',
    failReason: '',
    actualBoxes: '',
    storageNo: '',
    resultRemark: '',
    fees: [
      { id: 4, name: '拦截操作费', type: '操作费', unit: '票', unitPrice: 200, quantity: 1, currency: '人民币', total: 200, addedAt: '2026-08-03 15:35:00', addedBy: '仓库-李明', description: '拦截操作人工费' },
    ],
    instructionFees: [{ code: 'FY202509260005', name: '拦截-免仓8-90天', type: '仓储费', unit: '票', price: '3', quantity: '1', currency: '人民币', exchangeRate: '1', description: '按1级单价收取', addedAt: '2026-08-03 15:35:00', addedBy: '仓库-李明' }],
    valueAddedServices: ['测量尺寸', '拍照'],
    valueAddedRemark: '已确认货物状态',
    warehouseRemark: '货物在A01-05库位',
    customerNote: '调整出库计划中',
    overseasWarehouseNote: '',
    internalRemark: '重点客户订单，需优先处理',
    attachments: ['客户邮件截图.png'],
    logs: [
      { time: '2026-08-03 15:20:31', user: '客服-张敏', action: '提交申请', change: '- -> 待处理', note: '客户调整出库计划' },
      { time: '2026-08-03 15:34:06', user: '仓库-李明', action: '确认拦截', change: '待处理 -> 拦截中', note: '货物已入库，创建仓库拦截任务' },
    ],
  },
  {
    id: 4,
    no: '202608020009',
    container: 'CCCA1414141',
    customer: 'TTTX',
    waybillNo: 'YDH2026080204',
    customerOrderNo: 'CO-20260802-04',
    latestTracking: '2026-08-02 14:00 已转入暂存库位 A02-03',
    cargoStatus: '暂存中',
    inventoryStatus: '暂存',
    outboundStatus: '未出库',
    boxes: 2,
    status: '拦截成功',
    reconciliationStatus: '已核销',
    reason: '客户要求货物转入暂存',
    attachment: '拦截申请单.pdf',
    remark: '后续等待客户重新下单',
    applicant: '客服-周悦',
    appliedAt: '2026-08-02 11:03:44',
    handler: '仓库-王强',
    handleAt: '2026-08-02 13:46:20',
    failReason: '',
    actualBoxes: '2',
    storageNo: 'STG202608020001',
    resultRemark: '货物已转入 A02-03 暂存库位',
    fees: [
      { id: 5, name: '拦截操作费', type: '操作费', unit: '票', quantity: 1, unitPrice: 200, currency: '人民币', total: 200, addedAt: '2026-08-02 11:15:00', addedBy: '仓库-王强', description: '拦截操作费用' },
      { id: 6, name: '暂存仓储费', type: '仓储费', unit: '箱', quantity: 2, unitPrice: 30, currency: '人民币', total: 60, addedAt: '2026-08-02 13:47:00', addedBy: '系统', description: '暂存库位每日仓储费' },
    ],
    valueAddedServices: ['拍照', '验货', '重新打板'],
    valueAddedRemark: '完成打板后拍照确认',
    warehouseRemark: '已转入暂存库位A02-03',
    customerNote: '等待客户重新下单',
    overseasWarehouseNote: '',
    internalRemark: '',
    attachments: ['拦截申请单.pdf'],
    logs: [
      { time: '2026-08-02 11:03:44', user: '客服-周悦', action: '提交申请', change: '- -> 待处理', note: '客户申请进入暂存' },
      { time: '2026-08-02 11:14:18', user: '仓库-王强', action: '确认拦截', change: '待处理 -> 拦截中', note: '货物已入库' },
      { time: '2026-08-02 13:46:20', user: '仓库-王强', action: '拦截成功', change: '拦截中 -> 拦截成功', note: '实际拦截 2 箱，已生成暂存单 STG202608020001' },
    ],
  },
  {
    id: 5,
    no: '202608010004',
    container: 'TLLU2026072',
    customer: '23',
    waybillNo: 'YDH2026080105',
    customerOrderNo: 'CO-20260801-05',
    latestTracking: '2026-08-01 16:00 货物已完成出库，已送达',
    cargoStatus: '已出库',
    inventoryStatus: '无库存',
    outboundStatus: '已出库',
    boxes: 3,
    status: '拦截失败',
    reconciliationStatus: '已核销',
    reason: '客户临时要求取消发货',
    attachment: '-',
    remark: '',
    applicant: '客服-刘洋',
    appliedAt: '2026-08-01 16:32:09',
    handler: '系统',
    handleAt: '2026-08-01 16:32:10',
    failReason: '货物已完成出库',
    actualBoxes: '',
    storageNo: '',
    resultRemark: '',
    fees: [],
    valueAddedServices: [],
    valueAddedRemark: '',
    warehouseRemark: '货物已出库，无法拦截',
    customerNote: '',
    overseasWarehouseNote: '',
    internalRemark: '',
    attachments: [],
    logs: [
      { time: '2026-08-01 16:32:09', user: '客服-刘洋', action: '提交申请', change: '- -> 待处理', note: '客户要求取消发货' },
      { time: '2026-08-01 16:32:10', user: '系统', action: '状态校验', change: '待处理 -> 拦截失败', note: '货物已完成出库，无法执行拦截' },
    ],
  },
  {
    id: 6,
    no: '202607310018',
    container: 'AAAA0000000',
    customer: 'TTTX',
    waybillNo: 'YDH2026073106',
    customerOrderNo: 'CO-20260731-06',
    latestTracking: '2026-07-31 09:00 已取消，货物正常出库',
    cargoStatus: '已拆柜',
    inventoryStatus: '已入库',
    outboundStatus: '未出库',
    boxes: 4,
    status: '已取消',
    reconciliationStatus: '已核销',
    reason: '客户申请暂停发货',
    attachment: '-',
    remark: '客户已自行调整订单',
    applicant: '客服-周悦',
    appliedAt: '2026-07-31 09:11:48',
    handler: '客服-周悦',
    handleAt: '2026-07-31 09:32:24',
    failReason: '',
    actualBoxes: '',
    storageNo: '',
    resultRemark: '客户主动取消申请',
    fees: [],
    valueAddedServices: [],
    valueAddedRemark: '',
    warehouseRemark: '',
    customerNote: '客户已自行调整订单',
    overseasWarehouseNote: '',
    internalRemark: '',
    attachments: [],
    logs: [
      { time: '2026-07-31 09:11:48', user: '客服-周悦', action: '提交申请', change: '- -> 待处理', note: '客户申请暂停发货' },
      { time: '2026-07-31 09:32:24', user: '客服-周悦', action: '取消申请', change: '待处理 -> 已取消', note: '客户主动取消' },
    ],
  },
];

const nowText = () => new Date().toISOString().slice(0, 19).replace('T', ' ');

const getReconciliationStatus = (task: Pick<InterceptTask, 'reconciliationStatus' | 'fees' | 'instructionFees'>): InterceptReconciliationStatus => {
  if (task.reconciliationStatus) return task.reconciliationStatus;
  const feeCount = task.fees.length + (task.instructionFees || []).length;
  if (feeCount === 0) return '已核销';
  return feeCount > 1 ? '部分核销' : '待核销';
};

let persistedInterceptTasks: InterceptTask[] | null = null;

const createInterceptTaskFromRequest = (request: OverseasInterceptRequest): InterceptTask => ({
  id: request.id,
  no: request.interceptNo,
  container: request.container || '-',
  customer: request.customer || '-',
  waybillNo: request.waybillNo,
  customerOrderNo: request.customerOrderNo || '-',
  latestTracking: '已创建海外拦截任务，等待仓库处理',
  cargoStatus: '暂存中',
  inventoryStatus: '待拦截',
  outboundStatus: '未出库',
  boxes: request.boxes || 1,
  status: '拦截中',
  reconciliationStatus: request.instructionFees?.length ? '待核销' : '已核销',
  reason: request.reason,
  attachment: request.attachmentName || '-',
  remark: '由运单页面提交，等待海外仓处理',
  applicant: '系统',
  appliedAt: request.createdAt,
  handler: '',
  handleAt: '',
  failReason: '',
  actualBoxes: String(request.boxes || 1),
  storageNo: '',
  resultRemark: '',
  fees: [],
  instructionFees: request.instructionFees || [],
  valueAddedServices: [],
  valueAddedRemark: '',
  warehouseRemark: '',
  customerNote: request.customerNote || '',
  overseasWarehouseNote: '',
  internalRemark: '',
  attachments: request.attachmentName ? [request.attachmentName] : [],
  logs: [{
    time: request.createdAt,
    user: '系统',
    action: '创建拦截任务',
    change: '- → 拦截中',
    note: '运单页面提交海外拦截申请',
  }],
});

function statusClass(status: InterceptStatus) {
  return {
    待处理: 'is-pending',
    拦截中: 'is-processing',
    拦截成功: 'is-success',
    拦截失败: 'is-failed',
    已取消: 'is-canceled',
  }[status];
}

function tabLabel(status: InterceptStatus | '全部') {
  if (status === '拦截中') return '处理中';
  if (status === '拦截成功') return '拦截成功';
  if (status === '拦截失败') return '拦截失败';
  if (status === '已取消') return '取消';
  return status;
}

function displayInterceptStatus(status: InterceptStatus) {
  return status === '拦截中' ? '处理中' : status;
}

function makeDownloadHref(task: InterceptTask) {
  return `data:text/plain;charset=utf-8,${encodeURIComponent(`拦截单号: ${task.no}\n拦截原因: ${task.reason}\n附件名称: ${task.attachment}\n`)}`;
}

const interceptDetailTabs = ['货箱信息', '费用信息', '其它信息'] as const;
type InterceptDetailTab = (typeof interceptDetailTabs)[number];

type InterceptFeeDraft = {
  id: number;
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

type InterceptAttachmentRow = {
  id: string;
  name: string;
  type: string;
  customerVisible: '可见' | '不可见';
  fileSize: string;
  uploadedBy: string;
  uploadedAt: string;
  file?: File;
};

type InterceptAttachmentFormState = {
  fileName: string;
  fileSize: string;
  type: string;
  customerVisible: '可见' | '不可见';
};

const interceptAttachmentTypeOptions = ['POD', 'ISA', '报关资料', '底单', '其他', '其它', '税金单', '递延资料', '提单'];
const emptyInterceptAttachmentForm: InterceptAttachmentFormState = {
  fileName: '',
  fileSize: '',
  type: '其他',
  customerVisible: '可见',
};

interface InterceptCargoRow {
  boxNo: string;
  customerLines: string[];
  pickingLines: string[];
  returnNo: string;
  status: string;
  note: string;
}

function getInterceptCargoRows(task: InterceptTask): InterceptCargoRow[] {
  const count = Math.max(1, Number(task.actualBoxes || task.boxes || 1));
  const totalRows = Math.min(count, 12);
  const boxPrefix = task.container || task.no;
  const currentStatus = task.status === '拦截成功'
    ? '已转暂存'
    : task.status === '拦截中'
      ? '拦截处理中'
      : task.status === '拦截失败'
        ? '拦截失败'
        : task.status === '已取消'
          ? '已取消'
          : '待确认';

  return Array.from({ length: totalRows }, (_, index) => {
    const boxIndex = index + 1;
    const boxWeight = (0.28 + index * 0.07).toFixed(3);
    const boxRealWeight = (7.5 + index * 1.35).toFixed(1);

    return {
      boxNo: `${boxPrefix}-${String(boxIndex).padStart(2, '0')}`,
      customerLines: [
        `客户：${task.customer}`,
        `拦截单：${task.no}`,
      ],
      pickingLines: [
        `系统拣货 ${boxIndex}/${count}`,
        `材重 ${boxWeight} / 实重 ${boxRealWeight}`,
      ],
      returnNo: task.storageNo || '-',
      status: currentStatus,
      note: task.resultRemark || task.remark || task.reason,
    };
  });
}

function getInterceptAttachmentRows(task: InterceptTask): InterceptAttachmentRow[] {
  const names = task.attachments.length > 0
    ? task.attachments
    : (task.attachment && task.attachment !== '-' ? [task.attachment] : []);
  return names.map((name, index) => ({
    id: `INTERCEPT-ATT-${task.id}-${index}-${name}`,
    name,
    type: '其他',
    customerVisible: '可见',
    fileSize: '-',
    uploadedBy: task.handler || task.applicant || '系统',
    uploadedAt: task.appliedAt,
  }));
}

const parseInterceptFeeNumber = (value: string | number | undefined) => Number(String(value ?? '0').replace(/[^\d.-]/g, '')) || 0;

const formatInterceptFeeAmount = (value: number) => value.toFixed(2);

const getInterceptFeeOriginalAmount = (fee: Pick<InterceptFee, 'unitPrice' | 'quantity'>) =>
  parseInterceptFeeNumber(fee.unitPrice) * parseInterceptFeeNumber(fee.quantity);

const getInterceptFeeRmbAmount = (fee: Pick<InterceptFee, 'unitPrice' | 'quantity' | 'exchangeRate'>) =>
  getInterceptFeeOriginalAmount(fee) * parseInterceptFeeNumber(fee.exchangeRate ?? 1);

const createInterceptFeeDraft = (fee: InterceptFee): InterceptFeeDraft => ({
  id: fee.id,
  billingTime: fee.billingTime || fee.addedAt,
  name: fee.name,
  type: fee.type,
  unit: fee.unit,
  exchangeRate: String(fee.exchangeRate ?? 1),
  unitPrice: String(fee.unitPrice),
  quantity: String(fee.quantity),
  currency: fee.currency,
  remark: fee.remark || fee.description || '',
});

const createEmptyInterceptFeeDraft = (): InterceptFeeDraft => ({
  id: Date.now() + Math.floor(Math.random() * 1000),
  billingTime: nowText(),
  name: '',
  type: '操作费',
  unit: '票',
  exchangeRate: '1',
  unitPrice: '0',
  quantity: '1',
  currency: '人民币',
  remark: '',
});

const formatInstructionFeeAmount = (value: number) => Number(value.toFixed(2)).toString();
const formatInstructionFeeCurrency = (currency: string) => {
  const normalized = currency.trim().toUpperCase();
  if (currency === '人民币' || normalized === 'RMB' || normalized === 'CNY') return 'CNY';
  if (currency === '美元' || normalized === 'USD') return 'USD';
  return normalized || 'CNY';
};
const formatInstructionFee = (row: InterceptInstructionFee) => {
  const quantity = parseInterceptFeeNumber(row.quantity || '1') || 1;
  const total = parseInterceptFeeNumber(row.price) * quantity;
  return `${formatInstructionFeeAmount(total)} ${formatInstructionFeeCurrency(row.currency)} ${row.name} (${row.price}/${row.unit})`;
};

const hasUnreconciledInstructionFee = (task: InterceptTask) =>
  (task.instructionFees || []).length > 0 && getReconciliationStatus(task) !== '已核销';

const unreconciledInstructionFeePrompt = '所选运单包含未核销或部分核销的指令费用。是否仍要拦截？';

type CancelReasonContext = {
  mode: 'single' | 'batch';
  taskIds: number[];
};

export default function OverseasWarehouseInterceptPage({ addToast, onOpenStorage, incomingRequests = [] }: OverseasWarehouseInterceptPageProps) {
  const [tasks, setTasks] = useState<InterceptTask[]>(() => persistedInterceptTasks || initialTasks);
  const [draftFilters, setDraftFilters] = useState<FilterState>(emptyFilters);
  const [filters, setFilters] = useState<FilterState>(emptyFilters);
  const [activeTab, setActiveTab] = useState<InterceptStatus | '全部'>('全部');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [detailTaskId, setDetailTaskId] = useState<number | null>(null);
  const [logTaskId, setLogTaskId] = useState<number | null>(null);
  const [detailMode, setDetailMode] = useState<'view' | 'process'>('view');
  const [detailContentTab, setDetailContentTab] = useState<InterceptDetailTab>('货箱信息');
  const [feedbackMode, setFeedbackMode] = useState<'success' | 'failure' | ''>('');
  const [actualBoxes, setActualBoxes] = useState('1');
  const [feedbackNote, setFeedbackNote] = useState('');
  const [feedbackFailureReason, setFeedbackFailureReason] = useState('');
  const [editingRemarkId, setEditingRemarkId] = useState<number | null>(null);
  const [editingRemarkField, setEditingRemarkField] = useState<'customer' | 'internal'>('internal');
  const [editRemarkValue, setEditRemarkValue] = useState('');
  const [cancelReasonOpen, setCancelReasonOpen] = useState(false);
  const [cancelReasonContext, setCancelReasonContext] = useState<CancelReasonContext>({ mode: 'single', taskIds: [] });
  const [cancelReason, setCancelReason] = useState('');
  const [batchSuccessOpen, setBatchSuccessOpen] = useState(false);
  const [batchSuccessNote, setBatchSuccessNote] = useState('');
  const [batchFailureOpen, setBatchFailureOpen] = useState(false);
  const [batchFailureReason, setBatchFailureReason] = useState('');
  const [batchFailureNote, setBatchFailureNote] = useState('');
  const selectAllRef = useRef<HTMLInputElement>(null);
  const [showFeeModal, setShowFeeModal] = useState(false);
  const [feeDraftRows, setFeeDraftRows] = useState<InterceptFeeDraft[]>([]);
  const [feeFocusId, setFeeFocusId] = useState<number | null>(null);
  const [attachmentRowsByTask, setAttachmentRowsByTask] = useState<Record<number, InterceptAttachmentRow[]>>({});
  const [showAttachmentModal, setShowAttachmentModal] = useState(false);
  const [editingAttachment, setEditingAttachment] = useState<InterceptAttachmentRow | null>(null);
  const [deletingAttachment, setDeletingAttachment] = useState<InterceptAttachmentRow | null>(null);
  const [attachmentForm, setAttachmentForm] = useState<InterceptAttachmentFormState>({ ...emptyInterceptAttachmentForm });
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);

  const customers = useMemo(() => Array.from(new Set(tasks.map((task) => task.customer))), [tasks]);
  const detailTask = detailTaskId ? tasks.find((task) => task.id === detailTaskId) || null : null;
  const logTask = logTaskId ? tasks.find((task) => task.id === logTaskId) || null : null;
  const editingRemarkTask = editingRemarkId ? tasks.find((task) => task.id === editingRemarkId) || null : null;
  const detailAttachmentRows = detailTask
    ? (attachmentRowsByTask[detailTask.id] || getInterceptAttachmentRows(detailTask))
    : [];
  const detailFeeOriginalTotal = detailTask?.fees.reduce((sum, fee) => sum + getInterceptFeeOriginalAmount(fee), 0) || 0;
  const detailFeeRmbTotal = detailTask?.fees.reduce((sum, fee) => sum + getInterceptFeeRmbAmount(fee), 0) || 0;
  const openFeeModal = (focusId: number | null = null) => {
    if (!detailTask) return;
    setFeeDraftRows(detailTask.fees.map((fee) => createInterceptFeeDraft(fee)));
    setFeeFocusId(focusId);
    setShowFeeModal(true);
  };

  const closeFeeModal = () => {
    setShowFeeModal(false);
    setFeeDraftRows([]);
    setFeeFocusId(null);
  };

  const updateFeeDraftRow = (draftId: number, field: OverseasFeeEditableField, value: string) => {
    setFeeDraftRows((rows) => rows.map((row) => {
      if (row.id !== draftId) return row;
      if (field === 'currency') {
        return {
          ...row,
          currency: value,
          exchangeRate: value === '人民币' ? '1' : (row.exchangeRate === '1' ? '7.1' : row.exchangeRate),
        };
      }
      return { ...row, [field]: value };
    }));
  };

  const addFeeDraftRow = () => {
    setFeeDraftRows((rows) => [...rows, createEmptyInterceptFeeDraft()]);
  };

  const removeFeeDraftRow = (draftId: number) => {
    setFeeDraftRows((rows) => rows.filter((row) => row.id !== draftId));
  };

  const saveFeeDraftRows = () => {
    if (!detailTask) return;
    const confirmedAt = nowText();
    const nextFees: InterceptFee[] = feeDraftRows.map((row, index) => {
      const existingFee = detailTask.fees.find((fee) => fee.id === row.id);
      const originalAmount = parseInterceptFeeNumber(row.unitPrice) * parseInterceptFeeNumber(row.quantity);
      const exchangeRate = parseInterceptFeeNumber(row.exchangeRate || 1) || 1;
      const rmbAmount = originalAmount * exchangeRate;
      return {
        id: row.id,
        billingTime: row.billingTime.trim() || existingFee?.billingTime || existingFee?.addedAt || confirmedAt,
        name: row.name.trim() || `费用${index + 1}`,
        type: row.type.trim() || '其他',
        unit: row.unit.trim() || '票',
        exchangeRate,
        unitPrice: parseInterceptFeeNumber(row.unitPrice),
        quantity: parseInterceptFeeNumber(row.quantity) || 1,
        currency: row.currency,
        total: rmbAmount,
        addedAt: existingFee?.addedAt || confirmedAt,
        addedBy: existingFee?.addedBy || '仓库-李明',
        description: row.remark.trim(),
        remark: row.remark.trim(),
      };
    });
    updateTask(detailTask.id, (task) => ({ ...task, fees: nextFees }));
    addToast?.('费用信息已保存', 'success');
    closeFeeModal();
  };

  const filteredTasks = useMemo(() => tasks.filter((task) => {
    const matchText = (value: string, query: string) => !query || value.toLowerCase().includes(query.toLowerCase());
    return (activeTab === '全部' || task.status === activeTab)
      && matchText(task.no, filters.no)
      && matchText(task.container, filters.container)
      && matchText(task.waybillNo, filters.waybillNo)
      && matchText(task.customerOrderNo, filters.customerOrderNo)
      && matchText(task.latestTracking, filters.latestTracking)
      && (!filters.reconciliationStatus || getReconciliationStatus(task) === filters.reconciliationStatus)
      && (!filters.customer || task.customer === filters.customer)
      && (!filters.dateFrom || task.appliedAt.slice(0, 10) >= filters.dateFrom)
      && (!filters.dateTo || task.appliedAt.slice(0, 10) <= filters.dateTo);
  }), [activeTab, filters, tasks]);

  const visiblePending = filteredTasks.filter((task) => task.status === '待处理');
  const visibleProcessing = filteredTasks.filter((task) => task.status === '拦截中');
  const selectedVisible = filteredTasks.filter((task) => selectedIds.includes(task.id));
  const selectedPendingCount = visiblePending.filter((task) => selectedIds.includes(task.id)).length;
  const selectedProcessingCount = visibleProcessing.filter((task) => selectedIds.includes(task.id)).length;
  const isPendingView = activeTab === '待处理';
  const isProcessingView = activeTab === '拦截中';

  const updateDraftFilter = (key: keyof FilterState, value: string) => {
    setDraftFilters((prev) => ({ ...prev, [key]: value }));
  };

  const appendLog = (task: InterceptTask, action: string, note: string, user = '仓库-李明', nextStatus: InterceptStatus = task.status): InterceptTask => {
    const stamp = nowText();
    return {
      ...task,
      status: nextStatus,
      handler: user,
      handleAt: stamp,
      logs: [...task.logs, { time: stamp, user, action, change: `${task.status} → ${nextStatus}`, note }],
    };
  };

  const pushLog = (task: InterceptTask, nextStatus: InterceptStatus, action: string, note: string, user = '仓库-李明'): InterceptTask =>
    appendLog(task, action, note, user, nextStatus);

  const updateTask = (taskId: number, updater: (task: InterceptTask) => InterceptTask) => {
    setTasks((list) => list.map((task) => (task.id === taskId ? updater(task) : task)));
  };

  const closeAttachmentModal = () => {
    setShowAttachmentModal(false);
    setEditingAttachment(null);
    setAttachmentForm({ ...emptyInterceptAttachmentForm });
    setAttachmentFile(null);
  };

  const openAttachmentModal = (row?: InterceptAttachmentRow) => {
    setEditingAttachment(row || null);
    setAttachmentForm(row
      ? {
          fileName: row.name,
          fileSize: row.fileSize,
          type: row.type,
          customerVisible: row.customerVisible,
        }
      : { ...emptyInterceptAttachmentForm });
    setAttachmentFile(null);
    setShowAttachmentModal(true);
  };

  const handleAttachmentFileChange = (file?: File) => {
    if (!file) return;
    const sizeInMb = file.size / 1024 / 1024;
    setAttachmentFile(file);
    setAttachmentForm((prev) => ({
      ...prev,
      fileName: file.name,
      fileSize: sizeInMb >= 1 ? `${sizeInMb.toFixed(1)}MB` : `${Math.max(1, Math.round(file.size / 1024))}KB`,
    }));
  };

  const downloadAttachment = (row: InterceptAttachmentRow) => {
    if (row.file) {
      const url = URL.createObjectURL(row.file);
      const link = document.createElement('a');
      link.href = url;
      link.download = row.name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } else if (detailTask) {
      const link = document.createElement('a');
      link.href = makeDownloadHref({ ...detailTask, attachment: row.name });
      link.download = row.name;
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
    addToast?.(`已下载 ${row.name}`, 'success');
  };

  const saveAttachment = () => {
    if (!detailTask) return;
    const fileName = attachmentForm.fileName.trim();
    if (!fileName) {
      addToast?.('请先选择附件文件', 'warning');
      return;
    }

    const existingRows = detailAttachmentRows;
    const nextRows = editingAttachment
      ? existingRows.map((row) => (
          row.id === editingAttachment.id
            ? {
                ...row,
                name: fileName,
                type: attachmentForm.type,
                customerVisible: attachmentForm.customerVisible,
                fileSize: attachmentForm.fileSize || row.fileSize,
                file: attachmentFile || row.file,
              }
            : row
        ))
      : [
          ...existingRows,
          {
            id: `INTERCEPT-ATT-${detailTask.id}-${Date.now()}`,
            name: fileName,
            type: attachmentForm.type,
            customerVisible: attachmentForm.customerVisible,
            fileSize: attachmentForm.fileSize || '-',
            uploadedBy: '仓库-李明',
            uploadedAt: nowText(),
            file: attachmentFile || undefined,
          },
        ];

    setAttachmentRowsByTask((prev) => ({ ...prev, [detailTask.id]: nextRows }));
    updateTask(detailTask.id, (task) => ({
      ...task,
      attachments: nextRows.map((row) => row.name),
      attachment: nextRows[0]?.name || '-',
    }));
    closeAttachmentModal();
    addToast?.(editingAttachment ? '附件信息已更新' : '附件已上传', 'success');
  };

  const confirmDeleteAttachment = () => {
    if (!detailTask || !deletingAttachment) return;
    const nextRows = detailAttachmentRows.filter((row) => row.id !== deletingAttachment.id);
    setAttachmentRowsByTask((prev) => ({ ...prev, [detailTask.id]: nextRows }));
    updateTask(detailTask.id, (task) => ({
      ...task,
      attachments: nextRows.map((row) => row.name),
      attachment: nextRows[0]?.name || '-',
    }));
    setDeletingAttachment(null);
    addToast?.(`已删除附件 ${deletingAttachment.name}`, 'info');
  };

  const applyConfirm = (task: InterceptTask): InterceptTask => {
    if (task.status !== '待处理') return task;
    if (task.cargoStatus === '已出库') {
      return {
        ...pushLog(task, '拦截失败', '状态校验', '货物已完成出库，无法执行拦截', '系统'),
        failReason: '货物已完成出库',
        resultRemark: '系统校验货物已完成出库，无法执行拦截',
      };
    }
    return pushLog(task, '拦截中', '确认拦截', task.cargoStatus === '未拆柜' ? '货物未拆柜，已创建预报拦截任务' : '货物已入库，已创建仓库拦截任务');
  };

  const applyCancel = (task: InterceptTask, reason: string): InterceptTask => {
    if (task.status !== '待处理') return task;
    const nextRemark = task.remark ? `${task.remark}；取消原因：${reason}` : `取消原因：${reason}`;
    return {
      ...pushLog(task, '已取消', '取消申请', reason || '取消拦截申请', '客服-张敏'),
      remark: nextRemark,
      internalRemark: task.internalRemark || nextRemark,
      resultRemark: reason || '取消拦截申请',
    };
  };

  const makeSuccessfulIntercept = (task: InterceptTask, note: string): InterceptTask => {
    const actual = Number(task.actualBoxes || task.boxes);
    const storageNo = `STG${nowText().slice(0, 10).replaceAll('-', '')}${String(task.id).padStart(4, '0')}`;
    return {
      ...pushLog(task, '拦截成功', '拦截成功', `实际拦截 ${actual} 箱，已生成暂存单 ${storageNo}${note ? `；${note}` : ''}`),
      cargoStatus: '暂存中',
      inventoryStatus: '暂存',
      outboundStatus: '未出库',
      actualBoxes: String(actual),
      storageNo,
      resultRemark: note || '已完成货物拦截并转入暂存',
    };
  };

  const confirmTask = (taskId: number) => {
    const task = tasks.find((item) => item.id === taskId);
    if (!task || task.status !== '待处理') return;
    if (task.cargoStatus === '已出库') {
      updateTask(taskId, applyConfirm);
      window.alert('货物已出库，无法执行拦截');
      addToast?.('货物已出库，拦截失败', 'warning');
      return;
    }
    const prompt = hasUnreconciledInstructionFee(task)
      ? unreconciledInstructionFeePrompt
      : task.cargoStatus === '未拆柜'
        ? '当前货物未拆柜，确认执行拦截？'
        : '当前货物已入库，确认执行拦截？';
    if (!window.confirm(prompt)) return;
    updateTask(taskId, applyConfirm);
    addToast?.('拦截任务已确认', 'success');
  };

  const openCancelReason = (context: CancelReasonContext) => {
    setCancelReasonContext(context);
    setCancelReason('');
    setCancelReasonOpen(true);
  };

  const cancelTask = (taskId: number) => {
    const task = tasks.find((item) => item.id === taskId);
    if (!task || task.status !== '待处理') return;
    openCancelReason({ mode: 'single', taskIds: [taskId] });
  };

  const notifySelectionMissing = () => {
    addToast?.('请勾选运单', 'warning');
  };

  const handleBatchConfirm = () => {
    const taskIds = selectedPendingCount > 0
      ? visiblePending.filter((task) => selectedIds.includes(task.id)).map((task) => task.id)
      : [];
    if (!taskIds.length) {
      notifySelectionMissing();
      return;
    }
    const outboundCount = taskIds.filter((id) => tasks.find((task) => task.id === id)?.cargoStatus === '已出库').length;
    const containsUnreconciledInstructionFee = taskIds.some((id) => {
      const task = tasks.find((item) => item.id === id);
      return task ? hasUnreconciledInstructionFee(task) : false;
    });
    const message = containsUnreconciledInstructionFee
      ? unreconciledInstructionFeePrompt
      : outboundCount
        ? `确认批量确认选中的 ${taskIds.length} 条拦截申请吗？其中 ${outboundCount} 条货物已出库，将自动标记为拦截失败。`
        : `确认批量确认选中的 ${taskIds.length} 条拦截申请吗？`;
    if (!window.confirm(message)) return;
    setTasks((prev) => prev.map((task) => taskIds.includes(task.id) ? applyConfirm(task) : task));
    setSelectedIds([]);
    addToast?.('已批量确认拦截申请', 'success');
  };

  const handleBatchCancel = () => {
    const taskIds = visiblePending.filter((task) => selectedIds.includes(task.id)).map((task) => task.id);
    if (!taskIds.length) {
      notifySelectionMissing();
      return;
    }
    openCancelReason({ mode: 'batch', taskIds });
  };

  const openBatchSuccess = () => {
    if (!selectedProcessingCount) {
      notifySelectionMissing();
      return;
    }
    setBatchSuccessNote('');
    setBatchSuccessOpen(true);
  };

  const openBatchFailure = () => {
    if (!selectedProcessingCount) {
      notifySelectionMissing();
      return;
    }
    setBatchFailureReason('');
    setBatchFailureNote('');
    setBatchFailureOpen(true);
  };

  const startEditRemark = (task: InterceptTask, field: 'customer' | 'internal' = 'internal') => {
    setEditingRemarkId(task.id);
    setEditingRemarkField(field);
    setEditRemarkValue(field === 'customer' ? task.customerNote : task.remark || task.internalRemark || '');
  };

  const saveEditRemark = (taskId: number) => {
    const remark = editRemarkValue.trim();
    updateTask(taskId, (task) => {
      const previousRemark = editingRemarkField === 'customer' ? task.customerNote : task.remark || task.internalRemark || '';
      const updated = editingRemarkField === 'customer'
        ? { ...task, customerNote: remark }
        : { ...task, remark, internalRemark: remark };
      return {
        ...appendLog(updated, editingRemarkField === 'customer' ? '修改客户备注' : '修改内部备注', `"${previousRemark || '-'}" → "${remark || '-'}"`),
      };
    });
    setEditingRemarkId(null);
    setEditingRemarkField('internal');
    setEditRemarkValue('');
    addToast?.(`${editingRemarkField === 'customer' ? '客户备注' : '内部备注'}已更新`, 'success');
  };

  const cancelEditRemark = () => {
    setEditingRemarkId(null);
    setEditingRemarkField('internal');
    setEditRemarkValue('');
  };

  const openFeedback = (mode: 'success' | 'failure', task: InterceptTask = detailTask as InterceptTask) => {
    if (!task || task.status !== '拦截中') return;
    setActualBoxes(task.actualBoxes || String(task.boxes));
    setFeedbackNote('');
    setFeedbackFailureReason('');
    setFeedbackMode(mode);
  };

  const submitFeedback = (event: React.FormEvent) => {
    event.preventDefault();
    if (!detailTask || !feedbackMode) return;
    if (feedbackMode === 'success') {
      const actual = Number(actualBoxes);
      if (!actual || actual < 1 || actual > detailTask.boxes) {
        window.alert(`实际拦截箱数需在 1 到 ${detailTask.boxes} 之间`);
        return;
      }
      updateTask(detailTask.id, (task) => makeSuccessfulIntercept({ ...task, actualBoxes: String(actual) }, feedbackNote.trim()));
    } else {
      const reason = feedbackFailureReason.trim();
      if (!reason) {
        window.alert('请填写失败原因');
        return;
      }
      const note = feedbackNote.trim();
      updateTask(detailTask.id, (task) => ({
        ...pushLog(task, '拦截失败', '拦截失败', `${reason}${note ? `；${note}` : ''}`),
        failReason: reason,
        resultRemark: note || reason,
      }));
    }
    const completedMode = feedbackMode;
    setFeedbackMode('');
    setFeedbackNote('');
    setFeedbackFailureReason('');
    addToast?.(completedMode === 'success' ? '已提交拦截成功结果' : '已提交拦截失败结果', completedMode === 'success' ? 'success' : 'warning');
  };

  const submitCancelReason = () => {
    const reason = cancelReason.trim();
    if (!reason) {
      window.alert('请输入取消原因');
      return;
    }
    const taskIds = cancelReasonContext.taskIds;
    setTasks((prev) => prev.map((task) => taskIds.includes(task.id) ? applyCancel(task, reason) : task));
    setCancelReasonOpen(false);
    setCancelReason('');
    setCancelReasonContext({ mode: 'single', taskIds: [] });
    setSelectedIds((ids) => cancelReasonContext.mode === 'batch' ? ids.filter((id) => !taskIds.includes(id)) : ids.filter((id) => !taskIds.includes(id)));
    addToast?.(cancelReasonContext.mode === 'batch' ? '已批量取消拦截申请' : '拦截申请已取消', 'info');
  };

  const submitBatchSuccess = () => {
    const taskIds = visibleProcessing.filter((task) => selectedIds.includes(task.id)).map((task) => task.id);
    if (!taskIds.length) return;
    const note = batchSuccessNote.trim();
    setTasks((prev) => prev.map((task) => taskIds.includes(task.id) ? makeSuccessfulIntercept(task, note) : task));
    setBatchSuccessOpen(false);
    setBatchSuccessNote('');
    setSelectedIds([]);
    addToast?.('已批量提交拦截成功结果', 'success');
  };

  const submitBatchFailure = () => {
    const taskIds = visibleProcessing.filter((task) => selectedIds.includes(task.id)).map((task) => task.id);
    if (!taskIds.length) return;
    const reason = batchFailureReason.trim();
    if (!reason) {
      window.alert('请填写失败原因');
      return;
    }
    const note = batchFailureNote.trim();
    setTasks((prev) => prev.map((task) => taskIds.includes(task.id)
      ? {
          ...pushLog(task, '拦截失败', '拦截失败', `${reason}${note ? `；${note}` : ''}`),
          failReason: reason,
          resultRemark: note || reason,
        }
      : task));
    setBatchFailureOpen(false);
    setBatchFailureReason('');
    setBatchFailureNote('');
    setSelectedIds([]);
    addToast?.('已批量提交拦截失败结果', 'warning');
  };

  const exportTasks = () => {
    if (!selectedVisible.length) {
      notifySelectionMissing();
      return;
    }
    const headers = ['客户名称', '拦截单号', '运单号', '客户单号', '最新运踪', '拦截原因', '拦截箱数', '指令费用', '核销状态', '客户备注', '内部备注', '申请人', '申请时间', '处理人', '处理时间'];
    const rows = selectedVisible.map((task) => [
      task.customer, task.no, task.waybillNo, task.customerOrderNo, task.latestTracking,
      task.reason, task.actualBoxes || task.boxes, (task.instructionFees || []).map(formatInstructionFee).join('；'), getReconciliationStatus(task), task.customerNote || '', task.internalRemark || task.remark || '', task.applicant,
      task.appliedAt, task.handler || '', task.handleAt || '',
    ]);
    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `拦截管理_${activeTab}_${nowText().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    addToast?.(`已导出 ${selectedVisible.length} 条拦截记录`, 'success');
  };

  const openStorageDetails = (task: InterceptTask) => {
    if (onOpenStorage) {
      onOpenStorage(task.storageNo);
      return;
    }
    addToast?.(task.storageNo ? `正在打开暂存单 ${task.storageNo}` : '暂存详情已生成', 'info');
  };

  const allVisibleSelected = filteredTasks.length > 0 && filteredTasks.every((task) => selectedIds.includes(task.id));

  useEffect(() => {
    persistedInterceptTasks = tasks;
  }, [tasks]);

  useEffect(() => {
    if (incomingRequests.length === 0) return;
    const incomingTasks = incomingRequests.map(createInterceptTaskFromRequest);
    setTasks((currentTasks) => {
      const existingIds = new Set(currentTasks.map((task) => task.id));
      const newTasks = incomingTasks.filter((task) => !existingIds.has(task.id));
      return newTasks.length > 0 ? [...currentTasks, ...newTasks] : currentTasks;
    });
    setActiveTab('拦截中');
    setSelectedIds([]);
    setDraftFilters(emptyFilters);
    setFilters(emptyFilters);
  }, [incomingRequests]);

  useEffect(() => {
    if (!selectAllRef.current) return;
    selectAllRef.current.indeterminate = selectedVisible.length > 0 && selectedVisible.length < filteredTasks.length;
  }, [filteredTasks.length, selectedVisible.length, selectedIds]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (editingRemarkId !== null) {
        setEditingRemarkId(null);
        setEditRemarkValue('');
      } else if (deletingAttachment) {
        setDeletingAttachment(null);
      } else if (showAttachmentModal) {
        closeAttachmentModal();
      } else if (showFeeModal) {
        closeFeeModal();
      } else if (cancelReasonOpen) {
        setCancelReasonOpen(false);
      } else if (feedbackMode) {
        setFeedbackMode('');
      } else if (batchSuccessOpen) {
        setBatchSuccessOpen(false);
      } else if (batchFailureOpen) {
        setBatchFailureOpen(false);
      } else if (logTaskId !== null) {
        setLogTaskId(null);
      } else if (detailTaskId !== null) {
        setDetailTaskId(null);
        setDetailMode('view');
        setDetailContentTab('货箱信息');
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [batchFailureOpen, batchSuccessOpen, cancelReasonOpen, deletingAttachment, detailTaskId, editingRemarkId, feedbackMode, logTaskId, showAttachmentModal, showFeeModal]);

  return (
    <div className="mc-intercept-page">
      <section className="mc-filter-card mc-intercept-filter-card">
        <div className="mc-filter-grid mc-intercept-filter-grid">
          <label className="mc-filter-field"><span>拦截单号</span><input value={draftFilters.no} onChange={(e) => updateDraftFilter('no', e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') setFilters(draftFilters); }} placeholder="请输入拦截单号" /></label>
          <label className="mc-filter-field"><span>运单号</span><input value={draftFilters.waybillNo} onChange={(e) => updateDraftFilter('waybillNo', e.target.value)} placeholder="请输入运单号" /></label>
          <label className="mc-filter-field"><span>客户单号</span><input value={draftFilters.customerOrderNo} onChange={(e) => updateDraftFilter('customerOrderNo', e.target.value)} placeholder="请输入客户单号" /></label>
          <label className="mc-filter-field"><span>柜号</span><input value={draftFilters.container} onChange={(e) => updateDraftFilter('container', e.target.value)} placeholder="请输入柜号" /></label>
          <label className="mc-filter-field"><span>最新运踪</span><input value={draftFilters.latestTracking} onChange={(e) => updateDraftFilter('latestTracking', e.target.value)} placeholder="请输入运踪关键词" /></label>
          <label className="mc-filter-field"><span>客户名称</span><select value={draftFilters.customer} onChange={(e) => updateDraftFilter('customer', e.target.value)}><option value="">全部客户</option>{customers.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="mc-filter-field"><span>核销状态</span><select value={draftFilters.reconciliationStatus} onChange={(e) => updateDraftFilter('reconciliationStatus', e.target.value)}><option value="">全部状态</option><option value="待核销">待核销</option><option value="部分核销">部分核销</option><option value="已核销">已核销</option></select></label>
          <label className="mc-filter-field mc-intercept-date-filter"><span>申请时间</span><span className="mc-date-range"><input value={draftFilters.dateFrom} onChange={(e) => updateDraftFilter('dateFrom', e.target.value)} type="date" /><em>→</em><input value={draftFilters.dateTo} onChange={(e) => updateDraftFilter('dateTo', e.target.value)} type="date" /><b>□</b></span></label>
        </div>
        <div className="mc-filter-actions">
          <button className="mc-btn primary" type="button" onClick={() => setFilters(draftFilters)}>搜索</button>
          <button className="mc-btn" type="button" onClick={() => { setDraftFilters(emptyFilters); setFilters(emptyFilters); setSelectedIds([]); setActiveTab('全部'); }}>重置</button>
        </div>
      </section>

      <section className="mc-inventory-card mc-intercept-card">
        <div className="mc-status-bar">
          <div className="mc-status-tabs">
            {statusTabs.map((status) => {
              const count = status === '全部' ? tasks.length : tasks.filter((task) => task.status === status).length;
              return (
                <button key={status} className={`mc-status-tab ${activeTab === status ? 'active' : ''}`} type="button" onClick={() => { setActiveTab(status); setSelectedIds([]); }}>
                  {tabLabel(status)}({count})
                </button>
              );
            })}
          </div>
          <div className="mc-status-actions">
            {isPendingView && <button className="mc-btn" type="button" onClick={handleBatchCancel}>取消拦截</button>}
            {isPendingView && <button className="mc-btn primary" type="button" onClick={handleBatchConfirm}>确认拦截</button>}
            {isProcessingView && <button className="mc-btn primary" type="button" onClick={openBatchSuccess}>拦截成功</button>}
            {isProcessingView && <button className="mc-btn danger" type="button" onClick={openBatchFailure}>拦截失败</button>}
            <button className="mc-btn" type="button" onClick={exportTasks}>导出</button>
          </div>
        </div>
        <div className="mc-intercept-list-summary"><span>共 {filteredTasks.length} 条拦截任务</span><span>拦截成功后将自动生成暂存单</span></div>
        <div className="mc-table-scroll">
          <table className="mc-intercept-table">
            <thead>
              <tr>
                <th className="mc-intercept-check"><input ref={selectAllRef} type="checkbox" aria-label="全选拦截单" disabled={!filteredTasks.length} checked={allVisibleSelected} onChange={(e) => setSelectedIds(e.target.checked ? filteredTasks.map((task) => task.id) : [])} /></th>
                {tableHeaders.map((head) => <th key={head}>{head}</th>)}
              </tr>
            </thead>
            <tbody>
              {!filteredTasks.length ? (
                <tr className="mc-intercept-empty"><td colSpan={18}>暂无匹配的拦截任务</td></tr>
              ) : filteredTasks.map((task) => (
                <tr key={task.id}>
                  <td className="mc-intercept-check">
                    <input type="checkbox" checked={selectedIds.includes(task.id)} onChange={(e) => setSelectedIds((ids) => e.target.checked ? (ids.includes(task.id) ? ids : [...ids, task.id]) : ids.filter((id) => id !== task.id))} />
                  </td>
                  <td>{task.customer}</td>
                  <td title={task.no}>{task.no}</td>
                  <td title={task.waybillNo || '-'}>{task.waybillNo || '-'}</td>
                  <td title={task.customerOrderNo || '-'}>{task.customerOrderNo || '-'}</td>
                  <td title={task.container || '-'}>{task.container || '-'}</td>
                  <td title={task.latestTracking || '-'}>{task.latestTracking || '-'}</td>
                  <td title={task.reason}>{task.reason}</td>
                  <td>{task.actualBoxes || task.boxes}</td>
                  <td className="mc-intercept-instruction-fee-cell">
                    {(task.instructionFees || []).length > 0 ? (task.instructionFees || []).map((fee) => <div key={fee.code}>{formatInstructionFee(fee)}</div>) : '-'}
                  </td>
                  <td><span className={`mc-reconciliation-status mc-reconciliation-${getReconciliationStatus(task)}`}>{getReconciliationStatus(task)}</span></td>
                  <td className="mc-intercept-customer-note-cell" title={task.customerNote || '-'}>{task.customerNote || '-'}</td>
                  <td className="mc-intercept-remark-cell" title={task.internalRemark || task.remark || '-'}>
                    <span className="mc-intercept-remark-text" title={task.internalRemark || task.remark || '-'}>
                      {task.internalRemark || task.remark || '-'}
                    </span>
                  </td>
                  <td>{task.applicant}</td>
                  <td>{task.appliedAt}</td>
                  <td>{task.handler || '-'}</td>
                  <td>{task.handleAt || '-'}</td>
                  <td>
                    <button className="mc-intercept-action" type="button" onClick={() => { setDetailMode('view'); setDetailContentTab('货箱信息'); setDetailTaskId(task.id); }}>详情</button>
                    {(task.status === '待处理' || task.status === '拦截中') && <button className="mc-intercept-action" type="button" onClick={() => { setDetailMode('process'); setDetailContentTab('货箱信息'); setDetailTaskId(task.id); }}>处理</button>}
                    <button className="mc-intercept-action" type="button" onClick={() => setLogTaskId(task.id)}>日志</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mc-table-footer"><span>共 {filteredTasks.length} 条</span><button type="button">‹</button><button className="active" type="button">1</button><button type="button">›</button><select defaultValue="50 条/页"><option>50 条/页</option></select></div>
      </section>

      {detailTask && (
        <div className="mc-intercept-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) { setDetailTaskId(null); setDetailMode('view'); setDetailContentTab('货箱信息'); } }}>
          <aside className="mc-intercept-drawer" role="dialog" aria-modal="true" aria-labelledby="interceptDetailTitle">
            <header className="mc-intercept-drawer-header">
              <div><h2 id="interceptDetailTitle">拦截详情 · {detailTask.no}</h2><p><span className={`mc-intercept-status ${statusClass(detailTask.status)}`}>{displayInterceptStatus(detailTask.status)}</span> <span>{detailTask.waybillNo}</span></p></div>
              <button className="mc-intercept-close" type="button" aria-label="关闭拦截详情" onClick={() => { setDetailTaskId(null); setDetailMode('view'); setDetailContentTab('货箱信息'); }}>×</button>
            </header>
            <div className="mc-intercept-detail-content">
              <section className="mc-intercept-flow-section">
                <div className="mc-intercept-flow">
                  {['提交申请', '确认拦截', '仓库处理中', detailTask.status === '拦截失败' ? '拦截失败' : detailTask.status === '已取消' ? '已取消' : '完成'].map((label, index) => {
                    const currentStep = detailTask.status === '待处理' ? 0 : detailTask.status === '拦截中' ? 2 : 3;
                    const isComplete = index < currentStep || (currentStep === 3 && index === 3 && detailTask.status === '拦截成功');
                    return <div key={label} className={`mc-intercept-flow-step ${isComplete ? 'is-complete' : ''} ${index === currentStep ? 'is-active' : ''}`}><i>{isComplete ? '✓' : index + 1}</i><span>{label}</span></div>;
                  })}
                </div>
              </section>

              {/* 基础信息 */}
              <section className="mc-intercept-detail-card">
                <h3 className="mc-intercept-detail-card-title">基础信息</h3>
                <div className="mc-intercept-basic-grid">
                  <DetailField label="客户名称" value={detailTask.customer} />
                  <DetailField label="拦截单号" value={detailTask.no} highlight />
                  <DetailField label="入仓号" value={detailTask.waybillNo || '-'} />
                  <DetailField label="柜号" value={detailTask.container || '-'} />
                  <DetailField label="拦截原因" value={detailTask.reason} />
                  <DetailField label="拦截箱数" value={`${detailTask.actualBoxes || detailTask.boxes} 箱`} />
                  <DetailField label="核销状态" value={<span className={`mc-reconciliation-status mc-reconciliation-${getReconciliationStatus(detailTask)}`}>{getReconciliationStatus(detailTask)}</span>} />
                  <DetailField label="申请人" value={detailTask.applicant} />
                  <DetailField label="申请时间" value={detailTask.appliedAt} />
                  <DetailField
                    label="客户备注"
                    value={(
                      <span className="mc-intercept-detail-editable-value">
                        <span>{detailTask.customerNote || '-'}</span>
                        <button className="mc-intercept-detail-edit-button" type="button" onClick={() => startEditRemark(detailTask, 'customer')} aria-label="编辑客户备注" title="编辑客户备注">✎</button>
                      </span>
                    )}
                  />
                  <DetailField
                    label="内部备注"
                    value={(
                      <span className="mc-intercept-detail-editable-value">
                        <span>{detailTask.internalRemark || detailTask.remark || '-'}</span>
                        {detailTask.status !== '已取消' && (
                          <button className="mc-intercept-detail-edit-button" type="button" onClick={() => startEditRemark(detailTask, 'internal')} aria-label="编辑内部备注" title="编辑内部备注">✎</button>
                        )}
                      </span>
                    )}
                  />
                </div>
              </section>

              {/* Tab 栏切换 */}
              <div className="mc-intercept-detail-tabs">
                {interceptDetailTabs.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setDetailContentTab(tab)}
                    className={`mc-intercept-detail-tab ${detailContentTab === tab ? 'active' : ''}`}
                  >
                    {tab}
                    {detailContentTab === tab && <span className="mc-intercept-detail-tab-indicator" />}
                  </button>
                ))}
              </div>

              {/* 货箱信息 Tab */}
              {detailContentTab === '货箱信息' && (
                <section className="mc-intercept-detail-card">
                  <h3 className="mc-intercept-detail-card-title">货箱信息</h3>
                  <div className="mc-intercept-cargo-box-wrap">
                    <table className="mc-intercept-cargo-box-table">
                      <thead>
                        <tr>
                          <th>货箱号</th>
                          <th>客户数据</th>
                          <th>系统拣货（材重/实重）</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getInterceptCargoRows(detailTask).map((box, index) => (
                          <tr key={box.boxNo}>
                            <td className="font-mono">{box.boxNo}</td>
                            <td>
                              {box.customerLines.map((line) => <div key={line}>{line}</div>)}
                            </td>
                            <td>
                              {box.pickingLines.map((line) => <div key={line}>{line}</div>)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {/* 费用信息 Tab */}
              {detailContentTab === '费用信息' && (
                <section className="mc-intercept-detail-card">
                  <div className="mc-intercept-detail-toolbar">
                    <div>
                      <h3 className="mc-intercept-detail-card-title">费用信息</h3>
                      <div className="mc-intercept-detail-summary">
                        <span>共 <strong>{detailTask.fees.length}</strong> 条</span>
                        <span>原币合计 <strong>{formatInterceptFeeAmount(detailFeeOriginalTotal)}</strong></span>
                        <span>人民币合计 <strong>{formatInterceptFeeAmount(detailFeeRmbTotal)}</strong></span>
                      </div>
                    </div>
                    <button type="button" className="mc-btn primary" onClick={() => openFeeModal()}>
                      新增费用
                    </button>
                  </div>
                  <div className="mc-intercept-cargo-box-wrap">
                    <table className="mc-intercept-fee-table">
                      <thead>
                        <tr>
                          <th>计费时间</th>
                          <th>费用名称</th>
                          <th>费用类型</th>
                          <th>*计费单位</th>
                          <th>*汇率</th>
                          <th>*单价</th>
                          <th>*数量</th>
                          <th>*币种</th>
                          <th>原币应收金额</th>
                          <th>人民币应收金额</th>
                          <th>费用备注</th>
                          <th>添加时间</th>
                          <th>添加人</th>
                          <th>操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailTask.fees.length ? detailTask.fees.map((fee) => (
                          <tr key={fee.id}>
                            <td>{fee.billingTime || fee.addedAt}</td>
                            <td>{fee.name}</td>
                            <td>{fee.type}</td>
                            <td>{fee.unit}</td>
                            <td>{parseInterceptFeeNumber(fee.exchangeRate ?? 1).toFixed(3)}</td>
                            <td>{formatInterceptFeeAmount(fee.unitPrice)}</td>
                            <td>{fee.quantity.toFixed(2).replace(/\.00$/, '')}</td>
                            <td>{fee.currency}</td>
                            <td>{formatInterceptFeeAmount(getInterceptFeeOriginalAmount(fee))}</td>
                            <td>{formatInterceptFeeAmount(getInterceptFeeRmbAmount(fee))}</td>
                            <td>{fee.remark || fee.description || '-'}</td>
                            <td>{fee.addedAt}</td>
                            <td>{fee.addedBy}</td>
                            <td>
                              <button className="mc-intercept-action" type="button" onClick={() => openFeeModal(fee.id)}>编辑</button>
                              <button className="mc-intercept-action" type="button" onClick={() => {
                                if (!window.confirm(`确定删除费用“${fee.name}”吗？`)) return;
                                updateTask(detailTask.id, (task) => ({ ...task, fees: task.fees.filter((item) => item.id !== fee.id) }));
                                addToast?.(`已删除费用 ${fee.name}`, 'warning');
                              }}>删除</button>
                            </td>
                          </tr>
                        )) : <tr><td colSpan={14} className="mc-intercept-fee-empty">暂无费用记录</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {/* 其他信息 Tab */}
              {detailContentTab === '其它信息' && (
                <section className="m-[14px] rounded-md bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-950">其它信息</h3>
                    <button
                      type="button"
                      onClick={() => openAttachmentModal()}
                      className="rounded border border-slate-300 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      上传附件
                    </button>
                  </div>
                  <div className="overflow-x-auto border border-slate-200">
                    <table className="w-full min-w-[920px] table-fixed border-collapse text-[11px]">
                      <thead className="bg-slate-50 text-slate-600">
                        <tr>
                          {['附件名称', '附件类型', '客户可见', '文件大小', '上传人', '上传时间', '操作'].map((head) => (
                            <th key={head} className="border border-slate-200 px-3 py-2 text-left font-semibold">
                              {head}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {detailAttachmentRows.length > 0 ? (
                          detailAttachmentRows.map((row) => (
                            <tr key={row.id} className="h-10 text-slate-700 odd:bg-white even:bg-slate-50/70">
                              <td className="border border-slate-200 px-3">{row.name}</td>
                              <td className="border border-slate-200 px-3">{row.type}</td>
                              <td className="border border-slate-200 px-3">{row.customerVisible}</td>
                              <td className="border border-slate-200 px-3">{row.fileSize}</td>
                              <td className="border border-slate-200 px-3">{row.uploadedBy}</td>
                              <td className="border border-slate-200 px-3 font-mono text-slate-500">{row.uploadedAt}</td>
                              <td className="border border-slate-200 px-3">
                                <button type="button" onClick={() => openAttachmentModal(row)} className="mr-3 font-bold text-[#004bb1] hover:underline">编辑</button>
                                <button type="button" onClick={() => downloadAttachment(row)} className="mr-3 font-bold text-[#004bb1] hover:underline">下载</button>
                                <button type="button" onClick={() => setDeletingAttachment(row)} className="font-bold text-red-500 hover:underline">删除</button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={7} className="h-24 border border-slate-200 text-center text-slate-300">
                              <FileText className="mx-auto mb-2 h-8 w-8 text-slate-200" />
                              暂无附件
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
            </div>
            <footer className="mc-intercept-drawer-footer">
              <button className="mc-btn" type="button" onClick={() => { setDetailTaskId(null); setDetailMode('view'); setDetailContentTab('货箱信息'); }}>关闭</button>
              {detailMode === 'process' && detailTask.status === '待处理' && (
                <>
                  <button className="mc-btn" type="button" onClick={() => cancelTask(detailTask.id)}>取消申请</button>
                  <button className="mc-btn primary" type="button" onClick={() => { confirmTask(detailTask.id); }}>确认拦截</button>
                </>
              )}
              {detailMode === 'process' && detailTask.status === '拦截中' && (
                <>
                  <button className="mc-btn" type="button" onClick={() => openFeedback('failure', detailTask)}>拦截失败</button>
                  <button className="mc-btn primary" type="button" onClick={() => openFeedback('success', detailTask)}>拦截成功</button>
                </>
              )}
              {detailMode === 'process' && detailTask.status === '拦截成功' && (
                <button className="mc-btn primary" type="button" onClick={() => openStorageDetails(detailTask)}>查看暂存详情</button>
              )}
            </footer>
          </aside>
        </div>
      )}

      {showFeeModal && detailTask && (
        <OverseasFeeModal
          rows={feeDraftRows}
          focusedRowId={feeFocusId}
          onAdd={addFeeDraftRow}
          onUpdate={updateFeeDraftRow}
          onRemove={removeFeeDraftRow}
          onCancel={closeFeeModal}
          onConfirm={saveFeeDraftRows}
        />
      )}

      {showAttachmentModal && detailTask && (
        <div
          className="mc-intercept-overlay mc-intercept-feedback-overlay mc-intercept-attachment-overlay"
          onMouseDown={(event) => { if (event.target === event.currentTarget) closeAttachmentModal(); }}
        >
          <section className="mc-intercept-attachment-modal" role="dialog" aria-modal="true" aria-labelledby="interceptAttachmentTitle">
            <header>
              <h2 id="interceptAttachmentTitle">{editingAttachment ? '编辑附件' : '上传附件'}</h2>
              <button type="button" onClick={closeAttachmentModal} className="mc-intercept-close" aria-label="关闭附件弹窗">×</button>
            </header>
            <div className="space-y-5 px-10 py-6 text-xs text-slate-700">
              <div className="flex items-start gap-3">
                <span className="w-24 shrink-0 pt-2 text-right font-bold text-slate-900">
                  <span className="text-red-500">* </span>文件附件：
                </span>
                <div className="min-w-0 flex-1">
                  <label className="inline-flex h-8 cursor-pointer items-center rounded bg-[#004bb1] px-5 text-xs font-bold text-white hover:bg-[#003b91]">
                    点击上传
                    <input
                      type="file"
                      className="hidden"
                      onChange={(event) => {
                        handleAttachmentFileChange(event.target.files?.[0]);
                        event.currentTarget.value = '';
                      }}
                    />
                  </label>
                  <div className="mt-3 text-[11px] text-slate-500">文件大小不超过250M</div>
                  <div className="mt-2 text-[11px] font-semibold text-red-500">若为报关件资料，文件类型请选择“报关资料”</div>
                  {attachmentForm.fileName && (
                    <div className="mt-3 flex items-center gap-2 rounded border border-slate-200 bg-slate-50 px-3 py-2">
                      <span className="min-w-0 flex-1 truncate">{attachmentForm.fileName}</span>
                      <span className="text-slate-400">{attachmentForm.fileSize || '-'}</span>
                      <button
                        type="button"
                        onClick={() => { setAttachmentForm((prev) => ({ ...prev, fileName: '', fileSize: '' })); setAttachmentFile(null); }}
                        className="font-bold text-red-500 hover:underline"
                      >
                        删除
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <label className="flex items-center gap-3">
                <span className="w-24 shrink-0 text-right font-bold text-slate-900">
                  <span className="text-red-500">* </span>文件类型：
                </span>
                <select
                  className="h-8 min-w-0 flex-1 rounded border border-slate-300 bg-white px-2 text-xs text-slate-700 outline-none focus:border-[#004bb1] focus:ring-1 focus:ring-[#004bb1]"
                  value={attachmentForm.type}
                  onChange={(event) => setAttachmentForm((prev) => ({ ...prev, type: event.target.value }))}
                >
                  {interceptAttachmentTypeOptions.map((type) => <option key={type}>{type}</option>)}
                </select>
              </label>

              <div className="flex items-center gap-3">
                <span className="w-24 shrink-0 text-right font-bold text-slate-900">
                  <span className="text-red-500">* </span>客户是否可见：
                </span>
                {(['不可见', '可见'] as const).map((option) => (
                  <label key={option} className="flex items-center gap-1.5">
                    <input
                      type="radio"
                      name="interceptAttachmentCustomerVisible"
                      checked={attachmentForm.customerVisible === option}
                      onChange={() => setAttachmentForm((prev) => ({ ...prev, customerVisible: option }))}
                      className="h-3.5 w-3.5 text-blue-600"
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </div>
            <footer>
              <button type="button" onClick={closeAttachmentModal} className="rounded border border-slate-300 bg-white px-7 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">取消</button>
              <button type="button" onClick={saveAttachment} className="rounded bg-blue-600 px-7 py-1.5 text-xs font-bold text-white hover:bg-blue-700">确定</button>
            </footer>
          </section>
        </div>
      )}

      {deletingAttachment && detailTask && (
        <div className="mc-intercept-overlay mc-intercept-feedback-overlay mc-intercept-attachment-overlay">
          <section className="mc-intercept-attachment-modal mc-intercept-attachment-delete-modal" role="dialog" aria-modal="true" aria-labelledby="interceptDeleteAttachmentTitle">
            <header>
              <h2 id="interceptDeleteAttachmentTitle">删除附件</h2>
              <button type="button" onClick={() => setDeletingAttachment(null)} className="mc-intercept-close" aria-label="关闭删除附件弹窗">×</button>
            </header>
            <div className="px-10 py-8 text-center text-sm text-slate-800">确定删除附件“{deletingAttachment.name}”吗？</div>
            <footer>
              <button type="button" onClick={() => setDeletingAttachment(null)} className="rounded border border-slate-300 bg-white px-6 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">取消</button>
              <button type="button" onClick={confirmDeleteAttachment} className="rounded bg-blue-600 px-6 py-1.5 text-xs font-bold text-white hover:bg-blue-700">确定</button>
            </footer>
          </section>
        </div>
      )}

      {logTask && (
        <div className="mc-intercept-overlay mc-intercept-log-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setLogTaskId(null); }}>
          <section className="mc-intercept-log-modal" role="dialog" aria-modal="true" aria-labelledby="interceptLogTitle">
            <header className="mc-intercept-log-header"><h2 id="interceptLogTitle">查看日志</h2><button className="mc-intercept-close" type="button" aria-label="关闭拦截日志" onClick={() => setLogTaskId(null)}>×</button></header>
            <div className="mc-intercept-log-modal-body">
              <div className="mc-intercept-log-wrap">
                <table className="mc-intercept-log-table">
                  <thead><tr><th>操作内容</th><th>操作前</th><th>操作后</th><th>操作人</th><th>操作时间</th></tr></thead>
                  <tbody>{logTask.logs.map((log, index) => {
                    const [before = '-', after = '-'] = log.change.split(/->|→/).map((item) => item.trim());
                    return <tr key={`${log.time}-${index}`}><td title={log.note || log.action}>{log.action}</td><td title={before}>{before}</td><td title={after}>{after}</td><td>{log.user}</td><td>{log.time}</td></tr>;
                  })}</tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      )}

      {editingRemarkTask && (
        <div className="mc-intercept-overlay mc-intercept-feedback-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) cancelEditRemark(); }}>
          <section className="mc-intercept-feedback-modal" role="dialog" aria-modal="true" aria-labelledby="interceptRemarkTitle">
            <header><h2 id="interceptRemarkTitle">编辑{editingRemarkField === 'customer' ? '客户备注' : '内部备注'}</h2><button className="mc-intercept-close" type="button" aria-label="关闭备注编辑" onClick={cancelEditRemark}>×</button></header>
            <form onSubmit={(event) => { event.preventDefault(); saveEditRemark(editingRemarkTask.id); }}>
              <div className="mc-intercept-feedback-content">
                <p>拦截单号：{editingRemarkTask.no}</p>
                <label><span>{editingRemarkField === 'customer' ? '客户备注' : '内部备注'}</span><textarea value={editRemarkValue} onChange={(event) => setEditRemarkValue(event.target.value)} maxLength={200} placeholder={`请输入${editingRemarkField === 'customer' ? '客户备注' : '内部备注'}内容`} autoFocus /></label>
              </div>
              <footer><button className="mc-btn" type="button" onClick={cancelEditRemark}>取消</button><button className="mc-btn primary" type="submit">保存</button></footer>
            </form>
          </section>
        </div>
      )}

      {cancelReasonOpen && (
        <div className="mc-intercept-overlay mc-intercept-feedback-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) { setCancelReasonOpen(false); setCancelReasonContext({ mode: 'single', taskIds: [] }); } }}>
          <section className="mc-intercept-feedback-modal" role="dialog" aria-modal="true" aria-labelledby="interceptCancelReasonTitle">
            <header><h2 id="interceptCancelReasonTitle">{cancelReasonContext.mode === 'batch' ? `批量取消拦截（${cancelReasonContext.taskIds.length} 条）` : '取消拦截'}</h2><button className="mc-intercept-close" type="button" aria-label="关闭取消拦截" onClick={() => { setCancelReasonOpen(false); setCancelReasonContext({ mode: 'single', taskIds: [] }); }}>×</button></header>
            <form onSubmit={(event) => { event.preventDefault(); submitCancelReason(); }}>
              <div className="mc-intercept-feedback-content">
                <label><span className="mc-required">取消原因</span><textarea value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} maxLength={200} placeholder="请输入取消拦截的原因" required autoFocus /></label>
              </div>
              <footer><button className="mc-btn" type="button" onClick={() => { setCancelReasonOpen(false); setCancelReasonContext({ mode: 'single', taskIds: [] }); }}>取消</button><button className="mc-btn primary" type="submit">确认取消拦截</button></footer>
            </form>
          </section>
        </div>
      )}

      {detailTask && feedbackMode && (
        <div className="mc-intercept-overlay mc-intercept-feedback-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setFeedbackMode(''); }}>
          <section className="mc-intercept-feedback-modal" role="dialog" aria-modal="true" aria-labelledby="interceptFeedbackTitle">
            <header><h2 id="interceptFeedbackTitle">{feedbackMode === 'success' ? '确认拦截成功' : '确认拦截失败'}</h2><button className="mc-intercept-close" type="button" aria-label="关闭拦截处理" onClick={() => setFeedbackMode('')}>×</button></header>
            <form onSubmit={submitFeedback}>
              <div className="mc-intercept-feedback-content">
                {feedbackMode === 'success' ? (
                  <>
                    <p>请确认实际拦截的货物数量。提交后系统将自动生成暂存单。</p>
                    <label><span className="mc-required">实际拦截箱数</span><input type="number" min="1" max={detailTask.boxes} value={actualBoxes} onChange={(event) => setActualBoxes(event.target.value)} required /></label>
                    <label><span>备注</span><textarea value={feedbackNote} onChange={(event) => setFeedbackNote(event.target.value)} maxLength={200} placeholder="请输入处理备注" /></label>
                  </>
                ) : (
                  <>
                    <p>请填写无法完成拦截的原因，系统将保留处理记录。</p>
                    <label><span className="mc-required">失败原因</span><textarea value={feedbackFailureReason} onChange={(event) => setFeedbackFailureReason(event.target.value)} maxLength={200} required placeholder="例如：已出库、找不到货物、客户取消" /></label>
                    <label><span>备注</span><textarea value={feedbackNote} onChange={(event) => setFeedbackNote(event.target.value)} maxLength={200} placeholder="请输入补充说明" /></label>
                  </>
                )}
              </div>
              <footer><button className="mc-btn" type="button" onClick={() => setFeedbackMode('')}>取消</button><button className="mc-btn primary" type="submit">确认提交</button></footer>
            </form>
          </section>
        </div>
      )}

      {batchSuccessOpen && (
        <div className="mc-intercept-overlay mc-intercept-feedback-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setBatchSuccessOpen(false); }}>
          <section className="mc-intercept-feedback-modal" role="dialog" aria-modal="true" aria-labelledby="interceptBatchSuccessTitle">
            <header><h2 id="interceptBatchSuccessTitle">批量拦截成功</h2><button className="mc-intercept-close" type="button" aria-label="关闭批量拦截成功" onClick={() => setBatchSuccessOpen(false)}>×</button></header>
            <form onSubmit={(event) => { event.preventDefault(); submitBatchSuccess(); }}>
              <div className="mc-intercept-feedback-content">
                <p>已选择 {selectedProcessingCount} 条拦截中的记录，确认后将自动生成暂存单。</p>
                <label><span>备注</span><textarea value={batchSuccessNote} onChange={(event) => setBatchSuccessNote(event.target.value)} maxLength={200} placeholder="请输入处理备注" autoFocus /></label>
              </div>
              <footer><button className="mc-btn" type="button" onClick={() => setBatchSuccessOpen(false)}>取消</button><button className="mc-btn primary" type="submit">确认提交</button></footer>
            </form>
          </section>
        </div>
      )}

      {batchFailureOpen && (
        <div className="mc-intercept-overlay mc-intercept-feedback-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setBatchFailureOpen(false); }}>
          <section className="mc-intercept-feedback-modal" role="dialog" aria-modal="true" aria-labelledby="interceptBatchFailureTitle">
            <header><h2 id="interceptBatchFailureTitle">批量拦截失败</h2><button className="mc-intercept-close" type="button" aria-label="关闭批量拦截失败" onClick={() => setBatchFailureOpen(false)}>×</button></header>
            <form onSubmit={(event) => { event.preventDefault(); submitBatchFailure(); }}>
              <div className="mc-intercept-feedback-content">
                <p>已选择 {selectedProcessingCount} 条拦截中的记录，请填写失败原因。</p>
                <label><span className="mc-required">失败原因</span><textarea value={batchFailureReason} onChange={(event) => setBatchFailureReason(event.target.value)} maxLength={200} required placeholder="请填写失败原因" autoFocus /></label>
                <label><span>备注</span><textarea value={batchFailureNote} onChange={(event) => setBatchFailureNote(event.target.value)} maxLength={200} placeholder="请输入补充说明" /></label>
              </div>
              <footer><button className="mc-btn" type="button" onClick={() => setBatchFailureOpen(false)}>取消</button><button className="mc-btn primary" type="submit">确认提交</button></footer>
            </form>
          </section>
        </div>
      )}

    </div>
  );
}

function DetailField({ label, value, highlight, fullWidth }: { label: string; value: React.ReactNode; highlight?: boolean; fullWidth?: boolean }) {
  return (
    <div className={`mc-intercept-detail-field ${fullWidth ? 'mc-intercept-detail-field-full' : ''}`}>
      <dt>{label}</dt>
      <dd className={highlight ? 'mc-intercept-detail-highlight' : ''}>{value}</dd>
    </div>
  );
}
