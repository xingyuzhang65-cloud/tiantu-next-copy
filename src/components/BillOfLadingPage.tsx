import React, { useMemo, useState } from 'react';
import { ChevronDown, Download, Plus, RefreshCw, Search, Settings2, Trash2 } from 'lucide-react';
import NiuKuOrderDrawer from './NiuKuOrderDrawer';

type BillRow = {
  container: string;
  bill: string;
  ref: string;
  type: string;
  route: string;
  business: string;
  order: string;
  line: string;
  boxes: number;
  actual: string;
  volume: string;
  weight: string;
  fee: string;
  consignee: string;
  ratio: string;
};

const rows: BillRow[] = [
  { container: 'CSGU8040079', bill: '950805741', ref: 'TYT#A1716-COSCO', type: '海运', route: '美线', business: '深圳天图', order: '未挂单', line: '盐田 - 长滩', boxes: 882, actual: '13070.15', volume: '74.422', weight: '12340.14', fee: '15276', consignee: 'PARIER TRADING CO LTD', ratio: '175' },
  { container: 'MATU2609748', bill: 'MATS5442165000', ref: 'TTS#2094-MATS-正', type: '海运', route: '美线', business: '深圳天图', order: '未挂单', line: '宁波港 - 长滩', boxes: 833, actual: '15329.13', volume: '74.428', weight: '12336.76', fee: '16265', consignee: '', ratio: '205' },
  { container: 'FFAU1254928', bill: '181DY26D0211068D1', ref: 'TCH#J750-芝加哥', type: '海运', route: '-', business: '深圳天图', order: '未挂单', line: '盐田 - 美国芝加哥', boxes: 1349, actual: '11818.05', volume: '74.515', weight: '12315.57', fee: '13343.9', consignee: 'Swift River Trading LTD', ratio: '158' },
  { container: 'CSNU7014578', bill: '8882833200', ref: 'TTZH#465-加拿大', type: '海运', route: '-', business: '深圳天图', order: '未挂单', line: '盐田 - 卡尔加里', boxes: 841, actual: '12325.13', volume: '75.17', weight: '12467.96', fee: '14005', consignee: 'ORYX TRADING LTD', ratio: '163' },
  { container: 'ONEU4158515', bill: 'TTSAV#574-萨凡纳', ref: 'TTSAV#574-萨凡纳', type: '海运', route: '美线', business: '深圳天图', order: '未挂单', line: '上海-洋山港 - 萨凡纳', boxes: 1223, actual: '9784.28', volume: '74.67', weight: '12364.46', fee: '12635', consignee: 'AAI TRADING CO LTD', ratio: '131' },
  { container: 'SMCU1151065', bill: 'TTZH#442-加拿大', ref: 'TTZH#442-加拿大', type: '海运', route: '-', business: '深圳天图', order: '未挂单', line: '盐田 - 多伦多', boxes: 808, actual: '11369.47', volume: '75.081', weight: '12463.11', fee: '13720', consignee: 'ORYX TRADING LTD', ratio: '151' },
  { container: '112233', bill: '112233', ref: '9/19美国快铁快线', type: '铁路', route: '-', business: '深圳天图', order: '未挂单', line: '重庆铁路 - 美国', boxes: 0, actual: '0', volume: '0', weight: '0', fee: '0', consignee: '', ratio: '0' },
  { container: 'WHSU5148432', bill: '025G807148', ref: 'TTNY#1570-纽约', type: '海运', route: '美线', business: '深圳天图', order: '未挂单', line: '蛇口 - 纽约', boxes: 853, actual: '10896.38', volume: '74.53', weight: '12348.21', fee: '14345', consignee: '', ratio: '146' },
  { container: 'TCNU7887248', bill: '6467769430', ref: 'TTNY#1565-纽约', type: '海运', route: '美线', business: '深圳天图', order: '未挂单', line: '盐田 - 纽约', boxes: 875, actual: '10921.25', volume: '74.459', weight: '12336.74', fee: '13521', consignee: 'GO TRADING LTD', ratio: '146' },
  { container: 'CSGU7616215', bill: 'ZIMUXIA8587062', ref: 'TTCH#762-芝加哥', type: '海运', route: '-', business: '深圳天图', order: '未挂单', line: '盐田 - 美国芝加哥', boxes: 802, actual: '11505.8', volume: '74.26', weight: '12310.36', fee: '12838', consignee: 'Swift River Trading LTD', ratio: '154' },
  { container: 'GCXU5077939', bill: 'ZIMUXIA8587062', ref: 'TTNY#1560-纽约', type: '海运', route: '美线', business: '深圳天图', order: '未挂单', line: '厦门 - 纽约', boxes: 1048, actual: '11752.49', volume: '73.652', weight: '12197.47', fee: '11954.8', consignee: 'GO TRADING LTD', ratio: '159' },
  { container: 'TGBU6246548', bill: '646719860', ref: 'TTHOU#367-COSCO', type: '海运', route: '美线', business: '深圳天图', order: '未挂单', line: '盐田 - 美国休斯顿', boxes: 902, actual: '10626.71', volume: '74.162', weight: '12294.33', fee: '12531.4', consignee: 'Swift River Trading LTD', ratio: '143' },
];

