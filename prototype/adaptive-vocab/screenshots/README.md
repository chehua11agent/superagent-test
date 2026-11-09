# 截图来源

## Before（现状）

- `before-tactical-probe-1440.png`、`before-tactical-probe-390.png`
- 来源：PR #11 分支 `agent/tactical-view-prototype-649fd9ef9a76` 的
  `prototype/tactical/screenshots/after-vocab-probe.png` / `after-vocab-mobile.png`。
- 场景：鸟瞰战棋原型第 2 回合的“词汇量探针”——固定 3 词之后随机再抽 1 个词，
  答对/答错只累计 `0 对` 这样的计数，再用 `20 × 正确数 / 已测数` 估词汇量。
- 在线版本：<https://chehua11agent.github.io/superagent-test/prototype/tactical/?v=18>

## After（本 PR）

- `after-screen-1440.png`、`after-screen-1440-top.png`、`after-screen-390.png`：
  自适应筛选页（200 名虚拟学习者，120 词库）。
- `after-review-1440.png`、`after-review-390.png`：间隔复习页（40 名学习者 × 90 天，含巡检曲线）。
- `after-formula-1440.png`：公式与接入说明页。
- 场景：同一 1440 / 390 宽度、同一深色主题，用页面里的仿真复跑同一组默认参数。

## 说明

这不是像素级的前后 diff：Before 是当前战棋原型里的探针弹窗，After 是新的算法实验台。
两者对照的是“选词体验与信息量”，不是同一界面的改版。算法层面的前后对照见页面里的
“12 题后的取舍”和复习指标表。
