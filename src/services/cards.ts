import { Anki } from "src/services/anki";
import {
  App,
  FileSystemAdapter,
  FrontMatterCache,
  Notice,
  TFile,
  normalizePath,
} from "obsidian";
import { Parser } from "src/services/parser";
import { ISettings } from "src/conf/settings";
import { Card } from "src/entities/card";
import { Regex } from "src/conf/regex";
import { noticeTimeout } from "src/conf/constants";
import { Inlinecard } from "src/entities/inlinecard";
import { AnkiNoteInfo } from "src/types/anki";
import { arraysEqual } from "src/utils";
import { arrayBufferToBase64 } from "obsidian";

export class CardsService {
  private app: App;
  private settings: ISettings;
  private regex: Regex;
  private parser: Parser;
  private anki: Anki;

  private updateFile: boolean;
  private totalOffset: number;
  private file: string;
  private notifications: string[];
  private idsToRemoveFromFile: Set<number>;

  constructor(app: App, settings: ISettings) {
    this.app = app;
    this.settings = settings;
    this.regex = new Regex(this.settings);
    this.parser = new Parser(this.regex, this.settings);
    this.anki = new Anki();
    this.idsToRemoveFromFile = new Set<number>();
  }

  public async execute(activeFile: TFile): Promise<string[]> {
    this.regex.update(this.settings);

    try {
      await this.anki.ping();
    } catch (err) {
      console.error(err);
      return ["Error: Anki must be open with AnkiConnect installed."];
    }

    // Init for the execute phase
    this.updateFile = false;
    this.totalOffset = 0;
    this.notifications = [];
    const filePath = activeFile.basename;
    const sourcePath = activeFile.path;
    const fileCachedMetadata = this.app.metadataCache.getFileCache(activeFile);
    const vaultName = this.app.vault.getName();
    let globalTags: string[] = undefined;

    // Parse frontmatter
    const frontmatter = fileCachedMetadata.frontmatter;
    let deckName = "";

    if (frontmatter && frontmatter["cards-deck"]) { // Check frontmatter exists AND has the key
      deckName = frontmatter["cards-deck"];
    } else {
        // Deck not specified in frontmatter (either no frontmatter or key missing)
        if (this.settings.folderBasedDeck && activeFile.parent.path !== "/") {
            // Using folder-based deck name
            deckName = activeFile.parent.path.split("/").join("::");
        } else {
            // Using default deck name
            deckName = this.settings.deck;
            // Show notification *only* if frontmatter exists but is missing the key
            if (frontmatter && !frontmatter["cards-deck"]) {
                 new Notice(`YAML frontmatter is missing the 'cards-deck' key. Using default deck: "${deckName}". Add 'cards-deck: yourDeckName' to the file's frontmatter to specify a deck.`, noticeTimeout * 2);
            }
        }
    }

    try {
      this.anki.storeCodeHighlightMedias();
      await this.anki.createModels(
        this.settings.sourceSupport,
        this.settings.codeHighlightSupport
      );
      await this.anki.createDeck(deckName);
      this.file = await this.app.vault.read(activeFile);
      if (!this.file.endsWith("\n")) {
        this.file += "\n";
      }
      globalTags = this.parseGlobalTags(this.file);
      // TODO with empty check that does not call ankiCards line
      const ankiBlocks = this.parser.getAnkiIDsBlocks(this.file);
      const ankiIDsInFile = this.getAnkiIDs(ankiBlocks);
      // Fetch info for ALL notes in the target deck for reliable ID recovery
      const allAnkiNotesInDeck = await this.anki.getNotesInDeck(deckName);
      
      // Also fetch specific info for IDs found in the file, for update checks
      const ankiNotesForIDsInFile = ankiIDsInFile.length > 0 
        ? await this.anki.getCards(ankiIDsInFile)
        : [];

      const cards: Card[] = this.parser.generateFlashcards(
        this.file,
        deckName,
        vaultName,
        filePath,
        globalTags
      );
      const [cardsToCreate, cardsToUpdate, cardsNotInAnki] = this.filterByUpdate(
        allAnkiNotesInDeck, // Use complete list for ID recovery
        ankiNotesForIDsInFile, // Use list for IDs in file for update checks
        cards,
        ankiIDsInFile, // Pass the set of IDs found in the file
        ankiBlocks // Pass the original blocks for potential removal
      );
      const cardIds: number[] = this.getCardsIds(ankiNotesForIDsInFile, cards);
      const cardsToDelete: number[] = this.parser.getCardsToDelete(this.file);

      if (cardsNotInAnki) {
        // console.info("Flashcards: Cards not in Anki (maybe deleted)");
        for (const card of cardsNotInAnki) {
          this.notifications.push(
            `Error: Card with ID ${card.id} is not in Anki!`
          );
        }
      }
      // console.info(cardsNotInAnki);

      this.insertMedias(cards, sourcePath);
      await this.deleteCardsOnAnki(cardsToDelete, ankiBlocks);
      await this.updateCardsOnAnki(cardsToUpdate);
      await this.insertCardsOnAnki(cardsToCreate);

      // Update decks if needed
      const deckNeedToBeChanged = await this.deckNeedToBeChanged(
        cardIds,
        deckName
      );
      if (deckNeedToBeChanged) {
        try {
          this.anki.changeDeck(cardIds, deckName);
          this.notifications.push("Cards moved in new deck");
        } catch {
          return ["Error: Could not update deck the file."];
        }
      }

      // --- Final Cleanup: Remove obsolete ID blocks ---
      if (this.idsToRemoveFromFile.size > 0) {
        // console.log("Removing obsolete Anki ID blocks from file content:", Array.from(this.idsToRemoveFromFile));
        const lines = this.file.split('\n');
        const cleanedLines = lines.filter(line => {
            const idMatch = line.trim().match(/^<!-- ankiID: (\d+) -->$/);
            return !(idMatch && this.idsToRemoveFromFile.has(Number(idMatch[1])));
        });
        const cleanedContent = cleanedLines.join('\n');
        if (cleanedContent !== this.file) {
            this.file = cleanedContent;
            this.updateFile = true; // Ensure file is saved if changes were made
        }
      }
      // --- End Final Cleanup ---

      // Update file if any changes occurred (new IDs written, old IDs removed)
      if (this.updateFile) {
        try {
          this.app.vault.modify(activeFile, this.file);
        } catch (err) {
          Error("Could not update the file.");
          return ["Error: Could not update the file."];
        }
      }

      this.updateFrontmatter(frontmatter, deckName);

      if (!this.notifications.length) {
        this.notifications.push("Nothing to do. Everything is up to date");
      }
      return this.notifications;
    } catch (err) {
      console.error(err);
      Error("Something went wrong");
    }
  }

