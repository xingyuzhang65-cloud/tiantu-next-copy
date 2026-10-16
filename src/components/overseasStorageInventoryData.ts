import { instructionManagementCatalog, type InstructionCatalogRow } from './instructionManagementCatalog';

export type InventoryStatus = '暂存' | '待出库' | '已出库';
export type ReleaseKind = '发货' | '增值服务' | '销毁' | '自提';
export type WaybillType = 'FBA' | 'Walmart' | 'Tiktok' | '私人地址';
export interface CargoBox { id: string; recordId: string; boxNo: string; weight: number; dimensions: string; systemWeight: number; status: '待处理' | '处理中' | '已出库' }
export interface InventoryRecord {
  id: string; customer: string; container: string; system: string; inbound: string; blocked: string; transfer: string;
  destination: string; dispatch: string; pallet: string; time: string; weight: number; volume: number; boxes: number;
  pending: number; unsent: number; sent: number; status: InventoryStatus; location: string; remark: string; cargoBoxes: CargoBox[];
  applicationNo?: string; waybillType?: string; releaseType?: ReleaseKind; shipmentId?: string; referenceId?: string;
  financialAudit?: string; chargedPallets?: number;
}
export interface StorageAttachment { id: string; name: string; size: number; type: string; dataUrl?: string }
export interface StorageFeeLine {
  id: string; code: string; name: string; type: string; unit: string; exchangeRate: number; unitPrice: number; quantity: number;
  currency: string; feeRemark: string; instructionRemark: string; addedAt: string; addedBy: string; status: '待处理' | '已处理';
  images?: StorageAttachment[];
  billingTime?: string;
}
export interface ReleaseDraft {
  kind: ReleaseKind; waybillType: WaybillType; destination: string; shipmentId: string; referenceId: string; deliveryMethod: string;
  boxIds: string[]; boxCount: number; scheduledAt: string; pickupAt: string; destroyBoxNo: string; contact: string; phone: string;
  state: string; city: string; postalCode: string; company: string; address: string; remark: string; overseasRemark: string;
  services: string[]; serviceRemark: string; attachments: StorageAttachment[]; instructions: StorageFeeLine[];
}
export interface ReleaseOrder extends ReleaseDraft { id: string; recordIds: string[]; applicationNo: string; createdAt: string; status: '待审批' }
export interface InventoryLog { id: string; recordId: string; at: string; action: string; details: string[] }
export interface InventoryState { records: InventoryRecord[]; orders: ReleaseOrder[]; logs: InventoryLog[] }
export const OVERSEAS_INVENTORY_STORAGE_KEY = 'tiantu-overseas-inventory-v1';
const kinds: ReleaseKind[] = ['发货','增值服务','销毁','自提'];
const waybillTypes: WaybillType[] = ['FBA','Walmart','Tiktok','私人地址'];
const nowText = () => new Date().toLocaleString('sv-SE').replace('T', ' ');
const uniqueId = (prefix: string) => prefix + '-' + Date.now() + '-' + Math.random().toString(36).slice(2,9);

