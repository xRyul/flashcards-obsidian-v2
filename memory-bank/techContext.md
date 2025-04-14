# Tech Context

* **Technologies Used:**
    * TypeScript
    * Obsidian API
    * AnkiConnect API (via HTTP fetch)
    * `showdown` library (for Markdown to HTML conversion in `Parser`)
* **Development Setup:** (Requires Obsidian, Node.js/npm for building)
* **Technical Constraints:**
    * Relies on AnkiConnect being available and running.
    * Parsing logic needs to handle various Markdown flavors and Obsidian-specific syntax.
* **Dependencies:**
    * `showdown` (^version - check package.json)
* **Tool Usage:**
    * `npm run build` (Likely command for compiling TS to JS for Obsidian).
    * `showdown` library (`htmlConverter.makeHtml`) is used for base Markdown conversion, but requires pre-processing (`substitute...` functions) and post-processing (cleanup regex) for complex/conflicting syntax like image embeds. 