  private async insertMedias(cards: Card[], sourcePath: string) {
    try {
      // Currently the media are created for every run, this is not a problem since Anki APIs overwrite the file
      // A more efficient way would be to keep track of the medias saved
      await this.generateMediaLinks(cards, sourcePath);
      await this.anki.storeMediaFiles(cards);
    } catch (err) {
      console.error(err);
      Error("Error: Could not upload medias");
    }
  }

  private async generateMediaLinks(cards: Card[], sourcePath: string) {
    if (this.app.vault.adapter instanceof FileSystemAdapter) {
      // @ts-ignore: Unreachable code error

      for (const card of cards) {
        for (const media of card.mediaNames) {
          const image = this.app.metadataCache.getFirstLinkpathDest(
            decodeURIComponent(media),
            sourcePath
          );
          try {
            const binaryMedia = await this.app.vault.readBinary(image);
            card.mediaBase64Encoded.push(arrayBufferToBase64(binaryMedia));
          } catch (err) {
            Error("Error: Could not read media");
          }
        }
      }
    }
  }

  private async insertCardsOnAnki(cardsToCreate: Card[]): Promise<number> {
    if (cardsToCreate.length) {
      let insertedCards = 0;
      try {
        const ids = await this.anki.addCards(cardsToCreate);
        // Add IDs from response to Flashcard[]
        ids.map((id: number, index: number) => {
          cardsToCreate[index].id = id;
        });

        let total = 0;
        cardsToCreate.forEach((card) => {
          if (card.id === null) {
            new Notice(
              `Error, could not add: '${card.initialContent}'`,
              noticeTimeout
            );
          } else {
            card.reversed ? (insertedCards += 2) : insertedCards++;
          }
          card.reversed ? (total += 2) : total++;
        });

        this.writeAnkiBlocks(cardsToCreate);

        this.notifications.push(
          `Inserted successfully ${insertedCards}/${total} cards.`
        );
        return insertedCards;
      } catch (err) {
        console.error(err);
        Error("Error: Could not write cards on Anki");
      }
    }
  }

  private updateFrontmatter(frontmatter: FrontMatterCache, deckName: string) {
    const activeFile = this.app.workspace.getActiveFile();
    if (!(activeFile instanceof TFile)) {
        return;
    }

    this.app.fileManager.processFrontMatter(activeFile, (frontmatter) => {
        frontmatter["cards-deck"] = deckName;
    });
  }

