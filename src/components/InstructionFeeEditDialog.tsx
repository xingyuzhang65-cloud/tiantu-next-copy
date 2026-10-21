import type { CatalogFeeDrawerRow } from './CatalogFeeDrawer';

type Props={row:CatalogFeeDrawerRow;cost?:number;error:string;onUpdate:(field:'unitPrice'|'quantity'|'remark',value:string)=>void;onCancel:()=>void;onConfirm:()=>void};
export default function InstructionFeeEditDialog({row,cost,error,onUpdate,onCancel,onConfirm}:Props){
  const counter=(field:'unitPrice'|'quantity',label:string)=><label><span><b>* </b>{label}：</span><div className="instruction-fee-counter"><button type="button" aria-label={`减少${label}`} onClick={()=>onUpdate(field,String(Math.max(field==='quantity'?1:0,Number((Number(row[field]||0)-1).toFixed(6)))))}>−</button><input aria-label={label} type="number" step="any" min={field==='quantity'?'0.000001':'0'} value={row[field]} onChange={event=>onUpdate(field,event.target.value)}/><button type="button" aria-label={`增加${label}`} onClick={()=>onUpdate(field,String(Number((Number(row[field]||0)+1).toFixed(6))))}>+</button></div></label>;
  return <div className="mc-intercept-overlay mc-intercept-feedback-overlay mc-intercept-attachment-overlay instruction-fee-edit-overlay" onMouseDown={event=>{if(event.target===event.currentTarget)onCancel();}}><section className="mc-intercept-attachment-modal instruction-fee-edit-modal" role="dialog" aria-modal="true" aria-label="编辑费用项" tabIndex={-1}>
    <header><h2>编辑费用项</h2><button type="button" className="mc-intercept-close" aria-label="关闭编辑费用项" onClick={onCancel}>×</button></header>
    <form onSubmit={event=>{event.preventDefault();onConfirm();}} noValidate>
      <div className="instruction-fee-edit-fields">
        <label><span><b>* </b>费用代码：</span><input aria-label="费用代码" value={row.code||'—'} readOnly/></label>
        <label><span><b>* </b>费用名称：</span><input aria-label="费用名称" value={row.name} readOnly/></label>
        <label><span><b>* </b>费用类型：</span><select aria-label="费用类型" disabled value={row.type}><option>{row.type}</option></select></label>
        <label><span><b>* </b>计费单位：</span><select aria-label="计费单位" disabled value={row.unit}><option>{row.unit}</option></select></label>
        {counter('unitPrice','计费单价')}{counter('quantity','计费数量')}
        <label><span>成本单价：</span><input aria-label="成本单价" value={cost===undefined?'—':String(cost)} readOnly/></label>
        <label><span><b>* </b>币种：</span><select aria-label="币种" disabled value={row.currency}><option>{row.currency}</option></select></label>
        <label className="instruction-fee-description"><span>描述：</span><textarea aria-label="描述" value={row.remark} onChange={event=>onUpdate('remark',event.target.value)} maxLength={500} rows={3}/></label>
        {error&&<p role="alert" className="instruction-fee-edit-error">{error}</p>}
      </div>
      <footer><button type="submit" className="mc-btn primary">确定</button><button type="button" className="mc-btn" onClick={onCancel}>取消</button></footer>
    </form>
  </section></div>;
}
