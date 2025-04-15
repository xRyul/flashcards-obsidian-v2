# Progress

## What Works
- Repository is cleaned up, with unnecessary files removed
- Test coverage has been significantly improved
- Inline card parsing is functioning correctly
- Multi-line inline card parsing has been fixed
- Anki card ID format has been updated to use HTML comments
- Image rendering for wikilinks with dimensions works correctly
- System architecture has been comprehensively documented
- Technical context documentation is complete and detailed
- Parser class test coverage has been significantly improved with additional edge cases
- Content-based ID recovery for cards with missing IDs has been implemented
- CardsService ID recovery feature has test coverage for standard formats
- Content-based ID recovery correctly handles cases where Anki's duplicate detection is less strict than the plugin's full content matching (prevents duplicate creation errors)
- Code Highlight support is implemented via Anki template modification
- **Card Recreation:** Cards with IDs in Obsidian that are missing in Anki (e.g., due to deck deletion) are now correctly queued for creation, and the obsolete ID block is reliably removed from the Obsidian note.
- **Settings Defaults:** Key toggle settings (`sourceSupport`, `codeHighlightSupport`) are now enabled by default.
- **Settings UX:** "Context-aware mode" setting renamed to "Heading breadcrumbs" with clearer description.
- **User Feedback:** Notice added for missing `cards-deck` key in YAML frontmatter.

## What's Left to Build
- Thoroughly test card recreation logic in various edge cases.
- Further improve test coverage for other components of the plugin.
- Consider enhancing user feedback during sync operations.

## Current Status
- **Card Recreation Fix:** Resolved issue where recreating cards after Anki deck deletion resulted in duplicate ID blocks in Obsidian.
  - Modified `filterByUpdate` to mark cards with IDs missing from Anki for creation.
  - Added a mechanism to track obsolete IDs (`idsToRemoveFromFile`).
  - Implemented a final cleanup step in `execute` to remove obsolete ID lines from the file content *after* new IDs are written, ensuring correct offsets.
- **Settings Updates:**
  - Enabled `sourceSupport` and `codeHighlightSupport` by default in `main.ts`.
  - Renamed "Context-aware mode" to "Heading breadcrumbs" and improved description in `src/gui/settings-tab.ts`.
- **YAML Deck Key Notification:** Added logic to `CardsService.execute` to notify users if frontmatter exists but lacks the `cards-deck` key, falling back to default deck.
- **Previous - Settings Cleanup:** Removed non-functional "Inline ID support" setting.
- **Previous - ID Recovery Fix:** Resolved issue where cards without IDs were incorrectly marked for creation despite being duplicates according to Anki's first-field check using a two-step matching process.
- **Previous - ID Recovery:** Implemented content-based ID matching to recover deleted IDs.
- **Previous - Testing:** Test coverage improvements (currently at 94.99%).
- **Previous - Documentation:** Comprehensive architecture and technical documentation completed.
- **Previous - Fixes:** Multi-line inline card parsing, Anki card ID format, image rendering.

## Known Issues
- Test coverage may not guarantee real-world functionality for all card formats and edge cases, as tests use mocked components.

## Decision Evolution
- **Card Recreation Strategy (Refined):** To handle cards with IDs in Obsidian but missing from Anki:
    1. Mark the obsolete ID for removal later.
    2. Queue the card for creation (resetting ID and status).
    3. Write new IDs to the file.
    4. Perform a final cleanup pass to remove obsolete ID lines from the file content before saving.
    * This avoids offset errors caused by removing lines during the primary processing loop.
- **User Feedback:** Opted for informative notices (e.g., missing `cards-deck`) instead of silent fallbacks or automatic file modification (like creating YAML).
- **Settings Defaults/UX:** Prioritized better defaults and clearer naming/descriptions for improved user experience.
- **Previous - Settings Simplification:** Removed non-functional "Inline ID support".
- **Previous - ID Recovery Strategy:** Implemented content-based matching with loose/strict checks.
- **Previous - Testing Strategies:** Focused on Parser edge cases, DOM mocking, utility methods, etc.
- **Previous - Documentation Strategy:** Focused on architecture and technical context.
- **Previous - Anki Card ID Format:** Changed to HTML comments.
- **Previous - Image Handling:** Adopted direct generation + cleanup.

## Test Coverage Strategy
- **Latest Test Coverage Strategy:**
  - Targeted remaining uncovered code in Parser class, especially error handling paths
  - Created specialized tests for DOM-related operations with proper mocking
  - Used environment variable control to test different execution paths
  - Added tests that account for HTML entity encoding in parser output
  - Focused on comprehensive testing of utility methods used in parsing process

## Previous Test Coverage Improvement Strategy
- Focused on Parser class as the most complex component with lower coverage
- Identified specific edge cases and complex parsing scenarios to test
- Created specific tests for Markdown formatting, image/audio links, math notation, and embed content
- Used direct testing of private methods to target hard-to-reach code paths
- Emphasized tests for scenarios that are likely to occur in real usage

## Documentation Strategy
- Initial focus was on improving test coverage for better code maintainability
- Shifted to comprehensive documentation of system architecture and technical context
- Created detailed architecture documentation in `systemPatterns.md` using MVC as a conceptual framework
- Enhanced technical context in `techContext.md` with clear sections on technologies, setup, constraints, dependencies, and tools
- Documentation now provides a clear picture of how the plugin works internally

## Initial Test Coverage Improvement
- Initially focused on increasing overall coverage
- Identified specific areas (entity classes) with lower coverage for targeted improvement
- Added comprehensive tests for all card types and processing functions
- Used TDD approach to diagnose and fix bugs
- Most recent effort targeted Parser class edge cases and complex scenarios

## Inline Card Parsing
- Discovered bug with multi-line inline cards not including additional content lines
- Debugged using Jest tests and console logging
- Fixed by correcting regex capture group indices and refining the `isNextCardStart` check

## Anki Card ID Format
- Changed from `^1234567890` to HTML comment `<!-- ankiID: 1234567890 -->` on its own line.
- Updated all related regexes and functions to support the new format.
- Removed legacy/non-functional "Inline ID Support" setting.
- This avoids conflicts with Obsidian block references.

## Image Handling
- Fixed rendering for wikilinks with dimensions
- Extended support for `webp` and `avif` image formats
- Adopted direct generation with cleanup approach for handling image links