  private debugCardInfo(card: Card, fileContent: string) {
    console.log("============= DEBUG CARD INFO =============");
    console.log(`Card ID: ${card.id}`);
    console.log(`Card initial offset: ${card.initialOffset}`);
    console.log(`Card end offset: ${card.endOffset}`);
    
    // Get content before and after the card end position
    const contextBefore = fileContent.substring(Math.max(0, card.endOffset - 50), card.endOffset);
    const contextAfter = fileContent.substring(card.endOffset, Math.min(fileContent.length, card.endOffset + 50));
    
    console.log(`Content near end offset:`);
    console.log(`BEFORE END [${contextBefore}]`);
    console.log(`AFTER END [${contextAfter}]`);
    
    // Check if we're in the middle of a line
    const lineStart = fileContent.lastIndexOf('\n', card.endOffset - 1) + 1;
    const lineEnd = fileContent.indexOf('\n', card.endOffset);
    if (lineEnd > lineStart) {
      const wholeLine = fileContent.substring(lineStart, lineEnd);
      const beforeEndInLine = fileContent.substring(lineStart, card.endOffset);
      const afterEndInLine = fileContent.substring(card.endOffset, lineEnd);
      
      console.log(`CURRENT LINE: [${wholeLine}]`);
      console.log(`SPLIT AT: [${beforeEndInLine}] | [${afterEndInLine}]`);
    }
    
    // Check if character at end offset is in the middle of a math expression
    const charAtEnd = fileContent.charAt(card.endOffset - 1);
    const nextChar = fileContent.charAt(card.endOffset);
    console.log(`Char at end offset-1: "${charAtEnd}" (code: ${charAtEnd.charCodeAt(0)})`);
    console.log(`Char at end offset: "${nextChar}" (code: ${nextChar.charCodeAt(0)})`);
    
    // Check for math expression indicators
    const mathStart = fileContent.lastIndexOf('$', card.endOffset);
    const mathEnd = fileContent.indexOf('$', mathStart + 1);
    if (mathStart !== -1 && mathEnd !== -1 && mathStart < card.endOffset && mathEnd > card.endOffset) {
      console.log(`WARNING: End offset is inside math expression: ${fileContent.substring(mathStart, mathEnd + 1)}`);
    }
    
    // Check all leading spaces before each line and look for subtle differences
    const lines = fileContent.split('\n');
    let lineIndex = 0;
    let pos = 0;
    // Find which line contains our end offset
    for (let i = 0; i < lines.length; i++) {
      pos += lines[i].length + 1;
      if (pos > card.endOffset) {
        lineIndex = i;
        break;
      }
    }
    
    // Print a few lines before and after
    console.log("LINES AROUND OFFSET (with character codes for whitespace):");
    const startLine = Math.max(0, lineIndex - 3);
    const endLine = Math.min(lines.length - 1, lineIndex + 3);
    for (let i = startLine; i <= endLine; i++) {
      const linePrefix = lines[i].match(/^(\s*>?\s*)/)[0];
      const linePrefixCodes = [...linePrefix].map(c => c.charCodeAt(0));
      console.log(`Line ${i}${i === lineIndex ? ' (CURRENT)' : ''}: Leading chars: [${linePrefixCodes.join(', ')}], Content: ${lines[i]}`);
    }
    
    console.log("========== END DEBUG CARD INFO ==========");
  }

