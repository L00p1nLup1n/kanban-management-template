/**
 * Custom error class for validation failures
 * @extends Error
 * @param {number} statusCode - HTTP status code for the error response
 * @param {string} message - Descriptive error message
 */
export class ValidationError extends Error {
    constructor(statusCode, message) {
        super();
        this.statusCode = statusCode;
        this.message = message;
    }
}