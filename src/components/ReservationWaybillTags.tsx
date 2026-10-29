import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, CircleAlert, Link2, X } from 'lucide-react';
import { parseReservationNumbers, resolveReservationNumbers, type ReservationIdentifier, type WaybillIdentity } from './reservationWaybillLinks';

export default function ReservationWaybillTags({ customer, catalog, bindings, onChange, draft, onDraftChange }: {
  customer: string; catalog: WaybillIdentity[]; bindings: ReservationIdentifier[]; onChange: (bindings: ReservationIdentifier[]) => void;
  draft: string; onDraftChange: (draft: string) => void;
}) {
  const [activeNumber, setActiveNumber] = useState<string | null>(null);
  const [position, setPosition] = useState({ left: 0, top: 0, width: 360 });
  const anchor = useRef<HTMLElement | null>(null);
  const popup = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const field = useRef<HTMLDivElement>(null);
  const active = bindings.find(binding => binding.number === activeNumber);
  const cancelClose = () => { if (timer.current) clearTimeout(timer.current); };
  const close = () => { cancelClose(); setActiveNumber(null); };
  const scheduleClose = () => { cancelClose(); timer.current = setTimeout(() => setActiveNumber(null), 180); };
  const show = (number: string, target: HTMLElement) => {
    cancelClose(); anchor.current = target; setActiveNumber(number);
    const box = target.getBoundingClientRect(), inputBox = field.current?.querySelector('.rwl-tag-input')?.getBoundingClientRect() || box;
    const width = Math.min(360, window.innerWidth - 24);
    setPosition({ left: Math.max(12, Math.min(box.left, window.innerWidth - width - 12)), top: inputBox.bottom + 7, width });
  };
  useLayoutEffect(() => {
    if (!active || !anchor.current || !popup.current) return;
    const box = anchor.current.getBoundingClientRect(), inputBox = field.current?.querySelector('.rwl-tag-input')?.getBoundingClientRect() || box;
    const height = popup.current.getBoundingClientRect().height;
    const width = Math.min(360, window.innerWidth - 24);
    const top = inputBox.bottom + height + 8 < window.innerHeight ? inputBox.bottom + 7 : Math.max(12, inputBox.top - height - 7);
    setPosition({ left: Math.max(12, Math.min(box.left, window.innerWidth - width - 12)), top, width });
  }, [active, catalog]);
  useEffect(() => {
    const outside = (event: Event) => { if (!field.current?.contains(event.target as Node) && !popup.current?.contains(event.target as Node)) close(); };
    const hide = () => close();
    const scroll = (event: Event) => { if (!popup.current?.contains(event.target as Node)) close(); };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('focusin', outside);
    document.addEventListener('scroll', scroll, true);
    window.addEventListener('resize', hide);
    return () => { cancelClose(); document.removeEventListener('pointerdown', outside); document.removeEventListener('focusin', outside); document.removeEventListener('scroll', scroll, true); window.removeEventListener('resize', hide); };
  }, []);
  useEffect(() => { close(); }, [customer]);

  const commit = (text: string) => {
    const numbers = parseReservationNumbers(text);
    if (!numbers.length) return;
    onChange(resolveReservationNumbers(customer, [...bindings.map(binding => binding.number), ...numbers], catalog, bindings));
    onDraftChange('');
  };
  const remove = (number: string) => {
    onChange(bindings.filter(binding => binding.number !== number));
    if (activeNumber === number) close();
  };
  const tone = (binding: ReservationIdentifier) => !customer ? 'warning' : !binding.candidateIds.length ? 'error' : !binding.selectedIds.length ? 'warning' : 'success';
  const pending = bindings.filter(binding => tone(binding) !== 'success').length;
  return <div className="reserved-create-field rwl-field rwl-tag-field" ref={field}>
    <label htmlFor="reserved-waybill-numbers">预留运单号:</label>
    <div className="rwl-entry">
      <div className="rwl-tag-input" onClick={event => { if (event.target === event.currentTarget) input.current?.focus(); }} onKeyDown={event => {
        if (event.key === 'Escape' && activeNumber) { event.preventDefault(); event.stopPropagation(); close(); }
      }}>
        {bindings.map(binding => <span className={`rwl-tag is-${tone(binding)}`} key={binding.number} onMouseEnter={event => show(binding.number, event.currentTarget)} onMouseLeave={scheduleClose}>
          <button type="button" className="rwl-tag-trigger" aria-label={`查看编号${binding.number}关联信息`} aria-haspopup="dialog" aria-expanded={activeNumber === binding.number}
            onFocus={event => show(binding.number, event.currentTarget.parentElement!)} onBlur={scheduleClose} onClick={event => show(binding.number, event.currentTarget.parentElement!)}>
            {tone(binding) === 'success' ? <Link2 size={12} aria-hidden="true" /> : <CircleAlert size={12} aria-hidden="true" />}<span>{binding.number}</span>
          </button>
          <button type="button" className="rwl-tag-remove" aria-label={`移除编号${binding.number}`} onMouseDown={event => event.preventDefault()} onClick={() => remove(binding.number)}><X size={12} aria-hidden="true" /></button>
        </span>)}
        <textarea id="reserved-waybill-numbers" ref={input} value={draft} rows={1} aria-describedby="reserved-waybill-hint" placeholder={bindings.length ? '继续输入或粘贴单号…' : '输入或粘贴单号，支持逗号、空格、换行分隔'}
          onFocus={close} onChange={event => onDraftChange(event.target.value)} onKeyDown={event => {
            if (event.key === 'Enter' && !event.nativeEvent.isComposing) { event.preventDefault(); commit(event.currentTarget.value); }
          }} onBlur={event => commit(event.currentTarget.value)} onPaste={event => {
            const pasted = event.clipboardData.getData('text/plain');
            if (!pasted) return;
            event.preventDefault();
            const target = event.currentTarget;
            commit(target.value.slice(0, target.selectionStart) + pasted + target.value.slice(target.selectionEnd));
          }} />
      </div>
      <p className="rwl-hint" id="reserved-waybill-hint">支持运单号、客户单号、FBA号；粘贴、回车或失焦自动识别。</p>
      {pending > 0 && <p className="rwl-warning" role="status">有 {pending} 个编号待处理，悬浮或点击标签查看详情。</p>}
    </div>
    {active && createPortal(<div ref={popup} className={`rwl-tag-popup is-${tone(active)}`} role="dialog" aria-label={`编号${active.number}关联详情`} style={{ left: position.left, top: position.top, width: position.width }}
      onMouseEnter={cancelClose} onMouseLeave={scheduleClose} onFocus={cancelClose} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) scheduleClose(); }}
      onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); } }}>
      <header><strong>{active.number}</strong><button type="button" onClick={close} aria-label="关闭编号详情"><X size={14} /></button></header>
      {!customer ? <p className="rwl-popup-warning">请先选择客户，选择后将自动重新识别。</p> : !active.candidateIds.length ? <p className="rwl-popup-error">未匹配当前客户的运单，请检查编号或点击标签右侧×移除。</p> : <>
        {active.candidateIds.length > 1 ? <p className="rwl-popup-warning">匹配到多票运单，请勾选需要关联的运单。</p> : <p className="rwl-popup-success"><CheckCircle2 size={13} />识别成功</p>}
        <div className="rwl-popup-waybills">{active.candidateIds.map(id => {
          const waybill = catalog.find(item => item.id === id && item.customer === customer);
          if (!waybill) return null;
          return <div className="rwl-popup-waybill" key={id}>
            {active.candidateIds.length > 1 && <label className="rwl-popup-choice"><input type="checkbox" aria-label={`关联${active.number}对应的${waybill.systemNo}`} checked={active.selectedIds.includes(id)} onChange={event => onChange(bindings.map(binding => binding.number === active.number ? {
              ...binding, selectedIds: event.target.checked ? [...new Set([...binding.selectedIds, id])] : binding.selectedIds.filter(value => value !== id),
            } : binding))} />关联此运单</label>}
            <dl><div><dt>系统运单号</dt><dd>{waybill.systemNo}</dd></div><div><dt>客户单号</dt><dd>{waybill.customerNo || '—'}</dd></div><div><dt>FBA号</dt><dd>{waybill.fbaNo || '—'}</dd></div></dl>
          </div>;
        })}</div>
      </>}
    </div>, document.body)}
  </div>;
}
