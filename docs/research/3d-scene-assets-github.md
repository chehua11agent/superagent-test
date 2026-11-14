# GitHub 上的 3D 场景 / 建模资源调研

- 调研日期：2026-11-14
- 对象：《拾词者》如果需要「建模的游戏场景」，GitHub 上有哪些能直接用、能用来自建、或者只能当参考的东西。
- 范围：GitHub 托管的引擎、示例场景、模型 / 材质库、建模工具与 AI 生成；CC0 素材站（Kenney / Quaternius / KayKit / Poly Haven 等）作为对照列出，因为它们比 GitHub 更接近「现成场景」。
- 不包含：付费素材站、外包报价、D&D 官方素材。

## 0. 先给结论

1. **有，但要分清三类东西。** GitHub 上多的是**引擎**（three.js / Babylon.js / Godot）和**示例场景**（glTF 示例、Godot demo、Kenney starter kit）；「一个带剧情、能走进去的旅店 / 地牢」这种**成品场景**很少。真正现成的场景包，大多在 Kenney / Quaternius / KayKit / Poly Haven，而不在 GitHub。
2. **对这个项目，最省事的路线不是换引擎，而是 three.js + 一个 CC0 房间包，先做一屏可走动的房间。** 现有《雾港》是零依赖 DOM + 程序化 SVG；3D 只该替换「空间感」那一层，词卡、SRS、结算继续用 DOM。
3. **3D 的收益主要在「存在感 / 空间感」，不在规则。** 现在的玩法重心是文本、选择、词卡；如果 3D 只是把文字面板换成 3D 背景，投入产出比很低。值得试的是：**一个房间 + 3 个可交互物件 + 一个 NPC + 词卡浮层**，让「词」在空间里被找到，而不是只在段落里被读到。
4. **许可证是硬门槛。** MIT / Apache-2.0 / CC0 安全；CC BY 要署名；glTF 示例库是**逐模型许可**，不是整仓统一；**不要用 WotC 的官方模型、插图或商标**（包括「龙与地下城」Logo、官方怪物模型、PHB 插图）。
5. **体积是 Web 3D 的主要成本。** GitHub Pages 站点 1 GB、月流量 100 GB（软限制）。一个 20–40 件家具的房间，glTF + Draco + KTX2 大约 2–6 MB；不做压缩，几个房间就会把首屏拖垮。

## 1. 引擎 / 运行时

