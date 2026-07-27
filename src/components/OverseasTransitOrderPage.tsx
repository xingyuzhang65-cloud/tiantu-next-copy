import React, { useEffect, useState } from 'react';
import {
  FileText,
  Printer,
  Search,
  Settings2,
  X,
} from 'lucide-react';
import {
  emptyAddressForm,
  overseasDeliveryMethods,
  overseasOrderTypes,
  overseasWarehouseCodes,
  warehouseAddressBook,
} from './overseasTransitAddress';
import type { AddressFormState } from './overseasTransitAddress';
import { cancelCreatedTransitChildOrders, confirmCreatedTransitChildOrders, getCreatedTransitChildOrders, markCreatedTransitChildOrdersAsOrdered, rejectCreatedTransitChildOrders, rollbackCreatedTransitChildOrdersToConfirmed, rollbackCreatedTransitChildOrdersToOrdered, rollbackSignedCreatedTransitChildOrdersToTransit, shipCreatedTransitChildOrders, signCreatedTransitChildOrders, subscribeOverseasTransitFlow, updateCreatedTransitChildOrderInstructions, updateCreatedTransitChildOrderRemarks } from './overseasTransitFlow';
import type { CreatedTransitAttachment, CreatedTransitChildOrder, CreatedTransitInstruction, OverseasWarehouseArrivalStatus, TransitReconciliationStatus } from './overseasTransitFlow';

interface OverseasTransitOrderPageProps {
  addToast: (msg: string, type: 'success' | 'info' | 'warning') => void;
  activeNode?: string;
  onNodeChange?: (node: string) => void;
}

interface OverseasTransitRow {
  id: string;
  fbaCode: string;
  customerName: string;
  destination: string;
  channel: string;
  childCreatedAt?: string;
  orderSeq?: number;
  transferNo?: string;
  containerNo?: string;
  billOfLadingNo?: string;
  inboundNo?: string;
  shipmentId?: string;
  referenceId?: string;
  orderedAt?: string;
  outboundAt?: string;
  signedAt?: string;
  customerRemark?: string;
  overseasWarehouseRemark?: string;
  warehouseCode?: string;
  zipCode?: string;
  orderType?: string;
  deliveryMethod?: string;
  addressForm?: AddressFormState;
  instructions?: CreatedTransitInstruction[];
  reconciliationStatus?: TransitReconciliationStatus;
  overseasWarehouseArrivalStatus?: OverseasWarehouseArrivalStatus;
  salesman?: string;
  merchandiser?: string;
  status: string;
  packages: number;
  weight: string;
  volume: string;
  inboundTime: string;
  boxNumbers?: string[];
  attachments?: CreatedTransitAttachment[];
}

interface TransitTransferRow {
  systemBoxNo: string;
  fbaBoxNo: string;
  carrierCompany: string;
  transferNo: string;
}

const overseasTransitNodes = ['待确认', '已确认', '已下单', '转运中', '签收', '驳回', '取消'];
// 已确认详情与已下单共用运单详情二级页签；仅待确认保留可编辑的下单表单。
const orderFormStatuses = new Set(['待确认', '驳回']);
const remarkEditableStatuses = new Set(['已确认', '已下单', '转运中', '签收']);

const getOrderDeliveryMethod = (row: OverseasTransitRow) =>
  row.addressForm?.deliveryMethod
  || row.deliveryMethod
  || (row.channel.includes('卡') ? '卡车派送' : '快递派送');

const getMockContainerNo = (source: string) =>
  'MSCU' + source.replace(/\D/g, '').slice(-7).padStart(7, '0');

const getMockBillOfLadingNo = (source: string) =>
  'TTBL' + source.replace(/\D/g, '').slice(-10).padStart(10, '0');

const getMockIdentifierSerial = (source: string, createdAt: string | undefined, orderSeq = 1) =>
  source.replace(/\D/g, '').slice(-6).padStart(6, '0')
  + String(createdAt || '').replace(/\D/g, '').slice(-8).padStart(8, '0')
  + String(orderSeq).padStart(2, '0');

const getMockInboundNo = (source: string, createdAt: string | undefined, orderSeq = 1) =>
  'INB' + getMockIdentifierSerial(source, createdAt, orderSeq);

const getMockShipmentId = (source: string, createdAt: string | undefined, orderSeq = 1) =>
  'SHP' + getMockIdentifierSerial(source, createdAt, orderSeq);

const getMockReferenceId = (source: string, createdAt: string | undefined, orderSeq = 1) =>
  'REF-FBA-' + getMockIdentifierSerial(source, createdAt, orderSeq);

const getMockReconciliationStatus = (orderSeq = 1): TransitReconciliationStatus => (
  ['未核销', '部分核销', '已核销'][(Math.max(orderSeq, 1) - 1) % 3] as TransitReconciliationStatus
);

const getMockOverseasWarehouseArrivalStatus = (orderSeq = 1): OverseasWarehouseArrivalStatus =>
  orderSeq % 2 === 0 ? '是' : '否';

const shiftMockDateTime = (value: string, hours: number) => {
  const normalized = value.length === 16 ? `${value.replace(' ', 'T')}:00` : value.replace(' ', 'T');
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;

  date.setHours(date.getHours() + hours);
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

const seedTransitRows: OverseasTransitRow[] = [
  {
    id: 'YT2507100001',
    fbaCode: 'FBA19DNZH02MU000318',
    customerName: '深圳天图电子有限公司',
    destination: '美国',
    channel: '美森正班13日达-卡派包税',
    childCreatedAt: '2026-07-10 09:18',
    orderSeq: 1,
    transferNo: '1Z0VV966030991',
    customerRemark: '第一批出库箱2、箱3',
    overseasWarehouseRemark: '海外仓已预约尾程交接',
    warehouseCode: 'ONT8',
    zipCode: '92551',
    orderType: 'FBA',
    salesman: '安一',
    merchandiser: '安逸',
    status: '转运中',
    packages: 2,
    weight: '96.4kg',
    volume: '0.48',
    inboundTime: '2026-07-09 15:21',
  },
  {
    id: 'YT2507100001',
    fbaCode: 'FBA19DNZH02MU000319',
    customerName: '深圳天图电子有限公司',
    destination: '美国',
    channel: '美森正班13日达-卡派包税',
    childCreatedAt: '2026-07-10 14:36',
    orderSeq: 2,
    transferNo: '1Z0VV966030992',
    customerRemark: '第二批出库箱1、箱5',
    overseasWarehouseRemark: '海外仓等待贴标确认',
    warehouseCode: 'ONT8',
    zipCode: '92551',
    orderType: 'FBA',
    salesman: '安一',
    merchandiser: '安逸',
    status: '已下单',
    packages: 2,
    weight: '88.0kg',
    volume: '0.42',
    inboundTime: '2026-07-09 15:21',
  },
  {
    id: 'YT2507100001',
    fbaCode: 'FBA19DNZH02MU000320',
    customerName: '深圳天图电子有限公司',
    destination: '美国',
    channel: '美线海卡',
    childCreatedAt: '2026-07-11 10:05',
    orderSeq: 1,
    transferNo: '888711227145',
    customerRemark: '隔天补发箱4，序号重新从1开始',
    overseasWarehouseRemark: '海外仓已复核体积重',
    warehouseCode: 'PSC2',
    zipCode: '99301',
    orderType: 'Walmart',
    salesman: '安一',
    merchandiser: '李客服',
    status: '签收',
    packages: 1,
    weight: '45.3kg',
    volume: '0.24',
    inboundTime: '2026-07-09 15:21',
  },
  {
    id: 'YT2507100002',
    fbaCode: 'FBACTES1617',
    customerName: '博创跨境贸易',
    destination: '美国',
    channel: '美线海卡',
    childCreatedAt: '2026-07-10 11:05',
    orderSeq: 1,
    transferNo: '8851511973',
    customerRemark: '样品件请单独下单',
    overseasWarehouseRemark: '海外仓需单独分拣',
    warehouseCode: 'PSC2',
    zipCode: '99301',
    orderType: 'Walmart',
    salesman: '天朗',
    merchandiser: '李客服',
    status: '转运中',
    packages: 3,
    weight: '118.0kg',
    volume: '0.71',
    inboundTime: '2026-07-09 16:02',
  },
  {
    id: 'YT2507100002',
    fbaCode: 'FBACTEE1741',
    customerName: '博创跨境贸易',
    destination: '美国',
    channel: '美线海卡',
    childCreatedAt: '2026-07-10 16:42',
    orderSeq: 2,
    transferNo: '8851511974',
    customerRemark: '同日第二批出库',
    overseasWarehouseRemark: '尾程标签已打印',
    warehouseCode: 'PSC2',
    zipCode: '99301',
    orderType: 'Walmart',
    salesman: '天朗',
    merchandiser: '李客服',
    status: '已下单',
    packages: 4,
    weight: '154.8kg',
    volume: '0.82',
    inboundTime: '2026-07-09 16:02',
  },
  {
    id: 'YT2507100003',
    fbaCode: 'FBACTEST937',
    customerName: '星链家居出口部',
    destination: '美国',
    channel: '美森正班13日达-卡派包税',
    childCreatedAt: '2026-07-10 13:47',
    orderSeq: 1,
    transferNo: '1Z0VV966030993',
    customerRemark: '客户确认后再安排下单',
    overseasWarehouseRemark: '海外仓待确认收货窗口',
    warehouseCode: 'ABE2',
    zipCode: '18031',
    orderType: 'FBA',
    salesman: '天朗',
    merchandiser: '李客服',
    status: '待确认',
    packages: 5,
    weight: '159.4kg',
    volume: '0.92',
    inboundTime: '2026-07-10 08:47',
  },
  {
    id: 'YT2507100004',
    fbaCode: 'FBA18HL83QJ0',
    customerName: '上海豪迅美中快递中心',
    destination: '美国',
    channel: '美线海派',
    childCreatedAt: '2026-07-11 09:12',
    orderSeq: 1,
    transferNo: '885151176528',
    customerRemark: '私人地址请电话预约',
    overseasWarehouseRemark: '海外仓需核对收件电话',
    warehouseCode: 'FTW1',
    zipCode: '75241',
    orderType: '私人地址',
    salesman: '张运营',
    merchandiser: '安逸',
    status: '已确认',
    packages: 6,
    weight: '205.7kg',
    volume: '1.23',
    inboundTime: '2026-07-10 14:04',
  },
  {
    id: 'YT2507100005',
    fbaCode: 'FBA18HLGVVK6',
    customerName: '常晟供应链集团',
    destination: '美国',
    channel: '美森正班13日达-卡派包税',
    childCreatedAt: '2026-07-11 15:26',
    orderSeq: 1,
    transferNo: '1Z0VV966030994',
    customerRemark: '客户取消本次出库',
    overseasWarehouseRemark: '海外仓停止出库操作',
    warehouseCode: 'ONT8',
    zipCode: '92551',
    orderType: 'FBA',
    salesman: '安一',
    merchandiser: '李客服',
    status: '取消',
    packages: 4,
    weight: '126.4kg',
    volume: '0.68',
    inboundTime: '2026-07-10 18:16',
  },
  {
    id: 'YT2507120001',
    fbaCode: 'FBA19CANCEL8',
    customerName: '广州跨境供应链',
    destination: '美国',
    channel: '美线空派',
    childCreatedAt: '2026-07-12 10:22',
    orderSeq: 1,
    transferNo: 'AIR20260712001',
    customerRemark: '急件优先派送',
    overseasWarehouseRemark: '海外仓已出库',
    warehouseCode: 'LAX9',
    zipCode: '91710',
    orderType: 'TikTok',
    salesman: '张运营',
    merchandiser: '安逸',
    status: '转运中',
    packages: 2,
    weight: '62.0kg',
    volume: '0.35',
    inboundTime: '2026-07-11 20:10',
  },
  {
    id: 'YT2507120001',
    fbaCode: 'FBA19CANCEL9',
    customerName: '广州跨境供应链',
    destination: '美国',
    channel: '美线空派',
    childCreatedAt: '2026-07-12 17:55',
    orderSeq: 2,
    transferNo: 'AIR20260712002',
    customerRemark: '同日第二批急件',
    overseasWarehouseRemark: '海外仓已完成复核',
    warehouseCode: 'LAX9',
    zipCode: '91710',
    orderType: 'TikTok',
    salesman: '张运营',
    merchandiser: '安逸',
    status: '已下单',
    packages: 3,
    weight: '84.5kg',
    volume: '0.46',
    inboundTime: '2026-07-11 20:10',
  },
  {
    id: 'YT2507130001',
    fbaCode: 'FBA20WAIT001',
    customerName: '宁波启航跨境仓储',
    destination: '美国',
    channel: '美森正班13日达-卡派包税',
    childCreatedAt: '2026-07-13 09:08',
    orderSeq: 1,
    transferNo: 'WAIT20260713001',
    customerRemark: '第一批勾选箱2、箱6',
    overseasWarehouseRemark: '待确认尾程地址',
    warehouseCode: 'ONT8',
    zipCode: '92551',
    orderType: 'FBA',
    salesman: '安一',
    merchandiser: '安逸',
    status: '待确认',
    packages: 2,
    weight: '74.6kg',
    volume: '0.39',
    inboundTime: '2026-07-12 18:25',
  },
  {
    id: 'YT2507130001',
    fbaCode: 'FBA20WAIT002',
    customerName: '宁波启航跨境仓储',
    destination: '美国',
    channel: '美线海卡',
    childCreatedAt: '2026-07-13 15:40',
    orderSeq: 2,
    transferNo: 'WAIT20260713002',
    customerRemark: '同日第二批勾选箱1',
    overseasWarehouseRemark: '等待客户确认标签',
    warehouseCode: 'PSC2',
    zipCode: '99301',
    orderType: 'Walmart',
    salesman: '安一',
    merchandiser: '李客服',
    status: '待确认',
    packages: 1,
    weight: '31.8kg',
    volume: '0.18',
    inboundTime: '2026-07-12 18:25',
  },
  {
    id: 'YT2507130002',
    fbaCode: 'FBA20CONFIRM001',
    customerName: '杭州星越家居',
    destination: '美国',
    channel: '美线海派',
    childCreatedAt: '2026-07-13 11:20',
    orderSeq: 1,
    transferNo: 'CFM20260713001',
    customerRemark: '需拆分私人地址派送',
    overseasWarehouseRemark: '地址资料已核对',
    warehouseCode: 'FTW1',
    zipCode: '75241',
    orderType: '私人地址',
    salesman: '张运营',
    merchandiser: '安逸',
    status: '已确认',
    packages: 3,
    weight: '102.4kg',
    volume: '0.57',
    inboundTime: '2026-07-12 19:10',
  },
  {
    id: 'YT2507130005',
    fbaCode: 'FBA20EUDE001',
    customerName: '宁波启航跨境仓储',
    destination: '德国',
    channel: '欧线卡派',
    childCreatedAt: '2026-07-13 13:28',
    orderSeq: 1,
    transferNo: '',
    customerRemark: '德国仓预约周二送达',
    overseasWarehouseRemark: '欧仓已完成地址和税号预审',
    warehouseCode: 'DTM2',
    zipCode: '44145',
    orderType: 'FBA',
    addressForm: {
      ...emptyAddressForm,
      orderType: 'FBA',
      warehouseCode: 'DTM2',
      zipCode: '44145',
      consignee: 'Amazon DTM2',
      phone: '+49 231 000000',
      city: 'Dortmund',
      state: 'Nordrhein-Westfalen',
      company: 'Amazon Logistik Dortmund GmbH',
      addressDetail: 'Kaltbandstrasse 4',
      remark: '德国仓预约周二送达',
      overseasWarehouseRemark: '欧仓已完成地址和税号预审',
    },
    salesman: '天朗',
    merchandiser: '安逸',
    status: '已确认',
    packages: 2,
    weight: '64.8kg',
    volume: '0.36',
    inboundTime: '2026-07-12 20:05',
    boxNumbers: ['EUDTM2-0001', 'EUDTM2-0002'],
  },
  {
    id: 'YT2507130006',
    fbaCode: 'FBA20EUGB001',
    customerName: '厦门万和供应链',
    destination: '英国',
    channel: '欧线快递',
    childCreatedAt: '2026-07-13 14:16',
    orderSeq: 1,
    transferNo: '',
    customerRemark: '英国仓需要预约号随标签打印',
    overseasWarehouseRemark: '欧仓等待生成尾程面单',
    warehouseCode: 'BHX4',
    zipCode: 'CV23 8BQ',
    orderType: 'FBA',
    addressForm: {
      ...emptyAddressForm,
      orderType: 'FBA',
      warehouseCode: 'BHX4',
      zipCode: 'CV23 8BQ',
      consignee: 'Amazon BHX4',
      phone: '+44 1788 000000',
      city: 'Rugby',
      state: 'Warwickshire',
      company: 'Amazon UK Services Ltd',
      addressDetail: 'Plot 1, Central Park',
      remark: '英国仓需要预约号随标签打印',
      overseasWarehouseRemark: '欧仓等待生成尾程面单',
    },
    salesman: '张运营',
    merchandiser: '李客服',
    status: '已确认',
    packages: 3,
    weight: '89.6kg',
    volume: '0.44',
    inboundTime: '2026-07-12 20:42',
    boxNumbers: ['EUBHX4-0001', 'EUBHX4-0002', 'EUBHX4-0003'],
  },
  {
    id: 'YT2507130003',
    fbaCode: 'FBA20SIGN001',
    customerName: '厦门万和供应链',
    destination: '美国',
    channel: '美线空派',
    childCreatedAt: '2026-07-13 12:06',
    orderSeq: 1,
    transferNo: 'POD20260713001',
    customerRemark: '签收后回传 POD',
    overseasWarehouseRemark: 'POD 已回传客户',
    warehouseCode: 'LAX9',
    zipCode: '91710',
    orderType: 'TikTok',
    salesman: '天朗',
    merchandiser: '李客服',
    status: '签收',
    packages: 2,
    weight: '58.2kg',
    volume: '0.31',
    inboundTime: '2026-07-12 21:45',
  },
  {
    id: 'YT2507130004',
    fbaCode: 'FBA20CANCEL001',
    customerName: '苏州恒通跨境',
    destination: '美国',
    channel: '美森正班13日达-卡派包税',
    childCreatedAt: '2026-07-13 16:18',
    orderSeq: 1,
    transferNo: 'CXL20260713001',
    customerRemark: '客户取消该批箱子出库',
    overseasWarehouseRemark: '海外仓已终止操作',
    warehouseCode: 'ABE2',
    zipCode: '18031',
    orderType: 'FBA',
    salesman: '安一',
    merchandiser: '李客服',
    status: '取消',
    packages: 2,
    weight: '69.9kg',
    volume: '0.36',
    inboundTime: '2026-07-12 22:18',
  },
];

const makeMockTransitRow = (status: string, index: number): OverseasTransitRow => {
  const statusIndex = overseasTransitNodes.indexOf(status);
  const headNo = `YT2507${String(statusIndex + 20).padStart(2, '0')}${String(Math.floor(index / 3) + 1).padStart(4, '0')}`;
  const createdDay = 10 + (index % 4);
  const sequence = (index % 3) + 1;
  const carrierCode = status === '取消' ? 'CXL' : status === '驳回' ? 'REJ' : status === '签收' ? 'POD' : status === '转运中' ? 'TRN' : status === '已下单' ? 'ORD' : status === '已确认' ? 'CFM' : 'WAT';
  const warehouseCode = overseasWarehouseCodes[index % overseasWarehouseCodes.length];
  const warehouseAddress = warehouseAddressBook[warehouseCode];

  return {
    id: headNo,
    fbaCode: `FBA${String(statusIndex + 21).padStart(2, '0')}${String(index + 1).padStart(6, '0')}`,
    customerName: ['深圳天图电子有限公司', '博创跨境贸易', '宁波启航跨境仓储', '杭州星越家居', '厦门万和供应链'][index % 5],
    destination: '美国',
    channel: ['美森正班13日达-卡派包税', '美线海卡', '美线海派', '美线空派'][index % 4],
    childCreatedAt: `2026-07-${String(createdDay).padStart(2, '0')} ${String(9 + (index % 8)).padStart(2, '0')}:${String((index * 7) % 60).padStart(2, '0')}`,
    orderSeq: sequence,
    transferNo: `${carrierCode}202607${String(createdDay).padStart(2, '0')}${String(index + 1).padStart(3, '0')}`,
    customerRemark: `mock-${status}-第${index + 1}批勾选货箱`,
    overseasWarehouseRemark: status === '取消' ? '海外仓已终止操作' : '海外仓按批次处理出库',
    warehouseCode,
    zipCode: warehouseAddress.zipCode,
    orderType: overseasOrderTypes[index % overseasOrderTypes.length],
    salesman: ['安一', '天朗', '张运营'][index % 3],
    merchandiser: ['安逸', '李客服'][index % 2],
    status,
    packages: 1 + (index % 6),
    weight: `${(42 + index * 8.6).toFixed(1)}kg`,
    volume: (0.22 + index * 0.07).toFixed(2),
    inboundTime: `2026-07-${String(createdDay - 1).padStart(2, '0')} 18:${String((index * 5) % 60).padStart(2, '0')}`,
  };
};

const transitRows: OverseasTransitRow[] = [
  ...seedTransitRows,
  ...overseasTransitNodes.flatMap((status) => {
    const existingCount = seedTransitRows.filter((row) => row.status === status).length;
    return Array.from({ length: Math.max(0, 10 - existingCount) }, (_, index) => makeMockTransitRow(status, existingCount + index));
  }),
].map((row) => {
  const hasOrdered = row.status === '已下单' || row.status === '转运中' || row.status === '签收' || row.status === '驳回';
  const hasOutbound = row.status === '转运中' || row.status === '签收' || row.status === '驳回';
  const hasSigned = row.status === '签收' || row.status === '驳回';

  return {
    ...row,
    containerNo: row.containerNo || getMockContainerNo(row.id),
    billOfLadingNo: row.billOfLadingNo || getMockBillOfLadingNo(row.id),
    inboundNo: row.inboundNo || getMockInboundNo(row.id, row.childCreatedAt || row.inboundTime, row.orderSeq),
    shipmentId: row.shipmentId || getMockShipmentId(row.id, row.childCreatedAt || row.inboundTime, row.orderSeq),
    referenceId: row.referenceId || getMockReferenceId(row.id, row.childCreatedAt || row.inboundTime, row.orderSeq),
    reconciliationStatus: row.reconciliationStatus || getMockReconciliationStatus(row.orderSeq),
    overseasWarehouseArrivalStatus: row.overseasWarehouseArrivalStatus || getMockOverseasWarehouseArrivalStatus(row.orderSeq),
    orderedAt: row.orderedAt || (hasOrdered ? shiftMockDateTime(row.childCreatedAt || row.inboundTime, 2) : undefined),
    outboundAt: row.outboundAt || (hasOutbound ? shiftMockDateTime(row.childCreatedAt || row.inboundTime, 6) : undefined),
    signedAt: row.signedAt || (hasSigned ? shiftMockDateTime(row.childCreatedAt || row.inboundTime, 30) : undefined),
  };
});

const fieldClass =
  'h-8 w-full rounded border border-slate-300 bg-white px-3 text-xs text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-500';
const labelClass = 'w-28 shrink-0 text-right text-xs font-bold text-slate-900';
const required = <span className="text-red-500">* </span>;

type LifecycleTimeKey = 'orderedAt' | 'outboundAt' | 'signedAt';
type LifecycleTimeValues = Partial<Record<LifecycleTimeKey, string | undefined>>;

type ExpressLineTab = '美线打单' | '欧线打单';

type ExpressBatchConfig = {
  platform: string;
  businessUnit: string;
  shippingAccount: string;
  service: string;
  labelSpec: string;
  currency: string;
  signatureService: string;
  tradeTerm: string;
  taxNumber: string;
};

type ExpressCreationRecord = {
  line: ExpressLineTab;
  trackingNo: string;
  platform: string;
  shippingAccount: string;
  service: string;
  createdAt: string;
};

type IdentifierSearchKey = 'inboundNo' | 'shipmentId' | 'referenceId';
type OrderFilterKey = IdentifierSearchKey | 'overseasWarehouseArrivalStatus' | 'reconciliationStatus' | 'deliveryMethod';
type ConfirmedOrderSubmissionCheck = 'reconciliation' | 'arrival';

type OrderSearchField = {
  label: string;
  type: 'input' | 'select' | 'date';
  placeholder?: string;
  options?: string[];
  searchKey?: LifecycleTimeKey | OrderFilterKey;
};

const orderFilterKeys: OrderFilterKey[] = ['inboundNo', 'shipmentId', 'referenceId', 'overseasWarehouseArrivalStatus', 'reconciliationStatus', 'deliveryMethod'];
const emptyOrderFilterValues: Record<OrderFilterKey, string> = {
  inboundNo: '',
  shipmentId: '',
  referenceId: '',
  overseasWarehouseArrivalStatus: '',
  reconciliationStatus: '',
  deliveryMethod: '',
};

const matchesOrderFilterQuery = (value: string | undefined, query: string) => {
  const normalizedQuery = query.trim().toLowerCase();
  return !normalizedQuery || (value || '').toLowerCase().includes(normalizedQuery);
};

const lifecycleTimeConfigByStatus: Partial<Record<string, { label: string; key: LifecycleTimeKey }>> = {
  已下单: { label: '下单时间', key: 'orderedAt' },
  转运中: { label: '出仓时间', key: 'outboundAt' },
  签收: { label: '签收时间', key: 'signedAt' },
};

const orderSearchControlClass = `${fieldClass} min-w-0 flex-1`;
const orderSearchLabelClass = 'w-32 shrink-0 text-right font-semibold text-slate-700';

const baseOrderSearchFields: OrderSearchField[] = [
  { label: '头程运单号', type: 'input', placeholder: '支持批量' },
  { label: 'FBA单号', type: 'input', placeholder: '支持批量' },
  { label: '柜号', type: 'input', placeholder: '支持批量' },
  { label: '提单号', type: 'input', placeholder: '支持批量' },
  { label: '入仓号', type: 'input', placeholder: '支持单个/模糊查询', searchKey: 'inboundNo' },
  { label: 'Shipment ID', type: 'input', placeholder: '支持单个/模糊查询', searchKey: 'shipmentId' },
  { label: 'Reference ID', type: 'input', placeholder: '支持单个/模糊查询', searchKey: 'referenceId' },
  { label: '核销状态', type: 'select', options: ['已核销', '未核销', '部分核销'], searchKey: 'reconciliationStatus' },
  { label: '客户简称', type: 'select', options: ['深圳天图电子有限公司', '博创跨境贸易', '广州跨境供应链'] },
  { label: '仓库代码', type: 'select', options: overseasWarehouseCodes },
  { label: '派送方式', type: 'select', options: overseasDeliveryMethods, searchKey: 'deliveryMethod' },
  { label: '业务员', type: 'select', options: ['安一', '天朗'] },
  { label: '跟单员', type: 'select', options: ['安逸', '李客服'] },
  { label: '入仓时间', type: 'select', options: ['今日', '本周', '本月'] },
];

const fullOrderSearchFields: OrderSearchField[] = [
  { label: '头程运单号', type: 'input', placeholder: '支持批量' },
  { label: '海外仓运单号', type: 'input', placeholder: '支持批量' },
  { label: 'FBA单号', type: 'input', placeholder: '支持批量' },
  { label: '柜号', type: 'input', placeholder: '支持批量' },
  { label: '提单号', type: 'input', placeholder: '支持批量' },
  { label: '入仓号', type: 'input', placeholder: '支持单个/模糊查询', searchKey: 'inboundNo' },
  { label: 'Shipment ID', type: 'input', placeholder: '支持单个/模糊查询', searchKey: 'shipmentId' },
  { label: 'Reference ID', type: 'input', placeholder: '支持单个/模糊查询', searchKey: 'referenceId' },
  { label: '核销状态', type: 'select', options: ['已核销', '未核销', '部分核销'], searchKey: 'reconciliationStatus' },
  { label: '客户简称', type: 'select', options: ['深圳天图电子有限公司', '博创跨境贸易', '广州跨境供应链'] },
  { label: '仓库代码', type: 'select', options: overseasWarehouseCodes },
  { label: '下单类型', type: 'select', options: overseasOrderTypes },
  { label: '派送方式', type: 'select', options: overseasDeliveryMethods, searchKey: 'deliveryMethod' },
  { label: '业务员', type: 'select', options: ['安一', '天朗'] },
  { label: '跟单员', type: 'select', options: ['安逸', '李客服'] },
  { label: '入仓时间', type: 'select', options: ['今日', '本周', '本月'] },
];

const overseasWarehouseArrivalSearchField: OrderSearchField = {
  label: '是否到达海外仓',
  type: 'select',
  options: ['是', '否'],
  searchKey: 'overseasWarehouseArrivalStatus',
};

const cargoMaterialOptions = ['带磁', '带电', '纺织品', '玻璃制品', '普货', '玩具', 'FDA产品', '成人用品', '木制品', '钢铁铝类', '冲突类', '电子类', '灯类', '自行车类', '粉末', '液体', '敏感货', '木制品非报关件'];
const cargoMaterialChecked = new Set(['纺织品', '普货']);
const cargoInfoRows = [
  {
    boxNo: 'FBA19DTKOWLD0000001',
    poNumber: '1DT1ZZLZ',
    englishName: "dog's hind leg joints",
    chineseName: '犬类后腿关节支撑',
    declaredPrice: '6',
    declaredQty: '47',
    declaredTotal: '282',
    material: '纺织品',
    hsCode: '6307900090',
    usage: '宠物护理',
    brand: 'PetGuard',
    model: 'HLJ-01',
    imageUrl: 'https://example.com/image-1.jpg',
    salesUrl: 'https://example.com/product-1',
    boxWeight: '18.6',
    boxLength: '52',
    boxWidth: '41',
    boxHeight: '38',
  },
  {
    boxNo: 'FBA19DTKOWLD0000002',
    poNumber: '1DT1ZZLZ',
    englishName: "dog's hind leg joints",
    chineseName: '犬类后腿关节支撑',
    declaredPrice: '6',
    declaredQty: '18',
    declaredTotal: '108',
    material: '纺织品',
    hsCode: '6307900090',
    usage: '宠物护理',
    brand: 'PetGuard',
    model: 'HLJ-01',
    imageUrl: 'https://example.com/image-2.jpg',
    salesUrl: 'https://example.com/product-2',
    boxWeight: '9.2',
    boxLength: '45',
    boxWidth: '36',
    boxHeight: '30',
  },
];

const getCargoInfoRowsForOrder = (row: OverseasTransitRow) => {
  const selectedBoxNumbers = row.boxNumbers?.filter(Boolean) || [];
  if (selectedBoxNumbers.length === 0) return cargoInfoRows;

  return selectedBoxNumbers.map((boxNo, index) => ({
    ...(cargoInfoRows.find((item) => item.boxNo === boxNo) || cargoInfoRows[index] || {}),
    boxNo,
  }));
};

const instructionFeeRows = [
  { code: 'FY202509260001', name: '仓储渠道-免仓30天', type: '仓储费', unit: '票', price: '3', currency: '人民币', description: '提柜入仓当天起算' },
  { code: 'FY202509260002', name: '仓储渠道-31-90天', type: '仓储费', unit: '票', price: '4', currency: '人民币', description: '按1级单价收取' },
  { code: 'FY202509260003', name: '仓储渠道-90天以上', type: '仓储费', unit: '票', price: '2', currency: '人民币', description: '按2级单价收取' },
  { code: 'FY202509260004', name: '拦截-免仓7天', type: '仓储费', unit: '票', price: '4', currency: '人民币', description: '提柜入仓当天起算' },
  { code: 'FY202509260005', name: '拦截-免仓8-90天', type: '仓储费', unit: '票', price: '3', currency: '人民币', description: '按1级单价收取' },
  { code: 'FY202509260006', name: '拦截-免仓90天以上', type: '仓储费', unit: '票', price: '2', currency: '人民币', description: '按2级单价收取' },
  { code: 'FY202509260007', name: '扣货-无免仓期', type: '仓储费', unit: '票', price: '2', currency: '人民币', description: '按1级单价收取' },
];

const downstreamDetailTabs = ['费用信息', '货箱信息', '运踪信息', '其它信息'] as const;

const quoteFeeRows = [
  { code: 'BJ202606050001', name: '哈哈', type: '操作费', price: '1.89', currency: '美元', exchangeRate: '7.014', unit: '哈哈', quantity: '1票', amount: '13.26', addedAt: '2026-06-05 14:28:00', addedBy: '天未', description: '海外仓操作附加费用' },
];

const attachmentRows = [
  { id: 'ATT-202608260001', name: '快递标.pdf', type: '其他', customerVisible: '可见', uploadedAt: '2026-08-26 17:36:00', uploadedBy: '安逸', fileSize: '1.2MB' },
];

type InstructionFeeRow = (typeof instructionFeeRows)[number] & {
  quantity?: string;
  addedAt?: string;
  addedBy?: string;
};
type QuoteFeeRow = (typeof quoteFeeRows)[number];
type AttachmentRow = (typeof attachmentRows)[number] & { file?: File };

const getReconciliationStatus = (row: Pick<OverseasTransitRow, 'reconciliationStatus'>): TransitReconciliationStatus =>
  row.reconciliationStatus || '未核销';

const getOverseasWarehouseArrivalStatus = (row: Pick<OverseasTransitRow, 'overseasWarehouseArrivalStatus'>): OverseasWarehouseArrivalStatus =>
  row.overseasWarehouseArrivalStatus || '否';

const reconciliationStatusStyles: Record<TransitReconciliationStatus, { badge: string; fee: string }> = {
  已核销: { badge: 'bg-emerald-50 text-emerald-600', fee: 'text-emerald-600' },
  未核销: { badge: 'bg-yellow-50 text-yellow-600', fee: 'text-yellow-600' },
  部分核销: { badge: 'bg-blue-50 text-blue-600', fee: 'text-blue-600' },
};

const overseasWarehouseArrivalStatusStyles: Record<OverseasWarehouseArrivalStatus, string> = {
  是: 'bg-emerald-50 text-emerald-600',
  否: 'bg-yellow-50 text-yellow-600',
};

type TrackingEvent = {
  id: string;
  occurredAt: string;
  source: '系统' | '客户';
  status: string;
  location: string;
  description: string;
};

type TrackingFormState = {
  occurredAt: string;
  status: string;
  location: string;
  description: string;
};

const trackingStatusOptions = ['已确认', '已下单', '已揽货', '运输中', '清关中', '派送中', '已签收', '异常', '已取消'];
const emptyTrackingForm: TrackingFormState = {
  occurredAt: '',
  status: '运输中',
  location: '',
  description: '',
};
type DownstreamDetailTab = (typeof downstreamDetailTabs)[number];
type FeeModalTarget = 'instruction' | 'quote';
type AttachmentFormState = {
  fileName: string;
  fileSize: string;
  type: string;
  customerVisible: '可见' | '不可见';
};

const attachmentTypeOptions = ['POD', 'ISA', '报关资料', '底单', '其他', '其它', '税金单', '递延资料', '提单'];
const emptyAttachmentForm: AttachmentFormState = {
  fileName: '',
  fileSize: '',
  type: '其他',
  customerVisible: '可见',
};

type OrderLogRow = {
  id: string;
  operatedAt: string;
  operator: string;
  action: string;
  field: string;
  before: string;
  after: string;
  note: string;
};

type EditableOrderRemarks = {
  customerRemark: string;
  overseasWarehouseRemark: string;
};

type EditableRemarkField = keyof EditableOrderRemarks;

function FormRow({
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
      <span className={labelClass}>
        {requiredMark ? required : null}
        {label}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </label>
  );
}

function TextareaRow({
  label,
  limit,
  placeholder,
  requiredMark,
  value,
  onChange,
  disabled,
}: {
  label: string;
  limit: string;
  placeholder: string;
  requiredMark?: boolean;
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className={`${labelClass} pt-2`}>
        {requiredMark ? required : null}
        {label}
      </span>
      <div className="min-w-0 flex-1">
        <textarea
          className="h-8 w-full resize-none rounded border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-500"
          placeholder={placeholder}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange?.(event.target.value)}
        />
        <div className="-mt-0.5 pr-1 text-right text-[11px] text-slate-400">{limit}</div>
      </div>
    </div>
  );
}

