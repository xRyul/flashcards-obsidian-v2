# Active Context

* **Current Focus:** Finalizing ID recovery improvements. Next steps involve improving test coverage for other plugin components and addressing the triple-colon format issue.
* **Recent Changes:**
    * **Fixed Duplicate Creation Error during ID Recovery:**
        * **Problem:** Cards without IDs in Obsidian were sometimes incorrectly sent for creation, causing a duplicate error from Anki because Anki's duplicate check (likely first-field based) identified a match that the plugin's stricter check (all fields + tags) missed.
        * **Solution:**
            * Modified `CardsService.execute` to fetch all notes from the target Anki deck using a new `Anki.getNotesInDeck` method.
            * Updated `CardsService.filterByUpdate` to use this complete list for the ID recovery comparison.
            * Introduced a new `Card.looselyMatchesFrontField` method that compares only the first field (typically 'Front').
            * Implemented a two-step matching process in `filterByUpdate` for cards without IDs:
                1. Use `looselyMatchesFrontField` to find potential matches and recover the Anki ID.
                2. If an ID is recovered, use the original strict `Card.match` method to determine if the recovered card also needs to be *updated* (due to differences in other fields or tags).
            * Updated unit tests (`cards.service.test.ts`) to reflect the changed signature of `filterByUpdate`.
    * **Enhanced Logging for ID Recovery:** Added detailed `console.debug` and `console.warn` messages in `filterByUpdate` and `Card.match`/`looselyMatchesFrontField` to diagnose matching issues.
    * **Further Improved Test Coverage for Parser Class:**
        * Increased overall code coverage from 93.84% to 94.99%.
        * Improved Parser class coverage from 92.22% to 94.13%.
        * Added additional comprehensive tests for:
          * Math notation parsing (inline and block math with complex formulas)
          * Image processing with various formats and dimensions (including webp and avif)
          * Audio link handling and conversion
          * Embed content processing and error handling
          * Context-aware mode with nested headings
          * Code blocks (both block and inline)
          * Error handling in DOM-related operations
        * Targeted previously uncovered error handling paths with specific tests
        * Added enhanced mocking for DOM elements and environment variables
        * Created detailed testing for utility functions like `getEmbedMap` and `getEmbedWrapContent`
    * **Testing Strategy Refinements:**
        * Focused on hard-to-reach error handling paths to maximize coverage
        * Created specialized test cases for HTML entity encoding/decoding issues
        * Added tests that specifically target edge cases in error handling
        * Implemented proper mock restoration to prevent test pollution
        * Adapted expectations to account for HTML encoding in parser output
    * **Previous Test Coverage Improvements:**
        * Increased overall code coverage from 91.98% to 93.84%.
        * Improved Parser class coverage from 89.47% to 92.22%.
        * Added comprehensive tests for:
          * Complex Markdown parsing scenarios
          * Edge cases in image and audio link processing
          * Cloze card formatting with various syntax options
          * Math notation conversion
          * Embed content processing
        * Used direct method testing to access private methods and harder-to-reach code paths
        * Focused on realistic usage scenarios that could occur in production
    * **Testing Strategy:**
        * Identified specific edge cases and complex parsing scenarios that needed coverage
        * Created targeted tests for each feature area
        * Used parameterized tests to efficiently test multiple variations
        * Ensured tests match actual implementation behavior rather than idealized expectations
    * **Previous Documentation:**
        * Added detailed architecture overview to `systemPatterns.md` including:
          * Plugin Architecture inspired by MVC pattern
          * Core components breakdown (Main Controller, View Layer, Service Layer, Data Layer)
          * Key technical decisions (TypeScript, error handling, Obsidian Plugin API)
          * Design patterns in use (Service Layer, Dependency Injection, Observer, Regex-based Parsing)
          * Component relationships and interactions
          * Critical implementation paths for file processing and Anki interaction
        * Enhanced `techContext.md` with comprehensive details on:
          * Technologies used (TypeScript, Obsidian API, AnkiConnect API, Showdown)
          * Development setup requirements and workflow
          * Technical constraints and platform compatibility considerations
          * Dependency management and tool usage patterns
          * Markdown processing approach
    * **Initial Test Coverage Improvements:**
        * Increased overall code coverage from 81.47% to 91.98%.
        * Improved entity classes coverage from 63.15% to 97.89%.
        * Added comprehensive tests for all card types (standard, inline, spaced, cloze).
        * Added tests for image and audio processing in cards.
        * Added tests for context-aware mode with headings.
        * Added tests for utility functions like `arraysEqual` and `escapeMarkdown`.
        * Fixed existing failing tests to match actual implementation behavior.
    * Deleted the `docs/` directory as it was deemed unnecessary (contained contributor info, demo assets).
    * Removed the link to the demo image (`docs/demo.gif`) from `README.md`.
    * Added `memory-bank/` and `coverage/` directories to `.gitignore` to prevent tracking Memory Bank and test coverage reports.
    * **Fixed Multi-line Inline Card Parsing:**
        * **Issue:** Inline cards (`::`) followed by additional content lines (e.g., `(slide 135)`) were incorrectly parsed. The additional lines were not included in the answer, and the Anki ID was placed before them.
        * **Debugging:** Added a Jest test case (`tests/unit/parser.test.ts`) specifically for this scenario. Used console logging to trace the issue to incorrect regex group indexing and overly broad card start detection within the answer collection loop in `generateInlineCards` (`src/services/parser.ts`).
        * **Fix:**
            * Corrected the regex capture group indices used in `generateInlineCards` to accurately extract the question (`match[2]`) and the first line of the answer (`match[4]`).
            * Refined the `isNextCardStart` check within the answer collection loop to use `regex.exec()` and validate `match.index === 0`, ensuring it only breaks the loop for genuine card start lines, not arbitrary content.
            * Ensured leading list markers (`- `, `* `, `+ `) are trimmed from the extracted question (`originalQuestion`) before processing.
    * Changed the Anki card ID format from `^1234567890` to HTML comment `<!-- ankiID: 1234567890 -->`.
        * Updated regexes in `src/conf/regex.ts` to detect/extract the new format.
        * Updated `getIdFormat()` in all `Card` subclasses (`src/entities/*.ts`) to generate the new format.
        * Updated `Parser.getAnkiIDsBlocks` (`src/services/parser.ts`) to find existing IDs using the new HTML comment format.
        * Updated `CardsService.writeAnkiBlocks` (`src/services/cards.ts`) to ensure the new ID is added on a newline (only adding the newline if one doesn't already precede the insertion point).
        * Updated deletion commands in `main.ts` to use the new ID regex and cleanup logic.
        * Refactored `Parser.generateCardsWithTag` (`src/services/parser.ts`): Simplified the `flashscardsWithTag` regex (`src/conf/regex.ts`) to only match the first line of a #card tag block. Implemented programmatic logic within `generateCardsWithTag` to iterate subsequent lines to find the answer content and optional ID block. This fixes a bug where cards (especially list items) at the end of the file might not be parsed if preceding cards had ID blocks.
        * Refactored `CardsService.filterByUpdate` to more reliably differentiate new cards from existing ones by cross-referencing parsed card IDs with the set of IDs actually found in the file, fixing a bug where new cards might not be created if other cards already had IDs.
    * Fixed image rendering for wikilinks with dimensions (e.g., `![[image.webp|100x100]]`).
        * Updated image regexes (`wikiImageLinks`, `markdownImageLinks` in `src/conf/regex.ts`) to support `webp` and `avif` formats and capture filename, width, and height separately.
        * Modified `substituteImageLinks` in `src/services/parser.ts` to generate correct `<img src='...' width='...' height='...'>` tags directly.
        * Added a cleanup step in `parseLine` (`src/services/parser.ts`) to remove potentially duplicated embed HTML (`<div class="internal-embed...">`) generated by `showdown` after the correct `<img>` tag.
        * Previous attempts using placeholders (`@@IMAGE::...@@`) failed due to complex interactions with `showdown` or placeholder mismatches.
    * **Added Content-Based ID Recovery:**
        * Implemented a mechanism to recover Anki IDs for cards that have lost their ID in Obsidian
        * When a card is found without an ID in Obsidian, system now checks all Anki cards for content matches
        * If a match is found, the existing Anki ID is automatically recovered and added back to the note in Obsidian
        * This prevents duplicate cards when a user accidentally deletes card IDs
        * Implementation added to `CardsService.filterByUpdate` method with a new helper `addMissingIdToCard`
        * Enhanced robustness by tracking previously matched Anki cards to avoid duplicate matches
* **Next Steps:** 
    * Test the content-based ID recovery feature with different card types
    * Consider improving test coverage for other components of the plugin
    * Populate core Memory Bank documents (`projectbrief.md`, `productContext.md`)
* **Active Decisions:**
    * **Card ID Recovery Strategy:**
        * Use content-based matching to handle cases where users manually delete IDs in Obsidian.
        * **Refined Approach:** Fetch all notes from the target deck in Anki to ensure comprehensive comparison. Use a two-step matching process:
            1.  **Loose Match (for Recovery):** Employ `Card.looselyMatchesFrontField` (comparing only the first field) to align with Anki's likely duplicate detection and reliably recover IDs.
            2.  **Strict Match (for Update):** After ID recovery via loose match, use the standard `Card.match` (comparing all fields and tags) to determine if the recovered card requires an update in Anki.
        * Automatically add recovered IDs back to Obsidian notes.
        * Handle edge cases like multiple content matches by tracking which Anki cards have already been matched.
    * **Testing Strategy:**
        * Focus on realistic edge cases that are likely to occur in actual use
        * Test each parsing feature thoroughly with multiple variations
        * Use direct method testing for hard-to-reach code paths
        * Match tests to actual implementation behavior
        * Target error handling paths to ensure graceful degradation
        * Mock DOM interactions carefully to test browser-dependent code
    * **Documentation Strategy:**
        * Created comprehensive architecture documentation focusing on:
          * High-level architecture overview (plugin structure, MVC-inspired pattern)
          * Component breakdown with clear responsibilities
          * Design pattern usage and rationale
          * Critical processing paths for core functionality
        * Enhanced technical context documentation to support onboarding and maintenance
* **Patterns & Preferences:**
    * **Test Coverage:**
        * Comprehensive coverage of edge cases in parsing is essential
        * Direct method testing for private methods when necessary
        * Tests should reflect actual implementation behavior
        * Parameterized tests for multiple variations of the same feature
        * Error handling requires careful testing with proper environment setup
        * HTML content requires testing for entity encoding/decoding
    * **Architecture Documentation:**
        * Layer-based architecture approach (Data, Service, View, Controller)
        * Clear separation of concerns between components
        * Explicit documentation of design patterns and their applications
        * Focus on critical processing paths to guide maintenance
* **Learnings & Insights:**
    * **ID Recovery Nuances:** Anki's duplicate detection (often based on the first field) can differ from the plugin's stricter content matching (all fields/tags). The ID recovery process must account for this discrepancy by fetching all relevant Anki notes and using a two-stage comparison (loose match for recovery, strict match for update check) to avoid erroneous duplicate creation attempts.
    * **Parser Implementation:**
        * The Parser class handles various types of cards through specialized methods
        * Math notation is converted using regex replace patterns
        * Image and audio links are processed with careful regex handling
        * Complex edge cases exist, particularly in cloze card handling
        * Embed content processing has special consideration for the DOM environment
        * Error handling is crucial for browser vs test environment differences
        * HTML entity encoding must be considered when testing parser output
    * **Architecture Review:**
        * The plugin follows an adapted MVC pattern suitable for Obsidian plugins
        * Service-oriented architecture with clear separation between data and business logic layers
        * Critical paths like file processing and AnkiConnect communication are central to the plugin's function
        * Error handling is implemented primarily through the Main Controller

* **Previous Focus:** Comprehensive documentation of system architecture and technical context.
* **Previously:**
    * Created comprehensive test suite covering all card types, entity classes, and utility functions.
    * Made tests more flexible to accommodate implementation changes.
    * Added specific test cases for previously fixed bugs to prevent regressions.
    * Removed `docs/` directory and associated README link.
    * Ignored `memory-bank/` and `coverage/` in git.
    * Adopted multi-line answer collection logic for inline cards (`::`, `:::`) similar to `#card` style, ensuring subsequent non-empty lines are included before the ID block.
    * Adopted `<!-- ankiID: 1234567890 -->` as the new format for Anki card IDs to avoid conflicts with Obsidian block references (`^block-id`). Removed support for the old `^...` format.
    * Adopted a "direct generation + cleanup" approach for handling image links in the parser.
    * Extended supported image formats to include `webp` and `avif`.
* **Patterns & Preferences:**
    * Commands are added to `main.ts` using `addCommand` with an `editorCallback`.
    * Service logic is separated into `src/services/cards.ts`.
    * User notifications are provided via `new Notice()`.
    * Anki ID blocks are now in the format `<!-- ankiID: 1234567890 -->` and located on their own line following the card content.
* **Learnings & Insights:** 
    * Simple regex replace on file content can break formatting; line-based processing (split, filter, join) is safer for preserving layout when removing specific lines.
    * Standard card regex (`flashscardsWithTag`) needs to account for optional leading blockquote markers (`> `) to parse cards defined within callouts or blockquotes. 