type SourceInventoryRow = [string,string,string,string,string,string,string,string,string,string,number,number,number,number,number,number,string];
const sourceInventoryRows: SourceInventoryRow[] = [
  [
    "TTTX",
    "WEMA1131231",
    "/",
    "2",
    "拆柜前拦截",
    "拆转",
    "ABE2",
    "Truck-Walmart",
    "2-ABE2-1",
    "2024-04-23 15:22:43",
    0,
    0,
    11,
    0,
    7,
    4,
    "暂存"
  ],
  [
    "23",
    "8889990",
    "8889990-250623",
    "88",
    "拆柜后拦截，待确认",
    "拆转",
    "LG,SZ,GD,123,Tom,123...",
    "Truck-Other",
    "8889990-250623-88-6",
    "2025-07-11 15:29:34",
    2,
    2,
    2,
    0,
    1,
    1,
    "暂存"
  ],
  [
    "23",
    "8889990",
    "8889990-250623",
    "88",
    "拆柜后拦截成功",
    "拆转",
    "LG,SZ,GD,123,Tom,123...",
    "Truck-Other",
    "8889990-250623-88-7",
    "2025-07-11 15:29:34",
    0,
    0,
    0,
    0,
    0,
    0,
    "暂存"
  ],
  [
    "23",
    "8889990",
    "8889990-250623",
    "88",
    "拆柜后拦截失败",
    "拆转",
    "LG,SZ,GD,123,Tom,123...",
    "Truck-Other",
    "8889990-250623-88-9",
    "2025-07-11 15:29:34",
    0,
    0,
    2,
    0,
    2,
    0,
    "暂存"
  ],
  [
    "23",
    "8889990",
    "8889990-250623",
    "88",
    "暂存",
    "拆转",
    "BWI9",
    "Truck-Walmart",
    "8889990-250623-BWI9-1",
    "2025-07-11 15:29:34",
    0,
    0,
    0,
    0,
    0,
    0,
    "暂存"
  ],
  [
    "23",
    "8889990",
    "8889990-250623",
    "88",
    "暂存",
    "拆转",
    "BWI9",
    "Truck-Walmart",
    "8889990-250623-BWI9-2",
    "2025-07-11 15:29:34",
    0,
    0,
    0,
    0,
    0,
    0,
    "暂存"
  ],
  [
    "23",
    "8889990",
    "8889990-250623",
    "88",
    "暂存",
    "拆转",
    "BWI9",
    "Truck-Walmart",
    "8889990-250623-BWI9-3",
    "2025-07-11 15:29:34",
    0,
    0,
    0,
    0,
    0,
    0,
    "暂存"
  ],
  [
    "23",
    "8889990",
    "8889990-250623",
    "88",
    "暂存",
    "拆转",
    "BWI9",
    "Truck-Walmart",
    "8889990-250623-BWI9-7",
    "2025-07-11 15:29:34",
    0,
    0,
    0,
    0,
    0,
    0,
    "暂存"
  ],
  [
    "23",
    "8889990",
    "8889990-250623",
    "88",
    "暂存",
    "拆转",
    "BWI9",
    "Truck-Walmart",
    "8889990-250623-BWI9-8",
    "2025-07-11 15:29:34",
    0,
    0,
    0,
    0,
    0,
    0,
    "暂存"
  ],
  [
    "23",
    "8889990",
    "8889990-250623",
    "88",
    "暂存",
    "拆转",
    "BWI9",
    "Truck-Walmart",
    "8889990-250623-BWI9-9",
    "2025-07-11 15:29:34",
    0,
    0,
    0,
    0,
    0,
    0,
    "暂存"
  ],
  [
    "TTTX",
    "AAAA0000000",
    "AAAA0000000-241109",
    "2",
    "拆柜前拦截",
    "拆转",
    "ABE2",
    "Truck-Amazon",
    "AAAA0000000-241109-ABE8-2",
    "2024-11-05 15:18:21",
    0,
    0,
    0,
    0,
    0,
    0,
    "暂存"
  ],
  [
    "TTTX",
    "AAAA0000000",
    "AAAA0000000-2411...",
    "2",
    "拆柜后拦截，待确认",
    "拆转",
    "ABE8",
    "Truck-Amazon",
    "AAAA0000000-241109-ABE8-3",
    "2024-11-05 15:18:21",
    0,
    0,
    0,
    0,
    0,
    0,
    "暂存"
  ],
  [
    "TTTX",
    "AAAA0000000",
    "AAAA0000000-2411...",
    "2",
    "拆柜后拦截成功",
    "拆转",
    "ABE8",
    "Truck-Amazon",
    "AAAA0000000-241109-ABE8-5",
    "2024-11-05 15:18:21",
    61.8,
    4.436,
    4,
    0,
    3,
    1,
    "暂存"
  ]
];
const sourceOutboundRows = [
  {
    "customer": "23",
    "applicationNo": "20260722009",
    "container": "8889990",
    "system": "8889990-250623",
    "inbound": "88",
    "blocked": "是",
    "applicationType": "FBA仓库",
    "shipmentId": "111111",
    "referenceId": "1111111111",
    "transfer": "拆转",
    "dispatch": "Truck-Amazon",
    "pallet": "8889990-250623-88-9",
    "inboundTime": "2025-07-11 15:29:34",
    "appliedBoxes": 1,
    "appliedVolume": 0.4,
    "chargedPallets": ""
  },
  {
    "customer": "23",
    "applicationNo": "20260722008",
    "container": "8889990",
    "system": "8889990-250623",
    "inbound": "88",
    "blocked": "是",
    "applicationType": "FBA仓库",
    "shipmentId": "11111",
    "referenceId": "1111",
    "transfer": "拆转",
    "dispatch": "Truck-Amazon",
    "pallet": "8889990-250623-88-9",
    "inboundTime": "2025-07-11 15:29:34",
    "appliedBoxes": 1,
    "appliedVolume": 0.4,
    "chargedPallets": ""
  },
  {
    "customer": "TTTX2",
    "applicationNo": "20260715002",
    "container": "WEMA1131231",
    "system": "/",
    "inbound": "2",
    "blocked": "是",
    "applicationType": "其他地址",
    "shipmentId": "",
    "referenceId": "",
    "transfer": "拆转",
    "dispatch": "USPS",
    "pallet": "2-ABE2-1",
    "inboundTime": "2024-04-23 15:22:43",
    "appliedBoxes": 2,
    "appliedVolume": 0.182,
    "chargedPallets": ""
  },
  {
    "customer": "23",
    "applicationNo": "20260512001",
    "container": "8889990",
    "system": "8889990-250623",
    "inbound": "88",
    "blocked": "是",
    "applicationType": "FBA仓库",
    "shipmentId": "1",
    "referenceId": "1",
    "transfer": "拆转",
    "dispatch": "Truck-Amazon",
    "pallet": "8889990-250623-88-6",
    "inboundTime": "2025-07-11 15:29:34",
    "appliedBoxes": 1,
    "appliedVolume": 0.4,
    "chargedPallets": ""
  },
  {
    "customer": "TTTX",
    "applicationNo": "20260508008",
    "container": "AAAA1234588",
    "system": "AAAA1234588-2409...",
    "inbound": "",
    "blocked": "是",
    "applicationType": "FBA仓库",
    "shipmentId": "FBA19C9LZ2R8",
    "referenceId": "FBA19C9LZ2R8",
    "transfer": "拆转",
    "dispatch": "Truck-Amazon",
    "pallet": "AAAA1234588-240929-USPS-1",
    "inboundTime": "2024-11-11 15:35:24",
    "appliedBoxes": 3,
    "appliedVolume": 3,
    "chargedPallets": ""
  },
  {
    "customer": "TTTX",
    "applicationNo": "20260508007",
    "container": "AAAA1234588",
    "system": "AAAA1234588-2409...",
    "inbound": "",
    "blocked": "是",
    "applicationType": "FBA仓库",
    "shipmentId": "FBA19C8QWJY8",
    "referenceId": "FBA19C8QWJY8",
    "transfer": "拆转",
    "dispatch": "Truck-Amazon",
    "pallet": "AAAA1234588-240929-USPS-1",
    "inboundTime": "2024-11-11 15:35:24",
    "appliedBoxes": 5,
    "appliedVolume": 5,
    "chargedPallets": ""
  },
  {
    "customer": "TTTX",
    "applicationNo": "20260508006",
    "container": "AAAA1234588",
    "system": "AAAA1234588-2409...",
    "inbound": "",
    "blocked": "是",
    "applicationType": "FBA仓库",
    "shipmentId": "FBA19BWNJY55",
    "referenceId": "FBA19BWNJY55",
    "transfer": "拆转",
    "dispatch": "Truck-Amazon",
    "pallet": "AAAA1234588-240929-USPS-1",
    "inboundTime": "2024-11-11 15:35:24",
    "appliedBoxes": 3,
    "appliedVolume": 3,
    "chargedPallets": ""
  },
  {
    "customer": "TTTX",
    "applicationNo": "20260415003",
    "container": "AAAA0000000",
    "system": "AAAA0000000-2411...",
    "inbound": "",
    "blocked": "是",
    "applicationType": "其他地址",
    "shipmentId": "",
    "referenceId": "",
    "transfer": "拆转",
    "dispatch": "USPS",
    "pallet": "AAAA0000000-241109-FEDEX-1",
    "inboundTime": "2024-11-05 15:18:21",
    "appliedBoxes": 1,
    "appliedVolume": 0.075,
    "chargedPallets": ""
  },
  {
    "customer": "TTTX",
    "applicationNo": "20260415002",
    "container": "AAAA0000000",
    "system": "AAAA0000000-2411...",
    "inbound": "",
    "blocked": "是",
    "applicationType": "其他地址",
    "shipmentId": "",
    "referenceId": "",
    "transfer": "拆转",
    "dispatch": "USPS",
    "pallet": "AAAA0000000-241109-FEDEX-1",
    "inboundTime": "2024-11-05 15:18:21",
    "appliedBoxes": 1,
    "appliedVolume": 0.075,
    "chargedPallets": ""
  },
  {
    "customer": "TTTX",
    "applicationNo": "20260411001",
    "container": "AAAA0000000",
    "system": "AAAA0000000-2411...",
    "inbound": "",
    "blocked": "是",
    "applicationType": "FBA仓库",
    "shipmentId": "FBA199X7633H",
    "referenceId": "FBA199X7633H",
    "transfer": "拆转",
    "dispatch": "Truck-Amazon",
    "pallet": "AAAA0000000-241109-ABE8-5",
    "inboundTime": "2024-11-05 15:18:21",
    "appliedBoxes": 1,
    "appliedVolume": 1.109,
    "chargedPallets": ""
  },
  {
    "customer": "23",
    "applicationNo": "20260409003",
    "container": "8889990",
    "system": "8889990-250623",
    "inbound": "",
    "blocked": "是",
    "applicationType": "FBA仓库",
    "shipmentId": "FBA323N235Y8",
    "referenceId": "FBA323N235Y8",
    "transfer": "拆转",
    "dispatch": "Truck-Amazon",
    "pallet": "8889990-250623-BWI9-10",
    "inboundTime": "2025-07-11 15:29:34",
    "appliedBoxes": 5,
    "appliedVolume": 3.8,
    "chargedPallets": ""
  },
  {
    "customer": "TTTX",
    "applicationNo": "20260407001",
    "container": "ABCD1234567",
    "system": "ABCD1234567-2410...",
    "inbound": "1",
    "blocked": "是",
    "applicationType": "FBA仓库",
    "shipmentId": "FBA12345678990",
    "referenceId": "FBA12345678990",
    "transfer": "拆转",
    "dispatch": "Truck-Amazon",
    "pallet": "ABCD1234567-241018-ABE3-1",
    "inboundTime": "2024-10-16 14:22:38",
    "appliedBoxes": 1,
    "appliedVolume": 0.1,
    "chargedPallets": ""
  },
  {
    "customer": "TTTX",
    "applicationNo": "20250925086",
    "container": "BPAI9461644",
    "system": "BPAI9461644-240330",
    "inbound": "BBA9461",
    "blocked": "",
    "applicationType": "FBA仓库",
    "shipmentId": "41414",
    "referenceId": "1414141",
    "transfer": "拆转",
    "dispatch": "Truck-Amazon",
    "pallet": "BPAI9461644-240330-BBA9461-24",
    "inboundTime": "",
    "appliedBoxes": 2,
    "appliedVolume": 0.87,
    "chargedPallets": ""
  },
  {
    "customer": "TTTX",
    "applicationNo": "20250925085",
    "container": "BPAI9461644",
    "system": "BPAI9461644-240330",
    "inbound": "BBA9461",
    "blocked": "",
    "applicationType": "FBA仓库",
    "shipmentId": "41414",
    "referenceId": "1414141",
    "transfer": "拆转",
    "dispatch": "Truck-Walmart",
    "pallet": "BPAI9461644-240330-BBA9461-24",
    "inboundTime": "",
    "appliedBoxes": 1,
    "appliedVolume": 0.44,
    "chargedPallets": ""
  }
];
const warehouseFeeCatalog = [
  {
    "code": "FY202509260001",
    "name": "仓储渠道-免仓30天",
    "type": "仓储费",
    "unit": "票",
    "price": "3",
    "currency": "人民币",
    "description": "提柜入仓当天起算"
  },
  {
    "code": "FY202509260002",
    "name": "仓储渠道-31-90天",
    "type": "仓储费",
    "unit": "票",
    "price": "4",
    "currency": "人民币",
    "description": "按1级单价收取"
  },
  {
    "code": "FY202509260003",
    "name": "仓储渠道-90天以上",
    "type": "仓储费",
    "unit": "票",
    "price": "2",
    "currency": "人民币",
    "description": "按2级单价收取"
  },
  {
    "code": "FY202509260004",
    "name": "拦截-免仓7天",
    "type": "仓储费",
    "unit": "票",
    "price": "4",
    "currency": "人民币",
    "description": "提柜入仓当天起算"
  },
  {
    "code": "FY202509260005",
    "name": "拦截-免仓8-90天",
    "type": "仓储费",
    "unit": "票",
    "price": "3",
    "currency": "人民币",
    "description": "按1级单价收取"
  },
  {
    "code": "FY202509260006",
    "name": "拦截-免仓90天以上",
    "type": "仓储费",
    "unit": "票",
    "price": "2",
    "currency": "人民币",
    "description": "按2级单价收取"
  },
  {
    "code": "FY202509260007",
    "name": "扣货-无免仓期",
    "type": "仓储费",
    "unit": "票",
    "price": "2",
    "currency": "人民币",
    "description": "按1级单价收取"
  }
];

