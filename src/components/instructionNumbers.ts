type NumberedInstruction = { id:string; waybill:string; instructionNo:string; created:string; legacyInstructionNo?:string };

function numberPrefix(row:NumberedInstruction):string|null {
  const match=/^(\d{4})-(\d{2})-(\d{2})(?:[ T]|$)/.exec(row.created);
  if(!match||!row.waybill.trim())return null;
  const [,year,month,day]=match,date=new Date(`${year}-${month}-${day}T00:00:00Z`);
  if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==`${year}-${month}-${day}`)return null;
  return `${row.waybill.trim()}_${month}${day}_`;
}

/** Number across all workflow states, using creation order rather than display/filter order. */
export function assignInstructionNumbers<T extends NumberedInstruction>(rows:readonly T[]):(T & {legacyInstructionNo?:string})[] {
  const groups=new Map<string,T[]>(),assigned=new Map<string,string>();
  for(const row of rows){const prefix=numberPrefix(row);if(prefix)groups.set(prefix,[...(groups.get(prefix)||[]),row]);}
  for(const [prefix,items] of groups){
    const ordered=[...items].sort((a,b)=>a.created.localeCompare(b.created)||a.id.localeCompare(b.id));
    const used=new Set<number>();
    for(const row of ordered){
      const suffix=row.instructionNo.startsWith(prefix)?row.instructionNo.slice(prefix.length):'';
      const sequence=/^\d{3,}$/.test(suffix)?Number(suffix):0;
      if(Number.isSafeInteger(sequence)&&sequence>0&&!used.has(sequence)){
        used.add(sequence);assigned.set(row.id,prefix+String(sequence).padStart(3,'0'));
      }
    }
    let sequence=1;
    for(const row of ordered){if(assigned.has(row.id))continue;while(used.has(sequence))sequence++;
      assigned.set(row.id,prefix+String(sequence).padStart(3,'0'));used.add(sequence++);
    }
  }
  return rows.map(row=>{const instructionNo=assigned.get(row.id);return !instructionNo||instructionNo===row.instructionNo?{...row}:{...row,instructionNo,legacyInstructionNo:row.legacyInstructionNo||row.instructionNo};});
}
