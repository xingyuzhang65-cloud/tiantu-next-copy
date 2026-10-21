import test from 'node:test';
import assert from 'node:assert/strict';
import { getInstructionCargoRows } from './instructionCargoRows';
import { createInitialOverseasInventory } from './overseasStorageInventoryData';
import type { InstructionListRow } from './instructionListTypes';

const row={id:'test',packages:'2',waybill:'UNKNOWN',instructionNo:'CI-TEST',names:[],tab:'待确认',status:'待处理',fee:'-',weight:'25',volume:'0.1'} as InstructionListRow;
test('unidentified cargo provides stable per-box rows without inventing box numbers or weights',()=>{
  const inventory=createInitialOverseasInventory();
  const boxes=getInstructionCargoRows(row,inventory);
  assert.equal(boxes.length,2);assert.equal(new Set(boxes.map(box=>box.id)).size,2);
  assert(boxes.every(box=>box.boxNo==='—'&&box.packages===1&&!box.customerLines.some(line=>line.includes('25'))));
  assert.deepEqual(getInstructionCargoRows({...row,updated:'later'},inventory),boxes);
});
test('matching inventory is used only when its cargo count agrees with the instruction',()=>{
  const inventory=createInitialOverseasInventory(),record=inventory.records[0];
  const exact={...row,waybill:record.waybillNo!,packages:String(record.boxes)};
  const boxes=getInstructionCargoRows(exact,inventory);
  assert.deepEqual(boxes.map(box=>box.id),record.cargoBoxes.map(box=>box.id));
  assert.deepEqual(boxes.map(box=>box.boxNo),record.cargoBoxes.map(box=>box.boxNo));
  assert.equal(getInstructionCargoRows({...exact,packages:'1'},inventory)[0].boxNo,'—');
});
