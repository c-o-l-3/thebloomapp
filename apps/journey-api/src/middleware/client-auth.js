/**
 * Client Portal Authentication Middleware
 * Handles authentication for client self-service portal users
 */

import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.CLIENT_JWT_SECRET || process.env.JWT_SECRET || 'dev-client-secret-key';

/**
 * Middleware to authenticate client portal users
 * Expects Authorization header with Bearer token
 */
export async function authenticateClient(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'No authentication token provided'
      });
    }

    const token = authHeader.substring(7);
    
    // Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Invalid or expired token'
      });
    }

    // Validate token payload
    if (!decoded.userId || !decoded.clientId) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Invalid token payload'
      });
    }

    // Check if session exists and is valid
    const session = await prisma.clientPortalSession.findFirst({
      where: {
        token,
        userId: decoded.userId,
        expiresAt: {
          gt: new Date()
        }
      }
    });

    if (!session) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Session expired or invalid'
      });
    }

    // Get user details
    const user = await prisma.clientPortalUser.findUnique({
      where: { id: decoded.userId },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true
          }
        }
      }
    });

    if (!user || user.status !== 'active') {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'User account is inactive or not found'
      });
    }

    if (user.client.status !== 'active') {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: 'Client account is inactive'
      });
    }

    // Update last active timestamp
    await prisma.clientPortalSession.update({
      where: { id: session.id },
      data: { lastActiveAt: new Date() }
    });

    // Attach user and client info to request
    req.clientUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      permissions: user.permissions,
      clientId: user.clientId,
      client: user.client
    };

    next();
  } catch (error) {
    console.error('Client authentication error:', error);
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: 'Authentication failed'
    });
  }
}

/**
 * Middleware to check if user has specific role
 * @param {string[]} allowedRoles - Array of allowed roles
 */
export function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.clientUser) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    if (!allowedRoles.includes(req.clientUser.role)) {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: 'Insufficient permissions for this action'
      });
    }

    next();
  };
}

/**
 * Middleware to check if user has specific permission
 * @param {string} permission - Required permission
 */
export function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.clientUser) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    // Admin has all permissions
    if (req.clientUser.role === 'admin') {
      return next();
    }

    // Check specific permission
    const permissions = req.clientUser.permissions || {};
    if (!permissions[permission]) {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: `Missing required permission: ${permission}`
      });
    }

    next();
  };
}

/**
 * Optional authentication - attaches user if token valid, but doesn't require it
 */
export async function optionalClientAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      
      const user = await prisma.clientPortalUser.findUnique({
        where: { id: decoded.userId },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              slug: true,
              status: true
            }
          }
        }
      });

      if (user && user.status === 'active' && user.client.status === 'active') {
        req.clientUser = {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          permissions: user.permissions,
          clientId: user.clientId,
          client: user.client
        };
      }
    } catch (err) {
      // Invalid token, continue without user
    }

    next();
  } catch (error) {
    next();
  }
}

/**
 * Generate JWT token for client user
 */
export function generateClientToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      clientId: user.clientId,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

export default {
  authenticateClient,
  requireRole,
  requirePermission,
  optionalClientAuth,
  generateClientToken
};