import test from 'node:test';
import assert from 'node:assert/strict';
import { getInstructionWaybillContext } from './instructionWaybillContext';
import { createInitialOverseasInventory, createReleaseDraft } from './overseasStorageInventoryData';
import type { InstructionListRow } from './instructionListTypes';
import type { ReleaseOrder } from './overseasStorageInventoryData';

const row: InstructionListRow = {id:'ci',tab:'待确认',waybill:'WB-1',instructionNo:'CI-1',names:['发货'],created:'2026-10-19',updated:'2026-10-19',
  shipment:'FBA-SOURCE',reference:'REF-SOURCE',status:'待处理',customer:'客户',warehouse:'FTW1',zip:'',orderType:'亚马逊',instructionType:'放货',
  destination:'MW003',salesman:'',merchandiser:'',fee:'-',packages:'2',weight:'15',volume:'0.1',arrived:'是',overseasTime:''};

test('unknown stock context uses source instruction fields without inventing stock or changing box totals',()=>{
  const inventory=createInitialOverseasInventory();const snapshot=structuredClone(inventory);
  const result=getInstructionWaybillContext(row,inventory);
  assert.deepEqual(result.fields,{shipmentId:'FBA-SOURCE',referenceId:'REF-SOURCE',scheduledAt:'',remark:''});
  assert.equal(result.summary.waybillType,'FBA');assert.equal(result.summary.destination,'FTW1');assert.equal(result.summary.boxCount,'2');
  for(const field of ['deliveryMethod','palletLabel'] as const)assert.equal(result.summary[field],'');
  assert.equal(result.summary.customer,row.customer);assert.equal(result.summary.waybill,row.waybill);assert.equal(result.summary.instructionType,row.instructionType);
  assert.deepEqual(inventory,snapshot);assert.equal(row.packages,'2');
});

test('summary keeps the selected list identity and box count while using the shared pallet label',()=>{
  const inventory=createInitialOverseasInventory();
  Object.assign(inventory.records[0],{waybillNo:' wb-1 ',pallet:'PALLET-A',container:'CONT-A'});
  Object.assign(inventory.records[1],{waybillNo:'WB-1',pallet:'PALLET-A',container:'CONT-B'});
  Object.assign(inventory.records[2],{waybillNo:'WB-10',pallet:'FOREIGN-PALLET'});
  const result=getInstructionWaybillContext({...row,palletLabel:'STALE-PALLET'},inventory);
  assert.equal(result.summary.palletLabel,'PALLET-A');
  assert.equal(result.summary.customer,row.customer);assert.equal(result.summary.waybill,row.waybill);assert.equal(result.summary.instructionType,row.instructionType);
  assert.equal(result.summary.boxCount,'2');
  inventory.records[0].waybillNo='';
  assert.equal(getInstructionWaybillContext({...row,waybill:''},inventory).summary.palletLabel,'');
});

test('release defaults require consensus and never borrow mixed-waybill order details',()=>{
  const inventory=createInitialOverseasInventory();const stock=inventory.records[0];stock.waybillNo='WB-1';
  const makeOrder=(id:string,date:string,recordIds=[stock.id]):ReleaseOrder=>({...createReleaseDraft([stock]),id,recordIds,applicationNo:'APP-'+id,
    createdAt:'2026-10-19',status:'待审批',scheduledAt:date,shipmentId:'FBA-ORDER',referenceId:'REF-ORDER',remark:'预约备注'});
  inventory.orders=[makeOrder('a','2026-10-22')];
  let result=getInstructionWaybillContext({...row,shipment:'-',reference:'-'},inventory);
  assert.deepEqual(result.fields,{shipmentId:'FBA-ORDER',referenceId:'REF-ORDER',scheduledAt:'2026-10-22',remark:'预约备注'});
  inventory.orders.push(makeOrder('b','2026-10-23'));
  assert.equal(getInstructionWaybillContext(row,inventory).fields.scheduledAt,'');
  inventory.orders=[makeOrder('mixed','2026-10-25',[stock.id,inventory.records[1].id])];
  result=getInstructionWaybillContext(row,inventory);assert.equal(result.fields.scheduledAt,'');assert.equal(result.fields.remark,'');
});
