import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialOverseasInventory, createReleaseDraft, validateInventoryRelease, submitInventoryRelease,
  persistOverseasInventory, loadOverseasInventory, updateInventoryLocation, getInventoryFeeCatalog,
  OVERSEAS_INVENTORY_STORAGE_KEY, exportInventoryCsv,
} from './overseasStorageInventoryData';
import { getOverseasInventoryExample } from './overseasStorageInventoryExamples';

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
  assert.deepEqual(state.orders,[],'sample instructions must not create release requests');
  assert.deepEqual([state.records[0].boxes,state.records[0].pending,state.records[0].unsent,state.records[0].sent],[11,0,7,4]);
  for(const row of state.records){
    assert(['拦截','暂存'].includes(row.blocked),'inventory type must use one of the two supported labels');
    for(const key of ['waybillNo','fbaNo','warehouseCode','service'] as const)assert(row[key]?.trim(),'every sample inventory needs independent '+key);
    const instructions=row.instructions??[];
    assert(instructions.length>=2&&instructions.length<=3,'every sample inventory needs two or three instructions');
    assert.equal(new Set(instructions.map(fee=>fee.id)).size,instructions.length);
    for(const fee of instructions){
      for(const key of ['id','code','name','type','unit','currency','addedAt','addedBy'] as const)assert(fee[key].trim(),'sample instruction '+key+' must be populated');
      assert.equal(typeof fee.feeRemark,'string');assert.equal(typeof fee.instructionRemark,'string');
      assert(['待处理','已处理'].includes(fee.status));
      assert([fee.unitPrice,fee.quantity].every(value=>Number.isFinite(value)&&value>=0));
      assert(Number.isFinite(fee.exchangeRate)&&fee.exchangeRate>0);
    }
    assert.equal(row.pending+row.unsent+row.sent,row.boxes);
    assert.equal(row.cargoBoxes.length,row.boxes);
    assert.equal(row.cargoBoxes.filter(box=>box.status==='待处理').length,row.unsent);
  }
  const instructions=state.records.flatMap(row=>row.instructions??[]);
  assert(new Set(instructions.map(fee=>fee.type)).size>1,'sample instruction types should be varied');
  assert.deepEqual([...new Set(instructions.map(fee=>fee.status))].sort(),['已处理','待处理'].sort());
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
  const identifiers={waybillNo:'WB-CUSTOM-0001',fbaNo:'FBA-CUSTOM-0001',warehouseCode:'WH-CUSTOM-01',service:'定制仓储服务'};
  Object.assign(row,identifiers);
  const attachment={id:'file-1',name:'label.pdf',size:3,type:'application/pdf',dataUrl:'data:application/pdf;base64,YWJj'};
  const fee={...getInventoryFeeCatalog()[0],id:'selected-fee',unitPrice:2,quantity:2,exchangeRate:7.1,images:[{...attachment,id:'image-1',name:'proof.png',type:'image/png',dataUrl:'data:image/png;base64,YWJj'}]};
  row.instructions=[{...fee,id:'custom-inventory-instruction',name:'自定义库存指令',instructionRemark:'Keep my instruction'}];
  state.records[1].instructions=[];
  const next=submitInventoryRelease(state,[row.id],{...draft,waybillType:'Walmart',shipmentId:'',referenceId:'',company:'Example',address:'Test avenue',overseasRemark:'Keep upright',attachments:[attachment],instructions:[fee]});
  persistOverseasInventory(next);const loaded=loadOverseasInventory();
  assert.equal(loaded.orders.length,1);assert.equal(loaded.orders[0].company,'Example');
  assert.equal(loaded.orders[0].attachments[0].dataUrl,attachment.dataUrl);
  assert.equal(loaded.orders[0].instructions[0].images?.[0].name,'proof.png');
  assert.equal(loaded.records[0].unsent,5);
  assert.deepEqual(loaded.records[0].instructions,row.instructions,'saved inventory instructions must not be replaced by examples');
  assert.deepEqual(loaded.records[1].instructions,[],'an explicitly saved empty instruction list must remain empty');
  for(const key of ['waybillNo','fbaNo','warehouseCode','service'] as const)assert.equal(loaded.records[0][key],identifiers[key]);
  const csv=exportInventoryCsv([loaded.records[0]]);
  for(const heading of ['运单号','FBA号','仓库代码','服务'])assert(csv.includes(heading));
  for(const value of Object.values(identifiers))assert(csv.includes(value),'CSV must preserve independently stored inventory metadata');

  const legacy={...structuredClone(loaded),records:loaded.records.map(record=>({...structuredClone(record),blocked:String(record.blocked)}))};
  for(const record of legacy.records){
    delete record.waybillNo;delete record.fbaNo;delete record.warehouseCode;delete record.service;
    delete record.instructions;
  }
  Object.assign(legacy.records[5],identifiers,{remark:'Keep my inventory remark',instructions:structuredClone(row.instructions)});
  legacy.records[6].instructions=[];
  legacy.records[0].blocked='拆柜前拦截';legacy.records[1].blocked='拆柜后拦截，待确认';
  legacy.records[2].blocked='是';legacy.records[3].blocked='暂存';legacy.records[4].blocked='';
  memory.set(OVERSEAS_INVENTORY_STORAGE_KEY,JSON.stringify(legacy));
  const migrated=loadOverseasInventory();
  assert.deepEqual(migrated.orders,loaded.orders,'adding optional inventory fields must preserve existing requests');
  assert.deepEqual(migrated.logs,loaded.logs);
  assert.deepEqual(migrated.records[0].cargoBoxes,loaded.records[0].cargoBoxes);
  assert.deepEqual(migrated.records.slice(0,5).map(record=>record.blocked),['拦截','拦截','拦截','暂存','暂存']);
  assert(migrated.records.every(record=>['拦截','暂存'].includes(record.blocked)));
  for(const key of ['waybillNo','fbaNo','warehouseCode','service'] as const){
    assert(migrated.records[0][key]?.trim(),'known legacy examples should receive missing '+key);
    assert.equal(migrated.records[5][key],identifiers[key],'existing custom metadata must survive example enrichment');
  }
  assert(migrated.records[0].instructions?.length===2||migrated.records[0].instructions?.length===3);
  assert.deepEqual(migrated.records[5].instructions,row.instructions);
  assert.equal(migrated.records[5].remark,'Keep my inventory remark');
  assert.deepEqual(migrated.records[6].instructions,[]);
  const repeated=loadOverseasInventory();
  assert.deepEqual(repeated.records.map(record=>record.instructions),migrated.records.map(record=>record.instructions),'repeated legacy loads must not append examples');
  persistOverseasInventory(migrated);
  assert.deepEqual(loadOverseasInventory().records.map(record=>record.instructions),migrated.records.map(record=>record.instructions),'saved example enrichment must remain stable');
  const changed=updateInventoryLocation(migrated,[row.id],' Z-20 ');
  assert.equal(changed.records[0].location,'Z-20');assert.equal(changed.logs[0].action,'更换库位');
  const invalid=structuredClone(changed);invalid.records[0].unsent=999;
  memory.set(OVERSEAS_INVENTORY_STORAGE_KEY,JSON.stringify(invalid));
  assert.equal(loadOverseasInventory().records[0].unsent,7,'corrupt local data must be recovered');
});
test('inventory remarks start empty and remove only matching legacy example text on load',()=>{
  memory.clear();const {state,row,draft}=shippingDraft();
  assert(state.records.every(record=>record.remark===''),'sample inventory remarks must start empty');
  const image={id:'saved-image',name:'proof.png',size:3,type:'image/png',dataUrl:'data:image/png;base64,YWJj'};
  row.instructions![0]={...row.instructions![0],feeRemark:'Keep fee remark',instructionRemark:'Keep instruction remark',images:[image]};
  const next=submitInventoryRelease(state,[row.id],{...draft,remark:'Keep order remark',overseasRemark:'Keep overseas remark',instructions:[structuredClone(row.instructions![0])]});
  next.records[0].remark=getOverseasInventoryExample(next.records[0])!.remark;
  next.records[1].remark='Keep customer inventory remark';
  persistOverseasInventory(next);
  const stored=memory.get(OVERSEAS_INVENTORY_STORAGE_KEY);
  const loaded=loadOverseasInventory();
  assert.equal(loaded.records[0].remark,'','previous autogenerated inventory remarks must be cleared');
  assert.equal(loaded.records[1].remark,'Keep customer inventory remark');
  assert.deepEqual(loaded.records[0].instructions,next.records[0].instructions,'fee and instruction remarks and images must survive');
  assert.deepEqual(loaded.orders,next.orders,'order remarks and instructions must survive');
  assert.deepEqual(loaded.records[0].cargoBoxes,next.records[0].cargoBoxes);
  assert.equal(memory.get(OVERSEAS_INVENTORY_STORAGE_KEY),stored,'loading must not rewrite persisted inventory');
  memory.clear();
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