  private writeAnkiBlocks(cardsToCreate: Card[]) {
    for (const card of cardsToCreate) {
      // Card.id cannot be null, because if written already previously it has an ID,
      //   if it has been inserted it has an ID too
      if (card.id !== null && !card.inserted) {
        // Adding detailed debug info
        console.debug(`\n[DEBUG] Processing card with id=${card.id}`);
        console.debug(`[DEBUG] Card initial content: "${card.initialContent.substring(0, 50)}..."`);
        
        card.endOffset += this.totalOffset;
        let offset = card.endOffset;
        const idString = card.getIdFormat() + '\n'; // Add newline after the ID
        
        console.debug(`[DEBUG] Card has endOffset=${card.endOffset}, totalOffset=${this.totalOffset}`);
        
        // Check if this is a callout card by examining the content at the beginning of the card
        const cardStartPosition = card.initialOffset + this.totalOffset; // Adjust for totalOffset
        const cardStartContent = this.file.substring(cardStartPosition, cardStartPosition + 50); // Check first 50 chars
        const isCallout = cardStartContent.trim().startsWith('>') && cardStartContent.includes('[!');
        
        console.debug(`[DEBUG] Card start position: ${cardStartPosition}`);
        console.debug(`[DEBUG] Card start content: "${cardStartContent}"`);
        console.debug(`[DEBUG] Is callout: ${isCallout}`);
        
        // Check if this is an inline card
        const isInlineCard = card instanceof Inlinecard;
        console.debug(`[DEBUG] Is inline card: ${isInlineCard}`);
        
        // FIRST: Always ensure we're not inserting in the middle of a line
        // Find the end of the current line containing the offset
        const contentAfterOffset = this.file.substring(offset);
        const nextNewlinePos = contentAfterOffset.indexOf('\n');
        
        if (nextNewlinePos !== -1) {
          // Move to the end of the current line
          offset += nextNewlinePos + 1; // +1 to be after the newline
          console.debug(`[DEBUG] Found newline at position ${nextNewlinePos}, new offset: ${offset}`);
        } else {
          // No newline found, add one to the end of file
          this.file += '\n';
          offset = this.file.length;
          console.debug(`[DEBUG] No newline found, added one at end of file. New offset: ${offset}`);
        }

        // THEN: Handle specific card types (callout or inline)
        if (isCallout) {
          // For callouts, find the boundary where the callout ends
          const lines = this.file.split('\n');
          console.debug(`[DEBUG] File has ${lines.length} lines`);
          
          // Find which line contains our card's initial offset (start of the card)
          let initialLineIndex = -1;
          let lineStartPos = 0;
          
          for (let i = 0; i < lines.length; i++) {
            if (lineStartPos + lines[i].length >= cardStartPosition) {
              initialLineIndex = i;
              console.debug(`[DEBUG] Found card start at line ${i}: "${lines[i].substring(0, 50)}..."`);
              break;
            }
            lineStartPos += lines[i].length + 1; // +1 for newline
          }
          
          console.debug(`[DEBUG] Card starts at line ${initialLineIndex}`);
          
          // Get the indentation pattern of the callout from the initial line
          let calloutIndentation = '';
          if (initialLineIndex >= 0) {
            const match = lines[initialLineIndex].match(/^(\s*>[\s>]*)/);
            if (match) {
              calloutIndentation = match[1];
              console.debug(`[DEBUG] Detected callout indentation pattern: "${calloutIndentation.replace(/\n/g, '\\n').replace(/\r/g, '\\r')}"`);
            }
            
            // Find the end of THIS specific callout by looking for where the pattern stops
            // or where an empty line appears
            let calloutEndLine = initialLineIndex + 1;
            
            console.debug(`[DEBUG] Starting search for callout end at line ${calloutEndLine}`);
            
            while (calloutEndLine < lines.length) {
              const line = lines[calloutEndLine];
              
              // Check if the current line is the start of a new callout
              // Only consider it a new callout if we're beyond the first line of our current callout
              const isNewCallout = calloutEndLine > initialLineIndex && 
                                  line.trim().startsWith('>') && 
                                  line.includes('[!');
              const startsWithIndentation = line.startsWith(calloutIndentation);
              const isEmpty = line.trim() === '';
              
              console.debug(`[DEBUG] Examining line ${calloutEndLine}: "${line.substring(0, 50)}..."`);
              console.debug(`[DEBUG]   - Is new callout: ${isNewCallout}`);
              console.debug(`[DEBUG]   - Starts with correct indentation: ${startsWithIndentation}`);
              console.debug(`[DEBUG]   - Is empty line: ${isEmpty}`);
              
              // If the line doesn't start with the callout pattern and isn't empty, we've left the callout
              // OR if we detect a new callout (not the first line), it's a new card
              if ((!startsWithIndentation && !isEmpty) || isNewCallout) {
                console.debug(`[DEBUG] Breaking at line ${calloutEndLine}: New callout or indentation change detected`);
                break;
              }
              
              // If this is an empty line or the end of our content, break
              if (isEmpty) {
                console.debug(`[DEBUG] Breaking at line ${calloutEndLine}: Empty line detected`);
                break;
              }
              
              calloutEndLine++;
            }
            
            // Insert right after the last line of THIS callout
            let newOffset = 0;
            for (let i = 0; i <= calloutEndLine; i++) {
              if (i < calloutEndLine) {
                newOffset += lines[i].length + 1; // +1 for newline
              }
            }
            
            console.debug(`[DEBUG] Callout ends at line ${calloutEndLine}: "${lines[calloutEndLine-1].substring(0, 50)}..."`);
            console.debug(`[DEBUG] New insertion offset: ${newOffset} (changed from ${offset})`);
            
            // Use this position for insertion
            offset = newOffset;
          }
        } else if (isInlineCard) {
          // For inline cards, we already moved to the end of the line above
          // No need for additional positioning
          console.debug(`[DEBUG] Using end-of-line positioning for inline card, offset: ${offset}`);
        }

        // Check if the character before the insertion point is already a newline
        const precedingChar = this.file.charAt(offset - 1);
        
        // Check for existing consecutive newlines to avoid adding extra blank lines
        let stringToInsert;
        if (precedingChar === '\n') {
          // We already have a newline, so just add the ID without an extra newline
          stringToInsert = idString;
          
          // Check if we have consecutive newlines (would cause a blank line)
          if (offset >= 2 && this.file.charAt(offset - 2) === '\n') {
            console.debug(`[DEBUG] Detected consecutive newlines, removing one`);
            // Go back one character to overwrite one of the newlines
            offset -= 1;
          }
        } else {
          // No newline before insertion point, add one
          stringToInsert = '\n' + idString;
        }
        
        console.debug(`[DEBUG] Character before insertion: "${precedingChar}" (charCode: ${precedingChar.charCodeAt(0)})`);
        console.debug(`[DEBUG] String to insert: "${stringToInsert.replace(/\n/g, '\\n')}"`);
        console.debug(`[DEBUG] Final insertion offset: ${offset}`);
        
        // Extract context around insertion point for debugging
        const before = this.file.substring(Math.max(0, offset - 50), offset);
        const after = this.file.substring(offset, Math.min(this.file.length, offset + 50));
        console.debug(`[DEBUG] Content before insertion: "${before}"`);
        console.debug(`[DEBUG] Content after insertion: "${after}"`);

        this.updateFile = true;
        this.file =
          this.file.substring(0, offset) +
          stringToInsert +
          this.file.substring(offset, this.file.length + 1);
        this.totalOffset += stringToInsert.length;
        
        console.debug(`[DEBUG] ID insertion complete, new totalOffset: ${this.totalOffset}`);
      }
    }
  }

