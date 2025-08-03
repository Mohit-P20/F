const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

// JWT secret - validate it's properly configured
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET === 'your-super-secret-jwt-key-change-in-production') {
  if (process.env.NODE_ENV === 'production') {
    console.error('FATAL: JWT_SECRET must be set to a secure value in production');
    process.exit(1);
  } else {
    console.warn('WARNING: Using default JWT_SECRET. Change this in production!');
  }
}

// Role-based access control
const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  EMPLOYEE: 'employee',
  CLIENT: 'client'
};

const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: ['create', 'read', 'update', 'delete', 'ship', 'quality'],
  [ROLES.MANAGER]: ['create', 'read', 'update', 'ship', 'quality'],
  [ROLES.EMPLOYEE]: ['read', 'ship'],
  [ROLES.CLIENT]: ['read']
};

// Secure user storage (in production, use a proper database)
const SECURE_USERS = {
  'admin': { 
    passwordHash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5uO8O', // admin123
    role: ROLES.ADMIN,
    lastLogin: null,
    failedAttempts: 0,
    lockedUntil: null
  },
  'manager': { 
    passwordHash: '$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // manager123
    role: ROLES.MANAGER,
    lastLogin: null,
    failedAttempts: 0,
    lockedUntil: null
  },
  'employee': { 
    passwordHash: '$2b$12$gp45Oub0H2knh2vSAy7hDONXjzMHs1qZpBuirfLllFgaKeqWrKIWy', // employee123
    role: ROLES.EMPLOYEE,
    lastLogin: null,
    failedAttempts: 0,
    lockedUntil: null
  },
  'client': { 
    passwordHash: '$2b$12$4y9retKoiS8dwZeQwE5uFOKKQH5TQjqNkVU5nJ8jJOOvQH5TQjqNk', // client123
    role: ROLES.CLIENT,
    lastLogin: null,
    failedAttempts: 0,
    lockedUntil: null
  }
};

// Account lockout configuration
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

// Generate JWT token
const generateToken = (userId, role, sessionId = null) => {
  const payload = { 
    userId, 
    role,
    sessionId: sessionId || crypto.randomBytes(16).toString('hex'),
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
  };

  return jwt.sign(
    payload,
    JWT_SECRET,
    { algorithm: 'HS256' }
  );
};

// Verify JWT token middleware
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]; // Bearer <token>
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    
    // Check if token is expired (additional check)
    if (decoded.exp < Math.floor(Date.now() / 1000)) {
      return res.status(401).json({ error: 'Token expired' });
    }
    
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Token verification failed:', error.message);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    } else {
      return res.status(401).json({ error: 'Token verification failed' });
    }
  }
};

// Check if user has required permission
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userRole = req.user.role;
    const permissions = ROLE_PERMISSIONS[userRole] || [];

    if (!permissions.includes(permission)) {
      console.warn(`Permission denied: User ${req.user.userId} (${userRole}) attempted ${permission}`);
      return res.status(403).json({ 
        error: `Insufficient permissions. Required: ${permission}, User role: ${userRole}` 
      });
    }

    next();
  };
};

// Enhanced login endpoint with security features
const login = async (req, res) => {
  const { username, password, role } = req.body;

  // Input validation
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  if (username.length > 50 || password.length > 100) {
    return res.status(400).json({ error: 'Invalid input length' });
  }

  const user = SECURE_USERS[username];
  if (!user) {
    // Simulate password check to prevent timing attacks
    await bcrypt.compare(password, '$2b$12$dummy.hash.to.prevent.timing.attacks');
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Check if account is locked
  if (user.lockedUntil && user.lockedUntil > Date.now()) {
    const remainingTime = Math.ceil((user.lockedUntil - Date.now()) / 60000);
    return res.status(423).json({ 
      error: `Account locked. Try again in ${remainingTime} minutes.` 
    });
  }

  try {
    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    
    if (!isValidPassword) {
      // Increment failed attempts
      user.failedAttempts = (user.failedAttempts || 0) + 1;
      
      if (user.failedAttempts >= MAX_FAILED_ATTEMPTS) {
        user.lockedUntil = Date.now() + LOCKOUT_DURATION;
        console.warn(`Account ${username} locked due to too many failed attempts`);
        return res.status(423).json({ 
          error: 'Account locked due to too many failed attempts. Try again later.' 
        });
      }
      
      return res.status(401).json({ 
        error: 'Invalid credentials',
        attemptsRemaining: MAX_FAILED_ATTEMPTS - user.failedAttempts
      });
    }

    // Reset failed attempts on successful login
    user.failedAttempts = 0;
    user.lockedUntil = null;
    user.lastLogin = new Date().toISOString();

    // Generate secure session
    const sessionId = crypto.randomBytes(32).toString('hex');
    const token = generateToken(username, user.role, sessionId);
    
    console.log(`Successful login: ${username} (${user.role}) from ${req.ip}`);
    
    res.json({ 
      token, 
      user: { 
        username, 
        role: user.role,
        lastLogin: user.lastLogin
      },
      expiresIn: '24h'
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Authentication service unavailable' });
  }
};

// Password hashing utility (for setup)
const hashPassword = async (password) => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

module.exports = {
  generateToken,
  verifyToken,
  requirePermission,
  login,
  hashPassword,
  ROLES,
  SECURE_USERS
};