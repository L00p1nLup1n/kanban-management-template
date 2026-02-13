import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import process from 'process';
import { ValidationError } from '../utils/error.js';
import { createUser } from '../utils/userHelpers.js';

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret';
const JWT_EXPIRES_IN = '15m';

export async function register(req, res) {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      throw new ValidationError(400, 'Email and password required');
    }

    if (await User.findOne({ email })) {
      // check if user already exist in the database
      throw new ValidationError(409, 'User already exists');
    }

    const user = createUser(email, password, name);

    // Generate token
    const accessToken = jwt.sign({ userId: user._id }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    return res.status(201).json({
      user: { id: user._id, email: user.email, name: user.name },
      accessToken,
    });
  } catch (err) {
    if (err.statusCode !== 500) {
      return res.status(err.statusCode).json({ error: err.message });
    } else {
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new ValidationError(401, 'Email and password required');
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      throw new ValidationError(401, 'Invalid credential');
    }

    // Verify user's password
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const accessToken = jwt.sign({ userId: user._id }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    return res.json({
      user: { id: user._id, email: user.email, name: user.name },
      accessToken,
    });
  } catch (err) {
    if (err.statusCode !== 500) {
      return res.status(err.statusCode).json({ error: err.message });
    } else {
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}

// Get current user
export async function me(req, res) {
  try {
    const user = await User.findById(req.userId).select('-passwordHash');

    if (!user) {
      // return res.status(404).json({ error: 'User not found' });
      throw new ValidationError(404, 'User not found');
    }

    return res.json({ user });
  } catch (err) {
    if (err.statusCode !== 500) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
}