  private async updateCardsOnAnki(cards: Card[]): Promise<number> {
    if (cards.length) {
      try {
        this.anki.updateCards(cards);
        this.notifications.push(
          `Updated successfully ${cards.length}/${cards.length} cards.`
        );
      } catch (err) {
        console.error(err);
        Error("Error: Could not update cards on Anki");
      }

      return cards.length;
    }
  }

  public async deleteCardsOnAnki(
    cards: number[],
    ankiBlocks: RegExpMatchArray[]
  ): Promise<number> {
    if (cards.length) {
      let deletedCards = 0;
      for (const block of ankiBlocks) {
        const id = Number(block[1]);

        // Deletion of cards that need to be deleted (i.e. blocks ID that don't have content)
        if (cards.includes(id)) {
          try {
            this.anki.deleteCards(cards);
            deletedCards++;

            this.updateFile = true;
            this.file =
              this.file.substring(0, block["index"]) +
              this.file.substring(
                block["index"] + block[0].length,
                this.file.length
              );
            this.totalOffset -= block[0].length;
            this.notifications.push(
              `Deleted successfully ${deletedCards}/${cards.length} cards.`
            );
          } catch (err) {
            console.error(err);
            Error("Error, could not delete the card from Anki");
          }
        }
      }

      return deletedCards;
    }
  }

  private getAnkiIDs(blocks: RegExpMatchArray[]): number[] {
    const IDs: number[] = [];
    for (const b of blocks) {
      IDs.push(Number(b[1]));
    }

    return IDs;
  }

