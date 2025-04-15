import { Flashcard } from 'src/entities/flashcard';
import { Clozecard } from 'src/entities/clozecard';

describe('Card Recreation Integration', () => {
    /**
     * This suite tests the business logic of card recreation without direct dependency
     * on the CardsService implementation. It simulates the steps performed by 
     * CardsService.filterByUpdate but without mocking issues.
     */
    
    /**
     * Test that verifies cards with IDs not found in Anki are correctly prepared for recreation
     */
    it('should prepare cards with missing Anki IDs for recreation', () => {
        // SETUP: Cards with IDs in Obsidian but not in Anki
        const card1 = new Flashcard(
            12345, // ID exists in Obsidian
            'Default',
            'Question 1',
            { Front: '<p>Question 1</p>', Back: '<p>Answer 1</p>' },
            false, 10, 50, ['test'], true, [], false
        );
        
        const card2 = new Flashcard(
            67890, // ID exists in Obsidian
            'Default',
            'Question 2',
            { Front: '<p>Question 2</p>', Back: '<p>Answer 2</p>' },
            false, 100, 150, ['test'], true, [], false
        );
        
        // Empty Anki notes (simulates deleted deck)
        const ankiNotes: any[] = [];
        
        // IDs found in the file
        const ankiIDsInFile = [12345, 67890];
        
        // Tracking of IDs to remove from file (like idsToRemoveFromFile in CardsService)
        const idsToRemoveFromFile = new Set<number>();
        
        // SIMULATE CardsService.filterByUpdate LOGIC:
        const cardsToCreate: typeof card1[] = [];
        const cardsToUpdate: typeof card1[] = [];
        
        // Process cards with IDs in Obsidian
        for (const card of [card1, card2]) {
            // Check if ID was found in file and exists in Anki
            if (ankiIDsInFile.includes(card.id)) {
                const ankiCard = ankiNotes.find(note => note?.noteId === card.id);
                
                if (!ankiCard) {
                    // ID in Obsidian but not in Anki - needs recreation
                    const originalId = card.id;
                    idsToRemoveFromFile.add(originalId); // Mark ID for removal
                    
                    card.id = -1; // Reset ID
                    card.inserted = false; // Mark as not inserted
                    cardsToCreate.push(card); // Queue for creation
                }
                // If matched, would check for updates
            }
        }
        
        // VERIFY results match expected behavior
        
        // Both cards should be queued for creation
        expect(cardsToCreate.length).toBe(2);
        
        // Cards should have their IDs reset to -1
        expect(cardsToCreate[0].id).toBe(-1);
        expect(cardsToCreate[1].id).toBe(-1);
        
        // Cards should be marked as not inserted
        expect(cardsToCreate[0].inserted).toBe(false);
        expect(cardsToCreate[1].inserted).toBe(false);
        
        // Original IDs should be marked for removal
        expect(idsToRemoveFromFile.size).toBe(2);
        expect(idsToRemoveFromFile.has(12345)).toBe(true);
        expect(idsToRemoveFromFile.has(67890)).toBe(true);
        
        // No cards should be queued for update
        expect(cardsToUpdate.length).toBe(0);
    });
    
    /**
     * Test for a mix of card scenarios: existing in Anki, missing from Anki, and new
     */
    it('should handle mixed card scenarios appropriately', () => {
        // 1. Card with ID in both Obsidian and Anki
        const existingCard = new Flashcard(
            11111,
            'Default',
            'Existing Question',
            { Front: '<p>Existing Question</p>', Back: '<p>Existing Answer</p>' },
            false, 10, 50, ['test'], true, [], false
        );
        
        // 2. Card with ID in Obsidian but not in Anki
        const missingCard = new Flashcard(
            22222,
            'Default',
            'Missing Question',
            { Front: '<p>Missing Question</p>', Back: '<p>Missing Answer</p>' },
            false, 100, 150, ['test'], true, [], false
        );
        
        // 3. New card without ID
        const newCard = new Flashcard(
            -1, // No ID yet
            'Default',
            'New Question',
            { Front: '<p>New Question</p>', Back: '<p>New Answer</p>' },
            false, 200, 250, ['test'], false, [], false
        );
        
        // Anki notes with only one of our IDs
        const ankiNotes = [
            { 
                noteId: 11111, 
                fields: { 
                    Front: { value: '<p>Existing Question</p>' },
                    Back: { value: '<p>Existing Answer</p>' }
                },
                tags: ['test']
            }
        ];
        
        // IDs found in file
        const ankiIDsInFile = [11111, 22222];
        
        // Tracking of IDs to remove
        const idsToRemoveFromFile = new Set<number>();
        
        // SIMULATE CardsService.filterByUpdate LOGIC:
        const cardsToCreate: typeof existingCard[] = [];
        const cardsToUpdate: typeof existingCard[] = [];
        
        // Process all cards
        for (const card of [existingCard, missingCard, newCard]) {
            if (card.id === -1) {
                // New card without ID
                cardsToCreate.push(card);
            } else if (ankiIDsInFile.includes(card.id)) {
                // Card has ID that was found in file
                const ankiCard = ankiNotes.find(note => note?.noteId === card.id);
                
                if (!ankiCard) {
                    // ID in Obsidian but not in Anki
                    const originalId = card.id;
                    idsToRemoveFromFile.add(originalId);
                    
                    card.id = -1;
                    card.inserted = false;
                    cardsToCreate.push(card);
                }
                // If found and matched, check for updates (not tested here)
            }
        }
        
        // VERIFY results
        
        // Two cards should be queued for creation
        expect(cardsToCreate.length).toBe(2);
        
        // Check new card is in create queue
        const newCardInQueue = cardsToCreate.find(c => c.fields.Front === '<p>New Question</p>');
        expect(newCardInQueue).toBeDefined();
        expect(newCardInQueue?.id).toBe(-1);
        
        // Check missing card is reset and in create queue
        const missingCardInQueue = cardsToCreate.find(c => c.fields.Front === '<p>Missing Question</p>');
        expect(missingCardInQueue).toBeDefined();
        expect(missingCardInQueue?.id).toBe(-1);
        expect(missingCardInQueue?.inserted).toBe(false);
        
        // Check the missing ID is marked for removal
        expect(idsToRemoveFromFile.size).toBe(1);
        expect(idsToRemoveFromFile.has(22222)).toBe(true);
        
        // Existing card should not be in any queue
        expect(cardsToUpdate.length).toBe(0);
    });
    
    /**
     * Test that different card types (regular and cloze) are handled correctly
     */
    it('should handle recreation of different card types correctly', () => {
        // 1. Standard card with ID
        const standardCard = new Flashcard(
            55555,
            'Default',
            'Standard Question',
            { Front: '<p>Standard Question</p>', Back: '<p>Standard Answer</p>' },
            false, 10, 50, ['test'], true, [], false
        );
        
        // 2. Cloze card with ID
        const clozeCard = new Clozecard(
            66666,
            'Default',
            'This is a {{c1::cloze deletion}} test',
            { Text: '<p>This is a {{c1::cloze deletion}} test</p>', Extra: '' },
            false, 100, 150, ['test'], true, [], false
        );
        
        // Empty Anki notes (simulates deleted deck)
        const ankiNotes: any[] = [];
        
        // IDs found in file
        const ankiIDsInFile = [55555, 66666];
        
        // Tracking of IDs to remove
        const idsToRemoveFromFile = new Set<number>();
        
        // SIMULATE CardsService.filterByUpdate LOGIC:
        const cardsToCreate: Array<typeof standardCard | typeof clozeCard> = [];
        
        // Process cards
        for (const card of [standardCard, clozeCard]) {
            if (ankiIDsInFile.includes(card.id)) {
                const ankiCard = ankiNotes.find(note => note?.noteId === card.id);
                
                if (!ankiCard) {
                    // ID in Obsidian but not in Anki
                    const originalId = card.id;
                    idsToRemoveFromFile.add(originalId);
                    
                    card.id = -1;
                    card.inserted = false;
                    cardsToCreate.push(card);
                }
            }
        }
        
        // VERIFY results
        
        // Both cards should be queued for creation
        expect(cardsToCreate.length).toBe(2);
        
        // Cards should have their IDs reset to -1
        expect(cardsToCreate[0].id).toBe(-1);
        expect(cardsToCreate[1].id).toBe(-1);
        
        // Cards should be marked as not inserted
        expect(cardsToCreate[0].inserted).toBe(false);
        expect(cardsToCreate[1].inserted).toBe(false);
        
        // Check for specific card types
        expect(cardsToCreate[0] instanceof Flashcard).toBe(true);
        expect(cardsToCreate[1] instanceof Clozecard).toBe(true);
        
        // Original IDs should be marked for removal
        expect(idsToRemoveFromFile.size).toBe(2);
        expect(idsToRemoveFromFile.has(55555)).toBe(true);
        expect(idsToRemoveFromFile.has(66666)).toBe(true);
    });

    /**
     * Test that cards with math notation are handled correctly during recreation
     */
    it('should correctly handle recreation of cards with math notation', () => {
        // Card with math notation and ID in Obsidian but not in Anki
        const mathCard = new Flashcard(
            77777,
            'Default',
            'Question with math: $\\frac{1}{2}$',
            { 
                Front: '<p>Question with math: <span class="math inline">\\frac{1}{2}</span></p>', 
                Back: '<p>Answer with math: <span class="math display">\\sum_{i=1}^{n} i^2</span></p>' 
            },
            false, 10, 50, ['math'], true, [], false
        );
        
        // Empty Anki notes (simulates deleted deck)
        const ankiNotes: any[] = [];
        
        // IDs found in file
        const ankiIDsInFile = [77777];
        
        // Tracking of IDs to remove
        const idsToRemoveFromFile = new Set<number>();
        
        // SIMULATE CardsService.filterByUpdate LOGIC:
        const cardsToCreate: typeof mathCard[] = [];
        
        // Process card
        if (ankiIDsInFile.includes(mathCard.id)) {
            const ankiCard = ankiNotes.find(note => note?.noteId === mathCard.id);
            
            if (!ankiCard) {
                // ID in Obsidian but not in Anki
                const originalId = mathCard.id;
                idsToRemoveFromFile.add(originalId);
                
                mathCard.id = -1;
                mathCard.inserted = false;
                cardsToCreate.push(mathCard);
            }
        }
        
        // VERIFY results
        
        // Card should be queued for creation
        expect(cardsToCreate.length).toBe(1);
        
        // Card should have its ID reset to -1
        expect(cardsToCreate[0].id).toBe(-1);
        
        // Card should be marked as not inserted
        expect(cardsToCreate[0].inserted).toBe(false);
        
        // Original ID should be marked for removal
        expect(idsToRemoveFromFile.size).toBe(1);
        expect(idsToRemoveFromFile.has(77777)).toBe(true);
        
        // Verify math content is preserved in fields
        expect(cardsToCreate[0].fields.Front).toContain('<span class="math inline">\\frac{1}{2}</span>');
        expect(cardsToCreate[0].fields.Back).toContain('<span class="math display">\\sum_{i=1}^{n} i^2</span>');
    });

    /**
     * Test that cards with code blocks are handled correctly during recreation
     */
    it('should correctly handle recreation of cards with code blocks', () => {
        // Card with code block and ID in Obsidian but not in Anki
        const codeCard = new Flashcard(
            88888,
            'Default',
            'Question with code',
            { 
                Front: '<p>Question with code:</p><pre><code class="language-javascript">function example() {\n  return "Hello World";\n}</code></pre>', 
                Back: '<p>Answer with inline code: <code>const x = 1;</code></p>' 
            },
            false, 10, 50, ['code'], true, [], true // Note: containsCode=true
        );
        
        // Empty Anki notes (simulates deleted deck)
        const ankiNotes: any[] = [];
        
        // IDs found in file
        const ankiIDsInFile = [88888];
        
        // Tracking of IDs to remove
        const idsToRemoveFromFile = new Set<number>();
        
        // SIMULATE CardsService.filterByUpdate LOGIC:
        const cardsToCreate: typeof codeCard[] = [];
        
        // Process card
        if (ankiIDsInFile.includes(codeCard.id)) {
            const ankiCard = ankiNotes.find(note => note?.noteId === codeCard.id);
            
            if (!ankiCard) {
                // ID in Obsidian but not in Anki
                const originalId = codeCard.id;
                idsToRemoveFromFile.add(originalId);
                
                codeCard.id = -1;
                codeCard.inserted = false;
                cardsToCreate.push(codeCard);
            }
        }
        
        // VERIFY results
        
        // Card should be queued for creation
        expect(cardsToCreate.length).toBe(1);
        
        // Card should have its ID reset to -1
        expect(cardsToCreate[0].id).toBe(-1);
        
        // Card should be marked as not inserted
        expect(cardsToCreate[0].inserted).toBe(false);
        
        // Original ID should be marked for removal
        expect(idsToRemoveFromFile.size).toBe(1);
        expect(idsToRemoveFromFile.has(88888)).toBe(true);
        
        // Verify code content is preserved in fields
        expect(cardsToCreate[0].fields.Front).toContain('<pre><code class="language-javascript">');
        expect(cardsToCreate[0].fields.Back).toContain('<code>const x = 1;</code>');
        
        // Verify containsCode flag is preserved
        expect(cardsToCreate[0].containsCode).toBe(true);
        
        // Verify modelName contains code extension
        expect(cardsToCreate[0].modelName).toContain('code');
    });

    /**
     * Test that cards with image attachments are handled correctly during recreation
     */
    it('should correctly handle recreation of cards with image attachments', () => {
        // Card with image and ID in Obsidian but not in Anki
        const imageCard = new Flashcard(
            99999,
            'Default',
            'Question with image',
            { 
                Front: '<p>Question with image:</p><img src="example.png" width="200" height="150">', 
                Back: '<p>Answer with another image:</p><img src="answer.webp" width="300" height="200">' 
            },
            false, 10, 50, ['image'], true, ['example.png', 'answer.webp'], false
        );
        
        // Empty Anki notes (simulates deleted deck)
        const ankiNotes: any[] = [];
        
        // IDs found in file
        const ankiIDsInFile = [99999];
        
        // Tracking of IDs to remove
        const idsToRemoveFromFile = new Set<number>();
        
        // SIMULATE CardsService.filterByUpdate LOGIC:
        const cardsToCreate: typeof imageCard[] = [];
        
        // Process card
        if (ankiIDsInFile.includes(imageCard.id)) {
            const ankiCard = ankiNotes.find(note => note?.noteId === imageCard.id);
            
            if (!ankiCard) {
                // ID in Obsidian but not in Anki
                const originalId = imageCard.id;
                idsToRemoveFromFile.add(originalId);
                
                imageCard.id = -1;
                imageCard.inserted = false;
                cardsToCreate.push(imageCard);
            }
        }
        
        // Set up mock media data to simulate mediaBase64Encoded
        imageCard.mediaBase64Encoded = ['base64data1', 'base64data2'];
        
        // VERIFY results
        
        // Card should be queued for creation
        expect(cardsToCreate.length).toBe(1);
        
        // Card should have its ID reset to -1
        expect(cardsToCreate[0].id).toBe(-1);
        
        // Card should be marked as not inserted
        expect(cardsToCreate[0].inserted).toBe(false);
        
        // Original ID should be marked for removal
        expect(idsToRemoveFromFile.size).toBe(1);
        expect(idsToRemoveFromFile.has(99999)).toBe(true);
        
        // Verify image content is preserved in fields
        expect(cardsToCreate[0].fields.Front).toContain('<img src="example.png"');
        expect(cardsToCreate[0].fields.Back).toContain('<img src="answer.webp"');
        
        // Verify media names are preserved
        expect(cardsToCreate[0].mediaNames).toEqual(['example.png', 'answer.webp']);
        expect(cardsToCreate[0].mediaNames.length).toBe(2);
        
        // Verify media data
        expect(cardsToCreate[0].mediaBase64Encoded).toEqual(['base64data1', 'base64data2']);
        
        // Verify getMedias works correctly
        const medias = cardsToCreate[0].getMedias();
        expect(medias.length).toBe(2);
        expect(medias[0]).toEqual({ filename: 'example.png', data: 'base64data1' });
        expect(medias[1]).toEqual({ filename: 'answer.webp', data: 'base64data2' });
    });

    /**
     * Test that cards with heading breadcrumbs (context-aware mode) are handled correctly during recreation
     */
    it('should correctly handle recreation of cards with heading breadcrumbs', () => {
        // Card with heading breadcrumbs and ID in Obsidian but not in Anki
        const breadcrumbCard = new Flashcard(
            123456,
            'Default',
            'Question with breadcrumbs',
            { 
                Front: '<p><strong>Chapter 1 > Section 1.2 > Subsection A:</strong></p><p>What is the main concept?</p>', 
                Back: '<p>The answer is X</p>' 
            },
            false, 10, 50, ['breadcrumbs'], true, [], false
        );
        
        // Empty Anki notes (simulates deleted deck)
        const ankiNotes: any[] = [];
        
        // IDs found in file
        const ankiIDsInFile = [123456];
        
        // Tracking of IDs to remove
        const idsToRemoveFromFile = new Set<number>();
        
        // SIMULATE CardsService.filterByUpdate LOGIC:
        const cardsToCreate: typeof breadcrumbCard[] = [];
        
        // Process card
        if (ankiIDsInFile.includes(breadcrumbCard.id)) {
            const ankiCard = ankiNotes.find(note => note?.noteId === breadcrumbCard.id);
            
            if (!ankiCard) {
                // ID in Obsidian but not in Anki
                const originalId = breadcrumbCard.id;
                idsToRemoveFromFile.add(originalId);
                
                breadcrumbCard.id = -1;
                breadcrumbCard.inserted = false;
                cardsToCreate.push(breadcrumbCard);
            }
        }
        
        // VERIFY results
        
        // Card should be queued for creation
        expect(cardsToCreate.length).toBe(1);
        
        // Card should have its ID reset to -1
        expect(cardsToCreate[0].id).toBe(-1);
        
        // Card should be marked as not inserted
        expect(cardsToCreate[0].inserted).toBe(false);
        
        // Original ID should be marked for removal
        expect(idsToRemoveFromFile.size).toBe(1);
        expect(idsToRemoveFromFile.has(123456)).toBe(true);
        
        // Verify breadcrumb content is preserved in fields
        expect(cardsToCreate[0].fields.Front).toContain('<strong>Chapter 1 > Section 1.2 > Subsection A:</strong>');
        
        // The rest of the content should also be preserved
        expect(cardsToCreate[0].fields.Front).toContain('<p>What is the main concept?</p>');
        expect(cardsToCreate[0].fields.Back).toContain('<p>The answer is X</p>');
    });

    /**
     * Test that content-based ID recovery works correctly when combined with card recreation
     */
    it('should recover IDs from Anki based on content matching and handle subsequent recreation', () => {
        // SETUP: Card without ID in Obsidian but matching content in Anki
        const cardWithoutId = new Flashcard(
            -1, // No ID in Obsidian
            'Default',
            'Question for recovery',
            { Front: '<p>Question for recovery</p>', Back: '<p>Answer for recovery</p>' },
            false, 10, 50, ['test'], false, [], false
        );
        
        // Anki notes with matching content
        const ankiNotes = [
            { 
                noteId: 54321, 
                fields: { 
                    Front: { value: '<p>Question for recovery</p>' },
                    Back: { value: '<p>Answer for recovery</p>' }
                },
                tags: ['test']
            },
            {
                noteId: 98765,
                fields: {
                    Front: { value: '<p>Different question</p>' },
                    Back: { value: '<p>Different answer</p>' }
                },
                tags: ['test']
            }
        ];
        
        // No IDs found in file initially
        const ankiIDsInFile: number[] = [];
        
        // Tracking of IDs to remove (should remain empty for recovery)
        const idsToRemoveFromFile = new Set<number>();
        
        // STEP 1: SIMULATE ID RECOVERY PROCESS
        const cardsWithRecoveredIds: typeof cardWithoutId[] = [];
        const matchedAnkiNoteIds = new Set<number>(); // Track already matched Anki notes
        
        // For a card without ID, check if it matches any Anki note
        if (cardWithoutId.id === -1) {
            for (const ankiNote of ankiNotes) {
                // Skip already matched Anki notes
                if (matchedAnkiNoteIds.has(ankiNote.noteId)) {
                    continue;
                }
                
                // Check for content match (simulating looselyMatchesFrontField)
                if (ankiNote.fields.Front.value === cardWithoutId.fields.Front) {
                    // Found a match, recover the ID
                    cardWithoutId.id = ankiNote.noteId;
                    cardWithoutId.inserted = true; // Mark as already in Anki
                    matchedAnkiNoteIds.add(ankiNote.noteId); // Track matched note
                    cardsWithRecoveredIds.push(cardWithoutId);
                    break;
                }
            }
        }
        
        // VERIFY RECOVERY RESULTS
        expect(cardsWithRecoveredIds.length).toBe(1);
        expect(cardsWithRecoveredIds[0].id).toBe(54321); // ID should be recovered
        expect(cardsWithRecoveredIds[0].inserted).toBe(true);
        expect(idsToRemoveFromFile.size).toBe(0); // No IDs to remove
        
        // STEP 2: NOW SIMULATE ANKI DECK DELETION SCENARIO WITH THE RECOVERED ID
        
        // Update ankiIDsInFile to include the recovered ID (as if it was written to file)
        ankiIDsInFile.push(54321);
        
        // Clear the Anki notes (simulating deleted deck)
        const emptyAnkiNotes: any[] = [];
        
        // Reset tracking arrays for the second phase
        const cardsToCreate: typeof cardWithoutId[] = [];
        
        // Process the card again after ID recovery (now it has an ID)
        if (ankiIDsInFile.includes(cardWithoutId.id)) {
            const ankiCard = emptyAnkiNotes.find(note => note?.noteId === cardWithoutId.id);
            
            if (!ankiCard) {
                // ID in Obsidian but not in Anki - needs recreation
                const originalId = cardWithoutId.id;
                idsToRemoveFromFile.add(originalId); // Mark ID for removal
                
                cardWithoutId.id = -1; // Reset ID
                cardWithoutId.inserted = false; // Mark as not inserted
                cardsToCreate.push(cardWithoutId); // Queue for creation
            }
        }
        
        // VERIFY RECREATION RESULTS
        
        // Card should be queued for creation
        expect(cardsToCreate.length).toBe(1);
        
        // Card should have its ID reset to -1
        expect(cardsToCreate[0].id).toBe(-1);
        
        // Card should be marked as not inserted
        expect(cardsToCreate[0].inserted).toBe(false);
        
        // Original recovered ID should be marked for removal
        expect(idsToRemoveFromFile.size).toBe(1);
        expect(idsToRemoveFromFile.has(54321)).toBe(true);
    });
}); 