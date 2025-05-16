// /services/anki.ts
import { Card } from "src/entities/card";
import {
  sourceField,
  codeScript,
  highlightjsBase64,
  hihglightjsInitBase64,
  highlightCssBase64,
  codeDeckExtension,
  sourceDeckExtension,
} from "src/conf/constants";
import { AnkiNoteInfo, AnkiUpdateAction, CreateModelAction, StoreMediaAction, AnkiStoreMediaResult, CreateModelParams } from "src/types/anki";
import { arraysEqual } from "src/utils";
import {
  AnkiNote,
  AnkiActionParams,
  AnkiCardInfo,
  AnkiPermissionResponse,
  UpdateNoteFieldsAction,
} from "src/types/anki";

export class Anki {
  public async createModels(
    sourceSupport: boolean,
    codeHighlightSupport: boolean
  ): Promise<void> {
    let models = this.getModels(sourceSupport, false);
    if (codeHighlightSupport) {
      models = models.concat(this.getModels(sourceSupport, true));
    }

    const actions: CreateModelAction[] = models.map(modelParams => ({
      action: "createModel",
      params: modelParams as unknown as CreateModelParams
    }));

    try {
      const results = await this.invoke("multi", 6, { actions: actions });
      if (results && typeof results === 'object' && !Array.isArray(results) && results.error) {
        // Ignore "Model name already exists" as this is normal when plugin has run before
        if (results.error === "Model name already exists") {
          // console.log("Model already exists, continuing...");
          return;
        }
        throw results.error;
      }
      if (Array.isArray(results)) {
        for (const result of results) {
          if (result !== null) {
            // Ignore "Model name already exists" errors for individual models
            if (typeof result === 'object' && result.error === "Model name already exists") {
              // console.log("Model already exists, continuing...");
              continue;
            }
            throw result;
          }
        }
        return;
      } else {
        throw new Error("Unexpected response structure from Anki multi action");
      }
    } catch (error) {
      // Allow model name exists errors to pass through
      if (typeof error === 'string' && error.includes("Model name already exists")) {
        // console.log("Model already exists, continuing...");
        return;
      }
      console.error("Error creating Anki models:", error);
      throw error;
    }
  }

  public async createDeck(deckName: string): Promise<any> {
    return this.invoke("createDeck", 6, { deck: deckName });
  }

  public async storeMediaFiles(cards: Card[]): Promise<AnkiStoreMediaResult | {}> {
    const actions: StoreMediaAction[] = [];

    for (const card of cards) {
      for (const media of card.getMedias() as { filename: string, data: string }[]) {
        actions.push({
          action: "storeMediaFile",
          params: { 
            filename: media.filename,
            data: media.data
          },
        });
      }
    }

    if (actions.length > 0) {
      const result = await this.invoke("multi", 6, { actions: actions });
      return result as AnkiStoreMediaResult;
    } else {
      return {};
    }
  }

  public async storeCodeHighlightMedias(): Promise<AnkiStoreMediaResult | void> {
    const fileExistsResult = await this.invoke("retrieveMediaFile", 6, {
      filename: "_highlightInit.js",
    });
    const fileExists = fileExistsResult !== null && fileExistsResult !== false;

    if (!fileExists) {
      const actions: StoreMediaAction[] = [
        {
          action: "storeMediaFile",
          params: {
            filename: "_highlight.js",
            data: highlightjsBase64,
          },
        },
        {
          action: "storeMediaFile",
          params: {
            filename: "_highlightInit.js",
            data: hihglightjsInitBase64,
          },
        },
        {
          action: "storeMediaFile",
          params: {
            filename: "_highlight.css",
            data: highlightCssBase64,
          },
        },
      ];
      const result = await this.invoke("multi", 6, {
        actions: actions, 
      });
      return result as AnkiStoreMediaResult;
    }
  }

  public async addCards(cards: Card[]): Promise<number[]> {
    const notes: any = [];
    
    cards.forEach((card) => notes.push(card.getCard(false)));

    try {
        const result = await this.invoke("addNotes", 6, {
            notes: notes,
        });
        
        // Update the cards with their new IDs
        result.forEach((id: number, index: number) => {
            if (id !== null) {
                cards[index].id = id;
            }
        });
        
        return result;
    } catch (error) {
        console.error("Error adding cards:", error);
        throw error;
    }
}

