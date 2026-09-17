import React, { useMemo, useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronRight, Search } from 'lucide-react';

const inputClass = 'h-8 rounded border border-[#d8e0ec] bg-white px-3 text-xs outline-none placeholder:text-[#b8c3d4] focus:border-[#409eff]';
const buttonClass = 'h-8 rounded border border-[#d8e0ec] bg-white px-4 text-xs hover:border-[#409eff] hover:text-[#409eff]';
const primaryClass = 'h-8 rounded bg-[#004bb1] px-5 text-xs font-bold text-white hover:bg-[#003b91] disabled:cursor-not-allowed disabled:opacity-40';

// Static demo shipments for the GitHub Pages prototype.
const shipments = [2, 18, 20, 16].map((count, index) => ({
  id: 'USSZ2026091400' + (11 + index),
  customer: index === 3 ? '深圳测试客户' : '塘厦测试客户',
  customerOrder: 'TX20260914' + String(index + 1).padStart(3, '0'),
  shipment: 'FBA19TX' + String(index + 1).padStart(5, '0'),
  reference: 'REF20260914' + String(index + 1).padStart(3, '0'),
  warehouse: 'US-LAX-01',
  service: '标准派送',
  country: '美国',
  recipient: ['张伟', '李娜', '王强', '陈静'][index],
  company: ['Amazon FBA LAX9', 'Amazon FBA ONT8', 'Amazon FBA SBD1', 'Amazon FBA LGB8'][index],
  address1: ['1234 S Main St', '5567 E Industrial Pkwy', '8890 Harvill Ave', '3300 E Philadelphia St'][index],
  city: ['洛杉矶', '安大略', '佩里斯', '奇诺'][index],
  state: 'CA',
  zip: ['90014', '91761', '92571', '91710'][index],
  boxes: Array.from({ length: count }, (_, boxIndex) => ({
    id: 'USSZ2026091400' + (11 + index) + '-' + String(boxIndex + 1).padStart(3, '0'),
    ordered: index === 0,
    product: boxIndex % 2 === 0 ? '收纳盒' : '家居用品',
    weight: (12 + boxIndex * 0.5).toFixed(2),
    size: '40 × 30 × 20',
  })),
}));

interface Props {
  instructionType: string;
  requirement: string;
  completed: boolean;
  onBack: () => void;
  onComplete: () => void;
}

