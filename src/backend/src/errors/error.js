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
/**
 * Custom error class for project handling failures
 * @extends Error
 * @param {number} statusCode - HTTP status code for the error response
 * @param {string} message - Descriptive error message
 */
export class ProjectError extends Error {
  constructor(statusCode, message) {
    super();
    this.statusCode = statusCode;
    this.message = message;
  }
}

/**
 * Custom error class for tasks handling failures
 * @extends Error
 * @param {number} statusCode - HTTP status code for the error response
 * @param {string} message - Descriptive error message
 */
export class TaskError extends Error {
  constructor(statusCode, message) {
    super();
    this.statusCode = statusCode;
    this.message = message;
  }
}

