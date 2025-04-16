/**
 * Type definitions for Anki Connect API
 */

/**
 * Base interface for an Anki note
 */
export interface AnkiNote {
    id?: number;
    modelName: string;
    fields: Record<string, string>;
    tags: string[];
    deckName?: string; // Optional as it's not always required in all contexts
}

/**
 * Interface for Anki card info returned by cardsInfo
 */
export interface AnkiCardInfo {
    answer: string;
    question: string;
    deckName: string;
    modelName: string;
    fieldOrder: number;
    fields: Record<string, { value: string; order: number }>;
    css?: string; // Optional CSS
    cardId: number;
    note: number; // The note ID
    tags: string[];
}

/**
 * Interface for Anki note info returned by notesInfo
 */
export interface AnkiNoteInfo {
    noteId: number;
    modelName: string;
    tags: string[];
    fields: Record<string, { value: string; order: number }>;
    cards?: number[]; // Optional: Array of card IDs associated with this note
}

/**
 * Type for Anki API action parameters
 */
export type AnkiActionParams = Record<string, any>;

/**
 * Interface for a single Anki action
 */
export interface AnkiAction {
    action: string;
    params: AnkiActionParams;
}

/**
 * Interface for media file information
 */
export interface AnkiMediaFile {
    filename: string;
    data: string; // Base64 encoded data
}

/**
 * Response from Anki API calls
 */
export interface AnkiResponse {
    result: any;
    error: string | null;
}

/**
 * Interface for multi-action request
 */
export interface AnkiMultiActionRequest {
    actions: AnkiAction[];
}

/**
 * Type for Anki API version
 */
export type AnkiApiVersion = 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Type for note update fields
 */
export interface AnkiNoteUpdate {
    id: number;
    fields: Record<string, string>;
}

/**
 * Represents the structure for a single media file to be stored via AnkiConnect.
 */
export interface AnkiStoreMediaParams {
    filename: string;
    data?: string;    // Base64 encoded data
    path?: string;     // Absolute path to the file
    url?: string;      // URL to download the file from
    deleteExisting?: boolean; // Optional: Whether to delete existing file with the same name
}

/**
 * Represents the action structure for storing a single media file.
 */
export interface StoreMediaAction {
    action: "storeMediaFile";
    params: AnkiStoreMediaParams;
}

/**
 * Represents the possible result for a single media file storage attempt.
 * Usually true if successful, false or null otherwise (AnkiConnect docs are vague).
 */
export type AnkiStoreMediaResultItem = boolean | null | string; // string if error message is returned?

/**
 * Represents the result of a multi-action call for storing media files.
 */
export type AnkiStoreMediaResult = AnkiStoreMediaResultItem[];

// Types for Anki Service updateCards multi-action
export interface UpdateNoteFieldsParams {
    note: {
        id: number;
        fields: Record<string, string>;
    }
}
export interface UpdateNoteFieldsAction {
    action: "updateNoteFields";
    params: UpdateNoteFieldsParams;
}

export interface ClearNotesTagsParams {
    notes: number[];
}
export interface ClearNotesTagsAction {
    action: "clearNotesTags";
    params: ClearNotesTagsParams;
}

export interface AddTagsParams {
    notes: number[];
    tags: string;
}
export interface AddTagsAction {
    action: "addTags";
    params: AddTagsParams;
}

export type AnkiUpdateAction = UpdateNoteFieldsAction | ClearNotesTagsAction | AddTagsAction;

// Types for Anki Service createModels action
export interface AnkiCardTemplate {
	Name: string;
	Front: string;
	Back: string;
}

export interface CreateModelParams {
	modelName: string;
	inOrderFields: string[];
	css: string;
	isCloze: boolean;
	cardTemplates: AnkiCardTemplate[];
}

export interface CreateModelAction {
    action: "createModel";
    params: CreateModelParams;
}

/**
 * Response from AnkiConnect requestPermission action
 */
export interface AnkiPermissionResponse {
    permission: "granted" | "denied";
    requireApiKey: boolean;
    version: number;
}

// Payload for the 'multi' action
export interface AnkiMultiPayload {
  action: 'multi';
  version: 6;
  params: {
    actions: AnkiUpdateAction[]; // Re-use existing AnkiUpdateAction type
  };
}

// Base Payload Structure
interface AnkiPayload<TAction extends string, TParams> {
    action: TAction;
    version: 6;
    params: TParams;
}

// Specific Payload Types
export type AnkiCreateDeckPayload = AnkiPayload<'createDeck', { deck: string }>;
export type AnkiChangeDeckPayload = AnkiPayload<'changeDeck', { cards: number[]; deck: string }>;
export type AnkiDeleteNotesPayload = AnkiPayload<'deleteNotes', { notes: number[] }>;
export type AnkiFindNotesPayload = AnkiPayload<'findNotes', { query: string }>;
export type AnkiNotesInfoPayload = AnkiPayload<'notesInfo', { notes: number[] }>;
export type AnkiRequestPermissionPayload = AnkiPayload<'requestPermission', Record<string, never>>; // No params
export type AnkiRetrieveMediaPayload = AnkiPayload<'retrieveMediaFile', { filename: string }>;

// Multi-payload specifically for storing media
export interface AnkiStoreMediaMultiPayload {
  action: 'multi';
  version: 6;
  params: {
    actions: StoreMediaAction[]; // Use StoreMediaAction from earlier definitions
  };
}

// Note: We already have AnkiMultiPayload for update actions. 