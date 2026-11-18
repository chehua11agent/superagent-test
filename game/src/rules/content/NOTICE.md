# Foundry VTT dnd5e SRD content

The `spells.js`, `items.js`, `monsters.js` and `manifest.js` files in this
directory are generated from [foundryvtt/dnd5e](https://github.com/foundryvtt/dnd5e)
`packs/_source` (version 6.1.x, commit recorded in `manifest.js`).

- The Foundry dnd5e **system code** is licensed under the MIT License.
- The **SRD 5.1 / 5.2 content** is by Wizards of the Coast LLC, licensed under
  [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/legalcode).
- This project has converted the content to a standalone data shape (English
  names and rules text; HTML stripped; mechanical fields normalized). It is an
  adaptation, not the original Foundry compendium format.
- The converter is `scripts/import-foundry-srd.py`; regenerate with a local
  checkout, e.g.:

  ```bash
  git clone --depth 1 --filter=blob:none --sparse https://github.com/foundryvtt/dnd5e.git /tmp/dnd5e
  git -C /tmp/dnd5e sparse-checkout set packs/_source/races packs/_source/classes packs/_source/backgrounds packs/_source/classfeatures packs/_source/spells packs/_source/items packs/_source/monsters
  python3 scripts/import-foundry-srd.py --source /tmp/dnd5e
  ```

- Some content is missing or differs in the Foundry source (for example the 2014
  background pack only contains `acolyte`, and some weapons lack a separate
  versatile damage value). The importer preserves the source rather than
  inventing data; gaps are listed in `docs/design/foundry-content-import.md`.
