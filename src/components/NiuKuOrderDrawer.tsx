import React, { useState } from 'react';
import { X } from 'lucide-react';

type BaseForm = {
  channel: string;
  type: string;
  deliveryType: string;
  departurePort: string;
  tax: string;
  lastMile: string;
  containerNo: string;
  vessel: string;
  customs: string;
  destinationPort: string;
  containerType: string;
  chassis: string;
  etd: string;
  eta: string;
  soBill: string;
  carrier: string;
  customerCode: string;
  needPickup: string;
  needUnpack: string;
  outsideFreeDays: string;
  multiTaxNo: string;
  dgContainer: string;
  shipperName: string;
  shipperAddress: string;
  shipperPostcode: string;
  shipperCity: string;
  vatCountry: string;
  vatNo: string;
  eori: string;
  importerName: string;
  importerPostcode: string;
  importerCity: string;
};

type DeliveryRow = {
  id: number;
  waybill: string;
  deliveryMethod: string;
  deliveryType: string;
  code: string;
  warehouse: string;
  fba: string;
  reference: string;
  pieces: string;
  weight: string;
  volume: string;
  address: string;
  zip: string;
  size: string;
  wood: string;
  pallets: string;
  value: string;
  product: string;
  requirement: string;
  lift: string;
  etaStart: string;
  etaEnd: string;
  productEn: string;
  material: string;
  hs: string;
  productQty: string;
  unit: string;
  unitPrice: string;
  totalPrice: string;
  link: string;
  screenshot: string;
  netWeight: string;
  boxNo: string;
};

const initialBase = (container: string, bill: string): BaseForm => ({
  channel: '美国转运',
  type: '海运',
  deliveryType: '拆柜',
  departurePort: '盐田 YTN',
  tax: '含税',
  lastMile: '柜子',
  containerNo: container || 'CSGU08040079',
  vessel: 'COSCO',
  customs: '是',
  destinationPort: '美国 LAX',
  containerType: '40HQ',
  chassis: '否',
  etd: '2026-09-18',
  eta: '2026-10-06',
  soBill: bill,
  carrier: '中远海运',
  customerCode: '',
  needPickup: '否',
  needUnpack: '是',
  outsideFreeDays: '',
  multiTaxNo: '否',
  dgContainer: '否',
  shipperName: '',
  shipperAddress: '',
  shipperPostcode: '',
  shipperCity: '',
  vatCountry: '美国',
  vatNo: '',
  eori: '',
  importerName: '',
  importerPostcode: '',
  importerCity: '',
});

