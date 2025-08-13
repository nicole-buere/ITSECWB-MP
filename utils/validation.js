/**
 * Validation utility functions for the lab reservation system
 */

/**
 * Validates the "reserve for" field for lab tech reservations
 * @param {string} name - The name to validate
 * @returns {Object} - Validation result with isValid boolean and message
 */
function validateReserveForName(name) {
    // Check if name is empty or only whitespace
    if (!name || name.trim() === '') {
        return {
            isValid: false,
            message: 'Name cannot be empty or contain only spaces'
        };
    }

    // Check if name is too long (over 50 characters)
    if (name.length > 50) {
        return {
            isValid: false,
            message: 'Name cannot exceed 50 characters'
        };
    }

    // Check if name contains only spaces
    if (name.trim().length === 0) {
        return {
            isValid: false,
            message: 'Name cannot contain only spaces'
        };
    }

    // Regular expression for valid names:
    // - Letters (a-z, A-Z) with optional spaces
    // - Apostrophes and hyphens are allowed
    // - No numbers or special characters
    const nameRegex = /^[a-zA-Z\s'-]+$/;

    if (!nameRegex.test(name)) {
        return {
            isValid: false,
            message: 'Name can only contain letters, spaces, apostrophes, and hyphens'
        };
    }

    // Check if name contains only valid characters but is too short
    if (name.trim().length < 2) {
        return {
            isValid: false,
            message: 'Name must be at least 2 characters long'
        };
    }

    // Check for consecutive special characters (e.g., --, '', etc.)
    if (/(['-])\1/.test(name)) {
        return {
            isValid: false,
            message: 'Name cannot contain consecutive apostrophes or hyphens'
        };
    }

    // Check if name starts or ends with special characters
    if (/^['-]|['-]$/.test(name.trim())) {
        return {
            isValid: false,
            message: 'Name cannot start or end with apostrophes or hyphens'
        };
    }

    return {
        isValid: true,
        message: 'Name is valid'
    };
}

/**
 * Logs validation failures to the input_validationfail_logs table
 * @param {Object} supabase - Supabase client instance
 * @param {string} userID - UUID of the user
 * @param {string} username - Username of the user
 * @param {string} inputField - Name of the input field that failed validation
 * @param {string} inputValue - The invalid input value
 * @param {string} errMessage - The validation error message
 * @returns {Promise<Object>} - Result of the logging operation
 */
async function logValidationFailure(supabase, userID, username, inputField, inputValue, errMessage) {
    try {
        console.log('Attempting to log validation failure with data:', {
            userID,
            username,
            inputField,
            inputValue,
            errMessage
        });

        // Handle case where userID is null (e.g., invalid username during login)
        if (!userID) {
            console.log('No userID provided, logging without userID reference');
        }

        // For registration failures, we can't use the username since it doesn't exist in users table yet
        // So we'll set it to null to avoid foreign key constraint violations
        let logUsername = username;
        if (inputField.startsWith('registration_')) {
            logUsername = null; // Set to null since user doesn't exist yet
            console.log('Registration validation failure detected, setting username to null');
        }

        const logEntry = {
            userID: userID,
            username: logUsername,
            input_field: inputField,
            input_value: inputValue,
            errMessage: errMessage,
            created_at: new Date().toISOString()
        };

        // For registration failures, add the attempted username to the error message for reference
        // since we can't store it in the username field (it would violate foreign key constraints)
        if (inputField.startsWith('registration_')) {
            logEntry.errMessage = `${errMessage} (Attempted username: ${username})`;
        }

        console.log('Log entry to be inserted:', logEntry);

        const { data, error } = await supabase
            .from('input_validationfail_logs')
            .insert([logEntry]);

        if (error) {
            console.error('Error logging validation failure:', error);
            console.error('Error details:', {
                code: error.code,
                message: error.message,
                details: error.details,
                hint: error.hint
            });
            return { success: false, error: error };
        }

        console.log('Validation failure logged successfully:', logEntry);
        console.log('Inserted data:', data);
        return { success: true, data: data };
    } catch (error) {
        console.error('Exception while logging validation failure:', error);
        return { success: false, error: error };
    }
}

module.exports = {
    validateReserveForName,
    logValidationFailure
};
