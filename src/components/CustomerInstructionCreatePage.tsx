import React, { useState } from 'react';
import { Calendar, ChevronDown, CirclePlus, Minus, Plus } from 'lucide-react';

const inputClass = 'h-8 rounded border border-[#d8e0ec] bg-white px-3 text-xs text-slate-700 outline-none placeholder:text-[#b8c3d4] focus:border-[#409eff] focus:ring-1 focus:ring-[#409eff]';
const textareaClass = 'h-10 resize-none rounded border border-[#d8e0ec] bg-white px-3 py-2 text-xs text-slate-700 outline-none placeholder:text-[#b8c3d4] focus:border-[#409eff] focus:ring-1 focus:ring-[#409eff]';
const selectClass = `${inputClass} appearance-none pr-8`;

function Watermark() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: 72 }).map((_, index) => (
        <span
          key={index}
          className="absolute -rotate-[18deg] select-none whitespace-nowrap text-[13px] font-medium text-slate-300/30"
          style={{
            left: `${(index % 8) * 12.5 + 1}%`,
            top: `${Math.floor(index / 8) * 13 + 1}%`,
          }}
        >
          天朗（付豪） 2026-08-25
        </span>
      ))}
    </div>
  );
}

function Stepper() {
  const steps = [
    { index: 1, label: '创建指令', active: true },
    { index: 2, label: '按指令选择运单箱子', active: false },
    { index: 3, label: '提交完成', active: false },
  ];

  return (
    <div className="relative z-10 rounded-md bg-white px-7 py-4 shadow-[0_2px_10px_rgba(15,23,42,0.08)]">
      <div className="flex items-center">
        {steps.map((step, index) => (
          <React.Fragment key={step.label}>
            <div className="flex items-center gap-2">
              <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${step.active ? 'bg-[#409eff] text-white' : 'border border-[#d5dce8] bg-white text-[#a9b4c4]'}`}>
                {step.index}
              </span>
              <span className={`text-xs font-semibold ${step.active ? 'text-[#409eff]' : 'text-[#9aa5b5]'}`}>{step.label}</span>
            </div>
            {index < steps.length - 1 && <div className="mx-4 h-px flex-1 bg-[#e5eaf2]" />}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

function InstructionTypeCard({
  title,
  desc,
  selected,
  onClick,
}: {
  key?: React.Key;
  title: string;
  desc: string;
  selected?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-[76px] rounded-md border px-5 text-left transition ${selected ? 'border-[#409eff] bg-[#ecf5ff] shadow-[0_0_0_1px_rgba(64,158,255,0.2)]' : 'border-[#dfe6f1] bg-white hover:border-[#409eff]'}`}
    >
      <div className="text-base font-bold text-slate-950">{title}</div>
      <div className="mt-2 text-xs font-semibold text-[#9aa5b5]">{desc}</div>
    </button>
  );
}

const instructionTypes = [
  { title: '放货', desc: '需要填写收件地址' },
  { title: '不放货', desc: '无需填写收件地址' },
  { title: '销毁', desc: '无需填写收件地址' },
  { title: '拦截', desc: '无需填写收件地址' },
] as const;

function FieldRow({
  label,
  required,
  children,
  className = '',
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-start ${className}`}>
      <label className="flex h-8 w-[106px] shrink-0 items-center justify-end pr-3 text-xs text-slate-700">
        {required && <span className="mr-1 text-[#ff6b6b]">*</span>}
        {label}
      </label>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function SelectBox({ placeholder, width = 'w-full' }: { placeholder: string; width?: string }) {
  return (
    <div className={`relative ${width}`}>
      <select className={`${selectClass} w-full text-[#b8c3d4]`} defaultValue="">
        <option value="" disabled>{placeholder}</option>
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-2 h-4 w-4 text-[#b8c3d4]" />
    </div>
  );
}

export default function CustomerInstructionCreatePage() {
  const [selectedInstructionType, setSelectedInstructionType] = useState<(typeof instructionTypes)[number]['title']>('放货');
  const needsAddress = selectedInstructionType === '放货';

  return (
    <div className="relative flex-1 overflow-auto bg-[#f5f7fb] px-5 pb-10 pt-4 text-slate-700">
      <Watermark />
      <div className="relative z-10 space-y-4">
        <Stepper />

        <section className="rounded-md bg-white px-5 py-4 shadow-[0_2px_10px_rgba(15,23,42,0.08)]">
          <h2 className="text-base font-bold text-slate-950">创建客户指令</h2>
          <p className="mt-2 text-xs text-[#7d8797]">先选择指令类型，再为指令管理配置中选择操作指令</p>
          <div className="mt-4 grid grid-cols-4 gap-3">
            {instructionTypes.map((item) => (
              <InstructionTypeCard
                key={item.title}
                title={item.title}
                desc={item.desc}
                selected={selectedInstructionType === item.title}
                onClick={() => setSelectedInstructionType(item.title)}
              />
            ))}
          </div>
        </section>

        {needsAddress && <section className="rounded-md bg-white px-5 py-4 shadow-[0_2px_10px_rgba(15,23,42,0.08)]">
          <h3 className="mb-4 text-base font-bold text-slate-950">收件地址信息</h3>
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            <div className="space-y-4">
              <FieldRow label="运单类型" required>
                <SelectBox placeholder="请选择运单类型" width="w-[180px]" />
              </FieldRow>
              <FieldRow label="仓库代码" required>
                <SelectBox placeholder="请输入仓库代码" width="w-[180px]" />
              </FieldRow>
              <FieldRow label="收件人">
                <input className={`${inputClass} w-full`} placeholder="请输入收件人" />
              </FieldRow>
              <FieldRow label="州">
                <input className={`${inputClass} w-full`} placeholder="请输入州" />
              </FieldRow>
              <FieldRow label="地址详情" required>
                <div className="relative">
                  <textarea className={`${textareaClass} w-full`} placeholder="请输入地址详情" maxLength={500} />
                  <span className="absolute bottom-1 right-2 text-[11px] text-[#9aa5b5]">0/500</span>
                </div>
              </FieldRow>
              <FieldRow label="海外仓备注">
                <div className="relative">
                  <textarea className={`${textareaClass} w-full`} placeholder="请输入海外仓备注" maxLength={500} />
                  <span className="absolute bottom-1 right-2 text-[11px] text-[#9aa5b5]">0/500</span>
                </div>
              </FieldRow>
            </div>

            <div className="space-y-4">
              <FieldRow label="派送方式" required>
                <SelectBox placeholder="请选择派送方式" width="w-[180px]" />
              </FieldRow>
              <FieldRow label="邮编" required>
                <input className={`${inputClass} w-full`} placeholder="请输入邮编" />
              </FieldRow>
              <FieldRow label="城市" required>
                <input className={`${inputClass} w-full`} placeholder="请输入城市" />
              </FieldRow>
              <FieldRow label="公司">
                <input className={`${inputClass} w-full`} placeholder="请输入公司" />
              </FieldRow>
              <FieldRow label="预约发货时间" required>
                <div className="relative w-[180px]">
                  <input className={`${inputClass} w-full pl-8`} placeholder="请选择预约发货时间" />
                  <Calendar className="absolute left-2 top-2 h-4 w-4 text-[#b8c3d4]" />
                </div>
              </FieldRow>
            </div>
          </div>
        </section>}

        <section className="rounded-md bg-white px-4 py-4 shadow-[0_2px_10px_rgba(15,23,42,0.08)]">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-950">操作指令</h3>
            <button type="button" className="inline-flex h-8 items-center gap-1 rounded bg-[#004bb1] px-4 text-xs font-bold text-white hover:bg-[#003b91]">
              <CirclePlus className="h-3.5 w-3.5" />
              新增指令
            </button>
          </div>

          <div className="overflow-hidden border border-[#dfe6f1]">
            <table className="w-full table-fixed border-collapse text-xs">
              <thead className="bg-[#f5f7fa] text-slate-700">
                <tr>
                  {[
                    ['#', 'w-[40px]'],
                    ['指令名称', 'w-[280px]'],
                    ['费用类型', 'w-[140px]'],
                    ['单位', 'w-[100px]'],
                    ['单价', 'w-[150px]'],
                    ['币种', 'w-[130px]'],
                    ['指令要求', ''],
                    ['操作', 'w-[70px]'],
                  ].map(([head, width]) => (
                    <th key={head} className={`${width} border border-[#dfe6f1] px-3 py-3 text-left font-bold first:text-center`}>
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="h-[52px] text-slate-700">
                  <td className="border border-[#dfe6f1] text-center">1</td>
                  <td className="border border-[#dfe6f1] px-3">
                    <SelectBox placeholder="请选择" />
                  </td>
                  <td className="border border-[#dfe6f1] px-3">-</td>
                  <td className="border border-[#dfe6f1] px-3">-</td>
                  <td className="border border-[#dfe6f1] px-3">
                    <div className="flex h-8 w-[110px] items-center overflow-hidden rounded border border-[#dfe6f1] bg-white">
                      <button type="button" className="flex h-full w-8 items-center justify-center border-r border-[#dfe6f1] bg-[#f7f9fc] text-[#b8c3d4]"><Minus className="h-3.5 w-3.5" /></button>
                      <input className="h-full min-w-0 flex-1 text-center text-xs outline-none" defaultValue="0.01" />
                      <button type="button" className="flex h-full w-8 items-center justify-center border-l border-[#dfe6f1] bg-[#f7f9fc] text-slate-500"><Plus className="h-3.5 w-3.5" /></button>
                    </div>
                  </td>
                  <td className="border border-[#dfe6f1] px-3">-</td>
                  <td className="border border-[#dfe6f1] px-3">
                    <textarea className={`${textareaClass} h-9 w-full`} placeholder="请输入指令要求" />
                  </td>
                  <td className="border border-[#dfe6f1] px-3 text-center">
                    <button type="button" className="font-semibold text-[#ff6b6b] hover:underline">删除</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <div className="flex justify-center pt-1">
          <button type="button" className="h-8 rounded bg-[#004bb1] px-5 text-xs font-bold text-white hover:bg-[#003b91]">
            下一步：选择运单箱子
          </button>
        </div>
      </div>
    </div>
  );
}
