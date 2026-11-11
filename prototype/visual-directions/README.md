# 画面与卡片化 · 方向探针

《拾词者 · 雾港》的视觉方向与实体卡原型。**不是正式界面，不含最终美术。**

- 调研与方案：[`docs/research/dsh-skills-and-visual-upgrade.md`](../../docs/research/dsh-skills-and-visual-upgrade.md)
- 打开方式：

```bash
# 在仓库根目录
python3 -m http.server 8080
# 然后打开 http://127.0.0.1:8080/prototype/visual-directions/
```

> 页面只依赖本地静态文件，不需要构建、不需要联网。直接双击 `index.html` 也能看，但用本地服务器更接近线上。
>
> 仓库当前的 GitHub Pages source 指向旧分支 `agent/game-code-scenes-441375a5a563`，本页不会自动上线；需要本地打开，或先把 Pages source 切到 `main`。

## 三个方向

页面右上角切换 A / B / C，同一套 DOM 与数据，只换视觉 token 与图形处理：

| 方向 | 关键词 | 适合 |
| --- | --- | --- |
| **A · 旧版画** | 纸面、双线装裱、档案编号、公版铜版画、衬线 / 小字距 | 文学感、低成本、先换掉“空场景 + 文本框” |
| **B · 夜航** | 满幅海图、暗场、雾层、金色细线、发光卡框 | 最接近现在雾港的气质；需要真正的插画 |
| **C · 朱墨木刻** | 高对比、粗黑边、朱砂、硬投影、海报 | 成本最低、风格最硬；细节上限较低 |

同一页还演示了：

- 人物 / 怪物 / 道具三类实体卡（同一套数据，不同卡面变体）；
- 词卡手牌、选中、出牌、伤害数字、HP 变化；
- 1440×1000 桌面与 390×844 移动端；
- 卡片的 JSON 数据与资产清单说明。

## 数据与文件

```text
prototype/visual-directions/
  index.html      页面结构
  styles.css      三个方向的 token / 版式 / 响应式
  app.js          实体数据、卡片渲染、主题切换、出牌演示
  assets/         公版占位插画（见 ATTRIBUTION.md）
```

页面里的卡片数据是 `app.js` 中的 `ENTITIES` / `HAND` 常量，用于证明“一张卡 = 一条数据”；正式接入时应改为
`game/content/entities.json` + `game/src/cards.js`（见调研文档第 4 节）。

插画资产按 `create-game-assets` 技能的 manifest 字段登记在 [`assets/manifest.json`](assets/manifest.json)：尺寸、焦点、来源、许可、是否已在原生尺寸 / 引擎内复核。目前全部是 `placeholder`，不是 `production`。

## 边界

- 只有一场战斗、四张手牌、四张实体卡；没有接入 `game/` 的 SRS / 存档 / 路由；
- 插画是公版占位（Met Open Access CC0、Rider-Waite 1909 PD），**不是最终美术**；
- 没有音效、没有完整战斗判定、没有真实拼写输入；
- 移动端只验证了 390×844 无横向溢出与基本可读性；没有做 3–5 人可用性测试。

## 许可

页面代码与本文档属于本项目；插画是公版 / CC0，逐项来源见 [`ATTRIBUTION.md`](ATTRIBUTION.md)。
