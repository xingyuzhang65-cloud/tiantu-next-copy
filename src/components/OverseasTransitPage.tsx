import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Download,
  FileText,
  MoreHorizontal,
  PackageCheck,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings2,
  Ship,
  Trash2,
  UploadCloud,
  Warehouse,
  X,
} from 'lucide-react';
import {
  emptyAddressForm,
  getShippingEnabledForReleaseInstruction,
  overseasDeliveryMethods,
  overseasOrderTypes,
  overseasWarehouseCodes,
  releaseInstructionOptions,
  warehouseAddressBook,
} from './overseasTransitAddress';
import type { AddressFormState, ReleaseInstruction } from './overseasTransitAddress';
import {
  getCreatedTransitChildOrders,
  getRemovedStorageBoxCount,
  getRemovedStorageBoxNumbers,
  submitStorageBoxesAsTransitChild,
  subscribeOverseasTransitFlow,
} from './overseasTransitFlow';
import type { CreatedTransitAttachment, CreatedTransitChildOrder } from './overseasTransitFlow';

interface OverseasTransitPageProps {
  addToast: (msg: string, type: 'success' | 'info' | 'warning') => void;
  initialView?: 'list' | 'form';
  mode?: 'all' | 'storage';
}

type TransitStatus = '运输中' | '暂存' | '待确认' | '已确认' | '已下单' | '转运中' | '签收' | '暂存已完成' | '驳回' | '取消';

interface OverseasTransitRow {
  headWaybillNo: string;
  transitWaybillNo: string;
  fbaNo: string;
  customerOrderNo: string;
  customer: string;
  transferType: string;
  totalCount: number;
  remainingBoxCount?: number;
  inventoryCount: number;
  availableCount: number;
  service: string;
  customerRemark: string;
  overseasWarehouseRemark: string;
  salesman: string;
  salesRepresentative?: string;
  followupRepresentative?: string;
  financeRepresentative?: string;
  agent: string;
  inboundAt: string;
  warehouseAt: string;
  status: TransitStatus;
  shippedCount?: number;
  routeUpdatedAt?: string;
  transferNo?: string;
  containerNo?: string;
  billOfLadingNo?: string;
  inboundNo?: string;
  shipmentId?: string;
  referenceId?: string;
  releaseInstruction?: ReleaseInstruction;
  warehouseCode?: string;
  chargeWeight?: string;
  actualWeight?: string;
  volumetricWeight?: string;
  volumeCbm?: string;
  zipCode?: string;
}

const getRemainingBoxCount = (row: OverseasTransitRow) =>
  row.remainingBoxCount ?? (row.status === '暂存已完成' ? 0 : row.totalCount);

interface LinkedOrderRow {
  id: string;
  reserveNo: string;
  customerRef: string;
  warehouseCode: string;
  destination: string;
  boxes: number;
  weight: string;
  volume: string;
  service: string;
  status: string;
}

const storageInstructionFeeRows = [
  { code: 'FY202509260001', name: '仓储渠道-免仓30天', type: '仓储费', unit: '票', price: '3', currency: '人民币', description: '提柜入仓当天起算' },
  { code: 'FY202509260002', name: '仓储渠道-31-90天', type: '仓储费', unit: '票', price: '4', currency: '人民币', description: '按1级单价收取' },
  { code: 'FY202509260003', name: '仓储渠道-90天以上', type: '仓储费', unit: '票', price: '2', currency: '人民币', description: '按2级单价收取' },
  { code: 'FY202509260004', name: '拦截-免仓7天', type: '仓储费', unit: '票', price: '4', currency: '人民币', description: '提柜入仓当天起算' },
  { code: 'FY202509260005', name: '拦截-免仓8-90天', type: '仓储费', unit: '票', price: '3', currency: '人民币', description: '按1级单价收取' },
  { code: 'FY202509260006', name: '拦截-免仓90天以上', type: '仓储费', unit: '票', price: '2', currency: '人民币', description: '按2级单价收取' },
  { code: 'FY202509260007', name: '扣货-无免仓期', type: '仓储费', unit: '票', price: '2', currency: '人民币', description: '按1级单价收取' },
];

type StorageInstructionRow = (typeof storageInstructionFeeRows)[number] & {
  quantity: string;
  addedAt: string;
  addedBy: string;
};

const parseStorageInstructionFeeNumber = (value: string | undefined) => Number(String(value || '0').replace(/[^\d.]/g, '')) || 0;
const formatStorageInstructionFeeAmount = (value: number) => Number(value.toFixed(2)).toString();

const statusClass: Record<TransitStatus, string> = {
  运输中: 'bg-blue-50 text-blue-700',
  暂存: 'bg-slate-100 text-slate-700',
  待确认: 'bg-amber-50 text-amber-700',
  已确认: 'bg-emerald-50 text-emerald-700',
  已下单: 'bg-indigo-50 text-indigo-700',
  转运中: 'bg-cyan-50 text-cyan-700',
  签收: 'bg-green-50 text-green-700',
  暂存已完成: 'bg-teal-50 text-teal-700',
  驳回: 'bg-rose-50 text-rose-700',
  取消: 'bg-slate-100 text-slate-500',
};

const allTransitTabs: TransitStatus[] = ['运输中', '暂存', '待确认', '已确认', '已下单', '转运中', '签收', '暂存已完成', '驳回', '取消'];
const storageTransitTabs: TransitStatus[] = ['运输中', '暂存', '暂存已完成'];

const getMockContainerNo = (source: string) =>
  'TGHU' + source.replace(/\D/g, '').slice(-7).padStart(7, '0');

const getMockBillOfLadingNo = (source: string) =>
  'TTBL' + source.replace(/\D/g, '').slice(-10).padStart(10, '0');

const getMockStorageIdentifierSerial = (source: string) =>
  source.replace(/\D/g, '').slice(-10).padStart(10, '0');

const getMockInboundNo = (source: string) =>
  'INB' + getMockStorageIdentifierSerial(source);

const getMockShipmentId = (source: string) =>
  'SHP' + getMockStorageIdentifierSerial(source);

const getMockReferenceId = (source: string) =>
  'REF-FBA-' + getMockStorageIdentifierSerial(source).slice(-5);
const seedTransitRows: OverseasTransitRow[] = [
  {
    headWaybillNo: 'USSZAS2508261001',
    transitWaybillNo: '',
    fbaNo: 'FBACCTES161T',
    customerOrderNo: '',
    customer: '阿里巴巴',
    transferType: '暂存',
    totalCount: 59,
    inventoryCount: 59,
    availableCount: 59,
    service: '美森15日达-快递派',
    customerRemark: '',
    overseasWarehouseRemark: '',
    salesman: '安一',
    salesRepresentative: '安一',
    followupRepresentative: '李跟单',
    financeRepresentative: '王财务',
    agent: '',
    inboundAt: '2025-11-24 00:43',
    warehouseAt: '2025-11-28 10:12',
    status: '运输中',
  },
  {
    headWaybillNo: 'USSZAS2508261002',
    transitWaybillNo: '',
    fbaNo: 'FBACCTEE174T',
    customerOrderNo: '',
    customer: '腾讯科技',
    transferType: '拦截',
    totalCount: 13,
    inventoryCount: 13,
    availableCount: 13,
    service: '美森15日达-卡派包税',
    customerRemark: '',
    overseasWarehouseRemark: '',
    salesman: '安一',
    salesRepresentative: '安一',
    followupRepresentative: '李跟单',
    financeRepresentative: '王财务',
    agent: '',
    inboundAt: '2025-04-17 12:49',
    warehouseAt: '2025-04-16 09:20',
    status: '暂存',
  },
  {
    headWaybillNo: 'USSZAS2508261003',
    transitWaybillNo: '',
    fbaNo: 'FBACCTES161T',
    customerOrderNo: '',
    customer: '华为技术',
    transferType: '暂存',
    totalCount: 71,
    inventoryCount: 71,
    availableCount: 71,
    service: 'OA以星17日达-快递派',
    customerRemark: '',
    overseasWarehouseRemark: '',
    salesman: '安一',
    salesRepresentative: '安一',
    followupRepresentative: '李跟单',
    financeRepresentative: '王财务',
    agent: '',
    inboundAt: '2024-07-23 00:00',
    warehouseAt: '2024-05-10 08:41',
    status: '待确认',
  },
  {
    headWaybillNo: 'USSZAS2508261004',
    transitWaybillNo: '',
    fbaNo: 'FBACCTEST93T',
    customerOrderNo: '',
    customer: '百度在线',
    transferType: '拦截',
    totalCount: 43,
    inventoryCount: 43,
    availableCount: 43,
    service: '美森15日达-卡派包税',
    customerRemark: '',
    overseasWarehouseRemark: '',
    salesman: '安一',
    salesRepresentative: '安一',
    followupRepresentative: '李跟单',
    financeRepresentative: '王财务',
    agent: '张运营',
    inboundAt: '2024-12-12 18:43',
    warehouseAt: '2025-12-10 09:18',
    status: '已下单',
  },
  {
    headWaybillNo: 'USSZAS2508261005',
    transitWaybillNo: '',
    fbaNo: 'FBA18HL83QJ0',
    customerOrderNo: '',
    customer: '京东集团',
    transferType: '拦截',
    totalCount: 79,
    inventoryCount: 79,
    availableCount: 79,
    service: '美森15日达-快递派',
    customerRemark: '',
    overseasWarehouseRemark: '',
    salesman: '安一',
    salesRepresentative: '安一',
    followupRepresentative: '李跟单',
    financeRepresentative: '王财务',
    agent: '',
    inboundAt: '2025-11-14 02:29',
    warehouseAt: '2025-02-13 15:28',
    status: '转运中',
  },
  {
    headWaybillNo: 'USSZAS2508261006',
    transitWaybillNo: '',
    fbaNo: 'FBA18HLGVVK6',
    customerOrderNo: '',
    customer: '小米科技',
    transferType: '暂存',
    totalCount: 48,
    inventoryCount: 48,
    availableCount: 48,
    service: '美森15日达-快递派',
    customerRemark: '',
    overseasWarehouseRemark: '',
    salesman: '安一',
    salesRepresentative: '安一',
    followupRepresentative: '李跟单',
    financeRepresentative: '王财务',
    agent: '',
    inboundAt: '2024-04-12 16:23',
    warehouseAt: '2025-05-16 08:16',
    status: '签收',
  },
  {
    headWaybillNo: 'USSZAS2508261007',
    transitWaybillNo: '',
    fbaNo: 'FBA18HL83QJ1',
    customerOrderNo: '',
    customer: '深圳天图电子有限公司',
    transferType: '暂存',
    totalCount: 36,
    inventoryCount: 0,
    availableCount: 0,
    service: '美森15日达-快递派',
    customerRemark: '客户已确认转出，暂存流程完成',
    overseasWarehouseRemark: '海外仓已完成库存释放',
    salesman: '安一',
    salesRepresentative: '安一',
    followupRepresentative: '李跟单',
    financeRepresentative: '王财务',
    agent: '安逸',
    inboundAt: '2025-12-01 11:26',
    warehouseAt: '2025-12-09 15:42',
    status: '暂存已完成',
  },
];

