# 功能规划记录

## 1) IP 代理地址管理与钱包关联

目标  
- 为每个钱包配置并持久化 IP 代理信息（ipName + ipEndpoint）。

当前问题  
- 代理配置流程/入口不够清晰，钱包关联逻辑未完整闭环。

必须做到  
- 钱包行内配置 IP（不新增独立 IP 列表页）。  
- 每个钱包保存 `ipName` 和 `ipEndpoint`，导入/导出/加密存储保持一致。  
- 配置后能在钱包列表/工作台等相关位置展示。  

验收标准  
- 任意钱包设置 IP 后刷新页面仍能恢复。  
- 导入/导出钱包文件后 IP 关联不丢失。  
- 行级配置入口可用，配置后 UI 立即更新。  

涉及文件  
- src/components/WalletIpModal.vue  
- src/services/walletIpCache.ts  
- src/services/walletVault.ts  
- src/pages/WalletsPage.vue  
- src/pages/SingleWorkbenchPage.vue  
- src/App.vue  


## 2) 批量下单细节（工作台）

目标  
- 统一执行策略下，完善批量下单的细节与日志输出。

当前问题  
- 只有模拟日志，批量下单细节尚未补全。

必须做到  
- 按钱包顺序或策略顺序执行（明确串行或并行）。  
- 使用盘口“卖一/买一”作为市价参考（按买/卖方向）。  
- 关键参数和摘要信息写入执行日志（钱包、方向、金额、价格、延迟）。  

验收标准  
- 日志能完整追踪每个钱包的下单细节。  
- 下单价格依据当前盘口计算且可解释。  
- 策略执行顺序符合设定规则。  

涉及文件  
- src/composables/useExecutionActions.ts  
- src/composables/useSingleActions.ts  
- src/services/polymarketApi.ts  
- src/composables/useMarketActions.ts  
- src/pages/SingleWorkbenchPage.vue  


## 3) 仓位管理：提现与提前卖出

目标  
- 在仓位管理中支持“提现”和“提前卖出”的操作流程与日志输出。

当前问题  
- 仅展示仓位信息，提现/卖出流程不完整或缺失。

必须做到  
- 对选中钱包/仓位执行操作（仅对勾选行）。  
- 明确区分“提现”和“卖出”的动作和日志。  
- 失败时输出可读错误提示，不伪造数据。  

验收标准  
- 选中多行执行时，日志逐条输出结果。  
- 操作失败时给出明确原因。  
- UI 不依赖弹窗说明（遵循现有产品规则）。  

涉及文件  
- src/pages/WalletPositionsPage.vue  
- src/pages/PositionsPage.vue  
- src/composables/usePositionActions.ts  
- src/services/relayerWithdraw.ts  
- src/services/safeWithdraw.ts  

