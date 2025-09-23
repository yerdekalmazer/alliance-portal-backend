import { Router } from 'express';
import { analyticsController } from '../controllers/analyticsController';
import { authMiddleware, requireAdmin } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * /api/analytics/dashboard:
 *   get:
 *     summary: Get dashboard statistics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard stats retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/DashboardStats'
 *       401:
 *         description: Unauthorized
 */
router.get('/dashboard', analyticsController.getDashboardStats);
router.get('/dashboard/charts', analyticsController.getDashboardCharts);

// Cases Analytics
router.get('/cases/overview', analyticsController.getCasesOverview);
router.get('/cases/:id/detailed', analyticsController.getCaseDetailedAnalytics);
router.get('/cases/comparison', analyticsController.getCasesComparison);

// Participants Analytics
router.get('/participants/overview', analyticsController.getParticipantsOverview);
router.get('/participants/distribution', analyticsController.getParticipantsDistribution);
router.get('/participants/performance', analyticsController.getParticipantsPerformance);

// Survey Analytics
router.get('/surveys/overview', analyticsController.getSurveysOverview);
router.get('/surveys/response-rates', analyticsController.getSurveyResponseRates);
router.get('/surveys/templates/:templateId/analytics', analyticsController.getSurveyTemplateAnalytics);

// Team Analytics
router.get('/teams/formation', analyticsController.getTeamFormationAnalytics);
router.get('/teams/performance', analyticsController.getTeamPerformanceAnalytics);
router.get('/teams/success-rates', analyticsController.getTeamSuccessRates);

// Time-based Analytics
router.get('/trends/monthly', analyticsController.getMonthlyTrends);
router.get('/trends/weekly', analyticsController.getWeeklyTrends);
router.get('/trends/participation', analyticsController.getParticipationTrends);

// Export Analytics (Admin only)
router.get('/export/data', authMiddleware, requireAdmin, analyticsController.exportAnalyticsData);
router.get('/export/excel', authMiddleware, requireAdmin, analyticsController.exportAnalyticsToExcel);
router.get('/export/csv', authMiddleware, requireAdmin, analyticsController.exportAnalyticsToCSV);
router.get('/export/pdf', authMiddleware, requireAdmin, analyticsController.exportAnalyticsToPDF);

// Custom Reports (Admin only)
router.post('/reports/custom', authMiddleware, requireAdmin, analyticsController.generateCustomReport);
router.get('/reports/scheduled', authMiddleware, requireAdmin, analyticsController.getScheduledReports);

export default router;
