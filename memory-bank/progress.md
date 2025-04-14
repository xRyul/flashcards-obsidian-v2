# Progress

* **What Works:**
    * Command "Delete selected card(s) from Anki only": Deletes Anki notes corresponding to IDs within the selected text and removes the ID blocks from the selection in Obsidian.
    * Command "Delete all cards in current file from Anki only": Deletes all Anki notes corresponding to IDs found in the current file and removes the ID blocks from the file in Obsidian, preserving layout.
    * Anki ID detection supports `^\d+` and `%%anki ID: \d+%%` formats.
    * `CardsService.deleteCardsFromAnkiOnly` handles bulk deletion via AnkiConnect.
    * Image rendering in Anki for `![[...]]` and `![]()` syntax, including `webp` and `avif` formats.
    * Image dimension syntax (`|width` or `|widthxheight`) is correctly parsed and applied as `width` and `height` attributes to `<img>` tags in Anki.
* **What's Left:**
    * Populate core Memory Bank documents (`projectbrief.md`, `productContext.md`, `systemPatterns.md`, `techContext.md`).
* **Current Status:** Image rendering fixed. Awaiting next task or project context information.
* **Known Issues:**
    * None currently identified related to implemented features.
* **Decision Evolution:**
    * Initial request: Delete from Anki, keep note in Obsidian.
    * Refinement 1: Delete from Anki, remove ID block and #card tag from Obsidian.
    * Refinement 2: Switched from tag removal to multi-delete via selection.
    * Refinement 3: Added file-level multi-delete command.
    * Refinement 4: Fixed file-level cleanup to preserve layout using line filtering.
    * Image Fix Attempt 1: Modified parser to split filename from dimensions (`|`) - Failed due to regex inaccuracy.
    * Image Fix Attempt 2: Corrected regex to capture only filename, ignoring `|` - Failed because `showdown` still interfered.
    * Image Fix Attempt 3: Added `webp`/`avif` to regex - Partially worked but showed `undefined`.
    * Image Fix Attempt 4: Captured dimensions in regex and added `width`/`height` attributes - Still showed `undefined`.
    * Image Fix Attempt 5: Placeholder strategy (`@@IMAGE::...@@`) - Failed due to placeholder mismatch/interference.
    * Image Fix Attempt 6: Direct `<img>` generation + Regex cleanup of duplicated `div.internal-embed` - Success. 