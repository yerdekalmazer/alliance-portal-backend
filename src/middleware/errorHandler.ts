import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../models/types';

export function errorHandler(
  error: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Log error details
  console.error('Error:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query,
    timestamp: new Date().toISOString()
  });

  // Default error response
  let statusCode = error.statusCode || 500;
  let message = error.message || 'Internal Server Error';
  let code = error.code || 'INTERNAL_ERROR';

  // Handle specific error types
  if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
    code = 'VALIDATION_ERROR';
  } else if (error.name === 'UnauthorizedError' || error.message.includes('unauthorized')) {
    statusCode = 401;
    message = 'Unauthorized';
    code = 'UNAUTHORIZED';
  } else if (error.message.includes('not found')) {
    statusCode = 404;
    message = 'Resource not found';
    code = 'NOT_FOUND';
  } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
    statusCode = 503;
    message = 'Service temporarily unavailable';
    code = 'SERVICE_UNAVAILABLE';
  }

  // Don't leak sensitive information in production
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    message = 'Internal Server Error';
  }

  res.status(statusCode).json({
    success: false,
    error: message,
    code,
    ...(process.env.NODE_ENV === 'development' && {
      details: error.details,
      stack: error.stack
    })
  });
}
