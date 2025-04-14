# System Patterns

* **Architecture:** (To be defined)
* **Key Decisions:**
    * Separated Anki interaction logic into `Anki` service (`src/services/anki.ts`).
    * Centralized card parsing and processing logic in `CardsService` (`src/services/cards.ts`) and `Parser` (`src/services/parser.ts`).
* **Design Patterns:**
    * Service layer pattern for Anki communication and card processing.
    * Regex-based parsing for card extraction and syntax conversion.
    * "Direct Generation + Cleanup" pattern used in `Parser.parseLine` to handle complex Markdown-to-HTML conversion involving potential interference from libraries like `showdown` (specifically for image embeds).
* **Component Relationships:** `main.ts` (Commands) -> `CardsService` -> `Parser`, `Anki`.
* **Critical Paths:**
    * `CardsService.execute`: Main entry point for processing a file.
    * `Parser.generateFlashcards` and its helpers: Extracting card data from Markdown.
    * `Parser.parseLine`: Converting Markdown content (including images, links, math) to Anki-compatible HTML.
    * `Anki.addNotes`, `Anki.updateNotes`, `Anki.deleteNotes`, `Anki.storeMediaFile`: Interaction points with AnkiConnect. 