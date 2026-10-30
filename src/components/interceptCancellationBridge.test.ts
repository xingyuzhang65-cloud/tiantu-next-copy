import assert from 'node:assert/strict';
import {test} from 'node:test';
import {cancelWarehouseIntercepts} from './interceptCancellationBridge';
const pending={no:'INT-1',waybillNo:'WB-1',status:'待处理',logs:[]};
const confirmed={no:'INT-2',waybillNo:'WB-2',status:'已确认',logs:[]};
test('pending cancellation updates only the exact warehouse request and records the reason',()=>{
 const next=cancelWarehouseIntercepts([pending,confirmed],[{no:pending.no,waybillNo:pending.waybillNo}],'客户要求取消');
 assert.equal(next[0].status,'已取消');assert.equal(next[0].logs.length,1);assert.equal(pending.status,'待处理');assert.equal(next[1],confirmed);
 const retry=cancelWarehouseIntercepts(next,[{no:pending.no,waybillNo:pending.waybillNo}],'客户要求取消');assert.equal(retry[0].logs.length,1);
});
test('confirmed and later warehouse states reject cancellation without changing any selected task',()=>{
 for(const status of ['已确认','拦截中','已完成','已驳回']){
 const tasks=[pending,{...confirmed,status}];const before=JSON.stringify(tasks);
 assert.throws(()=>cancelWarehouseIntercepts(tasks,tasks.map(t=>({no:t.no,waybillNo:t.waybillNo})),'取消'),/取消下单失败/);assert.equal(JSON.stringify(tasks),before);
 }
});
test('missing, mismatched, and ambiguous warehouse identities fail closed',()=>{
 assert.throws(()=>cancelWarehouseIntercepts([pending],[{no:'wrong',waybillNo:pending.waybillNo}],'取消'),/唯一对应/);
 assert.throws(()=>cancelWarehouseIntercepts([pending,{...pending,no:'INT-3'}],[{waybillNo:pending.waybillNo}],'取消'),/唯一对应/);
 assert.throws(()=>cancelWarehouseIntercepts([pending],[{no:pending.no,waybillNo:pending.waybillNo}],' '),/填写取消原因/);
});
