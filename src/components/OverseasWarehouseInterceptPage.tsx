import React, { useMemo, useState } from 'react';

type InterceptStatus = '待处理' | '拦截中' | '拦截成功' | '拦截失败' | '已取消';
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
  name: string;
  type: string;
  unit: string;
  unitPrice: number;
  quantity: number;
  currency: string;
  total: number;
  addedAt: string;
  addedBy: string;
  description: string;
}

interface InterceptTask {
  id: number;
  no: string;
  container: string;
  customer: string;
  warehouse: string;
  waybillNo: string;
  shipmentId: string;
  referenceId: string;
  customerOrderNo: string;
  billOfLading: string;
  latestTracking: string;
  cargoStatus: CargoStatus;
  inventoryStatus: string;
  outboundStatus: string;
  boxes: number;
  status: InterceptStatus;
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
  warehouse: string;
  waybillNo: string;
  shipmentId: string;
  referenceId: string;
  customerOrderNo: string;
  billOfLading: string;
  latestTracking: string;
  cargoStatus: string;
  status: string;
  dateFrom: string;
  dateTo: string;
}

interface OverseasWarehouseInterceptPageProps {
  addToast?: (text: string, type?: 'success' | 'info' | 'warning') => void;
}

const emptyFilters: FilterState = {
  no: '',
  container: '',
  customer: '',
  warehouse: '',
  waybillNo: '',
  shipmentId: '',
  referenceId: '',
  customerOrderNo: '',
  billOfLading: '',
  latestTracking: '',
  cargoStatus: '',
  status: '',
  dateFrom: '',
  dateTo: '',
};

const statusTabs: Array<InterceptStatus | '全部'> = ['待处理', '拦截中', '拦截成功', '拦截失败', '已取消', '全部'];
const tableHeaders = ['客户名称', '拦截单号', '运单号', '客户单号', '最新运踪', '仓库', '货物状态', '拦截状态', '拦截原因', '附件', '拦截箱数', '内部备注', '申请人', '申请时间', '处理人', '处理时间', '柜号', 'Shipment ID', 'Reference ID', '提单号', '操作'];

