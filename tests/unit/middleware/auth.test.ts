// Unit tests for auth middleware
import { Request, Response, NextFunction } from 'express';
import { authMiddleware, requireRole } from '../../../src/middleware/auth';
import { createMockRequest, createMockResponse, createMockNext } from '../../fixtures/testData';

describe('Auth Middleware', () => {
    describe('authMiddleware', () => {
        it('401 hatası döndürmeli - token yoksa', async () => {
            const req = createMockRequest();
            const res = createMockResponse();
            const next = createMockNext();

            await authMiddleware(req as Request, res as Response, next as NextFunction);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: expect.any(String),
                code: expect.any(String),
            });
            expect(next).not.toHaveBeenCalled();
        });

        it('401 hatası döndürmeli - geçersiz token formatı', async () => {
            const req = createMockRequest({
                headers: { authorization: 'InvalidFormat' },
            });
            const res = createMockResponse();
            const next = createMockNext();

            await authMiddleware(req as Request, res as Response, next as NextFunction);

            expect(res.status).toHaveBeenCalledWith(401);
        });

        it('401 hatası döndürmeli - geçersiz/süresi dolmuş token', async () => {
            const req = createMockRequest({
                headers: { authorization: 'Bearer invalid-token' },
            });
            const res = createMockResponse();
            const next = createMockNext();

            await authMiddleware(req as Request, res as Response, next as NextFunction);

            expect(res.status).toHaveBeenCalledWith(401);
        });

        // Note: Valid token test requires actual Supabase mocking
        // which would be implemented in integration tests
    });

    describe('requireRole', () => {
        it('403 hatası döndürmeli - kullanıcı yetkilendirilmemiş', () => {
            const middleware = requireRole(['admin']);
            const req = createMockRequest({
                user: { id: '123', email: 'user@test.com', role: 'user' },
            });
            const res = createMockResponse();
            const next = createMockNext();

            middleware(req as Request, res as Response, next as NextFunction);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                success: false,
                error: 'Bu işlem için yetkiniz bulunmuyor.',
                code: 'INSUFFICIENT_PERMISSIONS',
                required: ['admin'],
                current: 'user',
            });
            expect(next).not.toHaveBeenCalled();
        });

        it('next çağırmalı - kullanıcı yetkili', () => {
            const middleware = requireRole(['admin', 'alliance']);
            const req = createMockRequest({
                user: { id: '123', email: 'admin@test.com', role: 'admin' },
            });
            const res = createMockResponse();
            const next = createMockNext();

            middleware(req as Request, res as Response, next as NextFunction);

            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });

        it('401 hatası döndürmeli - user nesnesi yok', () => {
            const middleware = requireRole(['admin']);
            const req = createMockRequest();
            const res = createMockResponse();
            const next = createMockNext();

            middleware(req as Request, res as Response, next as NextFunction);

            expect(res.status).toHaveBeenCalledWith(401);
        });
    });
});
