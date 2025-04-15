# System Patterns

## Architecture
- **Plugin Architecture**: MVC-inspired architecture with clear separation of concerns
- **Core Components**:
  - **Main Controller** (`main.ts`): Registers commands, event listeners, and initializes services
  - **View Layer**: Settings UI, card management UI, and status notifications
  - **Service Layer**: Handles business logic and core functionality
  - **Data Layer**: Manages plugin settings and state persistence

## Key Decisions
- Separated Anki interaction logic into `Anki` service (`src/services/anki.ts`)
- Centralized card parsing and processing logic in `CardsService` (`src/services/cards.ts`) and `Parser` (`src/services/parser.ts`)
- Implemented robust error handling and user feedback throughout the application
- Used TypeScript interfaces and strong typing to ensure code quality
- Leveraged Obsidian's Plugin API for seamless integration with the core application
- Implemented a flexible card syntax parser supporting various flashcard formats

## Design Patterns
- **Service Layer Pattern**: Encapsulates business logic in dedicated services for Anki communication and card processing
- **Dependency Injection**: Services are instantiated and injected where needed to maintain loose coupling
- **Observer Pattern**: Uses event listeners to react to changes in notes and trigger appropriate actions
- **Strategy Pattern**: Different parsing strategies for different card types
- **Regex-based Parsing**: Sophisticated regex patterns for card extraction and syntax conversion
- **"Direct Generation + Cleanup"**: Used in `Parser.parseLine` to handle complex Markdown-to-HTML conversion, addressing potential interference from libraries like `showdown` (specifically for image embeds)

## Component Relationships
- `main.ts` (Commands) -> `CardsService` -> `Parser`, `Anki`
- `SettingsTab` -> `Settings` -> `main.ts`
- `UI Components` -> `CardsService` for displaying card information
- `CardsService` <-> `Anki` for bidirectional communication with AnkiConnect
- `Parser` -> `Utility Functions` for handling markdown conversion edge cases

## Critical Paths
- `CardsService.execute`: Main entry point for processing a file
- `Parser.generateFlashcards` and its helpers: Extracting card data from Markdown
- `Parser.parseLine`: Converting Markdown content (including images, links, math) to Anki-compatible HTML
- `Anki.addNotes`, `Anki.updateNotes`, `Anki.deleteNotes`, `Anki.storeMediaFile`: Interaction points with AnkiConnect
- `SettingsTab.display`: Configuration of plugin behavior
- Error handling paths for graceful degradation when Anki connection fails 