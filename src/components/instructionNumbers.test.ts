import test from 'node:test';
import assert from 'node:assert/strict';
import { assignInstructionNumbers } from './instructionNumbers';

const make=(id:string,waybill:string,created:string,instructionNo='CI-'+id)=>({id,waybill,created,instructionNo});
test('numbers are waybill_MMDD_sequence, chronological across statuses and independent of input order',()=>{
  const rows=[make('late','WB001','2026-10-21 11:00:00'),make('early','WB001','2026-10-21 09:00:00'),make('other','WB002','2026-10-21 08:00:00'),make('day','WB001','2026-10-22 08:00:00')];
  const numbered=assignInstructionNumbers(rows);
  assert.deepEqual(numbered.map(row=>row.instructionNo),['WB001_1021_002','WB001_1021_001','WB002_1021_001','WB001_1022_001']);
  assert.equal(numbered[0].legacyInstructionNo,'CI-late');
  assert.equal(rows[0].instructionNo,'CI-late');
  const reversed=assignInstructionNumbers([...rows].reverse());
  for(const row of numbered)assert.equal(reversed.find(item=>item.id===row.id)?.instructionNo,row.instructionNo);
  assert.deepEqual(assignInstructionNumbers(numbered),numbered);
});
test('existing numbers are retained, sequences exceed 999 and missing identities do not invent a number',()=>{
  const numbered=assignInstructionNumbers([make('saved','WB','2026-10-21','WB_1021_002'),make('new','WB','2026-10-21 01:00:00')]);
  assert.deepEqual(numbered.map(row=>row.instructionNo),['WB_1021_002','WB_1021_001']);
  const many=assignInstructionNumbers(Array.from({length:1001},(_,index)=>make(String(index).padStart(4,'0'),'WB','2026-10-21')));
  assert.equal(many.at(-1)?.instructionNo,'WB_1021_1001');
  for(const row of [make('date','WB','2026-02-30'),make('waybill','','2026-10-21')])assert.equal(assignInstructionNumbers([row])[0].instructionNo,row.instructionNo);
});
