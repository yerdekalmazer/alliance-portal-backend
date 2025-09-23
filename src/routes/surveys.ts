import { Router } from 'express';
import { surveyController } from '../controllers/surveyController';
import { authMiddleware, requireAdmin, requireAllianceOrAdmin } from '../middleware/auth';

const router = Router();

// Survey Templates Management (Temporarily public for testing)
router.get('/templates', surveyController.getSurveyTemplates);
router.get('/templates/:id', authMiddleware, surveyController.getSurveyTemplateById);
router.post('/templates', authMiddleware, requireAllianceOrAdmin, surveyController.createSurveyTemplate);
router.put('/templates/:id', authMiddleware, requireAllianceOrAdmin, surveyController.updateSurveyTemplate);
router.delete('/templates/:id', authMiddleware, requireAdmin, surveyController.deleteSurveyTemplate);

// Survey Links Management
router.get('/links', authMiddleware, surveyController.getSurveyLinks);
router.post('/links', authMiddleware, requireAllianceOrAdmin, surveyController.createSurveyLink);
router.get('/links/:id', surveyController.getSurveyLinkById); // Public - for survey access
router.put('/links/:id', authMiddleware, requireAllianceOrAdmin, surveyController.updateSurveyLink);
router.delete('/links/:id', authMiddleware, requireAdmin, surveyController.deleteSurveyLink);

// Survey Responses (Some endpoints are public for survey submissions)
router.get('/responses', authMiddleware, surveyController.getSurveyResponses);
router.get('/responses/:id', authMiddleware, surveyController.getSurveyResponseById);
router.post('/responses', surveyController.submitSurveyResponse); // Public endpoint
router.put('/responses/:id', surveyController.updateSurveyResponse); // Public - for editing responses
router.delete('/responses/:id', authMiddleware, requireAdmin, surveyController.deleteSurveyResponse);

// Dynamic Survey Generation
router.post('/generate-dynamic', authMiddleware, surveyController.generateDynamicSurvey);
router.post('/templates/:templateId/generate-for-case/:caseId', authMiddleware, surveyController.generateSurveyForCase);

// Survey Analytics
router.get('/analytics/responses-summary', authMiddleware, surveyController.getResponsesSummary);
router.get('/analytics/template/:templateId', authMiddleware, surveyController.getTemplateAnalytics);
router.get('/analytics/case/:caseId', authMiddleware, surveyController.getCaseSurveyAnalytics);

// Public Survey Access (no auth required)
router.get('/public/:linkId', surveyController.getPublicSurvey);
router.post('/public/:linkId/submit', surveyController.submitPublicSurvey);

// Technical Assessment (requires auth)
router.post('/technical-assessment/generate', authMiddleware, surveyController.generateTechnicalAssessment);
router.post('/technical-assessment/analyze', authMiddleware, surveyController.analyzeTechnicalAssessment);

export default router;
