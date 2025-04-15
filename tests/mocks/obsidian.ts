// tests/mocks/obsidian.ts

// Mock implementations for Obsidian API functions needed in tests

// Basic mock for htmlToMarkdown - just returns input or a fixed string
export const htmlToMarkdown = (html: string): string => {
  // console.log(`Mock htmlToMarkdown called with: ${html}`);
  // For testing purposes, we might not need perfect conversion.
  // Returning the input or a placeholder might be sufficient.
  return `(mock-markdown-for: ${html.substring(0, 50)}...)`;
  // return html; // Alternatively, just return the HTML
};

// Add mocks for other Obsidian functions/classes if needed by other tests
// export const Notice = jest.fn().mockImplementation(() => {
//   // Mock implementation for Notice
// });
// export const App = jest.fn()...; 