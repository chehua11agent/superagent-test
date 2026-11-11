# 词汇实验室截图说明

## 基线（Before）

| 文件 | 基线 | 场景 |
| --- | --- | --- |
| `before-game-wordbook-1440.png` / `-390.png` | `main` @ `6b18abd`（PR #9 合并后） | `game/` 的词书：体验演示存档 → 词书；48 个游戏词、单状态/双轨徽章 |
| `before-adaptive-lab-1440.png` / `-390.png` | PR #17 分支 `agent/adaptive-srs-research-076ffc76f00e` | `prototype/adaptive-vocab/` 算法实验台首屏 |

## 本 PR（After）

| 文件 | 场景 |
| --- | --- |
| `after-overview-1440.png` | 载入演示数据后的总览：词条/证据/预估认识/待复习 + 四个实验入口 |
| `after-parser-1440.png` | Zork 解析器：执行 `take key` → `unlock` → `lower` → `go north` → `read` |
| `after-wordbank-1440.png` | 词库 / ECDICT：61 词、筛词频带、P(认识)、状态、复习列 |
| `after-worddetail-1440.png` | 词条细节：ECDICT 字段、完整释义（折叠）、能力证据 |
| `after-fsrs-1440.png` | FSRS：给一张卡评 Good 后的下次间隔与 S/D 表 |
| `after-irt-1440.png` | IRT 测评结果：θ/SE、预估认识 47/61、90% CI、分带覆盖、预估/待验证词 |
| `after-overview-390.png` / `after-parser-390.png` / `after-wordbank-390.png` | 同一页面在 390×844 移动端的布局 |

## 对比口径

- **词库**：Before 是游戏里 48 个已契约词的词书（单状态）；After 是独立实验台的 61 个示例词库（ECDICT 字段 + 多能力证据 + P(认识) + 复习列）。这是能力对比，不是像素级 diff。
- **测评**：Before 是 PR #17 的算法实验台（仿真图表）；After 是面向玩家的 12 题自适应测评（可点、有结果）。同样是能力对比，不是同一界面的改版。
- **Zork / FSRS**：这两个模块在旧版里没有对应界面，因此只有 After 截图；没有真实的 Before 基线，PR 描述里已说明。
- 所有截图使用同一深色主题、1440×1000 或 390×844 视口；After 截图在“载入演示数据”后拍摄，保证有证据/有结果。

## 捕获方法

```bash
# 仓库根目录
python3 -m http.server 4190
# 另一个终端：用 Playwright Chromium 截图（1440×1000 / 390×844）
```

- Before 游戏词书：`game/` → 体验演示存档 → 词书。
- After：`prototype/lexicon-lab/` → 重置 → 载入演示数据 → 各标签页。
- 全页截图前加 `.topbar{position:static!important}` 并隐藏 skip link，避免 sticky header 在长截图中重复。
- 不使用任何私有 Feishu 内容；示例词条来自 ECDICT（MIT）与本仓库游戏词表。
