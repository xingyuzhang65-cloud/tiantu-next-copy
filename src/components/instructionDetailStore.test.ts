import test from 'node:test';
import assert from 'node:assert/strict';
import { applyInstructionDetailOverrides, getInstructionFeeTotal, INSTRUCTION_DETAIL_STORAGE_KEY, loadInstructionDetail, saveInstructionDetail } from './instructionDetailStore';
import type { InstructionListRow } from './instructionListTypes';
import type { InstructionDetailState, InstructionWaybillFields } from './instructionDetailStore';

const memory = new Map<string,string>();
let failSave = false;
Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{
  getItem:(key:string)=>memory.get(key)??null,
  setItem:(key:string,value:string)=>{if(failSave)throw new Error('quota');memory.set(key,value);},
}});
const row: InstructionListRow = {
  id:'1',tab:'待确认',waybill:'USSZ202608160010',instructionNo:'CI20260816212041676418',names:['拍照5','拍照4','换单2'],
  created:'2026-08-16 21:20:41',updated:'2026-08-16 21:23:46',shipment:'FBA19KBC16CK',reference:'-',status:'已处理',
  customer:'郑志强',warehouse:'FTW1',zip:'75241-7203',orderType:'亚马逊',instructionType:'放货',destination:'MW003',
  salesman:'公司',merchandiser:'天惠',fee:'144',packages:'1',weight:'15',volume:'0.0358',arrived:'是',overseasTime:'2026-08-16 21:19:38',
};
test('detail edits survive reload, preserve original list data and update the list fee total',()=>{
  memory.clear();const detail=loadInstructionDetail(row);
  assert.equal(getInstructionFeeTotal(detail.fees),144);assert.equal(detail.feesEdited,false);
  const next={...detail,feesEdited:true,fees:[{...detail.fees[0],unitPrice:20,quantity:3,exchangeRate:7.1}],customerNote:'客户要求换单后拍照',internalRemark:'先核对标签',updatedAt:'2026-10-19 10:00:00'};
  saveInstructionDetail(row,next);
  const saved=loadInstructionDetail(row);assert.equal(saved.fees[0].originalAmount,60);assert.equal(saved.fees[0].rmbAmount,426);
  const restored=applyInstructionDetailOverrides(row);assert.equal(restored.fee,'426');assert.equal(restored.customerNote,next.customerNote);
  assert.equal(restored.waybill,row.waybill);assert.equal(restored.packages,row.packages);assert.equal(row.fee,'144');
  saved.fees[0].unitPrice=999;assert.equal(loadInstructionDetail(row).fees[0].unitPrice,20);
});
test('attachment metadata changes do not convert unknown instruction fees to zero',()=>{
  memory.clear();const pickup={...row,id:'pickup',instructionNo:'CI-PICKUP',instructionType:'自提',fee:'-'};
  const detail=loadInstructionDetail(pickup);assert.deepEqual(detail.fees,[]);
  detail.attachments=[{id:'file-1',name:'提货单.txt',type:'底单',customerVisible:'可见',fileSize:'3 B',uploadedBy:'当前用户',uploadedAt:'2026-10-19 10:00:00',dataUrl:'data:text/plain;base64,YWJj'}];
  saveInstructionDetail(pickup,detail);assert.equal(applyInstructionDetailOverrides(pickup).fee,'-');
  assert.equal(loadInstructionDetail(pickup).attachments[0].dataUrl,'data:text/plain;base64,YWJj');
  saveInstructionDetail(pickup,{...detail,feesEdited:true,fees:[]});assert.equal(applyInstructionDetailOverrides(pickup).fee,'0');
});
test('records are isolated by instruction number and waybill, and invalid or failed saves do not replace valid data',()=>{
  memory.clear();const detail=loadInstructionDetail(row);saveInstructionDetail(row,{...detail,customerNote:'保留备注'});
  const snapshot=memory.get(INSTRUCTION_DETAIL_STORAGE_KEY);
  assert.equal(loadInstructionDetail({...row,instructionNo:'CI-OTHER'}).customerNote,'');
  assert.equal(loadInstructionDetail({...row,waybill:'USSZ-OTHER'}).customerNote,'');
  assert.throws(()=>saveInstructionDetail(row,{...detail,fees:[{...detail.fees[0],exchangeRate:0}]}));
  assert.equal(memory.get(INSTRUCTION_DETAIL_STORAGE_KEY),snapshot);
  failSave=true;assert.throws(()=>saveInstructionDetail(row,{...detail,customerNote:'未保存'}),/quota/);failSave=false;
  assert.equal(loadInstructionDetail(row).customerNote,'保留备注');
});

