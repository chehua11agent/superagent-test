# 插画来源与许可

本目录的插画只用于方向探针，**不是最终美术**。正式版应按实体重绘 / 委托，并在 `assets/manifest.json` 里保留来源、许可、焦点与尺寸。

## Met Open Access（CC0）

- Joseph Vernet, *A Sea Storm*, 1752–64. Etching. The Metropolitan Museum of Art.
  <https://www.metmuseum.org/art/collection/search/811690>
- Henry Farrer, *Lighthouse*, 1880. Etching. The Metropolitan Museum of Art.
  <https://www.metmuseum.org/art/collection/search/382738>
- Hendrick Goltzius, *The Dragon Devouring the Companions of Cadmus*, 1588. Engraving. The Metropolitan Museum of Art.
  <https://www.metmuseum.org/art/collection/search/399874>

Met Open Access images of public-domain works are released under CC0:
<https://www.metmuseum.org/about-the-met/policies-and-documents/open-access>

## Rider-Waite-Smith Tarot（Public Domain）

- *The Hermit* (1909)
- *Ace of Pentacles* (1909)

Deck scans via [`mixvlad/TarotCards`](https://github.com/mixvlad/TarotCards)（MIT 仓库；原 deck 为 Public Domain）。
Rider-Waite-Smith 由 Pamela Colman Smith 绘制、William Rider & Son 于 1909 年出版，已进入公有领域。

## 处理说明

页面用 CSS 对原图做灰度 / 棕褐 / 对比度处理，不修改原文件；卡片裁切由 `object-fit` / `object-position` 完成。

尺寸、焦点、来源、许可与复核状态同时登记在 [`assets/manifest.json`](assets/manifest.json)；全部为 `placeholder`，不是最终美术。
