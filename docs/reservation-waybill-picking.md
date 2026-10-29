# 预留运单关联与拣货数据回传

本次按《预留运单关联与拣货数据回传功能方案》扩展现有预留单页面。

## 页面

- 预留单：`/tiantu-next-copy/#reserved-orders`，新增和编辑支持“预留运单号”。
- 支持换行、逗号混输系统运单号、客户单号和 FBA 号。在当前客户范围匹配，按内部运单 ID 去重。
- 一号多票必须手动选择；未匹配及未确认候选不允许保存。切换客户立即重新匹配；删除别名仅移除该别名贡献的关联。
- 详情的“关联运单及拣货数据”显示待回传、拣货状态、件数、方数、重量、最近同步和异常重试。人工预留方数不被改写。
- 运单详情 → 货物信息 → 拣货，可保存分批数据、更正和撤销。原转单号功能保留在“转单号”按钮。

## 当前数据范围

本项目原来使用前端演示运单，没有真实运单检索、仓库拣货查询或回调 API。本次使用应用内实际 `waybills` 状态识别编号，使用共享持久化拣货数据源打通本地页面流程。并未宣称已经连接真实仓库服务。

预留单及关联保存于浏览器 `tiantu-reserved-orders-v2`；拣货记录和最近成功同步结果保存于 `tiantu-reservation-picking-v1`。同页订阅、跨标签页 storage 事件会自动更新详情，打开详情、保存关联和详情激活期间每 15 秒会向配置的数据源同步。浏览器关闭后不执行后台任务。

真实后端仍需提供客户授权范围内的运单查询、稳定运单 ID、拣货记录 ID 和递增版本，并在后端使用 `(reservationId, waybillId)` 唯一约束。本地模型的 `ReservationLinks.waybills` 已按 ID 去重；不会阻止同一运单关联不同预留单。

## 真实接口接入入口

`reservationPickingStore.configureSource(async waybillId => records)` 可替换默认本地查询。返回 `PickingRecord[]`，记录的 `waybillId` 必须等于查询 ID；失败应抛出错误，页面会保留上次成功的数据并显示重试。

收到推送后可调用 `reservationPickingStore.receive(record)`。每条记录包含：

```ts
{ id, waybillId, revision, pieces, volume, weight, status, updatedAt }
```

`status` 为 `active` 或 `revoked`。`revision` 是从 1 开始的正整数；相同 `(waybillId, id, revision)` 重复投递不累加，过期版本忽略，同版本不同数据报错，更正和撤销需要递增版本。汇总只计算每个批次的最新有效版本。

运单编号显示与内部 ID 分离。后续可将实际接口运单转换成 `WaybillIdentity` 后传入识别模型。客户授权与服务端数据隔离必须由真实接口执行，前端客户筛选不能代替鉴权。

## 验证

```text
node --import tsx --test src/components/reservationWaybillLinks.test.ts
npm run lint
npm run build
```

模型测试覆盖方案七项核心验收、客户切换、候选选择、别名移除、跨预留单关联、失败重试、并发旧响应及持久化错误。浏览器验收覆盖实际新增/编辑、三编号归一、待回传、拣货和更正撤销、详情打开时跨标签页自动刷新、异常缓存与重试。
