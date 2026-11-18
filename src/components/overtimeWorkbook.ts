// Minimal OOXML workbook packaged as an uncompressed ZIP, without external services.
export function createWorkbook(headers: string[], rows: (string | number)[][], sheetName = '超时运单') {
  const xml = (v: unknown) => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!));
  const sheet = [headers, ...rows].map((row, i) => `<row r="${i+1}">${row.map((v,j) => `<c r="${String.fromCharCode(65+j)}${i+1}" t="inlineStr"><is><t>${xml(v)}</t></is></c>`).join('')}</row>`).join('');
  const files: Record<string,string> = {
    '[Content_Types].xml':'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
    '_rels/.rels':'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    'xl/workbook.xml':`<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${xml(sheetName)}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    'xl/_rels/workbook.xml.rels':'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
    'xl/worksheets/sheet1.xml':`<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols><col min="1" max="${headers.length}" width="24" customWidth="1"/></cols><sheetData>${sheet}</sheetData></worksheet>`,
  };
  return new Blob([createStoredZip(files)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export function createStoredZip(files: Record<string, string | Uint8Array>) {
  const enc = new TextEncoder();
  const now = new Date();
  const zipTime = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);
  const zipDate = ((Math.max(1980, now.getFullYear()) - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  const crc32 = (bytes: Uint8Array) => {let crc=0xffffffff; for(const b of bytes){crc^=b;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;};
  const parts: Uint8Array[]=[]; const central: Uint8Array[]=[]; let offset=0;
  for(const [name, content] of Object.entries(files)) {
    const n=enc.encode(name), b=typeof content === 'string' ? enc.encode(content) : content, crc=crc32(b);
    const h=new Uint8Array(30+n.length), d=new DataView(h.buffer);
    d.setUint32(0,0x04034b50,true);d.setUint16(4,20,true);d.setUint16(6,0x0800,true);d.setUint32(14,crc,true);d.setUint32(18,b.length,true);d.setUint32(22,b.length,true);d.setUint16(26,n.length,true);h.set(n,30);
    d.setUint16(10,zipTime,true);d.setUint16(12,zipDate,true);
    const c=new Uint8Array(46+n.length), v=new DataView(c.buffer);
    v.setUint32(0,0x02014b50,true);v.setUint16(4,20,true);v.setUint16(6,20,true);v.setUint16(8,0x0800,true);v.setUint32(16,crc,true);v.setUint32(20,b.length,true);v.setUint32(24,b.length,true);v.setUint16(28,n.length,true);v.setUint32(42,offset,true);c.set(n,46);
    v.setUint16(12,zipTime,true);v.setUint16(14,zipDate,true);
    parts.push(h,b);central.push(c);offset+=h.length+b.length;
  }
  const end=new Uint8Array(22), e=new DataView(end.buffer);e.setUint32(0,0x06054b50,true);e.setUint16(8,central.length,true);e.setUint16(10,central.length,true);e.setUint32(12,central.reduce((n,b)=>n+b.length,0),true);e.setUint32(16,offset,true);
  return new Blob([...parts,...central,end] as BlobPart[],{type:'application/zip'});
}

export function downloadWorkbook(headers: string[], rows: (string | number)[][], filename: string) {
  const url=URL.createObjectURL(createWorkbook(headers, rows));
  const a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
