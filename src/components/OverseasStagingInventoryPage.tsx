import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Download, Plus, RotateCcw, Search, Settings, Upload, X } from 'lucide-react';
import { createReleaseDraft, exportInventoryCsv, getInventoryFeeCatalog, loadOverseasInventory, persistOverseasInventory, submitInventoryRelease } from './overseasStorageInventoryData';
import type { InventoryRecord, InventoryState, InventoryStatus, ReleaseDraft, StorageAttachment, StorageFeeLine, ReleaseOrder, WaybillType } from './overseasStorageInventoryData';
import CatalogFeeDrawer from './CatalogFeeDrawer';
import OperationInstructionTable from './OperationInstructionTable';
import './InstructionManagementPage.css';
import './StorageManagementPage.css';
import './OverseasStorageInventoryPage.css';

type Props = { addToast: (text:string, type:'success'|'info'|'warning')=>void };
type InventoryView = InventoryStatus | '已完成';
const tabs: [InventoryView,string][] = [['暂存','暂存'],['待出库','指令处理完成，待出库'],['已出库','已出库']];
const sourceStatus = (view: InventoryView): InventoryStatus => view === '已完成' ? '已出库' : view;
const emptyFilters={keyword:'',customer:'',inbound:'',transfer:'',destination:'',dispatch:'',location:'',container:'',pallet:'',from:'',to:'',blocked:''};
type Filters=typeof emptyFilters;
const fmt=(n:number)=>Number(n.toFixed(3)).toLocaleString('zh-CN');
const uid=()=>Date.now()+'-'+Math.random().toString(36).slice(2,9);
const shipments=['Truck-Amazon','Truck-Walmart','Truck-Other','FEDEX','UPS','USPS'];
function Field({label,required,children,full=false}:{label:string;required?:boolean;children:React.ReactNode;full?:boolean}) {
  return <label className={`oi-field${full?' oi-field-wide':''}`}><span>{required&&<b className="oi-required">*</b>}{label}</span>{children}</label>;
}
function Choice({label,value,onChange,options,placeholder='请选择'}:{label:string;value:string;onChange:(s:string)=>void;options:string[];placeholder?:string}) {
  return <span className="im-select"><select aria-label={label} value={value} onChange={e=>onChange(e.target.value)}><option value="">{placeholder}</option>{[...new Set([...options,...(value?[value]:[])])].map(s=><option key={s}>{s}</option>)}</select><ChevronDown/></span>;
}
function downloadCsv(csv:string,name:string){const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
async function readFiles(files:FileList|null):Promise<StorageAttachment[]> {
  if(!files)return [];
  return Promise.all(Array.from(files).map(file=>new Promise<StorageAttachment>((resolve,reject)=>{
    if(file.size>3*1024*1024){reject(new Error('单个附件请控制在3MB以内'));return;}
    const reader=new FileReader();reader.onerror=()=>reject(new Error('附件读取失败'));reader.onload=()=>resolve({id:uid(),name:file.name,size:file.size,type:file.type,dataUrl:String(reader.result)});reader.readAsDataURL(file);
  })));
}
function Attachments({items,onChange,label='上传附件',images=false,onError}:{items:StorageAttachment[];onChange?:(items:StorageAttachment[])=>void;label?:string;images?:boolean;onError:(text:string)=>void}) {
  return <div className="oi-attachments">{onChange&&<label className="oi-attachment-upload im-button"><Upload size={14}/>{images?'上传图片':'上传'}<input aria-label={label} type="file" multiple accept={images?'image/*':undefined} onChange={async e=>{try{const added=await readFiles(e.target.files);if(images&&items.length+added.length>9)throw new Error('最多添加9张图片');onChange([...items,...added]);}catch(err){onError((err as Error).message);}e.target.value='';}}/></label>}
    <ul className="oi-attachment-list">{items.map(item=><li key={item.id} className="oi-attachment-item">{images&&item.dataUrl&&<img className="oi-attachment-thumbnail" src={item.dataUrl} alt={item.name}/>}<a className="oi-link" href={item.dataUrl} download={item.name}>{item.name}</a><small>{Math.ceil(item.size/1024)} KB</small>{onChange&&<button type="button" className="oi-link" onClick={()=>onChange(items.filter(a=>a.id!==item.id))}>移除</button>}</li>)}</ul>
  </div>;
}

export default function OverseasStorageInventoryPage({addToast}:Props) {
  const [data,setData]=useState<InventoryState>(loadOverseasInventory);
  const [status,setStatus]=useState<InventoryView>('暂存');const [filters,setFilters]=useState({...emptyFilters});const [applied,setApplied]=useState({...emptyFilters});
  const [expanded,setExpanded]=useState(false);const [selected,setSelected]=useState<string[]>([]);const [compact,setCompact]=useState(false);
  const [page,setPage]=useState(1);const [pageSize,setPageSize]=useState(50);
  const [drawer,setDrawer]=useState<{mode:'order'|'detail'|'logs';ids:string[]}|null>(null);
  const selectedRows=data.records.filter(r=>selected.includes(r.id));
  const ordersFor=(id:string)=>data.orders.filter(o=>o.recordIds.includes(id));
  const unique=(key:'customer'|'transfer'|'destination'|'dispatch'|'location'):string[]=>[...new Set<string>(data.records.map(r=>r[key]).filter(Boolean))];
  const rows=useMemo(()=>data.records.filter(r=>{
    const parts=(s:string)=>s.split(/[,，;；\s]+/).map(v=>v.trim().toLowerCase()).filter(Boolean);
    const match=(value:string,query:string,exact=false)=>{const q=parts(query);return !q.length||(q.length>1?q.includes(value.toLowerCase()):exact?value.toLowerCase()===q[0]:value.toLowerCase().includes(q[0]));};
    return r.status===sourceStatus(status)&&(!applied.keyword||[r.waybillNo||'',r.fbaNo||'',r.warehouseCode||'',r.container,r.system,r.inbound,r.pallet].some(v=>match(v,applied.keyword,true)))&&(!applied.customer||r.customer===applied.customer)
      &&match(r.inbound,applied.inbound,true)&&(!applied.transfer||r.transfer===applied.transfer)&&(!applied.destination||r.destination===applied.destination)
      &&(!applied.dispatch||r.dispatch===applied.dispatch)&&(!applied.location||r.location===applied.location)&&match(r.container,applied.container)&&match(r.pallet,applied.pallet)
      &&(!applied.from||r.time.slice(0,10)>=applied.from)&&(!applied.to||r.time.slice(0,10)<=applied.to)
      &&(!applied.blocked||r.blocked===applied.blocked);
  }),[data.records,status,applied]);
  const pages=Math.max(1,Math.ceil(rows.length/pageSize));const visible=rows.slice((Math.min(page,pages)-1)*pageSize,Math.min(page,pages)*pageSize);
  const all=visible.length>0&&visible.every(r=>selected.includes(r.id));
  function save(next:InventoryState){try{persistOverseasInventory(next);setData(next);return true;}catch{addToast('浏览器空间不足，未能保存。请减少附件或图片后重试。','warning');return false;}}
  function openOrder(ids:string[]){const source=data.records.filter(r=>ids.includes(r.id));if(!source.length){addToast('请先勾选需要下单的运单','warning');return;}if(new Set(source.map(r=>r.customer)).size>1){addToast('请勾选同一客户的运单后下单','warning');return;}setDrawer({mode:'order',ids});}
  function query(){if(filters.from&&filters.to&&filters.from>filters.to){addToast('开始日期不能晚于结束日期','warning');return;}setApplied({...filters});setSelected([]);setPage(1);}
  const filterInput=(key:keyof Filters,label:string,placeholder=label)=><label className="sm-filter"><span>{label}</span><input aria-label={label} value={filters[key]} placeholder={placeholder} onChange={e=>setFilters({...filters,[key]:e.target.value})}/></label>;
  const filterSelect=(key:keyof Filters,label:string,options:string[])=><label className="sm-filter"><span>{label}</span><Choice label={label} value={filters[key]} options={options} placeholder={label} onChange={value=>setFilters({...filters,[key]:value})}/></label>;
  type Col={key:string;label:string;width:number};
  const base:Col[]=[{key:'customer',label:'客户名称',width:100},{key:'waybillNo',label:'运单号',width:170},{key:'fbaNo',label:'FBA号',width:150},{key:'warehouseCode',label:'仓库代码',width:110},{key:'service',label:'服务',width:170},{key:'blocked',label:'库存类型',width:85}];
  const cols:Col[]=status==='暂存'?[...base,{key:'time',label:'入库时间',width:165},{key:'weight',label:'重量',width:80},{key:'volume',label:'体积',width:80},{key:'boxes',label:'总箱数',width:85},{key:'pending',label:'待审核箱数',width:100},{key:'unsent',label:'未发货箱数',width:100},{key:'sent',label:'已发货箱数',width:100}]
    :[...base,{key:'applicationNo',label:status==='待出库'?'指令单号':'申请单号',width:145},{key:'waybillType',label:'运单类型',width:100},{key:'releaseType',label:'下单类型',width:100},{key:'shipmentId',label:'Shipment ID',width:140},{key:'referenceId',label:'Reference ID',width:140},{key:'financialAudit',label:'财务审核',width:100},{key:'instructionCount',label:'指令数量',width:90},{key:'instructions',label:'指令内容',width:280},{key:'time',label:'入库时间',width:165},{key:'boxes',label:'申请箱数',width:90},{key:'volume',label:'申请箱数总体积',width:125}];
  const cell=(r:InventoryRecord,key:string)=>{
    if(key==='waybillNo')return r.waybillNo?.trim()&&r.waybillNo!=='—'&&r.waybillNo!=='-'?<button type="button" className="oi-link" aria-haspopup="dialog" onClick={()=>setDrawer({mode:'detail',ids:[r.id]})}>{r.waybillNo}</button>:'—';
    const orders=ordersFor(r.id);const fees=[...new Map([...(r.instructions||[]),...orders.flatMap(o=>o.instructions)].map(f=>[f.id,f])).values()];
    if(key==='blocked')return <span className={`oi-type-tag${r.blocked==='拦截'?' oi-blocked':''}`}>{r.blocked}</span>;
    if(key==='notes')return orders.map(o=>o.remark).filter(Boolean).join('；')||r.remark||'';
    if(key==='instructions')return fees.map(f=>`${f.name} × ${f.quantity}${f.unit}：${f.instructionRemark||f.feeRemark}`).join('；')||'—';
    if(key==='pictures')return fees.reduce((n,f)=>n+(f.images?.length||0),0)||'—';
    if(key==='instructionStatus')return orders.length?'待审批':fees.length?fees.some(f=>f.status==='待处理')?'待处理':'已处理':'—';if(key==='instructionCount')return fees.length||0;
    const value=r[key as keyof InventoryRecord];return typeof value==='number'?fmt(value):typeof value==='string'?value||'—':'—';
  };
  return <main className="im-page sm-page oi-page">
    <div className="oi-header-tools"><h1 className="oi-page-title">暂存管理</h1><span className="oi-selection-hint">已选择 <strong>{selected.length}</strong> 条运单</span></div>
    <form className="sm-filters" onSubmit={e=>{e.preventDefault();query();}}><div className="sm-filter-grid">
      {filterInput('keyword','关键字','单个精准搜索')}{filterSelect('customer','客户名称',unique('customer'))}{filterInput('inbound','入仓号','批量查询使用逗号或分号隔开')}{filterSelect('transfer','转运方式',unique('transfer'))}
      {expanded&&<>{filterSelect('destination','FBA仓库',unique('destination'))}{filterSelect('dispatch','派送方式',unique('dispatch'))}{filterSelect('location','库位',unique('location'))}{filterInput('container','柜号','单个模糊，批量精准')}{filterSelect('blocked','库存类型',['暂存','拦截'])}<label className="sm-filter sm-date-filter"><span>入库时间</span><span className="sm-date-range"><input aria-label="入库开始日期" type="date" value={filters.from} onChange={e=>setFilters({...filters,from:e.target.value})}/><i>至</i><input aria-label="入库结束日期" type="date" value={filters.to} onChange={e=>setFilters({...filters,to:e.target.value})}/></span></label></>}
    </div><div className="sm-filter-actions"><button className="im-button im-primary" type="submit"><Search/>查询</button><button className="im-button" type="button" onClick={()=>{setFilters({...emptyFilters});setApplied({...emptyFilters});setSelected([]);setPage(1);}}><RotateCcw/>重置</button><button className="im-button" type="button" aria-expanded={expanded} onClick={()=>setExpanded(!expanded)}><ChevronDown/>{expanded?'收起':'展开'}</button></div></form>
    <section className="im-list-card sm-list-card"><div className="sm-list-heading"><div className="sm-tabs" role="tablist" aria-label="暂存管理状态">{tabs.map(([id,label])=><button key={id} role="tab" aria-selected={status===id} className={status===id?'sm-tab-active':''} onClick={()=>{setStatus(id);setSelected([]);setPage(1);}}>{label}({data.records.filter(r=>r.status===sourceStatus(id)).length})</button>)}</div><div className="oi-list-actions"><button type="button" className="im-button" onClick={()=>downloadCsv(exportInventoryCsv(selected.length?selectedRows:rows),'暂存管理库存.csv')}><Download/>导出</button></div></div>
    <div className="sm-summary-bar"><div className="sm-summary"><span>已选择内容：</span><span>总托盘数：<b>{selectedRows.length}</b></span><span>总箱数：<b>{selectedRows.reduce((n,r)=>n+r.boxes,0)}</b></span><span>总柜数：<b>{new Set(selectedRows.map(r=>r.system)).size}</b></span><span>总重量：<b>{fmt(selectedRows.reduce((n,r)=>n+r.weight,0))}</b></span><span>总体积：<b>{fmt(selectedRows.reduce((n,r)=>n+r.volume,0))}</b></span></div><button type="button" className="im-button im-primary im-settings-button" aria-label="切换表格密度" title="切换表格密度" onClick={()=>setCompact(!compact)}><Settings/></button></div>
    <div className="im-table-scroll"><table className={`im-table sm-table oi-table${compact?' oi-compact':''}`} style={{minWidth:74+135+cols.reduce((n,c)=>n+c.width,0)}}><colgroup><col style={{width:36}}/><col style={{width:38}}/>{cols.map(c=><col key={c.key} style={{width:c.width}}/>)}<col style={{width:135}}/></colgroup><thead><tr><th>#</th><th><input type="checkbox" aria-label="全选暂存管理" checked={all} onChange={()=>setSelected(current=>all?current.filter(id=>!visible.some(r=>r.id===id)):[...new Set([...current,...visible.map(r=>r.id)])])}/></th>{cols.map(c=><th key={c.key}>{c.label}</th>)}<th className="sm-actions-cell">操作</th></tr></thead><tbody>{visible.map((r,i)=><tr key={r.id} className={selected.includes(r.id)?'im-row-selected':''}><td>{(page-1)*pageSize+i+1}</td><td><input type="checkbox" aria-label={`选择${r.id}`} checked={selected.includes(r.id)} onChange={()=>setSelected(current=>current.includes(r.id)?current.filter(id=>id!==r.id):[...current,r.id])}/></td>{cols.map(c=><td key={c.key} title={c.key==='waybillNo'?r.waybillNo||'—':String(cell(r,c.key))}>{cell(r,c.key)}</td>)}<td className="sm-actions-cell"><span className="im-actions">{status==='暂存'&&<button type="button" onClick={()=>openOrder([r.id])}>下单</button>}<button type="button" onClick={()=>setDrawer({mode:'logs',ids:[r.id]})}>日志</button></span></td></tr>)}{!visible.length&&<tr className="im-empty"><td colSpan={cols.length+3}>暂无匹配库存记录</td></tr>}</tbody></table></div>
    <footer className="im-footer"><span>共 {rows.length} 条</span><button className="im-page-arrow" disabled={page<=1} onClick={()=>setPage(page-1)}>‹</button><span>{page} / {pages}</span><button className="im-page-arrow" disabled={page>=pages} onClick={()=>setPage(page+1)}>›</button><span className="im-select im-page-size"><select aria-label="暂存管理每页条数" value={pageSize} onChange={e=>{setPageSize(Number(e.target.value));setPage(1);}}>{[20,50,100].map(n=><option key={n} value={n}>{n}条/页</option>)}</select><ChevronDown/></span></footer></section>
    {drawer&&<InventoryDrawer data={data} ids={drawer.ids} mode={drawer.mode} onClose={()=>setDrawer(null)} onSubmit={next=>{if(save(next)){setSelected([]);setDrawer(null);addToast(`已生成待审批申请 ${next.orders[0].applicationNo}`,'success');}}}/>}
  </main>;
}

function InventoryDrawer({data,ids,mode,onClose,onSubmit}:{data:InventoryState;ids:string[];mode:'order'|'detail'|'logs';onClose:()=>void;onSubmit:(next:InventoryState)=>void}) {
  const records=data.records.filter(r=>ids.includes(r.id));const previous=data.orders.filter(o=>o.recordIds.some(id=>ids.includes(id)));
  const readOnly=mode!=='order';
  const [draft,setDraft]=useState<ReleaseDraft>(()=>{
    const initial=mode==='detail'&&previous[0]?structuredClone(previous[0]):createReleaseDraft(records);
    if(mode==='detail'){
      initial.instructions=[...new Map([...records.flatMap(r=>r.instructions||[]),...initial.instructions].map(f=>[f.id,structuredClone(f)])).values()];
      initial.remark=initial.remark||records.map(r=>r.remark).filter(Boolean).join('；');
      initial.shipmentId=initial.shipmentId||records[0]?.fbaNo||'';
    }
    return initial;
  });
  const [error,setError]=useState('');const [feeEditor,setFeeEditor]=useState<{rows:StorageFeeLine[];editId?:string}|null>(null);
  const [boxSelectionMode,setBoxSelectionMode]=useState<'指定'|'随机'>('随机');
  const [boxCountInput,setBoxCountInput]=useState(String(draft.boxIds.length));
  const [boxCountError,setBoxCountError]=useState('');
  const boxes=records.flatMap(r=>r.cargoBoxes);const available=boxes.filter(b=>b.status==='待处理');
  const compact=draft.kind!=='发货';const marketplace=['Walmart','Tiktok'].includes(draft.waybillType);const privateAddress=draft.waybillType==='私人地址';
  const change=(key:keyof ReleaseDraft,value:unknown)=>setDraft(old=>({...old,[key]:value}));
  useEffect(()=>{const escape=(e:KeyboardEvent)=>{if(e.defaultPrevented||document.querySelector('.operation-instruction-preview'))return;if(e.key==='Escape'){if(feeEditor)setFeeEditor(null);else onClose();}};document.addEventListener('keydown',escape);return()=>document.removeEventListener('keydown',escape);},[feeEditor,onClose]);
  function selectBoxes(next:string[]){
    setError('');
    setBoxCountInput(String(next.length));setBoxCountError('');
    setDraft(d=>({...d,boxIds:next,boxCount:next.length}));
  }
  function enterBoxCount(value:string){
    setBoxCountInput(value);setError('');
    if(!/^[1-9]\d*$/.test(value)||!Number.isSafeInteger(Number(value))){setBoxCountError('箱数必须为非零正整数');return;}
    const count=Number(value);
    if(count>available.length){setBoxCountError(`输入箱数 ${count} 箱，超过可用货箱数量 ${available.length} 箱，请重新输入`);return;}
    selectBoxes(available.slice(0,count).map(box=>box.id));
  }
  function changeBoxSelectionMode(value:'指定'|'随机'){
    setError('');
    setBoxSelectionMode(value);
  }
  const field=(key:keyof ReleaseDraft,label:string,required=false,type='text')=><Field label={label} required={required}><input aria-label={label} type={type} value={String(draft[key]??'')} onChange={e=>change(key,e.target.value)} maxLength={key==='address'?100:key==='overseasRemark'?500:1000}/></Field>;
  const boxField=<Field label="箱数" required><input aria-label="箱数" type="text" inputMode="numeric" pattern="[1-9][0-9]*" readOnly={readOnly} value={readOnly?draft.boxIds.length:boxCountInput} onChange={event=>enterBoxCount(event.target.value)} aria-invalid={!!boxCountError} aria-describedby={boxCountError?'overseas-box-count-error':!readOnly?'overseas-box-count-available':undefined}/>{!readOnly&&<small id="overseas-box-count-available" className="oi-available-count">可用货箱：{available.length} 箱</small>}{!readOnly&&boxCountError&&<span className="oi-form-error" id="overseas-box-count-error" role="alert">{boxCountError}</span>}</Field>;
  function submit(){try{if(boxCountError)throw new Error(boxCountError);if(!/^[1-9]\d*$/.test(boxCountInput))throw new Error('箱数必须为非零正整数');if(Number(boxCountInput)>available.length)throw new Error(`输入箱数 ${boxCountInput} 箱，超过可用货箱数量 ${available.length} 箱，请重新输入`);if(Number(boxCountInput)!==draft.boxIds.length)throw new Error('输入箱数须与勾选的可用货箱数量一致');const actual={...draft,boxCount:draft.boxIds.length};onSubmit(submitInventoryRelease(data,ids,actual));}catch(err){setError((err as Error).message);}}
  function addFees(rows:StorageFeeLine[],editId?:string){setDraft(d=>({...d,instructions:editId?[...d.instructions.map(f=>f.id===editId?{...rows[0],id:editId}:f),...rows.slice(1)]:[...d.instructions,...rows]}));setFeeEditor(null);}
  const logs=data.logs.filter(log=>ids.includes(log.recordId));
  return createPortal(<div className="oi-drawer-mask" onMouseDown={e=>{if(e.target===e.currentTarget&&!feeEditor)onClose();}}><aside className="oi-drawer" role="dialog" aria-modal="true" aria-label={mode==='order'?'下单':mode==='logs'?'操作日志':'库存详情'}>
    <header className="oi-drawer-header"><h2>{mode==='order'?'下单':mode==='logs'?'操作日志':'库存详情'}</h2><button type="button" aria-label="关闭暂存管理抽屉" onClick={onClose}><X/></button></header>
    <div className="oi-drawer-scroll">
      <section className="oi-drawer-summary"><div>运单号：<strong>{[...new Set(records.map(r=>r.waybillNo).filter(Boolean))].join('、')||'—'}</strong></div><div>FBA号：<strong>{[...new Set(records.map(r=>r.fbaNo).filter(Boolean))].join('、')||'—'}</strong></div><div>仓库代码：<strong>{[...new Set(records.map(r=>r.warehouseCode).filter(Boolean))].join('、')||'—'}</strong></div><div>服务：<strong>{[...new Set(records.map(r=>r.service).filter(Boolean))].join('、')||'—'}</strong></div><div>柜号：<strong>{[...new Set(records.map(r=>r.container))].join('、')}</strong></div><div>派送方式：<strong>{[...new Set(records.map(r=>r.dispatch))].join('、')}</strong></div><div>转运方式：<strong>{[...new Set(records.map(r=>r.transfer))].join('、')}</strong></div><div>未发货箱数：<strong>{records.reduce((n,r)=>n+r.unsent,0)}</strong></div></section>
      {mode==='logs'?<section className="oi-section"><h3>申请记录</h3>{previous.length?previous.map(o=><article className="oi-order-history" key={o.id}><strong>{o.applicationNo}</strong><span>{o.kind} · {o.boxCount} 箱 · 待审批</span><time>{o.createdAt}</time><p>{o.remark||'—'}</p></article>):<p className="oi-empty-summary">暂无申请记录</p>}<h3>操作日志</h3>{logs.length?logs.map(log=><article className="im-log-entry" key={log.id}><time>{log.at}</time><strong>{log.action}</strong>{log.details.map((text,i)=><p key={i}>{text}</p>)}</article>):<p className="oi-empty-summary">暂无操作日志</p>}</section>:<>
      {readOnly&&previous[0]&&<p className="oi-pending-banner">申请单号：{previous[0].applicationNo}　状态：待审批　申请时间：{previous[0].createdAt}</p>}
      <fieldset className="oi-form-fieldset" disabled={readOnly}>
        <div className="oi-kind-radios" role="radiogroup" aria-label="下单类型"><span><b className="oi-required">*</b>下单类型：</span>{(['发货','增值服务','销毁','自提'] as const).map(kind=><label key={kind}><input type="radio" name="overseas-release-type" value={kind} checked={draft.kind===kind} onChange={()=>change('kind',kind)}/>{kind}</label>)}</div>
        <div className="oi-form-grid">
          {compact?<>{boxField}{draft.kind==='销毁'&&field('destroyBoxNo','箱号',true)}{draft.kind==='自提'&&field('pickupAt','预计提货时间',false,'datetime-local')}{field('remark','备注')}</>:<>
            <Field label="运单类型" required><Choice label="运单类型" value={draft.waybillType} options={['FBA','Walmart','Tiktok','私人地址']} onChange={value=>change('waybillType',value as WaybillType)}/></Field>
            {!privateAddress&&<Field label="目的地" required>{marketplace?<input aria-label="目的地" value={draft.destination} onChange={e=>change('destination',e.target.value)}/>:<Choice label="目的地" value={draft.destination} options={['ABE2','ABE3','ABE4','ABE8','BWI9','FEDEX']} onChange={value=>change('destination',value)}/>}</Field>}
            {!marketplace&&!privateAddress&&field('shipmentId','ShipmentID',true)}
            <Field label="派送方式" required><Choice label="派送方式" value={draft.deliveryMethod} options={privateAddress?['USPS','FEDEX','UPS','Truck-Other']:marketplace?['Truck-Walmart','Truck-Other','FEDEX','UPS']:shipments} onChange={value=>change('deliveryMethod',value)}/></Field>
            {!marketplace&&!privateAddress&&field('referenceId','ReferenceID',true)}{boxField}
            {field('scheduledAt','预约发货时间',true,marketplace?'datetime-local':'date')}
            {marketplace&&<>{field('postalCode','邮编')}{field('contact','收件人')}{field('city','城市')}{field('state','州')}{field('company','公司')}{field('address','地址详情')}{field('overseasRemark','海外仓备注')}</>}
            {privateAddress&&<>{field('contact','联系人')}{field('phone','联系电话')}{field('state','省/州')}{field('city','城市')}{field('postalCode','邮编')}{field('address','联系地址')}</>}
            {!marketplace&&field('remark','备注')}
          </>}
        </div>
      </fieldset>
      <section className="oi-section"><h3>附件</h3><Attachments items={draft.attachments} onChange={readOnly?undefined:items=>change('attachments',items)} onError={setError}/></section>
      <section className="oi-section"><h3>货箱明细 <small>已选择 {draft.boxIds.length} 箱</small></h3>{!readOnly&&<div className="oi-box-selection"><div className="oi-kind-radios" role="radiogroup" aria-label="货箱选择方式"><span>选择方式：</span>{(['指定','随机'] as const).map(value=><label key={value}><input type="radio" name="overseas-box-selection" value={value} checked={boxSelectionMode===value} onChange={()=>changeBoxSelectionMode(value)}/>{value}</label>)}</div><p className="oi-hint">输入箱数自动勾选对应数量的货箱，手动勾选货箱同步回显箱数。</p></div>}<div className="oi-cargo-wrap"><table className="oi-cargo-table"><thead><tr><th><input type="checkbox" aria-label="全选可下单货箱" disabled={readOnly||!available.length} checked={!!available.length&&available.every(b=>draft.boxIds.includes(b.id))} onChange={e=>selectBoxes(e.target.checked?available.map(b=>b.id):[])}/></th><th>货箱号</th><th>客户数据</th><th>系统拣货（材重/实重）</th></tr></thead><tbody>{boxes.map(box=><tr key={box.id}><td><input type="checkbox" aria-label={`选择货箱${box.boxNo}`} checked={draft.boxIds.includes(box.id)} disabled={readOnly||box.status!=='待处理'} onChange={e=>selectBoxes(e.target.checked?[...draft.boxIds,box.id]:draft.boxIds.filter(id=>id!==box.id))}/></td><td>{box.boxNo}</td><td>{fmt(box.weight)} KG<br/>{box.dimensions}</td><td>{fmt(box.systemWeight)} KG<br/><span className={`oi-cargo-state ${box.status==='处理中'?'processing':box.status==='已出库'?'shipped':''}`}>{box.status}</span></td></tr>)}{!boxes.length&&<tr><td colSpan={4}>暂无货箱</td></tr>}</tbody></table></div></section>
      <section className="oi-section"><div className="oi-fee-toolbar"><h3>操作指令</h3>{!readOnly&&<button type="button" className="im-button im-primary" onClick={()=>setFeeEditor({rows:[]})}><Plus size={13}/>新增</button>}</div><OperationInstructionTable rows={draft.instructions} onEdit={readOnly?undefined:id=>{const fee=draft.instructions.find(row=>row.id===id);if(fee)setFeeEditor({rows:[structuredClone(fee)],editId:id});}} onRemove={readOnly?undefined:id=>change('instructions',draft.instructions.filter(row=>row.id!==id))}/><div className="oi-fee-summary"><span>共 {draft.instructions.length} 条</span><strong>人民币合计 {draft.instructions.reduce((n,f)=>n+f.unitPrice*f.quantity*f.exchangeRate,0).toFixed(2)}</strong></div></section>
      {readOnly&&previous.length>1&&<section className="oi-section"><h3>历史申请</h3>{previous.slice(1).map(o=><p key={o.id}>{o.applicationNo}　{o.kind}　{o.boxCount}箱　待审批</p>)}</section>}
      </>}
    </div>
    <footer className="oi-drawer-footer">{error&&<p className="oi-form-error" role="alert">{error}</p>}{mode==='order'&&<button type="button" className="im-button im-primary" onClick={submit}>确定</button>}<button type="button" className="im-button" onClick={onClose}>{mode==='order'?'取消':'关闭'}</button></footer>
    {feeEditor&&<FeeEditor initial={feeEditor.rows} onClose={()=>setFeeEditor(null)} onSave={rows=>addFees(rows,feeEditor.editId)}/>}
  </aside></div>,document.body);
}

function FeeEditor({initial,onClose,onSave}:{initial:StorageFeeLine[];onClose:()=>void;onSave:(rows:StorageFeeLine[])=>void}) {
  const catalog=getInventoryFeeCatalog();
  const makeRow=():StorageFeeLine=>({id:uid(),code:'',name:'',type:'',unit:'',unitPrice:0,quantity:1,exchangeRate:1,currency:'',billingTime:new Date().toLocaleDateString('sv-SE'),addedAt:new Date().toLocaleString('sv-SE'),addedBy:'天朗（付豪）',status:'待处理',feeRemark:'',instructionRemark:'',images:[]});
  const [rows,setRows]=useState<StorageFeeLine[]>(initial.length?initial:[makeRow()]);const [error,setError]=useState('');
  const update=(id:string,patch:Partial<StorageFeeLine>)=>setRows(old=>old.map(row=>row.id===id?{...row,...patch}:row));
  function selectFee(id:string,code:string){
    setRows(current=>current.map(row=>{
      if(row.id!==id)return row;
      const fee=catalog.find(item=>item.code===code);
      return fee?{...row,code:fee.code,name:fee.name,type:fee.type,unit:fee.unit,unitPrice:fee.unitPrice,currency:fee.currency,exchangeRate:fee.exchangeRate,instructionRemark:row.instructionRemark||fee.instructionRemark}
        :{...row,code:'',name:'',type:'',unit:'',unitPrice:0,currency:'',exchangeRate:1};
    }));
    setError('');
  }
  function save(){
    if(!rows.length){setError('请添加至少一条费用');return;}
    if(rows.some(row=>!row.name.trim()||!row.type.trim()||!row.unit.trim()||!row.currency.trim())){setError('请选择费用名称');return;}
    if(rows.some(row=>!Number.isFinite(row.quantity)||row.quantity<=0)){setError('数量须大于0');return;}
    if(rows.some(row=>!Number.isFinite(row.unitPrice)||row.unitPrice<0)){setError('单价须为大于或等于0的有效数字');return;}
    if(rows.some(row=>!Number.isFinite(row.exchangeRate)||row.exchangeRate<=0||!Number.isFinite(row.unitPrice*row.quantity*row.exchangeRate*100))){setError('费用数据无效，请重新选择费用或调整单价、数量');return;}
    if(!Number.isFinite(rows.reduce((sum,row)=>sum+row.unitPrice*row.quantity*row.exchangeRate,0)*100)){setError('费用合计过大，请调整数量');return;}
    onSave(rows.map(row=>structuredClone(row)));
  }
  return createPortal(<CatalogFeeDrawer title={initial.length?'编辑费用':'添加费用'}
    rows={rows.map(row=>({id:row.id,code:row.code,name:row.name,type:row.type,unit:row.unit,unitPrice:Number.isNaN(row.unitPrice)?'':row.unitPrice,quantity:Number.isNaN(row.quantity)?'':row.quantity,currency:row.currency,remark:row.feeRemark}))}
    catalogRows={catalog.map(({code,name})=>({code,name}))} error={error}
    onAdd={()=>setRows(current=>[...current,makeRow()])} onSelect={selectFee}
    onUpdate={(id,field,value)=>{update(id,field==='quantity'||field==='unitPrice'?{[field]:value.trim()===''?Number.NaN:Number(value)}:{feeRemark:value});setError('');}}
    onRemove={id=>{setRows(current=>current.filter(row=>row.id!==id));setError('');}} onCancel={onClose} onConfirm={save}/>,document.body);
}
