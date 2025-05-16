# Troubleshooting Guide

This guide helps you diagnose and fix common issues that may occur while using the Flashcards for Obsidian plugin.

## Connection Issues

### Anki Not Connecting

**Symptoms:**
- Empty status bar indicator where "Anki ⚡️" should appear
- Error message: "Error: Anki must be open with AnkiConnect installed"

**Solutions:**
1. Ensure Anki is running
2. Check that AnkiConnect add-on is installed in Anki (Tools → Add-ons)
3. Restart both Anki and Obsidian
4. Check if a firewall is blocking port 8765

### Permission Issues

**Symptoms:**
- Cards don't sync despite Anki being open
- No error message appears, but nothing happens

**Solutions:**
1. Go to plugin settings and click "Request permission to Anki"
2. Watch for a popup in Anki asking for permission
3. Click "Yes" on the permission dialog
4. Try the synchronization again

## Card Creation Issues

### Cards Not Being Created

**Symptoms:**
- "Error: Could not create cards" notification
- Notification showing 0 cards created

**Solutions:**
1. Check your card syntax (see [Creating Cards](./creating-cards.md))
2. Ensure there are no syntax errors in your Markdown
3. Verify that the deck name is valid (no special characters)
4. Check the console for more detailed error messages (Ctrl+Shift+I)

### Duplicated Cards

**Symptoms:**
- The same card appears multiple times in Anki
- Cards get duplicated on each sync

**Solutions:**
1. Check if you have multiple cards with identical content
2. Look for missing ID blocks (HTML comments with Anki IDs)
3. Check if HTML comment blocks have been accidentally deleted
4. Delete duplicate cards in Anki and re-sync

### Missing ID Blocks

**Symptoms:**
- Cards are recreated on each sync rather than updated
- Multiple copies of the same card in Anki

**Solutions:**
1. Let the plugin recover IDs (it will attempt to match content)
2. If automatic recovery doesn't work, delete the duplicate cards in Anki
3. In Obsidian, sync again to create fresh cards with proper IDs

## Content Formatting Issues

### Images Not Showing in Anki

**Symptoms:**
- Images visible in Obsidian but not in Anki
- Broken image links in Anki cards

**Solutions:**
1. Make sure images use supported formats (JPG, PNG, GIF, WEBP, AVIF)
2. Check if image paths are correct
3. For Obsidian attachments, ensure they're in an accessible location
4. Try using absolute paths rather than relative paths

### Code Blocks Not Highlighted

**Symptoms:**
- Code appears in Anki but without syntax highlighting
- Code formatting is missing or broken

