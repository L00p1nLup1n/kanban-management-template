import User from '../models/User.js';

/**
 * Create a new user in the database
 * @function create
 * @param {string} email - User's email address
 * @param {string} passwordHash - Bcrypt hashed password
 * @param {string} [name] - User's display name (optional)
 * @returns {Promise<Object>} Promise that resolves to the created User document
 */
export function create(email, passwordHash, name) {
  return User.create({ email, passwordHash, name });
}

/**
 * Find a user by email address
 * @function findByEmail
 * @param {string} email - User's email address to search for
 * @returns {Promise<Object|null>} Promise that resolves to User document if found, or null if not found
 */
export function findByEmail(email) {
  return User.findOne({ email });
}

/**
 * Find a user by MongoDB ObjectId (excludes passwordHash for security)
 * @function findById
 * @param {string} userId - User's MongoDB ObjectId
 * @returns {Promise<Object|null>} Promise that resolves to User document without passwordHash if found, or null if not found
 */
export function findById(userId) {
  return User.findById(userId).select('-passwordHash');
}

/**
 * Get user's createdAt and updatedAt timestamps only
 * @function getTimeStamps
 * @param {string} userId - User's MongoDB ObjectId
 * @returns {Promise<Object|null>} Promise that resolves to object with createdAt and updatedAt fields, or null if user not found
 */
export function getTimeStamps(userId) {
  return User.findById(userId).select('createdAt updatedAt');
}
