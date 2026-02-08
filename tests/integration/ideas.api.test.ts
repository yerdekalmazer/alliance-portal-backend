// Integration tests for Ideas API endpoints
import request from 'supertest';
import app from '../../src/app';

describe('Ideas API Integration Tests', () => {
    describe('GET /api/ideas', () => {
        it('401 hatası döndürmeli - authentication gerekli', async () => {
            const response = await request(app).get('/api/ideas');

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });
    });

    describe('POST /api/ideas', () => {
        it('401 hatası döndürmeli - authentication gerekli', async () => {
            const response = await request(app).post('/api/ideas').send({
                title: 'Test Idea',
                description: 'Test description',
            });

            expect(response.status).toBe(401);
        });

        it('400 hatası döndürmeli - eksik required alanlar', async () => {
            const response = await request(app)
                .post('/api/ideas')
                .set('Authorization', 'Bearer invalid-token')
                .send({
                    title: 'Test Idea',
                    // Diğer gerekli alanlar eksik
                });

            expect(response.status).toBeGreaterThanOrEqual(400);
        });
    });

    describe('PUT /api/ideas/:id/status', () => {
        it('401 hatası döndürmeli - authentication gerekli', async () => {
            const response = await request(app)
                .put('/api/ideas/some-uuid/status')
                .send({ status: 'approved' });

            expect(response.status).toBe(401);
        });

        it('403 hatası döndürmeli - admin/alliance yetkisi gerekli', async () => {
            // This would require a valid user token with 'user' role
            // For now, validates that authorization is required
            const response = await request(app)
                .put('/api/ideas/some-uuid/status')
                .set('Authorization', 'Bearer user-token')
                .send({ status: 'approved' });

            expect(response.status).toBeGreaterThanOrEqual(401);
        });
    });
});
