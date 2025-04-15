// tests/setup.ts

// Mock the global document object for Jest's Node environment
// This prevents errors when code under test references document methods

// Basic mock for methods used in Parser.getEmbedMap
global.document = {
    documentElement: {
        getElementsByClassName: jest.fn().mockReturnValue([]), // Return empty array by default
    },
    // Add other document properties/methods here if needed by other tests
} as any; // Use 'as any' to simplify mocking complex DOM types 