import { CardsService } from 'src/services/cards';
import { Card } from 'src/entities/card';
import { Flashcard } from 'src/entities/flashcard';
import { Clozecard } from 'src/entities/clozecard';
import { Parser } from 'src/services/parser';
import { Anki } from 'src/services/anki';
import { Regex } from 'src/conf/regex';
import { ISettings } from 'src/conf/settings';
import { App, TFile } from 'obsidian';

// Mock setup
jest.mock('src/services/anki');
jest.mock('obsidian');

describe('Card Recreation Logic', () => {
    let cardsService: CardsService;
    let mockApp: App;
    let mockAnki: jest.Mocked<Anki>;
    let mockParser: Parser;
    let mockRegex: Regex;
    let mockSettings: ISettings;

    beforeEach(() => {
        // Setup mocks
        mockApp = {
            vault: {
                read: jest.fn().mockResolvedValue('test content'),
                modify: jest.fn().mockResolvedValue(undefined),
            },
        } as unknown as App;

        // Initialize mock settings with all required properties
        mockSettings = {
            flashcardsTag: 'card',
            contextAwareMode: false,
            sourceSupport: true,
            codeHighlightSupport: true,
            contextSeparator: ' > ',
            deck: 'Default',
            folderBasedDeck: false,
            folder: '',
            inlineSeparator: '::',
            inlineSeparatorReverse: ':::',
            defaultAnkiTag: 'obsidian',
            ankiConnectPermission: true
        };

        // Use jest.Mocked pattern to avoid constructor issues
        mockAnki = new Anki() as jest.Mocked<Anki>;
        mockRegex = new Regex(mockSettings);
        mockParser = new Parser(mockRegex, mockSettings);

        // Initialize CardsService with mocks
        cardsService = new CardsService(mockApp, mockSettings);
        
        // Cast to any to access private members for testing
        (cardsService as any).anki = mockAnki;
        (cardsService as any).parser = mockParser;
        (cardsService as any).regex = mockRegex;
        
        // Reset tracked IDs to remove
        (cardsService as any).idsToRemoveFromFile = new Set();
        
        // Mock file content
        (cardsService as any).file = '';
        (cardsService as any).updateFile = false;
    });

    /**
     * Scenario: Multiple cards with IDs exist in Obsidian but all IDs are missing from Anki
     * Expected: All cards should be queued for recreation with their IDs reset
     */
    it('should recreate multiple cards when all are missing from Anki (deleted deck scenario)', async () => {
        // Create multiple test cards with IDs (simulating existing cards in Obsidian)
        const card1 = new Flashcard(
            12345, // ID exists in Obsidian
            'Default',
            'Question 1',
            { 
                Front: '<p>Question 1</p>', 
                Back: '<p>Answer 1</p>' 
            },
            false,
            10,
            50,
            ['test'],
            true, // marked as inserted
            [],
            false
        );
        
        const card2 = new Flashcard(
            67890, // ID exists in Obsidian
            'Default',
            'Question 2',
            { 
                Front: '<p>Question 2</p>', 
                Back: '<p>Answer 2</p>' 
            },
            false,
            100,
            150,
            ['test'],
            true, // marked as inserted
            [],
            false
        );
        
        // Empty array for ankiNotesInDeck (simulating deleted deck in Anki)
        const ankiNotes: any[] = [];
        
        // IDs found in the file
        const ankiIDsInFile = [12345, 67890];
        
        // Call filterByUpdate to process the cards
        const [cardsToCreate, cardsToUpdate, cardsNotInAnki] = cardsService.filterByUpdate(
            ankiNotes, // No notes in Anki
            ankiNotes,
            [card1, card2], // Two cards with IDs
            ankiIDsInFile,  // These IDs were found in file
            []              // No blocks to pass
        );
        
        // Expectations
        
        // Both cards should be queued for creation
        expect(cardsToCreate.length).toBe(2);
        
        // Cards should have their IDs reset to -1
        expect(cardsToCreate[0].id).toBe(-1);
        expect(cardsToCreate[1].id).toBe(-1);
        
        // Cards should be marked as not inserted
        expect(cardsToCreate[0].inserted).toBe(false);
        expect(cardsToCreate[1].inserted).toBe(false);
        
        // Original IDs should be marked for removal
        expect((cardsService as any).idsToRemoveFromFile.size).toBe(2);
        expect((cardsService as any).idsToRemoveFromFile.has(12345)).toBe(true);
        expect((cardsService as any).idsToRemoveFromFile.has(67890)).toBe(true);
        
        // No cards should be queued for update
        expect(cardsToUpdate.length).toBe(0);
    });

    /**
     * Scenario: Mix of cards with/without IDs when some Anki cards are missing
     * Expected: Cards with missing IDs in Anki should be queued for recreation,
     * cards without IDs should be queued for creation,
     * and cards with matching IDs should be processed normally
     */
    it('should handle mixed card scenarios: existing in Anki, missing from Anki, and new', async () => {
        // 1. Card with ID that exists in Anki
        const existingCard = new Flashcard(
            11111, // ID exists in both Obsidian and Anki
            'Default',
            'Existing Question',
            { 
                Front: '<p>Existing Question</p>', 
                Back: '<p>Existing Answer</p>' 
            },
            false,
            10,
            50,
            ['test'],
            true, // marked as inserted
            [],
            false
        );
        
        // 2. Card with ID that's missing from Anki
        const missingCard = new Flashcard(
            22222, // ID exists in Obsidian but not in Anki
            'Default',
            'Missing Question',
            { 
                Front: '<p>Missing Question</p>', 
                Back: '<p>Missing Answer</p>' 
            },
            false,
            100,
            150,
            ['test'],
            true, // marked as inserted
            [],
            false
        );
        
        // 3. New card without ID
        const newCard = new Flashcard(
            -1, // No ID yet
            'Default',
            'New Question',
            { 
                Front: '<p>New Question</p>', 
                Back: '<p>New Answer</p>' 
            },
            false,
            200,
            250,
            ['test'],
            false, // not inserted
            [],
            false
        );
        
        // Mock Anki notes - only contains one of our IDs
        const ankiNotes = [
            { 
                noteId: 11111, 
                fields: { 
                    Front: { value: '<p>Existing Question</p>' },
                    Back: { value: '<p>Existing Answer</p>' }
                },
                modelName: 'Obsidian-basic',
                tags: ['test']
            }
        ];
        
        // IDs found in the file
        const ankiIDsInFile = [11111, 22222];
        
        // Call filterByUpdate to process the cards
        const [cardsToCreate, cardsToUpdate, cardsNotInAnki] = cardsService.filterByUpdate(
            ankiNotes,
            ankiNotes,
            [existingCard, missingCard, newCard],
            ankiIDsInFile,
            []
        );
        
        // Expectations
        
        // Two cards should be queued for creation:
        // 1. The card with missing ID in Anki (reset to -1)
        // 2. The brand new card
        expect(cardsToCreate.length).toBe(2);
        
        // The original new card should remain queued for creation with id -1
        const newCardInCreateQueue = cardsToCreate.find(c => c.fields.Front === '<p>New Question</p>');
        expect(newCardInCreateQueue).toBeDefined();
        expect(newCardInCreateQueue?.id).toBe(-1);
        expect(newCardInCreateQueue?.inserted).toBe(false);
        
        // The card with missing ID in Anki should be queued for creation with id reset to -1
        const missingCardInCreateQueue = cardsToCreate.find(c => c.fields.Front === '<p>Missing Question</p>');
        expect(missingCardInCreateQueue).toBeDefined();
        expect(missingCardInCreateQueue?.id).toBe(-1);
        expect(missingCardInCreateQueue?.inserted).toBe(false);
        
        // Only the missing ID should be marked for removal
        expect((cardsService as any).idsToRemoveFromFile.size).toBe(1);
        expect((cardsService as any).idsToRemoveFromFile.has(22222)).toBe(true);
        
        // The existing card should not be in any queue (no content change)
        expect(cardsToUpdate.length).toBe(0);
    });

    /**
     * Scenario: Card with ID exists in Anki but content has changed
     * Expected: Card should be queued for update, not recreation
     */
    it('should update cards with changed content rather than recreating them', async () => {
        // Card with ID that exists in Anki but content has changed
        const changedCard = new Flashcard(
            33333,
            'Default',
            'Changed Question',
            { 
                Front: '<p>Changed Question</p>', 
                Back: '<p>New Answer Content</p>' // Changed answer
            },
            false,
            10,
            50,
            ['test', 'new-tag'], // Changed tags
            true,
            [],
            false
        );
        
        // Mock Anki notes - contains our ID but with different content
        const ankiNotes = [
            { 
                noteId: 33333, 
                fields: { 
                    Front: { value: '<p>Changed Question</p>' },
                    Back: { value: '<p>Original Answer</p>' } // Different answer
                },
                modelName: 'Obsidian-basic',
                tags: ['test'] // Missing the new-tag
            }
        ];
        
        // IDs found in the file
        const ankiIDsInFile = [33333];
        
        // Call filterByUpdate to process the cards
        const [cardsToCreate, cardsToUpdate, cardsNotInAnki] = cardsService.filterByUpdate(
            ankiNotes,
            ankiNotes,
            [changedCard],
            ankiIDsInFile,
            []
        );
        
        // Expectations
        
        // No cards should be queued for creation
        expect(cardsToCreate.length).toBe(0);
        
        // Card should be queued for update
        expect(cardsToUpdate.length).toBe(1);
        expect(cardsToUpdate[0].id).toBe(33333);
        expect(cardsToUpdate[0].fields.Back).toBe('<p>New Answer Content</p>');
        
        // Original tags should be stored for the update operation
        expect(cardsToUpdate[0].oldTags).toEqual(['test']);
        
        // No IDs should be marked for removal (card exists in Anki)
        expect((cardsService as any).idsToRemoveFromFile.size).toBe(0);
    });

    /**
     * Edge Case: Card appears multiple times in the file with the same ID
     * Expected: Only one instance should be processed, warning should be logged
     */
    it('should handle duplicate IDs within the same file', async () => {
        // Setup spy on console.warn
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
        
        // Two cards with the same ID (duplicate in file)
        const duplicateCard1 = new Flashcard(
            44444,
            'Default',
            'Duplicate Question 1',
            { 
                Front: '<p>Duplicate Question 1</p>', 
                Back: '<p>Answer 1</p>'
            },
            false,
            10,
            50,
            ['test'],
            true,
            [],
            false
        );
        
        const duplicateCard2 = new Flashcard(
            44444, // Same ID as first card
            'Default',
            'Duplicate Question 2',
            { 
                Front: '<p>Duplicate Question 2</p>', 
                Back: '<p>Answer 2</p>'
            },
            false,
            100,
            150,
            ['test'],
            true,
            [],
            false
        );
        
        // Mock Anki notes - ID exists but matches only the first card
        const ankiNotes = [
            { 
                noteId: 44444, 
                fields: { 
                    Front: { value: '<p>Duplicate Question 1</p>' },
                    Back: { value: '<p>Answer 1</p>' }
                },
                modelName: 'Obsidian-basic',
                tags: ['test']
            }
        ];
        
        // IDs found in the file - just one instance of the duplicated ID
        const ankiIDsInFile = [44444];
        
        // Call filterByUpdate to process the cards
        const [cardsToCreate, cardsToUpdate, cardsNotInAnki] = cardsService.filterByUpdate(
            ankiNotes,
            ankiNotes,
            [duplicateCard1, duplicateCard2],
            ankiIDsInFile,
            []
        );
        
        // Expectations
        
        // First card should match Anki and not be queued for anything
        expect(cardsToCreate.length).toBe(0);
        // The second card with the same ID should be queued for update
        expect(cardsToUpdate.length).toBe(1);
        // The card in the update queue should be the second card
        expect(cardsToUpdate[0].fields.Front).toBe('<p>Duplicate Question 2</p>');
        
        // Clean up
        warnSpy.mockRestore();
    });

    /**
     * Scenario: Edge case with mixture of card types (standard and cloze)
     * Expected: Different card types should be handled appropriately
     */
    it('should handle recreation of different card types correctly', async () => {
        // 1. Standard card with missing ID
        const standardCard = new Flashcard(
            55555, // ID missing from Anki
            'Default',
            'Standard Question',
            { 
                Front: '<p>Standard Question</p>', 
                Back: '<p>Standard Answer</p>' 
            },
            false,
            10,
            50,
            ['test'],
            true,
            [],
            false
        );
        
        // 2. Cloze card with missing ID
        const clozeCard = new Clozecard(
            66666, // ID missing from Anki
            'Default',
            'This is a {{c1::cloze deletion}} test',
            { 
                Text: '<p>This is a {{c1::cloze deletion}} test</p>', 
                Extra: '' 
            },
            false,
            100,
            150,
            ['test'],
            true,
            [],
            false
        );
        
        // Empty array for ankiNotesInDeck (simulating deleted deck in Anki)
        const ankiNotes: any[] = [];
        
        // IDs found in the file
        const ankiIDsInFile = [55555, 66666];
        
        // Call filterByUpdate to process the cards
        const [cardsToCreate, cardsToUpdate, cardsNotInAnki] = cardsService.filterByUpdate(
            ankiNotes,
            ankiNotes,
            [standardCard, clozeCard],
            ankiIDsInFile,
            []
        );
        
        // Expectations
        
        // Both cards should be queued for creation
        expect(cardsToCreate.length).toBe(2);
        
        // Cards should have their IDs reset to -1
        expect(cardsToCreate[0].id).toBe(-1);
        expect(cardsToCreate[1].id).toBe(-1);
        
        // Cards should be marked as not inserted
        expect(cardsToCreate[0].inserted).toBe(false);
        expect(cardsToCreate[1].inserted).toBe(false);
        
        // Original IDs should be marked for removal
        expect((cardsService as any).idsToRemoveFromFile.size).toBe(2);
        expect((cardsService as any).idsToRemoveFromFile.has(55555)).toBe(true);
        expect((cardsService as any).idsToRemoveFromFile.has(66666)).toBe(true);
        
        // Verify card types are preserved
        expect(cardsToCreate[0] instanceof Flashcard).toBe(true);
        expect(cardsToCreate[1] instanceof Clozecard).toBe(true);
    });
}); 