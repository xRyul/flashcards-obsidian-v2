import { codeDeckExtension } from "src/conf/constants";
import { arraysEqual } from "src/utils";

export abstract class Card {
  id: number;
  deckName: string;
  initialContent: string;
  fields: Record<string, string>;
  reversed: boolean;
  initialOffset: number;
  endOffset: number;
  tags: string[];
  inserted: boolean;
  mediaNames: string[];
  mediaBase64Encoded: string[];
  oldTags: string[];
  containsCode: boolean;
  modelName: string;

  constructor(
    id: number,
    deckName: string,
    initialContent: string,
    fields: Record<string, string>,
    reversed: boolean,
    initialOffset: number,
    endOffset: number,
    tags: string[],
    inserted: boolean,
    mediaNames: string[],
    containsCode = false
  ) {
    this.id = id;
    this.deckName = deckName;
    this.initialContent = initialContent;
    this.fields = fields;
    this.reversed = reversed;
    this.initialOffset = initialOffset
    this.endOffset = endOffset;
    this.tags = tags;
    this.inserted = inserted;
    this.mediaNames = mediaNames;
    this.mediaBase64Encoded = [];
    this.oldTags = [];
    this.containsCode = containsCode;
    this.modelName = "";
  }

  abstract toString(): string;
  abstract getCard(update: boolean): object;
  abstract getMedias(): object[];
  abstract getIdFormat(): string;

  match(card: any): boolean {
    // TODO not supported currently
    // if (this.modelName !== card.modelName) {
    //     return false
    // }

    const fields : any = Object.entries(card.fields);
    // This is the case of a switch from a model to another one. It cannot be handeled
    if (fields.length !== Object.entries(this.fields).length) {
      return false;
    }

    for (const field of fields) {
      const fieldName = field[0];
      if (field[1].value !== this.fields[fieldName]) {
        console.debug(`Card.match: Field mismatch for ID ${card.noteId}. Field name: '${fieldName}'. Plugin value: '${this.fields[fieldName].substring(0, 100)}...', Anki value: '${field[1].value.substring(0, 100)}...'`);
        return false;
      }
    }

    const tagsMatch = arraysEqual(card.tags, this.tags);
    if (!tagsMatch) {
      console.debug(`Card.match: Tag mismatch for ID ${card.noteId}. Plugin tags: '${this.tags.join(', ')}', Anki tags: '${card.tags.join(', ')}'`);
    }

    return tagsMatch;
  }

  /**
   * Checks if the essential content (typically the first field, e.g., 'Front') 
   * matches the Anki card data. This is used for potentially recovering IDs 
   * based on Anki's likely duplicate detection logic (often first-field based).
   * @param ankiCard Anki card data object.
   * @returns True if the first field matches, false otherwise.
   */
  looselyMatchesFrontField(ankiCard: any): boolean {
    const ankiFields = Object.entries(ankiCard.fields);
    const thisFields = Object.entries(this.fields);

    // Basic check: ensure both have at least one field
    if (ankiFields.length === 0 || thisFields.length === 0) {
      return false;
    }

    // Assume the first field is the key for duplicate checks (like Anki often does)
    const ankiFirstFieldName = ankiFields[0][0];
    const thisFirstFieldName = thisFields[0][0]; // Usually 'Front'
    const ankiFirstFieldValue = (ankiFields[0][1] as any)?.value;
    const thisFirstFieldValue = thisFields[0][1]; 

    // Optional: Add logging here if needed for further debugging
    console.debug(`looselyMatchesFrontField: Comparing Anki[${ankiFirstFieldName}]='${(ankiFirstFieldValue ?? '').toString().substring(0,50)}...' with Plugin[${thisFirstFieldName}]='${thisFirstFieldValue.substring(0,50)}...'`);

    // Only compare the first field's value
    // Note: This is a simplification. Anki's exact duplicate logic might be more complex 
    // (e.g., HTML normalization, case sensitivity settings). 
    return thisFirstFieldName === ankiFirstFieldName && thisFirstFieldValue === ankiFirstFieldValue;
  }

  getCodeDeckNameExtension() {
    return this.containsCode ? codeDeckExtension : "";
  }
}