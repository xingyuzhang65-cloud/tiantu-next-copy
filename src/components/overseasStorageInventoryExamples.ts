import { instructionManagementCatalog } from './instructionManagementCatalog';
import type { InventoryRecord, StorageFeeLine } from './overseasStorageInventoryData';

export interface OverseasInventoryExample {
  waybillNo: string;
  fbaNo: string;
  warehouseCode: string;
  service: string;
  remark: string;
  instructions: StorageFeeLine[];
}

type InstructionExample = { code: string; quantity: number; feeRemark: string; instructionRemark: string };
const warehouses = ['ABE2', 'ABE8', 'BWI9', 'ONT8', 'LAX9', 'DFW7'];
const services = ['美森15日达-快递派', '美森15日达-卡派包税', 'OA以星17日达-快递派', '美线海卡', '海外仓一件代发'];
const exampleAt = '2026-10-19 09:30:00';

/** Only the original public-reference seed rows receive demonstration content. */
export function getOverseasInventoryExample(row: InventoryRecord): OverseasInventoryExample | null {
  const match = /^(staging|ready|shipped)-([1-9]\d*)$/.exec(row.id);
  if (!match) return null;
  const sequence = Number(match[2]);
  const limit = match[1] === 'staging' ? 13 : match[1] === 'ready' ? 95 : 30;
  if (sequence > limit) return null;

  const ordinal = (match[1] === 'staging' ? 0 : match[1] === 'ready' ? 100 : 200) + sequence;
  const warehouseCode = warehouses.includes(row.destination) ? row.destination : warehouses[(ordinal - 1) % warehouses.length];
  const service = row.service && services.includes(row.service) ? row.service : services[(ordinal - 1) % services.length];
  const serial = String(ordinal).padStart(6, '0');
  const blocked = row.blocked === '拦截';
  const waiting = row.status === '暂存';
  const boxQuantity = Math.max(1, Math.min(row.boxes, 5));
  const lot = '批次 ' + String(sequence).padStart(3, '0');
  const boxScope = row.boxes ? `本批 ${row.boxes} 箱` : '本批补录后的货箱';
  const phase = waiting ? '待处理' : '已处理';
  let entries: InstructionExample[];

  if (blocked) {
    entries = [
      {
        code: 'FY20260820024', quantity: 3,
        feeRemark: '外箱全景、箱唛、破损位置各 1 张，共 3 张。',
        instructionRemark: `${waiting ? '先拍摄' : '已拍摄'}${lot}外箱、原箱唛和包装封口；照片按运单号命名，回传客户确认后再安排后续操作。`,
      },
      {
        code: 'FY20260831022', quantity: boxQuantity,
        feeRemark: `抽查 ${boxQuantity} 箱外包装，按箱计费，不包含开箱验货。`,
        instructionRemark: `${waiting ? '抽查' : '已抽查'}${lot}前 ${boxQuantity} 箱，核对箱唛、外箱凹陷和受潮情况；异常箱单独标识，禁止混入正常发货区。`,
      },
      {
        code: 'FY20260820016', quantity: 2,
        feeRemark: '按 2 个 SKU 分拣，拦截品与可发货品分区存放。',
        instructionRemark: `${waiting ? '将' : '已将'}${boxScope}按 SKU-A / SKU-B 分拣并复核箱唛；拦截货保留原包装，客户确认解除拦截前不安排出库。`,
      },
    ];
  } else if (ordinal % 3 === 0) {
    entries = [
      {
        code: 'FY20260820020', quantity: boxQuantity,
        feeRemark: `${boxQuantity} 箱封口加固，仅包含胶带修复，不更换纸箱。`,
        instructionRemark: `${waiting ? '对' : '已对'}${lot}松脱封口使用透明胶带十字加固，保留原 FBA 标签及箱号；加固完成后检查条码可扫描。`,
      },
      {
        code: 'FY20260820024', quantity: 2,
        feeRemark: '加固前、加固后各拍 1 张，合计 2 张。',
        instructionRemark: `${waiting ? '拍摄' : '已留存'}${lot}加固前后对比照片，照片需同时显示箱号和封口位置；与本次操作记录一并归档。`,
      },
    ];
  } else if (ordinal % 3 === 1) {
    entries = [
      {
        code: 'FY20260820027', quantity: boxQuantity,
        feeRemark: `按 ${boxQuantity} 箱重新打板，使用原板，费用按箱计算。`,
        instructionRemark: `${waiting ? '按' : '已按'} ${warehouseCode} 到仓批次将${boxScope}整齐码放，同 SKU 集中，箱唛朝外；缠膜后保留托盘标签可见。`,
      },
      {
        code: 'FY20260820024', quantity: 3,
        feeRemark: '整板正面、侧面和托盘标签各拍 1 张。',
        instructionRemark: `${waiting ? '打板后拍摄' : '已留存'}${lot}整板照片，复核箱数和托盘标签；在预约交仓前将照片交客服核对。`,
      },
      {
        code: 'FY20260820010', quantity: 1,
        feeRemark: '本票操作指令加急，按 1 票计费。',
        instructionRemark: `${waiting ? '优先处理' : '已优先完成'}${lot}打板及复核，目标为当日 16:00 前完成；如发现箱数差异，先暂停交仓并登记异常。`,
      },
    ];
  } else {
    entries = [
      {
        code: 'FY20260820015', quantity: boxQuantity,
        feeRemark: `按 ${boxQuantity} 箱分拣，依箱唛区分到仓批次。`,
        instructionRemark: `${waiting ? '核对' : '已核对'}${lot}箱唛与 FBA 号，按 ${warehouseCode} 到仓批次分拣；批次间使用隔离标识，禁止混板交仓。`,
      },
      {
        code: 'FY20260831023', quantity: 2,
        feeRemark: '抽检 2 件产品外观，按 PCS 计费，不含工具测试。',
        instructionRemark: `${waiting ? '从' : '已从'}${lot}抽取 2 件产品检查表面刮痕、配件完整性和包装状态；发现异常时记录箱号及 SKU 并反馈客服。`,
      },
      {
        code: 'FY20260831025', quantity: 1,
        feeRemark: '拍摄 1 条验货过程视频，单条不超过 3 分钟。',
        instructionRemark: `${waiting ? '连续拍摄' : '已留存'}${lot}开箱、抽检和复封过程，画面需包含原箱唛；视频以运单号及抽检箱号命名归档。`,
      },
    ];
  }

  const stockNote = row.boxes === 0 ? '当前批次暂无货箱，补录后再执行操作。' : waiting ? `现有 ${row.boxes} 箱，可下单 ${row.unsent} 箱。` : `本批 ${row.boxes} 箱已完成操作复核。`;
  const stateNote = blocked
    ? waiting ? '客户要求暂缓派送，待照片及验货结果确认后再处理，未经解除拦截不得出库。' : row.status === '已出库' ? '原拦截批次已按客户确认方案完成复核并出库，操作记录留档。' : '原拦截批次操作已完成，待客户放行确认及仓库出库安排。'
    : waiting ? `货物暂存于 ${warehouseCode}，等待预约交仓；优先核对箱唛和包装后再安排 ${service}。` : row.status === '已出库' ? `已按预约完成 ${service} 出库交接，箱唛及交接记录已复核。` : `操作复核已完成，等待 ${service} 提货，交接前再次核对箱数和预约信息。`;

  return {
    waybillNo: 'TT20261019' + serial,
    fbaNo: 'FBA19X' + serial,
    warehouseCode,
    service,
    remark: `${stockNote}${stateNote}`,
    instructions: entries.map((entry, index) => {
      const fee = instructionManagementCatalog.find(item => item.code === entry.code)!;
      return {
        id: `example-${row.id}-instruction-${index + 1}`,
        code: fee.code, name: fee.name, type: fee.type, unit: fee.unit,
        unitPrice: fee.cost, quantity: entry.quantity, currency: fee.currency,
        exchangeRate: fee.currency === '人民币' ? 1 : 7.1,
        feeRemark: entry.feeRemark, instructionRemark: entry.instructionRemark,
        addedAt: exampleAt, billingTime: '2026-10-19', addedBy: '天朗（付豪）',
        status: phase, images: [],
      };
    }),
  };
}
