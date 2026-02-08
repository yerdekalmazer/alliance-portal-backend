// Integration tests for Authentication API endpoints
import request from 'supertest';
import app from '../../src/app';

describe('Authentication API Integration Tests', () => {
    describe('POST /api/auth/register', () => {
        it('400 hatası döndürmeli - eksik alanlar', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    email: 'test@example.com',
                    // name ve password eksik
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it('400 hatası döndürmeli - geçersiz email formatı', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'Test User',
                    email: 'invalid-email',
                    password: 'Test123!',
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it('400 hatası döndürmeli - kısa şifre', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    name: 'Test User',
                    email: 'test@example.com',
                    password: '123',
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        // Note: Successful registration test requires Supabase setup
        // and should be run in a test environment with proper database
    });

    describe('POST /api/auth/login', () => {
        it('400 hatası döndürmeli - eksik alanlar', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'test@example.com',
                    // password eksik
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it('401 hatası döndürmeli - geçersiz credentials', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'nonexistent@example.com',
                    password: 'WrongPassword123!',
                });

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });

        // Note: Successful login test requires Supabase setup
    });

    describe('GET /api/auth/profile', () => {
        it('401 hatası döndürmeli - token yok', async () => {
            const response = await request(app).get('/api/auth/profile');

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
            expect(response.body.code).toBe('NO_AUTH_HEADER');
        });

        it('401 hatası döndürmeli - geçersiz token', async () => {
            const response = await request(app)
                .get('/api/auth/profile')
                .set('Authorization', 'Bearer invalid-token');

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });

        // Note: Successful profile fetch requires valid token
    });

    describe('POST /api/auth/logout', () => {
        it('400 hatası döndürmeli - token yok', async () => {
            const response = await request(app).post('/api/auth/logout');

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });
});