function DetailField({
  label,
  children,
  highlight,
}: {
  label: string;
  children: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className="flex min-w-0 items-baseline text-xs leading-5">
      <span className={`shrink-0 font-bold ${highlight ? 'text-[#004bb1]' : 'text-slate-950'}`}>{label}：</span>
      <span className={`min-w-0 break-words ${highlight ? 'font-bold text-[#004bb1]' : 'text-slate-950'}`}>{children}</span>
    </div>
  );
}

const getOverseasWaybillNo = (row: OverseasTransitRow) => {
  const match = (row.childCreatedAt || row.inboundTime).match(/^\d{4}-(\d{2})-(\d{2})/);
  const monthDay = match ? `${match[1]}${match[2]}` : '0000';
  return `${row.id}_${monthDay}_${row.orderSeq || 1}`;
};

const getOrderKey = (row: OverseasTransitRow) => getOverseasWaybillNo(row);
const isCreatedTransitChildOrder = (row: OverseasTransitRow): row is CreatedTransitChildOrder => 'parentHeadWaybillNo' in row;

const getParentStorageAddressForm = (row: OverseasTransitRow): AddressFormState => {
  if (row.addressForm) return { ...emptyAddressForm, ...row.addressForm, deliveryMethod: getOrderDeliveryMethod(row) };
  const warehouseCode = (row.warehouseCode || '').trim().toUpperCase();
  const warehouseAddress = warehouseAddressBook[warehouseCode];

  return {
    ...emptyAddressForm,
    orderType: row.orderType || 'FBA',
    deliveryMethod: getOrderDeliveryMethod(row),
    warehouseCode,
    ...(warehouseAddress || {}),
    zipCode: row.zipCode || warehouseAddress?.zipCode || '',
    phone: row.orderType === '私人地址' ? '972-555-0188' : '',
    remark: row.customerRemark || '',
    overseasWarehouseRemark: row.overseasWarehouseRemark || '',
  };
};

