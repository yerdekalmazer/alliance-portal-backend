import { Request, Response } from 'express';

export function notFound(req: Request, res: Response) {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    code: 'NOT_FOUND',
    message: `The requested endpoint ${req.method} ${req.originalUrl} was not found on this server.`,
    availableEndpoints: [
      'GET /health',
      'GET /',
      'GET /api/docs (Swagger UI)',
      'GET /api-docs (Swagger UI)',
      'POST /api/auth/login',
      'POST /api/auth/register',
      'GET /api/auth/profile',
      'GET /api/cases',
      'POST /api/cases',
      'GET /api/surveys',
      'POST /api/surveys',
      'GET /api/analytics/dashboard',
      'GET /api/ideas',
      'POST /api/ideas'
    ]
  });
}