const makeMockTransitRow = (status: TransitStatus, index: number): OverseasTransitRow => {
  const statusIndex = storageTransitTabs.includes(status)
    ? storageTransitTabs.indexOf(status)
    : allTransitTabs.indexOf(status);
  const totalCount = 18 + ((index * 7) % 62);
  const completed = status === '暂存已完成';
  const inTransit = status === '运输中';
  const availableCount = completed ? 0 : inTransit ? totalCount : Math.max(1, totalCount - (index % 5));

  return {
    headWaybillNo: `USSZAS2607${String(statusIndex + 20).padStart(2, '0')}${String(index + 1).padStart(4, '0')}`,
    transitWaybillNo: '',
    fbaNo: `FBAST${String(statusIndex + 1).padStart(2, '0')}${String(index + 1).padStart(6, '0')}`,
    customerOrderNo: `CO${String(statusIndex + 1)}${String(index + 1).padStart(5, '0')}`,
    customer: ['阿里巴巴', '腾讯科技', '华为技术', '深圳天图电子有限公司', '宁波启航跨境仓储'][index % 5],
    transferType: index % 4 === 0 ? '拦截' : '暂存',
    totalCount,
    inventoryCount: completed ? 0 : totalCount,
    availableCount,
    service: ['美森15日达-快递派', '美森15日达-卡派包税', 'OA以星17日达-快递派', '美线海卡'][index % 4],
    shippedCount: totalCount,
    routeUpdatedAt: inTransit ? `2026-07-${String(10 + (index % 10)).padStart(2, '0')} ${String(9 + (index % 8)).padStart(2, '0')}:30` : '',
    transferNo: inTransit ? `TRK${String(26070000 + index).padStart(8, '0')}` : '',
    referenceId: inTransit ? `REF-FBA-${String(index + 1).padStart(5, '0')}` : '',
    warehouseCode: ['ONT8', 'LAX9', 'GYR3', 'SBD1'][index % 4],
    chargeWeight: String(totalCount * 6),
    actualWeight: String(totalCount * 5.6),
    volumetricWeight: String(totalCount * 6.2),
    volumeCbm: (totalCount * 0.078).toFixed(2),
    zipCode: ['92376', '90001', '85043', '92408'][index % 4],
    customerRemark: completed ? '所有货箱已完成出库' : `mock-${status}-货箱仍按批次管理`,
    overseasWarehouseRemark: completed ? '海外仓已完成库存释放' : '海外仓库存待后续勾选出库',
    salesman: ['安一', '天朗', '张运营'][index % 3],
    salesRepresentative: ['安一', '天朗', '张运营'][index % 3],
    followupRepresentative: ['李跟单', '周跟单', '陈跟单'][index % 3],
    financeRepresentative: ['王财务', '赵财务', '刘财务'][index % 3],
    agent: ['安逸', '李客服', '张运营', ''][index % 4],
    inboundAt: `2026-07-${String(8 + (index % 10)).padStart(2, '0')} ${String(8 + (index % 9)).padStart(2, '0')}:20`,
    warehouseAt: `2026-07-${String(9 + (index % 10)).padStart(2, '0')} ${String(9 + (index % 8)).padStart(2, '0')}:45`,
    status,
  };
};

const transitRows: OverseasTransitRow[] = [
  ...seedTransitRows,
  ...storageTransitTabs.flatMap((status) => {
    const existingCount = seedTransitRows.filter((row) => row.status === status).length;
    return Array.from({ length: Math.max(0, 10 - existingCount) }, (_, index) => makeMockTransitRow(status, existingCount + index));
  }),
].map((row) => ({
  ...row,
  containerNo: row.containerNo || getMockContainerNo(row.headWaybillNo),
  billOfLadingNo: row.billOfLadingNo || getMockBillOfLadingNo(row.headWaybillNo),
  inboundNo: row.inboundNo || getMockInboundNo(row.headWaybillNo),
  shipmentId: row.shipmentId || getMockShipmentId(row.headWaybillNo),
  referenceId: row.referenceId || getMockReferenceId(row.headWaybillNo),
}));

const getTransitRowsWithRemovedBoxes = () => transitRows.map((row) => {
  const removed = getRemovedStorageBoxCount(row.headWaybillNo);
  if (!removed) return row;
  return {
    ...row,
    totalCount: Math.max(0, row.totalCount - removed),
    inventoryCount: Math.max(0, row.inventoryCount - removed),
    availableCount: Math.max(0, row.availableCount - removed),
  };
});
const getStorageBoxNumber = (index: number) => (index < 2 ? `FBA19DTKOWLD000000${index + 1}` : '');
const linkedOrders: LinkedOrderRow[] = [
  {
    id: 'HD2607031028',
    reserveNo: 'YLC260703010',
    customerRef: 'FBA19G6M4C7B',
    warehouseCode: 'ONT8',
    destination: '美国 CA',
    boxes: 18,
    weight: '286.40',
    volume: '1.72',
    service: '美线海卡',
    status: '已到预留仓',
  },
  {
    id: 'HD2607031086',
    reserveNo: 'YLC260703011',
    customerRef: 'FBA19X8B7C9D',
    warehouseCode: 'LAX9',
    destination: '美国 CA',
    boxes: 12,
    weight: '168.20',
    volume: '0.96',
    service: '美线空派',
    status: '已到预留仓',
  },
  {
    id: 'HD2607022219',
    reserveNo: 'YLC260702032',
    customerRef: 'FBA24M9V1K3S',
    warehouseCode: 'ONT8',
    destination: '美国 CA',
    boxes: 22,
    weight: '331.70',
    volume: '2.05',
    service: '海外仓一件代发',
    status: '待中转',
  },
];

const fieldClass =
  'h-8 rounded border border-slate-300 bg-white px-3 text-xs text-slate-700 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500';
const searchLabelClass = 'w-20 shrink-0 text-right font-semibold text-slate-700';
const searchControlClass = `${fieldClass} min-w-0 flex-1`;
const drawerFieldClass =
  'h-8 w-full rounded border border-slate-300 bg-white px-3 text-xs text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500';
const drawerLabelClass = 'w-28 shrink-0 text-right text-xs font-bold text-slate-900';

const requiredMark = <span className="text-red-500">* </span>;

type StorageIdentifierSearchKey = 'inboundNo' | 'shipmentId' | 'referenceId';

type SearchField = {
  label: string;
  type: 'input' | 'select';
  placeholder?: string;
  options?: string[];
  searchKey?: StorageIdentifierSearchKey;
};

const storageIdentifierSearchKeys: StorageIdentifierSearchKey[] = ['inboundNo', 'shipmentId', 'referenceId'];
const emptyStorageIdentifierSearchValues: Record<StorageIdentifierSearchKey, string> = {
  inboundNo: '',
  shipmentId: '',
  referenceId: '',
};

const matchesStorageIdentifierQuery = (value: string | undefined, query: string) => {
  const normalizedQuery = query.trim().toLowerCase();
  return !normalizedQuery || (value || '').toLowerCase().includes(normalizedQuery);
};


const tableHeaders = ['头程运单号', 'FBA单号', '客户单号', '客户简称', '中转单类型', '总件数', '库存件数', '可用件数', '服务', '客户备注', '海外仓备注', '代理', '入仓时间', '仓租时间', '操作'];
const storageExtendedHeaders = [
  '头程运单号',
  '入仓号',
  'Shipment ID',
  'Reference ID',
  '客户单号',
  '运单箱数',
  '可下单箱数',
  '备注',
  '入仓时间（海外仓）',
  '库龄',
  '转单号',
  '仓库代码',
  '收费重',
  '实重',
  '材积重',
  '方数',
  '邮编',
];
const storageIdentifierHeaders = new Set(['入仓号', 'Shipment ID', 'Reference ID']);
const transportationHiddenStorageHeaders = new Set(['入仓号', '入仓时间（海外仓）', '库龄']);

const overseasSearchFields: SearchField[] = [
  { label: '头程运单号', type: 'input', placeholder: '支持批量' },
  { label: 'FBA单号', type: 'input', placeholder: '支持批量' },
  { label: '客户单号', type: 'input', placeholder: '支持批量' },
  { label: '客户简称', type: 'select', options: ['阿里巴巴', '腾讯科技', '华为技术', '深圳天图电子有限公司'] },
  { label: '中转单类型', type: 'select', options: ['暂存', '拦截'] },
  { label: '总件数', type: 'input', placeholder: '请输入' },
  { label: '库存件数', type: 'input', placeholder: '请输入' },
  { label: '可用件数', type: 'input', placeholder: '请输入' },
  { label: '服务', type: 'select', options: ['美森15日达-快递派', '美森15日达-卡派包税', '美线海卡'] },
  { label: '代理', type: 'input', placeholder: '请输入' },
  { label: '入仓时间', type: 'select', options: ['近 7 天', '近 30 天'] },
  { label: '仓租时间', type: 'select', options: ['近 7 天', '近 30 天'] },
  { label: '客户备注', type: 'input', placeholder: '请输入' },
  { label: '海外仓备注', type: 'input', placeholder: '请输入' },
];

const storageSearchFields: SearchField[] = [
  { label: '头程运单号', type: 'input', placeholder: '支持批量' },
  { label: '入仓号', type: 'input', placeholder: '支持单个/模糊查询', searchKey: 'inboundNo' },
  { label: 'Shipment ID', type: 'input', placeholder: '支持单个/模糊查询', searchKey: 'shipmentId' },
  { label: 'Reference ID', type: 'input', placeholder: '支持单个/模糊查询', searchKey: 'referenceId' },
  { label: '客户单号', type: 'input', placeholder: '支持批量' },
  { label: '服务', type: 'select', options: ['美森15日达-快递派', '美森15日达-卡派包税', '美线海卡'] },
  { label: '入仓时间', type: 'select', options: ['近 7 天', '近 30 天'] },
];

const getCompletedStorageAddressForm = (row: OverseasTransitRow): AddressFormState => {
  const warehouseCode = overseasWarehouseCodes[0];
  const warehouseAddress = warehouseAddressBook[warehouseCode];

  return {
    ...emptyAddressForm,
    orderType: 'FBA',
    warehouseCode,
    ...(warehouseAddress || {}),
    remark: row.customerRemark,
    overseasWarehouseRemark: row.overseasWarehouseRemark,
  };
};

const formatLocalDateTime = () => {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
};

const getStorageAgeText = (inboundAt?: string) => {
  if (!inboundAt) return '-';
  const inboundTime = new Date(inboundAt.replace(' ', 'T')).getTime();
  if (Number.isNaN(inboundTime)) return '-';
  const days = Math.floor((Date.now() - inboundTime) / (24 * 60 * 60 * 1000));
  return `${Math.max(0, days)} 天`;
};



