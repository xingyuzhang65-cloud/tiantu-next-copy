import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialOverseasInventory, createReleaseDraft, validateInventoryRelease, submitInventoryRelease,
  persistOverseasInventory, loadOverseasInventory, updateInventoryLocation, getInventoryFeeCatalog,
  OVERSEAS_INVENTORY_STORAGE_KEY, exportInventoryCsv,
} from './overseasStorageInventoryData';

const memory = new Map<string,string>();
Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{
  getItem:(key:string)=>memory.get(key)??null,setItem:(key:string,value:string)=>memory.set(key,value),removeItem:(key:string)=>memory.delete(key),
}});
function shippingDraft() {
  const state=createInitialOverseasInventory(); const row=state.records[0];
  const draft=createReleaseDraft([row]);
  Object.assign(draft,{boxIds:row.cargoBoxes.filter(box=>box.status==='待处理').slice(0,2).map(box=>box.id),boxCount:2,
    scheduledAt:'2026-10-20',shipmentId:'FBA-TEST-001',referenceId:'REF-001'});
  return {state,row,draft};
}
test('reference inventory has consistent box states across three actual stages',()=>{
  const state=createInitialOverseasInventory();
  assert.deepEqual(['暂存','待出库','已出库'].map(stage=>state.records.filter(row=>row.status===stage).length),[13,95,30]);
  for(const row of state.records){
    assert.equal(row.pending+row.unsent+row.sent,row.boxes);
    assert.equal(row.cargoBoxes.length,row.boxes);
    assert.equal(row.cargoBoxes.filter(box=>box.status==='待处理').length,row.unsent);
  }
});
test('intercepted inventory can submit an application without claiming warehouse dispatch',()=>{
  const {state,row,draft}=shippingDraft();
  assert(row.blocked.includes('拦截'));
  assert.equal(validateInventoryRelease(state,[row.id],draft),null);
  const next=submitInventoryRelease(state,[row.id],draft);
  assert.equal(next.orders[0].status,'待审批');
  assert.equal(next.records[0].unsent,row.unsent-2);
  assert.equal(next.records[0].pending,row.pending+2);
  assert.equal(next.records[0].sent,row.sent);
  assert.equal(state.records[0].unsent,7,'must not mutate original state');
  assert.equal(validateInventoryRelease(next,[row.id],draft),'所选货箱已被占用或已出库，请重新选择');
});
test('invalid selections, foreign customer, stale rows and fractional quantities are rejected',()=>{
  const {state,row,draft}=shippingDraft();
  assert.match(validateInventoryRelease(state,[],draft)!,/勾选/);
  assert.match(validateInventoryRelease(state,['missing'],draft)!,/变更/);
  assert.match(validateInventoryRelease(state,[row.id,'staging-2'],draft)!,/同一客户/);
  assert.match(validateInventoryRelease(state,[row.id],{...draft,boxCount:1.5})!,/整数/);
  assert.match(validateInventoryRelease(state,[row.id],{...draft,boxIds:[draft.boxIds[0],draft.boxIds[0]]})!,/货箱数量/);
  assert.match(validateInventoryRelease(state,[row.id],{...draft,boxIds:[draft.boxIds[0],'ready-1:box:1']})!,/占用/);
});
test('conditional fields are required only for the active release and waybill type',()=>{
  const {state,row,draft}=shippingDraft();
  assert.match(validateInventoryRelease(state,[row.id],{...draft,shipmentId:''})!,/ShipmentID/);
  for(const waybillType of ['Walmart','Tiktok','私人地址'] as const){
    const alternate={...draft,waybillType,shipmentId:'',referenceId:''};
    assert.equal(validateInventoryRelease(state,[row.id],alternate),null);
  }
  const service={...draft,kind:'增值服务' as const,shipmentId:'',referenceId:'',scheduledAt:'',destination:'',deliveryMethod:''};
  assert.equal(validateInventoryRelease(state,[row.id],service),null);
  assert.match(validateInventoryRelease(state,[row.id],{...service,kind:'销毁'})!,/箱号/);
  assert.equal(validateInventoryRelease(state,[row.id],{...service,kind:'销毁',destroyBoxNo:row.cargoBoxes[0].boxNo}),null);
  const pickup=submitInventoryRelease(state,[row.id],{...service,kind:'自提',pickupAt:'2026-10-21T13:30'}).orders[0];
  assert.equal(pickup.deliveryMethod,'客户自提');
  assert.equal(pickup.pickupAt,'2026-10-21T13:30');
  assert.equal(pickup.shipmentId,'');
  const fba=submitInventoryRelease(state,[row.id],{...draft,address:'stale private address',company:'stale company',services:['贴标']}).orders[0];
  assert.equal(fba.address,'');assert.equal(fba.company,'');assert.deepEqual(fba.services,[]);
});
test('fees, attachment bytes and optional address fields survive a save and reload',()=>{
  memory.clear();const {state,row,draft}=shippingDraft();
  const attachment={id:'file-1',name:'label.pdf',size:3,type:'application/pdf',dataUrl:'data:application/pdf;base64,YWJj'};
  const fee={...getInventoryFeeCatalog()[0],id:'selected-fee',unitPrice:2,quantity:2,exchangeRate:7.1,images:[{...attachment,id:'image-1',name:'proof.png',type:'image/png',dataUrl:'data:image/png;base64,YWJj'}]};
  const next=submitInventoryRelease(state,[row.id],{...draft,waybillType:'Walmart',shipmentId:'',referenceId:'',company:'Example',address:'Test avenue',overseasRemark:'Keep upright',attachments:[attachment],instructions:[fee]});
  persistOverseasInventory(next);const loaded=loadOverseasInventory();
  assert.equal(loaded.orders.length,1);assert.equal(loaded.orders[0].company,'Example');
  assert.equal(loaded.orders[0].attachments[0].dataUrl,attachment.dataUrl);
  assert.equal(loaded.orders[0].instructions[0].images?.[0].name,'proof.png');
  assert.equal(loaded.records[0].unsent,5);
  const changed=updateInventoryLocation(loaded,[row.id],' Z-20 ');
  assert.equal(changed.records[0].location,'Z-20');assert.equal(changed.logs[0].action,'更换库位');
  const invalid=structuredClone(changed);invalid.records[0].unsent=999;
  memory.set(OVERSEAS_INVENTORY_STORAGE_KEY,JSON.stringify(invalid));
  assert.equal(loadOverseasInventory().records[0].unsent,7,'corrupt local data must be recovered');
});
test('fee dictionary respects instruction management edits and disabled rows',()=>{
  memory.clear();const defaults=getInventoryFeeCatalog();const fee=defaults[0];
  memory.set('tiantu-instruction-management-reference-v1',JSON.stringify({rows:[
    {code:fee.code,name:'Edited fee',type:'开箱费',unit:'箱',price:8,currency:'美元',status:'启用'},
  ]}));
  assert.equal(getInventoryFeeCatalog().find(row=>row.code===fee.code)?.unitPrice,8);
  memory.set('tiantu-instruction-management-reference-v1',JSON.stringify({rows:[
    {code:fee.code,name:'Disabled fee',type:'开箱费',unit:'箱',price:8,currency:'美元',status:'停用'},
  ]}));
  assert.equal(getInventoryFeeCatalog().some(row=>row.code===fee.code),false);
  memory.clear();
});
test('recovering data rejects boxes duplicated across inventories or allocated by multiple requests',()=>{
  memory.clear();const {state,row,draft}=shippingDraft();
  const duplicate=structuredClone(state);
  duplicate.records[1].cargoBoxes[0].id=duplicate.records[0].cargoBoxes[0].id;
  memory.set(OVERSEAS_INVENTORY_STORAGE_KEY,JSON.stringify(duplicate));
  const restored=loadOverseasInventory();
  assert.equal(new Set(restored.records.flatMap(r=>r.cargoBoxes.map(b=>b.id))).size,restored.records.reduce((sum,r)=>sum+r.boxes,0));
  const next=submitInventoryRelease(state,[row.id],draft);
  next.orders.push({...next.orders[0],id:'duplicate-order',applicationNo:'duplicate-order'});
  memory.set(OVERSEAS_INVENTORY_STORAGE_KEY,JSON.stringify(next));
  assert.equal(loadOverseasInventory().orders.length,0);
  memory.clear();
});
test('CSV keeps identifiers, quotes and guards spreadsheet formula cells',()=>{
  const row=createInitialOverseasInventory().records[0];
  const csv=exportInventoryCsv([{...row,customer:'=1+1',remark:'"care", fragile'}]);
  assert(csv.startsWith('\uFEFF'));assert(csv.includes('"\'=1+1"'));assert(csv.includes('""care"", fragile'));
});
