export interface AddressFormState {
  orderType: string;
  warehouseCode: string;
  zipCode: string;
  consignee: string;
  phone: string;
  city: string;
  state: string;
  company: string;
  scheduledShippingTime: string;
  deliveryMethod: string;
  addressDetail: string;
  remark: string;
  overseasWarehouseRemark: string;
}

export const overseasOrderTypes = ['FBA', 'Walmart', 'TikTok', '私人地址'];

export type ReleaseInstruction = '放货' | '不放货' | '销毁';

export const releaseInstructionOptions: ReleaseInstruction[] = ['放货', '不放货', '销毁'];

export const getReleaseInstructionFromShippingEnabled = (shippingEnabled?: boolean): ReleaseInstruction =>
  shippingEnabled === false ? '不放货' : '放货';

export const getShippingEnabledForReleaseInstruction = (releaseInstruction?: ReleaseInstruction) =>
  (releaseInstruction || '放货') === '放货';

export const overseasWarehouseCodes = ['ONT8', 'PSC2', 'ABE2', 'FTW1'];

export const overseasDeliveryMethods = ['快递派送', '卡车派送', '客户自提'];

export const emptyAddressForm: AddressFormState = {
  orderType: 'FBA',
  warehouseCode: '',
  zipCode: '',
  consignee: '',
  phone: '',
  city: '',
  state: '',
  company: '',
  scheduledShippingTime: '',
  deliveryMethod: '',
  addressDetail: '',
  remark: '',
  overseasWarehouseRemark: '',
};

export const warehouseAddressBook: Record<
  string,
  Omit<AddressFormState, 'orderType' | 'warehouseCode' | 'phone' | 'company' | 'scheduledShippingTime' | 'deliveryMethod' | 'remark' | 'overseasWarehouseRemark'>
> = {
  PSC2: {
    zipCode: '99301',
    consignee: 'PSC2',
    city: 'PASCO',
    state: 'WA',
    addressDetail: '1351 S Road 40 E',
  },
  ONT8: {
    zipCode: '92551',
    consignee: 'ONT8',
    city: 'MORENO VALLEY',
    state: 'CA',
    addressDetail: '24300 Nandina Ave',
  },
  ABE2: {
    zipCode: '18031',
    consignee: 'ABE2',
    city: 'BREINIGSVILLE',
    state: 'PA',
    addressDetail: '705 Boulder Dr',
  },
  FTW1: {
    zipCode: '75241',
    consignee: 'FTW1',
    city: 'DALLAS',
    state: 'TX',
    addressDetail: '33333 LBJ Freeway',
  },
};