  /**
   * Given the new cards with an optional deck name, it updates all the cards on Anki.
   *
   * Be aware of https://github.com/FooSoft/anki-connect/issues/82. If the Browse pane is opened on Anki,
   * the update does not change all the cards.
   * @param cards the new cards.
   * @param deckName the new deck name.
   */
  public async updateCards(cards: Card[]): Promise<null[] | {}> {
    const updateActions: AnkiUpdateAction[] = [];

    for (const card of cards) {
      if (!card.id) {
        console.warn('Skipping update for card without ID:', card);
        continue;
      }

      try {
        const noteInfoResult = await this.invoke("notesInfo", 6, { notes: [card.id] });
        const noteInfoArr = noteInfoResult as AnkiNoteInfo[];

        if (noteInfoArr && noteInfoArr.length > 0) {
          const ankiNote = noteInfoArr[0];
          let fieldsNeedUpdate = false;
          let tagsNeedUpdate = false;

          // Check if fields need update (compare field values)
          for (const fieldName in card.fields) {
            if (!ankiNote.fields[fieldName] || card.fields[fieldName] !== ankiNote.fields[fieldName].value) {
              fieldsNeedUpdate = true;
              break;
            }
          }
          // Also check if Anki has extra fields not in the card (model change?)
          if (!fieldsNeedUpdate) {
            for (const fieldName in ankiNote.fields) {
              if (!card.fields.hasOwnProperty(fieldName)) {
                // This case shouldn't ideally happen if models match, but good to check
                fieldsNeedUpdate = true; 
                break;
              }
            }
          }

          // Check if tags need update
          const currentTags = card.tags?.slice().sort() || [];
          const ankiTags = ankiNote.tags?.slice().sort() || [];
          if (!arraysEqual(currentTags, ankiTags)) {
            tagsNeedUpdate = true;
          }

          if (fieldsNeedUpdate) {
            updateActions.push({
              action: "updateNoteFields",
              params: {
                note: {
                  id: card.id,
                  fields: card.fields
                }
              }
            });
          }

          if (tagsNeedUpdate) {
            updateActions.push({
              action: "clearNotesTags",
              params: {
                notes: [card.id]
              }
            });

            if (card.tags && card.tags.length > 0) {
              updateActions.push({
                action: "addTags",
                params: {
                  notes: [card.id],
                  tags: card.tags.join(" ")
                }
              });
            }
          }
        } else {
          console.warn(`Note with ID ${card.id} not found in Anki`);
        }
      } catch (error) {
        console.error(`Error updating card ${card.id}:`, error);
      }
    }

    if (updateActions.length > 0) {
      try {
        const result = await this.invoke("multi", 6, {
          actions: updateActions
        });
        return result as null[];
      } catch (error) {
        console.error("Error executing update actions:", error);
        throw error;
      }
    }

    return Promise.resolve({});
  }

  /**
   * Change the deck for a list of cards.
   * @param cardIds - List of card IDs to move.
   * @param deckName - The target deck name.
   * @returns A promise that resolves to null on success.
   */
  async changeDeck(cardIds: number[], deckName: string): Promise<null> {
    return this.invoke('changeDeck', 6, { cards: cardIds, deck: deckName });
  }

  public async cardsInfo(ids: number[]): Promise<AnkiCardInfo[]> {
    return this.invoke("cardsInfo", 6, { cards: ids });
  }

  public async getCards(ids: number[]) {
    return await this.invoke("notesInfo", 6, { notes: ids });
  }

  /**
   * Finds notes in Anki based on a query.
   * @param query The Anki search query (e.g., "deck:MyDeck")
   * @returns An array of note IDs matching the query.
   */
  public async findNotes(query: string): Promise<number[]> {
    return await this.invoke("findNotes", 6, { query: query });
  }

  /**
   * Fetches detailed information for all notes within a specific deck.
   * @param deckName The name of the deck.
   * @returns An array of note information objects.
   */
  public async getNotesInDeck(deckName: string): Promise<any[]> {
    console.debug(`AnkiService: Finding notes in deck '${deckName}'`);
    const query = `deck:"${deckName}"`;
    const noteIds = await this.findNotes(query);
    console.debug(`AnkiService: Found ${noteIds.length} notes in deck '${deckName}'. Fetching details...`);
    if (noteIds.length === 0) {
      return [];
    }
    // AnkiConnect can handle large requests, but batching might be safer for extremely large decks.
    // For now, fetch all at once.
    const notesInfo = await this.getCards(noteIds); // Re-use getCards which calls notesInfo
    console.debug(`AnkiService: Fetched details for ${notesInfo.length} notes.`);
    return notesInfo;
  }

  public async deleteCards(ids: number[]): Promise<void> {
    return this.invoke("deleteNotes", 6, { notes: ids });
  }

  public async ping(): Promise<boolean> {
    return (await this.invoke("version", 6)) === 6;
  }

