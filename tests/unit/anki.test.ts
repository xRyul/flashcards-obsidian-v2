import { Anki } from '../../src/services/anki';
import { Card } from '../../src/entities/card';
import { Flashcard } from '../../src/entities/flashcard';
import { 
    CreateModelParams, 
    AnkiCardInfo, 
    AnkiNote, 
    AnkiNoteInfo, 
    AnkiStoreMediaResult, 
    AnkiPermissionResponse, 
    AnkiMultiPayload,
    UpdateNoteFieldsAction,
    ClearNotesTagsAction,
    AddTagsAction,
    AnkiCreateDeckPayload,
    AnkiStoreMediaMultiPayload,
    StoreMediaAction,
    AnkiRetrieveMediaPayload,
    AnkiChangeDeckPayload,
    AnkiDeleteNotesPayload,
    AnkiFindNotesPayload,
    AnkiNotesInfoPayload,
    AnkiRequestPermissionPayload
} from '../../src/types/anki';

// Define a class for our mock XMLHttpRequest
class MockXHR {
  open = jest.fn();
  send = jest.fn();
  addEventListener = jest.fn();
  responseText = '';
  loadCallback: ((this: XMLHttpRequest, ev: Event) => any) | null = null;
  errorCallback: ((this: XMLHttpRequest, ev: Event) => any) | null = null;
  
  constructor() {
    this.addEventListener = jest.fn((event: string, callback: EventListenerOrEventListenerObject | null) => {
      if (event === 'load' && typeof callback === 'function') {
        this.loadCallback = callback as (this: XMLHttpRequest, ev: Event) => any;
      } else if (event === 'error' && typeof callback === 'function') {
        this.errorCallback = callback as (this: XMLHttpRequest, ev: Event) => any;
      }
    });
  }
  
  // Helper method to trigger the load callback with the current responseText
  triggerLoad(): void {
    if (this.loadCallback) {
      this.loadCallback.call({} as XMLHttpRequest, {} as Event);
    }
  }
  
  // Helper method to trigger the error callback
  triggerError(): void {
    if (this.errorCallback) {
      this.errorCallback.call({} as XMLHttpRequest, {} as Event);
    }
  }
}

// Before all tests, mock the global XMLHttpRequest
beforeAll(() => {
  // Save original
  const originalXHR = global.XMLHttpRequest;
  
  // Mock it for tests
  global.XMLHttpRequest = jest.fn().mockImplementation(() => {
    return new MockXHR();
  }) as unknown as typeof XMLHttpRequest;
  
  // Save for cleanup
  (global as any)._originalXHR = originalXHR;
});

// Restore original XMLHttpRequest after tests
afterAll(() => {
  global.XMLHttpRequest = (global as any)._originalXHR;
});

