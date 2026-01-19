# Polymarket Portal - 代理要求

## 总体
- 本文件为项目内的权威规则。
- 优先在 `src/App.vue` 内做最小改动，除非确实需要新模块。

## 钱包管理
- 导入私钥后用 `ethers` (`Wallet`) 解析地址。
- 不生成模拟钱包，初始为空，导入后才有数据。
- 导出 CSV 仅包含 `privateKey`，表头为 `privateKey`。
- 私钥本地缓存使用 AES-GCM 对称加密；加密数据与密钥存入 `localStorage`（不使用口令）。
- 页面加载后自动解密并恢复钱包。

## 市场加载
- 通过 `/api/market?slug=...` 按 slug 加载市场（Vite 代[createProxyWalletAndApiKey.ts](..%2F..%2F..%2FLibrary%2FContainers%2Fcom.tencent.xinWeChat%2FData%2FDocuments%2Fxwechat_files%2Fminus502_db68%2Ftemp%2FRWTemp%2F2026-01%2F33e1b2de697d8fa061f5e54453ea571e%2FcreateProxyWalletAndApiKey.ts)理到 gamma `/markets`）。
- 通过 `/api/book?token_id=...` 拉取深度（Vite 代理到 clob `/book`）。
- 仅手动刷新，不自动刷新。
- 订单簿失败要报错，不插入假深度。
- 提供“进入市场”超链接按钮。

## 盘口深度
- 默认只显示卖单（可切换显示买单）。
- 显示买/卖前三档（最优→第三）。
- 每档显示价值（U）。
- 深度条：买单绿色、卖单红色，夜间模式对比要更强。
- 只显示卖单时，标题合计显示“卖一合计”。

## 执行参数
- 支持统一数量 + 每对单独数量（弹窗配置）。
- 钱包对列表显示“单独/统一”的标记。
- 支持执行顺序：YES→NO 或 NO→YES。
- 支持随机间隔范围（最小/最大，要求 max >= min）。
- 预计交易价值按单独数量优先计算。

## 充值 / 提现
- 充值/提现不需要说明弹窗。
- 充值支持金额区间随机。
- 查询余额仅针对选中行。
- 表头勾选支持全选/全不选。

## 弹窗规范
- 仅保留必要弹窗（平台介绍/工作台说明/钱包对配置/钱包 IP 配置）。
- 未明确要求不要新增自动弹窗。

## IP / 钱包关联
- 每个钱包自带 `ipName`、`ipEndpoint` 字段。
- 通过行内“配置”弹窗配置 IP。
- 不使用单独的 IP 列表管理界面。
