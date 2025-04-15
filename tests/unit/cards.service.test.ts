import { CardsService } from '../../src/services/cards';
import { Parser } from '../../src/services/parser';
import { Flashcard } from '../../src/entities/flashcard';
import { Anki } from '../../src/services/anki';
import { TFile } from 'obsidian';
import { ISettings } from '../../src/conf/settings';
import { Card } from '../../src/entities/card';
import { Regex } from '../../src/conf/regex';

// Mocks
jest.mock('../../src/services/anki');
jest.mock('obsidian');
jest.mock('../../src/services/parser');
jest.mock('../../src/conf/regex');

describe('CardsService', () => {
    let cardsService: CardsService;
    let ankiService: jest.Mocked<Anki>;
    let parserService: jest.Mocked<Parser>;
    let mockApp: any;
    let mockSettings: ISettings;
    let mockRegex: jest.Mocked<Regex>;
    
    beforeEach(() => {
        // Setup mocks
        ankiService = new Anki() as jest.Mocked<Anki>;
        mockApp = {
            vault: {
                read: jest.fn().mockResolvedValue(''),
                modify: jest.fn().mockResolvedValue(undefined),
                adapter: {
                    instanceof: jest.fn().mockReturnValue(true)
                }
            },
            metadataCache: {
                getFileCache: jest.fn().mockReturnValue({ frontmatter: {} }),
                getFirstLinkpathDest: jest.fn()
            }
        };
        
        // Mock Regex
        mockRegex = new Regex({} as any) as jest.Mocked<Regex>;
        mockRegex.update = jest.fn();
        
        // Setup mock settings with all required properties
        mockSettings = {
            contextAwareMode: true,
            sourceSupport: true,
            codeHighlightSupport: true,
            inlineID: true,
            contextSeparator: "##",
            deck: 'Default',
            folderBasedDeck: false,
            flashcardsTag: "flashcard",
            inlineSeparator: "?",
            inlineSeparatorReverse: "??",
            defaultAnkiTag: "obsidian",
            ankiConnectPermission: true,
            // Additional properties used in the app but not in ISettings interface
            defaultCardType: 'basic',
            tagsInFrontmatter: true,
            frontmatterKeys: { tags: 'tags' },
            embededImageSupport: true,
            pdfImageSupport: false,
            persistentIDs: false,
            overrideAnkiTags: false,
            mediaFolder: 'media',
            ankiConnectUrl: 'http://localhost:8765',
            fieldTemplates: {},
            regexps: {}
        } as unknown as ISettings;
        
        // Initialize parser and service
        parserService = {} as jest.Mocked<Parser>;
        parserService.getAnkiIDsBlocks = jest.fn();
        parserService.generateFlashcards = jest.fn();
        parserService.getCardsToDelete = jest.fn().mockReturnValue([]);
        
        // Initialize service with mocks
        cardsService = new CardsService(mockApp, mockSettings);
        
        // Replace internal services with mocks
        (cardsService as any).anki = ankiService;
        (cardsService as any).parser = parserService;
        (cardsService as any).regex = mockRegex;
    });
    
    describe('Content-Based ID Recovery', () => {
        it('should recover IDs for cards with matching content in Anki', async () => {
            // Setup: File with a card that has no ID but matches content in Anki
            const file = { path: 'test.md' } as TFile;
            const fileContent = '# Test\n\nQuestion without ID\n?\nAnswer text';
            
            // Mock existing cards in Anki with specific content
            const ankiNotes: Array<{
                noteId: number;
                fields: { [key: string]: { value: string } };
                modelName: string;
                tags: string[];
            }> = [
                { 
                    noteId: 12345, 
                    fields: { 
                        Front: { value: '<p>Question without ID</p>' },
                        Back: { value: '<p>Answer text</p>' }
                    },
                    modelName: 'Obsidian-basic',
                    tags: ['test']
                }
            ];
            
            // Mock file content
            (cardsService as any).file = fileContent;
            
            // Mock Anki service to return our test notes
            ankiService.getCards.mockResolvedValue(ankiNotes);
            
            // Create a test card without ID that matches Anki content
            const parsedCard = new Flashcard(
                -1, // No ID
                'Default',
                'Question without ID\n?\nAnswer text',
                { 
                    Front: '<p>Question without ID</p>', 
                    Back: '<p>Answer text</p>' 
                },
                false,
                10, // Some offset values
                50,
                ['test'],
                false,
                [],
                false
            );
            
            // Call the filterByUpdate method directly with our test data
            const result = cardsService.filterByUpdate(
                ankiNotes,
                ankiNotes,
                [parsedCard],
                [] // No IDs in file initially
            );
            
            // Verify ID was recovered and card was updated
            expect(parsedCard.id).toBe(12345);
            expect(parsedCard.inserted).toBe(true);
            
            // Verify updateFile flag is set
            expect((cardsService as any).updateFile).toBe(true);
            
            // Check if we have no cards to create since it was matched
            expect(result[0].length).toBe(0);
        });
        
        it('should not modify cards that already have IDs', async () => {
            // Setup: File with a card that already has an ID
            const file = { path: 'test.md' } as TFile;
            const fileContent = '# Test\n\nQuestion with ID <!-- ankiID: 67890 -->\n?\nAnswer text';
            
            // Initialize updateFile to false
            (cardsService as any).updateFile = false;
            
            // Mock existing cards in Anki
            const ankiNotes: Array<{
                noteId: number;
                fields: { [key: string]: { value: string } };
                modelName: string;
                tags: string[];
            }> = [
                { 
                    noteId: 67890, 
                    fields: { 
                        Front: { value: '<p>Question with ID</p>' },
                        Back: { value: '<p>Answer text</p>' }
                    },
                    modelName: 'Obsidian-basic',
                    tags: ['test']
                }
            ];
            
            // Mock file content
            (cardsService as any).file = fileContent;
            
            // Create a test card with an existing ID
            const parsedCard = new Flashcard(
                67890, // Existing ID
                'Default',
                'Question with ID <!-- ankiID: 67890 -->\n?\nAnswer text',
                { 
                    Front: '<p>Question with ID</p>', 
                    Back: '<p>Answer text</p>' 
                },
                false,
                10,
                80,
                ['test'],
                true, // Already inserted
                [],
                false
            );
            
            // Call the filterByUpdate method directly with our test data
            const result = cardsService.filterByUpdate(
                ankiNotes,
                ankiNotes,
                [parsedCard],
                [67890] // ID already found in file
            );
            
            // Verify ID remained the same
            expect(parsedCard.id).toBe(67890);
            
            // The updateFile flag should not be set
            expect((cardsService as any).updateFile).toBe(false);
            
            // No cards to create or update
            expect(result[0].length).toBe(0); // cardsToCreate
            expect(result[1].length).toBe(0); // cardsToUpdate
        });
        
        it('should handle cards with no matching content in Anki', async () => {
            // Setup: File with a card that has no match in Anki
            const file = { path: 'test.md' } as TFile;
            const fileContent = '# Test\n\nUnique Question\n?\nUnique Answer';
            
            // Initialize updateFile to false
            (cardsService as any).updateFile = false;
            
            // Mock empty Anki notes
            const ankiNotes: Array<{
                noteId: number;
                fields: { [key: string]: { value: string } };
                modelName: string;
                tags: string[];
            }> = [];
            
            // Mock file content
            (cardsService as any).file = fileContent;
            
            // Create a test card without ID and no match in Anki
            const parsedCard = new Flashcard(
                -1, // No ID
                'Default',
                'Unique Question\n?\nUnique Answer',
                { 
                    Front: '<p>Unique Question</p>', 
                    Back: '<p>Unique Answer</p>' 
                },
                false,
                10,
                50,
                [],
                false,
                [],
                false
            );
            
            // Call the filterByUpdate method directly with our test data
            const result = cardsService.filterByUpdate(
                ankiNotes,
                ankiNotes,
                [parsedCard],
                [] // No IDs in file
            );
            
            // Card should remain without an ID
            expect(parsedCard.id).toBe(-1);
            
            // Card should be in the cardsToCreate array
            expect(result[0].length).toBe(1);
            expect(result[0][0]).toBe(parsedCard);
        });
    });
}); 