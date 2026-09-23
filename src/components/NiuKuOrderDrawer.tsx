import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import options from './niuKuTemplateOptions.json';
import { isEuropeanOrder, requiresPartyInfo, partyFields } from './niuKuValidation';
import './NiuKuOrderDrawer.css';

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
  destinationCountry: string;
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
  importerAddress: string;
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
  channel: '',
  type: '海运',
  deliveryType: '拆柜',
  departurePort: '盐田 YTN',
  tax: '含税',
  lastMile: '柜子',
  containerNo: container || 'CSGU08040079',
  vessel: 'COSCO',
  customs: '是',
  destinationPort: '洛杉矶 LAX',
  destinationCountry: '美国',
  containerType: '40HQ',
  chassis: '否',
  etd: '2026-09-18',
  eta: '2026-10-06',
  soBill: bill,
  carrier: '中远COS',
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
  vatCountry: '',
  vatNo: '',
  eori: '',
  importerName: '',
  importerAddress: '',
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

const inputClass = 'niuku-input';
const labelClass = 'niuku-label';
const required = (label: string) => <><b className="niuku-required" aria-hidden="true">*</b>{label}：</>;

export default function NiuKuOrderDrawer({ open, bill, container, onClose, addToast }: { open: boolean; bill: string; container: string; onClose: () => void; addToast: (message: string, type: 'success' | 'info' | 'warning') => void }) {
  const [base, setBase] = useState<BaseForm>(() => initialBase(container, bill));
  const [rows, setRows] = useState<DeliveryRow[]>(initialRows);
  const [note, setNote] = useState('');
  useEffect(() => { setBase(initialBase(container, bill)); setRows(initialRows.map(row => ({ ...row }))); setNote(''); }, [container, bill]);
  const partyRequired = requiresPartyInfo(base);
  const showPartyInfo = partyRequired;
  const european = isEuropeanOrder(base);
  const submit = () => {
    if (partyRequired) { const missing = partyFields.filter(([key]) => !base[key].trim()); if (missing.length) { addToast('欧线自税订单请填写：' + missing.map(([, label]) => label).join('、'), 'warning'); return; } }
    const form = document.getElementById('niuku-form') as HTMLFormElement | null; if (!form?.reportValidity()) return;
    if (!rows.length) { addToast('请至少增加一条尾程派送明细', 'warning'); return; }
    addToast('纽酷平台推送下单成功', 'success'); onClose();
  };

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
    <label className="niuku-field">
      <span className={labelClass}>{requiredField ? required(label) : <>{label}：</>}</span>
      <input aria-label={label} placeholder="请输入" required={requiredField} type={type} value={base[key]} onChange={(event) => updateBase(key, event.target.value)} className={inputClass} />
    </label>
  );
  const renderBaseSelect = (label: string, key: keyof BaseForm, values: string[], requiredField = false) => {
    if (values.length === 2 && values.includes('是') && values.includes('否')) {
      return (
        <div className="niuku-field" role="group" aria-label={label}>
          <span className={labelClass}>{requiredField ? required(label) : <>{label}：</>}</span>
          <div className="niuku-radio-group">
            {values.map(value => (
              <label key={value} className="niuku-radio">
                <input type="radio" name={'niuku-' + key} value={value} checked={base[key] === value} required={requiredField} onChange={() => updateBase(key, value)} />
                <span>{value}</span>
              </label>
            ))}
          </div>
        </div>
      );
    }
    return (
      <label className="niuku-field">
        <span className={labelClass}>{requiredField ? required(label) : <>{label}：</>}</span>
        <select aria-label={label} required={requiredField} value={base[key]} onChange={(event) => updateBase(key, event.target.value)} className={inputClass}>
          <option value="">请选择</option>
          {values.map((option, index) => <option key={index} value={option}>{option}</option>)}
        </select>
      </label>
    );
  };
  const renderRowInput = (row: DeliveryRow, key: Exclude<keyof DeliveryRow, 'id'>, placeholder = '') => (
    <input aria-label={String(row.id) + '-' + key} required={['pieces', 'weight', 'volume', 'wood', 'pallets'].includes(key) || (european && ['productEn', 'material', 'hs', 'productQty', 'unitPrice', 'totalPrice', 'link', 'screenshot', 'netWeight'].includes(key))} value={row[key]} onChange={(event) => updateRow(row.id, key, event.target.value)} placeholder={placeholder} className={inputClass} />
  );
  const renderRowSelect = (row: DeliveryRow, key: 'deliveryMethod' | 'deliveryType' | 'lift' | 'warehouse' | 'unit', options: string[]) => (
    <select aria-label={String(row.id) + '-' + key} required={key !== 'lift' && (key !== 'unit' || european)} value={row[key]} onChange={(event) => updateRow(row.id, key, event.target.value)} className={inputClass}><option value="">请选择</option>{options.map((option, index) => <option key={index} value={option}>{option}</option>)}</select>
  );

  return (
    <div className="niuku-overlay fixed inset-0 z-[100]" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside className="niuku-drawer absolute right-0 top-0 flex h-full w-[67vw] min-w-[1080px] max-w-[1500px] flex-col" onMouseDown={(event) => event.stopPropagation()}>
        <div className="niuku-header flex h-10 shrink-0 items-center justify-between px-4">
          <h2 className="flex items-center gap-2 text-[14px] font-bold"><span className="niuku-title-mark" />推送纽酷下单-{bill}</h2>
          <button type="button" aria-label="关闭推送纽酷下单" onClick={onClose} className="niuku-close"><X className="h-4 w-4" /></button>
        </div>
        <div className="niuku-toolbar flex shrink-0 items-center justify-between px-4">
          <button type="button" onClick={addRow} className="niuku-btn niuku-btn-primary">增加</button>
          <div className="flex items-center gap-2">
            <button type="button" onClick={submit} className="niuku-btn niuku-btn-primary">推送下单</button>
            <button type="button" onClick={onClose} className="niuku-btn niuku-btn-secondary">关闭</button>
          </div>
        </div>
        <form id="niuku-form" onSubmit={event => { event.preventDefault(); submit(); }} className="niuku-body min-h-0 flex-1 overflow-auto px-4 pb-8">
          <section>
            <h3 className="niuku-section-title">入库信息</h3>
            <div className="niuku-base-grid">
              {renderBaseSelect('渠道方式', 'channel', options.channels, true)}
              {renderBaseSelect('类型', 'type', options.types, true)}
              {renderBaseSelect('派送类型', 'deliveryType', options.deliveryTypes, true)}
              {renderBaseSelect('出运港', 'departurePort', options.ports, true)}

              {renderBaseSelect('是否含税', 'tax', options.taxes, true)}
              {renderBaseSelect('尾程类型', 'lastMile', options.lastMiles, true)}
              {renderBaseInput('柜号', 'containerNo', true)}
              {renderBaseInput('船名航次', 'vessel')}

              {renderBaseSelect('目的港', 'destinationPort', options.ports, true)}
              {renderBaseSelect('柜型', 'containerType', options.containerTypes, true)}
              {renderBaseSelect('车架', 'chassis', options.yesNo, true)}
              {renderBaseSelect('是否清关', 'customs', options.yesNo, true)}

              {renderBaseInput('Etd', 'etd', true, 'date')}
              {renderBaseInput('Eta', 'eta', true, 'date')}
              {renderBaseSelect('目的港国家', 'destinationCountry', options.countries, true)}
              {renderBaseSelect('需要提柜', 'needPickup', options.yesNo, true)}

              {renderBaseInput('SO号/提单号', 'soBill', true)}
              {renderBaseSelect('船公司', 'carrier', options.carriers, true)}
              {renderBaseInput('客户代码', 'customerCode', true)}
              {renderBaseSelect('需要拆柜', 'needUnpack', options.yesNo, true)}

              {renderBaseInput('场外免箱期', 'outsideFreeDays')}
              <label className="niuku-field niuku-note-field">
                <span className={labelClass}>备注：</span>
                <span className="niuku-note-control">
                  <textarea aria-label="备注" value={note} onChange={(event) => setNote(event.target.value)} className="niuku-input" placeholder="请输入内容" maxLength={200} />
                  <span className="niuku-note-count">{note.length}/200</span>
                </span>
              </label>
              {renderBaseSelect('是否多税号', 'multiTaxNo', options.yesNo, true)}

              {renderBaseSelect('是否DG柜', 'dgContainer', options.noYes, true)}
            </div>
          </section>

          {showPartyInfo && <section>
            <h3 className="niuku-section-title">发货人及进口商信息</h3>
            <p className={partyRequired ? 'niuku-party-hint is-required' : 'niuku-party-hint'}>{partyRequired ? '当前为欧线自税订单，发货人信息和进口商信息必填。' : '仅欧线自税订单需填写；含税渠道及非欧线订单可不填写。'}</p>
            <div className="niuku-party-stack">
              <div className="niuku-party-block">
                <div className="niuku-party-block-title">
                  <span className="niuku-party-index">1</span>
                  <div><h4>发货人信息</h4><p>请全拼填写，不能包含中文；美线订单可不填写</p></div>
                </div>
                <div className="niuku-party-fields">
                  {partyFields.filter(([key]) => key.startsWith('shipper')).map(([key, label]) => <React.Fragment key={key}>{renderBaseInput(label, key, partyRequired)}</React.Fragment>)}
                </div>
              </div>
              <div className="niuku-party-block">
                <div className="niuku-party-block-title">
                  <span className="niuku-party-index">2</span>
                  <div><h4>进口商信息</h4><p>请与 VAT 证书保持一致；美线订单可不填写</p></div>
                </div>
                <div className="niuku-party-fields">
                  {partyFields.filter(([key]) => !key.startsWith('shipper')).map(([key, label]) => <React.Fragment key={key}>{key === 'vatCountry' ? renderBaseSelect(label, key, options.countries, partyRequired) : renderBaseInput(label, key, partyRequired)}</React.Fragment>)}
                </div>
              </div>
            </div>
          </section>}

          <section>
            <div className="flex items-end justify-between border-b border-slate-100 py-3">
              <div>
                <h3 className="niuku-section-title">尾程派送明细</h3>
                <p className="mt-1 text-[11px] text-slate-400">欧盟和英国订单需填写产品申报字段，其他国家可不填写。亚马逊/沃尔玛请填写FBA#及Reference ID；私人地址请填写完整地址、预约方式、邮编、货值及产品名称。</p>
              </div>
              <span className="text-[11px] text-slate-400">共 {rows.length} 条</span>
            </div>
            <div className="niuku-table-wrap mt-2 overflow-x-auto">
              <table className="min-w-[4860px] border-collapse text-[11px] text-[#5f6974]">
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
                      <td className="border border-slate-200 p-1">{renderRowSelect(row, 'deliveryMethod', options.deliveryMethods)}</td>
                      <td className="border border-slate-200 p-1">{renderRowSelect(row, 'deliveryType', options.rowTypes)}</td>
                      <td className="border border-slate-200 p-1">{renderRowInput(row, 'code')}</td>
                      <td className="border border-slate-200 p-1">{renderRowSelect(row, 'warehouse', options.warehouses)}</td>
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
                      <td className="border border-slate-200 p-1">{renderRowSelect(row, 'unit', options.units)}</td>
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
        </form>
      </aside>
    </div>
  );
}