describe('Anki Service', () => {
  let anki: Anki;
  let mockXHR: MockXHR;
  
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    
    // Create a new instance of the mock
    mockXHR = new MockXHR();
    
    // Replace the implementation
    (global.XMLHttpRequest as unknown as jest.Mock).mockImplementation(() => mockXHR);
    
    // Create a new Anki service instance
    anki = new Anki();
  });
  
  describe('addCards', () => {
    it('should handle network errors when adding cards', async () => {
      // Setup test cards
      const cards = [
        new Flashcard(
          -1,
          'Test Deck',
          'Test Question\n?\nTest Answer',
          { Front: 'Test Question', Back: 'Test Answer' },
          false,
          0,
          0,
          ['test'],
          false,
          [],
          false
        )
      ];
      
      // Mock the send method to trigger the error callback
      mockXHR.send.mockImplementation(() => {
        mockXHR.triggerError();
      });
      
      // Expect the addCards method to throw an error
      await expect(anki.addCards(cards)).rejects.toEqual('failed to issue request');
      
      // Verify that the correct request was attempted
      expect(mockXHR.open).toHaveBeenCalledWith('POST', 'http://127.0.0.1:8765');
      expect(mockXHR.send).toHaveBeenCalled();
      
      // The cards should not have been modified
      expect(cards[0].id).toBe(-1);
    });
    
    it('should handle Anki API errors when adding cards', async () => {
      // Setup test cards
      const cards = [
        new Flashcard(
          -1,
          'Test Deck',
          'Test Question\n?\nTest Answer',
          { Front: 'Test Question', Back: 'Test Answer' },
          false,
          0,
          0,
          ['test'],
          false,
          [],
          false
        )
      ];
      
      // Mock the send method to trigger the load callback with an error response
      mockXHR.send.mockImplementation(() => {
        mockXHR.responseText = JSON.stringify({
          result: null,
          error: 'Anki connect error: model not found'
        });
        mockXHR.triggerLoad();
      });
      
      // Expect the addCards method to throw the specific Anki error
      await expect(anki.addCards(cards)).rejects.toEqual('Anki connect error: model not found');
      
      // The cards should not have been modified
      expect(cards[0].id).toBe(-1);
    });
    
    it('should handle malformed JSON responses', async () => {
      // Setup test cards
      const cards = [
        new Flashcard(
          -1,
          'Test Deck',
          'Test Question\n?\nTest Answer',
          { Front: 'Test Question', Back: 'Test Answer' },
          false,
          0,
          0,
          ['test'],
          false,
          [],
          false
        )
      ];
      
      // Mock the send method to trigger the load callback with a malformed response
      mockXHR.send.mockImplementation(() => {
        mockXHR.responseText = '{malformed:json}';
        mockXHR.triggerLoad();
      });
      
      // Expect the addCards method to throw a JSON parsing error
      await expect(anki.addCards(cards)).rejects.toBeTruthy();
      
      // The cards should not have been modified
      expect(cards[0].id).toBe(-1);
    });
    
    it('should handle unexpected response structure', async () => {
      // Setup test cards
      const cards = [
        new Flashcard(
          -1,
          'Test Deck',
          'Test Question\n?\nTest Answer',
          { Front: 'Test Question', Back: 'Test Answer' },
          false,
          0,
          0,
          ['test'],
          false,
          [],
          false
        )
      ];
      
      // Mock the send method to trigger the load callback with an incomplete response
      mockXHR.send.mockImplementation(() => {
        // Missing required fields
        mockXHR.responseText = JSON.stringify({
          someOtherField: true
        });
        mockXHR.triggerLoad();
      });
      
      // Expect the addCards method to throw about unexpected response structure
      await expect(anki.addCards(cards)).rejects.toEqual('response has an unexpected number of fields');
      
      // The cards should not have been modified
      expect(cards[0].id).toBe(-1);
    });
    
    it('should handle successful card creation and update card IDs', async () => {
      // Setup test cards
      const cards = [
        new Flashcard(
          -1,
          'Test Deck',
          'Test Question 1\n?\nTest Answer 1',
          { Front: 'Test Question 1', Back: 'Test Answer 1' },
          false,
          0,
          0,
          ['test'],
          false,
          [],
          false
        ),
        new Flashcard(
          -1,
          'Test Deck',
          'Test Question 2\n?\nTest Answer 2',
          { Front: 'Test Question 2', Back: 'Test Answer 2' },
          false,
          0,
          0,
          ['test'],
          false,
          [],
          false
        )
      ];
      
      // Mock the send method to trigger the load callback with a successful response
      mockXHR.send.mockImplementation(() => {
        // Successful response with IDs for the created cards
        mockXHR.responseText = JSON.stringify({
          result: [12345, 67890],
          error: null
        });
        mockXHR.triggerLoad();
      });
      
      // Call the addCards method
      const result = await anki.addCards(cards);
      
      // Verify the result contains the expected IDs
      expect(result).toEqual([12345, 67890]);
      
      // Verify the cards have been updated with the new IDs
      expect(cards[0].id).toBe(12345);
      expect(cards[1].id).toBe(67890);
    });
    
    it('should handle partially successful card creation (some null IDs)', async () => {
      // Setup test cards
      const cards = [
        new Flashcard(
          -1,
          'Test Deck',
          'Test Question 1\n?\nTest Answer 1',
          { Front: 'Test Question 1', Back: 'Test Answer 1' },
          false,
          0,
          0,
          ['test'],
          false,
          [],
          false
        ),
        new Flashcard(
          -1,
          'Test Deck',
          'Test Question 2\n?\nTest Answer 2',
          { Front: 'Test Question 2', Back: 'Test Answer 2' },
          false,
          0,
          0,
          ['test'],
          false,
          [],
          false
        )
      ];
      
      // Mock the send method to trigger the load callback with a partially successful response
      mockXHR.send.mockImplementation(() => {
        // Partially successful response (second card failed)
        mockXHR.responseText = JSON.stringify({
          result: [12345, null],
          error: null
        });
        mockXHR.triggerLoad();
      });
      
      // Call the addCards method
      const result = await anki.addCards(cards);
      
      // Verify the result contains the expected IDs
      expect(result).toEqual([12345, null]);
      
      // Verify only the successful card has been updated
      expect(cards[0].id).toBe(12345);
      expect(cards[1].id).toBe(-1); // Should remain unchanged
    });
  });
  
  describe('updateCards', () => {
    it('should handle errors when verifying notes existence', async () => {
      // Setup a test card with an ID
      const cards = [
        new Flashcard(
          12345,
          'Test Deck',
          'Test Question\n?\nTest Answer',
          { Front: 'Test Question', Back: 'Test Answer' },
          false,
          0,
          0,
          ['test'],
          true,
          [],
          false
        )
      ];
      
      let callCount = 0;
      mockXHR.send.mockImplementation(() => {
        callCount++;
        // First call (notesInfo) fails
        if (callCount === 1) {
          mockXHR.responseText = JSON.stringify({
            result: null,
            error: 'Failed to get note info'
          });
        }
        mockXHR.triggerLoad();
      });
      
      // Call updateCards
      await anki.updateCards(cards);
      
      // Verify that we attempted to get note info
      expect(mockXHR.send).toHaveBeenCalledTimes(1);
      
      // The error should be logged but not thrown (per updateCards implementation)
      // We can't easily test console.error in Jest, but we can verify no actions were added
    });
    
    it('should handle note not found in Anki', async () => {
      // Setup a test card with an ID
      const cards = [
        new Flashcard(
          12345,
          'Test Deck',
          'Test Question\n?\nTest Answer',
          { Front: 'Test Question', Back: 'Test Answer' },
          false,
          0,
          0,
          ['test'],
          true,
          [],
          false
        )
      ];
      
      let callCount = 0;
      mockXHR.send.mockImplementation(() => {
        callCount++;
        // Note info returns empty array (note not found)
        if (callCount === 1) {
          mockXHR.responseText = JSON.stringify({
            result: [],
            error: null
          });
        }
        mockXHR.triggerLoad();
      });
      
      // Call updateCards
      await anki.updateCards(cards);
      
      // Verify that we attempted to get note info
      expect(mockXHR.send).toHaveBeenCalledTimes(1);
      
      // No update actions should be triggered
    });
    
    it('should handle errors during multi-action update', async () => {
      // Setup a test card with an ID
      const cards = [
        new Flashcard(
          12345,
          'Test Deck',
          'Test Question\n?\nTest Answer',
          { Front: 'Test Question', Back: 'Test Answer' },
          false,
          0,
          0,
          ['test'],
          true,
          [],
          false
        )
      ];
      
      let callCount = 0;
      mockXHR.send.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call (notesInfo) succeeds
          mockXHR.responseText = JSON.stringify({
            result: [{id: 12345, fields: {}, tags: []}],
            error: null
          });
        } else if (callCount === 2) {
          // Second call (multi action) fails
          mockXHR.responseText = JSON.stringify({
            result: null,
            error: 'Failed to update notes'
          });
        }
        mockXHR.triggerLoad();
      });
      
      // Expect updateCards to throw the error from the multi action
      await expect(anki.updateCards(cards)).rejects.toEqual('Failed to update notes');
      
      // Verify that we made both calls
      expect(mockXHR.send).toHaveBeenCalledTimes(2);
    });

    it('should successfully update fields and tags', async () => {
      // Setup a test card needing updates
      const cards = [
        new Flashcard(
          12345,
          'Test Deck',
          'Updated Question\n?\nUpdated Answer',
          { Front: 'Updated Question', Back: 'Updated Answer' },
          false,
          0,
          0,
          ['updated-tag'], // New tag
          true,
          [],
          false
        )
      ];

      let callCount = 0;
      mockXHR.send.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call (notesInfo) succeeds - mock existing note data
          mockXHR.responseText = JSON.stringify({
            result: [
              {
                noteId: 12345,
                tags: ['old-tag'], // Existing tag to be cleared
                fields: {
                  Front: { value: 'Old Question', order: 0 },
                  Back: { value: 'Old Answer', order: 1 }
                },
                modelName: 'Obsidian-basic',
                cards: [11111] // Example card ID
              }
            ],
            error: null
          });
        } else if (callCount === 2) {
          // Second call (multi action) succeeds - should return array of nulls
          // Actions: updateNoteFields, clearNotesTags, addTags
          mockXHR.responseText = JSON.stringify({
            result: [null, null, null],
            error: null
          });
        }
        mockXHR.triggerLoad();
      });

      // Call updateCards
      const result = await anki.updateCards(cards);

      // Verify that we made both calls
      expect(mockXHR.send).toHaveBeenCalledTimes(2);

      // Verify the payload of the multi action
      const multiPayload = JSON.parse(mockXHR.send.mock.calls[1][0]) as AnkiMultiPayload;
      expect(multiPayload.action).toBe('multi');
      expect(multiPayload.params.actions.length).toBe(3);

      // Check action 1: updateNoteFields
      expect(multiPayload.params.actions[0].action).toBe('updateNoteFields');
      expect((multiPayload.params.actions[0] as UpdateNoteFieldsAction).params.note.id).toBe(12345);
      expect((multiPayload.params.actions[0] as UpdateNoteFieldsAction).params.note.fields).toEqual({ Front: 'Updated Question', Back: 'Updated Answer' });

      // Check action 2: clearNotesTags
      expect(multiPayload.params.actions[1].action).toBe('clearNotesTags');
      expect((multiPayload.params.actions[1] as ClearNotesTagsAction).params.notes).toEqual([12345]);

      // Check action 3: addTags
      expect(multiPayload.params.actions[2].action).toBe('addTags');
      expect((multiPayload.params.actions[2] as AddTagsAction).params.notes).toEqual([12345]);
      expect((multiPayload.params.actions[2] as AddTagsAction).params.tags).toBe('updated-tag');

      // Verify the final result
      expect(result).toEqual([null, null, null]);
    });

    it('should successfully update only fields when tags are unchanged', async () => {
      // Setup a test card needing only field updates
      const cards = [
        new Flashcard(
          54321,
          'Test Deck',
          'Updated Field Question\n?\nUpdated Field Answer',
          { Front: 'Updated Field Question', Back: 'Updated Field Answer' },
          false, 0, 0, ['same-tag'], true, [], false
        )
      ];

      let callCount = 0;
      mockXHR.send.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // notesInfo succeeds - note has same tag
          mockXHR.responseText = JSON.stringify({
            result: [{
              noteId: 54321,
              tags: ['same-tag'],
              fields: { Front: { value: 'Old Field Question' }, Back: { value: 'Old Field Answer' } },
              modelName: 'Obsidian-basic', cards: [22222]
            }], error: null
          });
        } else if (callCount === 2) {
          // multi action succeeds - only updateNoteFields called
          mockXHR.responseText = JSON.stringify({ result: [null], error: null });
        }
        mockXHR.triggerLoad();
      });

      const result = await anki.updateCards(cards);
      expect(mockXHR.send).toHaveBeenCalledTimes(2);
      const multiPayload = JSON.parse(mockXHR.send.mock.calls[1][0]) as AnkiMultiPayload;
      expect(multiPayload.action).toBe('multi');
      expect(multiPayload.params.actions.length).toBe(1); // Only one action
      expect(multiPayload.params.actions[0].action).toBe('updateNoteFields');
      expect((multiPayload.params.actions[0] as UpdateNoteFieldsAction).params.note.id).toBe(54321);
      expect((multiPayload.params.actions[0] as UpdateNoteFieldsAction).params.note.fields).toEqual({ Front: 'Updated Field Question', Back: 'Updated Field Answer' });
      expect(result).toEqual([null]);
    });

    it('should successfully update only tags when fields are unchanged', async () => {
      // Setup a test card needing only tag updates
      const cards = [
        new Flashcard(
          98765,
          'Test Deck',
          'Same Field Question\n?\nSame Field Answer',
          { Front: 'Same Field Question', Back: 'Same Field Answer' },
          false, 0, 0, ['new-tag-only'], true, [], false
        )
      ];

      let callCount = 0;
      mockXHR.send.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // notesInfo succeeds - note has same fields, different tag
          mockXHR.responseText = JSON.stringify({
            result: [{
              noteId: 98765,
              tags: ['old-tag-only'],
              fields: { Front: { value: 'Same Field Question' }, Back: { value: 'Same Field Answer' } },
              modelName: 'Obsidian-basic', cards: [33333]
            }], error: null
          });
        } else if (callCount === 2) {
          // multi action succeeds - clearNotesTags, addTags called
          mockXHR.responseText = JSON.stringify({ result: [null, null], error: null });
        }
        mockXHR.triggerLoad();
      });

      const result = await anki.updateCards(cards);
      expect(mockXHR.send).toHaveBeenCalledTimes(2);
      const multiPayload = JSON.parse(mockXHR.send.mock.calls[1][0]) as AnkiMultiPayload;
      expect(multiPayload.action).toBe('multi');
      expect(multiPayload.params.actions.length).toBe(2);
      expect(multiPayload.params.actions[0].action).toBe('clearNotesTags');
      expect(multiPayload.params.actions[1].action).toBe('addTags');
      expect((multiPayload.params.actions[1] as AddTagsAction).params.tags).toBe('new-tag-only');
      expect(result).toEqual([null, null]);
    });

    it('should return empty object when no updates are needed', async () => {
        // Setup a test card that matches Anki
        const cards = [
          new Flashcard(
            11223,
            'Test Deck',
            'No Change Question\n?\nNo Change Answer',
            { Front: 'No Change Question', Back: 'No Change Answer' },
            false, 0, 0, ['no-change-tag'], true, [], false
          )
        ];
  
        mockXHR.send.mockImplementation(() => {
          // notesInfo succeeds - note matches exactly
          mockXHR.responseText = JSON.stringify({
            result: [{
              noteId: 11223,
              tags: ['no-change-tag'],
              fields: { Front: { value: 'No Change Question' }, Back: { value: 'No Change Answer' } },
              modelName: 'Obsidian-basic', cards: [44444]
            }], error: null
          });
          mockXHR.triggerLoad();
        });
  
        const result = await anki.updateCards(cards);
        expect(mockXHR.send).toHaveBeenCalledTimes(1); // Only notesInfo called
        expect(result).toEqual({}); // Should return empty object
      });

    it('should return empty object when no cards are provided', async () => {
        const result = await anki.updateCards([]);
        expect(mockXHR.send).not.toHaveBeenCalled();
        expect(result).toEqual({});
      });

  });
  
  describe('ping', () => {
    it('should return true when Anki is available', async () => {
      // Mock the send method for successful ping
      mockXHR.send.mockImplementation(() => {
        mockXHR.responseText = JSON.stringify({
          result: 6,
          error: null
        });
        mockXHR.triggerLoad();
      });
      
      // Call ping
      const result = await anki.ping();
      
      // Verify the result is true
      expect(result).toBe(true);
    });
    
    it('should return false when Anki returns wrong version', async () => {
      // Mock the send method for successful ping but wrong version
      mockXHR.send.mockImplementation(() => {
        mockXHR.responseText = JSON.stringify({
          result: 5, // Different version
          error: null
        });
        mockXHR.triggerLoad();
      });
      
      // Call ping
      const result = await anki.ping();
      
      // Verify the result is false
      expect(result).toBe(false);
    });
    
    it('should throw an error when Anki is not available', async () => {
      // Mock the send method to trigger error
      mockXHR.send.mockImplementation(() => {
        mockXHR.triggerError();
      });
      
      // Expect ping to throw
      await expect(anki.ping()).rejects.toEqual('failed to issue request');
    });
  });
  
  describe('getNotesInDeck', () => {
    it('should handle empty deck gracefully', async () => {
      let callCount = 0;
      mockXHR.send.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // findNotes returns empty array
          mockXHR.responseText = JSON.stringify({
            result: [],
            error: null
          });
        }
        mockXHR.triggerLoad();
      });
      
      // Call getNotesInDeck
      const result = await anki.getNotesInDeck('Test Deck');
      
      // Verify we get an empty array, not an error
      expect(result).toEqual([]);
      expect(mockXHR.send).toHaveBeenCalledTimes(1);
    });
    
    it('should fetch all notes in a deck', async () => {
      let callCount = 0;
      mockXHR.send.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // findNotes returns IDs
          mockXHR.responseText = JSON.stringify({
            result: [12345, 67890],
            error: null
          });
        } else if (callCount === 2) {
          // notesInfo returns note details
          mockXHR.responseText = JSON.stringify({
            result: [
              {
                noteId: 12345,
                fields: {
                  Front: { value: 'Question 1' },
                  Back: { value: 'Answer 1' }
                },
                tags: ['test']
              },
              {
                noteId: 67890,
                fields: {
                  Front: { value: 'Question 2' },
                  Back: { value: 'Answer 2' }
                },
                tags: ['test']
              }
            ],
            error: null
          });
        }
        mockXHR.triggerLoad();
      });
      
      // Call getNotesInDeck
      const result = await anki.getNotesInDeck('Test Deck');
      
      // Verify we get the expected notes
      expect(result.length).toBe(2);
      expect(result[0].noteId).toBe(12345);
      expect(result[1].noteId).toBe(67890);
      expect(mockXHR.send).toHaveBeenCalledTimes(2);
    });
    
    it('should handle errors when finding notes', async () => {
      // Mock the send method for error response
      mockXHR.send.mockImplementation(() => {
        // findNotes returns error
        mockXHR.responseText = JSON.stringify({
          result: null,
          error: 'Invalid deck name'
        });
        mockXHR.triggerLoad();
      });
      
      // Expect getNotesInDeck to throw
      await expect(anki.getNotesInDeck('Invalid Deck')).rejects.toEqual('Invalid deck name');
    });
  });

  describe('createModels', () => {
    // Helper to create mock model parameters
    const mockModelParams = (
      name: string,
      isCloze: boolean = false
    ): CreateModelParams => ({
      modelName: name,
      inOrderFields: isCloze ? ['Text', 'Extra'] : ['Front', 'Back'],
      css: 'some css',
      isCloze: isCloze,
      cardTemplates: [
        {
          Name: 'Card 1',
          Front: isCloze ? '{{cloze:Text}}' : '{{Front}}',
          Back: isCloze ? '{{cloze:Text}}{{Extra}}' : '{{FrontSide}}<hr>{{Back}}',
        },
      ],
    });

    it('should resolve successfully when models are created without error', async () => {
      // Mock the invoke method to return a successful response for multi
      // Assumes invoke is called internally by createModels
      const invokeSpy = jest.spyOn(anki as any, 'invoke').mockResolvedValue([null, null]);

      await expect(anki.createModels(true, true)).resolves.toBeUndefined();

      // Verify invoke was called correctly (with 'multi' and 'createModel' actions)
      expect(invokeSpy).toHaveBeenCalledWith(
        'multi',
        6,
        expect.objectContaining({
          actions: expect.arrayContaining([
            expect.objectContaining({ action: 'createModel' }),
            expect.objectContaining({ action: 'createModel' }),
            expect.objectContaining({ action: 'createModel' }),
            expect.objectContaining({ action: 'createModel' }),
            expect.objectContaining({ action: 'createModel' }),
            expect.objectContaining({ action: 'createModel' })
          ])
        })
      );
      
      invokeSpy.mockRestore();
    });

    it('should reject if the multi invoke call fails (network error)', async () => {
      const invokeSpy = jest.spyOn(anki as any, 'invoke').mockRejectedValue('Network Error');

      await expect(anki.createModels(true, true)).rejects.toEqual('Network Error');

      expect(invokeSpy).toHaveBeenCalled();
      invokeSpy.mockRestore();
    });

    it('should reject if the multi invoke call returns an Anki error object', async () => {
      const invokeSpy = jest.spyOn(anki as any, 'invoke').mockResolvedValue({ error: 'Anki Busy' }); // Simulate error object instead of result array

      // Depending on invoke implementation, this might reject or throw within createModels
      // Let's assume it rejects the promise returned by createModels
      // Updated expectation to match the thrown error string
      await expect(anki.createModels(true, true)).rejects.toEqual('Anki Busy');

      expect(invokeSpy).toHaveBeenCalled();
      invokeSpy.mockRestore();
    });

    it('should reject if the multi invoke call result contains an error for any model', async () => {
      const invokeSpy = jest.spyOn(anki as any, 'invoke').mockResolvedValue([
        null, // Model 1 OK
        { error: 'Model 2 failed' }, // Model 2 Error
        null, // Model 3 OK
        null,
        null,
        null
      ]);

      // Expect rejection if any part of the multi action failed
      await expect(anki.createModels(true, true)).rejects.toEqual({ error: 'Model 2 failed' });

      expect(invokeSpy).toHaveBeenCalled();
      invokeSpy.mockRestore();
    });

  });
  
  describe('createDeck', () => {
    it('should create a deck successfully', async () => {
      // Mock the send method to return a successful response
      mockXHR.send.mockImplementation(() => {
        mockXHR.responseText = JSON.stringify({
          result: 12345, // Deck ID
          error: null
        });
        mockXHR.triggerLoad();
      });
      
      // Call createDeck
      const result = await anki.createDeck('Test Deck');
      
      // Verify the request
      expect(mockXHR.open).toHaveBeenCalledWith('POST', 'http://127.0.0.1:8765');
      
      // Verify the payload
      const payload = JSON.parse(mockXHR.send.mock.calls[0][0]) as AnkiCreateDeckPayload;
      expect(payload.action).toBe('createDeck');
      expect(payload.params.deck).toBe('Test Deck');
      
      // Verify the result
      expect(result).toBe(12345);
    });
    
    it('should handle error when creating a deck', async () => {
      // Mock the send method to return an error response
      mockXHR.send.mockImplementation(() => {
        mockXHR.responseText = JSON.stringify({
          result: null,
          error: 'Failed to create deck'
        });
        mockXHR.triggerLoad();
      });
      
      // Expect an error when calling createDeck
      await expect(anki.createDeck('Test Deck')).rejects.toEqual('Failed to create deck');
      
      // Verify payload was still sent correctly
      const payload = JSON.parse(mockXHR.send.mock.calls[0][0]) as AnkiCreateDeckPayload;
      expect(payload.action).toBe('createDeck');
      expect(payload.params.deck).toBe('Test Deck');
    });
  });
  
  describe('storeMediaFiles', () => {
    let mockCard: Card;

    beforeEach(() => {
      // Provide all 11 arguments for Flashcard constructor
      // id, deckName, initialContent, fields, inserted, positionStart, positionEnd, tags, containsCode, mediaNames, reversed
      mockCard = new Flashcard(
        -1,               // id
        'deck',           // deckName
        'Q',              // initialContent (can be minimal for this test)
        { Front: 'Q', Back: 'A' }, // fields
        false,            // inserted
        0,                // positionStart
        1,                // positionEnd
        ['tag'],          // tags
        false,            // containsCode
        ['image.jpg', 'sound.mp3'], // mediaNames (match getMedias mock below)
        false             // reversed
      ); 
      jest.spyOn(mockCard, 'getMedias').mockReturnValue([
        { filename: 'image.jpg', data: 'base64data1' },
        { filename: 'sound.mp3', data: 'base64data2' },
      ]);
    });

    test('should send correct multi action and return typed result on success', async () => {
      const expectedActions = [
        { action: 'storeMediaFile', params: { filename: 'image.jpg', data: 'base64data1' } },
        { action: 'storeMediaFile', params: { filename: 'sound.mp3', data: 'base64data2' } },
      ];
      const mockAnkiResponse: AnkiStoreMediaResult = [null, null]; 
      
      mockXHR.send.mockImplementationOnce(() => {
        mockXHR.responseText = JSON.stringify({ result: mockAnkiResponse, error: null });
        mockXHR.triggerLoad(); 
      });

      const resultPromise = anki.storeMediaFiles([mockCard]);
      await Promise.resolve(); 
      const result = await resultPromise;

      expect(mockXHR.send).toHaveBeenCalledTimes(1);
      const requestBody = JSON.parse(mockXHR.send.mock.calls[0][0]) as AnkiStoreMediaMultiPayload; 
      expect(requestBody.action).toBe('multi');
      expect(requestBody.params.actions).toEqual(expectedActions);
      expect(result).toEqual(mockAnkiResponse); // Failing assertion (TDD)
    });

    test('should return empty object if no media files', async () => {
      jest.spyOn(mockCard, 'getMedias').mockReturnValue([]);
      const result = await anki.storeMediaFiles([mockCard]);
      expect(mockXHR.send).not.toHaveBeenCalled(); 
      expect(result).toEqual({}); // Should pass
    });

    test('should handle AnkiConnect error during multi call', async () => {
      const errorMsg = 'Failed to store media'; // Expected error message
      
      mockXHR.send.mockImplementationOnce(() => {
        // Trigger error without argument
        mockXHR.triggerError(); 
      });

      const resultPromise = anki.storeMediaFiles([mockCard]);
      await Promise.resolve(); 

      // Check rejection - Anki invoke usually rejects with the specific error string from response or "failed to issue request"
      // Adjusting expectation based on invoke logic
      await expect(resultPromise).rejects.toBe('failed to issue request'); 
      expect(mockXHR.send).toHaveBeenCalledTimes(1);
    });
    
    test('should handle partial success/errors in multi response', async () => {
      const mockAnkiResponse: AnkiStoreMediaResult = [null, 'Error storing sound.mp3']; 
      
      mockXHR.send.mockImplementationOnce(() => {
        mockXHR.responseText = JSON.stringify({ result: mockAnkiResponse, error: null });
        mockXHR.triggerLoad(); 
      });

      const resultPromise = anki.storeMediaFiles([mockCard]);
      await Promise.resolve();
      const result = await resultPromise;

      expect(mockXHR.send).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockAnkiResponse); // Failing assertion (TDD)
    });
  });
  
  describe('storeCodeHighlightMedias', () => {
    test('should send multi action if highlight file does not exist', async () => {
      // Mock retrieveMediaFile call (file doesn't exist -> returns null)
      mockXHR.send.mockImplementationOnce(() => {
        mockXHR.responseText = JSON.stringify({ result: null, error: null });
        mockXHR.triggerLoad();
      });
      
      // Mock multi call for storing files (success -> returns array of nulls)
      const mockMultiResponse: AnkiStoreMediaResult = [null, null, null];
       mockXHR.send.mockImplementationOnce(() => {
        mockXHR.responseText = JSON.stringify({ result: mockMultiResponse, error: null });
        mockXHR.triggerLoad();
      });

      const resultPromise = anki.storeCodeHighlightMedias();
      await Promise.resolve(); // After retrieve call
      await Promise.resolve(); // After multi call
      const result = await resultPromise;

      expect(mockXHR.send).toHaveBeenCalledTimes(2); 
      
      const firstRequestBody = JSON.parse(mockXHR.send.mock.calls[0][0]) as AnkiRetrieveMediaPayload;
      expect(firstRequestBody.action).toBe('retrieveMediaFile');
      expect(firstRequestBody.params.filename).toBe('_highlightInit.js');

      const secondRequestBody = JSON.parse(mockXHR.send.mock.calls[1][0]) as AnkiStoreMediaMultiPayload;
      expect(secondRequestBody.action).toBe('multi');
      expect(secondRequestBody.params.actions).toHaveLength(3);
      expect(secondRequestBody.params.actions[0].action).toBe('storeMediaFile');
      expect(secondRequestBody.params.actions[0].params.filename).toBe('_highlight.js');

      expect(result).toEqual(mockMultiResponse); // Failing assertion (TDD)
    });

    test('should do nothing and return void if highlight file exists', async () => {
       mockXHR.send.mockImplementationOnce(() => {
          mockXHR.responseText = JSON.stringify({ result: 'some_base64_data', error: null });
          mockXHR.triggerLoad();
       });

      const resultPromise = anki.storeCodeHighlightMedias();
      await Promise.resolve(); 
      const result = await resultPromise;

      expect(mockXHR.send).toHaveBeenCalledTimes(1); 
      const requestBody = JSON.parse(mockXHR.send.mock.calls[0][0]) as AnkiRetrieveMediaPayload;
      expect(requestBody.action).toBe('retrieveMediaFile');
      expect(result).toBeUndefined(); // Should pass
    });

    test('should handle error during retrieveMediaFile call', async () => {
       mockXHR.send.mockImplementationOnce(() => {
          // Trigger error without argument
          mockXHR.triggerError(); 
       });

      const resultPromise = anki.storeCodeHighlightMedias();
      await Promise.resolve();

      // Check rejection reason based on invoke logic
      await expect(resultPromise).rejects.toBe('failed to issue request');
      expect(mockXHR.send).toHaveBeenCalledTimes(1);
    });
    
    test('should handle error during multi call for storing files', async () => {
       // Mock retrieveMediaFile call (file doesn't exist)
       mockXHR.send.mockImplementationOnce(() => {
          mockXHR.responseText = JSON.stringify({ result: null, error: null });
          mockXHR.triggerLoad();
       });
       
      // Mock multi call failure
       mockXHR.send.mockImplementationOnce(() => {
          // Trigger error without argument
          mockXHR.triggerError();
       });

       const resultPromise = anki.storeCodeHighlightMedias();
       await Promise.resolve(); // After retrieve
       await Promise.resolve(); // After multi error

       // Check rejection reason
      await expect(resultPromise).rejects.toBe('failed to issue request');
      expect(mockXHR.send).toHaveBeenCalledTimes(2); 
    });
  });
  
  describe('changeDeck', () => {
    it('should change cards to a different deck successfully and return null', async () => {
      const cardIdsToChange = [12345, 67890];
      const targetDeck = 'New Deck';

      // Mock the send method to return a successful response (result: null)
      mockXHR.send.mockImplementation(() => {
        mockXHR.responseText = JSON.stringify({
          result: null, // changeDeck returns null on success
          error: null
        });
        mockXHR.triggerLoad();
      });

      // Call changeDeck - THIS IS THE TDD STEP: Expecting Promise<null>
      const result = await anki.changeDeck(cardIdsToChange, targetDeck);

      // Verify the request
      expect(mockXHR.open).toHaveBeenCalledWith('POST', 'http://127.0.0.1:8765');

      // Verify the payload
      const payload = JSON.parse(mockXHR.send.mock.calls[0][0]) as AnkiChangeDeckPayload;
      expect(payload.action).toBe('changeDeck');
      expect(payload.params.cards).toEqual(cardIdsToChange);
      expect(payload.params.deck).toBe(targetDeck);

      // Verify the result type and value
      expect(result).toBeNull(); // Asserting null based on common AnkiConnect pattern
    });

    it('should handle error when changing decks', async () => {
      const cardIdsToChange = [12345];
      const targetDeck = 'New Deck';
      const errorMsg = 'Failed to change deck';

      // Mock the send method to return an error response
      mockXHR.send.mockImplementation(() => {
        mockXHR.responseText = JSON.stringify({
          result: null,
          error: errorMsg
        });
        mockXHR.triggerLoad();
      });

      // Expect an error when calling changeDeck
      await expect(anki.changeDeck(cardIdsToChange, targetDeck)).rejects.toEqual(errorMsg);

       // Verify the request payload was still sent correctly
       const payload = JSON.parse(mockXHR.send.mock.calls[0][0]) as AnkiChangeDeckPayload;
       expect(payload.action).toBe('changeDeck');
       expect(payload.params.cards).toEqual(cardIdsToChange);
       expect(payload.params.deck).toBe(targetDeck);
    });

    // Add test for network error
    it('should handle network error when changing decks', async () => {
        const cardIdsToChange = [12345];
        const targetDeck = 'New Deck';
  
        // Mock the send method to trigger the error callback
        mockXHR.send.mockImplementation(() => {
          mockXHR.triggerError();
        });
  
        // Expect the method to throw the generic network error
        await expect(anki.changeDeck(cardIdsToChange, targetDeck)).rejects.toEqual('failed to issue request');
  
        // Verify that the correct request was attempted
        expect(mockXHR.open).toHaveBeenCalledWith('POST', 'http://127.0.0.1:8765');
        expect(mockXHR.send).toHaveBeenCalled();
        const payload = JSON.parse(mockXHR.send.mock.calls[0][0]) as AnkiChangeDeckPayload;
        expect(payload.action).toBe('changeDeck');
        expect(payload.params.cards).toEqual(cardIdsToChange);
        expect(payload.params.deck).toBe(targetDeck);
      });
  });
  
  describe('cardsInfo', () => {
    const cardIds = [12345, 67890];
    const mockCardInfoResponse: AnkiCardInfo[] = [
      {
        answer: 'Answer 1',
        question: 'Question 1',
        deckName: 'Test Deck',
        modelName: 'Basic',
        fieldOrder: 0,
        fields: {
          Front: { value: 'Question 1', order: 0 },
          Back: { value: 'Answer 1', order: 1 },
        },
        cardId: 12345,
        note: 11111,
        tags: ['tag1'],
      },
      {
        answer: 'Answer 2',
        question: 'Question 2',
        deckName: 'Test Deck',
        modelName: 'Basic',
        fieldOrder: 0,
        fields: {
          Front: { value: 'Question 2', order: 0 },
          Back: { value: 'Answer 2', order: 1 },
        },
        cardId: 67890,
        note: 22222,
        tags: ['tag2'],
      },
    ];

    it('should return card information successfully', async () => {
      // Mock the send method to trigger the load callback with a successful response
      mockXHR.send.mockImplementation(() => {
        mockXHR.responseText = JSON.stringify({
          result: mockCardInfoResponse,
          error: null,
        });
        mockXHR.triggerLoad();
      });

      const result = await anki.cardsInfo(cardIds);

      // Verify the result matches the expected type and data
      expect(result).toEqual(mockCardInfoResponse);

      // Verify the correct AnkiConnect action was called
      expect(mockXHR.open).toHaveBeenCalledWith('POST', 'http://127.0.0.1:8765');
      expect(mockXHR.send).toHaveBeenCalledWith(
        JSON.stringify({
          action: 'cardsInfo',
          version: 6,
          params: { cards: cardIds },
        })
      );
    });

    it('should handle Anki API errors when fetching card info', async () => {
      const errorMessage = 'Anki connect error: invalid card ids';
      // Mock the send method to trigger the load callback with an error response
      mockXHR.send.mockImplementation(() => {
        mockXHR.responseText = JSON.stringify({
          result: null,
          error: errorMessage,
        });
        mockXHR.triggerLoad();
      });

      // Expect the cardsInfo method to throw the specific Anki error
      await expect(anki.cardsInfo(cardIds)).rejects.toEqual(errorMessage);

      // Verify the correct AnkiConnect action was attempted
      expect(mockXHR.send).toHaveBeenCalledWith(
        JSON.stringify({
          action: 'cardsInfo',
          version: 6,
          params: { cards: cardIds },
        })
      );
    });

    it('should handle network errors when fetching card info', async () => {
      // Mock the send method to trigger the error callback
      mockXHR.send.mockImplementation(() => {
        mockXHR.triggerError();
      });

      // Expect the cardsInfo method to throw a network error
      await expect(anki.cardsInfo(cardIds)).rejects.toEqual('failed to issue request');

      // Verify the correct AnkiConnect action was attempted
      expect(mockXHR.send).toHaveBeenCalledWith(
        JSON.stringify({
          action: 'cardsInfo',
          version: 6,
          params: { cards: cardIds },
        })
      );
    });
  });
  
  describe('deleteCards', () => {
    it('should delete cards successfully', async () => {
      const cardIdsToDelete = [12345, 67890];
      
      // Mock the send method to return a successful response (deleteNotes returns null)
      mockXHR.send.mockImplementation(() => {
        mockXHR.responseText = JSON.stringify({
          result: null,
          error: null
        });
        mockXHR.triggerLoad();
      });
      
      // Call deleteCards
      await anki.deleteCards(cardIdsToDelete);
      
      // Verify the request
      expect(mockXHR.open).toHaveBeenCalledWith('POST', 'http://127.0.0.1:8765');
      
      // Verify the payload
      const payload = JSON.parse(mockXHR.send.mock.calls[0][0]) as AnkiDeleteNotesPayload;
      expect(payload.action).toBe('deleteNotes');
      expect(payload.params.notes).toEqual(cardIdsToDelete);
      
      // No explicit return value check needed as deleteNotes returns null
    });
    
    it('should handle error when deleting cards', async () => {
      const cardIdsToDelete = [12345, 67890];
      
      // Mock the send method to return an error response
      mockXHR.send.mockImplementation(() => {
        mockXHR.responseText = JSON.stringify({
          result: null,
          error: 'Failed to delete notes'
        });
        mockXHR.triggerLoad();
      });
      
      // Expect an error when calling deleteCards
      await expect(anki.deleteCards(cardIdsToDelete)).rejects.toEqual('Failed to delete notes');
      
      // Verify payload was still sent correctly
      const payload = JSON.parse(mockXHR.send.mock.calls[0][0]) as AnkiDeleteNotesPayload;
      expect(payload.action).toBe('deleteNotes');
      expect(payload.params.notes).toEqual(cardIdsToDelete);
    });
  });
  
  describe('findNotes and getNotesInDeck', () => {
    it('should find notes matching a query', async () => {
      // Mock the send method to return note IDs
      mockXHR.send.mockImplementation(() => {
        mockXHR.responseText = JSON.stringify({
          result: [12345, 67890],
          error: null
        });
        mockXHR.triggerLoad();
      });
      
      // Call findNotes
      const result = await anki.findNotes('deck:Test');
      
      // Verify the request
      expect(mockXHR.open).toHaveBeenCalledWith('POST', 'http://127.0.0.1:8765');
      
      // Verify the payload
      const payload = JSON.parse(mockXHR.send.mock.calls[0][0]) as AnkiFindNotesPayload;
      expect(payload.action).toBe('findNotes');
      expect(payload.params.query).toBe('deck:Test');
      
      // Verify the result
      expect(result).toEqual([12345, 67890]);
    });
    
    it('should get all notes in a deck', async () => {
      // Setup two-call sequence: findNotes -> getCards
      let callCount = 0;
      mockXHR.send.mockImplementation(() => {
        callCount++;
        
        if (callCount === 1) {
          // First call: findNotes
          mockXHR.responseText = JSON.stringify({
            result: [12345, 67890],
            error: null
          });
        } else {
          // Second call: getCards (notesInfo)
          mockXHR.responseText = JSON.stringify({
            result: [
              { noteId: 12345, fields: { Front: { value: 'Question 1' }, Back: { value: 'Answer 1' } } },
              { noteId: 67890, fields: { Front: { value: 'Question 2' }, Back: { value: 'Answer 2' } } }
            ],
            error: null
          });
        }
        
        mockXHR.triggerLoad();
      });
      
      // Call getNotesInDeck
      const result = await anki.getNotesInDeck('Test Deck');
      
      // Verify two calls were made
      expect(mockXHR.send).toHaveBeenCalledTimes(2);
      
      // First call should be findNotes with the correct deck query
      const firstPayload = JSON.parse(mockXHR.send.mock.calls[0][0]) as AnkiFindNotesPayload;
      expect(firstPayload.action).toBe('findNotes');
      expect(firstPayload.params.query).toBe('deck:"Test Deck"');
      
      // Second call should be notesInfo with the found IDs
      const secondPayload = JSON.parse(mockXHR.send.mock.calls[1][0]) as AnkiNotesInfoPayload;
      expect(secondPayload.action).toBe('notesInfo');
      expect(secondPayload.params.notes).toEqual([12345, 67890]);
      
      // Verify the result contains the note details
      expect(result.length).toBe(2);
      expect(result[0].noteId).toBe(12345);
      expect(result[1].noteId).toBe(67890);
    });
    
    it('should return empty array when no notes found in deck', async () => {
      // Mock findNotes to return empty array (no notes found)
      mockXHR.send.mockImplementation(() => {
        mockXHR.responseText = JSON.stringify({
          result: [],
          error: null
        });
        mockXHR.triggerLoad();
      });
      
      // Call getNotesInDeck
      const result = await anki.getNotesInDeck('Empty Deck');
      
      // Verify only one call was made (findNotes)
      expect(mockXHR.send).toHaveBeenCalledTimes(1);
      
      // Verify the result is an empty array
      expect(result).toEqual([]);
    });
  });
  
  describe('requestPermission', () => {
    it('should request permission from AnkiConnect and return typed response', async () => {
      // Define the mock successful response using the new type
      const mockPermissionResponse: AnkiPermissionResponse = {
        permission: 'granted',
        requireApiKey: false,
        version: 6
      };
      
      // Mock the send method to return the successful typed response
      mockXHR.send.mockImplementation(() => {
        mockXHR.responseText = JSON.stringify({
          result: mockPermissionResponse,
          error: null
        });
        mockXHR.triggerLoad();
      });
      
      // Call requestPermission
      const result = await anki.requestPermission();
      
      // Verify the request
      expect(mockXHR.open).toHaveBeenCalledWith('POST', 'http://127.0.0.1:8765');
      
      // Verify the payload
      const payload = JSON.parse(mockXHR.send.mock.calls[0][0]) as AnkiRequestPermissionPayload;
      expect(payload.action).toBe('requestPermission');
      expect(payload.version).toBe(6);
      expect(payload.params).toEqual({}); // No params for requestPermission
      
      // Verify the result matches the typed mock response
      expect(result).toEqual(mockPermissionResponse);
    });
    
    it('should handle error when requesting permission', async () => {
      // Mock the send method to return an error response
      mockXHR.send.mockImplementation(() => {
        mockXHR.responseText = JSON.stringify({
          result: null,
          error: 'Failed to request permission'
        });
        mockXHR.triggerLoad();
      });
      
      // Expect an error when calling requestPermission
      await expect(anki.requestPermission()).rejects.toEqual('Failed to request permission');
      
      // Verify payload was still sent correctly
      const payload = JSON.parse(mockXHR.send.mock.calls[0][0]) as AnkiRequestPermissionPayload;
      expect(payload.action).toBe('requestPermission');
      expect(payload.version).toBe(6);
      expect(payload.params).toEqual({}); // No params for requestPermission
    });
  });
}); 