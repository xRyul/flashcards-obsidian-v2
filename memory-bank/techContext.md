# Tech Context

## Technologies Used
- **TypeScript**: Core programming language for type-safe development
- **Obsidian API**: Used for plugin integration, editor access, and event handling
- **AnkiConnect API**: HTTP-based API for communicating with Anki
- **Showdown**: Library for Markdown to HTML conversion
- **Obsidian Plugin Development Toolkit**: For building and packaging the plugin

## Development Setup
- **Prerequisites**:
  - Node.js/npm for building and package management
  - Obsidian for testing
  - Anki with AnkiConnect add-on installed
- **Development Workflow**:
  - Clone repository
  - Install dependencies with `npm install`
  - Build with `npm run dev` (for development) or `npm run build` (for production)
  - Test in Obsidian by pointing to the plugin directory

## Technical Constraints
- Relies on AnkiConnect being available and running
- Parsing logic needs to handle various Markdown flavors and Obsidian-specific syntax
- Obsidian plugins operate within a sandboxed environment
- Cross-platform compatibility requirements (Windows, macOS, Linux)
- Must handle network interruptions gracefully when communicating with AnkiConnect

## Dependencies
- **Core Dependencies**:
  - `obsidian`: Obsidian API package
  - `showdown`: For Markdown to HTML conversion
  - TypeScript and related build tools (Targeting ES2018)
- **Dev Dependencies**:
  - TypeScript compiler
  - Bundling tools (esbuild)
  - Testing frameworks

## Tool Usage
- `npm run dev`: Watches for changes and rebuilds automatically
- `npm run build`: Builds production-ready plugin
- **Custom Markdown Processing**:
  - `showdown` library (`htmlConverter.makeHtml`) is used for base Markdown conversion
  - Pre-processing (`substitute...` functions) and post-processing (cleanup regex) handle complex syntax
  - Special handling for image embeds, math notation, and Obsidian-specific syntax 