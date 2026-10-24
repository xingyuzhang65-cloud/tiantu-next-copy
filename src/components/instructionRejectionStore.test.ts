import test from 'node:test';
import assert from 'node:assert/strict';
import { applyInstructionRejection, rejectInstructions, REJECTION_STORAGE_KEY } from './instructionRejectionStore';
import type { InstructionListRow } from './instructionListTypes';
const memory = new Map<string,string>();
let fail = false;
Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{
  getItem:(key:string)=>memory.get(key)??null,
  setItem:(key:string,value:string)=>{if(fail)throw new Error('quota');memory.set(key,value);},
}});
const row = {id:'1',instructionNo:'CI-1',waybill:'WB-1',tab:'待确认',status:'待处理'} as InstructionListRow;
test('blank reasons cannot reject instructions or change storage',()=>{
  memory.clear();
  for(const reason of ['', '  ', '\n\t']) assert.throws(()=>rejectInstructions([row],reason), /请填写驳回原因/);
  assert.equal(memory.size,0); assert.equal(row.tab,'待确认');
});
test('batch rejection trims reasons, persists status and isolates different waybills',()=>{
  memory.clear();
  const second = {...row,id:'2',instructionNo:'CI-2'};
  const result=rejectInstructions([row,second],'  信息不完整\n请补充附件  ');
  assert.equal(result.length,2);
  for(const original of [row,second]) {
    const restored=applyInstructionRejection(original);
    assert.equal(restored.tab,'驳回');assert.equal(restored.status,'已驳回');
    assert.equal(restored.rejectionReason,'信息不完整\n请补充附件');
    assert.ok(restored.updated);
  }
  assert.equal(applyInstructionRejection({...row,waybill:'OTHER'}).tab,'待确认');
  assert.equal(row.tab,'待确认');
});
test('invalid batches and failed storage do not partially reject',()=>{
  memory.clear();
  assert.throws(()=>rejectInstructions([row,{...row,tab:'已确认'}],'信息不完整'));
  assert.throws(()=>rejectInstructions([],'信息不完整'));
  assert.throws(()=>rejectInstructions([row],'字'.repeat(501)));
  fail=true;assert.throws(()=>rejectInstructions([row],'信息不完整'));fail=false;
  assert.equal(applyInstructionRejection(row).tab,'待确认');assert.equal(memory.size,0);
});
test('malformed cache is ignored',()=>{
  for(const value of ['invalid','null','[]',JSON.stringify({'CI-1':{waybill:'WB-1',reason:'  ',updated:'today'}})]) {
    memory.set(REJECTION_STORAGE_KEY,value);assert.equal(applyInstructionRejection(row).tab,'待确认');
  }
});
