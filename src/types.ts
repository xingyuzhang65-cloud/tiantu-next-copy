export interface WaybillAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
  dataUrl?: string;
}

export interface Waybill {
  id: string; // e.g. HD2606161063
  fbaCode: string; // e.g. FBA19G6M4C7B
  description: string; // e.g. 需要补充报关抬头
  createTime: string; // e.g. 2026-06-16 15:42:25
  pickupTime: string; // e.g. 2026-06-16 16:43:57
  groupCode: string; // e.g. USSZ202606160504
  carrier: string; // Service e.g. 海德运通
  zipCode: string; // e.g. 85043-2356
  station: string; // e.g. 深圳天图
  customerType: 'vip' | '基础价格' | '普通客户';
  status: '已收货' | '待揽收' | '转运中' | '异常件';
  packagesCount: number;
  country: string;
  orderWeek?: string;
  insurance: boolean;
  hasUploadedInvoice?: boolean;
  attachments?: WaybillAttachment[];
  remarks?: string;
  customerName?: string;
  customerOrderNo?: string;
  consignee?: string;
  warehouseCode?: string;
  company?: string;
  address1?: string;
  address2?: string;
  address3?: string;
  city?: string;
  state?: string;
  phone?: string;
  email?: string;
  amazonReferenceId?: string;
  associatedNo?: string;
  delegatedPickup?: string;
  combinedDeclaration?: string;
  combinedClearance?: string;
  poNumber?: string;
  referenceNo1?: string;
  referenceNo2?: string;
  internalNote?: string;
  taxMethod?: string;
  clearanceMethod?: string;
  vatNo?: string;
  iossNo?: string;
  eori?: string;
  currency?: string;
  itemAttributes?: string[];
  buyInsurance?: boolean;
  domesticInspection?: boolean;
  customsDeclarationType?: string;
  tradeMode?: string;
  clearanceType?: string;
}

export interface OverseasInterceptRequest {
  id: number;
  interceptNo: string;
  waybillNo: string;
  customerOrderNo: string;
  customer: string;
  container: string;
  warehouse: string;
  boxes: number;
  reason: string;
  attachmentName: string;
  createdAt: string;
}

export interface SearchParams {
  keywords: string;
  groupCode: string;
  carrier: string;
  tradeMode: string[];
  customsDeclarationType: string[];
}

export type SidebarTab = '单票' | '多票';
export type OrderType = '快捷下单' | 'excel导入下单' | '解析发票下单';

// ─── Trade Mode Rule Config Types ──────────────────────────────────────────────
export interface TradeModeRule {
  id: number;
  stationCodes: string[];      // 关联的货站编码列表
  serviceCodes: string[];      // 关联的服务编码列表
  isRequired: boolean;         // 贸易方式是否必填
  status: boolean;             // true:启用 false:禁用
  updateUser: string;          // 更新人
  createTime: string;
  updateTime: string;
}

export interface StationOption {
  code: string;
  name: string;
}

export interface ServiceOption {
  code: string;
  name: string;
}

// Predefined station options
export const STATION_OPTIONS: StationOption[] = [
  { code: 'tangxia', name: '塘厦仓' },
  { code: 'guangzhou', name: '广州仓' },
  { code: 'yiwu', name: '义乌仓' },
];

// Predefined service options
export const SERVICE_OPTIONS: ServiceOption[] = [
  { code: 'us_air_express', name: '美线空派' },
  { code: 'us_sea_truck', name: '美线海卡' },
  { code: 'yiwu_tiantu', name: '义乌天图' },
  { code: 'uk_sea', name: '英线海卡' },
  { code: 'de_air', name: '德线空派' },
  { code: 'japan_express', name: '日本快线' },
];

export interface TradeModeCheckRequest {
  stationCode: string;
  serviceCode: string;
}

export interface TradeModeCheckResponse {
  isRequired: boolean;
  matchedRuleName?: string;
}

// ─── Waybill Change Log ──────────────────────────────────────────────────────
export interface WaybillChangeLog {
  id: number;
  waybillId: string;
  action: '创建' | '修改' | '删除';
  field: string;
  oldValue: string;
  newValue: string;
  operator: string;
  timestamp: string;
}