const initialRows: DeliveryRow[] = [
  { id: 1, waybill: 'USGZ202609030262', deliveryMethod: '卡派', deliveryType: '中转', code: 'Non', warehouse: 'PHL3', fba: '', reference: '', pieces: '50', weight: '500.00', volume: '7.00', address: '/', zip: '/', size: '50*50*50', wood: '0', pallets: '0', value: '/', product: '/', requirement: '', lift: '否', etaStart: '', etaEnd: '', productEn: '', material: '', hs: '', productQty: '50', unit: '个', unitPrice: '', totalPrice: '', link: '', screenshot: '', netWeight: '500.00', boxNo: '' },
  { id: 2, waybill: 'USGZ202609070001', deliveryMethod: '卡派', deliveryType: '私人地址', code: '私人地址必填', warehouse: '私人地址', fba: '/', reference: '/', pieces: '2', weight: '15.37', volume: '0.279', address: '请提供完整地址、预约方式', zip: '私人地址必填', size: '50*50*50', wood: '0', pallets: '0', value: '私人地址必填', product: '私人地址必填', requirement: '', lift: '否', etaStart: '', etaEnd: '', productEn: '', material: '', hs: '', productQty: '2', unit: '个', unitPrice: '', totalPrice: '', link: '', screenshot: '', netWeight: '15.37', boxNo: '' },
  { id: 3, waybill: 'USSZAS2609070483', deliveryMethod: 'fedex快递派', deliveryType: '中转', code: 'Non', warehouse: 'JCR美西新仓', fba: '/', reference: '/', pieces: '5', weight: '83.75', volume: '0.780', address: '/', zip: '/', size: '50*50*50', wood: '0', pallets: '0', value: '/', product: '/', requirement: '', lift: '否', etaStart: '', etaEnd: '', productEn: '', material: '', hs: '', productQty: '5', unit: '个', unitPrice: '', totalPrice: '', link: '', screenshot: '', netWeight: '83.75', boxNo: '' },
  { id: 4, waybill: 'USSZAS2609070485', deliveryMethod: '卡派', deliveryType: '中转', code: 'Non', warehouse: 'SBD1', fba: 'FBA19P308J6K', reference: '6GAJOKEP', pieces: '3', weight: '50.10', volume: '0.466', address: '/', zip: '/', size: '50*50*50', wood: '0', pallets: '0', value: '/', product: '/', requirement: '', lift: '否', etaStart: '', etaEnd: '', productEn: '', material: '', hs: '', productQty: '3', unit: '个', unitPrice: '', totalPrice: '', link: '', screenshot: '', netWeight: '50.10', boxNo: '' },
  { id: 5, waybill: 'USSZ202609080618', deliveryMethod: 'ups快递派', deliveryType: '中转', code: 'Non', warehouse: 'Walmart-MEM1s', fba: '/', reference: '/', pieces: '1', weight: '14.27', volume: '0.087', address: '/', zip: '/', size: '50*50*50', wood: '0', pallets: '0', value: '/', product: '/', requirement: '', lift: '否', etaStart: '', etaEnd: '', productEn: '', material: '', hs: '', productQty: '1', unit: '个', unitPrice: '', totalPrice: '', link: '', screenshot: '', netWeight: '14.27', boxNo: '' },
  { id: 6, waybill: 'USSZ202609080619', deliveryMethod: '卡派', deliveryType: '中转', code: 'Non', warehouse: 'Walmart-PHL5s', fba: '/', reference: '/', pieces: '13', weight: '212.64', volume: '1.033', address: '/', zip: '/', size: '50*50*50', wood: '0', pallets: '0', value: '/', product: '/', requirement: '', lift: '否', etaStart: '', etaEnd: '', productEn: '', material: '', hs: '', productQty: '13', unit: '个', unitPrice: '', totalPrice: '', link: '', screenshot: '', netWeight: '212.64', boxNo: '' },
  { id: 7, waybill: 'USSZ202609080620', deliveryMethod: '卡派', deliveryType: '中转', code: 'Non', warehouse: 'Walmart-LAX1', fba: '/', reference: '/', pieces: '2', weight: '32.06', volume: '0.168', address: '/', zip: '/', size: '50*50*50', wood: '0', pallets: '0', value: '/', product: '/', requirement: '', lift: '否', etaStart: '', etaEnd: '', productEn: '', material: '', hs: '', productQty: '2', unit: '个', unitPrice: '', totalPrice: '', link: '', screenshot: '', netWeight: '32.06', boxNo: '' },
];

const inputClass = 'h-7 w-full rounded border border-slate-200 bg-white px-2 text-[11px] text-slate-700 outline-none focus:border-[#168ff5]';
const labelClass = 'text-[11px] text-slate-600';
const required = (label: string) => <span>{label}<b className="ml-0.5 text-red-500">*</b></span>;