function TransitLogDrawer({
  row,
  onClose,
}: {
  row: OverseasTransitRow;
  onClose: () => void;
}) {
  const orderLogs = getCreatedTransitChildOrders()
    .filter((item) => item.parentHeadWaybillNo === row.headWaybillNo)
    .sort((a, b) => b.childCreatedAt.localeCompare(a.childCreatedAt));

  return (
    <div className="fixed inset-0 z-[60] bg-black/45">
      <div className="absolute right-0 top-0 flex h-full w-[860px] max-w-[94vw] flex-col bg-white shadow-2xl">
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-slate-200 px-6">
          <div>
            <h2 className="text-sm font-bold text-slate-950">下单日志</h2>
            <p className="mt-0.5 text-[11px] text-slate-500">头程运单号：{row.headWaybillNo} · {row.customer}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded p-1 text-slate-600 hover:bg-slate-100" aria-label="关闭日志">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto bg-slate-50 p-4">
          <div className="mb-3 grid grid-cols-3 gap-3 rounded border border-slate-200 bg-white px-4 py-3 text-xs">
            <div><span className="font-bold text-slate-900">状态：</span>{row.status}</div>
            <div><span className="font-bold text-slate-900">已下单次数：</span>{orderLogs.length}</div>
            <div><span className="font-bold text-slate-900">已下单箱数：</span>{orderLogs.reduce((sum, item) => sum + item.boxNumbers.length, 0)}</div>
          </div>
          <table className="w-full table-fixed border-collapse bg-white text-xs">
            <thead className="bg-slate-100 text-slate-800">
              <tr>
                {['下单时间', '下单人', '下单箱数', '下单箱号', '海外中转单号', '状态'].map((head) => (
                  <th key={head} className="border border-slate-200 px-3 py-2 text-center font-bold">{head}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orderLogs.length > 0 ? orderLogs.map((log) => (
                <tr key={log.id} className="align-top text-slate-700">
                  <td className="border border-slate-200 px-3 py-2 text-center font-mono">{log.childCreatedAt}</td>
                  <td className="border border-slate-200 px-3 py-2 text-center">{log.merchandiser || log.salesman || '-'}</td>
                  <td className="border border-slate-200 px-3 py-2 text-center">{log.boxNumbers.length}</td>
                  <td className="border border-slate-200 px-3 py-2 font-mono leading-5">{log.boxNumbers.join('、')}</td>
                  <td className="border border-slate-200 px-3 py-2 text-center font-mono">{log.id}</td>
                  <td className="border border-slate-200 px-3 py-2 text-center">{log.status}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="h-24 border border-slate-200 text-center text-slate-400">
                    暂无下单记录
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function DrawerFormRow({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="flex min-w-0 items-center gap-3">
      <span className={drawerLabelClass}>
        {required ? requiredMark : null}
        {label}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </label>
  );
}

function DrawerTextareaRow({
  label,
  limit,
  placeholder,
  required,
  value,
  onChange,
}: {
  label: string;
  limit: string;
  placeholder: string;
  required?: boolean;
  value?: string;
  onChange?: (value: string) => void;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className={`${drawerLabelClass} pt-2`}>
        {required ? requiredMark : null}
        {label}
      </span>
      <div className="min-w-0 flex-1">
        <textarea
          className="h-8 w-full resize-none rounded border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange?.(event.target.value)}
        />
        <div className="-mt-0.5 pr-1 text-right text-[11px] text-slate-400">{limit}</div>
      </div>
    </div>
  );
}

function DrawerReadonlyField({
  label,
  required,
  children,
  className = '',
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex min-w-0 items-start gap-3 ${className}`}>
      <span className={`${drawerLabelClass} pt-1.5`}>
        {required ? requiredMark : null}
        {label}
      </span>
      <div className="min-h-8 min-w-0 flex-1 rounded border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs leading-5 text-slate-700">
        {children || '-'}
      </div>
    </div>
  );
}

function StorageInstructionFormRow({
  label,
  requiredMark,
  children,
}: {
  label: string;
  requiredMark?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="flex min-w-0 items-center gap-3">
      <span className={drawerLabelClass}>
        {requiredMark ? <span className="text-red-500">* </span> : null}
        {label}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </label>
  );
}
function MetricTile({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
}) {
  return (
    <div className="flex items-center gap-3 rounded border border-slate-200 bg-white px-4 py-3">
      <div className="flex h-9 w-9 items-center justify-center rounded bg-blue-50 text-[#004bb1]">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <div className="text-[11px] text-slate-500">{label}</div>
        <div className="mt-0.5 text-base font-bold text-slate-800">{value}</div>
      </div>
    </div>
  );
}

export default function OverseasTransitPage({ addToast, initialView = 'list', mode = 'all' }: OverseasTransitPageProps) {
  const [view, setView] = useState<'list' | 'form'>(initialView);
  const availableTabs = mode === 'storage' ? storageTransitTabs : allTransitTabs;
  const [activeTab, setActiveTab] = useState<TransitStatus | '全部'>(mode === 'storage' ? '运输中' : '全部');
  const [activeStorageOrder, setActiveStorageOrder] = useState<OverseasTransitRow | null>(null);
  const [activeLogOrder, setActiveLogOrder] = useState<OverseasTransitRow | null>(null);
  const [pageTransitRows, setPageTransitRows] = useState<OverseasTransitRow[]>(getTransitRowsWithRemovedBoxes);
  const [storageIdentifierSearchValues, setStorageIdentifierSearchValues] = useState<Record<StorageIdentifierSearchKey, string>>({ ...emptyStorageIdentifierSearchValues });
  const [appliedStorageIdentifierFilters, setAppliedStorageIdentifierFilters] = useState<Record<StorageIdentifierSearchKey, string>>({ ...emptyStorageIdentifierSearchValues });
  const [selectedStorageBoxIndexesByOrder, setSelectedStorageBoxIndexesByOrder] = useState<Record<string, number[]>>({});
  const [storageAddressForm, setStorageAddressForm] = useState<AddressFormState>({ ...emptyAddressForm });
  const [storageReleaseInstruction, setStorageReleaseInstruction] = useState<ReleaseInstruction>('放货');
  const [storageAttachments, setStorageAttachments] = useState<CreatedTransitAttachment[]>([]);
  const [storageInstructionRowsByOrder, setStorageInstructionRowsByOrder] = useState<Record<string, StorageInstructionRow[]>>({});
  const [showStorageInstructionModal, setShowStorageInstructionModal] = useState(false);
  const [selectedStorageInstructionCodes, setSelectedStorageInstructionCodes] = useState<string[]>(storageInstructionFeeRows.slice(0, 3).map((row) => row.code));
  const [storageInstructionUnits, setStorageInstructionUnits] = useState<Record<string, string>>(
    () => Object.fromEntries(storageInstructionFeeRows.map((row) => [row.code, row.unit])),
  );
  const [storageInstructionPrices, setStorageInstructionPrices] = useState<Record<string, string>>(
    () => Object.fromEntries(storageInstructionFeeRows.map((row) => [row.code, row.price])),
  );
  const [storageInstructionQuantities, setStorageInstructionQuantities] = useState<Record<string, string>>(
    () => Object.fromEntries(storageInstructionFeeRows.map((row) => [row.code, '1'])),
  );
  const [storageInstructionCurrencies, setStorageInstructionCurrencies] = useState<Record<string, string>>(
    () => Object.fromEntries(storageInstructionFeeRows.map((row) => [row.code, row.currency])),
  );
  const [editingStorageInstruction, setEditingStorageInstruction] = useState<StorageInstructionRow | null>(null);
  const [deletingStorageInstruction, setDeletingStorageInstruction] = useState<StorageInstructionRow | null>(null);
  useEffect(() => subscribeOverseasTransitFlow(() => setPageTransitRows(getTransitRowsWithRemovedBoxes())), []);
  const searchFields = mode === 'storage' ? storageSearchFields : overseasSearchFields;
  const searchToastText = mode === 'storage' ? '已查询海外暂存数据' : '已查询海外中转单数据';
  const isCompletedStorageOrder = activeStorageOrder?.status === '暂存已完成';
  const activeStorageOrderKey = activeStorageOrder?.headWaybillNo || '';
  const activeStorageSelectedBoxIndexes = activeStorageOrderKey ? (selectedStorageBoxIndexesByOrder[activeStorageOrderKey] || []) : [];
  const activeStorageRemovedBoxNumbers = activeStorageOrderKey ? getRemovedStorageBoxNumbers(activeStorageOrderKey) : [];
  const isStorageSubmissionStatus = mode === 'storage' && (activeStorageOrder?.status === '运输中' || activeStorageOrder?.status === '暂存');
  const activeStorageInstructionRows = activeStorageOrderKey ? (storageInstructionRowsByOrder[activeStorageOrderKey] || []) : [];
  const storageShippingEnabled = getShippingEnabledForReleaseInstruction(storageReleaseInstruction);

  const filteredRows = useMemo(() => {
    const rows = mode === 'storage'
      ? pageTransitRows.filter((row) => storageTransitTabs.includes(row.status))
      : pageTransitRows;
    const statusRows = activeTab === '全部' ? rows : rows.filter((row) => row.status === activeTab);
    return statusRows.filter((row) => storageIdentifierSearchKeys.every((key) => (
      matchesStorageIdentifierQuery(row[key], appliedStorageIdentifierFilters[key])
    )));
  }, [activeTab, appliedStorageIdentifierFilters, mode, pageTransitRows]);
  const isStorageListMode = mode === 'storage';
  const hideStorageTimingColumns = isStorageListMode && activeTab === '运输中';
  const visibleTableHeaders = isStorageListMode
    ? storageExtendedHeaders.filter((header) => !hideStorageTimingColumns || !transportationHiddenStorageHeaders.has(header))
    : tableHeaders;
  const storageTableMinWidthClass = hideStorageTimingColumns ? 'min-w-[2550px]' : 'min-w-[2980px]';

  const getTabCount = (tab: TransitStatus) => {
    const scopedRows = mode === 'storage'
      ? pageTransitRows.filter((row) => storageTransitTabs.includes(row.status))
      : pageTransitRows;
    return scopedRows.filter((row) => row.status === tab).length;
  };

  const applyStorageSearch = () => {
    setAppliedStorageIdentifierFilters({ ...storageIdentifierSearchValues });
    addToast(searchToastText, 'success');
  };

  const resetStorageSearch = () => {
    setStorageIdentifierSearchValues({ ...emptyStorageIdentifierSearchValues });
    setAppliedStorageIdentifierFilters({ ...emptyStorageIdentifierSearchValues });
    addToast('已重置筛选条件', 'info');
  };

  const openDetail = (row?: OverseasTransitRow) => {
    if (mode === 'storage') {
      const nextRow = row || filteredRows[0];
      if (!nextRow) {
        addToast('当前状态下暂无可查看的暂存单', 'warning');
        return;
      }
      setStorageAddressForm(nextRow.status === '暂存已完成' ? getCompletedStorageAddressForm(nextRow) : { ...emptyAddressForm });
      setStorageReleaseInstruction('放货');
      setStorageAttachments([]);
      setActiveStorageOrder(nextRow);
      addToast(`已打开 ${nextRow.headWaybillNo} ${nextRow.status === '暂存已完成' ? '暂存已完成详情' : '中转下单页面'}`, 'info');
      return;
    }
    setView('form');
  };

  const openLog = (row?: OverseasTransitRow) => {
    const nextRow = row || filteredRows[0];
    if (!nextRow) {
      addToast('当前列表暂无可查看的日志', 'warning');
      return;
    }
    setActiveLogOrder(nextRow);
    addToast(`已打开 ${nextRow.headWaybillNo} 操作日志`, 'info');
  };

  const updateStorageAddressField = (field: keyof AddressFormState, value: string) => {
    setStorageAddressForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleStorageWarehouseCodeChange = (value: string) => {
    const nextCode = value.trim().toUpperCase();
    const matchedWarehouse = warehouseAddressBook[nextCode];

    setStorageAddressForm((prev) => ({
      ...prev,
      warehouseCode: nextCode,
      ...(matchedWarehouse || {}),
      company: prev.company,
      remark: prev.remark,
      overseasWarehouseRemark: prev.overseasWarehouseRemark,
    }));
  };

  const toggleStorageBoxIndex = (index: number) => {
    if (!activeStorageOrderKey || !isStorageSubmissionStatus || !getStorageBoxNumber(index)) return;
    setSelectedStorageBoxIndexesByOrder((prev) => {
      const current = prev[activeStorageOrderKey] || [];
      return { ...prev, [activeStorageOrderKey]: current.includes(index) ? current.filter((item) => item !== index) : [...current, index] };
    });
  };

  const cancelStorageSubmission = () => {
    if (activeStorageOrderKey) setSelectedStorageBoxIndexesByOrder((prev) => ({ ...prev, [activeStorageOrderKey]: [] }));
    setStorageReleaseInstruction('放货');
    setStorageAttachments([]);
    setActiveStorageOrder(null);
  };

  const handleStorageAttachmentFileChange = (file?: File) => {
    if (!file) return;
    const sizeInMb = file.size / 1024 / 1024;
    setStorageAttachments([{
      id: `STORAGE-ATT-${Date.now()}`,
      name: file.name,
      type: '其它',
      customerVisible: '可见',
      uploadedAt: formatLocalDateTime(),
      uploadedBy: '天朗（付豪）',
      fileSize: sizeInMb >= 1 ? `${sizeInMb.toFixed(1)}MB` : `${Math.max(1, Math.round(file.size / 1024))}KB`,
      file,
    }]);
    addToast('附件已选择，提交下单后可在子单其它信息中下载', 'info');
  };

  const submitStorageOrder = () => {
    if (!activeStorageOrder || !activeStorageOrderKey || !isStorageSubmissionStatus) return;
    const boxNumbers = activeStorageSelectedBoxIndexes.map(getStorageBoxNumber).filter(Boolean);
    if (boxNumbers.length === 0) { addToast('请先勾选需要提交的箱号', 'warning'); return; }
    if (storageShippingEnabled) {
      if (!storageAddressForm.scheduledShippingTime) { addToast('请选择预约发货时间', 'warning'); return; }
      if (!storageAddressForm.deliveryMethod) { addToast('请选择派送方式', 'warning'); return; }
      if (!storageAddressForm.orderType || !storageAddressForm.warehouseCode || !storageAddressForm.zipCode || !storageAddressForm.city || !storageAddressForm.addressDetail) { addToast('请先填写完整的收件地址信息', 'warning'); return; }
    }
    const orderSeq = getCreatedTransitChildOrders().filter((item) => item.parentHeadWaybillNo === activeStorageOrderKey).length + 1;
    const now = formatLocalDateTime();
    const child: CreatedTransitChildOrder = {
      id: `${activeStorageOrderKey}_${now.slice(5, 10).replace('-', '')}_${orderSeq}`,
      parentHeadWaybillNo: activeStorageOrderKey,
      addressForm: { ...storageAddressForm },
      shippingEnabled: storageShippingEnabled,
      releaseInstruction: storageReleaseInstruction,
      instructions: activeStorageInstructionRows.map((row) => ({ ...row })),
      reconciliationStatus: '未核销',
      overseasWarehouseArrivalStatus: '否',
      fbaCode: activeStorageOrder.fbaNo || `FBA-${activeStorageOrderKey}`,
      customerName: activeStorageOrder.customer,
      destination: storageAddressForm.state ? `${storageAddressForm.city}, ${storageAddressForm.state}` : '美国',
      channel: activeStorageOrder.service,
      childCreatedAt: now,
      orderSeq,
      transferNo: '',
      containerNo: activeStorageOrder.containerNo || '',
      billOfLadingNo: activeStorageOrder.billOfLadingNo || '',
      inboundNo: activeStorageOrder.inboundNo || '',
      shipmentId: activeStorageOrder.shipmentId || '',
      referenceId: activeStorageOrder.referenceId || '',
      customerRemark: storageAddressForm.remark,
      overseasWarehouseRemark: storageAddressForm.overseasWarehouseRemark,
      warehouseCode: storageAddressForm.warehouseCode,
      zipCode: storageAddressForm.zipCode,
      orderType: storageAddressForm.orderType,
      salesman: activeStorageOrder.salesman || '安一',
      merchandiser: '天朗（付豪）',
      status: '待确认',
      packages: boxNumbers.length,
      weight: `${(boxNumbers.length * 6).toFixed(1)}kg`,
      volume: (boxNumbers.length * 0.078).toFixed(2),
      inboundTime: activeStorageOrder.warehouseAt,
      boxNumbers,
      attachments: storageAttachments,
    };
    submitStorageBoxesAsTransitChild(child);
    setSelectedStorageBoxIndexesByOrder((prev) => ({ ...prev, [activeStorageOrderKey]: [] }));
    setStorageInstructionRowsByOrder((prev) => ({ ...prev, [activeStorageOrderKey]: [] }));
    setStorageAttachments([]);
    setStorageAddressForm({ ...emptyAddressForm });
    setStorageReleaseInstruction('放货');
    setActiveStorageOrder(null);
    addToast(`已提交 ${boxNumbers.length} 箱，已生成海外中转单并流转至待确认状态`, 'success');
  };
  const openStorageInstructionSelector = () => {
    if (!activeStorageOrderKey) return;
    const existingRows = storageInstructionRowsByOrder[activeStorageOrderKey] || [];
    setStorageInstructionUnits((prev) => Object.fromEntries(
      storageInstructionFeeRows.map((row) => [
        row.code,
        existingRows.find((item) => item.code === row.code)?.unit || prev[row.code] || row.unit,
      ]),
    ));
    setStorageInstructionPrices((prev) => Object.fromEntries(
      storageInstructionFeeRows.map((row) => [
        row.code,
        existingRows.find((item) => item.code === row.code)?.price || prev[row.code] || row.price,
      ]),
    ));
    setStorageInstructionQuantities((prev) => Object.fromEntries(
      storageInstructionFeeRows.map((row) => [
        row.code,
        existingRows.find((item) => item.code === row.code)?.quantity || prev[row.code] || '1',
      ]),
    ));
    setStorageInstructionCurrencies((prev) => Object.fromEntries(
      storageInstructionFeeRows.map((row) => [
        row.code,
        existingRows.find((item) => item.code === row.code)?.currency || prev[row.code] || row.currency,
      ]),
    ));
    setShowStorageInstructionModal(true);
  };

  const toggleStorageInstructionCode = (code: string) => {
    setSelectedStorageInstructionCodes((prev) => (prev.includes(code) ? prev.filter((item) => item !== code) : [...prev, code]));
  };

  const confirmStorageInstructions = () => {
    if (!activeStorageOrderKey) return;
    const createdAt = formatLocalDateTime();
    const selectedInstructions: StorageInstructionRow[] = storageInstructionFeeRows
      .filter((row) => selectedStorageInstructionCodes.includes(row.code))
      .map((row) => ({
        ...row,
        unit: storageInstructionUnits[row.code]?.trim() || row.unit,
        price: storageInstructionPrices[row.code]?.trim() || row.price,
        quantity: storageInstructionQuantities[row.code]?.trim() || '1',
        currency: storageInstructionCurrencies[row.code]?.trim() || row.currency,
        addedAt: createdAt,
        addedBy: '天朗（付豪）',
      }));

    setStorageInstructionRowsByOrder((prev) => ({
      ...prev,
      [activeStorageOrderKey]: selectedInstructions,
    }));
    setShowStorageInstructionModal(false);
    addToast(`已添加 ${selectedInstructions.length} 条操作指令`, 'success');
  };

  const saveEditingStorageInstruction = () => {
    if (!editingStorageInstruction || !activeStorageOrderKey) return;
    setStorageInstructionRowsByOrder((prev) => ({
      ...prev,
      [activeStorageOrderKey]: (prev[activeStorageOrderKey] || []).map((row) => (
        row.code === editingStorageInstruction.code ? editingStorageInstruction : row
      )),
    }));
    setEditingStorageInstruction(null);
    addToast('操作指令已更新', 'success');
  };

  const confirmDeleteStorageInstruction = () => {
    if (!deletingStorageInstruction || !activeStorageOrderKey) return;
    setStorageInstructionRowsByOrder((prev) => ({
      ...prev,
      [activeStorageOrderKey]: (prev[activeStorageOrderKey] || []).filter((row) => row.code !== deletingStorageInstruction.code),
    }));
    setDeletingStorageInstruction(null);
    addToast('操作指令已删除', 'info');
  };

  if (view === 'form') {
    return (
      <div className="flex-1 overflow-auto bg-slate-100 p-4 font-sans text-slate-700 max-h-[calc(100vh-3rem)]">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setView('list')}
              className="flex h-8 w-8 items-center justify-center rounded border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
              aria-label="返回"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h2 className="text-base font-bold text-slate-900">海外中转单</h2>
              <p className="mt-0.5 text-xs text-slate-500">录入预留仓出库后的海外中转信息，关联待转运单并生成中转批次。</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => addToast('海外中转单已保存为草稿', 'success')}
              className="flex items-center gap-1 rounded border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Save className="h-3.5 w-3.5" />
              保存草稿
            </button>
            <button
              type="button"
              onClick={() => addToast('海外中转单已提交，等待仓库出库', 'success')}
              className="flex items-center gap-1 rounded bg-[#004bb1] px-4 py-2 text-xs font-bold text-white hover:bg-[#003b91]"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              提交中转单
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3">
          <MetricTile label="关联运单" value="3 票" icon={ClipboardList} />
          <MetricTile label="箱数合计" value="52 箱" icon={PackageCheck} />
          <MetricTile label="计费重量" value="786.30 KG" icon={Warehouse} />
          <MetricTile label="总体积" value="4.73 CBM" icon={Ship} />
        </div>

        <div className="mt-4 rounded-md border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3">
            <h3 className="text-sm font-bold text-slate-800">基础信息</h3>
          </div>
          <div className="grid grid-cols-4 gap-x-4 gap-y-3 p-4 text-xs">
            <label className="space-y-1.5">
              <span className="font-semibold text-slate-700">客户</span>
              <input className={`${fieldClass} w-full`} defaultValue="深圳天图电子有限公司" />
            </label>
            <label className="space-y-1.5">
              <span className="font-semibold text-slate-700">海外中转单号</span>
              <input className={`${fieldClass} w-full bg-slate-50`} defaultValue="系统自动生成" readOnly />
            </label>
            <label className="space-y-1.5">
              <span className="font-semibold text-slate-700">起运预留仓</span>
              <select className={`${fieldClass} w-full`} defaultValue="洛杉矶预留仓">
                <option>洛杉矶预留仓</option>
                <option>新泽西预留仓</option>
                <option>伦敦预留仓</option>
                <option>汉堡预留仓</option>
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="font-semibold text-slate-700">海外中转仓</span>
              <select className={`${fieldClass} w-full`} defaultValue="ONT8 海外中转仓">
                <option>ONT8 海外中转仓</option>
                <option>ABE8 中转仓</option>
                <option>BHX4 中转仓</option>
                <option>DTM2 中转仓</option>
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="font-semibold text-slate-700">目的仓</span>
              <input className={`${fieldClass} w-full`} defaultValue="亚马逊 ONT8" />
            </label>
            <label className="space-y-1.5">
              <span className="font-semibold text-slate-700">目的国家</span>
              <select className={`${fieldClass} w-full`} defaultValue="美国">
                <option>美国</option>
                <option>英国</option>
                <option>德国</option>
                <option>加拿大</option>
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="font-semibold text-slate-700">中转服务</span>
              <select className={`${fieldClass} w-full`} defaultValue="海外仓中转派送">
                <option>海外仓中转派送</option>
                <option>拆柜换标中转</option>
                <option>海外仓补货中转</option>
                <option>尾程重派中转</option>
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="font-semibold text-slate-700">预计出库日期</span>
              <input type="date" className={`${fieldClass} w-full`} defaultValue="2026-07-04" />
            </label>
            <label className="col-span-2 space-y-1.5">
              <span className="font-semibold text-slate-700">客户备注</span>
              <input className={`${fieldClass} w-full bg-slate-50`} defaultValue="预留仓库存合并出库，海外仓收货后按 FBA 批次入仓。" readOnly />
            </label>
            <label className="col-span-2 space-y-1.5">
              <span className="font-semibold text-slate-700">海外仓备注</span>
              <input className={`${fieldClass} w-full`} defaultValue="海外仓收货后同步回传入仓异常。" />
            </label>
            <label className="col-span-2 space-y-1.5">
              <span className="font-semibold text-slate-700">仓库操作要求</span>
              <input className={`${fieldClass} w-full`} defaultValue="核对外箱唛头，异常箱先拍照上传后再装车。" />
            </label>
          </div>
        </div>

        <div className="mt-4 rounded-md border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <h3 className="text-sm font-bold text-slate-800">关联运单</h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => addToast('已打开可中转运单选择器', 'info')}
                className="flex items-center gap-1 rounded bg-[#004bb1] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#003b91]"
              >
                <Plus className="h-3.5 w-3.5" />
                添加运单
              </button>
              <button
                type="button"
                onClick={() => addToast('已上传海外仓交接附件', 'success')}
                className="flex items-center gap-1 rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <UploadCloud className="h-3.5 w-3.5" />
                上传附件
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] table-fixed border-collapse text-[11px]">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  {['运单号', '预留仓单号', '客户参考号', '海外仓代码', '目的地', '箱数', '重量(KG)', '体积(CBM)', '服务', '状态', '操作'].map((head) => (
                    <th key={head} className="border border-slate-200 px-3 py-2 text-center font-semibold">
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {linkedOrders.map((row) => (
                  <tr key={row.id} className="h-8 hover:bg-blue-50/30">
                    <td className="border border-slate-200 px-3 text-center font-mono font-semibold text-blue-600">{row.id}</td>
                    <td className="border border-slate-200 px-3 text-center font-mono">{row.reserveNo}</td>
                    <td className="border border-slate-200 px-3 text-center">{row.customerRef}</td>
                    <td className="border border-slate-200 px-3 text-center">{row.warehouseCode}</td>
                    <td className="border border-slate-200 px-3 text-center">{row.destination}</td>
                    <td className="border border-slate-200 px-3 text-center">{row.boxes}</td>
                    <td className="border border-slate-200 px-3 text-center">{row.weight}</td>
                    <td className="border border-slate-200 px-3 text-center">{row.volume}</td>
                    <td className="border border-slate-200 px-3 text-center">{row.service}</td>
                    <td className="border border-slate-200 px-3 text-center">
                      <span className="rounded bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700">{row.status}</span>
                    </td>
                    <td className="border border-slate-200 px-3 text-center">
                      <button type="button" className="font-semibold text-rose-600 hover:underline">
                        移除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-[#f3f4f6] p-3 font-sans text-slate-700 max-h-[calc(100vh-3rem)]">
      <div className="mb-3 rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
        <div className="grid grid-cols-1 items-center gap-x-5 gap-y-4 text-xs md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 [@media(min-width:1800px)]:grid-cols-5">
          {searchFields.map((field) => (
            <label key={field.label} className="flex min-w-0 items-center gap-3">
              <span className={searchLabelClass}>{field.label}</span>
              {field.type === 'select' ? (
                <select className={searchControlClass} defaultValue="">
                  <option value="">请选择</option>
                  {field.options?.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              ) : field.searchKey ? (
                <input
                  className={searchControlClass}
                  value={storageIdentifierSearchValues[field.searchKey]}
                  placeholder={field.placeholder || '请输入'}
                  onChange={(event) => setStorageIdentifierSearchValues((prev) => ({ ...prev, [field.searchKey!]: event.target.value }))}
                />
              ) : (
                <input className={searchControlClass} placeholder={field.placeholder || '请输入'} />
              )}
            </label>
          ))}
          <div className="flex min-w-0 items-center gap-2 pl-[92px]">
            <button type="button" onClick={applyStorageSearch} className="flex h-8 min-w-20 items-center justify-center rounded bg-[#0068d9] px-4 text-xs font-bold text-white shadow-sm hover:bg-[#005ac0]">
              搜索
            </button>
            <button type="button" onClick={resetStorageSearch} className="h-8 min-w-20 rounded border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50">
              重置
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
        <div className="mb-3 flex items-center gap-8 border-b border-slate-200 text-xs font-bold">
          {availableTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`relative px-1 pb-3 ${activeTab === tab ? 'text-[#004bb1]' : 'text-slate-600 hover:text-[#004bb1]'}`}
            >
              {tab}({getTabCount(tab)})
              {activeTab === tab && <span className="absolute inset-x-0 bottom-[-1px] h-0.5 bg-[#004bb1]" />}
            </button>
          ))}
        </div>

        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isStorageListMode ? (
              <>
                {activeTab !== '暂存已完成' && (
                  <button type="button" onClick={() => openDetail()} className="flex w-[90px] items-center justify-center rounded bg-[#0068d9] px-3 py-2 text-xs font-bold text-white hover:bg-[#005ac0]">
                    下单
                  </button>
                )}
                <button type="button" onClick={() => addToast('正在导出海外暂存数据', 'info')} className="flex w-[90px] items-center justify-center rounded bg-[#0068d9] px-3 py-2 text-xs font-bold text-white hover:bg-[#005ac0]">
                  导出
                </button>
                <button type="button" onClick={() => openLog()} className="flex w-[90px] items-center justify-center rounded bg-[#0068d9] px-3 py-2 text-xs font-bold text-white hover:bg-[#005ac0]">
                  日志
                </button>
              </>
            ) : (
              <>
                {activeTab !== '暂存已完成' && (
                  <button type="button" onClick={() => openDetail()} className="flex w-[90px] items-center justify-center rounded bg-[#0068d9] px-3 py-2 text-xs font-bold text-white hover:bg-[#005ac0]">
                    下单
                  </button>
                )}
                <button type="button" onClick={() => addToast('正在导出海外中转单', 'info')} className="flex w-[90px] items-center justify-center rounded bg-[#0068d9] px-3 py-2 text-xs font-bold text-white hover:bg-[#005ac0]">
                  导出
                </button>
                <button type="button" onClick={() => addToast('批量修改面板已打开', 'info')} className="flex w-[90px] items-center justify-center rounded bg-[#0068d9] px-3 py-2 text-xs font-bold text-white hover:bg-[#005ac0]">
                  批量修改
                </button>
                <button type="button" onClick={() => addToast('请选择需要移除的运单', 'warning')} className="flex w-[90px] items-center justify-center rounded bg-[#0068d9] px-3 py-2 text-xs font-bold text-white hover:bg-[#005ac0]">
                  移除运单
                </button>
              </>
            )}
          </div>
          <div />
        </div>

        <div className="overflow-x-auto border border-slate-200">
          <table className={`w-full ${isStorageListMode ? storageTableMinWidthClass : 'min-w-[1800px]'} table-fixed border-collapse text-[11px]`}>
            {isStorageListMode && (
              <colgroup>
                <col style={{ width: '40px' }} />
                {visibleTableHeaders.map((head, index) => (
                  <col key={'storage-col-' + index + '-' + head} style={{ width: index === 0 ? '184px' : index === 1 ? '156px' : index === 2 ? '128px' : index === 3 ? '156px' : storageIdentifierHeaders.has(head) ? '160px' : '130px' }} />
                ))}
              </colgroup>
            )}
            <thead className="bg-[#f2f2f2] text-slate-800">
              <tr>
                <th className={'w-10 border border-slate-200 px-2 py-2 text-center ' + (isStorageListMode ? 'sticky left-0 z-30 bg-[#f2f2f2]' : '')}>
                  <input type="checkbox" readOnly className="h-3.5 w-3.5 rounded border-slate-300" />
                </th>
                {visibleTableHeaders.map((head, index) => (
                  <th
                    key={head}
                    className={'border border-slate-300 py-2 font-semibold ' + (isStorageListMode && index < 3 ? 'px-2 ' : 'px-3 ') + (
                      isStorageListMode && index === 0
                        ? 'sticky left-10 z-30 bg-[#f2f2f2] text-left shadow-[1px_0_0_0_rgba(148,163,184,0.45)]'
                        : 'text-center'
                    )}
                  >
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr
                  key={row.headWaybillNo}
                  onDoubleClick={() => openDetail(row)}
                  title={row.status === '暂存已完成' ? '双击查看暂存已完成详情' : '双击打开中转下单'}
                  className={`group cursor-pointer text-slate-700 transition-colors hover:bg-blue-50/50 ${isStorageListMode ? 'h-12 bg-white' : 'h-8'}`}
                >
                  <td className={`border border-slate-300 px-2 text-center ${isStorageListMode ? 'sticky left-0 z-20 bg-white group-hover:bg-blue-50' : ''}`}>
                    <input type="checkbox" readOnly className="h-3.5 w-3.5 rounded border-slate-300" />
                  </td>
                      {isStorageListMode ? (
                        <>
                          <td className="sticky left-10 z-20 border border-slate-300 bg-white px-2 text-left font-mono group-hover:bg-blue-50">
                            <span className="block truncate font-semibold text-slate-800" title={row.headWaybillNo}>{row.headWaybillNo}</span>
                          </td>
                          {!hideStorageTimingColumns && (
                            <td className="border border-slate-300 px-2 text-center font-mono">{row.inboundNo || '-'}</td>
                          )}
                          <td className="border border-slate-300 px-2 text-center font-mono">{row.shipmentId || '-'}</td>
                          <td className="border border-slate-300 px-2 text-center font-mono">{row.referenceId || '-'}</td>
                          <td className="border border-slate-300 px-3 text-center">{row.customerOrderNo}</td>
                          <td className="border border-slate-300 px-3 text-right tabular-nums">{row.totalCount}</td>
                          <td className="border border-slate-300 px-3 text-right tabular-nums">{getRemainingBoxCount(row)}</td>
                          <td className="border border-slate-300 px-3 text-left" title={row.customerRemark || ''}><div className="truncate">{row.customerRemark || '-'}</div></td>
                          {!hideStorageTimingColumns && (
                            <>
                              <td className="border border-slate-300 px-3 text-center font-mono">{row.inboundAt}</td>
                              <td className="border border-slate-300 px-3 text-center">{getStorageAgeText(row.inboundAt)}</td>
                            </>
                          )}
                          <td className="border border-slate-300 px-3 text-center font-mono">{row.transferNo || '-'}</td>
                          <td className="border border-slate-300 px-3 text-center">{row.warehouseCode || '-'}</td>
                          <td className="border border-slate-300 px-3 text-center">{row.chargeWeight || '-'}</td>
                          <td className="border border-slate-300 px-3 text-center">{row.actualWeight || '-'}</td>
                          <td className="border border-slate-300 px-3 text-center">{row.volumetricWeight || '-'}</td>
                          <td className="border border-slate-300 px-3 text-center">{row.volumeCbm || '-'}</td>
                          <td className="border border-slate-300 px-3 text-center font-mono">{row.zipCode || '-'}</td>
                        </>
                      ) : (
                        <>
                          <td className="border border-slate-300 px-3 text-center font-mono">{row.headWaybillNo}</td>
                          <td className="border border-slate-300 px-3 text-center font-mono">{row.fbaNo}</td>
                          <td className="border border-slate-300 px-3 text-center">{row.customerOrderNo}</td>
                          <td className="border border-slate-300 px-3 text-center">{row.customer}</td>
                          <td className="border border-slate-300 px-3 text-center">{row.transferType}</td>
                          <td className="border border-slate-300 px-3 text-center">{row.totalCount}</td>
                          <td className="border border-slate-300 px-3 text-center">{row.inventoryCount}</td>
                          <td className="border border-slate-300 px-3 text-center">{row.availableCount}</td>
                          <td className="border border-slate-300 px-3 text-center">{row.service}</td>
                          <td className="border border-slate-300 px-3 text-center">{row.customerRemark}</td>
                          <td className="border border-slate-300 px-3 text-center">{row.overseasWarehouseRemark}</td>
                          <td className="border border-slate-300 px-3 text-center">{row.agent}</td>
                          <td className="border border-slate-300 px-3 text-center font-mono">{row.inboundAt}</td>
                          <td className="border border-slate-300 px-3 text-center font-mono">{row.warehouseAt}</td>
                          <td className="border border-slate-200 px-3 text-center">
                            <button type="button" onClick={() => openDetail(row)} className="font-semibold text-blue-600 hover:underline">
                              查看
                            </button>
                          </td>
                        </>
                      )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-end gap-5 border-t border-slate-100 px-2 py-3 text-xs text-slate-600">
          <span>共 {filteredRows.length} 条</span>
          <select className="h-8 rounded border border-slate-300 bg-white px-3 outline-none">
            <option>100条/页</option>
            <option>50条/页</option>
            <option>20条/页</option>
          </select>
          <button type="button" className="text-slate-300">&lt;</button>
          <span className="font-bold text-blue-600">1</span>
          <button type="button" className="text-slate-300">&gt;</button>
          <span>前往</span>
          <input value="1" readOnly className="h-8 w-14 rounded border border-slate-300 px-2 text-center outline-none" />
          <span>页</span>
        </div>
      </div>

      {activeStorageOrder && (
        <div className="fixed inset-0 z-50 bg-black/55">
          <div className="absolute right-0 top-0 flex h-full w-[66vw] min-w-[980px] flex-col bg-slate-50 shadow-2xl">
            <div className="flex h-11 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-9">
              <h2 className="text-sm font-bold text-slate-950">{isCompletedStorageOrder ? '暂存已完成详情' : '中转下单'}</h2>
              <button
                type="button"
                onClick={() => { setStorageAttachments([]); setActiveStorageOrder(null); setShowStorageInstructionModal(false); }}
                className="rounded p-1 text-slate-700 hover:bg-slate-100"
                aria-label="关闭"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {isCompletedStorageOrder ? (
                <section className="mb-3 rounded-2xl border border-slate-200 bg-white px-7 py-4">
                  <h3 className="mb-5 text-sm font-bold text-slate-950">基础信息</h3>
                  <div className="grid grid-cols-2 gap-x-16 gap-y-4">
                    <DrawerReadonlyField label="头程运单号">{activeStorageOrder.headWaybillNo}</DrawerReadonlyField>
                    <DrawerReadonlyField label="入仓号">{activeStorageOrder.inboundNo || '-'}</DrawerReadonlyField>
                    <DrawerReadonlyField label="Shipment ID">{activeStorageOrder.shipmentId || '-'}</DrawerReadonlyField>
                    <DrawerReadonlyField label="Reference ID">{activeStorageOrder.referenceId || '-'}</DrawerReadonlyField>
                    <DrawerReadonlyField label="客户单号">{activeStorageOrder.customerOrderNo || '-'}</DrawerReadonlyField>
                    <DrawerReadonlyField label="状态">{activeStorageOrder.status}</DrawerReadonlyField>
                    <DrawerReadonlyField label="运单箱数">{activeStorageOrder.totalCount}</DrawerReadonlyField>
                    <DrawerReadonlyField label="可下单箱数">{getRemainingBoxCount(activeStorageOrder)}</DrawerReadonlyField>
                    <DrawerReadonlyField label="服务" className="col-span-2">{activeStorageOrder.service}</DrawerReadonlyField>
                    <DrawerReadonlyField label="入仓时间">{activeStorageOrder.inboundAt}</DrawerReadonlyField>
                    <DrawerReadonlyField label="库龄">{getStorageAgeText(activeStorageOrder.inboundAt)}</DrawerReadonlyField>
                    <DrawerReadonlyField label="备注" className="col-span-2">{activeStorageOrder.customerRemark || '-'}</DrawerReadonlyField>
                  </div>
                </section>
              ) : (
                <div className="mb-3 grid grid-cols-4 gap-x-8 gap-y-3 rounded-2xl border border-slate-200 bg-white px-8 py-5 text-xs">
                  <div>
                    <span className="font-bold text-blue-600">头程运单号：</span>
                    <span className="font-mono text-blue-600">{activeStorageOrder.headWaybillNo}</span>
                  </div>
                  {activeStorageOrder.status !== '运输中' && (
                    <div>
                      <span className="font-bold text-slate-900">入仓号：</span>
                      <span className="font-mono">{activeStorageOrder.inboundNo || '-'}</span>
                    </div>
                  )}
                  <div>
                    <span className="font-bold text-slate-900">Shipment ID：</span>
                    <span className="font-mono">{activeStorageOrder.shipmentId || '-'}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-900">Reference ID：</span>
                    <span className="font-mono">{activeStorageOrder.referenceId || '-'}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-900">目的地：</span>
                    <span>美国</span>
                  </div>
                  <div className="col-span-2">
                    <span className="font-bold text-slate-900">服务：</span>
                    <span>{activeStorageOrder.service}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="font-bold text-slate-900">备注：</span>
                    <span>{activeStorageOrder.customerRemark || '-'}</span>
                  </div>
                </div>
              )}

              <section className="rounded-2xl border border-slate-200 bg-white px-7 py-4">
                {!isCompletedStorageOrder && (
                  <div className="mb-5 flex items-center gap-5 border-b border-slate-100 pb-4 text-xs">
                    <span className="font-bold text-slate-950">下单类型</span>
                    {releaseInstructionOptions.map((option) => (
                      <label key={option} className="inline-flex items-center gap-1.5 font-semibold text-slate-700">
                        <input
                          type="radio"
                          className="h-3.5 w-3.5 accent-[#004bb1]"
                          checked={storageReleaseInstruction === option}
                          onChange={() => setStorageReleaseInstruction(option)}
                        />
                        {option}
                      </label>
                    ))}
                  </div>
                )}
                {(isCompletedStorageOrder || storageShippingEnabled) ? (
                  <>
                <h3 className="mb-5 text-sm font-bold text-slate-950">收件地址信息</h3>
                <div className="grid grid-cols-2 gap-x-16 gap-y-4">
                  {isCompletedStorageOrder ? (
                    <>
                      <DrawerReadonlyField label="运单类型" required>{storageAddressForm.orderType}</DrawerReadonlyField>
                      <DrawerReadonlyField label="仓库代码" required>{storageAddressForm.warehouseCode}</DrawerReadonlyField>
                      <DrawerReadonlyField label="邮编" required>{storageAddressForm.zipCode}</DrawerReadonlyField>
                      <DrawerReadonlyField label="收件人">{storageAddressForm.consignee}</DrawerReadonlyField>
                      {storageAddressForm.orderType === '私人地址' && (
                        <DrawerReadonlyField label="电话" required>{storageAddressForm.phone}</DrawerReadonlyField>
                      )}
                      <DrawerReadonlyField label="城市" required>{storageAddressForm.city}</DrawerReadonlyField>
                      <DrawerReadonlyField label="州">{storageAddressForm.state}</DrawerReadonlyField>
                      <DrawerReadonlyField label="公司">{storageAddressForm.company || '-'}</DrawerReadonlyField>
                      <DrawerReadonlyField label="地址详情" required className="col-span-2">{storageAddressForm.addressDetail}</DrawerReadonlyField>
                      <DrawerReadonlyField label="备注" className="col-span-2">{storageAddressForm.remark || '-'}</DrawerReadonlyField>
                      <DrawerReadonlyField label="海外仓备注" className="col-span-2">{storageAddressForm.overseasWarehouseRemark || '-'}</DrawerReadonlyField>
                    </>
                  ) : (
                    <>
                      <DrawerFormRow label="运单类型" required>
                        <select
                          className={drawerFieldClass}
                          value={storageAddressForm.orderType}
                          onChange={(event) => updateStorageAddressField('orderType', event.target.value)}
                        >
                          {overseasOrderTypes.map((type) => (
                            <option key={type}>{type}</option>
                          ))}
                        </select>
                      </DrawerFormRow>

                      <DrawerFormRow label="仓库代码" required>
                        <>
                          <input
                            className={drawerFieldClass}
                            list="storage-warehouse-codes"
                            placeholder="请输入仓库代码"
                            value={storageAddressForm.warehouseCode}
                            onChange={(event) => handleStorageWarehouseCodeChange(event.target.value)}
                          />
                          <datalist id="storage-warehouse-codes">
                            {overseasWarehouseCodes.map((code) => (
                              <option key={code} value={code} />
                            ))}
                          </datalist>
                        </>
                      </DrawerFormRow>
                      <DrawerFormRow label="邮编" required>
                        <input
                          className={drawerFieldClass}
                          placeholder="请输入邮编"
                          value={storageAddressForm.zipCode}
                          onChange={(event) => updateStorageAddressField('zipCode', event.target.value)}
                        />
                      </DrawerFormRow>
                      <DrawerFormRow label="收件人">
                        <input
                          className={drawerFieldClass}
                          placeholder="请输入收件人"
                          value={storageAddressForm.consignee}
                          onChange={(event) => updateStorageAddressField('consignee', event.target.value)}
                        />
                      </DrawerFormRow>
                      {storageAddressForm.orderType === '私人地址' && (
                        <DrawerFormRow label="电话" required>
                          <input
                            className={drawerFieldClass}
                            placeholder="请输入电话"
                            value={storageAddressForm.phone}
                            onChange={(event) => updateStorageAddressField('phone', event.target.value)}
                          />
                        </DrawerFormRow>
                      )}
                      <DrawerFormRow label="城市" required>
                        <input
                          className={drawerFieldClass}
                          placeholder="请输入城市"
                          value={storageAddressForm.city}
                          onChange={(event) => updateStorageAddressField('city', event.target.value)}
                        />
                      </DrawerFormRow>
                      <DrawerFormRow label="州">
                        <input
                          className={drawerFieldClass}
                          placeholder="请输入州"
                          value={storageAddressForm.state}
                          onChange={(event) => updateStorageAddressField('state', event.target.value)}
                        />
                      </DrawerFormRow>
                      <DrawerFormRow label="公司">
                        <input
                          className={drawerFieldClass}
                          placeholder="请输入公司"
                          value={storageAddressForm.company}
                          onChange={(event) => updateStorageAddressField('company', event.target.value)}
                        />
                      </DrawerFormRow>
                      <DrawerTextareaRow
                        label="地址详情"
                        placeholder="请输入地址详情"
                        limit={`${storageAddressForm.addressDetail.length}/100`}
                        required
                        value={storageAddressForm.addressDetail}
                        onChange={(value) => updateStorageAddressField('addressDetail', value)}
                      />
                      <DrawerFormRow label='预约发货时间' required>
                        <input
                          type='datetime-local'
                          className={drawerFieldClass}
                          required
                          value={storageAddressForm.scheduledShippingTime}
                          onChange={(event) => updateStorageAddressField('scheduledShippingTime', event.target.value)}
                        />
                      </DrawerFormRow>
                      <DrawerFormRow label='派送方式' required>
                        <select
                          className={drawerFieldClass}
                          required
                          value={storageAddressForm.deliveryMethod}
                          onChange={(event) => updateStorageAddressField('deliveryMethod', event.target.value)}
                        >
                          <option value="">请选择派送方式</option>
                          {overseasDeliveryMethods.map((method) => (
                            <option key={method} value={method}>{method}</option>
                          ))}
                        </select>
                      </DrawerFormRow>
                      <DrawerTextareaRow
                        label="备注"
                        placeholder="请输入备注"
                        limit={`${storageAddressForm.remark.length}/500`}
                        value={storageAddressForm.remark}
                        onChange={(value) => updateStorageAddressField('remark', value)}
                      />
                    </>
                  )}
                </div>
                <div className="mt-5 border-t border-slate-100 pt-4">
                  <div className="flex items-start gap-3 text-xs">
                    <span className="w-24 shrink-0 pt-2 text-right font-bold text-slate-900">附件上传：</span>
                    <div className="min-w-0 flex-1">
                      <label className="inline-flex h-8 cursor-pointer items-center rounded bg-[#004bb1] px-5 text-xs font-bold text-white hover:bg-[#003b91]">
                        选择附件
                        <input
                          type="file"
                          className="hidden"
                          onChange={(event) => {
                            handleStorageAttachmentFileChange(event.target.files?.[0]);
                            event.currentTarget.value = '';
                          }}
                        />
                      </label>
                      {storageAttachments.length > 0 ? (
                        <div className="mt-3 flex items-center gap-2 rounded border border-slate-200 bg-slate-50 px-3 py-2">
                          <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                          <span className="min-w-0 flex-1 truncate">{storageAttachments[0].name}</span>
                          <span className="text-slate-400">{storageAttachments[0].fileSize}</span>
                          <button type="button" onClick={() => setStorageAttachments([])} className="font-bold text-red-500 hover:underline">删除</button>
                        </div>
                      ) : (
                        <div className="mt-3 text-[11px] text-slate-400">暂未上传附件</div>
                      )}
                    </div>
                  </div>
                </div>
                  </>
                ) : (
                  <div className="flex gap-8">
                    <div className="min-w-0 flex-1">
                      <DrawerTextareaRow
                        label="备注"
                        placeholder="请输入备注"
                        limit={`${storageAddressForm.remark.length}/500`}
                        value={storageAddressForm.remark}
                        onChange={(value) => updateStorageAddressField('remark', value)}
                      />
                    </div>
                    <div className="flex items-start gap-3 text-xs" style={{ width: '380px', flexShrink: 0 }}>
                      <span className="w-20 shrink-0 pt-1.5 text-right font-bold text-slate-900">附件上传：</span>
                      <div className="min-w-0 flex-1">
                        <label className="inline-flex h-8 cursor-pointer items-center rounded bg-[#004bb1] px-5 text-xs font-bold text-white hover:bg-[#003b91]">
                          选择附件
                          <input
                            type="file"
                            className="hidden"
                            onChange={(event) => {
                              handleStorageAttachmentFileChange(event.target.files?.[0]);
                              event.currentTarget.value = '';
                            }}
                          />
                        </label>
                        {storageAttachments.length > 0 ? (
                          <div className="mt-3 flex items-center gap-2 rounded border border-slate-200 bg-slate-50 px-3 py-2">
                            <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                            <span className="min-w-0 flex-1 truncate">{storageAttachments[0].name}</span>
                            <span className="text-slate-400">{storageAttachments[0].fileSize}</span>
                            <button type="button" onClick={() => setStorageAttachments([])} className="font-bold text-red-500 hover:underline">删除</button>
                          </div>
                        ) : (
                          <div className="mt-3 text-[11px] text-slate-400">暂未上传附件</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </section>

              <section className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-4">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-950">货箱信息</h3>
                  <div className="text-xs font-bold text-orange-500">申报币种：USD · 总申报价值：390</div>
                </div>

                <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-700">
                  <span className="font-bold text-slate-900"><span className="text-red-500">*</span>材质</span>
                  {['带磁', '带电', '纺织品', '玻璃制品', '普货', '玩具', 'FDA产品', '成人用品', '木制品', '钢铁铝类', '冲突类', '电子类', '灯类', '自行车类', '粉末', '液体', '敏感货', '木制品非报关件'].map((item) => (
                    <label key={item} className="inline-flex items-center gap-1.5 whitespace-nowrap">
                      <input type="checkbox" disabled={isCompletedStorageOrder} readOnly checked={item === '纺织品' || item === '普货'} className="h-3.5 w-3.5 cursor-not-allowed rounded border-slate-300 text-blue-600 disabled:opacity-60" />
                      <span>{item}</span>
                    </label>
                  ))}
                </div>

                <button type="button" disabled={isCompletedStorageOrder} className="mb-3 rounded bg-blue-600 px-5 py-1.5 text-xs font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500">
                  新增10行
                </button>

                <div className="overflow-x-auto border border-slate-200">
                  <table className="w-full min-w-[2480px] table-fixed border-collapse text-[11px] text-slate-700">
                    <thead className="bg-slate-50 text-slate-700">
                      <tr>
                        {['#', '', 'FBA/IBR箱号', 'PO Number', '产品英文名', '产品中文名', '产品申报单价', '产品申报数量', '产品申报总价', '产品材质', '产品海关编码', '产品用途', '产品品牌', '产品型号', '产品图片链接', '产品销售链接', '货箱重量(KG)', '货箱长度(CM)', '货箱宽度(CM)', '货箱高度(CM)'].map((head) => (
                          <th key={head || 'check'} className="border border-slate-200 px-3 py-2 text-center">
                            {head ? head : <input type="checkbox" disabled={!isStorageSubmissionStatus} checked={activeStorageSelectedBoxIndexes.length === 2} onChange={(event) => setSelectedStorageBoxIndexesByOrder((prev) => ({ ...prev, [activeStorageOrderKey]: event.target.checked ? [0, 1] : [] }))} className="h-3.5 w-3.5 rounded border-slate-300 disabled:cursor-not-allowed disabled:opacity-60" />}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: 10 }).map((_, index) => (
                        <tr key={index} className={activeStorageRemovedBoxNumbers.includes(getStorageBoxNumber(index)) ? 'hidden' : 'h-8'}>
                          <td className="border border-slate-200 px-2 text-center text-slate-500">{index + 1}</td>
                          <td className="border border-slate-200 px-2 text-center"><input type="checkbox" disabled={!isStorageSubmissionStatus || index > 1 || !getStorageBoxNumber(index) || activeStorageRemovedBoxNumbers.includes(getStorageBoxNumber(index))} checked={activeStorageSelectedBoxIndexes.includes(index)} onChange={() => toggleStorageBoxIndex(index)} className="h-3.5 w-3.5 rounded border-slate-300 disabled:cursor-not-allowed disabled:opacity-60" /></td>
                          <td className="border border-slate-200 px-3 text-center font-mono">{index < 2 ? `FBA19DTKOWLD000000${index + 1}` : ''}</td>
                          <td className="border border-slate-200 px-3 text-center">{index < 2 ? '1DT1ZZLZ' : ''}</td>
                          <td className="border border-slate-200 px-3 text-center">{index < 2 ? "dog's hind leg joints" : ''}</td>
                          <td className="border border-slate-200 px-3 text-center">{index < 2 ? '犬类后腿关节支撑' : ''}</td>
                          <td className="border border-slate-200 px-3 text-center">{index < 2 ? '6' : ''}</td>
                          <td className="border border-slate-200 px-3 text-center">{index < 2 ? (index === 0 ? '47' : '18') : ''}</td>
                          <td className="border border-slate-200 px-3 text-center">{index < 2 ? (index === 0 ? '282' : '108') : ''}</td>
                          <td className="border border-slate-200 px-3 text-center">{index < 2 ? '纺织品' : ''}</td>
                          <td className="border border-slate-200 px-3 text-center">{index < 2 ? '6307900090' : ''}</td>
                          <td className="border border-slate-200 px-3 text-center">{index < 2 ? '宠物护理' : ''}</td>
                          <td className="border border-slate-200 px-3 text-center">{index < 2 ? 'PetGuard' : ''}</td>
                          <td className="border border-slate-200 px-3 text-center">{index < 2 ? 'HLJ-01' : ''}</td>
                          <td className="truncate border border-slate-200 px-3 text-center text-blue-600">{index < 2 ? `https://example.com/image-${index + 1}.jpg` : ''}</td>
                          <td className="truncate border border-slate-200 px-3 text-center text-blue-600">{index < 2 ? `https://example.com/product-${index + 1}` : ''}</td>
                          <td className="border border-slate-200 px-3 text-center">{index < 2 ? (index === 0 ? '18.6' : '9.2') : ''}</td>
                          <td className="border border-slate-200 px-3 text-center">{index < 2 ? (index === 0 ? '52' : '45') : ''}</td>
                          <td className="border border-slate-200 px-3 text-center">{index < 2 ? (index === 0 ? '41' : '36') : ''}</td>
                          <td className="border border-slate-200 px-3 text-center">{index < 2 ? (index === 0 ? '38' : '30') : ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {isStorageSubmissionStatus && (
              <section className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-4">
                <h3 className="mb-4 pl-3 text-sm font-bold text-slate-950">操作指令</h3>
                <button
                  type="button"
                  onClick={openStorageInstructionSelector}
                  className="mb-5 ml-3 rounded bg-blue-600 px-7 py-1.5 text-xs font-bold text-white hover:bg-blue-700"
                >
                  新增
                </button>
                <table className="w-full table-fixed border-collapse text-xs">
                  <thead className="bg-slate-50 text-slate-900">
                    <tr>
                      {['费用名称', '费用类型', '*计费单位', '*计费单价（元）', '*计费数量', '*币种', '总价（元）', '添加时间', '添加人', '描述', '操作'].map((head) => (
                        <th key={head} className="border border-slate-200 px-3 py-3 text-center font-bold">
                          {head}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {activeStorageInstructionRows.length > 0 ? (
                      activeStorageInstructionRows.map((row) => (
                        <tr key={row.code} className="h-9 text-slate-700">
                          <td className="border border-slate-200 px-3 text-center">{row.name}</td>
                          <td className="border border-slate-200 px-3 text-center">{row.type}</td>
                          <td className="border border-slate-200 px-3 text-center">{row.unit}</td>
                          <td className="border border-slate-200 px-3 text-center">{row.price}</td>
                          <td className="border border-slate-200 px-3 text-center">{row.quantity || '1'}</td>
                          <td className="border border-slate-200 px-3 text-center">{row.currency}</td>
                          <td className="border border-slate-200 px-3 text-center">{formatStorageInstructionFeeAmount(parseStorageInstructionFeeNumber(row.price) * (row.quantity?.trim() ? parseStorageInstructionFeeNumber(row.quantity) : 1))}</td>
                          <td className="border border-slate-200 px-3 text-center">{row.addedAt || '-'}</td>
                          <td className="border border-slate-200 px-3 text-center">{row.addedBy || '-'}</td>
                          <td className="border border-slate-200 px-3 text-center">{row.description}</td>
                          <td className="border border-slate-200 px-3 text-center">
                            <button type="button" onClick={() => setEditingStorageInstruction(row)} className="mr-3 font-semibold text-blue-600 hover:underline">编辑</button>
                            <button type="button" onClick={() => setDeletingStorageInstruction(row)} className="font-semibold text-red-500 hover:underline">删除</button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={11} className="h-24 border border-slate-200 text-center text-slate-300">
                          <FileText className="mx-auto mb-2 h-8 w-8 text-slate-200" />
                          暂无数据
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </section>
              )}

              {isStorageSubmissionStatus && (
                <div className="mt-6 flex justify-center gap-4 border-t border-slate-200 pt-5">
                  <button type="button" onClick={submitStorageOrder} className="rounded bg-blue-600 px-10 py-2 text-xs font-bold text-white hover:bg-blue-700">提交</button>
                  <button type="button" onClick={cancelStorageSubmission} className="rounded border border-slate-300 bg-white px-10 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">取消</button>
                </div>
              )}            </div>
              {showStorageInstructionModal && (
                <div className="absolute inset-0 z-[90] bg-black/50">
                  <div className="absolute right-0 top-0 flex h-full w-[72vw] min-w-[980px] flex-col bg-white shadow-2xl">
                    <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 px-8">
                      <h3 className="text-sm font-bold text-slate-950">添加指令</h3>
                      <button
                        type="button"
                        onClick={() => setShowStorageInstructionModal(false)}
                        className="rounded p-1 text-slate-600 hover:bg-slate-100"
                        aria-label="关闭添加指令"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="min-h-0 flex-1 overflow-auto bg-[#f3f7fd] p-4">
                      <div className="rounded-2xl bg-white p-4 shadow-sm">
                        <div className="mb-4 grid grid-cols-[auto_220px_auto_220px_auto_auto] items-center gap-4 text-xs">
                          <span className="font-bold text-slate-900">费用名称：</span>
                          <input className={fieldClass} placeholder="请输入代码/名称" />
                          <span className="font-bold text-slate-900">费用类型：</span>
                          <select className={fieldClass} defaultValue="">
                            <option value="">请选择费用类型</option>
                            <option>仓储费</option>
                            <option>操作费</option>
                          </select>
                          <button className="h-8 rounded bg-blue-600 px-8 text-xs font-bold text-white hover:bg-blue-700" type="button">搜索</button>
                          <button className="h-8 rounded border border-slate-300 bg-white px-8 text-xs font-semibold text-slate-700 hover:bg-slate-50" type="button">重置</button>
                        </div>

                        <table className="w-full table-fixed border-collapse text-xs">
                          <thead className="bg-slate-50 text-slate-900">
                            <tr>
                              <th className="w-12 border border-slate-200 px-2 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={selectedStorageInstructionCodes.length === storageInstructionFeeRows.length}
                                  onChange={(event) => setSelectedStorageInstructionCodes(event.target.checked ? storageInstructionFeeRows.map((row) => row.code) : [])}
                                  className="h-3.5 w-3.5 rounded border-slate-300"
                                />
                              </th>
                              {['费用代码', '费用名称', '费用类型', '计费单位', '计费单价', '计费数量', '币种', '描述'].map((head) => (
                                <th key={head} className="border border-slate-200 px-3 py-2 text-center font-bold">{head}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {Array.from({ length: 18 }).map((_, index) => {
                              const row = storageInstructionFeeRows[index];
                              const isSelectedFee = !!row && selectedStorageInstructionCodes.includes(row.code);
                              return (
                                <tr key={index} className={`h-8 ${index % 2 === 1 ? 'bg-slate-50' : 'bg-white'}`}>
                                  <td className="border border-slate-200 px-2 text-center">
                                    <input type="checkbox" disabled={!row} checked={isSelectedFee} onChange={() => row && toggleStorageInstructionCode(row.code)} className="h-3.5 w-3.5 rounded border-slate-300" />
                                  </td>
                                  <td className="border border-slate-200 px-3 text-center font-mono">{row?.code || ''}</td>
                                  <td className="border border-slate-200 px-3 text-center">{row?.name || ''}</td>
                                  <td className="border border-slate-200 px-3 text-center">{row?.type || ''}</td>
                                  <td className="border border-slate-200 px-2 text-center">
                                    {row ? (
                                      <select
                                        value={storageInstructionUnits[row.code] ?? row.unit}
                                        onChange={(event) => setStorageInstructionUnits((prev) => ({ ...prev, [row.code]: event.target.value }))}
                                        className="h-7 w-full min-w-0 rounded border border-slate-200 bg-white px-2 text-center text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                                        aria-label={`${row.name}计费单位`}
                                      >
                                        <option value="票">票</option>
                                        <option value="箱">箱</option>
                                        <option value="KG">KG</option>
                                      </select>
                                    ) : null}
                                  </td>
                                  <td className="border border-slate-200 px-2 text-center">
                                    {row ? (
                                      <input
                                        type="number"
                                        min="0"
                                        step="any"
                                        value={storageInstructionPrices[row.code] ?? row.price}
                                        onChange={(event) => setStorageInstructionPrices((prev) => ({ ...prev, [row.code]: event.target.value }))}
                                        onBlur={() => setStorageInstructionPrices((prev) => ({ ...prev, [row.code]: prev[row.code]?.trim() || row.price }))}
                                        className="h-7 w-full min-w-0 rounded border border-slate-200 px-2 text-center text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                                        aria-label={`${row.name}计费单价`}
                                      />
                                    ) : null}
                                  </td>
                                  <td className="border border-slate-200 px-2 text-center">
                                    {row ? (
                                      <input
                                        type="number"
                                        min="0"
                                        step="any"
                                        value={storageInstructionQuantities[row.code] ?? '1'}
                                        onChange={(event) => setStorageInstructionQuantities((prev) => ({ ...prev, [row.code]: event.target.value }))}
                                        onBlur={() => setStorageInstructionQuantities((prev) => ({ ...prev, [row.code]: prev[row.code]?.trim() || '1' }))}
                                        className="h-7 w-full min-w-0 rounded border border-slate-200 px-2 text-center text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                                        aria-label={`${row.name}计费数量`}
                                      />
                                    ) : null}
                                  </td>
                                  <td className="border border-slate-200 px-2 text-center">
                                    {row ? (
                                      <select
                                        value={storageInstructionCurrencies[row.code] ?? row.currency}
                                        onChange={(event) => setStorageInstructionCurrencies((prev) => ({ ...prev, [row.code]: event.target.value }))}
                                        className="h-7 w-full min-w-0 rounded border border-slate-200 bg-white px-2 text-center text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                                        aria-label={`${row.name}币种`}
                                      >
                                        <option>人民币</option>
                                        <option>USD</option>
                                      </select>
                                    ) : null}
                                  </td>
                                  <td className="border border-slate-200 px-3 text-center">{row?.description || ''}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>

                        <div className="mt-4 flex items-center justify-between text-xs text-slate-600">
                          <span>已选中{selectedStorageInstructionCodes.length}条</span>
                          <div className="flex items-center gap-2">
                            <span>共 50 条</span>
                            {[1, 2, 3, 4, 5].map((page) => (
                              <button
                                key={page}
                                type="button"
                                className={`h-7 w-7 rounded border text-xs ${page === 1 ? 'border-slate-700 bg-slate-700 text-white' : 'border-slate-200 bg-white text-slate-600'}`}
                              >
                                {page}
                              </button>
                            ))}
                            <span>...</span>
                            <button type="button" className="h-7 rounded border border-slate-200 bg-white px-2 text-xs">50</button>
                            <select className="h-7 rounded border border-slate-200 bg-white px-2 text-xs" defaultValue="10">
                              <option value="10">10/页</option>
                              <option value="20">20/页</option>
                            </select>
                            <span>转到</span>
                            <input className="h-7 w-12 rounded border border-slate-200 px-2 text-xs" defaultValue="8" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex h-14 shrink-0 items-center justify-center gap-5 border-t border-slate-200 bg-white">
                      <button
                        type="button"
                        onClick={confirmStorageInstructions}
                        className="rounded bg-blue-600 px-8 py-1.5 text-xs font-bold text-white hover:bg-blue-700"
                      >
                        确认
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowStorageInstructionModal(false)}
                        className="rounded border border-slate-300 bg-white px-8 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {editingStorageInstruction && (
                <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/50">
                  <div className="w-[520px] bg-white shadow-2xl">
                    <div className="border-b border-slate-200 px-5 py-4">
                      <h3 className="text-sm font-bold text-slate-950">编辑费用项</h3>
                    </div>
                    <div className="space-y-4 px-12 py-6 text-xs">
                      <StorageInstructionFormRow label="费用代码" requiredMark>
                        <input className={`${fieldClass} bg-slate-100`} value={editingStorageInstruction.code} readOnly />
                      </StorageInstructionFormRow>
                      <StorageInstructionFormRow label="费用名称" requiredMark>
                        <input className={`${fieldClass} bg-slate-100`} value={editingStorageInstruction.name} readOnly />
                      </StorageInstructionFormRow>
                      <StorageInstructionFormRow label="费用类型" requiredMark>
                        <select className={`${fieldClass} bg-slate-100`} value={editingStorageInstruction.type} disabled>
                          <option>仓储费</option>
                          <option>操作费</option>
                        </select>
                      </StorageInstructionFormRow>
                      <StorageInstructionFormRow label="计费单位" requiredMark>
                        <select className={fieldClass} value={editingStorageInstruction.unit} onChange={(event) => setEditingStorageInstruction({ ...editingStorageInstruction, unit: event.target.value })}>
                          <option>票</option>
                          <option>箱</option>
                          <option>KG</option>
                        </select>
                      </StorageInstructionFormRow>
                      <StorageInstructionFormRow label="计费单价" requiredMark>
                        <input className={fieldClass} value={editingStorageInstruction.price} onChange={(event) => setEditingStorageInstruction({ ...editingStorageInstruction, price: event.target.value })} />
                      </StorageInstructionFormRow>
                      <StorageInstructionFormRow label="计费数量" requiredMark>
                        <input className={fieldClass} value={editingStorageInstruction.quantity || '1'} onChange={(event) => setEditingStorageInstruction({ ...editingStorageInstruction, quantity: event.target.value })} />
                      </StorageInstructionFormRow>
                      <StorageInstructionFormRow label="币种" requiredMark>
                        <select className={fieldClass} value={editingStorageInstruction.currency} onChange={(event) => setEditingStorageInstruction({ ...editingStorageInstruction, currency: event.target.value })}>
                          <option>人民币</option>
                          <option>USD</option>
                        </select>
                      </StorageInstructionFormRow>
                    </div>
                    <div className="flex justify-end gap-3 px-12 pb-8">
                      <button type="button" onClick={() => setEditingStorageInstruction(null)} className="rounded border border-slate-300 bg-white px-6 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">取消</button>
                      <button type="button" onClick={saveEditingStorageInstruction} className="rounded bg-blue-600 px-6 py-1.5 text-xs font-bold text-white hover:bg-blue-700">确定</button>
                    </div>
                  </div>
                </div>
              )}
              {deletingStorageInstruction && (
                <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/50">
                  <div className="w-[460px] bg-white shadow-2xl">
                    <div className="border-b border-slate-200 px-5 py-4">
                      <h3 className="text-sm font-bold text-slate-950">删除费用项</h3>
                    </div>
                    <div className="px-10 py-8 text-center text-sm text-slate-800">确定删除费用项“{deletingStorageInstruction.name}”吗？</div>
                    <div className="flex justify-end gap-3 px-8 pb-7">
                      <button type="button" onClick={() => setDeletingStorageInstruction(null)} className="rounded border border-slate-300 bg-white px-6 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">取消</button>
                      <button type="button" onClick={confirmDeleteStorageInstruction} className="rounded bg-blue-600 px-6 py-1.5 text-xs font-bold text-white hover:bg-blue-700">确定</button>
                    </div>
                  </div>
                </div>
              )}
          </div>
        </div>
      )}

      {activeLogOrder && (
        <TransitLogDrawer row={activeLogOrder} onClose={() => setActiveLogOrder(null)} />
      )}
    </div>
  );
}
