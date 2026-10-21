import { loadInstructionDetail } from './instructionDetailStore';
import type { InstructionListRow } from './instructionListTypes';

export type InstructionOperationDisplay = { id: string; name: string; done: boolean; description: string };
const isDone = (status: string) => status === '已处理' || status === '已完成';
const number = (value: number) => value.toLocaleString('en-US', { useGrouping: false, maximumFractionDigits: 4 });

export function getInstructionOperations(row: InstructionListRow): InstructionOperationDisplay[] {
  const detail = loadInstructionDetail(row);
  const itemized = detail.feesEdited || detail.fees.some(fee => fee.id !== `${row.id}:fee-summary`);
  if (!itemized) return row.names.map((name, index) => ({ id: `${row.id}:operation:${index}`, name, done: isDone(detail.fees[0]?.status || row.status), description: name }));
  return detail.fees.map(fee => {
    const currency = ({ '人民币': 'CNY', '美元': 'USD', '欧元': 'EUR', '英镑': 'GBP' } as Record<string,string>)[fee.currency] || fee.currency;
    const price = fee.unit && fee.unit !== '—' ? ` (${number(fee.unitPrice)}/${fee.unit})` : '';
    return { id: fee.id, name: fee.name, done: isDone(fee.status || row.status),
      description: `${number(fee.originalAmount)} ${currency} ${fee.name}${price}` };
  });
}
