/**
 * Type definitions for Parser service components
 */

/**
 * Interface for Heading structure used in context-aware parsing
 */
export interface Heading {
    /**
     * The index position in the file
     */
    index: number;
    
    /**
     * Match groups from the regex
     * [0] - Full match
     * [1] - Heading markers (##)
     * [2] - Heading text
     */
    0: string;  // Full match
    1: string;  // Heading markers (##)
    2: string;  // Heading text
}

/**
 * Interface for Card Fields
 * Each card type has different field requirements
 */
export interface CardFields {
    [key: string]: string;
}

/**
 * Interface for Basic Card Fields
 */
export interface BasicCardFields extends CardFields {
    Front: string;
    Back: string;
    Source?: string;
}

/**
 * Interface for Cloze Card Fields
 */
export interface ClozeCardFields extends CardFields {
    Text: string;
    Extra: string;
    Source?: string;
}

/**
 * Interface for Spaced Card Fields
 */
export interface SpacedCardFields extends CardFields {
    Prompt: string;
    Source?: string;
}

/**
 * Interface for Embed content in parsed cards
 */
export interface EmbedContent {
    content: string;
    path: string;
}

/**
 * Type for Embed Map used in parsing embedded content
 */
export type EmbedMap = Map<string, string>;

/**
 * Interface for Media file information used in card parsing
 */
export interface CardMedia {
    filename: string;
    data: string;
}

/**
 * Interface for a range of text in the file
 */
export interface TextRange {
    start: number;
    end: number;
}

/**
 * Interface for parsed tag information
 */
export interface TagInfo {
    tags: string[];
    originalText: string;
}

/**
 * Enum for Card Types
 */
export enum CardType {
    BASIC = 'basic',
    CLOZE = 'cloze',
    SPACED = 'spaced',
    INLINE = 'inline'
} 