const initialTasks: InterceptTask[] = [
  {
    id: 1,
    no: '202608040001',
    container: 'WEMA1131231',
    customer: 'TTTX',
    warehouse: '美仓1号仓',
    waybillNo: 'YDH2026080401',
    shipmentId: 'FBA-001-A',
    referenceId: 'REF001',
    customerOrderNo: 'CO-20260804-01',
    billOfLading: 'BL-001',
    latestTracking: '2026-08-04 08:30 到达洛杉矶港，等待清关',
    cargoStatus: '未拆柜',
    inventoryStatus: '待拆柜',
    outboundStatus: '未出库',
    boxes: 11,
    status: '待处理',
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
    warehouse: '美仓1号仓',
    waybillNo: 'YDH2026080402',
    shipmentId: 'FBA-002-B',
    referenceId: 'REF002',
    customerOrderNo: 'CO-20260804-02',
    billOfLading: 'BL-002',
    latestTracking: '2026-08-03 15:00 已入库美仓1号仓',
    cargoStatus: '已拆柜',
    inventoryStatus: '已入库',
    outboundStatus: '未出库',
    boxes: 4,
    status: '待处理',
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
    warehouse: '美仓1号仓',
    waybillNo: 'YDH2026080303',
    shipmentId: 'FBA-003-C',
    referenceId: 'REF003',
    customerOrderNo: 'CO-20260803-03',
    billOfLading: 'BL-003',
    latestTracking: '2026-08-03 12:00 货物在库，拦截中',
    inventoryStatus: '已入库',
    outboundStatus: '未出库',
    boxes: 5,
    status: '拦截中',
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
    warehouse: '美仓1号仓',
    waybillNo: 'YDH2026080204',
    shipmentId: 'FBA-004-D',
    referenceId: 'REF004',
    customerOrderNo: 'CO-20260802-04',
    billOfLading: 'BL-004',
    latestTracking: '2026-08-02 14:00 已转入暂存库位 A02-03',
    inventoryStatus: '暂存',
    outboundStatus: '未出库',
    boxes: 2,
    status: '拦截成功',
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
    warehouse: '美仓1号仓',
    waybillNo: 'YDH2026080105',
    shipmentId: 'FBA-005-E',
    referenceId: 'REF005',
    customerOrderNo: 'CO-20260801-05',
    billOfLading: 'BL-005',
    latestTracking: '2026-08-01 16:00 货物已完成出库，已送达',
    inventoryStatus: '无库存',
    outboundStatus: '已出库',
    boxes: 3,
    status: '拦截失败',
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
    warehouse: '美仓1号仓',
    waybillNo: 'YDH2026073106',
    shipmentId: 'FBA-006-F',
    referenceId: 'REF006',
    customerOrderNo: 'CO-20260731-06',
    billOfLading: 'BL-006',
    latestTracking: '2026-07-31 09:00 已取消，货物正常出库',
    inventoryStatus: '已入库',
    outboundStatus: '未出库',
    boxes: 4,
    status: '已取消',
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
  if (status === '拦截成功') return '成功';
  if (status === '拦截失败') return '失败';
  if (status === '已取消') return '取消';
  return status;
}

function makeDownloadHref(task: InterceptTask) {
  return `data:text/plain;charset=utf-8,${encodeURIComponent(`拦截单号: ${task.no}\n拦截原因: ${task.reason}\n附件名称: ${task.attachment}\n`)}`;
}

function cargoBoxRows(task: InterceptTask) {
  const count = Math.max(1, Number(task.actualBoxes || task.boxes || 1));
  return Array.from({ length: Math.min(count, 8) }, (_, index) => {
    const boxIndex = index + 1;
    const systemCode = task.container || task.no;
    const boxStatus = task.status === '拦截失败' || task.cargoStatus === '已出库' ? '已出库' : task.status === '拦截成功' ? '暂存中' : '待出库';
    return {
      systemBoxNo: `${systemCode}-${String(boxIndex).padStart(2, '0')}`,
      customerData: `${task.customer} / ${task.no}`,
      pickingData: `材重 ${(0.28 + index * 0.07).toFixed(3)} / 实重 ${(7.5 + index * 1.4).toFixed(1)}`,
      boxStatus,
    };
  });
}

export default function OverseasWarehouseInterceptPage({ addToast }: OverseasWarehouseInterceptPageProps) {
  const [tasks, setTasks] = useState<InterceptTask[]>(initialTasks);
  const [draftFilters, setDraftFilters] = useState<FilterState>(emptyFilters);
  const [filters, setFilters] = useState<FilterState>(emptyFilters);
  const [activeTab, setActiveTab] = useState<InterceptStatus | '全部'>('全部');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [detailTaskId, setDetailTaskId] = useState<number | null>(null);
  const [logTaskId, setLogTaskId] = useState<number | null>(null);
  const [detailMode, setDetailMode] = useState<'view' | 'process'>('view');
  const [detailContentTab, setDetailContentTab] = useState<'货物信息' | '费用信息' | '其他信息'>('货物信息');
  const [feedbackMode, setFeedbackMode] = useState<'success' | 'failure' | ''>('');
  const [actualBoxes, setActualBoxes] = useState('1');
  const [feedbackNote, setFeedbackNote] = useState('');
  const [editingRemarkId, setEditingRemarkId] = useState<number | null>(null);
  const [editRemarkValue, setEditRemarkValue] = useState('');
  const [batchRemarkOpen, setBatchRemarkOpen] = useState(false);
  const [batchRemarkMode, setBatchRemarkMode] = useState<'append' | 'replace'>('append');
  const [batchRemarkText, setBatchRemarkText] = useState('');

  const customers = useMemo(() => Array.from(new Set(tasks.map((task) => task.customer))), [tasks]);
  const warehouses = useMemo(() => Array.from(new Set(tasks.map((task) => task.warehouse))), [tasks]);
  const detailTask = detailTaskId ? tasks.find((task) => task.id === detailTaskId) || null : null;
  const logTask = logTaskId ? tasks.find((task) => task.id === logTaskId) || null : null;

  const filteredTasks = useMemo(() => tasks.filter((task) => {
    const matchText = (value: string, query: string) => !query || value.toLowerCase().includes(query.toLowerCase());
    return (activeTab === '全部' || task.status === activeTab)
      && matchText(task.no, filters.no)
      && matchText(task.container, filters.container)
      && matchText(task.waybillNo, filters.waybillNo)
      && matchText(task.shipmentId, filters.shipmentId)
      && matchText(task.referenceId, filters.referenceId)
      && matchText(task.customerOrderNo, filters.customerOrderNo)
      && matchText(task.billOfLading, filters.billOfLading)
      && matchText(task.latestTracking, filters.latestTracking)
      && (!filters.customer || task.customer === filters.customer)
      && (!filters.warehouse || task.warehouse === filters.warehouse)
      && (!filters.cargoStatus || task.cargoStatus === filters.cargoStatus)
      && (!filters.status || task.status === filters.status)
      && (!filters.dateFrom || task.appliedAt.slice(0, 10) >= filters.dateFrom)
      && (!filters.dateTo || task.appliedAt.slice(0, 10) <= filters.dateTo);
  }), [activeTab, filters, tasks]);

  const visiblePending = filteredTasks.filter((task) => task.status === '待处理');
  const selectedPendingCount = visiblePending.filter((task) => selectedIds.includes(task.id)).length;
  const isPendingView = activeTab === '待处理';

  const updateDraftFilter = (key: keyof FilterState, value: string) => {
    setDraftFilters((prev) => ({ ...prev, [key]: value }));
  };

  const pushLog = (task: InterceptTask, nextStatus: InterceptStatus, action: string, note: string, user = '仓库-李明'): InterceptTask => {
    const stamp = nowText();
    return {
      ...task,
      status: nextStatus,
      handler: user,
      handleAt: stamp,
      logs: [...task.logs, { time: stamp, user, action, change: `${task.status} -> ${nextStatus}`, note }],
    };
  };

  const updateTask = (taskId: number, updater: (task: InterceptTask) => InterceptTask) => {
    setTasks((list) => list.map((task) => (task.id === taskId ? updater(task) : task)));
  };

  const confirmTask = (taskId: number) => {
    updateTask(taskId, (task) => {
      if (task.status !== '待处理') return task;
      if (task.cargoStatus === '已出库') {
        return {
          ...pushLog(task, '拦截失败', '状态校验', '货物已完成出库，无法执行拦截', '系统'),
          failReason: '货物已完成出库',
          resultRemark: '系统校验货物已完成出库，无法执行拦截',
        };
      }
      return pushLog(task, '拦截中', '确认拦截', task.cargoStatus === '未拆柜' ? '货物未拆柜，已创建预报拦截任务' : '货物已入库，已创建仓库拦截任务');
    });
    addToast?.('拦截任务已确认', 'success');
  };

  const cancelTask = (taskId: number) => {
    updateTask(taskId, (task) => {
      if (task.status !== '待处理') return task;
      return { ...pushLog(task, '已取消', '取消申请', '客户取消拦截申请', '客服-张敏'), resultRemark: '客户取消拦截申请' };
    });
    setSelectedIds((ids) => ids.filter((id) => id !== taskId));
    addToast?.('拦截申请已取消', 'info');
  };

  const handleBatchConfirm = () => {
    selectedIds.forEach(confirmTask);
    setSelectedIds([]);
  };

  const handleBatchCancel = () => {
    selectedIds.forEach(cancelTask);
    setSelectedIds([]);
  };

  const startEditRemark = (task: InterceptTask) => {
    setEditingRemarkId(task.id);
    setEditRemarkValue(task.internalRemark || '');
  };

  const saveEditRemark = (taskId: number) => {
    updateTask(taskId, (task) => ({ ...task, internalRemark: editRemarkValue }));
    setEditingRemarkId(null);
    setEditRemarkValue('');
    addToast?.('内部备注已更新', 'success');
  };

  const cancelEditRemark = () => {
    setEditingRemarkId(null);
    setEditRemarkValue('');
  };

  const handleBatchRemark = () => {
    const remarkText = batchRemarkText.trim();
    if (!remarkText) { setBatchRemarkOpen(false); return; }
    setTasks((prev) => prev.map((task) => {
      if (!selectedIds.includes(task.id)) return task;
      const newRemark = batchRemarkMode === 'replace' ? remarkText : (task.internalRemark ? `${task.internalRemark}；${remarkText}` : remarkText);
      return { ...task, internalRemark: newRemark };
    }));
    setBatchRemarkOpen(false);
    setBatchRemarkText('');
    setSelectedIds([]);
    addToast?.(`已为 ${selectedIds.length} 条记录批量更新内部备注`, 'success');
  };

  const submitFeedback = (event: React.FormEvent) => {
    event.preventDefault();
    if (!detailTask || !feedbackMode) return;
    updateTask(detailTask.id, (task) => {
      if (task.status !== '拦截中') return task;
      if (feedbackMode === 'success') {
        const nextStorageNo = `STG${nowText().slice(0, 10).replaceAll('-', '')}${String(task.id).padStart(4, '0')}`;
        return {
          ...pushLog(task, '拦截成功', '拦截成功', `实际拦截 ${actualBoxes} 箱，已生成暂存单 ${nextStorageNo}${feedbackNote ? `；${feedbackNote}` : ''}`),
          cargoStatus: '暂存中',
          inventoryStatus: '暂存',
          outboundStatus: '未出库',
          actualBoxes,
          storageNo: nextStorageNo,
          resultRemark: feedbackNote || '已完成货物拦截并转入暂存',
        };
      }
      return {
        ...pushLog(task, '拦截失败', '拦截失败', feedbackNote || '仓库反馈无法完成拦截'),
        failReason: feedbackNote || '仓库反馈无法完成拦截',
        resultRemark: feedbackNote,
      };
    });
    setFeedbackMode('');
    addToast?.(feedbackMode === 'success' ? '已提交拦截成功结果' : '已提交拦截失败结果', feedbackMode === 'success' ? 'success' : 'warning');
  };

  const allVisiblePendingSelected = visiblePending.length > 0 && selectedPendingCount === visiblePending.length;

  return (
    <div className="mc-intercept-page">
      <section className="mc-filter-card mc-intercept-filter-card">
        <div className="mc-filter-grid mc-intercept-filter-grid">
          <label className="mc-filter-field"><span>拦截单号</span><input value={draftFilters.no} onChange={(e) => updateDraftFilter('no', e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') setFilters(draftFilters); }} placeholder="请输入拦截单号" /></label>
          <label className="mc-filter-field"><span>柜号</span><input value={draftFilters.container} onChange={(e) => updateDraftFilter('container', e.target.value)} placeholder="请输入柜号" /></label>
          <label className="mc-filter-field"><span>运单号</span><input value={draftFilters.waybillNo} onChange={(e) => updateDraftFilter('waybillNo', e.target.value)} placeholder="请输入运单号" /></label>
          <label className="mc-filter-field"><span>Shipment ID</span><input value={draftFilters.shipmentId} onChange={(e) => updateDraftFilter('shipmentId', e.target.value)} placeholder="请输入Shipment ID" /></label>
          <label className="mc-filter-field"><span>Reference ID</span><input value={draftFilters.referenceId} onChange={(e) => updateDraftFilter('referenceId', e.target.value)} placeholder="请输入Reference ID" /></label>
          <label className="mc-filter-field"><span>客户单号</span><input value={draftFilters.customerOrderNo} onChange={(e) => updateDraftFilter('customerOrderNo', e.target.value)} placeholder="请输入客户单号" /></label>
          <label className="mc-filter-field"><span>提单号</span><input value={draftFilters.billOfLading} onChange={(e) => updateDraftFilter('billOfLading', e.target.value)} placeholder="请输入提单号" /></label>
          <label className="mc-filter-field"><span>最新运踪</span><input value={draftFilters.latestTracking} onChange={(e) => updateDraftFilter('latestTracking', e.target.value)} placeholder="请输入运踪关键词" /></label>
          <label className="mc-filter-field"><span>客户名称</span><select value={draftFilters.customer} onChange={(e) => updateDraftFilter('customer', e.target.value)}><option value="">全部客户</option>{customers.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="mc-filter-field"><span>仓库</span><select value={draftFilters.warehouse} onChange={(e) => updateDraftFilter('warehouse', e.target.value)}><option value="">全部仓库</option>{warehouses.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="mc-filter-field"><span>货物状态</span><select value={draftFilters.cargoStatus} onChange={(e) => updateDraftFilter('cargoStatus', e.target.value)}><option value="">全部货物状态</option><option>未拆柜</option><option>已拆柜</option><option>已出库</option><option>暂存中</option></select></label>
          <label className="mc-filter-field"><span>拦截状态</span><select value={draftFilters.status} onChange={(e) => updateDraftFilter('status', e.target.value)}><option value="">全部拦截状态</option><option>待处理</option><option>拦截中</option><option>拦截成功</option><option>拦截失败</option><option>已取消</option></select></label>
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
            <button className="mc-btn" type="button" disabled={!selectedPendingCount} onClick={() => setBatchRemarkOpen(true)}>批量备注</button>
            {isPendingView && <button className="mc-btn" type="button" disabled={!selectedPendingCount} onClick={handleBatchCancel}>批量取消</button>}
            {isPendingView && <button className="mc-btn primary" type="button" disabled={!selectedPendingCount} onClick={handleBatchConfirm}>批量确认</button>}
          </div>
        </div>
        <div className="mc-intercept-list-summary"><span>共 {filteredTasks.length} 条拦截任务</span><span>拦截成功后将自动生成暂存单</span></div>
        <div className="mc-table-scroll">
          <table className="mc-intercept-table">
            <thead>
              <tr>
                <th className="mc-intercept-check"><input type="checkbox" aria-label="全选待处理拦截单" disabled={!isPendingView || !visiblePending.length} checked={allVisiblePendingSelected} onChange={(e) => setSelectedIds(e.target.checked ? visiblePending.map((task) => task.id) : [])} /></th>
                {tableHeaders.map((head) => <th key={head}>{head}</th>)}
              </tr>
            </thead>
            <tbody>
              {!filteredTasks.length ? (
                <tr className="mc-intercept-empty"><td colSpan={22}>暂无匹配的拦截任务</td></tr>
              ) : filteredTasks.map((task) => (
                <tr key={task.id}>
                  <td className="mc-intercept-check">
                    <input type="checkbox" disabled={task.status !== '待处理'} checked={selectedIds.includes(task.id)} onChange={(e) => setSelectedIds((ids) => e.target.checked ? [...ids, task.id] : ids.filter((id) => id !== task.id))} />
                  </td>
                  <td>{task.customer}</td>
                  <td title={task.no}>{task.no}</td>
                  <td title={task.waybillNo || '-'}>{task.waybillNo || '-'}</td>
                  <td title={task.customerOrderNo || '-'}>{task.customerOrderNo || '-'}</td>
                  <td title={task.latestTracking || '-'}>{task.latestTracking || '-'}</td>
                  <td>{task.warehouse}</td>
                  <td><span className={`mc-intercept-cargo-status ${task.cargoStatus === '已出库' ? 'is-outbound' : task.cargoStatus === '暂存中' ? 'is-storage' : ''}`}>{task.cargoStatus}</span></td>
                  <td><span className={`mc-intercept-status ${statusClass(task.status)}`}>{task.status}</span></td>
                  <td title={task.reason}>{task.reason}</td>
                  <td>{task.attachment === '-' ? '-' : <a className="mc-intercept-attachment-link" href={makeDownloadHref(task)} download={task.attachment} title={task.attachment}>{task.attachment}</a>}</td>
                  <td>{task.actualBoxes || task.boxes}</td>
                  <td className="mc-intercept-remark-cell" title={task.internalRemark || '-'}>
                    {editingRemarkId === task.id ? (
                      <div className="mc-intercept-remark-edit">
                        <input className="mc-intercept-remark-input" value={editRemarkValue} maxLength={200} onChange={(e) => setEditRemarkValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') saveEditRemark(task.id); if (e.key === 'Escape') cancelEditRemark(); }} autoFocus />
                        <button className="mc-intercept-remark-save" type="button" onClick={() => saveEditRemark(task.id)}>✓</button>
                        <button className="mc-intercept-remark-cancel" type="button" onClick={cancelEditRemark}>✕</button>
                      </div>
                    ) : (
                      <span className="mc-intercept-remark-text" onClick={() => startEditRemark(task)} style={{ cursor: 'pointer', minHeight: '18px', display: 'inline-block' }}>
                        {task.internalRemark || '-'}
                      </span>
                    )}
                  </td>
                  <td>{task.applicant}</td>
                  <td>{task.appliedAt}</td>
                  <td>{task.handler || '-'}</td>
                  <td>{task.handleAt || '-'}</td>
                  <td title={task.container || '-'}>{task.container || '-'}</td>
                  <td title={task.shipmentId || '-'}>{task.shipmentId || '-'}</td>
                  <td title={task.referenceId || '-'}>{task.referenceId || '-'}</td>
                  <td title={task.billOfLading || '-'}>{task.billOfLading || '-'}</td>
                  <td>
                    <button className="mc-intercept-action" type="button" onClick={() => { setDetailMode('view'); setDetailContentTab('货物信息'); setDetailTaskId(task.id); }}>详情</button>
                    {task.status === '待处理' && <button className="mc-intercept-action" type="button" onClick={() => { setDetailMode('process'); setDetailContentTab('货物信息'); setDetailTaskId(task.id); }}>处理</button>}
                    {task.status === '拦截中' && <button className="mc-intercept-action" type="button" onClick={() => { setDetailMode('view'); setDetailContentTab('货物信息'); setDetailTaskId(task.id); }}>反馈</button>}
                    {task.status === '拦截成功' && <button className="mc-intercept-action" type="button">暂存单</button>}
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
        <div className="mc-intercept-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) { setDetailTaskId(null); setDetailMode('view'); setDetailContentTab('货物信息'); } }}>
          <aside className="mc-intercept-drawer" role="dialog" aria-modal="true" aria-labelledby="interceptDetailTitle">
            <header className="mc-intercept-drawer-header">
              <div><h2 id="interceptDetailTitle">拦截详情 · {detailTask.no}</h2><p><span className={`mc-intercept-status ${statusClass(detailTask.status)}`}>{detailTask.status}</span> <span>{detailTask.customer}</span></p></div>
              <button className="mc-intercept-close" type="button" aria-label="关闭拦截详情" onClick={() => { setDetailTaskId(null); setDetailMode('view'); setDetailContentTab('货物信息'); }}>×</button>
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
                  <DetailField label="入仓号" value={detailTask.container || '-'} />
                  <DetailField label="柜号" value={detailTask.container || '-'} />
                  <DetailField label="运单号" value={detailTask.waybillNo || '-'} />
                  <DetailField label="Shipment ID" value={detailTask.shipmentId || '-'} />
                  <DetailField label="Reference ID" value={detailTask.referenceId || '-'} />
                  <DetailField label="客户单号" value={detailTask.customerOrderNo || '-'} />
                  <DetailField label="提单号" value={detailTask.billOfLading || '-'} />
                  <DetailField label="最新运踪" value={detailTask.latestTracking || '-'} />
                  <DetailField label="拦截箱数" value={`${detailTask.actualBoxes || detailTask.boxes} 箱`} />
                  <DetailField label="货物状态" value={<span className={`mc-intercept-cargo-status ${detailTask.cargoStatus === '已出库' ? 'is-outbound' : detailTask.cargoStatus === '暂存中' ? 'is-storage' : ''}`}>{detailTask.cargoStatus}</span>} />
                  <DetailField label="所在仓库" value={detailTask.warehouse} />
                  <DetailField label="出库状态" value={detailTask.outboundStatus} />
                  <DetailField label="申请人" value={detailTask.applicant} />
                  <DetailField label="申请时间" value={detailTask.appliedAt} />
                  <DetailField label="处理人" value={detailTask.handler || '-'} />
                  <DetailField label="处理时间" value={detailTask.handleAt || '-'} />
                  <DetailField label="拦截原因" value={detailTask.reason} fullWidth />
                  <div className="mc-intercept-detail-field mc-intercept-detail-field-full">
                    <dt>内部备注</dt>
                    <dd>
                      {editingRemarkId === detailTask.id ? (
                        <div className="mc-intercept-remark-edit">
                          <input className="mc-intercept-remark-input" value={editRemarkValue} maxLength={200} onChange={(e) => setEditRemarkValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') saveEditRemark(detailTask.id); if (e.key === 'Escape') cancelEditRemark(); }} autoFocus />
                          <button className="mc-intercept-remark-save" type="button" onClick={() => saveEditRemark(detailTask.id)}>✓</button>
                          <button className="mc-intercept-remark-cancel" type="button" onClick={cancelEditRemark}>✕</button>
                        </div>
                      ) : (
                        <span className="mc-intercept-remark-text mc-intercept-detail-remark-text" onClick={() => startEditRemark(detailTask)}>
                          {detailTask.internalRemark || '点击添加内部备注'}
                        </span>
                      )}
                    </dd>
                  </div>
                </div>
              </section>

              {/* Tab 栏切换 */}
              <div className="mc-intercept-detail-tabs">
                {(['货物信息', '费用信息', '其他信息'] as const).map((tab) => (
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

              {/* 货物信息 Tab */}
              {detailContentTab === '货物信息' && (
                <section className="mc-intercept-detail-card">
                  <h3 className="mc-intercept-detail-card-title">货物信息</h3>
                  <div className="mc-intercept-cargo-box-wrap">
                    <table className="mc-intercept-cargo-box-table">
                      <thead><tr><th>货箱号</th><th>客户数据</th><th>系统拣货（材重/实重）</th></tr></thead>
                      <tbody>{cargoBoxRows(detailTask).map((box) => <tr key={box.systemBoxNo}><td className="mc-cargo-box-code">{box.systemBoxNo}</td><td>{box.customerData}</td><td>{box.pickingData}</td></tr>)}</tbody>
                    </table>
                  </div>
                </section>
              )}

              {/* 费用信息 Tab */}
              {detailContentTab === '费用信息' && (
                <section className="mc-intercept-detail-card">
                  <h3 className="mc-intercept-detail-card-title">费用信息</h3>
                  <div className="mc-intercept-cargo-box-wrap">
                    <table className="mc-intercept-fee-table">
                      <thead><tr><th>费用名称</th><th>费用类型</th><th>*计费单位</th><th>*计费单价（元）</th><th>*计费数量</th><th>*币种</th><th>总价（元）</th><th>添加时间</th><th>添加人</th><th>描述</th><th>操作</th></tr></thead>
                      <tbody>
                        {detailTask.fees.length ? detailTask.fees.map((fee) => (
                          <tr key={fee.id}>
                            <td>{fee.name}</td><td>{fee.type}</td><td>{fee.unit}</td><td>{fee.unitPrice.toFixed(2)}</td><td>{fee.quantity}</td><td>{fee.currency}</td><td>{fee.total.toFixed(2)}</td><td>{fee.addedAt}</td><td>{fee.addedBy}</td><td>{fee.description || '-'}</td><td><button className="mc-intercept-action" type="button">编辑</button><button className="mc-intercept-action" type="button">删除</button></td>
                          </tr>
                        )) : <tr><td colSpan={11} className="mc-intercept-fee-empty">暂无费用记录</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {/* 其他信息 Tab */}
              {detailContentTab === '其他信息' && (
                <section className="mc-intercept-detail-card">
                  <h3 className="mc-intercept-detail-card-title">其他信息</h3>
                  <div className="mc-intercept-other-grid">
                    <div className="mc-intercept-other-field">
                      <label>备注</label>
                      <div className="mc-intercept-other-value">{detailTask.remark || '-'}</div>
                    </div>
                    <div className="mc-intercept-other-field">
                      <label>客户备注</label>
                      <div className="mc-intercept-other-value">{detailTask.customerNote || '-'}</div>
                    </div>
                    <div className="mc-intercept-other-field">
                      <label>仓库备注</label>
                      <div className="mc-intercept-other-value">{detailTask.warehouseRemark || '-'}</div>
                    </div>
                    <div className="mc-intercept-other-field">
                      <label>海外仓备注</label>
                      <div className="mc-intercept-other-value">{detailTask.overseasWarehouseNote || '-'}</div>
                    </div>
                    <div className="mc-intercept-other-field mc-intercept-other-full">
                      <label>增值服务</label>
                      <div className="mc-intercept-other-value">
                        {detailTask.valueAddedServices.length ? (
                          <div className="mc-intercept-service-tags">
                            {detailTask.valueAddedServices.map((s) => <span key={s} className="mc-intercept-service-tag">{s}</span>)}
                          </div>
                        ) : '-'}
                      </div>
                    </div>
                    {detailTask.valueAddedRemark && (
                      <div className="mc-intercept-other-field mc-intercept-other-full">
                        <label>增值服务备注</label>
                        <div className="mc-intercept-other-value">{detailTask.valueAddedRemark}</div>
                      </div>
                    )}
                    <div className="mc-intercept-other-field mc-intercept-other-full">
                      <label>附件</label>
                      <div className="mc-intercept-other-value">
                        {detailTask.attachments.length ? (
                          <ul className="mc-intercept-attachment-list">
                            {detailTask.attachments.map((f, i) => (
                              <li key={i}><a className="mc-intercept-attachment-link" href={makeDownloadHref({ ...detailTask, attachment: f })} download={f}>{f}</a></li>
                            ))}
                          </ul>
                        ) : '-'}
                      </div>
                    </div>
                  </div>
                </section>
              )}
            </div>
            <footer className="mc-intercept-drawer-footer">
              <button className="mc-btn" type="button" onClick={() => { setDetailTaskId(null); setDetailMode('view'); setDetailContentTab('货物信息'); }}>关闭</button>
              {detailMode === 'process' && detailTask.status === '待处理' && (
                <>
                  <button className="mc-btn" type="button" onClick={() => { cancelTask(detailTask.id); setDetailTaskId(null); setDetailMode('view'); setDetailContentTab('货物信息'); }}>取消申请</button>
                  <button className="mc-btn primary" type="button" onClick={() => { confirmTask(detailTask.id); }}>确认拦截</button>
                </>
              )}
            </footer>
          </aside>
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

      {detailTask && feedbackMode && (
        <div className="mc-intercept-overlay mc-intercept-feedback-overlay">
          <section className="mc-intercept-feedback-modal" role="dialog" aria-modal="true">
            <header><h2>{feedbackMode === 'success' ? '确认拦截成功' : '确认拦截失败'}</h2><button className="mc-intercept-close" type="button" aria-label="关闭拦截处理" onClick={() => setFeedbackMode('')}>×</button></header>
            <form onSubmit={submitFeedback}>
              <div className="mc-intercept-feedback-content">
                {feedbackMode === 'success' ? (
                  <>
                    <p>请确认实际拦截的货物数量。提交后系统将自动生成暂存单。</p>
                    <label><span className="mc-required">实际拦截箱数</span><input type="number" min="1" max={detailTask.boxes} value={actualBoxes} onChange={(e) => setActualBoxes(e.target.value)} required /></label>
                    <label><span>备注</span><textarea value={feedbackNote} onChange={(e) => setFeedbackNote(e.target.value)} maxLength={200} placeholder="请输入处理备注" /></label>
                  </>
                ) : (
                  <>
                    <p>请填写无法完成拦截的原因，系统将保留处理记录。</p>
                    <label><span className="mc-required">失败原因</span><textarea value={feedbackNote} onChange={(e) => setFeedbackNote(e.target.value)} maxLength={200} required placeholder="例如：已出库、找不到货物、客户取消" /></label>
                  </>
                )}
              </div>
              <footer><button className="mc-btn" type="button" onClick={() => setFeedbackMode('')}>取消</button><button className="mc-btn primary" type="submit">确认提交</button></footer>
            </form>
          </section>
        </div>
      )}
      {batchRemarkOpen && (
        <div className="mc-intercept-overlay mc-intercept-batch-remark-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setBatchRemarkOpen(false); }}>
          <section className="mc-intercept-batch-remark-modal" role="dialog" aria-modal="true" aria-labelledby="batchRemarkTitle">
            <header><h2 id="batchRemarkTitle">批量备注</h2><button className="mc-intercept-close" type="button" aria-label="关闭批量备注" onClick={() => setBatchRemarkOpen(false)}>×</button></header>
            <div className="mc-intercept-batch-remark-content">
              <p>将为已选择的 <b>{selectedPendingCount}</b> 条待处理拦截单统一设置内部备注。</p>
              <div className="mc-intercept-batch-remark-mode" role="radiogroup" aria-label="批量备注方式">
                <label><input type="radio" name="batchRemarkMode" value="append" checked={batchRemarkMode === 'append'} onChange={() => setBatchRemarkMode('append')} />追加</label>
                <label><input type="radio" name="batchRemarkMode" value="replace" checked={batchRemarkMode === 'replace'} onChange={() => setBatchRemarkMode('replace')} />覆盖</label>
              </div>
              <textarea className="mc-intercept-batch-remark-textarea" value={batchRemarkText} onChange={(e) => setBatchRemarkText(e.target.value)} maxLength={200} placeholder="请输入内部备注（最多200字）" />
            </div>
            <footer><button className="mc-btn" type="button" onClick={() => setBatchRemarkOpen(false)}>取消</button><button className="mc-btn primary" type="button" onClick={handleBatchRemark}>确定</button></footer>
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