export default function NiuKuOrderDrawer({ open, bill, container, onClose, addToast }: { open: boolean; bill: string; container: string; onClose: () => void; addToast: (message: string, type: 'success' | 'info' | 'warning') => void }) {
  const [base, setBase] = useState<BaseForm>(() => initialBase(container, bill));
  const [rows, setRows] = useState<DeliveryRow[]>(initialRows);
  const [note, setNote] = useState('');

  if (!open) return null;

  const updateBase = (key: keyof BaseForm, value: string) => setBase((current) => ({ ...current, [key]: value }));
  const updateRow = (id: number, key: Exclude<keyof DeliveryRow, 'id'>, value: string) => {
    setRows((current) => current.map((row) => row.id === id ? { ...row, [key]: value } : row));
  };
  const addRow = () => {
    const id = rows.length ? Math.max(...rows.map((row) => row.id)) + 1 : 1;
    setRows((current) => [...current, {
      ...initialRows[0],
      id,
      waybill: '',
      warehouse: '',
      pieces: '1',
      weight: '0',
      volume: '0',
      productQty: '1',
      netWeight: '0',
      fba: '',
      reference: '',
      address: '',
      zip: '',
      value: '',
      product: '',
      productEn: '',
      material: '',
      hs: '',
      unitPrice: '',
      totalPrice: '',
      link: '',
      screenshot: '',
      boxNo: '',
    }]);
  };
  const removeRow = (id: number) => setRows((current) => current.filter((row) => row.id !== id).map((row, index) => ({ ...row, id: index + 1 })));
  const renderBaseInput = (label: string, key: keyof BaseForm, requiredField = false, type = 'text') => (
    <label className="flex min-w-0 items-center gap-2">
      <span className={labelClass + ' shrink-0 text-right'}>{requiredField ? required(label) : label}</span>
      <input type={type} value={base[key]} onChange={(event) => updateBase(key, event.target.value)} className={inputClass} />
    </label>
  );
  const renderBaseSelect = (label: string, key: keyof BaseForm, options: string[], requiredField = false) => (
    <label className="flex min-w-0 items-center gap-2">
      <span className={labelClass + ' shrink-0 text-right'}>{requiredField ? required(label) : label}</span>
      <select value={base[key]} onChange={(event) => updateBase(key, event.target.value)} className={inputClass}>{options.map((option) => <option key={option}>{option}</option>)}</select>
    </label>
  );
  const renderRowInput = (row: DeliveryRow, key: Exclude<keyof DeliveryRow, 'id'>, placeholder = '') => (
    <input value={row[key]} onChange={(event) => updateRow(row.id, key, event.target.value)} placeholder={placeholder} className={inputClass} />
  );
  const renderRowSelect = (row: DeliveryRow, key: 'deliveryMethod' | 'deliveryType' | 'lift', options: string[]) => (
    <select value={row[key]} onChange={(event) => updateRow(row.id, key, event.target.value)} className={inputClass}>{options.map((option) => <option key={option}>{option}</option>)}</select>
  );

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/55" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside className="absolute right-0 top-0 flex h-full w-[78vw] min-w-[1180px] max-w-[1720px] flex-col bg-white shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex h-11 shrink-0 items-center justify-between border-b border-slate-200 px-4">
          <h2 className="flex items-center gap-2 text-[15px] font-bold text-slate-800"><span className="h-4 w-1 rounded bg-[#0759b6]" />推送纽酷下单-{bill}</h2>
          <button type="button" onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-3">
          <button type="button" onClick={addRow} className="rounded bg-[#0759b6] px-4 py-1.5 text-xs font-semibold text-white">增加</button>
          <div className="flex gap-2">
            <button type="button" onClick={() => { addToast('纽酷平台推送下单成功', 'success'); onClose(); }} className="rounded bg-[#0759b6] px-4 py-1.5 text-xs font-semibold text-white">推送下单</button>
            <button type="button" onClick={onClose} className="rounded border border-slate-200 px-4 py-1.5 text-xs text-slate-600">关闭</button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-auto px-5 pb-6">
          <section>
            <h3 className="border-b border-slate-100 py-3 text-[14px] font-bold text-slate-800">基础柜单信息</h3>
            <div className="grid grid-cols-3 gap-x-8 gap-y-2.5 py-3">
              {renderBaseSelect('渠道方式', 'channel', ['美国转运', '欧盟铁路尾程拆派', '美国迈阿密'], true)}
              {renderBaseSelect('类型', 'type', ['海运', '铁路', '空运'], true)}
              {renderBaseSelect('派送类型', 'deliveryType', ['拆柜', '整柜', '清关'], true)}
              {renderBaseSelect('出运港', 'departurePort', ['盐田 YTN', '河内机场 HAN', '上海港 SHA', '宁波港 NGB'], true)}
              {renderBaseSelect('是否含税', 'tax', ['含税', '不含税'], true)}
              {renderBaseSelect('尾程类型', 'lastMile', ['柜子', '散货', '快递'], true)}
              {renderBaseInput('柜号', 'containerNo', true)}
              {renderBaseInput('船名航次', 'vessel')}
              {renderBaseSelect('是否清关', 'customs', ['是', '否'], true)}
              {renderBaseSelect('目的港', 'destinationPort', ['美国 LAX', '美国 JFK', '巴黎 CDG', '洛杉矶 LAX'], true)}
              {renderBaseSelect('柜型', 'containerType', ['40HQ', '40NOR', '20GP', '45HQ'], true)}
              {renderBaseSelect('车架', 'chassis', ['否', '是'], true)}
              {renderBaseInput('Etd', 'etd', true, 'date')}
              {renderBaseInput('Eta', 'eta', true, 'date')}
              {renderBaseSelect('需要提柜', 'needPickup', ['否', '是'], true)}
              {renderBaseInput('SO号/提单号', 'soBill', true)}
              {renderBaseInput('船公司', 'carrier')}
              {renderBaseInput('客户代码', 'customerCode')}
              {renderBaseSelect('需要拆柜', 'needUnpack', ['是', '否'], true)}
              {renderBaseInput('场外免箱期', 'outsideFreeDays')}
              {renderBaseSelect('是否多税号', 'multiTaxNo', ['否', '是'], true)}
              {renderBaseSelect('是否DG柜', 'dgContainer', ['否', '是'])}
            </div>
            <label className="flex items-start gap-2 pb-3">
              <span className={labelClass + ' w-[74px] shrink-0 pt-1 text-right'}>备注</span>
              <textarea value={note} onChange={(event) => setNote(event.target.value)} className="h-12 flex-1 resize-none rounded border border-slate-200 px-2 py-1 text-[11px] outline-none focus:border-[#168ff5] placeholder:text-slate-400" placeholder="请输入内容，最多200字" maxLength={200} />
            </label>
          </section>

          <section>
            <h3 className="border-b border-slate-100 py-3 text-[14px] font-bold text-slate-800">发货人及进口商信息</h3>
            <div className="grid grid-cols-2 gap-x-10 gap-y-2.5 py-3">
              {renderBaseInput('发货人公司名称', 'shipperName')}
              {renderBaseInput('进口商名称', 'importerName')}
              {renderBaseInput('公司详细地址', 'shipperAddress')}
              {renderBaseInput('进口商邮编', 'importerPostcode')}
              {renderBaseInput('公司所在地邮编', 'shipperPostcode')}
              {renderBaseInput('城市', 'importerCity')}
              {renderBaseInput('公司所在地城市', 'shipperCity')}
              {renderBaseInput('VAT注册国', 'vatCountry')}
              {renderBaseInput('增值税号VAT', 'vatNo')}
              {renderBaseInput('登记号EORI', 'eori')}
            </div>
          </section>

          <section>
            <div className="flex items-end justify-between border-b border-slate-100 py-3">
              <div>
                <h3 className="text-[14px] font-bold text-slate-800">尾程派送明细</h3>
                <p className="mt-1 text-[11px] text-slate-400">欧盟和英国订单的产品申报字段按模板填写；美国订单可按业务要求补充。</p>
              </div>
              <span className="text-[11px] text-slate-400">共 {rows.length} 条</span>
            </div>
            <div className="mt-3 overflow-x-auto rounded border border-slate-200">
              <table className="min-w-[4860px] border-collapse text-[11px] text-slate-600">
                <thead className="bg-slate-50">
                  <tr className="h-9">
                    <th className="sticky left-0 z-10 w-9 border border-slate-200 bg-slate-50">#</th>
                    <th className="w-44 border border-slate-200">运单号</th>
                    <th className="w-32 border border-slate-200">派送方式(*)</th>
                    <th className="w-28 border border-slate-200">类型(*)</th>
                    <th className="w-32 border border-slate-200">留仓/分货识别码</th>
                    <th className="w-32 border border-slate-200">目的仓(*)</th>
                    <th className="w-36 border border-slate-200">FBA#</th>
                    <th className="w-36 border border-slate-200">Reference ID</th>
                    <th className="w-20 border border-slate-200">件数(*)</th>
                    <th className="w-24 border border-slate-200">重量(KG)(*)</th>
                    <th className="w-24 border border-slate-200">体积(CBM)(*)</th>
                    <th className="w-48 border border-slate-200">详细地址</th>
                    <th className="w-24 border border-slate-200">邮编</th>
                    <th className="w-32 border border-slate-200">尺寸(长*宽*高)</th>
                    <th className="w-20 border border-slate-200">木箱（*）</th>
                    <th className="w-20 border border-slate-200">托盘数（*）</th>
                    <th className="w-24 border border-slate-200">货值</th>
                    <th className="w-32 border border-slate-200">产品名称</th>
                    <th className="w-32 border border-slate-200">派送要求</th>
                    <th className="w-24 border border-slate-200">是否需要升降机</th>
                    <th className="w-32 border border-slate-200">亚马逊预计送达时间-开始</th>
                    <th className="w-32 border border-slate-200">亚马逊预计送达时间-结束</th>
                    <th className="w-32 border border-slate-200">产品名称（英文）*</th>
                    <th className="w-28 border border-slate-200">材质*</th>
                    <th className="w-28 border border-slate-200">海关编码*</th>
                    <th className="w-24 border border-slate-200">产品数量*</th>
                    <th className="w-24 border border-slate-200">产品数量单位*</th>
                    <th className="w-24 border border-slate-200">申报单价*</th>
                    <th className="w-24 border border-slate-200">申报总价*</th>
                    <th className="w-36 border border-slate-200">销售链接*</th>
                    <th className="w-32 border border-slate-200">定价截图*</th>
                    <th className="w-24 border border-slate-200">净重*</th>
                    <th className="w-32 border border-slate-200">FBA箱号</th>
                    <th className="sticky right-0 z-10 w-16 border border-slate-200 bg-slate-50">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="align-top">
                      <td className="sticky left-0 z-10 border border-slate-200 bg-white p-2 text-center">{row.id}</td>
                      <td className="border border-slate-200 p-1">{renderRowInput(row, 'waybill', '运单号')}</td>
                      <td className="border border-slate-200 p-1">{renderRowSelect(row, 'deliveryMethod', ['卡派', 'fedex快递派', 'ups快递派', '自提', '留仓'])}</td>
                      <td className="border border-slate-200 p-1">{renderRowSelect(row, 'deliveryType', ['中转', '私人地址', '整柜'])}</td>
                      <td className="border border-slate-200 p-1">{renderRowInput(row, 'code')}</td>
                      <td className="border border-slate-200 p-1">{renderRowInput(row, 'warehouse', '目的仓')}</td>
                      <td className="border border-slate-200 p-1">{renderRowInput(row, 'fba', 'FBA#')}</td>
                      <td className="border border-slate-200 p-1">{renderRowInput(row, 'reference', 'Reference ID')}</td>
                      <td className="border border-slate-200 p-1">{renderRowInput(row, 'pieces')}</td>
                      <td className="border border-slate-200 p-1">{renderRowInput(row, 'weight')}</td>
                      <td className="border border-slate-200 p-1">{renderRowInput(row, 'volume')}</td>
                      <td className="border border-slate-200 p-1">{renderRowInput(row, 'address')}</td>
                      <td className="border border-slate-200 p-1">{renderRowInput(row, 'zip')}</td>
                      <td className="border border-slate-200 p-1">{renderRowInput(row, 'size')}</td>
                      <td className="border border-slate-200 p-1">{renderRowInput(row, 'wood')}</td>
                      <td className="border border-slate-200 p-1">{renderRowInput(row, 'pallets')}</td>
                      <td className="border border-slate-200 p-1">{renderRowInput(row, 'value')}</td>
                      <td className="border border-slate-200 p-1">{renderRowInput(row, 'product')}</td>
                      <td className="border border-slate-200 p-1">{renderRowInput(row, 'requirement')}</td>
                      <td className="border border-slate-200 p-1">{renderRowSelect(row, 'lift', ['否', '是'])}</td>
                      <td className="border border-slate-200 p-1">{renderRowInput(row, 'etaStart', 'YYYY-MM-DD')}</td>
                      <td className="border border-slate-200 p-1">{renderRowInput(row, 'etaEnd', 'YYYY-MM-DD')}</td>
                      <td className="border border-slate-200 p-1">{renderRowInput(row, 'productEn')}</td>
                      <td className="border border-slate-200 p-1">{renderRowInput(row, 'material')}</td>
                      <td className="border border-slate-200 p-1">{renderRowInput(row, 'hs')}</td>
                      <td className="border border-slate-200 p-1">{renderRowInput(row, 'productQty')}</td>
                      <td className="border border-slate-200 p-1">{renderRowInput(row, 'unit')}</td>
                      <td className="border border-slate-200 p-1">{renderRowInput(row, 'unitPrice')}</td>
                      <td className="border border-slate-200 p-1">{renderRowInput(row, 'totalPrice')}</td>
                      <td className="border border-slate-200 p-1">{renderRowInput(row, 'link')}</td>
                      <td className="border border-slate-200 p-1">{renderRowInput(row, 'screenshot')}</td>
                      <td className="border border-slate-200 p-1">{renderRowInput(row, 'netWeight')}</td>
                      <td className="border border-slate-200 p-1">{renderRowInput(row, 'boxNo')}</td>
                      <td className="sticky right-0 border border-slate-200 bg-white p-2 text-center"><button type="button" onClick={() => removeRow(row.id)} className="font-semibold text-red-500 hover:text-red-700">删除</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}
