// Browser-local prototype bridge. The warehouse remains the source of workflow state.
export const INTERCEPT_TASKS_KEY = 'tiantu-intercept-tasks-v1';
const channel = 'tiantu-intercept-cancel-v1';
type Task = { no: string; waybillNo: string; status: string; logs: unknown[] };
type RequestItem = { no?: string; waybillNo: string };

export function restoreInterceptTasks<T>(fallback: T[]): T[] {
  try {
    const rows = JSON.parse(localStorage.getItem(INTERCEPT_TASKS_KEY) || 'null');
    if (Array.isArray(rows) && rows.every(t => t && typeof t.no === 'string' && typeof t.waybillNo === 'string' && ['待处理','已确认','拦截中','已完成','已驳回','已取消'].includes(t.status) && Array.isArray(t.logs) && Array.isArray(t.fees))) return rows;
  } catch { /* Use the existing fixtures if storage is unavailable. */ }
  return fallback;
}

export function cancelWarehouseIntercepts<T extends Task>(tasks: T[], items: RequestItem[], reason: string): T[] {
  if (!items.length || !reason.trim()) throw new Error('取消下单失败：请填写取消原因并选择拦截单');
  const chosen = items.map(item => {
    const matches = tasks.filter(task => task.waybillNo === item.waybillNo && (!item.no || task.no === item.no));
    if (matches.length !== 1) throw new Error('取消下单失败：未找到唯一对应的天图拦截单，请核对单号');
    const task = matches[0];
    if (!['待处理', '已取消'].includes(task.status)) throw new Error(`取消下单失败：天图拦截单 ${task.no} 当前为${task.status}，已确认后不允许取消拦截`);
    return task;
  });
  const time = new Date().toLocaleString('sv-SE');
  return tasks.map(task => !chosen.includes(task) || task.status === '已取消' ? task : {
    ...task, status: '已取消', cancelReason: reason.trim(), resultRemark: reason.trim(), handler: '安速系统', handleAt: time,
    logs: [...task.logs, {time, user:'安速系统', action:'取消下单', change:task.status+' → 已取消', note:reason.trim()}],
  });
}

export function installInterceptCancellationBridge<T extends Task>(getTasks: () => T[], update: (tasks: T[]) => void) {
  const listener = (event: MessageEvent) => {
    const allowed = event.origin === location.origin || /^https?:\/\/(127\.0\.0\.1|localhost):4211$/.test(event.origin);
    const data = event.data;
    if (!allowed || event.source !== parent || !data || data.channel !== channel || data.action !== 'cancel' || typeof data.id !== 'string') return;
    const reply = (result: object) => (event.source as Window).postMessage({channel, id:data.id, ...result}, event.origin);
    try {
      if (!Array.isArray(data.items) || data.items.length > 100 || data.items.some((item: RequestItem) => !item || typeof item.waybillNo !== 'string' || (item.no !== undefined && typeof item.no !== 'string')) || typeof data.reason !== 'string' || !data.reason.trim() || data.reason.length > 500) throw new Error('取消下单失败：请求内容无效');
      const next = cancelWarehouseIntercepts(getTasks(), data.items, data.reason);
      localStorage.setItem(INTERCEPT_TASKS_KEY, JSON.stringify(next));
      update(next);
      reply({ok:true});
    } catch (error) { reply({ok:false, error:(error as Error).message}); }
  };
  addEventListener('message', listener);
  return () => removeEventListener('message', listener);
}