const formatDateTime = (date = new Date()) => {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

const europeanDestinationPattern = /英国|德国|法国|意大利|西班牙|荷兰|比利时|波兰|捷克|奥地利|爱尔兰|葡萄牙|瑞典|丹麦|芬兰|挪威|瑞士|欧洲|欧线/i;

const getExpressLine = (row: OverseasTransitRow): ExpressLineTab => (
  europeanDestinationPattern.test(`${row.destination} ${row.channel}`) ? '欧线打单' : '美线打单'
);

const expressConfigDefaults: Record<ExpressLineTab, ExpressBatchConfig> = {
  美线打单: {
    platform: '佳邮 ShipOS',
    businessUnit: '深圳天图',
    shippingAccount: 'US1038',
    service: 'UPS Ground',
    labelSpec: '100×150mm',
    currency: 'USD',
    signatureService: '无需签名',
    tradeTerm: 'DDP',
    taxNumber: '',
  },
  欧线打单: {
    platform: '欧速清',
    businessUnit: '深圳天图',
    shippingAccount: '心一供应链',
    service: 'EU UPS Standard',
    labelSpec: '100×150mm',
    currency: 'EUR',
    signatureService: '无需签名',
    tradeTerm: 'DDP',
    taxNumber: 'DE-EORI-202607',
  },
};

const expressPlatformOptions: Record<ExpressLineTab, string[]> = {
  美线打单: ['佳邮 ShipOS', 'K-新智慧', 'Dragon', '进取'],
  欧线打单: ['欧速清', '欧拉拉', 'YSD-新智慧', 'CONWEST'],
};

const expressAccountOptions: Record<ExpressLineTab, string[]> = {
  美线打单: ['US1038', 'SZXY001', 'tiantutongxun'],
  欧线打单: ['心一供应链', 'SZYY001', 'EU-TIANTU-01'],
};

const expressServiceOptions: Record<ExpressLineTab, string[]> = {
  美线打单: ['UPS Ground', 'FedEx Home Delivery', 'USPS Ground Advantage'],
  欧线打单: ['EU UPS Standard', 'DPD Classic', 'DHL Parcel Connect'],
};

const getExpressValidationMessage = (row: OverseasTransitRow) => {
  const address = getParentStorageAddressForm(row);
  const missing: string[] = [];
  if (!row.destination) missing.push('目的国家');
  if (!row.warehouseCode) missing.push('仓库代码');
  if (!address.consignee) missing.push('收件人');
  if (!address.zipCode) missing.push('邮编');
  if (!address.city || !address.addressDetail) missing.push('详细地址');
  if (!row.packages) missing.push('箱数');
  if (!(Number(row.weight.replace(/[^\d.]/g, '')) > 0)) missing.push('重量');
  return missing.length > 0 ? `缺少${missing.join('、')}` : '';
};

function ExpressOrderCreationWorkspace({
  rows,
  records,
  addToast,
  onClose,
  onCreate,
}: {
  rows: OverseasTransitRow[];
  records: Record<string, ExpressCreationRecord>;
  addToast: OverseasTransitOrderPageProps['addToast'];
  onClose: () => void;
  onCreate: (rowsToCreate: OverseasTransitRow[], line: ExpressLineTab, config: ExpressBatchConfig) => void;
}) {
  const [activeLine, setActiveLine] = useState<ExpressLineTab>(() => getExpressLine(rows[0]));
  const [keyword, setKeyword] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [configs, setConfigs] = useState<Record<ExpressLineTab, ExpressBatchConfig>>(() => ({
    美线打单: { ...expressConfigDefaults.美线打单 },
    欧线打单: { ...expressConfigDefaults.欧线打单 },
  }));
  const [selectedKeys, setSelectedKeys] = useState<string[]>(() => rows
    .filter((row) => !records[getOrderKey(row)] && !getExpressValidationMessage(row))
    .map(getOrderKey));

  const lineCounts = {
    美线打单: rows.filter((row) => getExpressLine(row) === '美线打单').length,
    欧线打单: rows.filter((row) => getExpressLine(row) === '欧线打单').length,
  };
  const lineRows = rows.filter((row) => getExpressLine(row) === activeLine);
  const activeConfig = configs[activeLine];
  const warehouseOptions = Array.from(new Set(lineRows.map((row) => row.warehouseCode || '').filter(Boolean)));
  const visibleRows = lineRows.filter((row) => {
    const record = records[getOrderKey(row)];
    const validationMessage = getExpressValidationMessage(row);
    const rowStatus = record ? '已创建' : validationMessage ? '资料异常' : '待创建';
    const normalizedKeyword = keyword.trim().toLowerCase();
    const matchesKeyword = !normalizedKeyword || [getOrderKey(row), row.id, row.fbaCode, row.customerName, row.warehouseCode || '']
      .some((value) => value.toLowerCase().includes(normalizedKeyword));
    return matchesKeyword
      && (!warehouseFilter || row.warehouseCode === warehouseFilter)
      && (!statusFilter || rowStatus === statusFilter);
  });
  const selectableVisibleKeys = visibleRows
    .filter((row) => !records[getOrderKey(row)] && !getExpressValidationMessage(row))
    .map(getOrderKey);
  const selectedCurrentRows = lineRows.filter((row) => selectedKeys.includes(getOrderKey(row)) && !records[getOrderKey(row)] && !getExpressValidationMessage(row));
  const totalPackages = rows.reduce((sum, row) => sum + row.packages, 0);
  const totalWeight = rows.reduce((sum, row) => sum + (Number(row.weight.replace(/[^\d.]/g, '')) || 0), 0);
  const activeCreatedCount = lineRows.filter((row) => records[getOrderKey(row)]).length;

  const updateConfig = (field: keyof ExpressBatchConfig, value: string) => {
    setConfigs((prev) => ({ ...prev, [activeLine]: { ...prev[activeLine], [field]: value } }));
  };

  const toggleRow = (orderKey: string) => {
    setSelectedKeys((prev) => (prev.includes(orderKey) ? prev.filter((key) => key !== orderKey) : [...prev, orderKey]));
  };

  const toggleAllVisibleRows = () => {
    if (selectableVisibleKeys.length === 0) return;
    setSelectedKeys((prev) => (
      selectableVisibleKeys.every((key) => prev.includes(key))
        ? prev.filter((key) => !selectableVisibleKeys.includes(key))
        : Array.from(new Set([...prev, ...selectableVisibleKeys]))
    ));
  };

  const createSelectedExpressOrders = () => {
    if (!activeConfig.platform || !activeConfig.shippingAccount || !activeConfig.service) {
      addToast('请先完整选择打单平台、发货账号和快递服务', 'warning');
      return;
    }
    if (selectedCurrentRows.length === 0) {
      addToast(`请先勾选${activeLine}中需要创建的子单`, 'warning');
      return;
    }
    onCreate(selectedCurrentRows, activeLine, activeConfig);
    const createdKeys = new Set(selectedCurrentRows.map(getOrderKey));
    setSelectedKeys((prev) => prev.filter((key) => !createdKeys.has(key)));
  };

  const resetFilters = () => {
    setKeyword('');
    setWarehouseFilter('');
    setStatusFilter('');
    addToast(`已重置${activeLine}筛选条件`, 'info');
  };

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/45 p-5">
      <div className="flex h-[94vh] w-[96vw] max-w-[1800px] flex-col overflow-hidden rounded-md bg-slate-100 shadow-2xl">
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6">
          <div className="flex items-center gap-4">
            <span className="flex h-8 w-8 items-center justify-center rounded bg-blue-50 text-[#004bb1]"><Printer className="h-4 w-4" /></span>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-base font-bold text-slate-950">创建快递单</h2>
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-[#004bb1]">来源：海外中转单 · 已确认</span>
              </div>
              <p className="mt-0.5 text-[11px] text-slate-500">已选 {rows.length} 条子单 · {totalPackages} 箱 · {totalWeight.toFixed(1)}kg；创建后原单仍保留在已确认。</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded p-1.5 text-slate-500 hover:bg-slate-100" aria-label="关闭创建快递单"><X className="h-5 w-5" /></button>
        </div>

        <div className="shrink-0 border-b border-slate-200 bg-white px-6">
          <div className="flex h-12 items-end gap-10 text-xs font-bold">
            {(['美线打单', '欧线打单'] as const).map((line) => (
              <button key={line} type="button" onClick={() => setActiveLine(line)} className={`relative h-12 px-2 ${activeLine === line ? 'text-[#004bb1]' : 'text-slate-600 hover:text-[#004bb1]'}`}>
                {line}（{lineCounts[line]}）
                {activeLine === line && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-[#004bb1]" />}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-4">
          <div className="mb-3 rounded-md border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid grid-cols-1 items-end gap-3 text-xs lg:grid-cols-[minmax(280px,2fr)_minmax(160px,1fr)_minmax(160px,1fr)_100px_100px]">
              <label className="min-w-0">
                <span className="mb-1.5 block font-semibold text-slate-700">关键字</span>
                <input value={keyword} onChange={(event) => setKeyword(event.target.value)} className={fieldClass} placeholder="海外仓运单号 / 头程运单号 / FBA单号 / 客户" />
              </label>
              <label className="min-w-0">
                <span className="mb-1.5 block font-semibold text-slate-700">仓库代码</span>
                <select value={warehouseFilter} onChange={(event) => setWarehouseFilter(event.target.value)} className={fieldClass}>
                  <option value="">全部仓库</option>
                  {warehouseOptions.map((code) => <option key={code}>{code}</option>)}
                </select>
              </label>
              <label className="min-w-0">
                <span className="mb-1.5 block font-semibold text-slate-700">创建状态</span>
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className={fieldClass}>
                  <option value="">全部状态</option>
                  <option>待创建</option>
                  <option>已创建</option>
                  <option>资料异常</option>
                </select>
              </label>
              <button type="button" onClick={() => addToast(`已查询到 ${visibleRows.length} 条${activeLine}数据`, 'success')} className="flex h-8 items-center justify-center gap-1 rounded bg-[#004bb1] px-4 font-bold text-white hover:bg-[#003b91]">
                <Search className="h-3.5 w-3.5" />查询
              </button>
              <button type="button" onClick={resetFilters} className="h-8 rounded border border-slate-300 bg-white px-4 font-semibold text-slate-600 hover:bg-slate-50">重置</button>
            </div>
          </div>

          <div className="mb-3 rounded-md border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-900">{activeLine}批量配置</h3>
                <p className="mt-1 text-[11px] text-slate-500">当前配置仅应用于本子 TAB 内勾选的待创建子单。</p>
              </div>
              <span className="rounded bg-slate-100 px-2.5 py-1 text-[11px] text-slate-600">已勾选 {selectedCurrentRows.length} 条</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-[11px] md:grid-cols-4 2xl:grid-cols-8">
              <label>
                <span className="mb-1 block font-semibold text-slate-600"><span className="text-red-500">* </span>打单平台</span>
                <select className={fieldClass} value={activeConfig.platform} onChange={(event) => updateConfig('platform', event.target.value)}>
                  {expressPlatformOptions[activeLine].map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              <label>
                <span className="mb-1 block font-semibold text-slate-600">经营单位</span>
                <select className={fieldClass} value={activeConfig.businessUnit} onChange={(event) => updateConfig('businessUnit', event.target.value)}>
                  <option>深圳天图</option><option>广州天图</option><option>义乌天图</option>
                </select>
              </label>
              <label>
                <span className="mb-1 block font-semibold text-slate-600"><span className="text-red-500">* </span>发货账号</span>
                <select className={fieldClass} value={activeConfig.shippingAccount} onChange={(event) => updateConfig('shippingAccount', event.target.value)}>
                  {expressAccountOptions[activeLine].map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              <label>
                <span className="mb-1 block font-semibold text-slate-600"><span className="text-red-500">* </span>快递服务</span>
                <select className={fieldClass} value={activeConfig.service} onChange={(event) => updateConfig('service', event.target.value)}>
                  {expressServiceOptions[activeLine].map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              <label>
                <span className="mb-1 block font-semibold text-slate-600">标签规格</span>
                <select className={fieldClass} value={activeConfig.labelSpec} onChange={(event) => updateConfig('labelSpec', event.target.value)}><option>100×150mm</option><option>A4</option></select>
              </label>
              <label>
                <span className="mb-1 block font-semibold text-slate-600">申报币种</span>
                <select className={fieldClass} value={activeConfig.currency} onChange={(event) => updateConfig('currency', event.target.value)}>
                  {activeLine === '美线打单' ? <><option>USD</option><option>CAD</option></> : <><option>EUR</option><option>GBP</option><option>USD</option></>}
                </select>
              </label>
              {activeLine === '美线打单' ? (
                <>
                  <label><span className="mb-1 block font-semibold text-slate-600">签名服务</span><select className={fieldClass} value={activeConfig.signatureService} onChange={(event) => updateConfig('signatureService', event.target.value)}><option>无需签名</option><option>直接签名</option><option>成人签名</option></select></label>
                  <label><span className="mb-1 block font-semibold text-slate-600">偏远地址</span><select className={fieldClass} defaultValue="自动识别"><option>自动识别</option><option>允许附加费</option><option>拦截异常</option></select></label>
                </>
              ) : (
                <>
                  <label><span className="mb-1 block font-semibold text-slate-600">贸易条款</span><select className={fieldClass} value={activeConfig.tradeTerm} onChange={(event) => updateConfig('tradeTerm', event.target.value)}><option>DDP</option><option>DAP</option></select></label>
                  <label><span className="mb-1 block font-semibold text-slate-600">VAT / EORI / IOSS</span><input className={fieldClass} value={activeConfig.taxNumber} onChange={(event) => updateConfig('taxNumber', event.target.value)} placeholder="请输入税号" /></label>
                </>
              )}
            </div>
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => addToast(`${activeLine}资料校验已刷新`, 'success')} className="rounded bg-[#004bb1] px-3 py-2 text-xs font-bold text-white hover:bg-[#003b91]">刷新校验</button>
                <button type="button" onClick={() => activeCreatedCount > 0 ? addToast(`已生成 ${activeCreatedCount} 张${activeLine}标签`, 'success') : addToast(`当前${activeLine}暂无可打印标签`, 'warning')} className="flex items-center gap-1 rounded bg-[#004bb1] px-3 py-2 text-xs font-bold text-white hover:bg-[#003b91]"><Printer className="h-3.5 w-3.5" />打印标签</button>
                <button type="button" onClick={() => addToast(`${activeLine}快递单状态已同步`, 'success')} className="rounded bg-[#004bb1] px-3 py-2 text-xs font-bold text-white hover:bg-[#003b91]">同步状态</button>
                <button type="button" onClick={() => addToast(`已导出 ${visibleRows.length} 条${activeLine}数据`, 'info')} className="rounded bg-[#004bb1] px-3 py-2 text-xs font-bold text-white hover:bg-[#003b91]">导出</button>
              </div>
              <button type="button" onClick={() => addToast('表头设置功能为展示', 'info')} className="rounded bg-[#004bb1] p-2 text-white hover:bg-[#003b91]" aria-label="创建快递单表头设置"><Settings2 className="h-4 w-4" /></button>
            </div>

            <div className="overflow-x-auto border border-slate-200">
              <table className="w-full min-w-[2380px] table-fixed border-collapse text-[11px]">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="w-10 border border-slate-200 px-2 py-2 text-center"><input type="checkbox" checked={selectableVisibleKeys.length > 0 && selectableVisibleKeys.every((key) => selectedKeys.includes(key))} onChange={toggleAllVisibleRows} className="h-3.5 w-3.5 rounded border-slate-300" /></th>
                    <th className="w-24 border border-slate-200 px-3 py-2 text-center">校验 / 状态</th>
                    <th className="w-52 border border-slate-200 px-3 py-2 text-center">海外仓运单号</th>
                    <th className="w-40 border border-slate-200 px-3 py-2 text-center">头程运单号</th>
                    <th className="w-40 border border-slate-200 px-3 py-2 text-center">FBA单号</th>
                    <th className="w-44 border border-slate-200 px-3 py-2 text-center">客户简称</th>
                    <th className="w-28 border border-slate-200 px-3 py-2 text-center">目的地 / 仓库</th>
                    <th className="w-64 border border-slate-200 px-3 py-2 text-center">收件人 / 地址</th>
                    <th className="w-24 border border-slate-200 px-3 py-2 text-center">邮编</th>
                    <th className="w-24 border border-slate-200 px-3 py-2 text-center">箱数 / 实重</th>
                    <th className="w-24 border border-slate-200 px-3 py-2 text-center">下单类型</th>
                    <th className="w-40 border border-slate-200 px-3 py-2 text-center">尾程渠道</th>
                    <th className="w-32 border border-slate-200 px-3 py-2 text-center">打单平台</th>
                    <th className="w-44 border border-slate-200 px-3 py-2 text-center">发货账号 / 服务</th>
                    <th className="w-48 border border-slate-200 px-3 py-2 text-center">快递单号 / 创建时间</th>
                    <th className="w-24 border border-slate-200 px-3 py-2 text-center">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((row) => {
                    const orderKey = getOrderKey(row);
                    const record = records[orderKey];
                    const validationMessage = getExpressValidationMessage(row);
                    const address = getParentStorageAddressForm(row);
                    const disabled = !!record || !!validationMessage;
                    return (
                      <tr key={orderKey} className={`h-12 text-slate-700 hover:bg-blue-50/50 ${selectedKeys.includes(orderKey) ? 'bg-blue-50/30' : ''}`}>
                        <td className="border border-slate-200 px-2 text-center">
                          <input type="checkbox" checked={selectedKeys.includes(orderKey)} disabled={disabled} onChange={() => toggleRow(orderKey)} className="h-3.5 w-3.5 rounded border-slate-300 disabled:cursor-not-allowed disabled:opacity-40" />
                        </td>
                        <td className="border border-slate-200 px-2 text-center">
                          {record ? (
                            <span className="rounded-full bg-emerald-50 px-2 py-1 font-bold text-emerald-600">已创建</span>
                          ) : validationMessage ? (
                            <span title={validationMessage} className="rounded-full bg-rose-50 px-2 py-1 font-bold text-rose-600">资料异常</span>
                          ) : (
                            <span className="rounded-full bg-amber-50 px-2 py-1 font-bold text-amber-600">待创建</span>
                          )}
                        </td>
                        <td className="border border-slate-200 px-3 text-center font-mono font-semibold text-blue-600">{orderKey}</td>
                        <td className="border border-slate-200 px-3 text-center font-mono">{row.id}</td>
                        <td className="border border-slate-200 px-3 text-center font-mono">{row.fbaCode}</td>
                        <td className="border border-slate-200 px-3 text-center"><div className="truncate" title={row.customerName}>{row.customerName}</div></td>
                        <td className="border border-slate-200 px-3 text-center"><div>{row.destination}</div><div className="mt-1 font-mono text-slate-500">{row.warehouseCode || '-'}</div></td>
                        <td className="border border-slate-200 px-3">
                          <div className="font-semibold text-slate-800">{address.consignee || '-'}</div>
                          <div className="mt-1 truncate text-slate-500" title={`${address.addressDetail}, ${address.city}, ${address.state}`}>{[address.addressDetail, address.city, address.state].filter(Boolean).join(', ') || '-'}</div>
                        </td>
                        <td className="border border-slate-200 px-3 text-center font-mono">{address.zipCode || '-'}</td>
                        <td className="border border-slate-200 px-3 text-center"><div>{row.packages} 箱</div><div className="mt-1 text-slate-500">{row.weight}</div></td>
                        <td className="border border-slate-200 px-3 text-center">{row.orderType || '-'}</td>
                        <td className="border border-slate-200 px-3 text-center"><div className="truncate" title={row.channel}>{row.channel}</div></td>
                        <td className="border border-slate-200 px-3 text-center">{record?.platform || activeConfig.platform}</td>
                        <td className="border border-slate-200 px-3 text-center"><div>{record?.shippingAccount || activeConfig.shippingAccount}</div><div className="mt-1 truncate text-slate-500" title={record?.service || activeConfig.service}>{record?.service || activeConfig.service}</div></td>
                        <td className="border border-slate-200 px-3 text-center"><div className="font-mono font-semibold text-blue-600">{record?.trackingNo || '-'}</div><div className="mt-1 font-mono text-slate-400">{record?.createdAt || '-'}</div></td>
                        <td className="border border-slate-200 px-3 text-center">
                          {record ? (
                            <button type="button" onClick={() => addToast(`已打开 ${record.trackingNo} 标签预览`, 'info')} className="font-semibold text-blue-600 hover:underline">打印标签</button>
                          ) : validationMessage ? (
                            <button type="button" onClick={() => addToast(`${orderKey}：${validationMessage}`, 'warning')} className="font-semibold text-rose-500 hover:underline">查看异常</button>
                          ) : (
                            <button type="button" onClick={() => addToast(`${orderKey} 资料校验通过`, 'success')} className="font-semibold text-blue-600 hover:underline">校验</button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {visibleRows.length === 0 && (
                    <tr><td colSpan={16} className="h-32 border border-slate-200 text-center text-slate-400">当前筛选条件下暂无{activeLine}子单</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-end gap-5 border-t border-slate-100 px-2 py-3 text-xs text-slate-600">
              <span>共 {visibleRows.length} 条</span>
              <select className="h-8 rounded border border-slate-300 bg-white px-3"><option>100条/页</option><option>50条/页</option></select>
              <button type="button" className="text-slate-300">&lt;</button><span className="font-bold text-blue-500">1</span><button type="button" className="text-slate-300">&gt;</button>
              <span>前往</span><input value="1" readOnly className="h-8 w-12 rounded border border-slate-300 text-center" /><span>页</span>
            </div>
          </div>
        </div>

        <div className="flex h-16 shrink-0 items-center justify-between border-t border-slate-200 bg-white px-6">
          <div className="text-xs text-slate-500">{activeLine}：{lineRows.length} 条，已创建 {activeCreatedCount} 条，待创建 {lineRows.length - activeCreatedCount} 条</div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => addToast(`${activeLine}配置草稿已保存`, 'success')} className="rounded border border-slate-300 bg-white px-6 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">保存草稿</button>
            <button type="button" onClick={onClose} className="rounded border border-slate-300 bg-white px-6 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">关闭</button>
            <button type="button" onClick={createSelectedExpressOrders} className="rounded bg-[#004bb1] px-7 py-2 text-xs font-bold text-white hover:bg-[#003b91]">创建 {selectedCurrentRows.length} 个快递单</button>
          </div>
        </div>
      </div>
    </div>
  );
}

const parseFeeNumber = (value: string | undefined) => Number(String(value || '0').replace(/[^\d.]/g, '')) || 0;
const formatInstructionFeeAmount = (value: number) => Number(value.toFixed(2)).toString();
const formatInstructionFeeCurrency = (currency: string) => {
  const normalized = currency.trim().toUpperCase();
  if (currency === '人民币' || normalized === 'RMB' || normalized === 'CNY') return 'CNY';
  if (currency === '美元' || normalized === 'USD') return 'USD';
  return normalized || 'CNY';
};
const formatInstructionFee = (row: InstructionFeeRow) => {
  const quantity = row.quantity?.trim() ? parseFeeNumber(row.quantity) : 1;
  const total = parseFeeNumber(row.price) * quantity;
  return formatInstructionFeeAmount(total) + ' ' + formatInstructionFeeCurrency(row.currency) + ' ' + row.name + ' (' + row.price + '/' + row.unit + ')';
};

function ReconciliationStatusBadge({ status }: { status: TransitReconciliationStatus }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold ${reconciliationStatusStyles[status].badge}`}>
      {status}
    </span>
  );
}

function OverseasWarehouseArrivalBadge({ status }: { status: OverseasWarehouseArrivalStatus }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold ${overseasWarehouseArrivalStatusStyles[status]}`}>
      {status}
    </span>
  );
}

function InstructionFeeCell({
  rows,
  reconciliationStatus,
}: {
  rows: InstructionFeeRow[];
  reconciliationStatus: TransitReconciliationStatus;
}) {
  return (
    <td className='border border-slate-200 px-3 py-1.5 align-top text-left'>
      {rows.length > 0 ? (
        <div className={`space-y-0.5 ${reconciliationStatusStyles[reconciliationStatus].fee}`}>
          {rows.map((row) => (
            <div key={row.code} className='whitespace-nowrap leading-5'>
              {formatInstructionFee(row)}
            </div>
          ))}
        </div>
      ) : (
        <span className='block text-center text-slate-400'>-</span>
      )}
    </td>
  );
}

const getExchangeRate = (currency: string) => (currency === 'USD' || currency === '美元' ? '7.014' : '1');
const normalizeCurrency = (currency: string) => (currency === 'USD' ? '美元' : currency);
const getQuoteAmount = (row: Pick<QuoteFeeRow, 'price' | 'quantity' | 'exchangeRate'>) => {
  const amount = parseFeeNumber(row.price) * parseFeeNumber(row.quantity) * parseFeeNumber(row.exchangeRate);
  return amount.toFixed(2).replace(/\.00$/, '');
};
const describeQuoteFee = (row: QuoteFeeRow) => `${row.name} / ${row.price} ${row.currency} / ${row.quantity} / ${row.amount}`;

const createQuoteFeeRow = (fee: InstructionFeeRow, sequence: number): QuoteFeeRow => {
  const currency = normalizeCurrency(fee.currency);
  const exchangeRate = getExchangeRate(currency);
  const quantity = fee.quantity || '1票';
  const baseRow = {
    code: `${fee.code}-Q${sequence}`,
    name: fee.name,
    type: fee.type,
    price: fee.price,
    currency,
    exchangeRate,
    unit: fee.unit,
    quantity,
    amount: '0',
    addedAt: formatDateTime(),
    addedBy: '天朗（付豪）',
    description: fee.description,
  };
  return { ...baseRow, amount: getQuoteAmount(baseRow) };
};

const getOrderLogRows = (row: OverseasTransitRow): OrderLogRow[] => [
  {
    id: `${row.id}-create`,
    operatedAt: row.inboundTime,
    operator: row.salesman || '系统',
    action: '创建海外中转单',
    field: '基础信息',
    before: '-',
    after: `${row.customerName} / ${row.channel}`,
    note: `头程运单 ${row.id} 生成海外仓运单 ${getOrderKey(row)}`,
  },
  {
    id: `${row.id}-warehouse`,
    operatedAt: row.inboundTime,
    operator: row.merchandiser || '系统',
    action: '中转信息维护',
    field: '仓库代码 / 目的地 / 服务',
    before: '-',
    after: `${row.warehouseCode || '-'} / ${row.destination} / ${row.channel}`,
    note: '录入海外仓和尾程服务信息',
  },
  {
    id: `${row.id}-remark`,
    operatedAt: row.inboundTime,
    operator: row.merchandiser || '安逸',
    action: '备注维护',
    field: '客户备注 / 海外仓备注',
    before: '-',
    after: `${row.customerRemark || '-'} / ${row.overseasWarehouseRemark || '-'}`,
    note: '同步客户要求与海外仓操作备注',
  },
  {
    id: `${row.id}-status`,
    operatedAt: row.inboundTime,
    operator: '系统',
    action: '状态变更',
    field: '中转状态',
    before: '待确认',
    after: row.status,
    note: row.transferNo ? `转单号 ${row.transferNo} 已关联` : '等待转单信息回传',
  },
];

const getDefaultTrackingRows = (row: OverseasTransitRow): TrackingEvent[] => {
  const currentStatus = row.status === '取消' ? '已取消' : row.status;
  return [
    {
      id: `${row.id}-tracking-created`,
      occurredAt: row.childCreatedAt || row.inboundTime,
      source: '系统',
      status: '已创建',
      location: '中国',
      description: '海外中转运单已创建',
    },
    {
      id: `${row.id}-tracking-status`,
      occurredAt: row.inboundTime,
      source: '系统',
      status: currentStatus,
      location: row.destination,
      description: `订单当前状态：${currentStatus}`,
    },
  ];
};
function OrderLogDrawer({
  row,
  extraLogs = [],
  onClose,
}: {
  row: OverseasTransitRow;
  extraLogs?: OrderLogRow[];
  onClose: () => void;
}) {
  const logs = [...getOrderLogRows(row), ...extraLogs];
  return (
    <div className="fixed inset-0 z-[60] bg-black/45">
      <div className="absolute right-0 top-0 flex h-full w-[800px] max-w-[92vw] flex-col bg-white shadow-2xl">
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-slate-200 px-6">
          <div>
            <h2 className="text-sm font-bold text-slate-950">操作日志</h2>
            <p className="mt-0.5 text-[11px] text-slate-500">{row.id} · {row.customerName}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded p-1 text-slate-600 hover:bg-slate-100" aria-label="关闭日志">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto bg-slate-50 p-4">
          <div className="mb-3 grid grid-cols-3 gap-3 rounded border border-slate-200 bg-white px-4 py-3 text-xs">
            <div><span className="font-bold text-slate-900">状态：</span>{row.status}</div>
            <div><span className="font-bold text-slate-900">海外仓运单号：</span>{getOverseasWaybillNo(row)}</div>
            <div><span className="font-bold text-slate-900">转单号：</span>{row.transferNo || '-'}</div>
          </div>
          <table className="w-full table-fixed border-collapse bg-white text-xs">
            <thead className="bg-slate-100 text-slate-800">
              <tr>
                {['变更时间', '操作人', '操作类型', '变更字段', '变更前', '变更后', '说明'].map((head) => (
                  <th key={head} className="border border-slate-200 px-3 py-2 text-center font-bold">{head}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="align-top text-slate-700">
                  <td className="border border-slate-200 px-3 py-2 text-center font-mono">{log.operatedAt}</td>
                  <td className="border border-slate-200 px-3 py-2 text-center">{log.operator}</td>
                  <td className="border border-slate-200 px-3 py-2 text-center">{log.action}</td>
                  <td className="border border-slate-200 px-3 py-2 text-center">{log.field}</td>
                  <td className="border border-slate-200 px-3 py-2">{log.before}</td>
                  <td className="border border-slate-200 px-3 py-2">{log.after}</td>
                  <td className="border border-slate-200 px-3 py-2">{log.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function OverseasTransitOrderPage({ addToast, activeNode = '待确认', onNodeChange }: OverseasTransitOrderPageProps) {
  const [activeTab, setActiveTab] = useState(activeNode);
  const [selectedIds, setSelectedIds] = useState<string[]>(['YT2507100001_0710_1', 'YT2507100002_0710_1', 'YT2507100004_0711_1']);
  const [createdTransitRows, setCreatedTransitRows] = useState<CreatedTransitChildOrder[]>(getCreatedTransitChildOrders);
  const [statusOverridesByOrder, setStatusOverridesByOrder] = useState<Record<string, string>>({});
  const [lifecycleTimeOverridesByOrder, setLifecycleTimeOverridesByOrder] = useState<Record<string, LifecycleTimeValues>>({});
  const [remarkOverridesByOrder, setRemarkOverridesByOrder] = useState<Record<string, EditableOrderRemarks>>({});
  const [searchValues, setSearchValues] = useState<Record<string, string>>({});
  const [appliedLifecycleDateFilters, setAppliedLifecycleDateFilters] = useState<LifecycleTimeValues>({});
  const [appliedOrderFilters, setAppliedOrderFilters] = useState<Record<OrderFilterKey, string>>({ ...emptyOrderFilterValues });
  const [activeOrder, setActiveOrder] = useState<OverseasTransitRow | null>(null);
  const [activeLogOrder, setActiveLogOrder] = useState<OverseasTransitRow | null>(null);
  const [cancelConfirmOrderKeys, setCancelConfirmOrderKeys] = useState<string[]>([]);
  const [confirmedOrderSubmissionKeys, setConfirmedOrderSubmissionKeys] = useState<string[]>([]);
  const [confirmedOrderSubmissionCheck, setConfirmedOrderSubmissionCheck] = useState<ConfirmedOrderSubmissionCheck | null>(null);
  const [rollbackConfirmOrderKeys, setRollbackConfirmOrderKeys] = useState<string[]>([]);
  const [transitRollbackConfirmOrderKeys, setTransitRollbackConfirmOrderKeys] = useState<string[]>([]);
  const [signedRollbackConfirmOrderKeys, setSignedRollbackConfirmOrderKeys] = useState<string[]>([]);
  const [showInstructionModal, setShowInstructionModal] = useState(false);
  const [feeModalTarget, setFeeModalTarget] = useState<FeeModalTarget>('instruction');
  const [selectedFeeCodes, setSelectedFeeCodes] = useState<string[]>(instructionFeeRows.slice(0, 3).map((row) => row.code));
  const [instructionRowsByOrder, setInstructionRowsByOrder] = useState<Record<string, InstructionFeeRow[]>>({});
  const [quoteRowsByOrder, setQuoteRowsByOrder] = useState<Record<string, QuoteFeeRow[]>>({});
  const [quoteLogsByOrder, setQuoteLogsByOrder] = useState<Record<string, OrderLogRow[]>>({});
  const [attachmentRowsByOrder, setAttachmentRowsByOrder] = useState<Record<string, AttachmentRow[]>>({});
  const [addressAttachmentsByOrder, setAddressAttachmentsByOrder] = useState<Record<string, AttachmentRow[]>>({});
  const [trackingRowsByOrder, setTrackingRowsByOrder] = useState<Record<string, TrackingEvent[]>>({});
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [trackingForm, setTrackingForm] = useState<TrackingFormState>(emptyTrackingForm);
  const [transferPanelOpen, setTransferPanelOpen] = useState(false);
  const [transferDraftsByOrder, setTransferDraftsByOrder] = useState<Record<string, TransitTransferRow[]>>({});
  const [savedTransferRowsByOrder, setSavedTransferRowsByOrder] = useState<Record<string, TransitTransferRow[]>>({});
  const [editingInstruction, setEditingInstruction] = useState<InstructionFeeRow | null>(null);
  const [deletingInstruction, setDeletingInstruction] = useState<InstructionFeeRow | null>(null);
  const [editingQuoteFee, setEditingQuoteFee] = useState<QuoteFeeRow | null>(null);
  const [deletingQuoteFee, setDeletingQuoteFee] = useState<QuoteFeeRow | null>(null);
  const [showAttachmentModal, setShowAttachmentModal] = useState(false);
  const [editingAttachment, setEditingAttachment] = useState<AttachmentRow | null>(null);
  const [deletingAttachment, setDeletingAttachment] = useState<AttachmentRow | null>(null);
  const [attachmentForm, setAttachmentForm] = useState<AttachmentFormState>(emptyAttachmentForm);
  const [addressFormsByOrder, setAddressFormsByOrder] = useState<Record<string, AddressFormState>>({});
  const [editingOrderFormKey, setEditingOrderFormKey] = useState<string | null>(null);
  const [addressFormSnapshotsByOrder, setAddressFormSnapshotsByOrder] = useState<Record<string, AddressFormState>>({});
  const [editingRemarkOrderKey, setEditingRemarkOrderKey] = useState<string | null>(null);
  const [editingRemarkField, setEditingRemarkField] = useState<EditableRemarkField | null>(null);
  const [remarkDraft, setRemarkDraft] = useState<EditableOrderRemarks | null>(null);
  const [downstreamDetailTab, setDownstreamDetailTab] = useState<DownstreamDetailTab>('费用信息');
  const [expressOrderKeys, setExpressOrderKeys] = useState<string[]>([]);
  const [expressRecordsByOrder, setExpressRecordsByOrder] = useState<Record<string, ExpressCreationRecord>>({});
  const displayedSeedRows = transitRows.map((row) => ({
    ...row,
    status: statusOverridesByOrder[getOrderKey(row)] || row.status,
    ...lifecycleTimeOverridesByOrder[getOrderKey(row)],
  }));
  const allRows: OverseasTransitRow[] = [...displayedSeedRows, ...createdTransitRows].map((row) => ({
    ...row,
    ...remarkOverridesByOrder[getOrderKey(row)],
    deliveryMethod: addressFormsByOrder[getOrderKey(row)]?.deliveryMethod || getOrderDeliveryMethod(row),
  }));
  const expressWorkspaceRows = allRows.filter((row) => expressOrderKeys.includes(getOrderKey(row)) && row.status === '已确认');
  const activeLifecycleTimeConfig = lifecycleTimeConfigByStatus[activeTab];
  const activeLifecycleDateFilter = activeLifecycleTimeConfig
    ? appliedLifecycleDateFilters[activeLifecycleTimeConfig.key]?.trim()
    : '';
  const showOverseasWarehouseArrivalStatus = activeTab === '待确认' || activeTab === '已确认' || activeTab === '已下单' || activeTab === '驳回';
  const activeOrderFilterKeys = showOverseasWarehouseArrivalStatus
    ? orderFilterKeys
    : orderFilterKeys.filter((key) => key !== 'overseasWarehouseArrivalStatus');
  const filteredRows = allRows.filter((row) => (
    row.status === activeTab
    && (!activeLifecycleTimeConfig
      || !activeLifecycleDateFilter
      || row[activeLifecycleTimeConfig.key]?.slice(0, 10) === activeLifecycleDateFilter)
    && activeOrderFilterKeys.every((key) => matchesOrderFilterQuery(row[key], appliedOrderFilters[key]))
  ));
  const cancelConfirmRows = allRows.filter((row) => cancelConfirmOrderKeys.includes(getOrderKey(row)) && row.status === '已确认');
  const confirmedOrderSubmissionRows = allRows.filter((row) => confirmedOrderSubmissionKeys.includes(getOrderKey(row)) && row.status === '已确认');
  const rollbackConfirmRows = allRows.filter((row) => rollbackConfirmOrderKeys.includes(getOrderKey(row)) && row.status === '已下单');
  const transitRollbackConfirmRows = allRows.filter((row) => transitRollbackConfirmOrderKeys.includes(getOrderKey(row)) && row.status === '转运中');
  const signedRollbackConfirmRows = allRows.filter((row) => signedRollbackConfirmOrderKeys.includes(getOrderKey(row)) && row.status === '签收');
  const usesOrderFormTemplate = (status: string) => orderFormStatuses.has(status);
  const showOverseasWaybillNo = true;
  const orderTableColumnCount = (showOverseasWaybillNo ? 21 : 17) + (activeLifecycleTimeConfig ? 1 : 0) + 6 + (showOverseasWarehouseArrivalStatus ? 1 : 0);
  const orderTableMinWidthClass = showOverseasWaybillNo
    ? (activeLifecycleTimeConfig ? 'min-w-[3920px]' : showOverseasWarehouseArrivalStatus ? 'min-w-[3880px]' : 'min-w-[3760px]')
    : (activeLifecycleTimeConfig ? 'min-w-[3440px]' : showOverseasWarehouseArrivalStatus ? 'min-w-[3400px]' : 'min-w-[3280px]');
  const commonOrderSearchFields = showOverseasWaybillNo ? fullOrderSearchFields : baseOrderSearchFields;
  const orderSearchFields: OrderSearchField[] = [
    ...commonOrderSearchFields,
    ...(showOverseasWarehouseArrivalStatus ? [overseasWarehouseArrivalSearchField] : []),
    ...(activeLifecycleTimeConfig ? [{ label: activeLifecycleTimeConfig.label, type: 'date' as const, searchKey: activeLifecycleTimeConfig.key }] : []),
  ];
  const quoteEditableStatuses = new Set(['已确认', '已下单', '转运中', '签收']);
  const activeOrderKey = activeOrder ? getOrderKey(activeOrder) : '';
  const addressForm = activeOrder ? (addressFormsByOrder[activeOrderKey] || getParentStorageAddressForm(activeOrder)) : emptyAddressForm;
  const isOrderFormEditing = !!activeOrder && usesOrderFormTemplate(activeOrder.status) && editingOrderFormKey === activeOrderKey;
  const getInstructionRowsForOrder = (row: OverseasTransitRow): InstructionFeeRow[] =>
    instructionRowsByOrder[getOrderKey(row)] ?? row.instructions ?? [];
  const activeInstructionRows = activeOrder ? getInstructionRowsForOrder(activeOrder) : [];
  const activeQuoteRows = activeOrder ? (quoteRowsByOrder[activeOrderKey] || quoteFeeRows) : [];
  const canEditQuoteFees = !!activeOrder && quoteEditableStatuses.has(activeOrder.status);
  const canEditOrderRemarks = !!activeOrder && remarkEditableStatuses.has(activeOrder.status);
  const isEditingOrderRemarks = canEditOrderRemarks && editingRemarkOrderKey === activeOrderKey && editingRemarkField !== null && remarkDraft !== null;
  const activeAttachmentRows = activeOrder
    ? [...(attachmentRowsByOrder[activeOrderKey] || attachmentRows), ...(activeOrder.attachments || []), ...(addressAttachmentsByOrder[activeOrderKey] || [])]
    : [];
  const activeAddressAttachments = activeOrder ? (addressAttachmentsByOrder[activeOrderKey] || []) : [];
  const activeTrackingRows = activeOrder ? (trackingRowsByOrder[activeOrderKey] || getDefaultTrackingRows(activeOrder)) : [];

  useEffect(() => subscribeOverseasTransitFlow(() => setCreatedTransitRows(getCreatedTransitChildOrders())), []);
  useEffect(() => {
    if (overseasTransitNodes.includes(activeNode)) {
      setActiveTab(activeNode);
    }
  }, [activeNode]);

  const handleNodeChange = (node: string) => {
    setActiveTab(node);
    onNodeChange?.(node);
  };

  const openOrder = (row: OverseasTransitRow) => {
    setActiveOrder(row);
    setShowInstructionModal(false);
    setEditingInstruction(null);
    setDeletingInstruction(null);
    setEditingQuoteFee(null);
    setDeletingQuoteFee(null);
    setShowAttachmentModal(false);
    setEditingAttachment(null);
    setDeletingAttachment(null);
    setAttachmentForm(emptyAttachmentForm);
    setTransferPanelOpen(false);
    setEditingOrderFormKey(null);
    setAddressFormSnapshotsByOrder({});
    setEditingRemarkOrderKey(null);
    setEditingRemarkField(null);
    setRemarkDraft(null);
    setDownstreamDetailTab('费用信息');
    if (usesOrderFormTemplate(row.status)) {
      const orderKey = getOrderKey(row);
      setAddressFormsByOrder((prev) => (prev[orderKey] ? prev : { ...prev, [orderKey]: getParentStorageAddressForm(row) }));
      if (row.instructions) setInstructionRowsByOrder((prev) => (prev[orderKey] ? prev : { ...prev, [orderKey]: row.instructions || [] }));
    }
    addToast(`已打开 ${getOrderKey(row)} 中转下单页面`, 'info');
  };

  const openLog = () => {
    const selectedCurrentRow = filteredRows.find((item) => selectedIds.includes(getOrderKey(item)));
    if (!selectedCurrentRow) {
      addToast('请先勾选当前节点下需要查看日志的中转运单', 'warning');
      return;
    }
    setActiveLogOrder(selectedCurrentRow);
    addToast(`已打开 ${selectedCurrentRow.id} 操作日志`, 'info');
  };
  const appendQuoteLog = (orderId: string, log: Omit<OrderLogRow, 'id'>) => {
    setQuoteLogsByOrder((prev) => {
      const currentLogs = prev[orderId] || [];
      return {
        ...prev,
        [orderId]: [
          ...currentLogs,
          {
            id: `${orderId}-quote-${currentLogs.length + 1}`,
            ...log,
          },
        ],
      };
    });
  };

  const startOrderRemarkEdit = (field: EditableRemarkField) => {
    if (!activeOrder || !activeOrderKey || !remarkEditableStatuses.has(activeOrder.status)) return;
    setRemarkDraft({
      customerRemark: activeOrder.customerRemark || '',
      overseasWarehouseRemark: activeOrder.overseasWarehouseRemark || '',
    });
    setEditingRemarkOrderKey(activeOrderKey);
    setEditingRemarkField(field);
  };

  const cancelOrderRemarksEdit = () => {
    setEditingRemarkOrderKey(null);
    setEditingRemarkField(null);
    setRemarkDraft(null);
  };

  const saveOrderRemark = (field: EditableRemarkField) => {
    if (!activeOrder || !activeOrderKey || !remarkDraft || editingRemarkField !== field || !remarkEditableStatuses.has(activeOrder.status)) return;

    const nextRemarks: EditableOrderRemarks = {
      customerRemark: activeOrder.customerRemark || '',
      overseasWarehouseRemark: activeOrder.overseasWarehouseRemark || '',
    };
    const previousValue = activeOrder[field] || '';
    const nextValue = remarkDraft[field].trim();
    nextRemarks[field] = nextValue;
    const fieldLabel = field === 'customerRemark' ? '客户备注' : '海外仓备注';

    if (nextValue === previousValue) {
      cancelOrderRemarksEdit();
      addToast('备注未发生变化', 'info');
      return;
    }

    setRemarkOverridesByOrder((prev) => ({ ...prev, [activeOrderKey]: nextRemarks }));
    if (isCreatedTransitChildOrder(activeOrder)) {
      updateCreatedTransitChildOrderRemarks(activeOrder.id, nextRemarks);
    }
    setActiveOrder((prev) => (prev ? { ...prev, ...nextRemarks } : prev));
    appendQuoteLog(activeOrderKey, {
      operatedAt: formatDateTime(),
      operator: '天朗（付豪）',
      action: '修改备注',
      field: fieldLabel,
      before: previousValue || '-',
      after: nextValue || '-',
      note: `已更新中转单${fieldLabel}`,
    });
    cancelOrderRemarksEdit();
    addToast(`海外中转单 ${activeOrderKey} ${fieldLabel}已保存`, 'success');
  };

  const openFeeSelector = (target: FeeModalTarget) => {
    setFeeModalTarget(target);
    if (target === 'quote') {
      setSelectedFeeCodes([instructionFeeRows[0].code]);
    }
    setShowInstructionModal(true);
  };

  const getSelectedCurrentRows = () => filteredRows.filter((row) => selectedIds.includes(getOrderKey(row)));

  const updateSeedLifecycleTimes = (orderKeys: string[], updates: LifecycleTimeValues) => {
    if (orderKeys.length === 0) return;
    setLifecycleTimeOverridesByOrder((prev) => {
      const next = { ...prev };
      orderKeys.forEach((orderKey) => {
        next[orderKey] = { ...(next[orderKey] || {}), ...updates };
      });
      return next;
    });
  };

  const applyOrderSearch = () => {
    setAppliedLifecycleDateFilters({
      orderedAt: searchValues.orderedAt || undefined,
      outboundAt: searchValues.outboundAt || undefined,
      signedAt: searchValues.signedAt || undefined,
    });
    setAppliedOrderFilters({
      inboundNo: searchValues.inboundNo?.trim() || '',
      shipmentId: searchValues.shipmentId?.trim() || '',
      referenceId: searchValues.referenceId?.trim() || '',
      overseasWarehouseArrivalStatus: searchValues.overseasWarehouseArrivalStatus || '',
      reconciliationStatus: searchValues.reconciliationStatus || '',
      deliveryMethod: searchValues.deliveryMethod || '',
    });
    addToast('已查询海外中转单数据', 'success');
  };

  const resetOrderSearch = () => {
    setSearchValues({});
    setAppliedLifecycleDateFilters({});
    setAppliedOrderFilters({ ...emptyOrderFilterValues });
    addToast('已重置筛选条件', 'info');
  };

  const clearSelectedCurrentRows = (rows: OverseasTransitRow[]) => {
    const currentKeys = new Set(rows.map(getOrderKey));
    setSelectedIds((prev) => prev.filter((id) => !currentKeys.has(id)));
  };

  const toggleRow = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const toggleAllCurrentRows = () => {
    const currentKeys = filteredRows.map(getOrderKey);
    if (currentKeys.length === 0) return;
    setSelectedIds((prev) => (
      currentKeys.every((id) => prev.includes(id))
        ? prev.filter((id) => !currentKeys.includes(id))
        : Array.from(new Set([...prev, ...currentKeys]))
    ));
  };

  const cancelPendingOrders = () => {
    if (activeTab !== '待确认') return;
    const rows = getSelectedCurrentRows();
    if (rows.length === 0) { addToast('请先勾选需要取消下单的待确认子单', 'warning'); return; }

    const createdOrderIds = rows.filter(isCreatedTransitChildOrder).map((row) => row.id);
    const seedOrderKeys = rows.filter((row) => !isCreatedTransitChildOrder(row)).map(getOrderKey);

    if (createdOrderIds.length > 0) cancelCreatedTransitChildOrders(createdOrderIds);
    if (seedOrderKeys.length > 0) {
      setStatusOverridesByOrder((prev) => seedOrderKeys.reduce((next, key) => ({ ...next, [key]: '取消' }), { ...prev }));
    }

    clearSelectedCurrentRows(rows);
    addToast(`已取消 ${rows.length} 条待确认子单，返回状态：取消；已取消子单箱号回流至母单`, 'success');
  };

  const rejectPendingOrders = () => {
    if (activeTab !== '待确认') return;
    const rows = getSelectedCurrentRows();
    if (rows.length === 0) { addToast('请先勾选需要驳回的待确认子单', 'warning'); return; }

    const createdOrderIds = rows.filter(isCreatedTransitChildOrder).map((row) => row.id);
    const seedOrderKeys = rows.filter((row) => !isCreatedTransitChildOrder(row)).map(getOrderKey);

    if (createdOrderIds.length > 0) rejectCreatedTransitChildOrders(createdOrderIds);
    if (seedOrderKeys.length > 0) {
      setStatusOverridesByOrder((prev) => seedOrderKeys.reduce((next, key) => ({ ...next, [key]: '驳回' }), { ...prev }));
    }

    rows.forEach((row) => appendQuoteLog(getOrderKey(row), {
      operatedAt: formatDateTime(),
      operator: '天朗（付豪）',
      action: '驳回海外中转单',
      field: '状态 / 子单箱号',
      before: '待确认',
      after: '驳回 / 回流母单',
      note: row.boxNumbers?.length
        ? `子单箱号 ${row.boxNumbers.join('、')} 已回流至母单`
        : '子单状态已驳回，关联数据已回流至母单',
    }));

    clearSelectedCurrentRows(rows);
    addToast(`已驳回 ${rows.length} 条待确认子单，状态已流转至驳回；子单数据已回流至母单`, 'success');
  };

  const confirmPendingOrders = () => {
    if (activeTab !== '待确认') return;
    const rows = getSelectedCurrentRows();
    if (rows.length === 0) { addToast('请先勾选需要确认的待确认子单', 'warning'); return; }
    const missingScheduledShippingRows = rows.filter((row) => {
      const orderKey = getOrderKey(row);
      const currentAddressForm = addressFormsByOrder[orderKey] || getParentStorageAddressForm(row);
      return !currentAddressForm.scheduledShippingTime;
    });
    if (missingScheduledShippingRows.length > 0) {
      addToast('预约发货时间为必填项，请先补充后再确认', 'warning');
      return;
    }
    const missingDeliveryMethodRows = rows.filter((row) => {
      const orderKey = getOrderKey(row);
      const currentAddressForm = addressFormsByOrder[orderKey] || getParentStorageAddressForm(row);
      return !currentAddressForm.deliveryMethod;
    });
    if (missingDeliveryMethodRows.length > 0) {
      addToast('派送方式为必填项，请先补充后再确认', 'warning');
      return;
    }

    const createdOrderIds = rows.filter(isCreatedTransitChildOrder).map((row) => row.id);
    const seedOrderKeys = rows.filter((row) => !isCreatedTransitChildOrder(row)).map(getOrderKey);

    if (createdOrderIds.length > 0) confirmCreatedTransitChildOrders(createdOrderIds);
    if (seedOrderKeys.length > 0) {
      setStatusOverridesByOrder((prev) => seedOrderKeys.reduce((next, key) => ({ ...next, [key]: '已确认' }), { ...prev }));
    }

    clearSelectedCurrentRows(rows);
    addToast(`已确认 ${rows.length} 条待确认子单，状态已流转至已确认`, 'success');
  };

  const requestCancelConfirmedOrders = () => {
    if (activeTab !== '已确认') return;
    const rows = getSelectedCurrentRows();
    if (rows.length === 0) { addToast('请先勾选需要取消下单的已确认子单', 'warning'); return; }
    setCancelConfirmOrderKeys(rows.map(getOrderKey));
  };

  const openExpressCreationWorkspace = () => {
    if (activeTab !== '已确认') return;
    const rows = getSelectedCurrentRows();
    if (rows.length === 0) {
      addToast('请先勾选需要创建快递单的已确认子单', 'warning');
      return;
    }
    setExpressOrderKeys(rows.map(getOrderKey));
    addToast(`已载入 ${rows.length} 条已确认子单，并按目的国家分配至美线或欧线`, 'info');
  };

  const createExpressOrders = (rowsToCreate: OverseasTransitRow[], line: ExpressLineTab, config: ExpressBatchConfig) => {
    const createdAt = formatDateTime();
    const compactTimestamp = createdAt.replace(/\D/g, '').slice(2);
    setExpressRecordsByOrder((prev) => {
      const next = { ...prev };
      rowsToCreate.forEach((row, index) => {
        const orderKey = getOrderKey(row);
        const orderSuffix = orderKey.replace(/\D/g, '').slice(-5).padStart(5, '0');
        next[orderKey] = {
          line,
          trackingNo: `${line === '美线打单' ? 'US' : 'EU'}${compactTimestamp}${orderSuffix}${String(index + 1).padStart(2, '0')}`,
          platform: config.platform,
          shippingAccount: config.shippingAccount,
          service: config.service,
          createdAt,
        };
      });
      return next;
    });
    addToast(`已成功创建 ${rowsToCreate.length} 个${line}快递单，中转单仍保留在已确认`, 'success');
  };

  const confirmCancelConfirmedOrders = () => {
    const rows = cancelConfirmRows;
    if (rows.length === 0) {
      setCancelConfirmOrderKeys([]);
      addToast('当前没有可取消的已确认子单', 'warning');
      return;
    }

    const createdOrderIds = rows.filter(isCreatedTransitChildOrder).map((row) => row.id);
    const seedOrderKeys = rows.filter((row) => !isCreatedTransitChildOrder(row)).map(getOrderKey);

    if (createdOrderIds.length > 0) cancelCreatedTransitChildOrders(createdOrderIds);
    if (seedOrderKeys.length > 0) {
      setStatusOverridesByOrder((prev) => seedOrderKeys.reduce((next, key) => ({ ...next, [key]: '取消' }), { ...prev }));
    }

    clearSelectedCurrentRows(rows);
    setCancelConfirmOrderKeys([]);
    addToast(`已取消 ${rows.length} 条已确认子单，返回状态：取消；已取消子单箱号回流至母单`, 'success');
  };

  const clearConfirmedOrderSubmission = () => {
    setConfirmedOrderSubmissionKeys([]);
    setConfirmedOrderSubmissionCheck(null);
  };

  const completeConfirmedOrderSubmission = (rows: OverseasTransitRow[]) => {
    if (rows.length === 0) {
      clearConfirmedOrderSubmission();
      addToast('当前没有可下单的已确认子单', 'warning');
      return;
    }

    const createdOrderIds = rows.filter(isCreatedTransitChildOrder).map((row) => row.id);
    const seedOrderKeys = rows.filter((row) => !isCreatedTransitChildOrder(row)).map(getOrderKey);

    if (createdOrderIds.length > 0) markCreatedTransitChildOrdersAsOrdered(createdOrderIds);
    if (seedOrderKeys.length > 0) {
      setStatusOverridesByOrder((prev) => seedOrderKeys.reduce((next, key) => ({ ...next, [key]: '已下单' }), { ...prev }));
      updateSeedLifecycleTimes(seedOrderKeys, {
        orderedAt: formatDateTime(),
        outboundAt: undefined,
        signedAt: undefined,
      });
    }

    clearSelectedCurrentRows(rows);
    clearConfirmedOrderSubmission();
    addToast(`已下单确定 ${rows.length} 条已确认子单，返回状态：已下单`, 'success');
  };

  const submitConfirmedOrders = () => {
    if (activeTab !== '已确认') return;
    const rows = getSelectedCurrentRows();
    if (rows.length === 0) { addToast('请先勾选需要下单确定的已确认子单', 'warning'); return; }

    setConfirmedOrderSubmissionKeys(rows.map(getOrderKey));
    if (rows.some((row) => getReconciliationStatus(row) !== '已核销')) {
      setConfirmedOrderSubmissionCheck('reconciliation');
      return;
    }
    if (rows.some((row) => getOverseasWarehouseArrivalStatus(row) === '否')) {
      setConfirmedOrderSubmissionCheck('arrival');
      return;
    }

    completeConfirmedOrderSubmission(rows);
  };

  const continueConfirmedOrderSubmission = () => {
    const rows = confirmedOrderSubmissionRows;
    if (rows.length === 0) {
      clearConfirmedOrderSubmission();
      addToast('当前没有可下单的已确认子单', 'warning');
      return;
    }

    if (
      confirmedOrderSubmissionCheck === 'reconciliation'
      && rows.some((row) => getOverseasWarehouseArrivalStatus(row) === '否')
    ) {
      setConfirmedOrderSubmissionCheck('arrival');
      return;
    }

    completeConfirmedOrderSubmission(rows);
  };

  const cancelConfirmedOrderSubmission = () => {
    const rowCount = confirmedOrderSubmissionRows.length;
    clearConfirmedOrderSubmission();
    addToast(
      rowCount > 0
        ? `已暂不下单，${rowCount} 条已确认子单保持当前状态`
        : '已取消下单操作，运单状态保持不变',
      'info',
    );
  };
  const requestRollbackOrderedRows = () => {
    if (activeTab !== '已下单') return;
    const rows = getSelectedCurrentRows();
    if (rows.length === 0) { addToast('请先勾选需要回退的已下单子单', 'warning'); return; }
    setRollbackConfirmOrderKeys(rows.map(getOrderKey));
  };

  const confirmRollbackOrderedRows = () => {
    const rows = rollbackConfirmRows;
    if (rows.length === 0) {
      setRollbackConfirmOrderKeys([]);
      addToast('当前没有可回退的已下单子单', 'warning');
      return;
    }

    const createdOrderIds = rows.filter(isCreatedTransitChildOrder).map((row) => row.id);
    const seedOrderKeys = rows.filter((row) => !isCreatedTransitChildOrder(row)).map(getOrderKey);

    if (createdOrderIds.length > 0) rollbackCreatedTransitChildOrdersToConfirmed(createdOrderIds);
    if (seedOrderKeys.length > 0) {
      setStatusOverridesByOrder((prev) => seedOrderKeys.reduce((next, key) => ({ ...next, [key]: '已确认' }), { ...prev }));
      updateSeedLifecycleTimes(seedOrderKeys, { orderedAt: undefined, outboundAt: undefined, signedAt: undefined });
    }

    clearSelectedCurrentRows(rows);
    setRollbackConfirmOrderKeys([]);
    addToast(`已回退 ${rows.length} 条已下单子单，返回状态：已确认`, 'success');
  };

  const shipOrderedRows = () => {
    if (activeTab !== '已下单') return;
    const rows = getSelectedCurrentRows();
    if (rows.length === 0) { addToast('请先勾选需要出运的已下单子单', 'warning'); return; }

    const createdOrderIds = rows.filter(isCreatedTransitChildOrder).map((row) => row.id);
    const seedOrderKeys = rows.filter((row) => !isCreatedTransitChildOrder(row)).map(getOrderKey);

    if (createdOrderIds.length > 0) shipCreatedTransitChildOrders(createdOrderIds);
    if (seedOrderKeys.length > 0) {
      setStatusOverridesByOrder((prev) => seedOrderKeys.reduce((next, key) => ({ ...next, [key]: '转运中' }), { ...prev }));
      updateSeedLifecycleTimes(seedOrderKeys, { outboundAt: formatDateTime(), signedAt: undefined });
    }

    clearSelectedCurrentRows(rows);
    addToast(`已出运 ${rows.length} 条已下单子单，返回状态：转运中`, 'success');
  };
  const signTransitRows = () => {
    if (activeTab !== '转运中') return;
    const rows = getSelectedCurrentRows();
    if (rows.length === 0) { addToast('请先勾选需要签收的转运中子单', 'warning'); return; }

    const createdOrderIds = rows.filter(isCreatedTransitChildOrder).map((row) => row.id);
    const seedOrderKeys = rows.filter((row) => !isCreatedTransitChildOrder(row)).map(getOrderKey);

    if (createdOrderIds.length > 0) signCreatedTransitChildOrders(createdOrderIds);
    if (seedOrderKeys.length > 0) {
      setStatusOverridesByOrder((prev) => seedOrderKeys.reduce((next, key) => ({ ...next, [key]: '签收' }), { ...prev }));
      updateSeedLifecycleTimes(seedOrderKeys, { signedAt: formatDateTime() });
    }

    clearSelectedCurrentRows(rows);
    addToast(`已签收 ${rows.length} 条转运中子单，返回状态：签收`, 'success');
  };

  const requestRollbackTransitRows = () => {
    if (activeTab !== '转运中') return;
    const rows = getSelectedCurrentRows();
    if (rows.length === 0) { addToast('请先勾选需要回退的转运中子单', 'warning'); return; }
    setTransitRollbackConfirmOrderKeys(rows.map(getOrderKey));
  };

  const confirmRollbackTransitRows = () => {
    const rows = transitRollbackConfirmRows;
    if (rows.length === 0) {
      setTransitRollbackConfirmOrderKeys([]);
      addToast('当前没有可回退的转运中子单', 'warning');
      return;
    }

    const createdOrderIds = rows.filter(isCreatedTransitChildOrder).map((row) => row.id);
    const seedOrderKeys = rows.filter((row) => !isCreatedTransitChildOrder(row)).map(getOrderKey);

    if (createdOrderIds.length > 0) rollbackCreatedTransitChildOrdersToOrdered(createdOrderIds);
    if (seedOrderKeys.length > 0) {
      setStatusOverridesByOrder((prev) => seedOrderKeys.reduce((next, key) => ({ ...next, [key]: '已下单' }), { ...prev }));
      updateSeedLifecycleTimes(seedOrderKeys, { outboundAt: undefined, signedAt: undefined });
    }

    clearSelectedCurrentRows(rows);
    setTransitRollbackConfirmOrderKeys([]);
    addToast(`已回退 ${rows.length} 条转运中子单，返回状态：已下单`, 'success');
  };
  const requestRollbackSignedRows = () => {
    if (activeTab !== '签收') return;
    const rows = getSelectedCurrentRows();
    if (rows.length === 0) { addToast('请先勾选需要回退的签收子单', 'warning'); return; }
    setSignedRollbackConfirmOrderKeys(rows.map(getOrderKey));
  };

  const confirmRollbackSignedRows = () => {
    const rows = signedRollbackConfirmRows;
    if (rows.length === 0) {
      setSignedRollbackConfirmOrderKeys([]);
      addToast('当前没有可回退的签收子单', 'warning');
      return;
    }

    const createdOrderIds = rows.filter(isCreatedTransitChildOrder).map((row) => row.id);
    const seedOrderKeys = rows.filter((row) => !isCreatedTransitChildOrder(row)).map(getOrderKey);

    if (createdOrderIds.length > 0) rollbackSignedCreatedTransitChildOrdersToTransit(createdOrderIds);
    if (seedOrderKeys.length > 0) {
      setStatusOverridesByOrder((prev) => seedOrderKeys.reduce((next, key) => ({ ...next, [key]: '转运中' }), { ...prev }));
      updateSeedLifecycleTimes(seedOrderKeys, { signedAt: undefined });
    }

    clearSelectedCurrentRows(rows);
    setSignedRollbackConfirmOrderKeys([]);
    addToast(`已回退 ${rows.length} 条签收子单，返回状态：转运中`, 'success');
  };

  const toggleFeeCode = (code: string) => {
    setSelectedFeeCodes((prev) => (prev.includes(code) ? prev.filter((item) => item !== code) : [...prev, code]));
  };

  const setOrderInstructionRows = (row: OverseasTransitRow, rows: InstructionFeeRow[]) => {
    const timestamp = formatDateTime();
    const normalizedRows: CreatedTransitInstruction[] = rows.map((instruction) => ({
      ...instruction,
      quantity: instruction.quantity || '1',
      addedAt: instruction.addedAt || timestamp,
      addedBy: instruction.addedBy || '天朗（付豪）',
    }));
    setInstructionRowsByOrder((prev) => ({
      ...prev,
      [getOrderKey(row)]: normalizedRows,
    }));
    if (isCreatedTransitChildOrder(row)) {
      updateCreatedTransitChildOrderInstructions(row.id, normalizedRows);
    }
  };

  const confirmInstructionFees = () => {
    const selectedFees = instructionFeeRows
      .filter((row) => selectedFeeCodes.includes(row.code))
      .map((row) => ({
        ...row,
        quantity: '1',
        addedAt: formatDateTime(),
        addedBy: '天朗（付豪）',
      }));
    if (feeModalTarget === 'quote') {
      if (!activeOrder) return;
      const orderKey = getOrderKey(activeOrder);
      const existingRows = quoteRowsByOrder[orderKey] || quoteFeeRows;
      const nextRows = selectedFees.map((row, index) => createQuoteFeeRow(row, existingRows.length + index + 1));
      setQuoteRowsByOrder((prev) => ({
        ...prev,
        [orderKey]: [...existingRows, ...nextRows],
      }));
      appendQuoteLog(orderKey, {
        operatedAt: formatDateTime(),
        operator: '天朗（付豪）',
        action: '新增报价费用明细',
        field: '费用明细',
        before: '-',
        after: nextRows.map(describeQuoteFee).join('；'),
        note: `新增 ${nextRows.length} 条报价费用明细`,
      });
      setShowInstructionModal(false);
      addToast(`已添加 ${nextRows.length} 条报价费用明细`, 'success');
      return;
    }
    if (activeOrder) {
      const orderKey = getOrderKey(activeOrder);
      setOrderInstructionRows(activeOrder, selectedFees);

      if (activeOrder.status === '已确认') {
        const existingRows = quoteRowsByOrder[orderKey] || quoteFeeRows;
        const nextRows = selectedFees.map((row, index) => createQuoteFeeRow(row, existingRows.length + index + 1));
        setQuoteRowsByOrder((prev) => ({
          ...prev,
          [orderKey]: [...existingRows, ...nextRows],
        }));
        appendQuoteLog(orderKey, {
          operatedAt: formatDateTime(),
          operator: '客户',
          action: '新增操作指令',
          field: '费用信息',
          before: '-',
          after: nextRows.map(describeQuoteFee).join('；'),
          note: '已确认状态新增操作指令并同步费用明细',
        });
      }
    }
    setShowInstructionModal(false);
    addToast(`已添加 ${selectedFees.length} 条操作指令`, 'success');
  };

  const saveEditingInstruction = () => {
    if (!editingInstruction) return;
    if (activeOrder) {
      setOrderInstructionRows(
        activeOrder,
        getInstructionRowsForOrder(activeOrder).map((row) => (row.code === editingInstruction.code ? editingInstruction : row)),
      );
    }
    setEditingInstruction(null);
    addToast('操作指令已更新', 'success');
  };

  const confirmDeleteInstruction = () => {
    if (!deletingInstruction) return;
    if (activeOrder) {
      setOrderInstructionRows(
        activeOrder,
        getInstructionRowsForOrder(activeOrder).filter((item) => item.code !== deletingInstruction.code),
      );
    }
    setDeletingInstruction(null);
    addToast('操作指令已删除', 'info');
  };

  const saveEditingQuoteFee = () => {
    if (!editingQuoteFee || !activeOrder) return;
    const orderKey = getOrderKey(activeOrder);
    const existingRows = quoteRowsByOrder[orderKey] || quoteFeeRows;
    const previousRow = existingRows.find((row) => row.code === editingQuoteFee.code);
    const exchangeRate = getExchangeRate(editingQuoteFee.currency);
    const nextRow = {
      ...editingQuoteFee,
      currency: normalizeCurrency(editingQuoteFee.currency),
      exchangeRate,
      amount: getQuoteAmount({ ...editingQuoteFee, exchangeRate }),
    };
    setQuoteRowsByOrder((prev) => ({
      ...prev,
      [orderKey]: existingRows.map((row) => (row.code === nextRow.code ? nextRow : row)),
    }));
    appendQuoteLog(orderKey, {
      operatedAt: formatDateTime(),
      operator: '天朗（付豪）',
      action: '编辑报价费用明细',
      field: nextRow.name,
      before: previousRow ? describeQuoteFee(previousRow) : '-',
      after: describeQuoteFee(nextRow),
      note: '报价费用明细已更新',
    });
    setEditingQuoteFee(null);
    addToast('报价费用明细已更新', 'success');
  };

  const confirmDeleteQuoteFee = () => {
    if (!deletingQuoteFee || !activeOrder) return;
    const orderKey = getOrderKey(activeOrder);
    const existingRows = quoteRowsByOrder[orderKey] || quoteFeeRows;
    setQuoteRowsByOrder((prev) => ({
      ...prev,
      [orderKey]: existingRows.filter((row) => row.code !== deletingQuoteFee.code),
    }));
    appendQuoteLog(orderKey, {
      operatedAt: formatDateTime(),
      operator: '天朗（付豪）',
      action: '删除报价费用明细',
      field: deletingQuoteFee.name,
      before: describeQuoteFee(deletingQuoteFee),
      after: '-',
      note: '报价费用明细已删除',
    });
    setDeletingQuoteFee(null);
    addToast('报价费用明细已删除', 'info');
  };

  const openAttachmentModal = (row?: AttachmentRow) => {
    setEditingAttachment(row || null);
    setAttachmentForm(row
      ? {
          fileName: row.name,
          fileSize: row.fileSize,
          type: row.type,
          customerVisible: row.customerVisible as AttachmentFormState['customerVisible'],
        }
      : emptyAttachmentForm);
    setShowAttachmentModal(true);
  };

  const handleAttachmentFileChange = (file?: File) => {
    if (!file) return;
    const sizeInMb = file.size / 1024 / 1024;
    setAttachmentForm((prev) => ({
      ...prev,
      fileName: file.name,
      fileSize: sizeInMb >= 1 ? `${sizeInMb.toFixed(1)}MB` : `${Math.max(1, Math.round(file.size / 1024))}KB`,
    }));
  };

  const handleAddressAttachmentFileChange = (file?: File) => {
    if (!file || !activeOrderKey) return;
    const sizeInMb = file.size / 1024 / 1024;
    const attachment: AttachmentRow = {
      id: `ADDR-${Date.now()}`,
      name: file.name,
      type: '其它',
      customerVisible: '可见',
      uploadedAt: formatDateTime(),
      uploadedBy: '天朗（付豪）',
      fileSize: sizeInMb >= 1 ? `${sizeInMb.toFixed(1)}MB` : `${Math.max(1, Math.round(file.size / 1024))}KB`,
      file,
    };
    setAddressAttachmentsByOrder((prev) => ({ ...prev, [activeOrderKey]: [attachment] }));
    addToast('附件已选择，下单后可在子单其它信息中下载', 'info');
  };

  const removeAddressAttachment = () => {
    if (!activeOrderKey) return;
    setAddressAttachmentsByOrder((prev) => ({ ...prev, [activeOrderKey]: [] }));
  };

  const downloadAttachment = (row: AttachmentRow) => {
    if (!row.file) {
      addToast(`正在下载 ${row.name}`, 'info');
      return;
    }
    const url = URL.createObjectURL(row.file);
    const link = document.createElement('a');
    link.href = url;
    link.download = row.name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    addToast(`已下载 ${row.name}`, 'success');
  };

  const saveAttachment = () => {
    if (!activeOrder) return;
    if (!attachmentForm.fileName) {
      addToast('请先选择附件文件', 'warning');
      return;
    }
    const orderKey = getOrderKey(activeOrder);
    const existingRows = attachmentRowsByOrder[orderKey] || attachmentRows;
    if (editingAttachment) {
      const previousRow = existingRows.find((row) => row.id === editingAttachment.id);
      const nextRow: AttachmentRow = {
        ...editingAttachment,
        name: attachmentForm.fileName,
        type: attachmentForm.type,
        customerVisible: attachmentForm.customerVisible,
        fileSize: attachmentForm.fileSize || editingAttachment.fileSize,
      };
      setAttachmentRowsByOrder((prev) => ({
        ...prev,
        [orderKey]: existingRows.map((row) => (row.id === nextRow.id ? nextRow : row)),
      }));
      appendQuoteLog(orderKey, {
        operatedAt: formatDateTime(),
        operator: '天朗（付豪）',
        action: '编辑附件',
        field: nextRow.name,
        before: previousRow ? `${previousRow.type} / ${previousRow.customerVisible}` : '-',
        after: `${nextRow.type} / ${nextRow.customerVisible}`,
        note: '附件信息已更新',
      });
      addToast('附件信息已更新', 'success');
    } else {
      const nextRow: AttachmentRow = {
        id: `ATT-${Date.now()}`,
        name: attachmentForm.fileName,
        type: attachmentForm.type,
        customerVisible: attachmentForm.customerVisible,
        uploadedAt: formatDateTime(),
        uploadedBy: '天朗（付豪）',
        fileSize: attachmentForm.fileSize || '-',
      };
      setAttachmentRowsByOrder((prev) => ({
        ...prev,
        [orderKey]: [...existingRows, nextRow],
      }));
      appendQuoteLog(orderKey, {
        operatedAt: formatDateTime(),
        operator: '天朗（付豪）',
        action: '上传附件',
        field: nextRow.type,
        before: '-',
        after: `${nextRow.name} / ${nextRow.customerVisible}`,
        note: '附件已上传并关联当前运单',
      });
      addToast('附件已上传', 'success');
    }
    setShowAttachmentModal(false);
    setEditingAttachment(null);
    setAttachmentForm(emptyAttachmentForm);
  };

  const confirmDeleteAttachment = () => {
    if (!deletingAttachment || !activeOrder) return;
    const orderKey = getOrderKey(activeOrder);
    const existingRows = attachmentRowsByOrder[orderKey] || attachmentRows;
    setAttachmentRowsByOrder((prev) => ({
      ...prev,
      [orderKey]: existingRows.filter((row) => row.id !== deletingAttachment.id),
    }));
    appendQuoteLog(orderKey, {
      operatedAt: formatDateTime(),
      operator: '天朗（付豪）',
      action: '删除附件',
      field: deletingAttachment.type,
      before: `${deletingAttachment.name} / ${deletingAttachment.customerVisible}`,
      after: '-',
      note: '附件已删除',
    });
    setDeletingAttachment(null);
    addToast('附件已删除', 'info');
  };

  const getTransitTransferNumber = (row: OverseasTransitRow, index: number) => {
    if (index === 0 && row.transferNo) return row.transferNo;
    const seed = `${getOrderKey(row)}${row.fbaCode}${row.warehouseCode || ''}${index + 1}`;
    const value = seed.split('').reduce((sum, char) => sum + char.charCodeAt(0), 1321634000);
    return String(value).slice(0, 10);
  };

  const getDefaultTransferRows = (row: OverseasTransitRow): TransitTransferRow[] => {
    const selectedBoxNumbers = row.boxNumbers?.filter(Boolean) || [];
    const rowCount = selectedBoxNumbers.length || Math.max(row.packages || 1, 1);
    return Array.from({ length: rowCount }, (_, index) => {
      const sequence = String(index + 1).padStart(4, '0');
      return {
        systemBoxNo: `${getOverseasWaybillNo(row)}U${sequence}`,
        fbaBoxNo: selectedBoxNumbers[index] || `${row.fbaCode}U${sequence}`,
        carrierCompany: row.channel,
        transferNo: getTransitTransferNumber(row, index),
      };
    });
  };

  const getTransferRows = (row: OverseasTransitRow) => (
    transferDraftsByOrder[getOrderKey(row)] || savedTransferRowsByOrder[getOrderKey(row)] || getDefaultTransferRows(row)
  );

  const getSavedTransferRows = (row: OverseasTransitRow) => savedTransferRowsByOrder[getOrderKey(row)] || getDefaultTransferRows(row);

  const getTransitCargoBoxRows = (row: OverseasTransitRow) => {
    const totalWeight = parseFeeNumber(row.weight);
    const perBoxWeight = (totalWeight / Math.max(row.packages, 1)).toFixed(2).replace(/\.00$/, '');
    return getSavedTransferRows(row)
      .filter((item) => item.systemBoxNo || item.fbaBoxNo)
      .map((item) => ({
        boxNo: item.fbaBoxNo,
        customerTracking: item.systemBoxNo,
        customerData: [`${perBoxWeight} KG`, '50*50*50 CM'],
        systemWeight: [`${perBoxWeight} / ${perBoxWeight} KG`, '50*50*50 CM'],
        carrier: item.carrierCompany,
        transferNo: item.transferNo,
        warehouseReturnNo: item.transferNo || row.transferNo || '-',
        networkStatus: row.status === '取消' ? '已取消' : row.status,
        status: row.status === '取消' ? '取消' : '查看',
      }));
  };

  const openTrackingModal = () => {
    if (!activeOrder) return;
    setTrackingForm({
      ...emptyTrackingForm,
      occurredAt: formatDateTime(),
      status: activeOrder.status === '取消' ? '已取消' : activeOrder.status,
      location: activeOrder.destination,
    });
    setShowTrackingModal(true);
  };

  const closeTrackingModal = () => {
    setShowTrackingModal(false);
    setTrackingForm(emptyTrackingForm);
  };

  const saveTrackingEvent = () => {
    if (!activeOrder || !activeOrderKey) return;
    if (!trackingForm.occurredAt.trim() || !trackingForm.status.trim() || !trackingForm.description.trim()) {
      addToast('请填写完整的运踪时间、运踪节点和运踪描述', 'warning');
      return;
    }

    const nextEvent: TrackingEvent = {
      id: `${activeOrderKey}-tracking-${Date.now()}`,
      occurredAt: trackingForm.occurredAt.trim(),
      source: '客户',
      status: trackingForm.status.trim(),
      location: trackingForm.location.trim() || activeOrder.destination,
      description: trackingForm.description.trim(),
    };
    setTrackingRowsByOrder((prev) => ({
      ...prev,
      [activeOrderKey]: [...(prev[activeOrderKey] || getDefaultTrackingRows(activeOrder)), nextEvent],
    }));
    appendQuoteLog(activeOrderKey, {
      operatedAt: formatDateTime(),
      operator: '客户',
      action: '客户手动更新运踪',
      field: '运踪信息',
      before: '-',
      after: `${nextEvent.status} / ${nextEvent.location}`,
      note: nextEvent.description,
    });
    addToast(`运单 ${activeOrderKey} 的运踪信息已更新`, 'success');
    closeTrackingModal();
  };
  const openTransferPanel = (row: OverseasTransitRow) => {
    setTransferDraftsByOrder((prev) => {
      const orderKey = getOrderKey(row);
      if (prev[orderKey]) return prev;
      const savedRows = savedTransferRowsByOrder[orderKey];
      return {
        ...prev,
        [orderKey]: savedRows ? savedRows.map((item) => ({ ...item })) : getDefaultTransferRows(row),
      };
    });
    setTransferPanelOpen(true);
  };

  const updateTransferDraft = (orderId: string, rowIndex: number, field: 'carrierCompany' | 'transferNo', value: string) => {
    setTransferDraftsByOrder((prev) => {
      const currentRows = prev[orderId] || (activeOrder ? getDefaultTransferRows(activeOrder) : []);
      return {
        ...prev,
        [orderId]: currentRows.map((row, index) => (index === rowIndex ? { ...row, [field]: value } : row)),
      };
    });
  };

  const saveTransferRows = () => {
    if (!activeOrder) return;
    const nextRows = getTransferRows(activeOrder);
    const filledRows = nextRows.filter((row) => row.systemBoxNo || row.fbaBoxNo);
    const missingRequired = filledRows.some((row) => !row.carrierCompany.trim() || !row.transferNo.trim());
    if (missingRequired) {
      addToast('请填写承运公司和转单号', 'warning');
      return;
    }

    setSavedTransferRowsByOrder((prev) => ({
      ...prev,
      [activeOrderKey]: nextRows.map((row) => ({ ...row })),
    }));
    appendQuoteLog(activeOrderKey, {
      operatedAt: formatDateTime(),
      operator: '天朗（付豪）',
      action: '维护转单号',
      field: '货箱信息',
      before: '-',
      after: filledRows.map((row) => `${row.systemBoxNo} / ${row.carrierCompany} / ${row.transferNo}`).join('；'),
      note: `保存 ${filledRows.length} 条货箱转单号`,
    });
    addToast(`海外中转单 ${activeOrderKey} 转单号已保存`, 'success');
    setTransferPanelOpen(false);
  };

  const startOrderFormEdit = () => {
    if (!activeOrder || !activeOrderKey) return;
    const currentAddressForm = { ...(addressFormsByOrder[activeOrderKey] || getParentStorageAddressForm(activeOrder)) };
    setAddressFormsByOrder((prev) => (prev[activeOrderKey] ? prev : { ...prev, [activeOrderKey]: currentAddressForm }));
    setAddressFormSnapshotsByOrder((prev) => ({ ...prev, [activeOrderKey]: currentAddressForm }));
    setEditingOrderFormKey(activeOrderKey);
  };

  const saveOrderFormEdit = () => {
    if (!activeOrder || !activeOrderKey || !isOrderFormEditing) return;
    if (!addressForm.scheduledShippingTime) { addToast('请选择预约发货时间', 'warning'); return; }
    if (!addressForm.deliveryMethod) { addToast('请选择派送方式', 'warning'); return; }
    if (!addressForm.orderType || !addressForm.warehouseCode || !addressForm.zipCode || !addressForm.city || !addressForm.addressDetail) { addToast('请先填写完整的收件地址信息', 'warning'); return; }
    setAddressFormSnapshotsByOrder((prev) => {
      const next = { ...prev };
      delete next[activeOrderKey];
      return next;
    });
    setEditingOrderFormKey(null);
    addToast(`海外中转单 ${activeOrderKey} 收件地址信息已保存`, 'success');
  };

  const cancelOrderFormEdit = () => {
    if (!activeOrder || !activeOrderKey) return;
    setAddressFormsByOrder((prev) => ({
      ...prev,
      [activeOrderKey]: addressFormSnapshotsByOrder[activeOrderKey] || getParentStorageAddressForm(activeOrder),
    }));
    setAddressFormSnapshotsByOrder((prev) => {
      const next = { ...prev };
      delete next[activeOrderKey];
      return next;
    });
    setEditingOrderFormKey(null);
  };

  const updateAddressField = (field: keyof AddressFormState, value: string) => {
    if (!activeOrder || !activeOrderKey || !isOrderFormEditing) return;
    setAddressFormsByOrder((prev) => {
      const current = prev[activeOrderKey] || getParentStorageAddressForm(activeOrder);
      return { ...prev, [activeOrderKey]: { ...current, [field]: value } };
    });
  };

  const handleWarehouseCodeChange = (value: string) => {
    if (!activeOrder || !activeOrderKey || !isOrderFormEditing) return;
    const nextCode = value.trim().toUpperCase();
    const matchedWarehouse = warehouseAddressBook[nextCode];

    setAddressFormsByOrder((prev) => {
      const current = prev[activeOrderKey] || getParentStorageAddressForm(activeOrder);
      return {
        ...prev,
        [activeOrderKey]: {
          ...current,
          warehouseCode: nextCode,
          ...(matchedWarehouse || {}),
          company: current.company,
          remark: current.remark,
          overseasWarehouseRemark: current.overseasWarehouseRemark,
        },
      };
    });
  };
  return (
    <div className="relative flex-1 overflow-auto bg-slate-100 p-4 font-sans text-slate-700 max-h-[calc(100vh-3rem)]">
      <div className="mb-3 rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 items-center gap-x-5 gap-y-4 text-xs md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 [@media(min-width:1800px)]:grid-cols-5">
          {orderSearchFields.map((field) => {
            const searchKey = field.searchKey || field.label;
            return (
              <label key={field.label} className="flex min-w-0 items-center gap-3">
                <span className={orderSearchLabelClass}>{field.label}</span>
                {field.type === 'select' ? (
                  <select
                    className={orderSearchControlClass}
                    value={searchValues[searchKey] || ''}
                    onChange={(event) => setSearchValues((prev) => ({ ...prev, [searchKey]: event.target.value }))}
                  >
                    <option value="">请选择</option>
                    {field.options?.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={field.type === 'date' ? 'date' : 'text'}
                    className={orderSearchControlClass}
                    value={searchValues[searchKey] || ''}
                    placeholder={field.type === 'date' ? undefined : (field.placeholder || '请输入')}
                    onChange={(event) => setSearchValues((prev) => ({ ...prev, [searchKey]: event.target.value }))}
                  />
                )}
              </label>
            );
          })}
          <div className="flex min-w-0 items-center gap-2 pl-[140px]">
            <button type="button" onClick={applyOrderSearch} className="flex h-8 min-w-20 items-center justify-center gap-1 rounded bg-[#004bb1] px-4 text-xs font-bold text-white hover:bg-[#003b91]">
              <Search className="h-3.5 w-3.5" />
              搜索
            </button>
            <button type="button" onClick={resetOrderSearch} className="h-8 min-w-20 rounded border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50">
              重置
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-8 border-b border-slate-200 text-xs font-bold">
          {overseasTransitNodes.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => handleNodeChange(tab)}
              className={`relative px-1 pb-3 ${activeTab === tab ? 'text-[#004bb1]' : 'text-slate-600 hover:text-[#004bb1]'}`}
            >
              {tab}({allRows.filter((row) => row.status === tab).length})
              {activeTab === tab && <span className="absolute inset-x-0 bottom-[-1px] h-0.5 bg-[#004bb1]" />}
            </button>
          ))}
        </div>

        <div className="mb-3 flex items-center gap-3">
          {activeTab === '待确认' ? (
            <>
              <button
                type="button"
                title="支持批量取消；取消后状态流转至取消，对应子单箱号重新回到母单"
                onClick={cancelPendingOrders}
                className="rounded bg-[#004bb1] px-7 py-2 text-xs font-bold text-white hover:bg-[#003b91]"
              >
                取消下单
              </button>
              <button
                type="button"
                title="支持批量驳回；驳回后状态流转至驳回，子单数据重新回到母单"
                onClick={rejectPendingOrders}
                className="rounded bg-[#004bb1] px-7 py-2 text-xs font-bold text-white hover:bg-[#003b91]"
              >
                驳回
              </button>
              <button
                type="button"
                title="支持批量已确认；确认后子单由待确认流转至已确认"
                onClick={confirmPendingOrders}
                className="rounded bg-[#004bb1] px-7 py-2 text-xs font-bold text-white hover:bg-[#003b91]"
              >
                已确认
              </button>
              <button type="button" onClick={() => addToast('导出海外中转单功能为展示', 'info')} className="rounded bg-[#004bb1] px-7 py-2 text-xs font-bold text-white hover:bg-[#003b91]">
                导出
              </button>
              <button type="button" onClick={() => openLog()} className="rounded bg-[#004bb1] px-7 py-2 text-xs font-bold text-white hover:bg-[#003b91]">
                查看日志
              </button>
            </>
          ) : activeTab === '已确认' ? (
            <>
              <button
                type="button"
                title="支持批量取消；取消后状态流转至取消，对应子单箱号重新回到母单"
                onClick={requestCancelConfirmedOrders}
                className="rounded bg-[#004bb1] px-7 py-2 text-xs font-bold text-white hover:bg-[#003b91]"
              >
                取消下单
              </button>
              <button
                type="button"
                title="勾选已确认子单后，按目的国家进入美线打单或欧线打单"
                onClick={openExpressCreationWorkspace}
                className="flex items-center gap-1.5 rounded bg-[#004bb1] px-7 py-2 text-xs font-bold text-white hover:bg-[#003b91]"
              >
                <Printer className="h-3.5 w-3.5" />
                创建快递单
              </button>
              <button
                type="button"
                title="支持批量确认下单；存在待核销费用或货物未到海外仓时需二次确认"
                onClick={submitConfirmedOrders}
                className="rounded bg-[#004bb1] px-7 py-2 text-xs font-bold text-white hover:bg-[#003b91]"
              >
                确认下单
              </button>
              <button type="button" onClick={() => addToast('导出海外中转单功能为展示', 'info')} className="rounded bg-[#004bb1] px-7 py-2 text-xs font-bold text-white hover:bg-[#003b91]">
                导出
              </button>
              <button type="button" onClick={() => openLog()} className="rounded bg-[#004bb1] px-7 py-2 text-xs font-bold text-white hover:bg-[#003b91]">
                查看日志
              </button>
            </>
          ) : activeTab === '已下单' ? (
            <>
              <button
                type="button"
                title="支持批量回退；回退后状态流转至已确认"
                onClick={requestRollbackOrderedRows}
                className="rounded bg-[#004bb1] px-7 py-2 text-xs font-bold text-white hover:bg-[#003b91]"
              >
                回退
              </button>
              <button
                type="button"
                title="支持批量出运；出运后状态流转至转运中"
                onClick={shipOrderedRows}
                className="rounded bg-[#004bb1] px-7 py-2 text-xs font-bold text-white hover:bg-[#003b91]"
              >
                出运
              </button>
              <button type="button" onClick={() => addToast('导出海外中转单功能为展示', 'info')} className="rounded bg-[#004bb1] px-7 py-2 text-xs font-bold text-white hover:bg-[#003b91]">
                导出
              </button>
              <button type="button" onClick={() => openLog()} className="rounded bg-[#004bb1] px-7 py-2 text-xs font-bold text-white hover:bg-[#003b91]">
                查看日志
              </button>
            </>
          ) : activeTab === '转运中' ? (
            <>
              <button
                type="button"
                title="支持批量签收；签收后状态流转至签收"
                onClick={signTransitRows}
                className="rounded bg-[#004bb1] px-7 py-2 text-xs font-bold text-white hover:bg-[#003b91]"
              >
                签收
              </button>
              <button
                type="button"
                title="支持批量回退；回退后状态流转至已下单"
                onClick={requestRollbackTransitRows}
                className="rounded bg-[#004bb1] px-7 py-2 text-xs font-bold text-white hover:bg-[#003b91]"
              >
                回退
              </button>
              <button type="button" onClick={() => addToast('导出海外中转单功能为展示', 'info')} className="rounded bg-[#004bb1] px-7 py-2 text-xs font-bold text-white hover:bg-[#003b91]">
                导出
              </button>
              <button type="button" onClick={() => openLog()} className="rounded bg-[#004bb1] px-7 py-2 text-xs font-bold text-white hover:bg-[#003b91]">
                查看日志
              </button>
            </>
          ) : activeTab === '签收' ? (
            <>
              <button
                type="button"
                title="支持批量回退；回退后状态流转至转运中"
                onClick={requestRollbackSignedRows}
                className="rounded bg-[#004bb1] px-7 py-2 text-xs font-bold text-white hover:bg-[#003b91]"
              >
                回退
              </button>
              <button type="button" onClick={() => addToast('导出海外中转单功能为展示', 'info')} className="rounded bg-[#004bb1] px-7 py-2 text-xs font-bold text-white hover:bg-[#003b91]">
                导出
              </button>
              <button type="button" onClick={() => openLog()} className="rounded bg-[#004bb1] px-7 py-2 text-xs font-bold text-white hover:bg-[#003b91]">
                查看日志
              </button>
            </>
          ) : activeTab === '驳回' ? (
            <>
              <button type="button" onClick={() => addToast('驳回状态的海外中转单已保存', 'success')} className="rounded bg-[#004bb1] px-7 py-2 text-xs font-bold text-white hover:bg-[#003b91]">
                保存
              </button>
              <button type="button" onClick={() => addToast('导出海外中转单功能为展示', 'info')} className="rounded bg-[#004bb1] px-7 py-2 text-xs font-bold text-white hover:bg-[#003b91]">
                导出
              </button>
              <button type="button" onClick={() => openLog()} className="rounded bg-[#004bb1] px-7 py-2 text-xs font-bold text-white hover:bg-[#003b91]">
                查看日志
              </button>
            </>
          ) : activeTab === '取消' ? (
            <>
              <button type="button" onClick={() => addToast('导出海外中转单功能为展示', 'info')} className="rounded bg-[#004bb1] px-7 py-2 text-xs font-bold text-white hover:bg-[#003b91]">
                导出
              </button>
              <button type="button" onClick={() => openLog()} className="rounded bg-[#004bb1] px-7 py-2 text-xs font-bold text-white hover:bg-[#003b91]">
                查看日志
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  const selectedCurrentRow = filteredRows.find((row) => selectedIds.includes(getOrderKey(row)));
                  selectedCurrentRow ? openOrder(selectedCurrentRow) : addToast('请选择当前节点下需要下单的中转运单', 'warning');
                }}
                className="rounded bg-[#004bb1] px-7 py-2 text-xs font-bold text-white hover:bg-[#003b91]"
              >
                下单
              </button>
              <button type="button" onClick={() => addToast('导出海外中转单功能为展示', 'info')} className="rounded bg-[#004bb1] px-7 py-2 text-xs font-bold text-white hover:bg-[#003b91]">
                导出
              </button>
              <button type="button" onClick={() => addToast('批量修改功能为展示', 'info')} className="rounded bg-[#004bb1] px-7 py-2 text-xs font-bold text-white hover:bg-[#003b91]">
                批量修改
              </button>
              <button type="button" onClick={() => openLog()} className="rounded bg-[#004bb1] px-7 py-2 text-xs font-bold text-white hover:bg-[#003b91]">
                查看日志
              </button>
            </>
          )}
        </div>

        <div className="overflow-x-auto border border-slate-200">
          <table className={`w-full ${orderTableMinWidthClass} table-fixed border-collapse text-[11px]`}>
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="w-10 border border-slate-200 px-2 py-2 text-center">
                  <input type="checkbox" checked={filteredRows.length > 0 && filteredRows.every((row) => selectedIds.includes(getOrderKey(row)))} onChange={toggleAllCurrentRows} className="h-3.5 w-3.5 rounded border-slate-300" />
                </th>
                <th className="w-44 border border-slate-200 px-3 py-2 text-center">头程运单号</th>
                {showOverseasWaybillNo && <th className="w-56 border border-slate-200 px-3 py-2 text-center">海外仓运单号</th>}
                {showOverseasWaybillNo && <th className="w-36 border border-slate-200 px-3 py-2 text-center">子单创建时间</th>}
                {activeLifecycleTimeConfig && <th className="w-40 border border-slate-200 px-3 py-2 text-center">{activeLifecycleTimeConfig.label}</th>}
                <th className="w-36 border border-slate-200 px-3 py-2 text-center">转单号</th>
                <th className="w-36 border border-slate-200 px-3 py-2 text-center">FBA单号</th>
                <th className="w-40 border border-slate-200 px-3 py-2 text-center">入仓号</th>
                <th className="w-40 border border-slate-200 px-3 py-2 text-center">Shipment ID</th>
                <th className="w-40 border border-slate-200 px-3 py-2 text-center">Reference ID</th>
                <th className="w-36 border border-slate-200 px-3 py-2 text-center">柜号</th>
                <th className="w-40 border border-slate-200 px-3 py-2 text-center">提单号</th>
                <th className="w-44 border border-slate-200 px-3 py-2 text-center">客户简称</th>
                <th className="w-28 border border-slate-200 px-3 py-2 text-center">仓库代码</th>
                {showOverseasWaybillNo && <th className="w-24 border border-slate-200 px-3 py-2 text-center">邮编</th>}
                {showOverseasWaybillNo && <th className="w-28 border border-slate-200 px-3 py-2 text-center">下单类型</th>}
                <th className="w-28 border border-slate-200 px-3 py-2 text-center">派送方式</th>
                <th className="w-20 border border-slate-200 px-3 py-2 text-center">目的地</th>
                <th className="w-28 border border-slate-200 px-3 py-2 text-center">核销状态</th>
                <th className="w-72 border border-slate-200 px-3 py-2 text-center">指令费用</th>
                <th className="w-36 border border-slate-200 px-3 py-2 text-center">客户备注</th>
                <th className="w-36 border border-slate-200 px-3 py-2 text-center">海外仓备注</th>
                <th className="w-24 border border-slate-200 px-3 py-2 text-center">业务员</th>
                <th className="w-24 border border-slate-200 px-3 py-2 text-center">跟单员</th>
                <th className="w-24 border border-slate-200 px-3 py-2 text-center">发货件数</th>
                <th className="w-24 border border-slate-200 px-3 py-2 text-center">重量</th>
                <th className="w-36 border border-slate-200 px-3 py-2 text-center">方数</th>
                {showOverseasWarehouseArrivalStatus && <th className="w-28 border border-slate-200 px-3 py-2 text-center">是否到达海外仓</th>}
                <th className="w-36 border border-slate-200 px-3 py-2 text-center">入仓时间（海外仓）</th>

              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr
                  key={getOrderKey(row)}
                  onDoubleClick={() => openOrder(row)}
                  title="双击打开中转下单"
                  className={`h-9 cursor-pointer text-slate-700 hover:bg-blue-50/70 ${selectedIds.includes(getOrderKey(row)) ? 'bg-blue-50/30' : ''}`}
                >
                  <td className="border border-slate-200 px-2 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(getOrderKey(row))}
                      onChange={() => toggleRow(getOrderKey(row))}
                      onDoubleClick={(event) => event.stopPropagation()}
                      className="h-3.5 w-3.5 rounded border-slate-300"
                    />
                  </td>
                  <td className="border border-slate-200 px-3 text-center font-mono">{row.id}</td>
                  {showOverseasWaybillNo && <td className="border border-slate-200 px-3 text-center font-mono text-blue-600">{getOverseasWaybillNo(row)}</td>}
                  {showOverseasWaybillNo && <td className="border border-slate-200 px-3 text-center font-mono text-slate-500">{row.childCreatedAt || '-'}</td>}
                  {activeLifecycleTimeConfig && <td className="border border-slate-200 px-3 text-center font-mono text-slate-500">{row[activeLifecycleTimeConfig.key] || '-'}</td>}
                  <td className="border border-slate-200 px-3 text-center font-mono">{row.transferNo || '-'}</td>
                  <td className="border border-slate-200 px-3 text-center font-mono">{row.fbaCode}</td>
                  <td className="border border-slate-200 px-3 text-center font-mono">{row.inboundNo || '-'}</td>
                  <td className="border border-slate-200 px-3 text-center font-mono">{row.shipmentId || '-'}</td>
                  <td className="border border-slate-200 px-3 text-center font-mono">{row.referenceId || '-'}</td>
                  <td className="border border-slate-200 px-3 text-center font-mono">{row.containerNo || '-'}</td>
                  <td className="border border-slate-200 px-3 text-center font-mono">{row.billOfLadingNo || '-'}</td>
                  <td className="truncate border border-slate-200 px-3 text-center">{row.customerName}</td>
                  <td className="border border-slate-200 px-3 text-center font-mono">{row.warehouseCode || '-'}</td>
                  {showOverseasWaybillNo && <td className="border border-slate-200 px-3 text-center font-mono">{row.zipCode || '-'}</td>}
                  {showOverseasWaybillNo && <td className="border border-slate-200 px-3 text-center">{row.orderType || '-'}</td>}
                  <td className="border border-slate-200 px-3 text-center">{row.deliveryMethod || '-'}</td>
                  <td className="border border-slate-200 px-3 text-center">{row.destination}</td>
                  <td className="border border-slate-200 px-3 text-center">
                    <ReconciliationStatusBadge status={getReconciliationStatus(row)} />
                  </td>
                  <InstructionFeeCell rows={getInstructionRowsForOrder(row)} reconciliationStatus={getReconciliationStatus(row)} />
                  <td className="truncate border border-slate-200 px-3 text-center">{row.customerRemark || '-'}</td>
                  <td className="truncate border border-slate-200 px-3 text-center">{row.overseasWarehouseRemark || '-'}</td>
                  <td className="border border-slate-200 px-3 text-center">{row.salesman || '-'}</td>
                  <td className="border border-slate-200 px-3 text-center">{row.merchandiser || '-'}</td>
                  <td className="border border-slate-200 px-3 text-center">{row.packages}</td>
                  <td className="border border-slate-200 px-3 text-center">{row.weight}</td>
                  <td className="border border-slate-200 px-3 text-center">{row.volume}</td>
                  {showOverseasWarehouseArrivalStatus && (
                    <td className="border border-slate-200 px-3 text-center">
                      <OverseasWarehouseArrivalBadge status={getOverseasWarehouseArrivalStatus(row)} />
                    </td>
                  )}
                  <td className="border border-slate-200 px-3 text-center font-mono text-slate-500">{row.inboundTime}</td>
                </tr>
              ))}
              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={orderTableColumnCount} className="h-24 border border-slate-200 text-center text-slate-400">
                    当前节点暂无海外中转单
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {activeOrder && (
        <div className="fixed inset-0 z-50 bg-black/55">
          <div className="absolute right-0 top-0 flex h-full w-[66vw] min-w-[980px] flex-col bg-slate-50 shadow-2xl">
            <div className="flex h-11 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-9">
              <h2 className="text-sm font-bold text-slate-950">{activeOrder.status === '驳回' ? '驳回单详情' : usesOrderFormTemplate(activeOrder.status) ? '中转下单' : '确认运单信息'}</h2>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => { setEditingOrderFormKey(null); setAddressFormSnapshotsByOrder({}); setEditingRemarkOrderKey(null); setEditingRemarkField(null); setRemarkDraft(null); setActiveOrder(null); }} className="rounded p-1 text-slate-700 hover:bg-slate-100" aria-label="关闭">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {usesOrderFormTemplate(activeOrder.status) ? (
                <>
                  <div className="mb-3 grid grid-cols-3 gap-x-8 gap-y-3 rounded-2xl border border-slate-200 bg-white px-8 py-5 text-xs">
                    <div>
                      <span className="font-bold text-blue-600">海外仓运单号：</span>
                      <span className="font-mono text-blue-600">{getOverseasWaybillNo(activeOrder)}</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-900">入仓号：</span>
                      <span className="font-mono">{activeOrder.inboundNo || '-'}</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-900">Shipment ID：</span>
                      <span className="font-mono">{activeOrder.shipmentId || '-'}</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-900">Reference ID：</span>
                      <span className="font-mono">{activeOrder.referenceId || '-'}</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-900">核销状态：</span>
                      <ReconciliationStatusBadge status={getReconciliationStatus(activeOrder)} />
                    </div>
                    <div>
                      <span className="font-bold text-slate-900">是否到达海外仓：</span>
                      <OverseasWarehouseArrivalBadge status={getOverseasWarehouseArrivalStatus(activeOrder)} />
                    </div>
                    <div>
                      <span className="font-bold text-slate-900">柜号：</span>
                      <span className="font-mono">{activeOrder.containerNo || '-'}</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-900">提单号：</span>
                      <span className="font-mono">{activeOrder.billOfLadingNo || '-'}</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-900">目的地：</span>
                      <span>{activeOrder.destination}</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-900">客户备注：</span>
                      <span>{activeOrder.customerRemark || '-'}</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-900">海外仓备注：</span>
                      <span>{activeOrder.overseasWarehouseRemark || '-'}</span>
                    </div>
                  </div>

                  <section className="rounded-2xl border border-slate-200 bg-white px-7 py-4">
                    <div className="mb-5 flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-950">收件地址信息</h3>
                      {isOrderFormEditing ? (
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={saveOrderFormEdit} className="rounded bg-blue-600 px-5 py-1.5 text-xs font-bold text-white hover:bg-blue-700">保存</button>
                          <button type="button" onClick={cancelOrderFormEdit} className="rounded border border-slate-300 bg-white px-5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">取消</button>
                        </div>
                      ) : (
                        <button type="button" onClick={startOrderFormEdit} className="rounded border border-slate-300 bg-white px-5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">编辑</button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-x-16 gap-y-4">
                      <FormRow label="下单类型" requiredMark>
                        <select
                          className={fieldClass}
                          value={addressForm.orderType}
                          disabled={!isOrderFormEditing}
                          onChange={(event) => updateAddressField('orderType', event.target.value)}
                        >
                          {overseasOrderTypes.map((type) => (
                            <option key={type}>{type}</option>
                          ))}
                        </select>
                      </FormRow>

                      <FormRow label="仓库代码" requiredMark>
                        <>
                          <input
                            className={fieldClass}
                            list="overseas-warehouse-codes"
                            placeholder="请输入仓库代码"
                            value={addressForm.warehouseCode}
                            disabled={!isOrderFormEditing}
                            onChange={(event) => handleWarehouseCodeChange(event.target.value)}
                          />
                          <datalist id="overseas-warehouse-codes">
                            {overseasWarehouseCodes.map((code) => (
                              <option key={code} value={code} />
                            ))}
                          </datalist>
                        </>
                      </FormRow>
                      <FormRow label="邮编" requiredMark>
                        <input
                          className={fieldClass}
                          placeholder="请输入邮编"
                          value={addressForm.zipCode}
                          disabled={!isOrderFormEditing}
                          onChange={(event) => updateAddressField('zipCode', event.target.value)}
                        />
                      </FormRow>
                      <FormRow label="收件人">
                        <input
                          className={fieldClass}
                          placeholder="请输入收件人"
                          value={addressForm.consignee}
                          disabled={!isOrderFormEditing}
                          onChange={(event) => updateAddressField('consignee', event.target.value)}
                        />
                      </FormRow>
                      {addressForm.orderType === '私人地址' && (
                        <FormRow label="电话" requiredMark>
                          <input
                            className={fieldClass}
                            placeholder="请输入电话"
                            value={addressForm.phone}
                            disabled={!isOrderFormEditing}
                            onChange={(event) => updateAddressField('phone', event.target.value)}
                          />
                        </FormRow>
                      )}
                      <FormRow label="城市" requiredMark>
                        <input
                          className={fieldClass}
                          placeholder="请输入城市"
                          value={addressForm.city}
                          disabled={!isOrderFormEditing}
                          onChange={(event) => updateAddressField('city', event.target.value)}
                        />
                      </FormRow>
                      <FormRow label="州">
                        <input
                          className={fieldClass}
                          placeholder="请输入州"
                          value={addressForm.state}
                          disabled={!isOrderFormEditing}
                          onChange={(event) => updateAddressField('state', event.target.value)}
                        />
                      </FormRow>
                      <FormRow label="公司">
                        <input
                          className={fieldClass}
                          placeholder="请输入公司"
                          value={addressForm.company}
                          disabled={!isOrderFormEditing}
                          onChange={(event) => updateAddressField('company', event.target.value)}
                        />
                      </FormRow>
                      <TextareaRow
                        label="地址详情"
                        placeholder="请输入地址详情"
                        limit={`${addressForm.addressDetail.length}/100`}
                        requiredMark
                        value={addressForm.addressDetail}
                        disabled={!isOrderFormEditing}
                        onChange={(value) => updateAddressField('addressDetail', value)}
                      />
                      <FormRow label='预约发货时间' requiredMark>
                        <input
                          type='datetime-local'
                          className={fieldClass}
                          required
                          value={addressForm.scheduledShippingTime}
                          disabled={!isOrderFormEditing}
                          onChange={(event) => updateAddressField('scheduledShippingTime', event.target.value)}
                        />
                      </FormRow>
                      <FormRow label="派送方式" requiredMark>
                        <select
                          className={fieldClass}
                          required
                          value={addressForm.deliveryMethod}
                          disabled={!isOrderFormEditing}
                          onChange={(event) => updateAddressField('deliveryMethod', event.target.value)}
                        >
                          <option value="">请选择派送方式</option>
                          {overseasDeliveryMethods.map((method) => (
                            <option key={method} value={method}>{method}</option>
                          ))}
                        </select>
                      </FormRow>
                      <TextareaRow
                        label="客户备注"
                        placeholder="请输入客户备注"
                        limit={`${addressForm.remark.length}/500`}
                        value={addressForm.remark}
                        disabled={!isOrderFormEditing}
                        onChange={(value) => updateAddressField('remark', value)}
                      />
                      <TextareaRow
                        label="海外仓备注"
                        placeholder="请输入海外仓备注"
                        limit={`${addressForm.overseasWarehouseRemark.length}/500`}
                        value={addressForm.overseasWarehouseRemark}
                        disabled={!isOrderFormEditing}
                        onChange={(value) => updateAddressField('overseasWarehouseRemark', value)}
                      />
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
                                handleAddressAttachmentFileChange(event.target.files?.[0]);
                                event.currentTarget.value = '';
                              }}
                            />
                          </label>
                          {activeAddressAttachments.length > 0 ? (
                            <div className="mt-3 flex items-center gap-2 rounded border border-slate-200 bg-slate-50 px-3 py-2">
                              <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                              <span className="min-w-0 flex-1 truncate">{activeAddressAttachments[0].name}</span>
                              <span className="text-slate-400">{activeAddressAttachments[0].fileSize}</span>
                              <button type="button" onClick={() => downloadAttachment(activeAddressAttachments[0])} className="font-bold text-[#004bb1] hover:underline">下载</button>
                              <button type="button" onClick={removeAddressAttachment} className="font-bold text-red-500 hover:underline">删除</button>
                            </div>
                          ) : (
                            <div className="mt-3 text-[11px] text-slate-400">暂未上传附件</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </section>

                </>
              ) : (
                <>
                  <section className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-slate-950 shadow-sm">
                    <h3 className="mb-7 text-sm font-bold text-slate-950">基础信息</h3>
                    <div className="grid grid-cols-[1.2fr_0.9fr_0.9fr_1.15fr] gap-x-16 gap-y-6">
                      <DetailField label="海外仓运单号" highlight>{getOverseasWaybillNo(activeOrder)}</DetailField>
                      <DetailField label="客户简称">{activeOrder.customerName}</DetailField>
                      <DetailField label="目的地">{activeOrder.destination}</DetailField>
                      <DetailField label="下单类型">{activeOrder.orderType || '-'}</DetailField>
                      <DetailField label="仓库代码">{activeOrder.warehouseCode || '-'}</DetailField>
                      <DetailField label="FBA单号">{activeOrder.fbaCode}</DetailField>
                      <DetailField label="入仓号">{activeOrder.inboundNo || '-'}</DetailField>
                      <DetailField label="Shipment ID">{activeOrder.shipmentId || '-'}</DetailField>
                      <DetailField label="Reference ID">{activeOrder.referenceId || '-'}</DetailField>
                      <DetailField label="核销状态"><ReconciliationStatusBadge status={getReconciliationStatus(activeOrder)} /></DetailField>
                      {(activeOrder.status === '已确认' || activeOrder.status === '已下单') && (
                        <DetailField label="是否到达海外仓"><OverseasWarehouseArrivalBadge status={getOverseasWarehouseArrivalStatus(activeOrder)} /></DetailField>
                      )}
                      <DetailField label="柜号">{activeOrder.containerNo || '-'}</DetailField>
                      <DetailField label="提单号">{activeOrder.billOfLadingNo || '-'}</DetailField>
                      <DetailField label="发货件数">{activeOrder.packages}</DetailField>
                      <DetailField label="收费重">{activeOrder.weight.replace('kg', '')}kg</DetailField>
                      <DetailField label="实重">{activeOrder.weight.replace('kg', '')}kg</DetailField>
                      <DetailField label="材积重">{activeOrder.weight.replace('kg', '')}kg</DetailField>
                      <DetailField label="方数">{activeOrder.volume}</DetailField>
                      <DetailField label="转单号">{activeOrder.transferNo || '-'}</DetailField>
                      <DetailField label="头程运单号">{activeOrder.id}</DetailField>
                      <DetailField label="子单创建时间">{activeOrder.childCreatedAt || '-'}</DetailField>
                      <DetailField label="邮编">{activeOrder.zipCode || '-'}</DetailField>
                      <DetailField label="邮箱">customer@tiantu.com</DetailField>
                      <DetailField label="入仓时间">{activeOrder.inboundTime}</DetailField>
                      <DetailField label="业务员">{activeOrder.salesman || '-'}</DetailField>
                      <DetailField label="跟单员">{activeOrder.merchandiser || '-'}</DetailField>
                      {canEditOrderRemarks ? (
                        <>
                          <div className={`flex min-w-0 items-start text-xs leading-5 ${isEditingOrderRemarks && editingRemarkField === 'customerRemark' ? 'col-span-2' : ''}`}>
                            <span className="shrink-0 font-bold text-slate-950">客户备注：</span>
                            <div className="min-w-0 flex-1">
                              {isEditingOrderRemarks && editingRemarkField === 'customerRemark' ? (
                                <>
                                  <textarea
                                    value={remarkDraft?.customerRemark || ''}
                                    maxLength={500}
                                    rows={3}
                                    placeholder="请输入客户备注"
                                    onChange={(event) => setRemarkDraft((prev) => (prev ? { ...prev, customerRemark: event.target.value } : prev))}
                                    className="w-full resize-y rounded border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800 outline-none focus:border-[#004bb1] focus:ring-1 focus:ring-[#004bb1]"
                                  />
                                  <div className="mt-1.5 flex items-center gap-2">
                                    <button type="button" onClick={() => saveOrderRemark('customerRemark')} className="rounded bg-[#004bb1] px-3 py-1 text-xs font-bold text-white hover:bg-[#003b91]">保存</button>
                                    <button type="button" onClick={cancelOrderRemarksEdit} className="text-xs font-semibold text-slate-500 hover:text-slate-700">取消</button>
                                  </div>
                                </>
                              ) : (
                                <span className="break-words text-slate-950">
                                  {activeOrder.customerRemark || '-'}
                                  <button type="button" onClick={() => startOrderRemarkEdit('customerRemark')} className="ml-2 font-semibold text-[#1677ff] hover:underline">修改</button>
                                </span>
                              )}
                            </div>
                          </div>
                          <div className={`flex min-w-0 items-start text-xs leading-5 ${isEditingOrderRemarks && editingRemarkField === 'overseasWarehouseRemark' ? 'col-span-2' : ''}`}>
                            <span className="shrink-0 font-bold text-slate-950">海外仓备注：</span>
                            <div className="min-w-0 flex-1">
                              {isEditingOrderRemarks && editingRemarkField === 'overseasWarehouseRemark' ? (
                                <>
                                  <textarea
                                    value={remarkDraft?.overseasWarehouseRemark || ''}
                                    maxLength={500}
                                    rows={3}
                                    placeholder="请输入海外仓备注"
                                    onChange={(event) => setRemarkDraft((prev) => (prev ? { ...prev, overseasWarehouseRemark: event.target.value } : prev))}
                                    className="w-full resize-y rounded border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800 outline-none focus:border-[#004bb1] focus:ring-1 focus:ring-[#004bb1]"
                                  />
                                  <div className="mt-1.5 flex items-center gap-2">
                                    <button type="button" onClick={() => saveOrderRemark('overseasWarehouseRemark')} className="rounded bg-[#004bb1] px-3 py-1 text-xs font-bold text-white hover:bg-[#003b91]">保存</button>
                                    <button type="button" onClick={cancelOrderRemarksEdit} className="text-xs font-semibold text-slate-500 hover:text-slate-700">取消</button>
                                  </div>
                                </>
                              ) : (
                                <span className="break-words text-slate-950">
                                  {activeOrder.overseasWarehouseRemark || '-'}
                                  <button type="button" onClick={() => startOrderRemarkEdit('overseasWarehouseRemark')} className="ml-2 font-semibold text-[#1677ff] hover:underline">修改</button>
                                </span>
                              )}
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <DetailField label="客户备注">{activeOrder.customerRemark || '-'}</DetailField>
                          <DetailField label="海外仓备注">{activeOrder.overseasWarehouseRemark || '-'}</DetailField>
                        </>
                      )}
                    </div>
                  </section>

                  <div className="mt-2 flex items-center gap-10 border-b border-slate-200 bg-white px-4 text-sm font-bold">
                    {downstreamDetailTabs.map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setDownstreamDetailTab(tab)}
                        className={`relative min-w-20 px-2 py-4 text-center ${
                          downstreamDetailTab === tab ? 'text-[#004bb1]' : 'text-slate-600 hover:text-[#004bb1]'
                        }`}
                      >
                        {tab}
                        {downstreamDetailTab === tab && <span className="absolute inset-x-0 bottom-[-1px] h-0.5 bg-[#004bb1]" />}
                      </button>
                    ))}
                  </div>

                  <div className="mt-2 min-h-[300px]">
                    {downstreamDetailTab === '费用信息' && (
                      <section className="rounded-md bg-white p-4 shadow-sm">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                          <h3 className="text-sm font-bold text-slate-950">费用信息</h3>
                          {canEditQuoteFees && (
                            <button
                              type="button"
                              onClick={() => openFeeSelector(activeOrder.status === '已确认' ? 'instruction' : 'quote')}
                              className="rounded border border-slate-300 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              新增
                            </button>
                          )}
                        </div>
                        <div className="overflow-x-auto border border-slate-200">
                          <table className="w-full min-w-[980px] table-fixed border-collapse text-[11px]">
                            <thead className="bg-slate-50 text-slate-600">
                              <tr>
                                {['费用名称', '单价', '币种', '汇率', '单位', '数量', '金额', '添加时间', '添加人', '操作'].map((head) => (
                                  <th key={head} className="border border-slate-200 px-3 py-2 text-left font-semibold">
                                    {head}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {activeQuoteRows.length > 0 ? (
                                activeQuoteRows.map((row) => (
                                  <tr key={row.code} className="h-10 text-slate-700 odd:bg-white even:bg-slate-50/70">
                                    <td className="border border-slate-200 px-3">{row.name}</td>
                                    <td className="border border-slate-200 px-3">{row.price}</td>
                                    <td className="border border-slate-200 px-3">{row.currency}</td>
                                    <td className="border border-slate-200 px-3">{row.exchangeRate}</td>
                                    <td className="border border-slate-200 px-3">{row.unit}</td>
                                    <td className="border border-slate-200 px-3">{row.quantity}</td>
                                    <td className="border border-slate-200 px-3 font-semibold text-slate-900">{row.amount}</td>
                                    <td className="border border-slate-200 px-3 font-mono text-slate-500">{row.addedAt}</td>
                                    <td className="border border-slate-200 px-3">{row.addedBy}</td>
                                    <td className="border border-slate-200 px-3">
                                      {canEditQuoteFees ? (
                                        <>
                                          <button
                                            type="button"
                                            onClick={() => setEditingQuoteFee(row)}
                                            className="mr-3 font-bold text-[#004bb1] hover:underline"
                                          >
                                            编辑
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setDeletingQuoteFee(row)}
                                            className="font-bold text-red-500 hover:underline"
                                          >
                                            删除
                                          </button>
                                        </>
                                      ) : (
                                        <span className="text-slate-300">-</span>
                                      )}
                                    </td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan={10} className="h-24 border border-slate-200 text-center text-slate-300">
                                    <FileText className="mx-auto mb-2 h-8 w-8 text-slate-200" />
                                    暂无数据
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </section>
                    )}

                    {downstreamDetailTab === '货箱信息' && (
                      <section className="rounded-md bg-white p-4 shadow-sm">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                          <h3 className="text-sm font-bold text-slate-950">货箱信息</h3>
                          <button
                            type="button"
                            onClick={() => openTransferPanel(activeOrder)}
                            className="rounded border border-slate-300 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            转单号
                          </button>
                        </div>

                        <div className="overflow-x-auto border border-slate-200">
                          <table className="w-full min-w-[1120px] table-fixed border-collapse text-[11px]">
                            <thead className="bg-slate-50 text-slate-700">
                              <tr>
                                <th className="w-10 border border-slate-200 px-2 py-2 text-center">
                                  <input type="checkbox" readOnly disabled className="h-3.5 w-3.5 rounded border-slate-300 disabled:opacity-60" />
                                </th>
                                <th className="w-44 border border-slate-200 px-3 py-2 text-left">货箱号</th>
                                <th className="w-32 border border-slate-200 px-3 py-2 text-left">客户数据</th>
                                <th className="w-36 border border-slate-200 px-3 py-2 text-left">系统拣货（材重/实重）</th>
                                <th className="w-32 border border-slate-200 px-3 py-2 text-left">承运商</th>
                                <th className="w-24 border border-slate-200 px-3 py-2 text-left">快递标</th>
                                <th className="w-40 border border-slate-200 px-3 py-2 text-left">仓库回填转单号</th>
                                <th className="w-28 border border-slate-200 px-3 py-2 text-left">17网状态</th>
                                <th className="w-28 border border-slate-200 px-3 py-2 text-left">状态</th>
                              </tr>
                            </thead>
                            <tbody>
                              {getTransitCargoBoxRows(activeOrder).map((row) => (
                                <tr key={row.boxNo} className="h-20 text-slate-700">
                                  <td className="border border-slate-200 px-2 py-2 text-center align-middle">
                                    <input type="checkbox" readOnly disabled className="h-3.5 w-3.5 rounded border-slate-300 disabled:opacity-60" />
                                  </td>
                                  <td className="border border-slate-200 px-3 py-2 align-middle font-mono">
                                    <div>{row.boxNo}</div>
                                    <div className="mt-1 text-slate-500">{row.customerTracking}</div>
                                  </td>
                                  <td className="border border-slate-200 px-3 py-2 align-middle">
                                    {row.customerData.map((item) => (
                                      <div key={item}>{item}</div>
                                    ))}
                                  </td>
                                  <td className="border border-slate-200 px-3 py-2 align-middle">
                                    {row.systemWeight.map((item) => (
                                      <div key={item}>{item}</div>
                                    ))}
                                  </td>
                                  <td className="border border-slate-200 px-3 py-2 align-middle">
                                    <div>{row.carrier || '-'}</div>
                                    {row.transferNo && <div className="mt-1 font-mono text-slate-500">{row.transferNo}</div>}
                                  </td>
                                  <td className="border border-slate-200 px-3 py-2 align-middle text-slate-400">-</td>
                                  <td className="border border-slate-200 px-3 py-2 align-middle font-mono">{row.warehouseReturnNo}</td>
                                  <td className="border border-slate-200 px-3 py-2 align-middle">{row.networkStatus}</td>
                                  <td className="border border-slate-200 px-3 py-2 align-middle text-slate-500">{row.status}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </section>
                    )}

                    {downstreamDetailTab === '运踪信息' && (
                      <section className="rounded-md bg-white p-4 shadow-sm">
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <h3 className="text-sm font-bold text-slate-950">运踪节点信息</h3>
                            <p className="mt-1 text-[11px] text-slate-500">支持客户手动补充和更新运踪节点，更新后同步记录操作日志。</p>
                          </div>
                          <button
                            type="button"
                            onClick={openTrackingModal}
                            className="rounded bg-[#004bb1] px-4 py-1.5 text-xs font-bold text-white hover:bg-[#003b91]"
                          >
                            新增运踪
                          </button>
                        </div>

                        <div className="mb-4 flex items-center justify-between rounded bg-blue-50 px-4 py-2 text-xs">
                          <span className="rounded bg-blue-600 px-3 py-1 font-bold text-white">
                            预计送达时间：{activeOrder.childCreatedAt || activeOrder.inboundTime}
                          </span>
                          <span className="text-slate-500">共 {activeTrackingRows.length} 条运踪</span>
                        </div>

                        <div className="rounded border border-slate-200 bg-white px-6 py-4">
                          {activeTrackingRows.length > 0 ? (
                            <div className="relative ml-5 border-l border-slate-200">
                              {activeTrackingRows.map((event, index) => {
                                const isLatest = index === activeTrackingRows.length - 1;
                                return (
                                  <div key={event.id} className="relative pb-7 pl-8 last:pb-1">
                                    <span
                                      className={`absolute -left-[7px] top-1 h-3 w-3 rounded-full border-2 border-white ${
                                        isLatest ? 'bg-red-500' : 'bg-blue-600'
                                      }`}
                                    />
                                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs">
                                      <span className="font-bold text-slate-900">{event.source}</span>
                                      <span className="font-mono text-slate-500">{event.occurredAt}</span>
                                      <span className={`font-bold ${
                                        isLatest ? 'text-red-600' : 'text-slate-700'
                                      }`}>{event.status}</span>
                                    </div>
                                    <div className="mt-2 text-sm font-semibold text-slate-800">{event.description}</div>
                                    <div className="mt-1 text-xs text-slate-500">地点：{event.location || '-'}</div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="py-14 text-center text-xs text-slate-400">暂无运踪节点</div>
                          )}
                        </div>
                      </section>
                    )}
                    {downstreamDetailTab === '其它信息' && (
                      <section className="rounded-md bg-white p-4 shadow-sm">
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
                              {activeAttachmentRows.length > 0 ? (
                                activeAttachmentRows.map((row) => (
                                  <tr key={row.id} className="h-10 text-slate-700 odd:bg-white even:bg-slate-50/70">
                                    <td className="border border-slate-200 px-3">{row.name}</td>
                                    <td className="border border-slate-200 px-3">{row.type}</td>
                                    <td className="border border-slate-200 px-3">{row.customerVisible}</td>
                                    <td className="border border-slate-200 px-3">{row.fileSize}</td>
                                    <td className="border border-slate-200 px-3">{row.uploadedBy}</td>
                                    <td className="border border-slate-200 px-3 font-mono text-slate-500">{row.uploadedAt}</td>
                                    <td className="border border-slate-200 px-3">
                                      <button
                                        type="button"
                                        onClick={() => openAttachmentModal(row)}
                                        className="mr-3 font-bold text-[#004bb1] hover:underline"
                                      >
                                        编辑
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => downloadAttachment(row)}
                                        className="mr-3 font-bold text-[#004bb1] hover:underline"
                                      >
                                        下载
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setDeletingAttachment(row)}
                                        className="font-bold text-red-500 hover:underline"
                                      >
                                        删除
                                      </button>
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
                </>
              )}

              {usesOrderFormTemplate(activeOrder.status) && (
                <section className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-4">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-950">货箱信息</h3>
                    <div className="text-xs font-bold text-orange-500">
                      申报币种：USD · 总申报价值：0
                    </div>
                  </div>

                  <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-700">
                    <span className="font-bold text-slate-900">
                      <span className="text-red-500">*</span>材质
                    </span>
                    {cargoMaterialOptions.map((item) => (
                      <label key={item} className="inline-flex items-center gap-1.5 whitespace-nowrap">
                        <input
                          type="checkbox"
                          readOnly
                          checked={cargoMaterialChecked.has(item)} disabled
                          className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600"
                        />
                        <span>{item}</span>
                      </label>
                    ))}
                  </div>

                  <div className="overflow-x-auto border border-slate-200">
                    <table className="w-full min-w-[2480px] table-fixed border-collapse text-[11px] text-slate-700">
                      <thead className="bg-slate-50 text-slate-700">
                        <tr>
                          <th className="w-12 border border-slate-200 px-2 py-2 text-center">#</th>
                          <th className="w-12 border border-slate-200 px-2 py-2 text-center">
                            <input type="checkbox" readOnly disabled className="h-3.5 w-3.5 rounded border-slate-300 disabled:opacity-60" />
                          </th>
                          <th className="w-52 border border-slate-200 px-3 py-2 text-center">FBA/IBR箱号</th>
                          <th className="w-36 border border-slate-200 px-3 py-2 text-center">PO Number</th>
                          <th className="w-48 border border-slate-200 px-3 py-2 text-center">产品英文名</th>
                          <th className="w-48 border border-slate-200 px-3 py-2 text-center">产品中文名</th>
                          <th className="w-32 border border-slate-200 px-3 py-2 text-center">产品申报单价</th>
                          <th className="w-32 border border-slate-200 px-3 py-2 text-center">产品申报数量</th>
                          <th className="w-32 border border-slate-200 px-3 py-2 text-center">产品申报总价</th>
                          <th className="w-32 border border-slate-200 px-3 py-2 text-center">产品材质</th>
                          <th className="w-36 border border-slate-200 px-3 py-2 text-center">产品海关编码</th>
                          <th className="w-40 border border-slate-200 px-3 py-2 text-center">产品用途</th>
                          <th className="w-36 border border-slate-200 px-3 py-2 text-center">产品品牌</th>
                          <th className="w-36 border border-slate-200 px-3 py-2 text-center">产品型号</th>
                          <th className="w-44 border border-slate-200 px-3 py-2 text-center">产品图片链接</th>
                          <th className="w-44 border border-slate-200 px-3 py-2 text-center">产品销售链接</th>
                          <th className="w-32 border border-slate-200 px-3 py-2 text-center">货箱重量(KG)</th>
                          <th className="w-32 border border-slate-200 px-3 py-2 text-center">货箱长度(CM)</th>
                          <th className="w-32 border border-slate-200 px-3 py-2 text-center">货箱宽度(CM)</th>
                          <th className="w-32 border border-slate-200 px-3 py-2 text-center">货箱高度(CM)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from({ length: 12 }).map((_, index) => {
                          const row = getCargoInfoRowsForOrder(activeOrder)[index];
                          return (
                            <tr key={index} className="h-8">
                              <td className="border border-slate-200 px-2 text-center text-slate-500">{index + 1}</td>
                              <td className="border border-slate-200 px-2 text-center">
                                <input type="checkbox" readOnly disabled className="h-3.5 w-3.5 rounded border-slate-300 disabled:opacity-60" />
                              </td>
                              <td className="border border-slate-200 px-3 text-center font-mono">{row?.boxNo || ''}</td>
                              <td className="border border-slate-200 px-3 text-center">{row?.poNumber || ''}</td>
                              <td className="border border-slate-200 px-3 text-center">{row?.englishName || ''}</td>
                              <td className="border border-slate-200 px-3 text-center">{row?.chineseName || ''}</td>
                              <td className="border border-slate-200 px-3 text-center">{row?.declaredPrice || ''}</td>
                              <td className="border border-slate-200 px-3 text-center">{row?.declaredQty || ''}</td>
                              <td className="border border-slate-200 px-3 text-center">{row?.declaredTotal || ''}</td>
                              <td className="border border-slate-200 px-3 text-center">{row?.material || ''}</td>
                              <td className="border border-slate-200 px-3 text-center">{row?.hsCode || ''}</td>
                              <td className="border border-slate-200 px-3 text-center">{row?.usage || ''}</td>
                              <td className="border border-slate-200 px-3 text-center">{row?.brand || ''}</td>
                              <td className="border border-slate-200 px-3 text-center">{row?.model || ''}</td>
                              <td className="truncate border border-slate-200 px-3 text-center text-blue-600">{row?.imageUrl || ''}</td>
                              <td className="truncate border border-slate-200 px-3 text-center text-blue-600">{row?.salesUrl || ''}</td>
                              <td className="border border-slate-200 px-3 text-center">{row?.boxWeight || ''}</td>
                              <td className="border border-slate-200 px-3 text-center">{row?.boxLength || ''}</td>
                              <td className="border border-slate-200 px-3 text-center">{row?.boxWidth || ''}</td>
                              <td className="border border-slate-200 px-3 text-center">{row?.boxHeight || ''}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {usesOrderFormTemplate(activeOrder.status) && (
              <section className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-4">
                <h3 className="mb-4 pl-3 text-sm font-bold text-slate-950">操作指令</h3>
                  <button
                    type="button"
                    onClick={() => openFeeSelector('instruction')}
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
                    {activeInstructionRows.length > 0 ? (
                      activeInstructionRows.map((row) => (
                        <tr key={row.code} className="h-9 text-slate-700">
                          <td className="border border-slate-200 px-3 text-center">{row.name}</td>
                          <td className="border border-slate-200 px-3 text-center">{row.type}</td>
                          <td className="border border-slate-200 px-3 text-center">{row.unit}</td>
                          <td className="border border-slate-200 px-3 text-center">{row.price}</td>
                          <td className="border border-slate-200 px-3 text-center">{row.quantity || '1'}</td>
                          <td className="border border-slate-200 px-3 text-center">{row.currency}</td>
                          <td className="border border-slate-200 px-3 text-center">{formatInstructionFeeAmount(parseFeeNumber(row.price) * (row.quantity?.trim() ? parseFeeNumber(row.quantity) : 1))}</td>
                          <td className="border border-slate-200 px-3 text-center">{row.addedAt || '-'}</td>
                          <td className="border border-slate-200 px-3 text-center">{row.addedBy || '-'}</td>
                          <td className="border border-slate-200 px-3 text-center">{row.description}</td>
                          <td className="border border-slate-200 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => setEditingInstruction(row)}
                              className="mr-3 font-semibold text-blue-600 hover:underline"
                            >
                              编辑
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingInstruction(row)}
                              className="font-semibold text-red-500 hover:underline"
                            >
                              删除
                            </button>
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
              {showInstructionModal && (
                <div className="absolute inset-0 z-[90] bg-black/50">
                  <div className="absolute right-0 top-0 flex h-full w-[72vw] min-w-[980px] flex-col bg-white shadow-2xl">
                    <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 px-8">
                      <h3 className="text-sm font-bold text-slate-950">{feeModalTarget === 'quote' ? '添加报价费用明细' : '添加指令'}</h3>
                      <button
                        type="button"
                        onClick={() => setShowInstructionModal(false)}
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
                          <button className="h-8 rounded bg-blue-600 px-8 text-xs font-bold text-white hover:bg-blue-700" type="button">
                            搜索
                          </button>
                          <button className="h-8 rounded border border-slate-300 bg-white px-8 text-xs font-semibold text-slate-700 hover:bg-slate-50" type="button">
                            重置
                          </button>
                        </div>

                        <table className="w-full table-fixed border-collapse text-xs">
                          <thead className="bg-slate-50 text-slate-900">
                            <tr>
                              <th className="w-12 border border-slate-200 px-2 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={selectedFeeCodes.length === instructionFeeRows.length}
                                  onChange={(event) => setSelectedFeeCodes(event.target.checked ? instructionFeeRows.map((row) => row.code) : [])}
                                  className="h-3.5 w-3.5 rounded border-slate-300"
                                />
                              </th>
                              {['费用代码', '费用名称', '费用类型', '计费单位', '计费单价', '币种', '描述'].map((head) => (
                                <th key={head} className="border border-slate-200 px-3 py-2 text-center font-bold">
                                  {head}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {Array.from({ length: 18 }).map((_, index) => {
                              const row = instructionFeeRows[index];
                              const isSelectedFee = !!row && selectedFeeCodes.includes(row.code);
                              return (
                                <tr key={index} className={`h-8 ${index % 2 === 1 ? 'bg-slate-50' : 'bg-white'}`}>
                                  <td className="border border-slate-200 px-2 text-center">
                                    <input
                                      type="checkbox"
                                      disabled={!row}
                                      checked={isSelectedFee}
                                      onChange={() => row && toggleFeeCode(row.code)}
                                      className="h-3.5 w-3.5 rounded border-slate-300"
                                    />
                                  </td>
                                  <td className="border border-slate-200 px-3 text-center font-mono">{row?.code || ''}</td>
                                  <td className="border border-slate-200 px-3 text-center">{row?.name || ''}</td>
                                  <td className="border border-slate-200 px-3 text-center">{row?.type || ''}</td>
                                  <td className="border border-slate-200 px-3 text-center">{row?.unit || ''}</td>
                                  <td className="border border-slate-200 px-3 text-center">{row?.price || ''}</td>
                                  <td className="border border-slate-200 px-3 text-center">{row?.currency || ''}</td>
                                  <td className="border border-slate-200 px-3 text-center">{row?.description || ''}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>

                        <div className="mt-4 flex items-center justify-between text-xs text-slate-600">
                          <span>已选中{selectedFeeCodes.length}条</span>
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
                        onClick={confirmInstructionFees}
                        className="rounded bg-blue-600 px-8 py-1.5 text-xs font-bold text-white hover:bg-blue-700"
                      >
                        确认
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowInstructionModal(false)}
                        className="rounded border border-slate-300 bg-white px-8 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {editingInstruction && (
                <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/50">
                  <div className="w-[520px] bg-white shadow-2xl">
                    <div className="border-b border-slate-200 px-5 py-4">
                      <h3 className="text-sm font-bold text-slate-950">编辑费用项</h3>
                    </div>
                    <div className="space-y-4 px-12 py-6 text-xs">
                      <FormRow label="费用代码" requiredMark>
                        <input className={`${fieldClass} bg-slate-100`} value={editingInstruction.code} readOnly />
                      </FormRow>
                      <FormRow label="费用名称" requiredMark>
                        <input className={`${fieldClass} bg-slate-100`} value={editingInstruction.name} readOnly />
                      </FormRow>
                      <FormRow label="费用类型" requiredMark>
                        <select
                          className={fieldClass}
                          value={editingInstruction.type}
                          onChange={(event) => setEditingInstruction({ ...editingInstruction, type: event.target.value })}
                        >
                          <option>仓储费</option>
                          <option>操作费</option>
                        </select>
                      </FormRow>
                      <FormRow label="计费单位" requiredMark>
                        <select
                          className={fieldClass}
                          value={editingInstruction.unit}
                          onChange={(event) => setEditingInstruction({ ...editingInstruction, unit: event.target.value })}
                        >
                          <option>票</option>
                          <option>箱</option>
                          <option>KG</option>
                        </select>
                      </FormRow>
                      <FormRow label="计费单价" requiredMark>
                        <input
                          className={fieldClass}
                          value={editingInstruction.price}
                          onChange={(event) => setEditingInstruction({ ...editingInstruction, price: event.target.value })}
                        />
                      </FormRow>
                      <FormRow label="计费数量" requiredMark>
                        <input
                          className={fieldClass}
                          value={editingInstruction.quantity || '1'}
                          onChange={(event) => setEditingInstruction({ ...editingInstruction, quantity: event.target.value })}
                        />
                      </FormRow>
                      <FormRow label="币种" requiredMark>
                        <select
                          className={fieldClass}
                          value={editingInstruction.currency}
                          onChange={(event) => setEditingInstruction({ ...editingInstruction, currency: event.target.value })}
                        >
                          <option>人民币</option>
                          <option>USD</option>
                        </select>
                      </FormRow>
                    </div>
                    <div className="flex justify-end gap-3 px-12 pb-8">
                      <button
                        type="button"
                        onClick={() => setEditingInstruction(null)}
                        className="rounded border border-slate-300 bg-white px-6 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        取消
                      </button>
                      <button
                        type="button"
                        onClick={saveEditingInstruction}
                        className="rounded bg-blue-600 px-6 py-1.5 text-xs font-bold text-white hover:bg-blue-700"
                      >
                        确定
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {deletingInstruction && (
                <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/50">
                  <div className="w-[460px] bg-white shadow-2xl">
                    <div className="border-b border-slate-200 px-5 py-4">
                      <h3 className="text-sm font-bold text-slate-950">删除费用项</h3>
                    </div>
                    <div className="px-10 py-8 text-center text-sm text-slate-800">
                      确定删除费用项“{deletingInstruction.name}”吗？
                    </div>
                    <div className="flex justify-end gap-3 px-8 pb-7">
                      <button
                        type="button"
                        onClick={() => setDeletingInstruction(null)}
                        className="rounded border border-slate-300 bg-white px-6 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        取消
                      </button>
                      <button
                        type="button"
                        onClick={confirmDeleteInstruction}
                        className="rounded bg-blue-600 px-6 py-1.5 text-xs font-bold text-white hover:bg-blue-700"
                      >
                        确定
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {editingQuoteFee && (
                <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/50">
                  <div className="w-[520px] bg-white shadow-2xl">
                    <div className="border-b border-slate-200 px-5 py-4">
                      <h3 className="text-sm font-bold text-slate-950">编辑报价费用明细</h3>
                    </div>
                    <div className="space-y-4 px-12 py-6 text-xs">
                      <FormRow label="费用代码" requiredMark>
                        <input className={`${fieldClass} bg-slate-100`} value={editingQuoteFee.code} readOnly />
                      </FormRow>
                      <FormRow label="费用名称" requiredMark>
                        <input className={`${fieldClass} bg-slate-100`} value={editingQuoteFee.name} readOnly />
                      </FormRow>
                      <FormRow label="费用类型" requiredMark>
                        <select
                          className={fieldClass}
                          value={editingQuoteFee.type}
                          onChange={(event) => setEditingQuoteFee({ ...editingQuoteFee, type: event.target.value })}
                        >
                          <option>仓储费</option>
                          <option>操作费</option>
                        </select>
                      </FormRow>
                      <FormRow label="计费单位" requiredMark>
                        <select
                          className={fieldClass}
                          value={editingQuoteFee.unit}
                          onChange={(event) => setEditingQuoteFee({ ...editingQuoteFee, unit: event.target.value })}
                        >
                          <option>票</option>
                          <option>箱</option>
                          <option>KG</option>
                          <option>哈哈</option>
                        </select>
                      </FormRow>
                      <FormRow label="计费单价" requiredMark>
                        <input
                          className={fieldClass}
                          value={editingQuoteFee.price}
                          onChange={(event) => setEditingQuoteFee({ ...editingQuoteFee, price: event.target.value })}
                        />
                      </FormRow>
                      <FormRow label="计费数量" requiredMark>
                        <input
                          className={fieldClass}
                          value={editingQuoteFee.quantity}
                          onChange={(event) => setEditingQuoteFee({ ...editingQuoteFee, quantity: event.target.value })}
                        />
                      </FormRow>
                      <FormRow label="币种" requiredMark>
                        <select
                          className={fieldClass}
                          value={editingQuoteFee.currency}
                          onChange={(event) => setEditingQuoteFee({ ...editingQuoteFee, currency: event.target.value, exchangeRate: getExchangeRate(event.target.value) })}
                        >
                          <option>人民币</option>
                          <option>美元</option>
                        </select>
                      </FormRow>
                      <FormRow label="汇率">
                        <input className={`${fieldClass} bg-slate-100`} value={getExchangeRate(editingQuoteFee.currency)} readOnly />
                      </FormRow>
                    </div>
                    <div className="flex justify-end gap-3 px-12 pb-8">
                      <button
                        type="button"
                        onClick={() => setEditingQuoteFee(null)}
                        className="rounded border border-slate-300 bg-white px-6 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        取消
                      </button>
                      <button
                        type="button"
                        onClick={saveEditingQuoteFee}
                        className="rounded bg-blue-600 px-6 py-1.5 text-xs font-bold text-white hover:bg-blue-700"
                      >
                        确定
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {deletingQuoteFee && (
                <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/50">
                  <div className="w-[460px] bg-white shadow-2xl">
                    <div className="border-b border-slate-200 px-5 py-4">
                      <h3 className="text-sm font-bold text-slate-950">删除报价费用明细</h3>
                    </div>
                    <div className="px-10 py-8 text-center text-sm text-slate-800">
                      确定删除报价费用“{deletingQuoteFee.name}”吗？
                    </div>
                    <div className="flex justify-end gap-3 px-8 pb-7">
                      <button
                        type="button"
                        onClick={() => setDeletingQuoteFee(null)}
                        className="rounded border border-slate-300 bg-white px-6 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        取消
                      </button>
                      <button
                        type="button"
                        onClick={confirmDeleteQuoteFee}
                        className="rounded bg-blue-600 px-6 py-1.5 text-xs font-bold text-white hover:bg-blue-700"
                      >
                        确定
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {showAttachmentModal && (
                <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/50">
                  <div className="w-[520px] bg-white shadow-2xl">
                    <div className="border-b border-slate-200 px-5 py-4">
                      <h3 className="text-sm font-bold text-slate-950">{editingAttachment ? '编辑附件' : '上传附件'}</h3>
                    </div>
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
                              onChange={(event) => handleAttachmentFileChange(event.target.files?.[0])}
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
                                onClick={() => setAttachmentForm((prev) => ({ ...prev, fileName: '', fileSize: '' }))}
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
                          className={`${fieldClass} min-w-0 flex-1`}
                          value={attachmentForm.type}
                          onChange={(event) => setAttachmentForm((prev) => ({ ...prev, type: event.target.value }))}
                        >
                          {attachmentTypeOptions.map((type) => (
                            <option key={type}>{type}</option>
                          ))}
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
                              name="attachmentCustomerVisible"
                              checked={attachmentForm.customerVisible === option}
                              onChange={() => setAttachmentForm((prev) => ({ ...prev, customerVisible: option }))}
                              className="h-3.5 w-3.5 text-blue-600"
                            />
                            <span>{option}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="flex justify-end gap-3 border-t border-slate-200 px-10 py-4">
                      <button
                        type="button"
                        onClick={() => {
                          setShowAttachmentModal(false);
                          setEditingAttachment(null);
                          setAttachmentForm(emptyAttachmentForm);
                        }}
                        className="rounded border border-slate-300 bg-white px-7 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        取消
                      </button>
                      <button
                        type="button"
                        onClick={saveAttachment}
                        className="rounded bg-blue-600 px-7 py-1.5 text-xs font-bold text-white hover:bg-blue-700"
                      >
                        确定
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {deletingAttachment && (
                <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/50">
                  <div className="w-[460px] bg-white shadow-2xl">
                    <div className="border-b border-slate-200 px-5 py-4">
                      <h3 className="text-sm font-bold text-slate-950">删除附件</h3>
                    </div>
                    <div className="px-10 py-8 text-center text-sm text-slate-800">
                      确定删除附件“{deletingAttachment.name}”吗？
                    </div>
                    <div className="flex justify-end gap-3 px-8 pb-7">
                      <button
                        type="button"
                        onClick={() => setDeletingAttachment(null)}
                        className="rounded border border-slate-300 bg-white px-6 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        取消
                      </button>
                      <button
                        type="button"
                        onClick={confirmDeleteAttachment}
                        className="rounded bg-blue-600 px-6 py-1.5 text-xs font-bold text-white hover:bg-blue-700"
                      >
                        确定
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {showTrackingModal && activeOrder && (
                <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/50">
                  <div className="w-[560px] rounded bg-white shadow-2xl">
                    <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                      <div>
                        <h3 className="text-sm font-bold text-slate-950">新增运踪</h3>
                        <p className="mt-1 text-[11px] text-slate-500">{getOverseasWaybillNo(activeOrder)}</p>
                      </div>
                      <button type="button" onClick={closeTrackingModal} className="rounded p-1 text-slate-500 hover:bg-slate-100" aria-label="关闭新增运踪">
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="space-y-4 px-8 py-6 text-xs">
                      <FormRow label="运踪时间" requiredMark>
                        <input
                          className={fieldClass}
                          value={trackingForm.occurredAt}
                          onChange={(event) => setTrackingForm((prev) => ({ ...prev, occurredAt: event.target.value }))}
                          placeholder="YYYY-MM-DD HH:mm:ss"
                        />
                      </FormRow>
                      <FormRow label="运踪节点" requiredMark>
                        <select
                          className={fieldClass}
                          value={trackingForm.status}
                          onChange={(event) => setTrackingForm((prev) => ({ ...prev, status: event.target.value }))}
                        >
                          {trackingStatusOptions.map((status) => (
                            <option key={status}>{status}</option>
                          ))}
                        </select>
                      </FormRow>
                      <FormRow label="地点">
                        <input
                          className={fieldClass}
                          value={trackingForm.location}
                          onChange={(event) => setTrackingForm((prev) => ({ ...prev, location: event.target.value }))}
                          placeholder="请输入运输地点"
                        />
                      </FormRow>
                      <div className="flex items-start gap-3">
                        <span className={`${labelClass} pt-2`}>
                          <span className="mr-0.5 text-red-500">*</span>
                          运踪描述：
                        </span>
                        <textarea
                          className="min-h-20 min-w-0 flex-1 resize-y rounded border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          value={trackingForm.description}
                          onChange={(event) => setTrackingForm((prev) => ({ ...prev, description: event.target.value }))}
                          placeholder="请输入本次运踪节点描述"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 border-t border-slate-200 px-8 py-4">
                      <button
                        type="button"
                        onClick={closeTrackingModal}
                        className="rounded border border-slate-300 bg-white px-7 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        取消
                      </button>
                      <button
                        type="button"
                        onClick={saveTrackingEvent}
                        className="rounded bg-blue-600 px-7 py-1.5 text-xs font-bold text-white hover:bg-blue-700"
                      >
                        保存
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {transferPanelOpen && activeOrder && (
                <div className="absolute right-0 top-0 z-[95] h-full w-[31vw] min-w-[560px] max-w-[680px] overflow-hidden bg-white shadow-2xl">
                  <div className="flex h-10 items-center border-b border-slate-200 bg-white px-4">
                    <span className="mr-2 h-5 w-1 rounded bg-slate-900" />
                    <h3 className="text-[15px] font-bold text-slate-900">转单号</h3>
                  </div>

                  <div className="relative h-[calc(100%-40px)] bg-white px-5 py-4">
                    <div className="pointer-events-none absolute inset-0 select-none overflow-hidden text-[12px] font-semibold text-slate-200/70">
                      {Array.from({ length: 24 }, (_, index) => (
                        <span
                          key={index}
                          className="absolute -rotate-[22deg] whitespace-nowrap"
                          style={{
                            left: `${(index % 3) * 34 + 11}%`,
                            top: `${Math.floor(index / 3) * 14 + 7}%`,
                          }}
                        >
                          管理员2026-06-29
                        </span>
                      ))}
                    </div>

                    <div className="relative z-10 mb-3 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={saveTransferRows}
                        className="rounded bg-[#004bb1] px-8 py-1.5 text-xs font-bold text-white hover:bg-[#003b91]"
                      >
                        保存
                      </button>
                      <button
                        type="button"
                        onClick={() => setTransferPanelOpen(false)}
                        className="rounded border border-slate-300 bg-white px-8 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                      >
                        取消
                      </button>
                    </div>

                    <div className="relative z-10 overflow-hidden border border-slate-300 bg-white">
                      <table className="w-full table-fixed border-collapse text-[11px] text-slate-700">
                        <thead className="bg-slate-50 text-slate-600">
                          <tr>
                            <th className="w-10 border border-slate-300 px-2 py-2 text-center font-semibold"></th>
                            <th className="border border-slate-300 px-3 py-2 text-center font-semibold">系统箱号</th>
                            <th className="border border-slate-300 px-3 py-2 text-center font-semibold">FBA箱号</th>
                            <th className="border border-slate-300 px-3 py-2 text-center font-semibold">承运公司</th>
                            <th className="border border-slate-300 px-3 py-2 text-center font-semibold">转单号</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getTransferRows(activeOrder).map((row, index) => (
                            <tr key={`${row.systemBoxNo || 'empty'}-${index}`} className="h-7">
                              <td className="border border-slate-300 bg-slate-50 px-2 text-center font-mono text-slate-600">
                                {index + 1}
                              </td>
                              <td className="border border-slate-300 px-2">
                                <input
                                  readOnly
                                  value={row.systemBoxNo}
                                  className="h-6 w-full border-0 bg-transparent px-1 text-[11px] text-slate-700 outline-none"
                                />
                              </td>
                              <td className="border border-slate-300 px-2">
                                <input
                                  readOnly
                                  value={row.fbaBoxNo}
                                  className="h-6 w-full border-0 bg-transparent px-1 text-[11px] text-slate-700 outline-none"
                                />
                              </td>
                              <td className="border border-slate-300 px-2">
                                <input
                                  value={row.carrierCompany}
                                  onChange={(event) => updateTransferDraft(activeOrderKey, index, 'carrierCompany', event.target.value)}
                                  placeholder={row.systemBoxNo || row.fbaBoxNo ? '请输入' : ''}
                                  className="h-6 w-full border-0 bg-transparent px-1 text-[11px] text-slate-700 outline-none focus:bg-blue-50"
                                />
                              </td>
                              <td className="border border-slate-300 px-2">
                                <input
                                  value={row.transferNo}
                                  onChange={(event) => updateTransferDraft(activeOrderKey, index, 'transferNo', event.target.value)}
                                  placeholder={row.systemBoxNo || row.fbaBoxNo ? '请输入' : ''}
                                  className="h-6 w-full border-0 bg-transparent px-1 text-[11px] font-semibold text-slate-700 outline-none focus:bg-blue-50"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {expressWorkspaceRows.length > 0 && (
        <ExpressOrderCreationWorkspace
          rows={expressWorkspaceRows}
          records={expressRecordsByOrder}
          addToast={addToast}
          onCreate={createExpressOrders}
          onClose={() => setExpressOrderKeys([])}
        />
      )}

      {confirmedOrderSubmissionCheck && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45">
          <div className="w-[500px] rounded bg-white shadow-2xl">
            <div className="border-b border-slate-200 px-5 py-4">
              <h3 className="text-sm font-bold text-slate-950">
                {confirmedOrderSubmissionCheck === 'reconciliation' ? '存在待核销费用' : '货物尚未到达海外仓'}
              </h3>
            </div>
            <div className="px-8 py-7 text-sm leading-6 text-slate-700">
              {confirmedOrderSubmissionCheck === 'reconciliation'
                ? <>所选 {confirmedOrderSubmissionRows.length} 条运单中包含未核销或部分核销的指令费用。是否仍要下单？</>
                : <>所选 {confirmedOrderSubmissionRows.length} 条运单中有货物尚未到达海外仓。继续下单将进入下单流程，是否仍要下单？</>}
            </div>
            <div className="flex justify-end gap-3 px-8 pb-6">
              <button
                type="button"
                onClick={cancelConfirmedOrderSubmission}
                className="rounded border border-slate-300 bg-white px-6 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                暂不下单
              </button>
              <button
                type="button"
                onClick={continueConfirmedOrderSubmission}
                className="rounded bg-blue-600 px-6 py-1.5 text-xs font-bold text-white hover:bg-blue-700"
              >
                仍要下单
              </button>
            </div>
          </div>
        </div>
      )}

      {cancelConfirmOrderKeys.length > 0 && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45">
          <div className="w-[460px] rounded bg-white shadow-2xl">
            <div className="border-b border-slate-200 px-5 py-4">
              <h3 className="text-sm font-bold text-slate-950">取消下单确认</h3>
            </div>
            <div className="px-8 py-7 text-sm leading-6 text-slate-700">
              确认取消已选 {cancelConfirmRows.length} 条已确认子单吗？取消后状态将流转至取消，对应子单箱号会重新回到母单。
            </div>
            <div className="flex justify-end gap-3 px-8 pb-6">
              <button
                type="button"
                onClick={() => setCancelConfirmOrderKeys([])}
                className="rounded border border-slate-300 bg-white px-6 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                取消
              </button>
              <button
                type="button"
                onClick={confirmCancelConfirmedOrders}
                className="rounded bg-blue-600 px-6 py-1.5 text-xs font-bold text-white hover:bg-blue-700"
              >
                确认取消
              </button>
            </div>
          </div>
        </div>
      )}

      {rollbackConfirmOrderKeys.length > 0 && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45">
          <div className="w-[460px] rounded bg-white shadow-2xl">
            <div className="border-b border-slate-200 px-5 py-4">
              <h3 className="text-sm font-bold text-slate-950">回退确认</h3>
            </div>
            <div className="px-8 py-7 text-sm leading-6 text-slate-700">
              确认回退已选 {rollbackConfirmRows.length} 条已下单子单吗？回退后状态将流转至已确认。
            </div>
            <div className="flex justify-end gap-3 px-8 pb-6">
              <button
                type="button"
                onClick={() => setRollbackConfirmOrderKeys([])}
                className="rounded border border-slate-300 bg-white px-6 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                取消
              </button>
              <button
                type="button"
                onClick={confirmRollbackOrderedRows}
                className="rounded bg-blue-600 px-6 py-1.5 text-xs font-bold text-white hover:bg-blue-700"
              >
                确认回退
              </button>
            </div>
          </div>
        </div>
      )}
      {transitRollbackConfirmOrderKeys.length > 0 && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45">
          <div className="w-[460px] rounded bg-white shadow-2xl">
            <div className="border-b border-slate-200 px-5 py-4">
              <h3 className="text-sm font-bold text-slate-950">转运中回退确认</h3>
            </div>
            <div className="px-8 py-7 text-sm leading-6 text-slate-700">
              确认回退已选 {transitRollbackConfirmRows.length} 条转运中子单吗？回退后状态将流转至已下单。
            </div>
            <div className="flex justify-end gap-3 px-8 pb-6">
              <button
                type="button"
                onClick={() => setTransitRollbackConfirmOrderKeys([])}
                className="rounded border border-slate-300 bg-white px-6 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                取消
              </button>
              <button
                type="button"
                onClick={confirmRollbackTransitRows}
                className="rounded bg-blue-600 px-6 py-1.5 text-xs font-bold text-white hover:bg-blue-700"
              >
                确认回退
              </button>
            </div>
          </div>
        </div>
      )}
      {signedRollbackConfirmOrderKeys.length > 0 && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45">
          <div className="w-[460px] rounded bg-white shadow-2xl">
            <div className="border-b border-slate-200 px-5 py-4">
              <h3 className="text-sm font-bold text-slate-950">签收回退确认</h3>
            </div>
            <div className="px-8 py-7 text-sm leading-6 text-slate-700">
              确认回退已选 {signedRollbackConfirmRows.length} 条签收子单吗？回退后状态将流转至转运中。
            </div>
            <div className="flex justify-end gap-3 px-8 pb-6">
              <button
                type="button"
                onClick={() => setSignedRollbackConfirmOrderKeys([])}
                className="rounded border border-slate-300 bg-white px-6 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                取消
              </button>
              <button
                type="button"
                onClick={confirmRollbackSignedRows}
                className="rounded bg-blue-600 px-6 py-1.5 text-xs font-bold text-white hover:bg-blue-700"
              >
                确认回退
              </button>
            </div>
          </div>
        </div>
      )}
      {activeLogOrder && (
        <OrderLogDrawer
          row={activeLogOrder}
          extraLogs={quoteLogsByOrder[getOrderKey(activeLogOrder)] || []}
          onClose={() => setActiveLogOrder(null)}
        />
      )}
    </div>
  );
}