test('legacy fee records remain readable without operation instruction metadata',()=>{
  memory.clear();const detail=loadInstructionDetail(row);
  const {instructionRemark:_remark,images:_images,status:_status,...legacyFee}=detail.fees[0];
  memory.set(INSTRUCTION_DETAIL_STORAGE_KEY,JSON.stringify({[row.instructionNo]:{
    ...detail,fees:[legacyFee],instructionNo:row.instructionNo,waybill:row.waybill,
  }}));
  const restored=loadInstructionDetail(row);
  assert.deepEqual(restored.fees,[legacyFee]);
  assert.equal(restored.waybillInfo,undefined);
  saveInstructionDetail(row,restored);
  assert.equal(loadInstructionDetail(row).fees[0].status,undefined);
  assert.equal(applyInstructionDetailOverrides(row).fee,row.fee);
});

test('waybill edits survive reload and update only editable list fields',()=>{
  memory.clear();const detail=loadInstructionDetail(row);
  const originalRow={...row};
  const waybillInfo:InstructionWaybillFields={shipmentId:'FBA-EDITED',referenceId:'REF-EDITED',scheduledAt:'2026-10-20T14:30',remark:'预约下午发货'};
  saveInstructionDetail(row,{...detail,waybillInfo});
  const saved=loadInstructionDetail(row);
  assert.deepEqual(saved.waybillInfo,waybillInfo);
  assert.equal(saved.feesEdited,false);
  assert.deepEqual(saved.fees,detail.fees);
  assert.deepEqual(saved.attachments,detail.attachments);
  const updated=applyInstructionDetailOverrides(row);
  assert.equal(updated.shipment,'FBA-EDITED');assert.equal(updated.reference,'REF-EDITED');
  assert.equal(updated.scheduledAt,'2026-10-20T14:30');assert.equal(updated.waybillRemark,'预约下午发货');
  assert.equal(updated.waybill,row.waybill);assert.equal(updated.instructionNo,row.instructionNo);
  assert.equal(updated.packages,row.packages);assert.equal(updated.weight,row.weight);assert.equal(updated.volume,row.volume);
  assert.equal(updated.fee,row.fee);assert.deepEqual(row,originalRow);
  waybillInfo.remark='修改原始对象';saved.waybillInfo!.shipmentId='修改加载对象';
  assert.equal(loadInstructionDetail(row).waybillInfo!.remark,'预约下午发货');
  assert.equal(loadInstructionDetail(row).waybillInfo!.shipmentId,'FBA-EDITED');
});

test('waybill saves preserve unknown fees, attachments, notes and readonly identity while dropping extra payload fields',()=>{
  memory.clear();const unknown={...row,instructionNo:'CI-UNKNOWN',fee:'-',customerNote:'客户原备注',internalRemark:'内部原备注',failureReason:'历史结果'};
  const detail=loadInstructionDetail(unknown);
  detail.attachments=[{id:'file-1',name:'发货单.txt',type:'底单',customerVisible:'可见',fileSize:'3 B',uploadedBy:'当前用户',uploadedAt:'2026-10-19 10:00:00',dataUrl:'data:text/plain;base64,YWJj'}];
  const payload={...detail,waybill:'USSZ-REPLACED',packages:'999',waybillInfo:{
    shipmentId:'',referenceId:'',scheduledAt:'',remark:'',waybill:'USSZ-REPLACED',packages:'999',destination:'OTHER',
  }};
  saveInstructionDetail(unknown,payload);
  const stored=JSON.parse(memory.get(INSTRUCTION_DETAIL_STORAGE_KEY)!)[unknown.instructionNo];
  assert.deepEqual(stored.waybillInfo,{shipmentId:'',referenceId:'',scheduledAt:'',remark:''});
  assert.equal(stored.waybill,unknown.waybill);assert.equal(stored.packages,undefined);
  const updated=applyInstructionDetailOverrides(unknown);
  assert.equal(updated.shipment,'-');assert.equal(updated.reference,'-');
  assert.equal(updated.fee,'-');assert.equal(updated.packages,unknown.packages);assert.equal(updated.destination,unknown.destination);
  assert.equal(updated.customerNote,unknown.customerNote);assert.equal(updated.internalRemark,unknown.internalRemark);
  assert.equal(updated.failureReason,unknown.failureReason);
  assert.deepEqual(loadInstructionDetail(unknown).attachments,detail.attachments);
});

