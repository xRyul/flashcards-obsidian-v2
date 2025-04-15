# Installation Guide

This guide explains how to install and set up the Flashcards for Obsidian plugin.

## Prerequisites

Before installing the plugin, make sure you have:

1. [Obsidian](https://obsidian.md/) installed on your device
2. [Anki](https://apps.ankiweb.net/) installed on the same device
3. [AnkiConnect](https://ankiweb.net/shared/info/2055492159) add-on installed in Anki

### Installing AnkiConnect

1. Open Anki
2. Click on `Tools` > `Add-ons` > `Get Add-ons...`
3. Enter the code `2055492159` in the dialog box
4. Click `OK` to install AnkiConnect
5. Restart Anki after installation

## Installing the Plugin

### Method 1: From Obsidian Community Plugins

1. Open Obsidian
2. Go to `Settings` > `Community plugins`
3. Turn off `Safe mode` if prompted
4. Click `Browse` and search for "Flashcards for Obsidian"
5. Click `Install`
6. Once installed, toggle the switch to enable the plugin

### Method 2: Manual Installation

1. Download the latest release from the GitHub repository
2. Extract the ZIP file
3. Move the extracted folder to your Obsidian vault's `.obsidian/plugins/` directory
4. Open Obsidian and go to `Settings` > `Community plugins`
5. Turn off `Safe mode` if prompted
6. Refresh the list and enable the "Flashcards for Obsidian" plugin

## Initial Setup

1. After enabling the plugin, go to its settings by clicking the gear icon
2. Configure your default settings:
   - Default deck name
   - Whether to use folder paths as deck names
   - Tag that identifies flashcards in your notes (default: `#card`)
   - Enable/disable context-aware mode (heading breadcrumbs)
   - Set inline card separators
   - Configure additional options based on your preferences
3. Open Anki and keep it running in the background

## Verifying the Installation

After installation, you should see:

1. A flashcard icon in the Obsidian ribbon (left sidebar)
2. The Anki connection status in the status bar (bottom of the window)
   - "Anki ⚡️" indicates a successful connection
   - An empty indicator means Anki is not running or AnkiConnect is not installed

## Troubleshooting

If you encounter problems:

1. **No Anki connection**: Ensure that Anki is running and AnkiConnect is installed
2. **Permission error**: Go to plugin settings and click "Request permission" to allow the plugin to access AnkiConnect
3. **Port conflict**: If AnkiConnect is configured to use a different port than the default (8765), you'll need to adjust it in the AnkiConnect settings

## Next Steps

Once you've successfully installed and set up the plugin, you can:

- Learn how to [create your first flashcard](./creating-cards.md)
- Explore [advanced configuration options](./configuration.md)
- Check out [examples and templates](./examples.md) 