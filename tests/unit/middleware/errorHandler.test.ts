// Unit tests for error handler middleware
import { Request, Response, NextFunction } from 'express';
import { errorHandler } from '../../../src/middleware/errorHandler';
import { createMockRequest, createMockResponse, createMockNext } from '../../fixtures/testData';

describe('Error Handler Middleware', () => {
    it('500 hatası döndürmeli - genel hata', () => {
        const error = new Error('Test error');
        const req = createMockRequest();
        const res = createMockResponse();
        const next = createMockNext();

        errorHandler(error as any, req as Request, res as Response, next as NextFunction);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: 'Test error',
            code: 'INTERNAL_ERROR',
        });
    });

    it('development modunda stack trace göstermeli', () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'development';

        const error = new Error('Detailed test error');
        const req = createMockRequest();
        const res = createMockResponse();
        const next = createMockNext();

        errorHandler(error as any, req as Request, res as Response, next as NextFunction);

        expect(res.status).toHaveBeenCalledWith(500);
        const jsonCall = res.json.mock.calls[0][0];
        expect(jsonCall.stack).toBeDefined();
        expect(jsonCall.error).toBe('Detailed test error');

        process.env.NODE_ENV = originalEnv;
    });

    it('production modunda hata detaylarını gizlemeli', () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';

        const error = new Error('Secret error details');
        (error as any).statusCode = 500;
        const req = createMockRequest();
        const res = createMockResponse();
        const next = createMockNext();

        errorHandler(error as any, req as Request, res as Response, next as NextFunction);

        expect(res.status).toHaveBeenCalledWith(500);
        const jsonCall = res.json.mock.calls[0][0];
        expect(jsonCall.error).toBe('Internal Server Error');
        expect(jsonCall.stack).toBeUndefined();

        process.env.NODE_ENV = originalEnv;
    });
});