  public filterByUpdate(
    allAnkiNotesInDeck: AnkiNoteInfo[], // Complete list for ID recovery (Typed)
    ankiNotesForIDsInFile: AnkiNoteInfo[], // List for IDs in file for update checks (Typed)
    generatedCards: Card[], // All cards parsed from the file
    ankiIDsInFile: number[], // Explicit list of IDs found in the file by getAnkiIDsBlocks
    ankiBlocks: RegExpMatchArray[] // Pass the original blocks (though not used for direct removal here anymore)
  ): [Card[], Card[], Card[]] {
    let cardsToCreate: Card[] = [];
    const cardsToUpdate: Card[] = [];
    const cardsNotInAnki: Card[] = [];
    const fileAnkiIdSet = new Set(ankiIDsInFile);

    // First process cards that already have IDs
    for (const flashcard of generatedCards) {
      // generatedCards have id = -1 if parser didn't find an ID block for them
      // It has a positive ID if the parser *did* find an ID block.

      if (flashcard.id !== -1) {
        // Parser found an ID for this card.
        // Check if this ID was actually in the set of IDs found in the file.
        if (fileAnkiIdSet.has(flashcard.id)) {
          // ID was found by parser AND exists in the file.
          // Now check against Anki's data.
          let ankiCard = ankiNotesForIDsInFile?.filter(
            (card: any) => Number(card.noteId) === flashcard.id
          )[0];
          
          if (!ankiCard) {
            // ID in file, but card missing in Anki (e.g., deck deleted).
            const originalId = flashcard.id; // Store original ID
            
            // *** Mark for later removal, DO NOT remove from this.file here ***
            this.idsToRemoveFromFile.add(originalId);

            // Treat as needing creation in the current target deck.
            console.warn(`Card with old ID ${originalId} not found in Anki. Marking block for removal and queuing for creation in deck '${flashcard.deckName}'.`);
            flashcard.id = -1; // Reset ID, needs a new one
            flashcard.inserted = false; // Mark as not inserted
            cardsToCreate.push(flashcard); // Add to creation list
          } else if (!flashcard.match(ankiCard)) {
            // ID in file and Anki, content differs -> needs update.
            flashcard.oldTags = ankiCard.tags;
            cardsToUpdate.push(flashcard);
          }
          // else: ID in file, ID in Anki, content matches -> do nothing.
        } else {
          // Parser found an ID, but it wasn't in the blocks scanned from the file.
          // This case shouldn't happen with current parsing, but if it did,
          // treat as needing creation (maybe block was deleted manually).
          cardsToCreate.push(flashcard);
        }
      } else {
        // Parser did NOT find an ID for this card (flashcard.id === -1).
        // Temporarily add to cardsToCreate; we'll check for content matches below.
        cardsToCreate.push(flashcard);
      }
    }

    // Now handle cards without IDs by checking if they match existing Anki cards
    // Use the complete list of notes from the deck for reliable ID recovery
    if (allAnkiNotesInDeck && cardsToCreate.length > 0) {
      // Keep track of cards we've already matched to avoid duplicates
      const matchedAnkiCardIds = new Set<number>();
      
      // New array for cards still needing creation after content matching
      const stillNeedCreation: Card[] = [];
      
      for (const cardWithoutId of cardsToCreate) {
        let contentMatch = false;
        
        // Skip if this card already has an ID (shouldn't happen, but just in case)
        if (cardWithoutId.id !== -1) {
          stillNeedCreation.push(cardWithoutId);
          continue;
        }
        
        // Look through ALL Anki notes in the deck for content match
        for (const ankiCard of allAnkiNotesInDeck) {
          const noteId = Number(ankiCard.noteId);
          
          // Skip if this Anki card was already matched to another card
          if (matchedAnkiCardIds.has(noteId)) {
            // Check if content *would* have matched if not already used
            const tempCard = Object.assign(Object.create(Object.getPrototypeOf(cardWithoutId)), cardWithoutId);
            tempCard.id = noteId; // Temporarily assign ID for matching check
            if (tempCard.match(ankiCard)) {
                console.warn(`Potential content match ignored: Card starting with "${cardWithoutId.initialContent.substring(0, 50)}..." matches Anki card ID ${noteId}, but this ID was already assigned to another card in this file.`);
            }
            continue;
          }
          
          // Create a temporary card with the Anki ID to use the match function
          const tempCard = Object.assign(Object.create(Object.getPrototypeOf(cardWithoutId)), cardWithoutId);
          tempCard.id = noteId;
          
          // Check if content matches using the loose (front-field only) comparison for ID recovery
          if (cardWithoutId.looselyMatchesFrontField(ankiCard)) {
            console.info(`Found potential content match via front field: Recovered ID ${noteId} for card without ID`);
            cardWithoutId.id = noteId;
            cardWithoutId.inserted = true; // Mark as inserted so ID gets written back
            
            // Write the ID back to the file
            this.updateFile = true;
            this.file = this.addMissingIdToCard(cardWithoutId);
            
            // Now use the STRICT match to see if an update is needed
            if (!cardWithoutId.match(ankiCard)) {
              console.debug(`Strict match failed for recovered ID ${noteId}. Card needs update.`);
              cardWithoutId.oldTags = ankiCard.tags;
              cardsToUpdate.push(cardWithoutId);
            } else {
              console.debug(`Strict match passed for recovered ID ${noteId}. No update needed.`);
            }
            
            contentMatch = true;
            break;
          }
        }
        
        // If no match found, this card still needs to be created
        if (!contentMatch) {
          stillNeedCreation.push(cardWithoutId);
        }
      }
      
      // Replace cardsToCreate with cards that still need creation
      cardsToCreate = stillNeedCreation;
    }

    console.debug("Flashcards: Final cards identified for creation after ID recovery attempt:", JSON.stringify(cardsToCreate.map(c => ({ id: c.id, initialContent: c.initialContent.substring(0, 100) + '...', fields: c.fields, tags: c.tags }))));
    console.debug("Flashcards: Final cards identified for update:", JSON.stringify(cardsToUpdate.map(c => ({ id: c.id, initialContent: c.initialContent.substring(0, 100) + '...', fields: c.fields, tags: c.tags, oldTags: c.oldTags }))));
    console.debug("Flashcards: Final cards identified as not in Anki:", JSON.stringify(cardsNotInAnki.map(c => ({ id: c.id, initialContent: c.initialContent.substring(0, 100) + '...' }))));

    return [cardsToCreate, cardsToUpdate, cardsNotInAnki];
  }
  
