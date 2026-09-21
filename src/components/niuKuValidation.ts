// Fields and conditional requirements from 发票信息!B9:L15.
export const partyFields = [
  ['shipperName', '发货人公司名称'],
  ['shipperAddress', '公司详细地址'],
  ['shipperPostcode', '公司所在地邮编'],
  ['shipperCity', '公司所在地城市'],
  ['importerName', '进口商名称'],
  ['importerAddress', '进口商地址'],
  ['importerPostcode', '进口商邮编'],
  ['importerCity', '城市'],
  ['vatCountry', 'VAT注册国'],
  ['vatNo', '增值税号VAT'],
  ['eori', '登记号EORI'],
] as const;

const europeanCountries = new Set([
  '德国', '北爱尔兰', '法国', '意大利', '西班牙', '波兰', '保加利亚', '捷克',
  '罗马尼亚', '爱沙尼亚', '瑞典', '葡萄牙', '丹麦', '奥地利', '立陶宛', '匈牙利',
  '斯洛伐克', '卢森堡', '比利时', '英国', '荷兰', '爱尔兰', '芬兰', '希腊',
  '斯洛文尼亚', '拉脱维亚', '克罗地亚',
]);
type RouteInput = { channel: string; destinationCountry: string; tax: string };
export const isEuropeanOrder = (base: RouteInput) =>
  /欧盟|欧线|英国/.test(base.channel);
export const requiresPartyInfo = (base: RouteInput) =>
  isEuropeanOrder(base) && base.tax === '自税';