| 项目 | Stars | 许可证 | 提供什么 | 对本项目的判断 |
| --- | ---: | --- | --- | --- |
| [three.js](https://github.com/mrdoob/three.js) | 118.3k | MIT | WebGL / WebGPU 渲染库；`examples/` 有大量可跑场景；仓库自带 `editor/` 场景编辑器 | **最优先试**：纯前端、无构建也能跑，现有静态站点可直接加一层 canvas |
| [Babylon.js](https://github.com/BabylonJS/Babylon.js) | 26.3k | Apache-2.0 | 完整 3D 引擎 + 在线 Playground + PBR / IBL / 动画 | 功能更全，包更大；如果要做较重的 3D 玩法可对比 |
| [PlayCanvas](https://github.com/playcanvas/engine) | 17.3k | MIT | WebGL / WebGPU 运行时 + 在线编辑器 | 编辑器省事，但编辑器本身与工作流要另评估 |
| [react-three-fiber](https://github.com/pmndrs/react-three-fiber) | 33.7k | MIT | React 的 three.js 绑定 | 项目不是 React，暂不优先 |
| [Godot](https://github.com/godotengine/godot) | 120.1k | MIT | 完整 3D 引擎、场景/动画/物理/导航 | 长期做 3D 游戏的首选；Web 导出要加载引擎 WASM，首屏明显更重 |
| [Bevy](https://github.com/bevyengine/bevy) | 49.7k | MIT / Apache-2.0 | Rust ECS 游戏引擎 | 需要 Rust 技术栈，不适合快速 Web 原型 |

> 结论：**要「快速看到一屏 3D」选 three.js；要「长期做成 3D 游戏」选 Godot；现在不换引擎。**

## 2. 场景 / 模型 / 动画资产库（GitHub）

| 项目 | Stars | 许可证 | 里面有什么 | 对本项目的判断 |
| --- | ---: | --- | --- | --- |
| [KhronosGroup/glTF-Sample-Assets](https://github.com/KhronosGroup/glTF-Sample-Assets) | 1.2k | **逐模型许可** | 100+ 个 glTF 模型与少量场景（含 ABeautifulGame 棋局、Sponza 类建筑参考） | 最适合**验证管线 / 占位**；商用前要逐个看模型许可 |
| [BabylonJS/Assets](https://github.com/BabylonJS/Assets) | 165 | CC-BY-4.0 | `environments`、`photoDomes`、`skyboxes`、IBL、`meshes`、`mixamo` 动画、材质与纹理 | **最实用的场景拼装库之一**：天空、环境光、基础网格、动画都能直接拿 |
| [godotengine/godot-demo-projects](https://github.com/godotengine/godot-demo-projects) | 9.8k | MIT | `3d/` 下有一批完整小场景：`platformer`、`truck_town`、`squash_the_creeps`、`kinematic_character` 等 | 参考**场景组织与玩法结构**；资产是 Godot 格式，搬去 Web 要转换 |
| [KenneyNL/Starter-Kit-3D-Platformer](https://github.com/KenneyNL/Starter-Kit-3D-Platformer) | 1.3k | MIT | 一个能跑的 Godot 3D 平台跳跃场景 + Kenney 的 CC0 模型 | 最快看到「现成的 3D 游戏场景」；题材不是室内叙事，但资产可拆 |
| [KenneyNL/Starter-Kit-FPS](https://github.com/KenneyNL/Starter-Kit-FPS) | 1.0k | MIT | 3D 第一人称关卡 + 资产 | 空间 / 关卡参考；同样不是叙事场景 |
| [KenneyNL/KayKit-Hexagons](https://github.com/KenneyNL/KayKit-Hexagons) | 130 | MIT | 六边形地形生成 + KayKit 模型 | 地形/关卡拼装参考 |
| [pmndrs/racing-game](https://github.com/pmndrs/racing-game) | 2.2k | MIT | 一个完整的 Web 3D 赛车游戏（react-three-fiber） | 学**Web 3D 游戏的结构**；题材不符 |
| [mrdoob/three.js `editor/`](https://github.com/mrdoob/three.js/tree/dev/editor) | — | MIT | 浏览器内的 three.js 场景编辑器 | 可以直接用来摆「一个房间」的原型，导出 glTF |

> 结论：**GitHub 能提供「零件 + 参考场景」，不能提供「拿来就用的旅店」**。要一个具体的房间，还是得用 Kenney / Quaternius / KayKit 的 CC0 包拼，或者自己在 Blender 里搭。

## 3. 建模 / 预览工具

| 工具 | Stars | 许可证 | 用途 | 判断 |
| --- | ---: | --- | --- | --- |
| [Blender](https://github.com/blender/blender) | 22.0k | GPL（桌面工具，导出资产不受传染） | 建模、UV、绑定、动画、glTF 导出 | 自建场景的主力；学习成本是主要门槛 |
| [Blockbench](https://github.com/JannisX11/blockbench) | 6.2k | GPL-3.0 | 低多边形 / 像素风建模，导出 glTF / OBJ | 如果走「低多边形旅店」，比 Blender 快 |
| [glTF Sample Viewer](https://github.com/KhronosGroup/glTF-Sample-Viewer) | 1.5k | Apache-2.0 | glTF 2.0 PBR 预览 | 验收资产用 |
| [three.js editor](https://github.com/mrdoob/three.js/tree/dev/editor) | — | MIT | 浏览器摆场景 / 调光 / 导出 | 做 vertical slice 最快 |

## 4. AI 生成（可当灰模 / 道具，不当成品）

| 项目 | Stars | 许可证 | 提供什么 | 判断 |
| --- | ---: | --- | --- | --- |
| [microsoft/TRELLIS](https://github.com/microsoft/TRELLIS) | 14.3k | MIT（代码） | 文本 / 图片 → 3D 资产 | 适合快速出灰模、单个道具；拓扑 / 贴图仍需清理 |
| [VAST-AI-Research/TripoSR](https://github.com/VAST-AI-Research/TripoSR) | 7.4k | MIT（代码） | 单图快速重建 3D | 快，但细节弱，适合占位 |

> 生成模型的**输出物许可**要以各自模型 / 服务条款为准；代码 MIT 不等于生成资产可无条件商用。

## 5. 非 GitHub、但更接近「现成场景」的 CC0 来源

| 来源 | 内容 | 许可 | 用法 |
| --- | --- | --- | --- |
| [Kenney](https://kenney.nl/assets) | 家具、城堡、地牢、城镇、角色、UI、音效 | CC0 | 最省事；低多边形风格统一，适合「苔灯旅店」这类室内 |
| [Quaternius](https://quaternius.com/) | 低多边形角色、怪物、建筑、自然 | CC0 | 角色 / 怪物补齐 |
| [KayKit](https://kaylousberg.itch.io/) | 地牢、冒险者、城堡等低多边形包 | CC0（以素材页为准） | 战斗 / 地牢场景 |
| [Poly Haven](https://polyhaven.com/) | HDRIs、材质、模型 | CC0 | 环境光 / 天空 / 地面材质 |
| [ambientCG](https://ambientcg.com/) | PBR 材质 | CC0 | 石墙、木地板、织物 |

> **GitHub 不是 3D 素材的主场**；真正「下载即用」的 CC0 场景包，大多在上述站点。GitHub 的价值是引擎、示例、工具和资产库结构。

## 6. 对《拾词者》的落地建议

### 6.1 先做哪一个 vertical slice

不要一上来做「可走动的雾港」。先做一个**单房间**：

- 场景：旅店大厅 / 灯塔下层 / 账房，20–40 件家具，3 个可交互点。
- 交互：一盏刻着 `ward` 的灯、一本缺页的账本（`mend`）、一件烧焦的斗篷（`scorch`）；每个物件点击后弹出现有词卡 / 检定面板。
- 角色：1 个 NPC（玛拉），站桩 + 待机动画即可。
- 镜头：固定机位 + 轻微推拉，不做自由漫游；移动端也不会晕。
- 词卡 / 选项 / 结算继续用 DOM 浮层——**不要**把已经稳定的文本交互搬进 3D。

### 6.2 技术路线（按投入从低到高）

| 阶段 | 做法 | 工作量（原型级） | 产出 |
| --- | --- | --- | --- |
| A. 只读场景 | three.js + Kenney 房间包 + 固定镜头 + 热点 | 0.5–1 天 | 一屏能看、能点的房间 |
| B. 加交互 | 热点 → 词卡 / 检定 / 词笺；一个 NPC 待机动画 | 2–4 天 | 可玩的一场「空间里找词」 |
| C. 加移动 | 点击移动或 WASD + 碰撞 + 相机跟随 | 1–2 周 | 能走动的室内 |
| D. 换引擎 | Godot 4 + 场景 / 动画 / 导航 + Web 或桌面导出 | 2–4 周+ | 长期 3D 产品的地基 |

### 6.3 资产与性能预算

- 格式：glTF / GLB；几何 **Draco**，贴图 **KTX2 / Basis**，纹理 ≤ 2K。
- 一个房间：**≤ 150k 三角面、≤ 100 draw call、2–6 MB**；移动端像素比上限 2，目标 30fps。
- 光照：1 个方向光 + 1 个点光 + IBL（Poly Haven HDRI）；不要一上来做实时全局光照。
- 音频 / 语音继续用现有方案，不要和 3D 绑定。

### 6.4 3D 与 2.5D 的取舍

| 维度 | 3D（three.js / Godot） | 2.5D（等距 + 视差 + SVG/Canvas） |
| --- | --- | --- |
| 空间感 / 存在感 | 强 | 中 |
| 美术成本 | 高（建模 / UV / 动画） | 低（现有程序化 SVG 可延展） |
| 文本可读性 | 需要 DOM 浮层，否则差 | 好 |
| 移动端性能 | 要压预算 | 轻 |
| 与现有《雾港》一致 | 要重做视觉 | 直接延续 |
| 适合的判断 | 「空间」是核心卖点 | 「词 / 剧情」是核心卖点 |

> 现在《拾词者》的核心是词、选择、复习；3D 更像「增强」而不是「必需」。建议先用 A 阶段的一屏房间验证「在空间里找词」是否真的更好玩，再决定要不要投入 B–D。

## 7. 许可证红线（务必逐项确认）

- **CC0**：无署名义务，最适合直接进仓库（Kenney / Quaternius / Poly Haven / ambientCG）。
- **MIT / Apache-2.0**：可商用；保留 LICENSE 与 NOTICE（Apache）。
- **CC BY 4.0**：必须署名（BabylonJS/Assets）；在「关于 / 致谢」写清作者与来源。
- **glTF-Sample-Assets**：**每个模型许可不同**；不能按整仓 MIT 处理。
- **Blender / Blockbench**：GPL 是**工具**许可；用它们导出的资产不因此变成 GPL。
- **D&D / WotC**：官方模型、插图、Logo、PHB 文本都不能直接用于产品；只借 SRD 级通用机制（d20、AC、HP、优势 / 劣势）。
- **AI 生成**：代码许可 ≠ 输出许可；商用前看清模型 / 服务条款。

## 8. 可打开的参考链接

- three.js 示例：<https://threejs.org/examples/>
- three.js glTF 加载示例：<https://threejs.org/examples/#webgl_loader_gltf>
- Babylon.js Playground：<https://playground.babylonjs.com/>
- Godot demo 项目：<https://github.com/godotengine/godot-demo-projects>
- Kenney 素材：<https://kenney.nl/assets>
- Quaternius：<https://quaternius.com/>
- KayKit：<https://kaylousberg.itch.io/>
- Poly Haven：<https://polyhaven.com/>
- ambientCG：<https://ambientcg.com/>

## 9. 方法与限制

- Stars / 许可证 / 更新时间来自 GitHub API，2026-11-14 时点；之后会变化。
- 未实际把任何 3D 场景接进《拾词者》，未做帧率 / 包体实测；工作量是原型级估算，不是排期承诺。
- 未逐模型核对 glTF-Sample-Assets 的许可，也未评估付费素材与外包。
- 「3D 收益不高」是设计判断，不是用户测试结论；建议先做 3–5 人试玩，再决定 A / B / 2.5D。
- 本仓库的 3D 方向与 [`game-visual-solutions-survey.md`](game-visual-solutions-survey.md) 的结论一致：**先不换引擎，先补内容与交互**；本文补的是该文未覆盖的 3D 场景 / 资产部分。
