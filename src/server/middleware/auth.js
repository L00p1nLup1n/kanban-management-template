import jwt from 'jsonwebtoken';
import process from 'process';
import User from '../models/User.js';

export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid token' });
  }

  const token = authHeader.substring(7);
  const secret = process.env.JWT_SECRET || 'default_secret';

  try {
    const decoded = jwt.verify(token, secret);
    req.userId = decoded.userId;

    if (decoded.role) {
      req.userRole = decoded.role;
      return next();
    }

    // Legacy token without role — fall back to DB lookup
    User.findById(decoded.userId, 'role')
      .then((user) => {
        req.userRole = user?.role || null;
        next();
      })
      .catch(() => {
        // Role lookup failed but auth itself is valid — proceed without role
        req.userRole = null;
        next();
      });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
