import { CardsService } from '../../src/services/cards';
import { Parser } from '../../src/services/parser';
import { Anki } from '../../src/services/anki';
import { TFile, Notice } from 'obsidian';
import { ISettings } from '../../src/conf/settings';
import { Regex } from '../../src/conf/regex';
import { noticeTimeout } from '../../src/conf/constants';

// Mocks
jest.mock('../../src/services/anki');
jest.mock('obsidian');
jest.mock('../../src/services/parser');
jest.mock('../../src/conf/regex');

// Handle the FileSystemAdapter mock differently
declare global {
    interface Window {
        FileSystemAdapter: any;
    }
}

describe('Notification System and YAML Frontmatter', () => {
    let cardsService: CardsService;
    let ankiService: jest.Mocked<Anki>;
    let parserService: jest.Mocked<Parser>;
    let mockApp: any;
    let mockSettings: ISettings;
    let mockRegex: jest.Mocked<Regex>;
    let mockFile: TFile;
    
    beforeEach(() => {
        // Clear all mocks
        jest.clearAllMocks();
        
        // Setup mocks
        ankiService = new Anki() as jest.Mocked<Anki>;
        ankiService.ping = jest.fn().mockResolvedValue(true);
        ankiService.createModels = jest.fn().mockResolvedValue({});
        ankiService.createDeck = jest.fn().mockResolvedValue({});
        ankiService.storeCodeHighlightMedias = jest.fn().mockResolvedValue({});
        ankiService.getNotesInDeck = jest.fn().mockResolvedValue([]);
        ankiService.getCards = jest.fn().mockResolvedValue([]);
        ankiService.cardsInfo = jest.fn().mockResolvedValue([]);
        ankiService.deleteCards = jest.fn().mockResolvedValue({});
        
        mockApp = {
            vault: {
                read: jest.fn().mockResolvedValue(''),
                modify: jest.fn().mockResolvedValue(undefined),
                getName: jest.fn().mockReturnValue('Test Vault'),
                adapter: {
                    instanceof: jest.fn().mockReturnValue(true)
                }
            },
            metadataCache: {
                getFileCache: jest.fn().mockReturnValue({ frontmatter: {} }),
                getFirstLinkpathDest: jest.fn()
            },
            fileManager: {
                processFrontMatter: jest.fn().mockImplementation((file, callback) => {
                    const frontmatter = {};
                    callback(frontmatter);
                    return true;
                })
            }
        };
        
        // Mock Regex
        mockRegex = new Regex({} as any) as jest.Mocked<Regex>;
        mockRegex.update = jest.fn();
        
        // Setup mock settings
        mockSettings = {
            contextAwareMode: true,
            sourceSupport: true,
            codeHighlightSupport: true,
            deck: 'Default',
            folderBasedDeck: false,
            flashcardsTag: "flashcard",
            inlineSeparator: "?",
            inlineSeparatorReverse: "??",
            defaultAnkiTag: "obsidian",
            ankiConnectPermission: true,
            contextSeparator: "##",
            embededImageSupport: true,
            pdfImageSupport: false,
            persistentIDs: false,
            overrideAnkiTags: false,
            mediaFolder: 'media',
            folder: "",
        } as unknown as ISettings;
        
        // Mock file
        mockFile = {
            path: 'test/path.md',
            basename: 'path',
            parent: {
                path: 'test'
            }
        } as unknown as TFile;
        
        // Initialize parser and service with minimal mocks
        parserService = {
            getAnkiIDsBlocks: jest.fn().mockReturnValue([]),
            generateFlashcards: jest.fn().mockReturnValue([]),
            getCardsToDelete: jest.fn().mockReturnValue([])
        } as unknown as jest.Mocked<Parser>;
        
        // Initialize service with mocks
        cardsService = new CardsService(mockApp, mockSettings);
        
        // Replace internal services with mocks
        (cardsService as any).anki = ankiService;
        (cardsService as any).parser = parserService;
        (cardsService as any).regex = mockRegex;
        
        // Mock methods directly on the service instead of using globals
        (cardsService as any).generateMediaLinks = jest.fn().mockResolvedValue({});
        (cardsService as any).insertMedias = jest.fn().mockResolvedValue({});
        (cardsService as any).deckNeedToBeChanged = jest.fn().mockResolvedValue(false);
        
        // Skip the updateFrontmatter method which is causing errors
        (cardsService as any).updateFrontmatter = jest.fn();
    });
    
    describe('YAML Frontmatter Detection', () => {
        it('should use deck name from frontmatter when available', async () => {
            // Setup frontmatter with cards-deck key
            mockApp.metadataCache.getFileCache.mockReturnValue({
                frontmatter: {
                    'cards-deck': 'Custom Deck'
                }
            });
            
            // Mock file content
            mockApp.vault.read.mockResolvedValue('---\ncards-deck: Custom Deck\n---\nSome content');
            
            // Execute the service
            await cardsService.execute(mockFile);
            
            // Verify the custom deck was created
            expect(ankiService.createDeck).toHaveBeenCalledWith('Custom Deck');
            
            // Verify no notification was shown for missing deck
            expect(Notice).not.toHaveBeenCalledWith(
                expect.stringContaining('missing the \'cards-deck\' key'),
                expect.any(Number)
            );
        });
        
        it('should show notification when frontmatter exists but cards-deck key is missing', async () => {
            // Setup frontmatter without cards-deck key
            mockApp.metadataCache.getFileCache.mockReturnValue({
                frontmatter: {
                    'tags': ['note', 'test']
                }
            });
            
            // Mock file content
            mockApp.vault.read.mockResolvedValue('---\ntags: [note, test]\n---\nSome content');
            
            // Execute the service
            await cardsService.execute(mockFile);
            
            // Verify the default deck was created
            expect(ankiService.createDeck).toHaveBeenCalledWith('Default');
            
            // Verify notification was shown for missing deck key
            expect(Notice).toHaveBeenCalledWith(
                expect.stringContaining('YAML frontmatter is missing the \'cards-deck\' key'),
                noticeTimeout * 2
            );
        });
        
        it('should use folder-based deck name when enabled and no frontmatter deck', async () => {
            // Setup settings with folder-based deck enabled
            mockSettings.folderBasedDeck = true;
            
            // Setup frontmatter without cards-deck key
            mockApp.metadataCache.getFileCache.mockReturnValue({
                frontmatter: {}
            });
            
            // Mock file content
            mockApp.vault.read.mockResolvedValue('Some content without frontmatter');
            
            // Execute the service
            await cardsService.execute(mockFile);
            
            // Verify the folder-based deck was created
            expect(ankiService.createDeck).toHaveBeenCalledWith('test');
            
            // Verify no notification was shown (since no frontmatter exists)
            expect(Notice).not.toHaveBeenCalledWith(
                expect.stringContaining('missing the \'cards-deck\' key'),
                expect.any(Number)
            );
        });
        
        it('should use default deck when no frontmatter and folder-based deck disabled', async () => {
            // Ensure folder-based deck is disabled
            mockSettings.folderBasedDeck = false;
            
            // Setup no frontmatter
            mockApp.metadataCache.getFileCache.mockReturnValue({
                frontmatter: null
            });
            
            // Mock file content
            mockApp.vault.read.mockResolvedValue('Some content without frontmatter');
            
            // Execute the service
            await cardsService.execute(mockFile);
            
            // Verify the default deck was created
            expect(ankiService.createDeck).toHaveBeenCalledWith('Default');
            
            // Verify no notification was shown (since no frontmatter exists)
            expect(Notice).not.toHaveBeenCalledWith(
                expect.stringContaining('missing the \'cards-deck\' key'),
                expect.any(Number)
            );
        });
    });
    
    describe('Notification System', () => {
        it('should return error notification when Anki is not running', async () => {
            // Setup Anki ping to fail
            ankiService.ping.mockRejectedValue(new Error('Connection refused'));
            
            // Execute the service
            const notifications = await cardsService.execute(mockFile);
            
            // Verify error message
            expect(notifications).toContain('Error: Anki must be open with AnkiConnect installed.');
            
            // Verify no other Anki operations were called
            expect(ankiService.createModels).not.toHaveBeenCalled();
            expect(ankiService.createDeck).not.toHaveBeenCalled();
        });
        
        it('should set the "Nothing to do" notification when no actions are performed', async () => {
            // Use Object.defineProperty to mock the notifications array directly on prototype level
            const originalNotifications = (cardsService as any).notifications;
            
            // Mock push to capture added notifications
            const pushedNotifications: string[] = [];
            Object.defineProperty(cardsService, 'notifications', {
                get: () => pushedNotifications,
                set: (value) => { /* Do nothing - prevent overwriting */ },
                configurable: true
            });
            
            // Extend the mock to also capture pushed items
            pushedNotifications.push = jest.fn((...items) => {
                for (const item of items) {
                    pushedNotifications[pushedNotifications.length] = item;
                }
                return pushedNotifications.length;
            }) as any;
            
            // Execute the service
            await cardsService.execute(mockFile);
            
            // Check if the "Nothing to do" notification was added
            expect(pushedNotifications.push).toHaveBeenCalledWith('Nothing to do. Everything is up to date');
            expect(pushedNotifications).toContain('Nothing to do. Everything is up to date');
            
            // Restore original notifications property
            Object.defineProperty(cardsService, 'notifications', {
                value: originalNotifications,
                configurable: true
            });
        });
        
        it('should show notification for deleted cards', async () => {
            // Directly test the deleteCardsFromAnkiOnly method
            // Mock the required dependencies
            ankiService.deleteCards.mockResolvedValueOnce({});
            
            // Call the method directly instead of through a spy
            await cardsService.deleteCardsFromAnkiOnly([123, 456]);
            
            // Verify the Notice was called with correct message
            expect(Notice).toHaveBeenCalledWith(
                'Deleted 2 card(s) from Anki: 123, 456.',
                noticeTimeout
            );
        });
        
        it('should show notification when no valid card IDs are provided for deletion', async () => {
            // Call the method with empty array
            await cardsService.deleteCardsFromAnkiOnly([]);
            
            // Verify the Notice was created with the correct message
            expect(Notice).toHaveBeenCalledWith(
                'No valid Anki card IDs provided for deletion.',
                noticeTimeout
            );
        });
        
        it('should show error notification when card deletion fails', async () => {
            // Setup Anki deleteCards to fail
            ankiService.deleteCards.mockRejectedValue(new Error('Delete failed'));
            
            // Call the method
            await cardsService.deleteCardsFromAnkiOnly([123]);
            
            // Verify the error Notice was created
            expect(Notice).toHaveBeenCalledWith(
                'Error: Could not delete cards [123] from Anki. Check AnkiConnect connection.',
                noticeTimeout
            );
        });
    });
}); 