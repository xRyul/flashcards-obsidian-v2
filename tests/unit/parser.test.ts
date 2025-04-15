import { Parser } from '../../src/services/parser';
import { Regex } from '../../src/conf/regex';
import { ISettings } from '../../src/conf/settings';
import { Flashcard } from '../../src/entities/flashcard'; // Assuming Flashcard entity is sufficient for this test

// Mock settings
const mockSettings: ISettings = {
    flashcardsTag: 'card',
    // Add other necessary settings properties with default/mock values
    contextAwareMode: false, // Simplify test by disabling context
    sourceSupport: false,
    codeHighlightSupport: false,
    inlineID: false,
    contextSeparator: ' > ',
    deck: 'Default',
    folderBasedDeck: false,
    inlineSeparator: '::',
    inlineSeparatorReverse: ':::',
    defaultAnkiTag: '',
    ankiConnectPermission: true, // Assuming permission granted
};

describe('Parser Service', () => {
    let parser: Parser;
    let regex: Regex;

    beforeAll(() => {
        // Instantiate Regex and Parser once for all tests in this suite
        regex = new Regex(mockSettings);
        parser = new Parser(regex, mockSettings);
    });

    it('should parse all card types, including list items, when IDs are present', () => {
        const fileContent = `
- Testing card deletion? #card
	- It seems to work
<!-- ankiID: 1744708866782 -->
- Testing card deletion2? #card
	- It seems to work2
	- ![[How to Vibe Code-202504142250032222.webp]]
<!-- ankiID: 1744708866783 -->

[[#^fixed-point|Fixed-Point]] representation extends...

> [!info]- Definition: Fixed-Point Representation #card
> A method for representing real numbers where the position of the binary point is implicitly fixed within the binary string, dividing bits between integer and fractional parts. Offers limited, fixed range and precision. (slide 131)
^fixed-point
<!-- ankiID: 1744708866784 -->

- Testing card deletion3? #card
	- It seems to work3
`;

        const deckName = 'TestDeck';
        const vaultName = 'TestVault';
        const noteName = 'TestNote';
        const globalTags: string[] = [];

        const resultCards = parser.generateFlashcards(
            fileContent,
            deckName,
            vaultName,
            noteName,
            globalTags
        );

        // 1. Check total number of cards found
        expect(resultCards).toHaveLength(4);

        // 2. Check Card 1 (List item, has ID)
        const card1 = resultCards.find(card => card.initialContent.includes('Testing card deletion?'));
        expect(card1).toBeDefined();
        expect(card1?.id).toBe(1744708866782);
        expect(card1?.inserted).toBe(true); // Parser should detect the ID
        expect(card1?.fields.Front).toBe('<p>Testing card deletion?</p>'); // Expect HTML paragraph
        expect(card1?.fields.Back).toContain('It seems to work'); // Check content, allow for whitespace/HTML

        // 3. Check Card 2 (List item with image, has ID)
        const card2 = resultCards.find(card => card.initialContent.includes('Testing card deletion2?'));
        expect(card2).toBeDefined();
        expect(card2?.id).toBe(1744708866783);
        expect(card2?.inserted).toBe(true);
        expect(card2?.fields.Front).toBe('<p>Testing card deletion2?</p>');
        expect(card2?.fields.Back).toContain('It seems to work2');
        expect(card2?.fields.Back).toContain('<img src=\'How to Vibe Code-202504142250032222.webp\'>'); // Check for parsed image

        // 4. Check Card 3 (Blockquote/Callout, has ID)
        const card3 = resultCards.find(card => card.initialContent.includes('Definition: Fixed-Point Representation'));
        expect(card3).toBeDefined();
        expect(card3?.id).toBe(1744708866784);
        expect(card3?.inserted).toBe(true);
        expect(card3?.fields.Front).toContain('Definition: Fixed-Point Representation'); // May include callout syntax depending on parsing
        expect(card3?.fields.Back).toContain('A method for representing real numbers');

        // 5. Check Card 4 (List item, NO ID) - *** THIS IS THE KEY CHECK ***
        const card4 = resultCards.find(card => card.initialContent.includes('Testing card deletion3?'));
        expect(card4).toBeDefined(); // <<< Does the parser even find this card?
        // If the above passes, check its properties:
        expect(card4?.id).toBe(-1); // <<< Should be -1 as no ID block follows
        expect(card4?.inserted).toBe(false); // <<< Should be false
        expect(card4?.fields.Front).toBe('<p>Testing card deletion3?</p>');
        expect(card4?.fields.Back).toContain('It seems to work3');
    });

    // Add more test cases as needed for other scenarios (inline cards, cloze, etc.)
}); 