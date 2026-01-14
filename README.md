# Polymarket 刷交互门户 v2

基于 PRD 的 Vue + TypeScript 前端工程，纯前端、无后端依赖，所有数据通过官方 API（当前为 mock）。

## 运行

```bash
npm install
npm run dev
```

## 已实现

- 多账户导入与管理（双数账户要求）
- 钱包对自动配对 + 可手动调整
- 市场链接加载（mock）
- Yes / No 盘口深度展示
- 多账户操作确认弹窗
- 奖励与结果展示（mock）
- 执行日志

## 下一步接入

- 用官方 Gamma/CLOB API 替换 mock 数据
- 前端本地加密存储私钥（只读 / 交易权限开关）
- 执行前确认弹窗中展示更完整的操作清单
