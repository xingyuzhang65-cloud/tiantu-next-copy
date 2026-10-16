export interface InstructionCatalogRow {
  code: string; name: string; type: string; unit: string;
  price: number; cost: number; currency: string;
  status: '启用' | '停用'; description: string;
}

export const instructionManagementCatalog: InstructionCatalogRow[] = [
  { code: 'FY20261010209', name: '开箱费（仅开箱）', type: '开箱费', unit: '箱', price: 0, cost: 0.8, currency: '美元', status: '启用', description: '客户要求开箱的开箱费用' },
  { code: 'FY20260904070', name: '重新包装费-多个产品', type: '重新包装费', unit: '个', price: 0, cost: 0.4, currency: '美元', status: '启用', description: '单箱多个产品，按$0.4/个、低消$4，产品…' },
  { code: 'FY20260904068', name: '出/入仓费', type: '出/入仓费', unit: 'Per Pallet', price: 0, cost: 10.5, currency: '美元', status: '启用', description: '货物入仓上架存储和出仓，按板收费' },
  { code: 'FY20260904067', name: '销毁费-按板', type: '销毁费', unit: '托', price: 0, cost: 50, currency: '美元', status: '启用', description: '整板弃货处理费（普货）' },
  { code: 'FY20260904066', name: '销毁费-按箱', type: '销毁费', unit: '箱', price: 0, cost: 5, currency: '美元', status: '启用', description: '单箱/包裹/产品' },
  { code: 'FY20260831025', name: '拍视频', type: '拍视频费', unit: '条', price: 0, cost: 3, currency: '美元', status: '启用', description: '拍视频，按一条3美金计费；单个视频3分…' },
  { code: 'FY20260831023', name: '验货费-产品', type: '验货费', unit: 'PCS', price: 0, cost: 2, currency: '美元', status: '启用', description: '不借用工具查看产品是否破损刮痕等（检…' },
  { code: 'FY20260831022', name: '验货费-外包装', type: '验货费', unit: '箱', price: 0, cost: 1, currency: '美元', status: '启用', description: '不借用工具只看外包装是否有破损（检查…' },
  { code: 'FY20260826029', name: 'YQN自提费-并板', type: 'YQN自提费', unit: '托', price: 0, cost: 14, currency: '美元', status: '启用', description: '并板$14/托' },
  { code: 'FY20260821001', name: '拦截费-拆转柜', type: '拦截费', unit: '票', price: 0, cost: 50, currency: '美元', status: '启用', description: '未拆柜前拦截：$50/票 拆柜后拦截：$50/…' },
  { code: 'FY20260820028', name: '重新打板费-按托', type: '重新打板费', unit: '托', price: 0, cost: 12, currency: '美元', status: '启用', description: '≥12箱以上，针对有需求拆打板操作时，需…' },
  { code: 'FY20260820027', name: '重新打板费-按箱', type: '重新打板费', unit: '箱', price: 0, cost: 1, currency: '美元', status: '启用', description: '≤11箱' },
  { code: 'FY20260820024', name: '拍照费', type: '拍照费', unit: '张', price: 0, cost: 1, currency: '美元', status: '启用', description: '拍照，按张计费' },
  { code: 'FY20260820020', name: '破损修复费', type: '破损修复费', unit: 'Per Box', price: 0, cost: 1, currency: '美元', status: '启用', description: '破损箱重新包装（仅胶带缠绕）操作费及物…' },
  { code: 'FY20260820019', name: '换箱费', type: '换箱费', unit: '箱', price: 0, cost: 10, currency: '美元', status: '启用', description: '包括操作换箱费与标准纸箱费（标准纸箱尺…' },
  { code: 'FY20260820016', name: '分拣费-按SKU', type: '分拣费', unit: 'SKU', price: 0, cost: 1, currency: '美元', status: '启用', description: '需要扣货或者挑出特定货物时产生' },
  { code: 'FY20260820015', name: '分拣费-按箱', type: '分拣费', unit: '箱', price: 0, cost: 1, currency: '美元', status: '启用', description: '需要扣货或者挑出特定货物时产生' },
  { code: 'FY20260820013', name: '自提费', type: '自提费', unit: 'Per Pallet', price: 0, cost: 10, currency: '美元', status: '启用', description: '客户自提出库费用 超尺寸超重按实际占板…' },
  { code: 'FY20260820012', name: '加急费-拆柜', type: '加急费', unit: '柜', price: 0, cost: 200, currency: '美元', status: '启用', description: '指令加急' },
  { code: 'FY20260820011', name: '加急费-提柜', type: '加急费', unit: '柜', price: 0, cost: 300, currency: '美元', status: '启用', description: '指令加急' },
  { code: 'FY20260820010', name: '加急费-操作指令', type: '加急费', unit: '票', price: 0, cost: 150, currency: '美元', status: '启用', description: '该类指令加急，快递的操作指令费$150/票' },
];