export default function CustomerInstructionBoxSelection({ instructionType, requirement, completed, onBack, onComplete }: Props) {
  const interceptMode = instructionType === '拦截';
  const [waybill, setWaybill] = useState('');
  const [customer, setCustomer] = useState('');
  const [filters, setFilters] = useState({ waybill: '', customer: '' });
  const [expanded, setExpanded] = useState<string[]>([shipments[0].id]);
  const [selected, setSelected] = useState<string[]>([]);
  const [selectedWaybills, setSelectedWaybills] = useState<string[]>([]);
  const visible = useMemo(() => shipments.filter((item) =>
    item.id.toLowerCase().includes(filters.waybill.toLowerCase()) &&
    item.customer.includes(filters.customer)), [filters]);
  const availableCount = shipments.reduce((total, item) => total + item.boxes.filter((box) => !box.ordered).length, 0);
  const selectedShipments = interceptMode
    ? shipments.filter((item) => selectedWaybills.includes(item.id))
    : shipments.filter((item) => item.boxes.some((box) => selected.includes(box.id)));
  const selectedCount = interceptMode ? selectedWaybills.length : selected.length;
  const search = () => setFilters({ waybill: waybill.trim(), customer: customer.trim() });
  const toggleBoxes = (ids: string[], checked: boolean) => setSelected((previous) =>
    checked ? [...new Set([...previous, ...ids])] : previous.filter((id) => !ids.includes(id)));
  const toggleWaybill = (id: string, checked: boolean) => setSelectedWaybills((previous) =>
    checked ? [...new Set([...previous, id])] : previous.filter((item) => item !== id));

  if (completed) {
    return (
      <section className="rounded-md bg-white px-5 py-16 text-center shadow-sm" aria-live="polite">
        <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" />
        <h2 className="mt-5 text-xl font-bold text-slate-900">提交完成</h2>
        <p className="mt-3 text-sm text-slate-600">
          {interceptMode
            ? `已确认 ${selectedWaybills.length} 票运单的拦截指令。`
            : `已确认 ${selectedShipments.length} 票运单，共 ${selected.length} 箱的${instructionType}指令。`}
        </p>
        <p className="mt-2 text-xs text-slate-400">当前为演示数据，本次操作未发送至仓库。</p>
      </section>
    );
  }

  return (
    <section className="rounded-md bg-white px-5 py-5 shadow-[0_2px_10px_rgba(15,23,42,0.08)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-bold text-slate-950">{interceptMode ? '全部运单（按运单选择拦截）' : '全部客户的指令运单'}</h2>
        {interceptMode ? (
          <span aria-live="polite" className={`rounded border px-3 py-2 text-xs ${selectedWaybills.length ? 'border-[#b3d8ff] bg-[#ecf5ff] text-[#409eff]' : 'border-[#dfe6f1] bg-[#f5f7fa] text-slate-400'}`}>
            已勾选运单：<b className="text-sm">{selectedWaybills.length}</b> 票
          </span>
        ) : (
          <span className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-600">
            当前可同单箱数：<b>{availableCount}</b> 箱
          </span>
        )}
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-xs">
          运单号
          <input className={inputClass} placeholder="请输入运单号" value={waybill} onChange={(event) => setWaybill(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); search(); } }} />
        </label>
        <label className="flex items-center gap-2 text-xs">
          客户名称
          <input className={inputClass} placeholder="请输入客户名称" value={customer} onChange={(event) => setCustomer(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); search(); } }} />
        </label>
        <button type="button" onClick={search} className={primaryClass + ' inline-flex items-center gap-1'}><Search className="h-3.5 w-3.5" />搜索</button>
        <button type="button" className={buttonClass} onClick={() => { setWaybill(''); setCustomer(''); setFilters({ waybill: '', customer: '' }); }}>重置</button>
      </div>
      <div className="my-5 flex flex-wrap gap-x-12 gap-y-2 rounded bg-[#f5f7fa] px-4 py-3 text-xs">
        <div>派送费：<b className="text-[#409eff]">50.00 美元/CBM</b></div>
        <div>指令要求：{requirement.trim() || '按方计费，$50/CBM'}</div>
      </div>
      <div className="space-y-3">
        {visible.map((item) => {
          const open = expanded.includes(item.id);
          const availableIds = item.boxes.filter((box) => !box.ordered).map((box) => box.id);
          const allChecked = availableIds.length > 0 && availableIds.every((id) => selected.includes(id));
          const someChecked = availableIds.some((id) => selected.includes(id));
          const waybillChecked = selectedWaybills.includes(item.id);
          return (
            <article key={item.id} className="overflow-hidden rounded border border-[#dfe6f1]">
              <div className="flex items-stretch">
                {interceptMode && (
                  <label className="flex shrink-0 items-center gap-2 border-r border-[#dfe6f1] bg-[#f5f7fa] px-4">
                    <input type="checkbox" aria-label={'选择运单 ' + item.id} checked={waybillChecked}
                      onChange={(event) => toggleWaybill(item.id, event.target.checked)} className="h-4 w-4 accent-[#409eff]" />
                    <span className="text-xs font-semibold text-slate-700">选择运单</span>
                  </label>
                )}
                <button type="button" aria-expanded={open} aria-controls={'boxes-' + item.id}
                  onClick={() => setExpanded((previous) => open ? previous.filter((id) => id !== item.id) : [...previous, item.id])}
                  className="flex min-w-0 flex-1 flex-wrap items-center gap-x-7 gap-y-2 bg-[#f5f7fa] px-4 py-3 text-left text-xs hover:bg-blue-50">
                  <span className="inline-flex items-center gap-2 font-bold text-[#409eff]">
                    {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}{item.id}
                  </span>
                  {interceptMode ? (
                    <>
                      <span className="ml-auto flex flex-wrap items-center gap-x-7 gap-y-2">
                        <span className="whitespace-nowrap">客户单号：{item.customerOrder}</span>
                        <span className="whitespace-nowrap">服务：{item.service}</span>
                        <span className="whitespace-nowrap">仓库代码：{item.warehouse}</span>
                        <span className="whitespace-nowrap">国家：{item.country}</span>
                        <span className="whitespace-nowrap">总箱数：{item.boxes.length} 箱</span>
                        {waybillChecked && <span className="whitespace-nowrap text-[#409eff]">已选整票</span>}
                      </span>
                    </>
                  ) : (
                    <>
                      <span>客户：{item.customer}</span>
                      <span>原始箱数：{item.boxes.length} 箱</span>
                      <span>可下单箱数：<b className={availableIds.length ? 'text-emerald-600' : 'text-slate-400'}>{availableIds.length}</b> 箱</span>
                      {someChecked && <span className="text-[#409eff]">已选 {availableIds.filter((id) => selected.includes(id)).length} 箱</span>}
                    </>
                  )}
                </button>
              </div>
              {open && <div id={'boxes-' + item.id}>
                <dl className="grid grid-cols-2 gap-x-8 gap-y-4 px-5 py-5 text-xs leading-5 xl:grid-cols-3">
                  {(interceptMode
                    ? [['收件人', item.recipient], ['公司', item.company], ['地址一', item.address1],
                      ['城市', item.city], ['州', item.state], ['邮编', item.zip]]
                    : [['客户单号', item.customerOrder], ['Shipment ID', item.shipment], ['Reference ID', item.reference],
                      ['客户名称', item.customer], ['海外仓合作代码', item.warehouse], ['服务', item.service]]
                  ).map(([label, value]) => (
                    <div className="flex gap-2" key={label}>
                      <dt className="shrink-0 text-slate-400">{label}：</dt><dd>{value}</dd>
                    </div>
                  ))}
                </dl>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1030px] border-collapse text-xs">
                    <thead className="bg-[#f5f7fa]">
                      <tr>
                        <th className="border border-[#dfe6f1] px-3 py-3">#</th>
                        {!interceptMode && <th className="border border-[#dfe6f1] px-3 py-3">
                          <label className="inline-flex items-center gap-2">
                            <input type="checkbox" aria-label={'全选 ' + item.id} checked={allChecked} disabled={!availableIds.length}
                              ref={(input) => { if (input) input.indeterminate = someChecked && !allChecked; }}
                              onChange={(event) => toggleBoxes(availableIds, event.target.checked)} className="accent-[#409eff]" />选择
                          </label>
                        </th>}
                        {['箱编号', '指令类型', '已下指令', '产品中文名', '重量(KG)', '箱规(CM)', '客户指定是否装箱'].map((label) =>
                          <th key={label} className="whitespace-nowrap border border-[#dfe6f1] px-3 py-3 text-left">{label}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {item.boxes.map((box, index) => (
                        <tr key={box.id} className={(!interceptMode && selected.includes(box.id)) ? 'bg-blue-50' : 'hover:bg-slate-50'}>
                          <td className="border border-[#dfe6f1] px-3 py-3 text-center">{index + 1}</td>
                          {!interceptMode && <td className="border border-[#dfe6f1] px-3 py-3 text-center">
                            <input type="checkbox" aria-label={'选择箱子 ' + box.id} checked={selected.includes(box.id)} disabled={box.ordered}
                              onChange={(event) => toggleBoxes([box.id], event.target.checked)} className="accent-[#409eff]" />
                          </td>}
                          <td className="whitespace-nowrap border border-[#dfe6f1] px-3 py-3 text-[#409eff]">{box.id}</td>
                          <td className="border border-[#dfe6f1] px-3 py-3">{instructionType}</td>
                          <td className="border border-[#dfe6f1] px-3 py-3">{box.ordered ? '已下指令' : '—'}</td>
                          <td className="border border-[#dfe6f1] px-3 py-3">{box.product}</td>
                          <td className="border border-[#dfe6f1] px-3 py-3">{box.weight}</td>
                          <td className="whitespace-nowrap border border-[#dfe6f1] px-3 py-3">{box.size}</td>
                          <td className="border border-[#dfe6f1] px-3 py-3">否</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>}
            </article>
          );
        })}
        {!visible.length && <div className="rounded border border-dashed border-slate-200 py-16 text-center text-sm text-slate-400">没有找到符合条件的运单</div>}
      </div>
      <footer className="sticky bottom-0 -mx-5 -mb-5 mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#e5eaf2] bg-white px-5 py-4">
        <span aria-live="polite" className="text-xs text-slate-500">
          {interceptMode
            ? <>已选择 <b className="text-[#409eff]">{selectedWaybills.length}</b> 票运单</>
            : <>已选择 <b className="text-[#409eff]">{selected.length}</b> 箱</>}
        </span>
        <div className="flex gap-3">
          <button type="button" className={buttonClass} onClick={onBack}>上一步</button>
          <button type="button" className={primaryClass} disabled={!selectedCount} onClick={onComplete}>下一步：提交完成</button>
        </div>
      </footer>
    </section>
  );
}
