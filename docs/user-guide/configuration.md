# Configuration Guide

This guide explains all the configuration options available in the Flashcards for Obsidian plugin.

## Accessing Plugin Settings

To access the plugin settings:

1. Open Obsidian
2. Go to Settings (gear icon in the bottom left)
3. Click on "Community plugins" in the left sidebar
4. Find "Flashcards for Obsidian" and click the gear icon next to it

## General Settings

### Default Deck

**Setting:** `Default deck`

The default Anki deck where cards will be stored if no specific deck is specified through YAML frontmatter or folder-based deck names.

**Default value:** `Default`

### Folder-Based Deck Names

**Setting:** `Use folder as deck name`

When enabled, the plugin uses the folder path as the deck name for all cards in that file.

**Default value:** `Enabled`

**Example:**
- If a note is located at `/Biology/Cell Biology/mitochondria.md`, cards from this note will be stored in the Anki deck named `Biology::Cell Biology`.
- Note that folder separators (`/`) are converted to the Anki deck separator (`::`)

### Tag for Flashcards

**Setting:** `Flashcards tag`

The tag used to identify flashcards in your notes. When a line contains this tag, it's treated as the start of a flashcard.

**Default value:** `#card`

### Show heading path

**Setting:** `Show heading path`

When enabled, the plugin automatically includes the heading hierarchy above a card as context in the question field.

**Default value:** `Enabled`

### Heading Path Separator

**Setting:** `Heading path separator`

The separator used between heading levels when "Show heading path" is enabled.

**Default value:** ` > ` (space, greater than symbol, space)

### Inline Card Separator

**Setting:** `Inline cards separator`

The separator used for inline flashcards (question :: answer).

**Default value:** `::`

### Reversed Card Separator

**Setting:** `Reversed inline cards separator`

The separator used for reversed inline flashcards (question ::: answer), which create cards in both directions.

**Default value:** `:::`

### Default Anki Tag

**Setting:** `Default tag`

A tag that will be automatically added to all cards created with this plugin.

**Default value:** `obsidian`

## Advanced Features

### Source Support

**Setting:** `Source Support`

When enabled, the plugin adds a "Source" field to cards that includes a reference to the Obsidian note where the card originated.

**Default value:** `Enabled`

### Code Highlighting Support

**Setting:** `Code Highlight Support`

When enabled, the plugin provides syntax highlighting for code blocks in your cards. This modifies the Anki card templates to include the necessary CSS and JavaScript for code highlighting.

**Default value:** `Enabled`

## AnkiConnect Settings

### Request Permission

**Setting:** `Request permission to Anki`

Clicking this button will request permission from AnkiConnect to allow the plugin to interact with Anki. This is a one-time action required for security purposes.

### Permission Status

Shows whether the plugin currently has permission to connect to Anki.

## Configuration Through YAML Frontmatter

You can override certain global settings on a per-file basis using YAML frontmatter at the top of your Obsidian notes:

```markdown
---
cards-deck: Language::Spanish
---
```

### Supported Frontmatter Keys

- `cards-deck`: Specifies the Anki deck name for cards in this file. Overrides both the default deck and folder-based deck names.

## Default Configuration

The plugin comes with these default settings:

```javascript
{
  contextAwareMode: true,              // Show heading path
  sourceSupport: true,                 // Add source field to cards
  codeHighlightSupport: true,          // Enable code highlighting 
  contextSeparator: " > ",             // Separator for heading path
  deck: "Default",                     // Default deck name
  folderBasedDeck: true,               // Use folder path as deck name
  folder: "",                          // Reserved for future use
  flashcardsTag: "card",               // Tag to identify cards
  inlineSeparator: "::",               // Separator for inline cards
  inlineSeparatorReverse: ":::",       // Separator for reversed cards
  defaultAnkiTag: "obsidian",          // Default tag for all cards
  ankiConnectPermission: false         // Permission status
}
```

## Configuration Files

The plugin stores its settings in the `.obsidian/plugins/flashcards-obsidian-v2/data.json` file within your vault. This file is automatically created and updated when you change settings in the plugin.

## Resetting Configuration

To reset the plugin configuration to default values:

1. Close Obsidian
2. Navigate to your vault's `.obsidian/plugins/flashcards-obsidian-v2/` directory
3. Delete the `data.json` file
4. Restart Obsidian

The plugin will recreate the configuration file with default values.