  private addMissingIdToCard(card: Card): string {
    let fileContent = this.file;
    const idString = card.getIdFormat() + '\n'; // Add newline after the ID
    
    // Find the end of the card content based on the endOffset
    let insertPosition = card.endOffset;
    
    // Check if this is a callout card by examining the content at the beginning of the card
    const cardStartPosition = card.initialOffset;
    const cardStartContent = fileContent.substring(cardStartPosition, cardStartPosition + 50); // Check first 50 chars
    const isCallout = cardStartContent.trim().startsWith('>') && cardStartContent.includes('[!');
    
    // Check if this is an inline card
    const isInlineCard = card instanceof Inlinecard;
    
    // FIRST: Always ensure we're not inserting in the middle of a line
    // Find the end of the current line containing the insert position
    const contentAfterPosition = fileContent.substring(insertPosition);
    const nextNewlinePos = contentAfterPosition.indexOf('\n');
    
    if (nextNewlinePos !== -1) {
      // Move to the end of the current line
      insertPosition += nextNewlinePos + 1; // +1 to be after the newline
    } else {
      // No newline found, add one to the end of file
      fileContent += '\n';
      insertPosition = fileContent.length;
    }
    
    // THEN: Handle specific card types (callout or inline)
    if (isCallout) {
      // For callouts, find the boundary where the callout ends
      const lines = fileContent.split('\n');
      
      // Find which line contains our initial offset
      let lineStartPos = 0;
      let lineIndex = -1;
      
      for (let i = 0; i < lines.length; i++) {
        lineStartPos += lines[i].length + 1; // +1 for newline
        if (lineStartPos > insertPosition) {
          lineIndex = i;
          break;
        }
      }
      
      if (lineIndex >= 0) {
        // Get the indentation pattern of the callout from the line
        let calloutIndentation = '';
        const match = lines[lineIndex].match(/^(\s*>[\s>]*)/);
        if (match) {
          calloutIndentation = match[1];
          console.debug(`[DEBUG] Detected callout indentation pattern in addMissingIdToCard: "${calloutIndentation.replace(/\n/g, '\\n').replace(/\r/g, '\\r')}"`);
        }
        
        // Find the last line of this callout, watching for where the pattern stops
        // or where a new callout starts
        let calloutEndLine = lineIndex + 1;
        
        while (calloutEndLine < lines.length) {
          const line = lines[calloutEndLine];
          
          // Check if the current line is the start of a new callout
          // Only consider it a new callout if we're beyond the first line of our current callout
          const isNewCallout = calloutEndLine > lineIndex && 
                              line.trim().startsWith('>') && 
                              line.includes('[!');
          const startsWithIndentation = line.startsWith(calloutIndentation);
          const isEmpty = line.trim() === '';
          
          console.debug(`[DEBUG] addMissingIdToCard: Examining line ${calloutEndLine}: "${line.substring(0, 50)}..."`);
          console.debug(`[DEBUG]   - Is new callout: ${isNewCallout}`);
          console.debug(`[DEBUG]   - Starts with correct indentation: ${startsWithIndentation}`);
          console.debug(`[DEBUG]   - Is empty line: ${isEmpty}`);
          
          // If the line doesn't match our callout pattern and isn't empty, we've left the callout
          // OR if it's the start of a new callout, stop here
          if ((!startsWithIndentation && !isEmpty) || isNewCallout) {
            console.debug(`[DEBUG] Breaking at line ${calloutEndLine}: New callout or indentation change detected`);
            break;
          }
          
          // If this is an empty line, stop
          if (isEmpty) {
            console.debug(`[DEBUG] Breaking at line ${calloutEndLine}: Empty line detected`);
            break;
          }
          
          calloutEndLine++;
        }
        
        // Insert right after the last line of this callout
        let newOffset = 0;
        for (let i = 0; i < calloutEndLine; i++) {
          newOffset += lines[i].length + 1; // +1 for newline
        }
        
        console.debug(`[DEBUG] Callout ends at line ${calloutEndLine-1}: "${lines[calloutEndLine-1].substring(0, 50)}..."`);
        console.debug(`[DEBUG] New insertion offset: ${newOffset} (changed from ${insertPosition})`);
        
        // Use this position for insertion
        insertPosition = newOffset;
      }
    } else if (isInlineCard) {
      // For inline cards, we already moved to the end of the line above
      // No need for additional positioning
    }
    
    // Ensure we insert on a new line
    const precedingChar = fileContent.charAt(insertPosition - 1);
    
    // Check for existing consecutive newlines to avoid adding extra blank lines
    let stringToInsert;
    if (precedingChar === '\n') {
      // We already have a newline, so just add the ID without an extra newline
      stringToInsert = idString;
      
      // Check if we have consecutive newlines (would cause a blank line)
      if (insertPosition >= 2 && fileContent.charAt(insertPosition - 2) === '\n') {
        console.debug(`[DEBUG] Detected consecutive newlines in addMissingIdToCard, removing one`);
        // Go back one character to overwrite one of the newlines
        insertPosition -= 1;
      }
    } else {
      // No newline before insertion point, add one
      stringToInsert = '\n' + idString;
    }
    
    // Insert the ID at the calculated position
    fileContent = fileContent.substring(0, insertPosition) + stringToInsert + fileContent.substring(insertPosition);
    
    return fileContent;
  }

