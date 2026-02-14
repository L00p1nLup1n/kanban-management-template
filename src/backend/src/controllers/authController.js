import { ValidationError } from '../utils/error.js';
import {
  createUser,
  findUser,
  verifyCredentials,
  findUserById,
  generateTokenForUser,
  getUserTimestamps,
} from '../service/userService.js';

export async function register(req, res) {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      throw new ValidationError(400, 'Email and password required');
    }

    // check if user already exist in the database
    if (await findUser(email)) {
      throw new ValidationError(409, 'Login failed'); // Generic error message to avoid email enumeration
    }

    const user = await createUser(email, password, name);

    // Generate token
    const accessToken = await generateTokenForUser(user);

    return res.status(201).json({
      user: { id: user._id, email: user.email, name: user.name },
      accessToken,
    });
    
  } catch (err) {
    return res
      .status(err.statusCode || 500) // fallback to 500 in case of unhandled HTTP status codes which will omit error messages
      .json({ error: err.message || 'Internal server error' });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new ValidationError(401, 'Email and password required');
    }
    // Find user
    const user = await findUser(email);
    if (!user) {
      throw new ValidationError(401, 'Invalid credentials');
    }

    // Verify user's password
    const isPasswordValid = await verifyCredentials(user, password);
    if (!isPasswordValid) {
      throw new ValidationError(401, 'Invalid credentials');
    }

    // Generate token
    const accessToken = await generateTokenForUser(user);

    return res.json({
      user: { id: user._id, email: user.email, name: user.name },
      accessToken,
    });

  } catch (err) {
    return res
      .status(err.statusCode || 500)
      .json({ error: err.message || 'Internal server error' });
  }
}

// Get current user
export async function me(req, res) {
  try {
    const user = await findUserById(req.userId);

    if (!user) {
      throw new ValidationError(404, 'User not found');
    }
    const { createdAt, updatedAt } = await getUserTimestamps(req.userId);

    return res.json({
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        createdAt: createdAt,
        updatedAt: updatedAt,
      },
    });

  } catch (err) {
    return res
      .status(err.statusCode || 500)
      .json({ error: err.message || 'Internal server error' });
  }
}
