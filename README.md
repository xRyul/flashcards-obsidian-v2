# Flashcards to Anki v2

This is a fork of the [Obsidian Flashcards to Anki](https://github.com/reuseman/flashcards-obsidian) plugin.

- Works with Obsidian 1.4+
- Added support for AVIF and WEBP images
- Replaced flashcard ID syntax from `^1234567` to `<!-- ankiID: 1234567 -->`. This is to avoid conflicts with Obsidians block linking syntax. 
- Added 2 commands for flashcard deletion from ANKI:
    - `Delete all card in current file from Anki only` - deletes all cards in the current note from Anki, and removed IDs from the note.
    - `Delete selected card(s) from Anki only` - allow you to select a card or multiple cards and delete them from Anki.
- The plugin now recovers missing Anki IDs by matching card content with existing cards in Anki.
- Cards are now automatically recreated if they exist in Obsidian but are missing from Anki (e.g., when decks are deleted in Anki)
- Content inside HTML comments is now ignored for card creation (except for Anki ID comments)
- Other bug fixes.

## Features

- Card types: 📝
    - 📄 Basic cards (add `#card` to the end of the line to create flashcard)
    - 🔍 Cloze with ==Highlight== or {Curly brackets} or {2:Cloze}
    - ↔️ Inline cards (`Question::Answer`)
    - 🔄 Reversed cards (`Question:::Answer`)
- Card deck: 🗂️
    - 📋 Defined in frontmatter: `cards-deck: <deck-name>`
    - 📂 Create sub-decks by separating each deck with `::` e.g.: `cards-deck: DeckName::SubDeckName::SubSubDeckName`
    - 🔄 Automatically sorts cards into decks based on folder names
- Supports:
    - 🖼️ Images 
    - 🔊 Audio
    - ∑ LaTeX 
    - 💻 Code blocks

## Quick Examples

You can use ordered and unordered lists, tables, and other markdown elements as long as they are nested and separated by a blank line.

### Basic Card
```markdown
What is the capital of France? #card
Paris
```


### Cloze Card
```markdown
The {c1:mitochondria} is the powerhouse of the cell.
```

### Inline Card
```markdown
Capital of Germany :: Berlin
```

### Card with Context (Heading Path)
```markdown
# Biology
## Cell Biology

What is the function of mitochondria? #card
Energy production through cellular respiration
```

### Sync Command
1. Create your cards in Obsidian notes
2. Click the flashcard icon in the sidebar to sync with Anki

## Documentation Sections

### [User Guide](./docs/user-guide/index.md)

- [Installation Guide](./docs/user-guide/installation.md)
- [Creating Cards](./docs/user-guide/creating-cards.md)
- [Configuration Guide](./docs/user-guide/configuration.md)
- [Examples and Templates](./docs/user-guide/examples.md)
- [Troubleshooting](./docs/user-guide/troubleshooting.md)

## Getting Help

1. Check the [Troubleshooting](./docs/user-guide/troubleshooting.md) guide
2. Visit the [GitHub repository](https://github.com/reuseman/flashcards-obsidian) for updates or to report issues