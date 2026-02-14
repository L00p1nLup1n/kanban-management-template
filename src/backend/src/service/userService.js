import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import process from 'process';

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret';
const JWT_EXPIRES_IN = '30m';

/**
 * Create a new user with hashed password
 * @async
 * @function createUser
 * @param {string} email - User's email address
 * @param {string} password - User's plain text password (will be hashed)
 * @param {string} [name] - User's display name (optional)
 * @returns {Promise<Object>} Promise that resolves to the created User document from MongoDB
 * @throws {Error} If user creation fails or email already exists
 */
export async function createUser(email, password, name) {
  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  // Create user
  const user = await User.create({ email, passwordHash, name });

  return user;
}

/**
 * Find a user by their email address
 * @async
 * @function findUser
 * @param {string} email - User's email address to search for
 * @returns {Promise<Object|null>} Promise that resolves to the User document if found, or null if not found
 */
export async function findUser(email) {
  return await User.findOne({ email });
}

/**
 * Find a user by their ID (excludes passwordHash field for security)
 * @async
 * @function findUserById
 * @param {string} userId - User's MongoDB ObjectId
 * @returns {Promise<Object|null>} Promise that resolves to the User document without passwordHash field if found, or null if not found
 * @param {string} userId - User id
 * @returns {Object} User object using `findById(userId)` without password hash
 */
export async function findUserById(userId) {
  return await User.findById(userId).select('-passwordHash');
}

/**
 * Verify a user's password against stored hash
 * @async
 * @function verifyCredentials
 * @param {Object} user - User document from MongoDB containing passwordHash field
 * @param {string} user.passwordHash - The hashed password stored in the database
 * @param {string} password - Plain text password to verify
 * @returns {Promise<boolean>} Promise that resolves to true if password matches, false otherwises
 * @async
 * @param {Object} user - `User` object
 * @param {string} password - User password
 * @returns {Object}
 */
export async function verifyCredentials(user, password) {
  return await bcrypt.compare(password, user.passwordHash);
}

/**
 * Generates a JWT token for a user.
 * @async
 * @function generateTokenForUser
 * @param {Object} user - The user object for which to generate the token.
 * @param {string} user._id - The unique identifier of the user.
 * @returns {Promise<string>} A promise that resolves to a signed JWT token.
 * @throws {Error} If token generation fails.
 */
export async function generateTokenForUser(user) {
  return jwt.sign({ userId: user._id }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

/**
 * Get user timestamps (createdAt and updatedAt)
 * @async
 * @function getUserTimestamps
 * @param {string} userId - User's MongoDB ObjectId
 * @returns {Promise<Object|null>} Promise that resolves to an object containing formatted timestamps, or null if user not found
 * @returns {string} returns.createdAt - When the user account was created (human-readable format)
 * @returns {string} returns.updatedAt - When the user account was last updated (human-readable format)
 */
export async function getUserTimestamps(userId) {
  const user = await User.findById(userId).select('createdAt updatedAt');

  if (!user) {
    return null;
  }
  
  const formatDate = (date) => {
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  return {
    createdAt: formatDate(user.createdAt),
    updatedAt: formatDate(user.updatedAt),
  };
}
