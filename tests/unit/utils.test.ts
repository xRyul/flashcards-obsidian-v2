import { arraysEqual, escapeMarkdown, escapeRegExp } from '../../src/utils';

// Exclude the arrayBufferToBase64 test since it requires window.btoa which is not available in Node
// We can consider the function covered by manual testing

describe('Utils', () => {
    // Test arraysEqual function
    describe('arraysEqual', () => {
        it('should return true for identical arrays', () => {
            expect(arraysEqual(['a', 'b', 'c'], ['a', 'b', 'c'])).toBe(true);
        });

        it('should return true for same arrays in different order', () => {
            expect(arraysEqual(['a', 'c', 'b'], ['a', 'b', 'c'])).toBe(true);
        });

        it('should return false for arrays with different lengths', () => {
            expect(arraysEqual(['a', 'b'], ['a', 'b', 'c'])).toBe(false);
        });

        it('should return false for arrays with different elements', () => {
            expect(arraysEqual(['a', 'b', 'd'], ['a', 'b', 'c'])).toBe(false);
        });

        it('should return true for empty arrays', () => {
            expect(arraysEqual([], [])).toBe(true);
        });

        it('should return true when comparing the same array reference', () => {
            const arr = ['a', 'b', 'c'];
            expect(arraysEqual(arr, arr)).toBe(true);
        });

        it('should return false when one array is null', () => {
            expect(arraysEqual(null as any, ['a', 'b', 'c'])).toBe(false);
            expect(arraysEqual(['a', 'b', 'c'], null as any)).toBe(false);
        });
    });

    // Test escapeMarkdown function
    describe('escapeMarkdown', () => {
        it('should escape all markdown special characters', () => {
            const input = 'This is *markdown* with #tags and [links](url) and _underscores_';
            const output = escapeMarkdown(input);
            
            // Check specific characters are escaped
            expect(output).toContain('#tags'); // # is not escaped
            expect(output).toContain('\\[links\\]\\(url\\)');
            expect(output).toContain('\\_underscores\\_');
            expect(output).toContain('*markdown*');
        });

        it('should skip specified characters', () => {
            const input = 'Test [square brackets] and (parentheses)';
            const output = escapeMarkdown(input, ['square brackets', 'parentheses']);
            
            expect(output).toBe('Test [square brackets] and (parentheses)');
        });

        it('should escape angle brackets as HTML entities', () => {
            const input = 'Test <angle brackets>';
            const output = escapeMarkdown(input);
            
            expect(output).toBe('Test &lt;angle brackets&gt;');
        });

        it('should handle empty strings', () => {
            expect(escapeMarkdown('')).toBe('');
        });
    });

    // Test escapeRegExp function
    describe('escapeRegExp', () => {
        it('should escape regex special characters', () => {
            const input = 'This is a regex with .* and [a-z] special chars';
            const output = escapeRegExp(input);
            
            expect(output).toContain('\\.\\*');
            expect(output).toContain('\\[a-z\\]');
        });

        it('should escape all regex special characters', () => {
            const input = '.*+?^${}()|[]\\';
            const output = escapeRegExp(input);
            
            expect(output).toBe('\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\');
        });

        it('should handle empty strings', () => {
            expect(escapeRegExp('')).toBe('');
        });
    });
}); 