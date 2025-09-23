import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';

// Enhanced rate limiting for different endpoints
export const createRateLimit = (windowMinutes: number, maxRequests: number, message?: string) => {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    max: maxRequests,
    message: {
      success: false,
      error: message || `Too many requests, please try again in ${windowMinutes} minutes`,
      code: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        error: message || `Too many requests, please try again in ${windowMinutes} minutes`,
        code: 'RATE_LIMIT_EXCEEDED'
      });
    }
  });
};

// Strict rate limiting for auth endpoints
export const authRateLimit = createRateLimit(15, 50, 'Too many authentication attempts');

// General API rate limiting
export const apiRateLimit = createRateLimit(15, 1000, 'Too many API requests');

// Upload rate limiting
export const uploadRateLimit = createRateLimit(15, 50, 'Too many upload requests');

// Slow down middleware for repeated requests
export const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 200, // allow 200 requests per windowMs without delay
  delayMs: () => 300, // add 300ms delay per request after delayAfter
  maxDelayMs: 15000, // max delay of 15 seconds
});

// IP whitelist middleware (for development/testing)
export const ipWhitelist = (allowedIPs: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientIP = req.ip || req.connection.remoteAddress;
    
    if (process.env.NODE_ENV === 'development') {
      return next(); // Skip in development
    }
    
    if (allowedIPs.includes(clientIP || '')) {
      return next();
    }
    
    res.status(403).json({
      success: false,
      error: 'Access denied from this IP address',
      code: 'IP_NOT_ALLOWED'
    });
  };
};

// Request validation middleware
export const validateContentType = (allowedTypes: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'GET' || req.method === 'DELETE') {
      return next();
    }
    
    const contentType = req.get('Content-Type');
    
    if (!contentType || !allowedTypes.some(type => contentType.includes(type))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid content type',
        code: 'INVALID_CONTENT_TYPE'
      });
    }
    
    next();
  };
};

// Request size limiting
export const requestSizeLimit = (maxSizeMB: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = parseInt(req.get('Content-Length') || '0');
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    
    if (contentLength > maxSizeBytes) {
      return res.status(413).json({
        success: false,
        error: `Request too large. Maximum size: ${maxSizeMB}MB`,
        code: 'REQUEST_TOO_LARGE'
      });
    }
    
    next();
  };
};

// Security headers middleware
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Disable referrer for external links
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Add HSTS header for HTTPS
  if (req.secure || req.get('X-Forwarded-Proto') === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  // Content Security Policy
  res.setHeader('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "font-src 'self'; " +
    "connect-src 'self'"
  );
  
  next();
};

// Input sanitization middleware
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  // Skip sanitization for OPTIONS requests (CORS preflight)
  if (req.method === 'OPTIONS') {
    return next();
  }
  
  const sanitize = (obj: any): any => {
    if (typeof obj === 'string') {
      // Remove potentially dangerous characters
      return obj.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/javascript:/gi, '')
                .replace(/on\w+\s*=/gi, '');
    } else if (Array.isArray(obj)) {
      return obj.map(sanitize);
    } else if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const key in obj) {
        sanitized[key] = sanitize(obj[key]);
      }
      return sanitized;
    }
    return obj;
  };
  
  if (req.body) {
    req.body = sanitize(req.body);
  }
  
  // Query parameters are read-only, so we sanitize them in place
  if (req.query) {
    for (const key in req.query) {
      if (Object.prototype.hasOwnProperty.call(req.query, key)) {
        const value = req.query[key];
        if (typeof value === 'string') {
          (req.query as any)[key] = sanitize(value);
        }
      }
    }
  }
  
  next();
};

// API key validation middleware
export const validateApiKey = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.get('X-API-Key');
  const validApiKey = process.env.API_KEY;
  
  if (!validApiKey) {
    return next(); // Skip if no API key is configured
  }
  
  if (!apiKey || apiKey !== validApiKey) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or missing API key',
      code: 'INVALID_API_KEY'
    });
  }
  
  next();
};
