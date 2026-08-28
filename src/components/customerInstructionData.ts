export type CustomerInstructionStatus = '启用' | '停用';

export interface CustomerInstructionOption {
  id: string;
  code: string;
  type: '放货' | '不放货' | '销毁' | '拦截';
  name: string;
  feeType: string;
  unit: string;
  price: string;
  currency: string;
  requirement: string;
  uploadedBy: string;
  uploadedAt: string;
  status: CustomerInstructionStatus;
}

export const operationInstructionOptions: CustomerInstructionOption[] = [
  {
    id: 'CI-20260825001',
    code: 'OP-FH-001',
    type: '放货',
    name: '放货-客户自提',
    feeType: '放货服务费',
    unit: '票',
    price: '0.01',
    currency: 'CNY',
    requirement: '客户确认后释放货权，海外仓按自提流程交接。',
    uploadedBy: '天朗（付豪）',
    uploadedAt: '2026-08-25 18:06:59',
    status: '启用',
  },
  {
    id: 'CI-20260825002',
    code: 'OP-FH-002',
    type: '放货',
    name: '放货-UPS派送',
    feeType: '派送服务费',
    unit: '票',
    price: '12.00',
    currency: 'USD',
    requirement: '需填写收件地址、邮编和预约发货时间。',
    uploadedBy: '天朗（付豪）',
    uploadedAt: '2026-08-25 18:06:59',
    status: '启用',
  },
  {
    id: 'CI-20260825003',
    code: 'OP-HOLD-001',
    type: '不放货',
    name: '不放货-暂缓处理',
    feeType: '操作服务费',
    unit: '票',
    price: '0.01',
    currency: 'CNY',
    requirement: '暂停释放货权，等待客户后续确认。',
    uploadedBy: '天朗（付豪）',
    uploadedAt: '2026-08-25 18:06:59',
    status: '启用',
  },
  {
    id: 'CI-20260825004',
    code: 'OP-DES-001',
    type: '销毁',
    name: '销毁-整票销毁',
    feeType: '销毁服务费',
    unit: '票',
    price: '5.00',
    currency: 'USD',
    requirement: '需客户书面授权，海外仓回传销毁记录。',
    uploadedBy: '天朗（付豪）',
    uploadedAt: '2026-08-25 18:06:59',
    status: '启用',
  },
  {
    id: 'CI-20260825005',
    code: 'OP-INT-001',
    type: '拦截',
    name: '拦截-退回仓库',
    feeType: '拦截服务费',
    unit: '票',
    price: '8.00',
    currency: 'USD',
    requirement: '对已出库或派送中的货件发起拦截，成功后退回海外仓。',
    uploadedBy: '天朗（付豪）',
    uploadedAt: '2026-08-25 18:06:59',
    status: '启用',
  },
];
