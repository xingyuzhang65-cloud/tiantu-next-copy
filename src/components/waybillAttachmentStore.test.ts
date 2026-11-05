import test from 'node:test';
import assert from 'node:assert/strict';
import type { WaybillAttachment } from '../types';
import { loadWaybillAttachments, saveWaybillAttachments, WAYBILL_ATTACHMENT_STORAGE_PREFIX } from './waybillAttachmentStore';

const memory = new Map<string, string>();
let failSave = false;
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => { if (failSave) throw new Error('quota'); memory.set(key, value); },
} });

const file: WaybillAttachment = {
  id: 'file-1', name: '报关资料.txt', type: 'text/plain', size: 5,
  uploadedAt: '2026-11-05 15:00:00', dataUrl: 'data:text/plain;base64,aGVsbG8=',
  category: '报关资料', customerVisible: '可见', uploadedBy: '当前用户',
};

test('attachment bytes, MIME type and editable metadata survive reload independently per waybill', () => {
  memory.clear();
  saveWaybillAttachments('WB-001', [file]);
  saveWaybillAttachments('WB-002', [{ ...file, id: 'file-2', name: 'other.txt' }]);
  const restored = loadWaybillAttachments('WB-001');
  assert.deepEqual(restored, [file]);
  restored[0].category = 'POD';
  restored[0].customerVisible = '不可见';
  saveWaybillAttachments('WB-001', restored);
  const updated = loadWaybillAttachments('WB-001')[0];
  assert.equal(updated.category, 'POD');
  assert.equal(updated.customerVisible, '不可见');
  assert.equal(updated.dataUrl, file.dataUrl);
  assert.equal(updated.type, 'text/plain');
  assert.equal(updated.uploadedAt, file.uploadedAt);
  assert.equal(loadWaybillAttachments('WB-002')[0].name, 'other.txt');
  restored[0].name = 'unsaved.txt';
  assert.equal(loadWaybillAttachments('WB-001')[0].name, file.name);
});

test('replacing a file preserves its record identity and deleting all files does not restore fallback attachments', () => {
  memory.clear();
  saveWaybillAttachments('WB-001', [file]);
  const replacement = { ...loadWaybillAttachments('WB-001')[0], name: 'replacement.csv', type: 'text/csv', size: 3, dataUrl: 'data:text/csv;base64,YSxi' };
  saveWaybillAttachments('WB-001', [replacement]);
  assert.deepEqual(loadWaybillAttachments('WB-001'), [replacement]);
  assert.equal(loadWaybillAttachments('WB-001')[0].id, file.id);
  saveWaybillAttachments('WB-001', []);
  assert.deepEqual(loadWaybillAttachments('WB-001', [file]), []);
});

test('storage failures keep the previously saved file and propagate to the editor', () => {
  memory.clear();
  saveWaybillAttachments('WB-001', [file]);
  failSave = true;
  try { assert.throws(() => saveWaybillAttachments('WB-001', []), /quota/); }
  finally { failSave = false; }
  assert.deepEqual(loadWaybillAttachments('WB-001'), [file]);
});

test('invalid attachment records cannot overwrite a saved record and malformed caches preserve legacy data', () => {
  memory.clear();
  saveWaybillAttachments('WB-001', [file]);
  for (const invalid of [[file, file], [{ ...file, size: -1 }], [{ ...file, dataUrl: 'https://invalid.example/file' }], [{ ...file, customerVisible: 'invalid' }]]) {
    assert.throws(() => saveWaybillAttachments('WB-001', invalid as WaybillAttachment[]));
    assert.deepEqual(loadWaybillAttachments('WB-001'), [file]);
  }
  memory.set(WAYBILL_ATTACHMENT_STORAGE_PREFIX + 'WB-BROKEN', '{broken');
  const fallback = loadWaybillAttachments('WB-BROKEN', [file]);
  assert.deepEqual(fallback, [file]);
  fallback[0].name = 'changed.txt';
  assert.equal(file.name, '报关资料.txt');
});
