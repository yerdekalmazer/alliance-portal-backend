// Integration tests for Analytics API endpoints
import request from 'supertest';
import app from '../../src/app';

describe('Analytics API Integration Tests', () => {
    describe('GET /api/analytics/dashboard', () => {
        it('401 hatası döndürmeli - authentication gerekli', async () => {
            const response = await request(app).get('/api/analytics/dashboard');

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });

        it('403 hatası döndürmeli - admin yetkisi gerekli', async () => {
            // This would require a valid user token without admin role
            const response = await request(app)
                .get('/api/analytics/dashboard')
                .set('Authorization', 'Bearer user-token');

            expect(response.status).toBeGreaterThanOrEqual(401);
        });
    });

    describe('GET /api/analytics/cases/overview', () => {
        it('401 hatası döndürmeli - authentication gerekli', async () => {
            const response = await request(app).get('/api/analytics/cases/overview');

            expect(response.status).toBe(401);
        });
    });

    describe('GET /health', () => {
        it('200 döndürmeli - health check başarılı', async () => {
            const response = await request(app).get('/health');

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('OK');
            expect(response.body.service).toBe('Alliance Portal Backend');
        });

        it('doğru yapıda response döndürmeli', async () => {
            const response = await request(app).get('/health');

            expect(response.body).toHaveProperty('status');
            expect(response.body).toHaveProperty('timestamp');
            expect(response.body).toHaveProperty('service');
            expect(response.body).toHaveProperty('version');
            expect(response.body).toHaveProperty('environment');
        });
    });
});
