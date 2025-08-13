/**
 * Test file to demonstrate the validation functionality for the "reserve for" field
 * This file can be run with Node.js to test the validation logic
 */

const { validateReserveForName } = require('../utils/validation');

// Test cases for valid names
const validNames = [
    "John Doe",
    "Maria Clara",
    "O'Connor",
    "Anne-Marie",
    "Jean-Pierre",
    "Mary Jane",
    "A",
    "Z",
    "McDonald",
    "van der Berg"
];

// Test cases for invalid names
const invalidNames = [
    "", // Empty string
    "   ", // Only spaces
    "1234", // Only numbers
    "John123", // Numbers in name
    "@John!", // Special characters
    "Jane#", // Special characters
    "A".repeat(51), // Too long (51 characters)
    "--John", // Starts with consecutive hyphens
    "John--", // Ends with consecutive hyphens
    "O''Connor", // Consecutive apostrophes
    "'John", // Starts with apostrophe
    "John'", // Ends with apostrophe
    "-John", // Starts with hyphen
    "John-", // Ends with hyphen
    "John Doe123", // Contains numbers
    "John@Doe", // Contains special characters
    "John Doe!", // Contains special characters
    "   John   Doe   ", // Multiple spaces and leading/trailing spaces
    "John  Doe", // Multiple spaces between names
    "123John", // Starts with numbers
    "John123Doe", // Contains numbers
    " John Doe", // Leading space
    "John Doe ", // Trailing space
    "John  Doe", // Multiple consecutive spaces
    "  John  Doe  " // Multiple leading, trailing, and consecutive spaces
];

console.log("=== VALIDATION TEST RESULTS ===\n");

console.log("Testing VALID names:");
validNames.forEach(name => {
    const result = validateReserveForName(name);
    console.log(`"${name}" -> ${result.isValid ? '✅ VALID' : '❌ INVALID'}: ${result.message}`);
});

console.log("\nTesting INVALID names:");
invalidNames.forEach(name => {
    const result = validateReserveForName(name);
    console.log(`"${name}" -> ${result.isValid ? '✅ VALID' : '❌ INVALID'}: ${result.message}`);
});

console.log("\n=== WHITESPACE VALIDATION TESTS ===\n");

const whitespaceTestNames = [
    "   John   Doe   ", // Multiple spaces and leading/trailing spaces
    "  Maria  Clara  ", // Multiple spaces
    "O'Connor", // Valid name
    "Anne-Marie", // Valid name
    "   Jean-Pierre   ", // Multiple spaces and leading/trailing spaces
    "   A   ", // Single letter with spaces
    "   Z   " // Single letter with spaces
];

whitespaceTestNames.forEach(name => {
    const result = validateReserveForName(name);
    console.log(`"${name}" -> ${result.isValid ? '✅ VALID' : '❌ INVALID'}: ${result.message}`);
});

console.log("\n=== EDGE CASES ===\n");

// Test edge cases
const edgeCases = [
    null,
    undefined,
    123,
    {},
    []
];

edgeCases.forEach(input => {
    try {
        const result = validateReserveForName(input);
        console.log(`${input} -> ${result.isValid ? '✅ VALID' : '❌ INVALID'}: ${result.message}`);
    } catch (error) {
        console.log(`${input} -> ERROR: ${error.message}`);
    }
});

console.log("\n=== VALIDATION COMPLETE ===");
