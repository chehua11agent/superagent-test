# 视觉与音频资产

## game-icons.net（CC BY 3.0）

战斗标题、敌人意图与词卡类型图标取自 [game-icons.net](https://game-icons.net)，原始 SVG
来自 [game-icons/icons](https://github.com/game-icons/icons)。仓库只取用了图标的 `path`
数据，去掉黑底并改为 `currentColor`；图形本身未改动。

| 用途 | 原始图标 | 作者 |
| --- | --- | --- |
| 战斗标题 / 敌人意图 | `lorc/crossed-swords.svg` | Lorc |
| 法术词卡 | `lorc/wizard-staff.svg` | Lorc |
| 道具词卡 | `lorc/swap-bag.svg` | Lorc |
| 检定 / 拼出 | `lorc/quill-ink.svg` | Lorc |

署名：**Icons made by Lorc. Available on https://game-icons.net**

许可证：[CC BY 3.0](https://creativecommons.org/licenses/by/3.0/)。

## 项目内联

- 其余界面图标（`game/src/ui.js` 的 20 个线性图标）为项目自有 SVG。
- 雾港全景（`game/src/art.js`）、守塔人立绘与章节地图航线均为代码生成的 SVG，无外部图片。
- 点击 / 成功 / 失败音效由 Web Audio 即时合成（`game/src/audio.js`），不使用外部音频文件。
