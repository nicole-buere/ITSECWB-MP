# Reserve For Field Validation Rules

This document outlines the validation rules for the "reserve for" field in the lab tech reservation system.

## ✅ Valid Input Examples

### Plain letters with optional spaces:
- `John Doe`
- `Maria Clara`
- `Alice`
- `Bob Smith`

### Names with apostrophes or hyphens:
- `O'Connor`
- `Anne-Marie`
- `Jean-Pierre`
- `McDonald`

### Single letter names:
- `A`
- `Z`

## ❌ Invalid Input Examples

### Empty or whitespace-only:
- `""` (empty string)
- `"   "` (only spaces)

### Contains numbers:
- `1234`
- `John123`
- `123John`
- `John123Doe`

### Contains special characters:
- `@John!`
- `Jane#`
- `John@Doe`
- `John Doe!`

### Too long:
- Names exceeding 50 characters

### Invalid formatting:
- `--John` (starts with consecutive hyphens)
- `John--` (ends with consecutive hyphens)
- `O''Connor` (consecutive apostrophes)
- `'John` (starts with apostrophe)
- `John'` (ends with apostrophe)
- `-John` (starts with hyphen)
- `John-` (ends with hyphen)

### Invalid whitespace:
- ` John Doe` (leading space)
- `John Doe ` (trailing space)
- `John  Doe` (multiple consecutive spaces)
- `  John  Doe  ` (multiple leading, trailing, and consecutive spaces)

## Validation Rules Summary

1. **Length**: Must be between 2 and 50 characters
2. **Characters**: Only letters (a-z, A-Z), spaces, apostrophes ('), and hyphens (-)
3. **Format**: Cannot start or end with apostrophes or hyphens
4. **Consecutive**: Cannot have consecutive apostrophes or hyphens
5. **Minimum**: Must be at least 2 characters long
6. **Single letters**: Single character names must be letters only
7. **Whitespace**: No leading or trailing spaces, no multiple consecutive spaces

## Implementation

The validation is implemented in both frontend and backend:

- **Frontend**: Real-time validation with visual feedback (green/red borders, error messages)
- **Backend**: Server-side validation in the `adminReserve` function
- **Utility**: Centralized validation logic in `utils/validation.js`

**Important**: The system rejects invalid input rather than sanitizing it. Users must provide properly formatted names.

## Error Messages

The system provides specific error messages for each validation failure:

- "Name cannot be empty or contain only spaces"
- "Name cannot exceed 50 characters"
- "Name can only contain letters, spaces, apostrophes, and hyphens"
- "Name must be at least 2 characters long"
- "Name cannot contain consecutive apostrophes or hyphens"
- "Name cannot start or end with apostrophes or hyphens"
- "Name cannot have leading or trailing spaces"
- "Name cannot contain multiple consecutive spaces"

## Input Requirements

The system requires properly formatted input:
- No leading or trailing whitespace
- No multiple consecutive spaces
- Proper capitalization and formatting
- Users must correct any formatting issues before submission