  private mergeTags(oldTags: string[], newTags: string[], cardId: number) {
    const actions = [];

    // Find tags to Add
    for (const tag of newTags) {
      const index = oldTags.indexOf(tag);
      if (index > -1) {
        oldTags.splice(index, 1);
      } else {
        actions.push({
          action: "addTags",
          params: {
            notes: [cardId],
            tags: tag,
          },
        });
      }
    }

    // All Tags to delete
    for (const tag of oldTags) {
      actions.push({
        action: "removeTags",
        params: {
          notes: [cardId],
          tags: tag,
        },
      });
    }

    return actions;
  }

  private invoke(action: string, version = 6, params = {}): any {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.addEventListener("error", () => reject("failed to issue request"));
      xhr.addEventListener("load", () => {
        try {
          const response = JSON.parse(xhr.responseText);
          if (Object.getOwnPropertyNames(response).length != 2) {
            throw "response has an unexpected number of fields";
          }
          if (!Object.prototype.hasOwnProperty.call(response, "error")) {
            throw "response is missing required error field";
          }
          if (!Object.prototype.hasOwnProperty.call(response, "result")) {
            throw "response is missing required result field";
          }
          if (response.error) {
            throw response.error;
          }
          resolve(response.result);
        } catch (e) {
          reject(e);
        }
      });

      xhr.open("POST", "http://127.0.0.1:8765");
      xhr.send(JSON.stringify({ action, version, params }));
    });
  }

  private getModels(
    sourceSupport: boolean,
    codeHighlightSupport: boolean
  ): object[] {
    let sourceFieldContent = "";
    let codeScriptContent = "";
    let sourceExtension = "";
    let codeExtension = "";
    if (sourceSupport) {
      sourceFieldContent = "\r\n" + sourceField;
      sourceExtension = sourceDeckExtension;
    }

    if (codeHighlightSupport) {
      codeScriptContent = "\r\n" + codeScript + "\r\n";
      codeExtension = codeDeckExtension;
    }

    const css =
      '.card {\r\n font-family: arial;\r\n font-size: 20px;\r\n color: black;\r\n background-color: white;\r\n}\r\n\r\n.tag::before {\r\n\tcontent: "#";\r\n}\r\n\r\n.tag {\r\n  color: white;\r\n  background-color: #9F2BFF;\r\n  border: none;\r\n  font-size: 11px;\r\n  font-weight: bold;\r\n  padding: 1px 8px;\r\n  margin: 0px 3px;\r\n  text-decoration: none;\r\n  cursor: pointer;\r\n  border-radius: 14px;\r\n  display: inline;\r\n  vertical-align: middle;\r\n}\r\n .cloze { font-weight: bold; color: blue;}.nightMode .cloze { color: lightblue;}';
    const front = `{{Front}}\r\n<p class=\"tags\">{{Tags}}<\/p>\r\n\r\n<script>\r\n    var tagEl = document.querySelector(\'.tags\');\r\n    var tags = tagEl.textContent.trim().split(\' \');\r\n    tagEl.textContent = \'\'; // Clear existing tags\r\n    tags.forEach(function(tag, index) {\r\n\tif (tag) {\r\n\t    var span = document.createElement(\'span\');\r\n        span.classList.add(\'tag\');\r\n        span.textContent = tag;\r\n        tagEl.appendChild(span);\r\n        if (index < tags.length - 1) { // Add space between tags\r\n            tagEl.appendChild(document.createTextNode(\' \'));\r\n        }\r\n\t}\r\n    });\r\n    \r\n<\/script>${codeScriptContent}`;
    const back = `{{FrontSide}}\n\n<hr id=answer>\n\n{{Back}}${sourceFieldContent}`;
    const frontReversed = `{{Back}}\r\n<p class=\"tags\">{{Tags}}<\/p>\r\n\r\n<script>\r\n    var tagEl = document.querySelector(\'.tags\');\r\n    var tags = tagEl.textContent.trim().split(\' \');\r\n    tagEl.textContent = \'\'; // Clear existing tags\r\n    tags.forEach(function(tag, index) {\r\n\tif (tag) {\r\n\t    var span = document.createElement(\'span\');\r\n        span.classList.add(\'tag\');\r\n        span.textContent = tag;\r\n        tagEl.appendChild(span);\r\n        if (index < tags.length - 1) { // Add space between tags\r\n            tagEl.appendChild(document.createTextNode(\' \'));\r\n        }\r\n\t}\r\n    });\r\n    \r\n<\/script>${codeScriptContent}`;
    const backReversed = `{{FrontSide}}\n\n<hr id=answer>\n\n{{Front}}${sourceFieldContent}`;
    const prompt = `{{Prompt}}\r\n<p class=\"tags\">🧠spaced {{Tags}}<\/p>\r\n\r\n<script>\r\n    var tagEl = document.querySelector(\'.tags\');\r\n    var tags = tagEl.textContent.trim().split(\' \');\r\n    tagEl.textContent = \'\'; // Clear existing tags\r\n    tags.forEach(function(tag, index) {\r\n\tif (tag) {\r\n\t    var span = document.createElement(\'span\');\r\n        span.classList.add(\'tag\');\r\n        span.textContent = tag;\r\n        tagEl.appendChild(span);\r\n        if (index < tags.length - 1) { // Add space between tags\r\n            tagEl.appendChild(document.createTextNode(\' \'));\r\n        }\r\n\t}\r\n    });\r\n    \r\n<\/script>${codeScriptContent}`;
    const promptBack = `{{FrontSide}}\n\n<hr id=answer>🧠 Review done.${sourceFieldContent}`;
    const clozeFront = `{{cloze:Text}}\n\n<script>\r\n    var tagEl = document.querySelector(\'.tags\');\r\n    var tags = tagEl.textContent.trim().split(\' \');\r\n    tagEl.textContent = \'\'; // Clear existing tags\r\n    tags.forEach(function(tag, index) {\r\n\tif (tag) {\r\n\t    var span = document.createElement(\'span\');\r\n        span.classList.add(\'tag\');\r\n        span.textContent = tag;\r\n        tagEl.appendChild(span);\r\n        if (index < tags.length - 1) { // Add space between tags\r\n            tagEl.appendChild(document.createTextNode(\' \'));\r\n        }\r\n\t}\r\n    });\r\n    \r\n<\/script>${codeScriptContent}`;
    const clozeBack = `{{cloze:Text}}\n\n<br>{{Extra}}${sourceFieldContent}<script>\r\n    var tagEl = document.querySelector(\'.tags\');\r\n    var tags = tagEl.textContent.trim().split(\' \');\r\n    tagEl.textContent = \'\'; // Clear existing tags\r\n    tags.forEach(function(tag, index) {\r\n\tif (tag) {\r\n\t    var span = document.createElement(\'span\');\r\n        span.classList.add(\'tag\');\r\n        span.textContent = tag;\r\n        tagEl.appendChild(span);\r\n        if (index < tags.length - 1) { // Add space between tags\r\n            tagEl.appendChild(document.createTextNode(\' \'));\r\n        }\r\n\t}\r\n    });\r\n    \r\n<\/script>${codeScriptContent}`;

    let classicFields = ["Front", "Back"];
    let promptFields = ["Prompt"];
    let clozeFields = ["Text", "Extra"];
    if (sourceSupport) {
      classicFields = classicFields.concat("Source");
      promptFields = promptFields.concat("Source");
      clozeFields = clozeFields.concat("Source");
    }

    const obsidianBasic = {
      modelName: `Obsidian-basic${sourceExtension}${codeExtension}`,
      inOrderFields: classicFields,
      css: css,
      isCloze: false,
      cardTemplates: [
        {
          Name: "Front / Back",
          Front: front,
          Back: back,
        },
      ],
    };

    const obsidianBasicReversed = {
      modelName: `Obsidian-basic-reversed${sourceExtension}${codeExtension}`,
      inOrderFields: classicFields,
      css: css,
      isCloze: false,
      cardTemplates: [
        {
          Name: "Front / Back",
          Front: front,
          Back: back,
        },
        {
          Name: "Back / Front",
          Front: frontReversed,
          Back: backReversed,
        },
      ],
    };

    const obsidianCloze = {
      modelName: `Obsidian-cloze${sourceExtension}${codeExtension}`,
      inOrderFields: clozeFields,
      css: css,
      isCloze: true,
      cardTemplates: [
        {
          Name: "Cloze",
          Front: clozeFront,
          Back: clozeBack,
        },
      ],
    };

    const obsidianSpaced = {
      modelName: `Obsidian-spaced${sourceExtension}${codeExtension}`,
      inOrderFields: promptFields,
      css: css,
      isCloze: false,
      cardTemplates: [
        {
          Name: "Spaced",
          Front: prompt,
          Back: promptBack,
        },
      ],
    };

    return [obsidianBasic, obsidianBasicReversed, obsidianCloze, obsidianSpaced];
  }

  public async requestPermission(): Promise<AnkiPermissionResponse> {
    return this.invoke("requestPermission", 6);
  }
}