test('waybill dates accept actual calendar dates and local times and reject malformed values without replacing saved data',()=>{
  memory.clear();const detail=loadInstructionDetail(row);
  const waybillInfo:InstructionWaybillFields={shipmentId:'FBA-1',referenceId:'REF-1',scheduledAt:'',remark:''};
  for(const scheduledAt of ['','2026-10-20','2028-02-29','2000-02-29','2026-10-20T00:00','2026-10-20T23:59:59.999']){
    saveInstructionDetail(row,{...detail,waybillInfo:{...waybillInfo,scheduledAt}});
    assert.equal(loadInstructionDetail(row).waybillInfo!.scheduledAt,scheduledAt);
  }
  const snapshot=memory.get(INSTRUCTION_DETAIL_STORAGE_KEY);
  const invalidDates=['2026-02-29','1900-02-29','2026-04-31','2026-00-20','2026-13-01','2026-10-00','0000-01-01',
    '2026-1-1','2026-10-20T24:00','2026-10-20T12:60','2026-10-20T12:30:60','2026-10-20 12:30','garbage'];
  for(const scheduledAt of invalidDates){
    assert.throws(()=>saveInstructionDetail(row,{...detail,waybillInfo:{...waybillInfo,scheduledAt}}));
    assert.equal(memory.get(INSTRUCTION_DETAIL_STORAGE_KEY),snapshot);
  }
  const invalidShapes=[null,[],{},'invalid',{...waybillInfo,shipmentId:1},{...waybillInfo,referenceId:null},
    {...waybillInfo,scheduledAt:false},{...waybillInfo,remark:[]},{shipmentId:'',referenceId:'',scheduledAt:''}];
  for(const invalid of invalidShapes){
    assert.throws(()=>saveInstructionDetail(row,{...detail,waybillInfo:invalid} as unknown as InstructionDetailState));
    assert.equal(memory.get(INSTRUCTION_DETAIL_STORAGE_KEY),snapshot);
  }
});

test('operation instruction remarks, actual images and status survive fee normalization and reload',()=>{
  memory.clear();const detail=loadInstructionDetail(row);
  const fee={...detail.fees[0],instructionRemark:'完成换标后拍照',status:'待处理',
    images:[{id:'image-1',name:'换标结果.png',dataUrl:'data:image/png;base64,YWJj'},
      {id:'image-2',name:'待回传照片.png'}],unitPrice:12.5,quantity:2};
  saveInstructionDetail(row,{...detail,feesEdited:true,fees:[fee]});
  const updated=applyInstructionDetailOverrides(row);
  assert.equal(updated.fee,'25');
  const restored=loadInstructionDetail(updated).fees[0];
  assert.equal(restored.instructionRemark,fee.instructionRemark);
  assert.equal(restored.status,fee.status);
  assert.deepEqual(restored.images,fee.images);
  assert.equal(restored.originalAmount,25);
  assert.equal(restored.rmbAmount,25);
  restored.images![0].name='仅修改当前视图';
  assert.equal(loadInstructionDetail(updated).fees[0].images![0].name,'换标结果.png');
});

test('malformed optional operation instruction metadata cannot overwrite valid records',()=>{
  memory.clear();const detail=loadInstructionDetail(row);saveInstructionDetail(row,detail);
  const snapshot=memory.get(INSTRUCTION_DETAIL_STORAGE_KEY);
  const invalidMetadata=[{instructionRemark:12},{status:false},{images:{}},
    {images:[{id:1,name:'照片.png'}]},{images:[{id:'image',name:null}]},
    {images:[{id:'image',name:'照片.png',dataUrl:1}]}];
  for(const metadata of invalidMetadata){
    assert.throws(()=>saveInstructionDetail(row,{...detail,fees:[{...detail.fees[0],...metadata} as typeof detail.fees[number]]}));
    assert.equal(memory.get(INSTRUCTION_DETAIL_STORAGE_KEY),snapshot);
  }
});
