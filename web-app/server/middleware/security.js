const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const validator = require('validator');

// Security headers middleware
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", process.env.ALLOWED_ORIGINS || "http://localhost:3000"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

// Rate limiting
const createRateLimit = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      // Use IP and user ID for authenticated requests
      return req.user ? `${req.ip}_${req.user.userId}` : req.ip;
    },
    skip: (req) => {
      // Skip rate limiting for health checks
      return req.path === '/' || req.path === '/health';
    }
  });
};

// General API rate limit
const generalRateLimit = createRateLimit(
  parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // configurable limit
  'Too many requests from this IP, please try again later'
);

// Strict rate limit for sensitive operations
const strictRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  10, // limit each IP to 10 requests per windowMs
  'Too many sensitive operations from this IP, please try again later'
);

// Authentication rate limit
const authRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  5, // limit each IP to 5 login attempts per windowMs
  'Too many login attempts from this IP, please try again later'
);
// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS 
      ? process.env.ALLOWED_ORIGINS.split(',')
      : ['http://localhost:3000', 'http://localhost:3001'];
    
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

// Enhanced input validation middleware
const validateInput = (req, res, next) => {
  // Comprehensive input sanitization
  const sanitizeString = (str) => {
    if (typeof str !== 'string') return str;
    
    // Remove script tags and other dangerous content
    let sanitized = str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    sanitized = sanitized.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
    sanitized = sanitized.replace(/javascript:/gi, '');
    sanitized = sanitized.replace(/on\w+\s*=/gi, '');
    
    // Limit string length to prevent DoS
    if (sanitized.length > 10000) {
      sanitized = sanitized.substring(0, 10000);
    }
    
    return sanitized.trim();
  };

  const validateProductId = (id) => {
    if (!id || typeof id !== 'string') return false;
    // Product ID should be alphanumeric with hyphens and underscores
    return /^[a-zA-Z0-9\-_]{1,50}$/.test(id);
  };

  const validateEmail = (email) => {
    return validator.isEmail(email);
  };

  const validateDate = (date) => {
    return validator.isISO8601(date);
  };

  const sanitizeObject = (obj) => {
    if (typeof obj !== 'object' || obj === null) return obj;
    
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        sanitized[key] = sanitizeString(value);
      } else if (typeof value === 'object') {
        sanitized[key] = sanitizeObject(value);
      } else if (typeof value === 'number') {
        // Validate numeric inputs
        if (isNaN(value) || !isFinite(value)) {
          sanitized[key] = 0;
        } else {
          sanitized[key] = value;
        }
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  };

  // Validate specific endpoints
  if (req.path.includes('/getProduct') && req.query.id) {
    if (!validateProductId(req.query.id)) {
      return res.status(400).json({ error: 'Invalid product ID format' });
    }
  }

  if (req.path.includes('/createProduct') && req.body) {
    if (req.body.productionDate && !validateDate(req.body.productionDate)) {
      return res.status(400).json({ error: 'Invalid production date format' });
    }
    if (req.body.expirationDate && !validateDate(req.body.expirationDate)) {
      return res.status(400).json({ error: 'Invalid expiration date format' });
    }
  }
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }

  next();
};

// Enhanced request logging middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();
  const requestId = Math.random().toString(36).substring(7);
  req.requestId = requestId;
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      requestId,
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent')?.substring(0, 200), // Limit user agent length
      timestamp: new Date().toISOString(),
      userId: req.user?.userId || 'anonymous'
    };
    
    // Log errors and slow requests with more detail
    if (res.statusCode >= 400 || duration > 5000) {
      console.error('API Request [ERROR/SLOW]:', JSON.stringify(logData));
    } else if (process.env.VERBOSE_LOGGING === 'true') {
      console.log('API Request:', JSON.stringify(logData));
    }
  });
  
  next();
};

// Error response formatter
const formatErrorResponse = (error, req) => {
  const response = {
    error: error.message || 'Internal server error',
    timestamp: new Date().toISOString(),
    requestId: req.requestId
  };

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = error.stack;
  }

  return response;
};
module.exports = {
  securityHeaders,
  generalRateLimit,
  strictRateLimit,
  authRateLimit,
  corsOptions,
  validateInput,
  requestLogger,
  formatErrorResponse
};