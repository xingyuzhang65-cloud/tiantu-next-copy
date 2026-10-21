import { Plus } from 'lucide-react';
import { formatInstructionTrackingDate, type InstructionTrackingEvent } from './instructionTracking';
import './InstructionTrackingTimeline.css';

export default function InstructionTrackingTimeline({ events, onAdd }: { events: InstructionTrackingEvent[]; onAdd: () => void }) {
  return <div className="instruction-tracking">
    {!events.length && <p className="instruction-tracking-empty">暂无运踪节点</p>}
    <ol className="instruction-tracking-list" aria-label="运踪节点">
      {events.map((event, index) => <li key={event.id} className={`instruction-tracking-event${index === events.length - 1 ? ' is-latest' : ''}${event.type === '异常运踪' ? ' is-exception' : ''}`}>
        <span className="instruction-tracking-operator">{event.operator}{event.country && <small className="instruction-tracking-country">{event.country}</small>}</span>
        <time className="instruction-tracking-date" dateTime={event.occurredAt.replace(' ', 'T')} title={event.occurredAt.replace('T', ' ')}>{formatInstructionTrackingDate(event.occurredAt)}</time>
        <span className="instruction-tracking-axis" aria-hidden="true"><span className="instruction-tracking-dot" /></span>
        <span className="instruction-tracking-status">{event.status}{event.type === '异常运踪' && <small className="instruction-tracking-exception">异常运踪</small>}</span>
      </li>)}
      <li className="instruction-tracking-add">
        <span className="instruction-tracking-axis"><button type="button" aria-label="新增运踪节点" aria-haspopup="dialog" title="新增运踪节点" onClick={onAdd}><Plus size={10} strokeWidth={3} aria-hidden="true" /></button></span>
      </li>
    </ol>
  </div>;
}
