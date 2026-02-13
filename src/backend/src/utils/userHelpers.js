import bcrypt from 'bcrypt';
import User from '../models/User.js';

/**
 * Create a new user
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Object}
 */
export async function createUser(password, email, name) {
  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  // Create user
  const user = await User.create({ email, passwordHash, name });

  return user;
}