const tabs = [['待订舱', 6693], ['已订舱', 2486], ['已出发', 13039], ['已到站', 252], ['已清关', 49], ['已完成', 2261], ['已作废', 4], ['全部', 24784]] as const;
const headers = ['柜号', '提单号', '改单', '类型', '线路', '转船', '承运商', '经营单位', '挂单', '航线', '箱数', '实重', '体积', '材重', '收费量', '收货人信息', '体积比', '海运费', '备注', '推送平台', 'POD&ISAI订阅'];

export default function BillOfLadingPage({ addToast }: { addToast: (message: string, type: 'success' | 'info' | 'warning') => void }) {
  const [keyword, setKeyword] = useState('');
  const [billNo, setBillNo] = useState('');
  const [containerNo, setContainerNo] = useState('');
  const [activeTab, setActiveTab] = useState('待订舱');
  const [selected, setSelected] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pushOpen, setPushOpen] = useState(false);
  const [pushMenuOpen, setPushMenuOpen] = useState(false);
  const activeBill = rows.find((row) => selected.includes(row.container)) || rows[0];

  const filtered = useMemo(() => rows.filter((row) => {
    const text = (row.container + row.bill + row.ref + row.consignee).toLowerCase();
    return (!keyword || text.includes(keyword.toLowerCase())) && (!billNo || row.bill.includes(billNo)) && (!containerNo || row.container.includes(containerNo));
  }), [keyword, billNo, containerNo]);

  const allChecked = filtered.length > 0 && filtered.every((row) => selected.includes(row.container));
  const toggleAll = () => setSelected(allChecked ? [] : filtered.map((row) => row.container));
  const toggle = (id: string) => setSelected((value) => value.includes(id) ? value.filter((item) => item !== id) : [...value, id]);
  const notify = (name: string, tone: 'success' | 'info' | 'warning' = 'info') => addToast(selected.length ? name + '已处理 ' + selected.length + ' 条提单' : name + '功能已触发', tone);

  return (
    <main className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-hidden bg-[#f3f5f7] p-2.5 text-[12px] text-[#354052]" style={{ fontFamily: 'Microsoft YaHei, PingFang SC, Arial, sans-serif' }}>
      <section className="shrink-0 rounded-[3px] bg-white p-2.5 shadow-[0_1px_5px_rgba(35,51,65,.06)]">
        <div className="grid grid-cols-[58px_minmax(180px,1fr)_58px_minmax(180px,1fr)_46px_minmax(180px,1fr)_138px_138px_138px] items-center gap-3">
          <label className="font-bold text-[#26323d]">关键词</label>
          <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="输入关键词精准查询" className="h-7 rounded border border-[#dfe4e8] px-2.5 outline-none placeholder:text-[#c3c8cd] focus:border-[#168ff5]" />
          <label className="font-bold text-[#26323d]">提单号</label>
          <input value={billNo} onChange={(event) => setBillNo(event.target.value)} placeholder="输入提单号精准查询" className="h-7 rounded border border-[#dfe4e8] px-2.5 outline-none placeholder:text-[#c3c8cd] focus:border-[#168ff5]" />
          <label className="font-bold text-[#26323d]">柜号</label>
          <input value={containerNo} onChange={(event) => setContainerNo(event.target.value)} placeholder="输入柜号精准查询" className="h-7 rounded border border-[#dfe4e8] px-2.5 outline-none placeholder:text-[#c3c8cd] focus:border-[#168ff5]" />
          <button type="button" onClick={() => addToast('查询条件已应用', 'info')} className="flex h-7 items-center justify-center gap-1 rounded bg-[#0759b6] font-semibold text-white hover:bg-[#064a97]"><Search className="h-3.5 w-3.5" />查询</button>
          <button type="button" onClick={() => { setKeyword(''); setBillNo(''); setContainerNo(''); setPage(1); addToast('筛选条件已重置', 'info'); }} className="flex h-7 items-center justify-center gap-1 rounded border border-[#dfe4e8] bg-white text-[#58636e] hover:border-[#95c8f3] hover:text-[#168ff5]"><RefreshCw className="h-3 w-3" />重置</button>
          <button type="button" onClick={() => addToast('更多筛选条件已展开', 'info')} className="flex h-7 items-center justify-center gap-1 rounded border border-[#dfe4e8] bg-white text-[#58636e] hover:border-[#95c8f3] hover:text-[#168ff5]">展开<ChevronDown className="h-3.5 w-3.5" /></button>
        </div>
      </section>

      <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[3px] bg-white shadow-[0_1px_5px_rgba(35,51,65,.06)]">
        <div className="flex h-[49px] shrink-0 items-stretch justify-between border-b border-[#eef1f3] px-2.5">
          <div className="flex min-w-0 items-stretch gap-1 overflow-x-auto">
            {tabs.map(([label, count]) => <button key={label} type="button" onClick={() => { setActiveTab(label); setPage(1); }} className={'relative whitespace-nowrap px-2.5 text-[12px] ' + (activeTab === label ? 'font-semibold text-[#168ff5]' : 'text-[#34404b] hover:text-[#168ff5]')}>{label}({count}){activeTab === label && <span className="absolute bottom-0 left-1.5 right-1.5 h-0.5 bg-[#168ff5]" />}</button>)}
          </div>
          <button type="button" onClick={() => addToast('提单创建面板已打开', 'info')} className="my-2 flex shrink-0 items-center gap-1 rounded bg-[#0759b6] px-3 text-[12px] font-semibold text-white hover:bg-[#064a97]"><Plus className="h-3.5 w-3.5" />创建</button>
        </div>

        <div className="relative z-20 flex shrink-0 items-center gap-2 overflow-visible border-b border-[#eef1f3] px-2.5 py-2">
          <button type="button" onClick={() => notify('已订舱', 'success')} className="rounded bg-[#0759b6] px-3 py-1.5 font-semibold text-white">已订舱</button>
          <button type="button" onClick={() => notify('更新统计', 'success')} className="rounded bg-[#0759b6] px-3 py-1.5 font-semibold text-white">更新统计</button>
          <button type="button" onClick={() => notify('删除', 'warning')} className="flex items-center gap-1 rounded bg-[#df3e3e] px-3 py-1.5 font-semibold text-white"><Trash2 className="h-3.5 w-3.5" />删除</button>
          <button type="button" onClick={() => notify('作废', 'warning')} className="rounded bg-[#df3e3e] px-3 py-1.5 font-semibold text-white">作废</button>
          <button type="button" onClick={() => addToast('提单列表已导出', 'success')} className="flex items-center gap-1 rounded bg-[#0759b6] px-3 py-1.5 font-semibold text-white"><Download className="h-3.5 w-3.5" />导出<ChevronDown className="h-3 w-3" /></button>
          <div className="relative shrink-0">
            <button type="button" onClick={() => setPushMenuOpen((value) => !value)} className="flex items-center gap-1 rounded bg-[#0759b6] px-3 py-1.5 font-semibold text-white hover:bg-[#064a97]">推送下单<ChevronDown className="h-3 w-3" /></button>
            {pushMenuOpen && <div className="absolute left-0 top-full z-50 mt-1 w-36 overflow-hidden rounded border border-slate-200 bg-white py-1 text-[12px] shadow-xl">
              <button type="button" onClick={() => { notify('晓运平台下单'); setPushMenuOpen(false); }} className="flex w-full px-3 py-2 text-left text-slate-700 hover:bg-blue-50 hover:text-[#0759b6]">晓运平台下单</button>
              <button type="button" onClick={() => { setPushOpen(true); setPushMenuOpen(false); }} className="flex w-full px-3 py-2 text-left text-slate-700 hover:bg-blue-50 hover:text-[#0759b6]">纽酷平台下单</button>
            </div>}
          </div>
          <button type="button" onClick={() => addToast('字段配置已打开', 'info')} className="ml-auto rounded bg-[#0759b6] p-1.5 text-white"><Settings2 className="h-3.5 w-3.5" /></button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          <table className="min-w-[2250px] w-full table-fixed border-collapse text-[11px] text-[#68737d]">
            <thead className="sticky top-0 z-10 bg-[#f7f8f9] text-[#5e6872]"><tr className="h-9">
              <th className="w-10 border border-[#e5e8eb] px-2"><input type="checkbox" checked={allChecked} onChange={toggleAll} className="h-3.5 w-3.5 accent-[#0759b6]" /></th>
              {headers.map((header) => <th key={header} className="w-24 border border-[#e5e8eb] px-2 text-center">{header}</th>)}
            </tr></thead>
            <tbody>{filtered.map((row, index) => {
              const cells = [row.container, row.bill, '否', row.type, row.route, '否', '-', row.business, row.order, row.line, String(row.boxes), row.actual, row.volume, row.weight, row.fee, row.consignee || '-', row.ratio, '-', '-', '-', '未订阅'];
              return <tr key={row.container} className={'h-11 hover:bg-[#f3f8fe] ' + (index % 2 ? 'bg-[#fbfcfd]' : 'bg-white')}>
                <td className="border border-[#edf0f2] px-2 text-center"><input type="checkbox" checked={selected.includes(row.container)} onChange={() => toggle(row.container)} className="h-3.5 w-3.5 accent-[#0759b6]" /></td>
                {cells.map((cell, cellIndex) => <td key={cellIndex} className="border border-[#edf0f2] px-2 text-center align-middle">{cellIndex === 1 ? <><span>{row.bill}</span><br /><span className="text-[10px]">参考号：{row.ref}</span></> : cell}</td>)}
              </tr>;
            })}</tbody>
          </table>
        </div>

        <div className="flex h-11 shrink-0 items-center justify-end gap-3 border-t border-[#eef1f3] px-3 text-[12px] text-[#68737d]">
          <span>共 {filtered.length ? 6693 : 0} 条</span>
          <select className="h-7 rounded border border-[#dfe4e8] px-2" defaultValue="100"><option>100条/页</option><option>50条/页</option><option>20条/页</option></select>
          <button type="button" disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="px-1 disabled:text-[#c4c9ce]">‹</button>
          <button type="button" className="h-6 min-w-6 rounded bg-[#168ff5] px-1.5 text-white">{page}</button>
          <button type="button" onClick={() => setPage((value) => value + 1)} className="px-1">›</button>
          <span>前往</span>
          <input value={page} onChange={(event) => setPage(Math.max(1, Number(event.target.value) || 1))} className="h-7 w-9 rounded border border-[#dfe4e8] text-center" />
          <span>页</span>
        </div>
      </section>
      <NiuKuOrderDrawer open={pushOpen} bill={activeBill.bill} container={activeBill.container} onClose={() => setPushOpen(false)} addToast={addToast} />
    </main>
  );
}