function withCargoBoxes(row: Omit<InventoryRecord, 'cargoBoxes'>): InventoryRecord {
  const count = Math.max(0, Math.trunc(row.boxes));
  const unsent = Math.min(count, Math.max(0, Math.trunc(row.unsent)));
  const sent = Math.min(count-unsent, Math.max(0, Math.trunc(row.sent)));
  const pending = count-unsent-sent;
  const cargoBoxes: CargoBox[] = Array.from({length: count}, (_, index) => ({
    id: row.id + ':box:' + (index+1), recordId: row.id,
    boxNo: row.pallet + '-' + String(index+1).padStart(3, '0'),
    weight: count ? Number((row.weight/count).toFixed(3)) : 0,
    dimensions: '—', systemWeight: count ? Number((row.weight/count).toFixed(3)) : 0,
    status: index < unsent ? '待处理' : index < unsent+pending ? '处理中' : '已出库',
  }));
  return {...row, boxes: count, unsent, sent, pending, cargoBoxes};
}
export function createInitialOverseasInventory(): InventoryState {
  const records = sourceInventoryRows.map((r,index) => withCargoBoxes({
    id:'staging-'+(index+1),customer:r[0],container:r[1],system:r[2],inbound:r[3],blocked:r[4],transfer:r[5],
    destination:r[6],dispatch:r[7],pallet:r[8],time:r[9],weight:r[10],volume:r[11],boxes:r[12],pending:r[13],
    unsent:r[14],sent:r[15],status:'暂存',location:'A-01-'+String(index+1).padStart(2,'0'),remark:'',
  }));
  // The reference builds 95 pending outbound and 30 shipped examples from these same 14 source rows.
  for (const status of ['待出库', '已出库'] as const) {
    const length = status === '待出库' ? 95 : 30;
    for (let index=0;index<length;index++) {
      const r=sourceOutboundRows[index % sourceOutboundRows.length];
      records.push(withCargoBoxes({
        id:(status==='待出库'?'ready-':'shipped-')+(index+1),customer:r.customer,container:r.container,system:r.system,
        inbound:r.inbound,blocked:r.blocked ? '拦截' : '暂存',transfer:r.transfer,destination:r.applicationType==='FBA仓库'?'ABE8':'其他地址',
        dispatch:r.dispatch,pallet:r.pallet,time:r.inboundTime,weight:0,volume:r.appliedVolume,boxes:r.appliedBoxes,pending:0,
        unsent:status==='待出库'?r.appliedBoxes:0,sent:status==='已出库'?r.appliedBoxes:0,status,
        location:'B-01-'+String(index+1).padStart(2,'0'),remark:'',
        applicationNo:r.applicationNo+(index>=sourceOutboundRows.length?'-'+(index+1):''),
        waybillType:r.applicationType==='FBA仓库'?'FBA':'私人地址',releaseType:'发货',shipmentId:r.shipmentId,referenceId:r.referenceId,
        financialAudit:['已审核','部分审核','未审核'][index%3],chargedPallets:0,
      }));
    }
  }
  return {records,orders:[],logs:[]};
}
const finiteNonnegative = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n>=0;
function validAttachment(item: StorageAttachment) {
  return !!item && ['id','name','type'].every(key=>typeof item[key as keyof StorageAttachment] === 'string')
    && finiteNonnegative(item.size) && (item.dataUrl===undefined || typeof item.dataUrl==='string' && /^data:[^,]*;base64,/.test(item.dataUrl));
}
function validFee(fee: StorageFeeLine) {
  return !!fee && ['id','code','name','type','unit','currency','feeRemark','instructionRemark','addedAt','addedBy'].every(key=>typeof fee[key as keyof StorageFeeLine]==='string')
    && finiteNonnegative(fee.unitPrice) && finiteNonnegative(fee.quantity) && finiteNonnegative(fee.exchangeRate) && fee.exchangeRate>0
    && ['待处理','已处理'].includes(fee.status) && (fee.billingTime===undefined || typeof fee.billingTime==='string')
    && (fee.images===undefined || Array.isArray(fee.images) && fee.images.length<=9 && fee.images.every(validAttachment));
}
function validRecord(row: InventoryRecord) {
  if (!row || !['id','customer','container','system','inbound','blocked','transfer','destination','dispatch','pallet','time','location','remark'].every(key=>typeof row[key as keyof InventoryRecord]==='string')
    || !['暂存','待出库','已出库'].includes(row.status)
    || !['boxes','pending','unsent','sent','weight','volume'].every(key=>finiteNonnegative(row[key as keyof InventoryRecord]))
    || ![row.boxes,row.pending,row.unsent,row.sent].every(Number.isInteger)
    || row.pending+row.unsent+row.sent!==row.boxes || !Array.isArray(row.cargoBoxes) || row.cargoBoxes.length!==row.boxes) return false;
  if(['applicationNo','waybillType','shipmentId','referenceId','financialAudit'].some(key=>row[key as keyof InventoryRecord]!==undefined&&typeof row[key as keyof InventoryRecord]!=='string')
    || row.releaseType!==undefined&&!kinds.includes(row.releaseType) || row.chargedPallets!==undefined&&!finiteNonnegative(row.chargedPallets))return false;
  const ids=new Set<string>();
  for(const box of row.cargoBoxes) {
    if(!box || typeof box.id!=='string' || ids.has(box.id) || box.recordId!==row.id || typeof box.boxNo!=='string' || typeof box.dimensions!=='string'
      || !finiteNonnegative(box.weight) || !finiteNonnegative(box.systemWeight) || !['待处理','处理中','已出库'].includes(box.status)) return false;
    ids.add(box.id);
  }
  return row.cargoBoxes.filter(box=>box.status==='待处理').length===row.unsent
    && row.cargoBoxes.filter(box=>box.status==='处理中').length===row.pending
    && row.cargoBoxes.filter(box=>box.status==='已出库').length===row.sent;
}
function validOrder(order: ReleaseOrder) {
  return !!order && order.status==='待审批' && kinds.includes(order.kind) && waybillTypes.includes(order.waybillType)
    && ['id','applicationNo','createdAt','destination','shipmentId','referenceId','deliveryMethod','scheduledAt','pickupAt','destroyBoxNo','contact','phone','state','city','postalCode','company','address','remark','overseasRemark','serviceRemark'].every(key=>typeof order[key as keyof ReleaseOrder]==='string')
    && Array.isArray(order.recordIds) && order.recordIds.every(id=>typeof id==='string')
    && Array.isArray(order.boxIds) && order.boxIds.every(id=>typeof id==='string') && order.boxIds.length===order.boxCount && new Set(order.boxIds).size===order.boxCount
    && Number.isInteger(order.boxCount) && order.boxCount>0 && Array.isArray(order.services) && order.services.every(s=>typeof s==='string')
    && Array.isArray(order.instructions) && order.instructions.every(validFee) && Array.isArray(order.attachments) && order.attachments.every(validAttachment);
}
export function loadOverseasInventory(): InventoryState {
  try {
    const raw=JSON.parse(localStorage.getItem(OVERSEAS_INVENTORY_STORAGE_KEY)||'null') as InventoryState|null;
    if (!raw || !Array.isArray(raw.records) || !raw.records.length || !raw.records.every(validRecord) || new Set(raw.records.map(row=>row.id)).size!==raw.records.length
      || !Array.isArray(raw.orders) || !raw.orders.every(validOrder) || !Array.isArray(raw.logs)) return createInitialOverseasInventory();
    const recordIds=new Set(raw.records.map(row=>row.id));
    if(raw.orders.some(order=>order.recordIds.some(id=>!recordIds.has(id)))) return createInitialOverseasInventory();
    const allBoxes=raw.records.flatMap(row=>row.cargoBoxes);
    const boxById=new Map(allBoxes.map(box=>[box.id,box]));
    if(boxById.size!==allBoxes.length)return createInitialOverseasInventory();
    const allocated=new Set<string>();
    for(const order of raw.orders) {
      const parents=new Set<string>();
      for(const boxId of order.boxIds) {
        const box=boxById.get(boxId);
        if(!box||box.status!=='处理中'||!order.recordIds.includes(box.recordId)||allocated.has(boxId))return createInitialOverseasInventory();
        allocated.add(boxId);parents.add(box.recordId);
      }
      if(parents.size!==order.recordIds.length||order.recordIds.some(id=>!parents.has(id)))return createInitialOverseasInventory();
    }
    const logs=raw.logs.filter(log=>log && recordIds.has(log.recordId) && ['id','at','action'].every(key=>typeof log[key as keyof InventoryLog]==='string')
      && Array.isArray(log.details) && log.details.every(d=>typeof d==='string'));
    return {...raw, logs};
  } catch { return createInitialOverseasInventory(); }
}
export function persistOverseasInventory(state: InventoryState): void {
  localStorage.setItem(OVERSEAS_INVENTORY_STORAGE_KEY,JSON.stringify(state));
}
export function createReleaseDraft(records: InventoryRecord[]): ReleaseDraft {
  const first=records[0];
  return {
    kind:'发货',waybillType:'FBA',destination:first?.destination||'',shipmentId:'',referenceId:'',deliveryMethod:first?.dispatch||'Truck-Amazon',
    boxIds:[],boxCount:0,scheduledAt:'',pickupAt:'',destroyBoxNo:'',contact:'',phone:'',state:'',city:'',postalCode:'',company:'',address:'',
    remark:'',overseasRemark:'',services:[],serviceRemark:'',attachments:[],instructions:[],
  };
}
function normalizedDraft(draft: ReleaseDraft): ReleaseDraft {
  const cleaned={...draft,boxIds:[...draft.boxIds],attachments:draft.attachments.map(a=>({...a})),
    services:[...draft.services],instructions:draft.instructions.map(f=>({...f,images:f.images?.map(a=>({...a}))}))};
  if(cleaned.kind!=='发货') {
    cleaned.shipmentId='';cleaned.referenceId='';cleaned.scheduledAt='';cleaned.contact='';cleaned.phone='';cleaned.state='';cleaned.city='';
    cleaned.postalCode='';cleaned.company='';cleaned.address='';cleaned.services=[];cleaned.serviceRemark='';cleaned.overseasRemark='';
    if(cleaned.kind==='自提')cleaned.deliveryMethod='客户自提';
    if(cleaned.kind!=='自提')cleaned.pickupAt='';
    if(cleaned.kind!=='销毁')cleaned.destroyBoxNo='';
  } else {
    cleaned.pickupAt='';cleaned.destroyBoxNo='';
    if(cleaned.waybillType!=='FBA'){cleaned.shipmentId='';cleaned.referenceId='';}
    cleaned.services=[];cleaned.serviceRemark='';
    if(cleaned.waybillType==='FBA') {
      cleaned.contact='';cleaned.phone='';cleaned.state='';cleaned.city='';cleaned.postalCode='';cleaned.company='';cleaned.address='';cleaned.overseasRemark='';
    } else if(cleaned.waybillType==='私人地址') {
      cleaned.company='';cleaned.overseasRemark='';
    } else {
      cleaned.phone='';
    }
  }
  return cleaned;
}
export function validateInventoryRelease(state: InventoryState,recordIds: string[],draft: ReleaseDraft): string|null {
  if(!recordIds.length)return '请先勾选需要下单的运单';
  const records=state.records.filter(row=>recordIds.includes(row.id));
  if(records.length!==new Set(recordIds).size)return '所选库存记录已变更，请刷新后重试';
  if(records.some(row=>row.status!=='暂存'))return '仅暂存中的运单可以下单';
  if(new Set(records.map(row=>row.customer)).size>1)return '请勾选同一客户的运单后下单';
  if(!kinds.includes(draft.kind))return '请选择有效的下单类型';
  const available=records.flatMap(row=>row.cargoBoxes).filter(box=>box.status==='待处理');
  if(new Set(available.map(box=>box.id)).size!==available.length)return '货箱数据异常，请刷新后重新选择';
  if(!available.length)return '所选运单暂无可下单的未发货货箱';
  if(!Array.isArray(draft.boxIds)||!draft.boxIds.length)return '请勾选需要下单的货箱';
  if(!Number.isInteger(draft.boxCount)||draft.boxCount<1||draft.boxCount>available.length)return '箱数须为1至'+available.length+'之间的整数';
  if(!Array.isArray(draft.boxIds)||new Set(draft.boxIds).size!==draft.boxCount||draft.boxIds.length!==draft.boxCount)return '勾选货箱数量须与下单箱数一致';
  const availableIds=new Set(available.map(box=>box.id));
  if(draft.boxIds.some(id=>!availableIds.has(id)))return '所选货箱已被占用或已出库，请重新选择';
  if(draft.kind==='发货') {
    if(!waybillTypes.includes(draft.waybillType))return '请选择运单类型';
    if(draft.waybillType!=='私人地址'&&!draft.destination.trim())return '请填写目的地';
    if(draft.waybillType==='FBA'&&(!draft.shipmentId.trim()||!draft.referenceId.trim()))return '请填写ShipmentID和ReferenceID';
    if(!draft.deliveryMethod.trim())return '请选择派送方式';
    if(!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2})?)?$/.test(draft.scheduledAt)||!Number.isFinite(Date.parse(draft.scheduledAt)))return '请选择有效的预约发货时间';
  }
  if(draft.kind==='销毁'&&!draft.destroyBoxNo.trim())return '请填写销毁箱号';
  if(draft.kind==='自提'&&draft.pickupAt&&(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(draft.pickupAt)||!Number.isFinite(Date.parse(draft.pickupAt))))return '请填写有效的预计提货时间';
  if(draft.instructions.some(f=>!validFee(f)||!f.name.trim()||!f.type.trim()||!f.unit.trim()||!f.currency.trim()))return '请完整填写操作指令，单价/数量不可为负数且汇率须大于0';
  if(draft.attachments.some(a=>!validAttachment(a)))return '附件信息无效，请重新上传';
  return null;
}
export function submitInventoryRelease(state: InventoryState,recordIds: string[],draft: ReleaseDraft): InventoryState {
  const error=validateInventoryRelease(state,recordIds,draft); if(error)throw new Error(error);
  const selectedBoxes=new Set(draft.boxIds);const at=nowText();const orderId=uniqueId('release');
  const affectedIds=recordIds.filter(id=>state.records.find(row=>row.id===id)?.cargoBoxes.some(box=>selectedBoxes.has(box.id)));
  const day=at.slice(0,10).replaceAll('-','');const serial=state.orders.filter(order=>order.createdAt.slice(0,10)===at.slice(0,10)).length+1;
  const order: ReleaseOrder={...normalizedDraft(draft),id:orderId,recordIds:affectedIds,applicationNo:'ZC'+day+String(serial).padStart(4,'0'),createdAt:at,status:'待审批'};
  const records=state.records.map(row=>{
    if(!recordIds.includes(row.id))return row;
    const count=row.cargoBoxes.filter(box=>selectedBoxes.has(box.id)).length;
    return count?{...row,unsent:row.unsent-count,pending:row.pending+count,cargoBoxes:row.cargoBoxes.map(box=>selectedBoxes.has(box.id)?{...box,status:'处理中' as const}:box)}:row;
  });
  const logs=affectedIds.map(recordId=>({id:uniqueId('log'),recordId,at,action:'提交下单（待审批）',details:[
    '申请单号：'+order.applicationNo,'下单类型：'+order.kind,'箱数：'+state.records.find(row=>row.id===recordId)!.cargoBoxes.filter(box=>selectedBoxes.has(box.id)).length,
    '所选货箱：'+state.records.find(row=>row.id===recordId)!.cargoBoxes.filter(box=>selectedBoxes.has(box.id)).map(box=>box.boxNo).join('、'),
    ...(order.kind==='发货'?['运单类型：'+order.waybillType,'目的地：'+order.destination,'预约发货：'+order.scheduledAt]:[]),
    ...(order.remark?['备注：'+order.remark]:[]),
  ]}));
  return {records,orders:[order,...state.orders],logs:[...logs,...state.logs]};
}
export function updateInventoryLocation(state: InventoryState,ids: string[],location: string): InventoryState {
  const next=location.trim();if(!next)throw new Error('请输入新库位');
  if(!ids.length)throw new Error('请先选择需要更换库位的运单');
  const changed=state.records.filter(row=>ids.includes(row.id)&&row.location!==next);
  const at=nowText();
  return {...state,records:state.records.map(row=>ids.includes(row.id)?{...row,location:next}:row),
    logs:[...changed.map(row=>({id:uniqueId('log'),recordId:row.id,at,action:'更换库位',details:['库位：'+row.location+' → '+next]})),...state.logs]};
}
export function getInventoryFeeCatalog(): StorageFeeLine[] {
  const merged=new Map<string,InstructionCatalogRow>(instructionManagementCatalog.map(row=>[row.code,{...row}]));
  try {
    const state=JSON.parse(localStorage.getItem('tiantu-instruction-management-reference-v1')||'null');
    if(Array.isArray(state?.rows))for(const row of state.rows) {
      if(row&&merged.has(row.code)&&typeof row.name==='string'&&typeof row.unit==='string'&&typeof row.type==='string'
        &&typeof row.currency==='string'&&finiteNonnegative(row.price)&&['启用','停用'].includes(row.status))merged.set(row.code,row);
    }
  }catch{/* Default to the shared fee dictionary. */}
  const catalog=[...merged.values()].filter(row=>row.status==='启用').map(row=>({
    id:'catalog-'+row.code,code:row.code,name:row.name,type:row.type,unit:row.unit,exchangeRate:row.currency==='人民币'?1:7.1,
    unitPrice:row.price,quantity:1,currency:row.currency,feeRemark:'',instructionRemark:row.description,addedAt:'',addedBy:'天朗（付豪）',status:'待处理' as const,
  }));
  return [...catalog,...warehouseFeeCatalog.map(row=>({
    id:'catalog-'+row.code,code:row.code,name:row.name,type:row.type,unit:row.unit,exchangeRate:1,unitPrice:Number(row.price),quantity:1,
    currency:row.currency,feeRemark:'',instructionRemark:row.description,addedAt:'',addedBy:'天朗（付豪）',status:'待处理' as const,
  }))];
}
export function exportInventoryCsv(rows: InventoryRecord[]): string {
  const columns: [keyof InventoryRecord,string][]=[
    ['customer','客户名称'],['container','柜号'],['system','系统柜号'],['inbound','入仓号'],['blocked','库存类型'],['transfer','转运方式'],
    ['destination','目的地'],['dispatch','派送方式'],['pallet','托盘标签'],['time','入库时间'],['weight','重量'],['volume','体积'],
    ['boxes','总箱数'],['pending','待审核箱数'],['unsent','未发货箱数'],['sent','已发货箱数'],['location','库位'],['remark','备注'],
  ];
  const escape=(v:unknown)=>{const s=String(v??'');return '"'+(/^[=+@-]/.test(s)?"'"+s:s).replaceAll('"','""')+'"';};
  return '\uFEFF'+[columns.map(([,label])=>escape(label)).join(','),...rows.map(row=>columns.map(([key])=>escape(row[key])).join(','))].join('\r\n');
}
