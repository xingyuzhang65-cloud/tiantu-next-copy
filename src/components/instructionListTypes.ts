export type InstructionListTab = '待确认' | '已确认' | '已推送海外仓' | '处理中' | '已完成' | '驳回' | '取消' | '全部';
export type InstructionStatus = '已处理' | '待处理' | '已取消' | '已驳回';
export type InstructionProcessingResult = '拦截成功' | '拦截失败' | '已处理';

export interface InstructionListRow {
  id: string; tab: InstructionListTab; waybill: string; instructionNo: string; names: string[]; created: string; updated: string;
  shipment: string; reference: string; status: InstructionStatus; processingResult?: InstructionProcessingResult; failureReason?: string;
  photo?: string; customer: string; warehouse: string; zip: string; orderType: string; instructionType: string; interceptReason?: string;
  destination: string; salesman: string; merchandiser: string; fee: string; expectedPickupTime?: string; pickupContact?: string; pickupPhone?: string;
  packages: string; weight: string; volume: string; arrived: '是' | '否'; overseasTime: string;
  customerNote?: string; internalRemark?: string; palletLabel?: string; scheduledAt?: string; waybillRemark?: string;
  inventoryRecordIds?: string[]; inventoryLinkSource?: 'example';
}