**Solutions:**
1. Ensure "Code Highlight Support" is enabled in plugin settings
2. Specify the language in code blocks: \```python instead of just \```
3. Re-sync cards to update their templates
4. Check if code highlighting resources were properly added to Anki

### Math Notation Not Rendering

**Symptoms:**
- LaTeX or math notation appears as raw text in Anki
- Math symbols are missing or incorrectly rendered

**Solutions:**
1. Ensure you're using correct math notation syntax ($...$ or $$...$$)
2. Check if Anki's MathJax support is working
3. Make sure you don't have conflicting Anki add-ons
4. Re-sync the cards to update the content

### Lists and Callouts Not Displaying Correctly

**Symptoms:**
- Ordered and unordered lists show up as a single line in Anki
- Callout blocks lose their formatting when viewed in Anki
- Line breaks missing between list items

**Solutions:**
1. Update to the latest version of the plugin, which includes enhanced list formatting
2. Resync your cards to apply the improved formatting
3. Ensure your Anki note types have been updated (the plugin will notify you)
4. For complex formatting, consider using HTML in your Obsidian notes

## YAML and Deck Issues

### Missing Deck Key

**Symptoms:**
- Notification: "YAML frontmatter is missing the 'cards-deck' key. Using default deck"
- Cards going to the wrong deck

**Solutions:**
1. Add the `cards-deck` key to your YAML frontmatter:
   ```markdown
   ---
   cards-deck: Your Deck Name
   ---
   ```
2. Check for typos in the frontmatter key (`cards-deck`, not `card-deck` or `deck`)
3. Ensure proper YAML syntax (no extra spaces, proper indentation)

### Invalid Deck Names

**Symptoms:**
- Error when creating cards related to deck names
- Decks not being created in Anki

**Solutions:**
1. Avoid special characters in deck names
2. Use `::` for subdecks instead of `/` (e.g., `Biology::Cell Biology`)
3. Check for whitespace at the beginning or end of deck names

## File and Note Issues

### No Cards Detected

**Symptoms:**
- "Nothing to do. Everything is up to date" despite new cards
- Zero cards found for syncing

**Solutions:**
1. Check if you're using the correct syntax for cards
2. Make sure the card tag matches your settings (default: `#card`)
3. Ensure there's proper spacing between the question, tag, and answer
4. Check if cards are inside code blocks or HTML comments (they'll be ignored)

### Errors When Updating Files

**Symptoms:**
- "Error: Could not update the file" notification
- Cards created in Anki but IDs not written back to Obsidian

**Solutions:**
1. Check if your Obsidian note is in read-only mode
2. Ensure Obsidian has permission to write to the file
3. Try reopening the file or restarting Obsidian
4. Check if your vault is properly synchronized if using sync services

## After Deck Deletion Issues

### Cards Not Recreated

**Symptoms:**
- Cards have IDs in Obsidian but don't exist in Anki
- Sync doesn't recreate the cards

**Solutions:**
1. If you deleted an Anki deck, the plugin will now correctly recreate the cards
2. The plugin will remove the old IDs and add the cards as new cards
3. Sync the file to trigger the recreation process
4. If cards aren't recreated, try deleting the ID blocks manually and re-syncing

## Plugin Settings Issues

### Settings Not Saving

**Symptoms:**
- Settings reset after restarting Obsidian
- Configuration changes don't take effect

**Solutions:**
1. Check if Obsidian has permission to write to its configuration directory
2. Try manually editing the data.json file in your vault's .obsidian/plugins/flashcards-obsidian-v2/ directory
3. Reset the plugin settings and configure them again

### Feature Not Working

**Symptoms:**
- A specific feature doesn't work as expected
- Configuration option has no effect

**Solutions:**
1. Check if the feature requires other settings to be enabled
2. Verify you're using the correct syntax for the feature
3. Try disabling and re-enabling the plugin
4. Check for conflicts with other Obsidian plugins

## Debugging Steps

If you encounter issues not covered above, try these general debugging steps:

1. **Check the console for errors:**
   - Open Obsidian's Developer Console (Ctrl+Shift+I or Cmd+Option+I)
   - Look for error messages related to the plugin

2. **Try with a minimal configuration:**
   - Create a new note with a simple card
   - Test if the basic functionality works

3. **Check for conflicting plugins:**
   - Temporarily disable other plugins that might interfere
   - Re-enable them one by one to identify conflicts

4. **Reset the plugin:**
   - Disable the plugin
   - Delete the plugin folder (.obsidian/plugins/flashcards-obsidian-v2/)
   - Reinstall the plugin

5. **Check for known issues:**
   - Visit the plugin's GitHub repository
   - Search for similar issues in the issue tracker

6. **Clean Anki's cache:**
   - In Anki, go to Tools → Check Database
   - In Anki, go to Tools → Empty Card Browser Cache

## Common Error Messages

| Error Message | Likely Cause | Solution |
|---------------|--------------|----------|
| "Error: Anki must be open with AnkiConnect installed" | Anki not running or AnkiConnect not installed | Start Anki and install AnkiConnect |
| "Error: Could not update the file" | File permissions or sync issues | Check file permissions, restart Obsidian |
| "Error: Could not create cards" | Syntax issue or AnkiConnect error | Check card syntax and AnkiConnect connection |
| "Nothing to do. Everything is up to date" | No changes detected or no cards found | Check card syntax and ensure content changed |
| "X card(s) updated, Y card(s) created" | Success message | No action needed |
| "Error: Card with ID X is not in Anki!" | Card exists in Obsidian but not in Anki | Allow plugin to recreate missing cards |

## Getting Additional Help

If you've tried all the troubleshooting steps and still have issues:

1. Gather relevant information:
   - Error messages from the console
   - Steps to reproduce the issue
   - Your plugin settings
   - Obsidian and plugin versions

2. Submit an issue on GitHub with this information
3. Provide sample Markdown that demonstrates the issue (if possible) 