  public async deckNeedToBeChanged(cardsIds: number[], deckName: string) {
    const cardsInfo = await this.anki.cardsInfo(cardsIds);
    // console.log("Flashcards: Cards info");
    // console.log(cardsInfo);
    if (cardsInfo.length !== 0) {
      return cardsInfo[0].deckName !== deckName;
    }

    return false;
  }

  public getCardsIds(ankiCards: AnkiNoteInfo[], generatedCards: Card[]): number[] {
    let ids: number[] = [];

    if (ankiCards) {
      for (const flashcard of generatedCards) {
        let ankiCard: AnkiNoteInfo | undefined = undefined;
        if (flashcard.inserted) {
          ankiCard = ankiCards.filter(
            (card: AnkiNoteInfo) => Number(card.noteId) === flashcard.id
          )[0];
          if (ankiCard && ankiCard.cards) {
            ids = ids.concat(ankiCard.cards);
          }
        }
      }
    }

    return ids;
  }

  public parseGlobalTags(file: string): string[] {
    let globalTags: string[] = [];

    const tags = file.match(/(?:cards-)?tags: ?(.*)/im);
    globalTags = tags ? tags[1].match(this.regex.globalTagsSplitter) : [];

    if (globalTags) {
      for (let i = 0; i < globalTags.length; i++) {
        globalTags[i] = globalTags[i].replace("#", "");
        globalTags[i] = globalTags[i].replace(/\//g, "::");
        globalTags[i] = globalTags[i].replace(/\[\[(.*)\]\]/, "$1");
        globalTags[i] = globalTags[i].trim();
        globalTags[i] = globalTags[i].replace(/ /g, "-");
      }

      return globalTags;
    }

    return [];
  }

  /**
   * Deletes specific cards from Anki using their IDs, without modifying the Obsidian note.
   * @param cardIds An array of Anki note IDs to delete.
   */
  public async deleteCardsFromAnkiOnly(cardIds: number[]): Promise<boolean> {
    if (!cardIds || cardIds.length === 0) {
      new Notice("No valid Anki card IDs provided for deletion.", noticeTimeout);
      return false;
    }
    try {
      // AnkiConnect's deleteNotes handles arrays directly
      await this.anki.deleteCards(cardIds);
      new Notice(`Deleted ${cardIds.length} card(s) from Anki: ${cardIds.join(', ')}.`, noticeTimeout);
      return true;
    } catch (err) {
      console.error("Error deleting cards from Anki:", err);
      new Notice(`Error: Could not delete cards [${cardIds.join(', ')}] from Anki. Check AnkiConnect connection.`, noticeTimeout);
      return false;
    }
  }
}