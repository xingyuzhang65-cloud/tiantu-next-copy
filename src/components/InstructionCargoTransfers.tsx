import { useState } from 'react';
import type { InstructionCargoRow } from './instructionDetailData';

type Props = { rows: InstructionCargoRow[]; numbers?: Record<string,string>; onSave: (numbers: Record<string,string>, editedIds: string[]) => boolean };
const show = (value?: string) => value?.trim() || '—';

export default function InstructionCargoTransfers({rows,numbers,onSave}: Props) {
  const [editing,setEditing]=useState(false);
  const [draft,setDraft]=useState<Record<string,string>>({});
  const [selected,setSelected]=useState<string[]>([]);
  const [batch,setBatch]=useState('');
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  const [editedIds,setEditedIds]=useState<string[]>([]);
  const all=!!rows.length&&rows.every(row=>selected.includes(row.id));
  function open(){setDraft({...numbers});setSelected(rows.map(row=>row.id));setBatch('');setError('');setMessage('');setEditedIds([]);setEditing(true);}
  function markEdited(ids:string[]){setEditedIds(current=>[...current.filter(id=>!ids.includes(id)),...ids]);}
  function duplicates(values:Record<string,string>){const nonempty=Object.values(values).map(value=>value.trim()).filter(Boolean);return new Set(nonempty).size!==nonempty.length;}
  function applyBatch(){
    const targets=rows.filter(row=>selected.includes(row.id));
    const entries=batch.trim().split(/\r?\n/).map(value=>value.trim());
    setError('');setMessage('');
    if(!targets.length){setError('请先勾选要填写转单号的货箱');return;}
    if(entries.some(value=>!value)){setError('请输入转单号，多个转单号之间不要保留空行');return;}
    if(entries.some(value=>value.length>200)){setError('每个转单号不能超过200个字符');return;}
    if(entries.length!==targets.length){setError(`已选 ${targets.length} 箱，请按顺序输入 ${targets.length} 行独立转单号，每箱一个`);return;}
    const next={...draft,...Object.fromEntries(targets.map((row,index)=>[row.id,entries[index]]))};
    if(duplicates(next)){setError('每箱须使用独立转单号，不同货箱不能填写相同的转单号');return;}
    setDraft(next);markEdited(targets.map(row=>row.id));
    setMessage(`已填入 ${targets.length} 箱，请核对表格后保存转单号。`);
  }
  function save(){const next=Object.fromEntries(rows.map(row=>[row.id,(draft[row.id]||'').trim()]));if(duplicates(next)){setError('每箱须使用独立转单号，不同货箱不能填写相同的转单号');return;}if(onSave(next,editedIds))setEditing(false);}
  return <>
    <div className="mc-intercept-detail-toolbar instruction-transfer-toolbar"><div><h3 className="mc-intercept-detail-card-title">货箱信息</h3><p className="instruction-transfer-count">共 {rows.length} 箱{editing&&`，已选 ${selected.length} 箱`}</p></div><div className="instruction-transfer-actions">{editing?<><button type="button" className="mc-btn primary" onClick={save}>保存转单号</button><button type="button" className="mc-btn" onClick={()=>setEditing(false)}>取消</button></>:<button type="button" className="mc-btn primary" disabled={!rows.length} onClick={open}>添加转单号</button>}</div></div>
    {editing&&<section className="instruction-transfer-batch" aria-label="批量填写转单号">
      <label htmlFor="instruction-transfer-batch-input">批量填写转单号</label>
      <p id="instruction-transfer-batch-hint">每箱填写独立转单号，每行1个，按下方已选货箱的序号从上到下一一对应；列表仅展示最近更新的转单号。</p>
      <textarea id="instruction-transfer-batch-input" aria-label="批量转单号" aria-describedby="instruction-transfer-batch-hint" rows={3} value={batch} onChange={event=>{setBatch(event.target.value);setError('');setMessage('');}} placeholder={'第1个已选货箱的转单号\n第2个已选货箱的转单号\n每箱一行，不能共用'}/>
      <div className="instruction-transfer-batch-footer"><span>也可直接修改下方每箱的转单号，未填写的货箱可留空。</span><button type="button" className="mc-btn" onClick={applyBatch}>应用到选中货箱</button></div>
      {error&&<p className="instruction-transfer-batch-error" role="alert">{error}</p>}{message&&<p className="instruction-transfer-batch-success" role="status">{message}</p>}
    </section>}
    <div className="mc-intercept-cargo-box-wrap"><table className="mc-intercept-cargo-box-table instruction-transfer-table"><thead><tr><th><span className="instruction-transfer-selector">{editing&&<input type="checkbox" aria-label="全选填写转单号的货箱" checked={all} onChange={event=>setSelected(event.target.checked?rows.map(row=>row.id):[])}/>}序号</span></th><th>货箱号</th><th>客户数据</th><th>系统拣货（材重/实重）</th><th>转单号</th></tr></thead><tbody>
      {rows.map((box,index)=><tr key={box.id}><td><span className="instruction-transfer-selector">{editing&&<input type="checkbox" aria-label={`选择第${index+1}箱填写转单号`} checked={selected.includes(box.id)} onChange={event=>{setSelected(current=>event.target.checked?[...current,box.id]:current.filter(id=>id!==box.id));setError('');setMessage('');}}/>}{index+1}</span></td><td className="font-mono">{show(box.boxNo)}</td><td>{box.customerLines.map((line,i)=><div key={i}>{line}</div>)}</td><td>{box.pickingLines.map((line,i)=><div key={i}>{line}</div>)}</td><td>{editing?<input className="instruction-transfer-input" aria-label={`第${index+1}箱转单号`} value={draft[box.id]||''} maxLength={200} placeholder="请输入转单号" onChange={event=>{setDraft(current=>({...current,[box.id]:event.target.value}));markEdited([box.id]);setError('');setMessage('');}}/>:<span className="instruction-transfer-number">{show(numbers?.[box.id])}</span>}</td></tr>)}
      {!rows.length&&<tr><td colSpan={5} className="mc-intercept-fee-empty">暂无货箱信息</td></tr>}
    </tbody></table></div>
  </>;
}
