import { Router } from 'express';
import { casesController } from '../controllers/casesController';
import { authMiddleware, requireAllianceOrAdmin, requireAdmin } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * /api/cases:
 *   get:
 *     summary: Get all cases
 *     tags: [Cases]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cases retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/CaseScenario'
 *       401:
 *         description: Unauthorized
 */
router.get('/', casesController.getAllCases);

/**
 * @swagger
 * /api/cases/{id}:
 *   get:
 *     summary: Get case by ID
 *     tags: [Cases]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Case ID
 *     responses:
 *       200:
 *         description: Case retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/CaseScenario'
 *       404:
 *         description: Case not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:id', authMiddleware, casesController.getCaseById);

/**
 * @swagger
 * /api/cases:
 *   post:
 *     summary: Create new case
 *     tags: [Cases]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *             properties:
 *               title:
 *                 type: string
 *                 description: Case title
 *               description:
 *                 type: string
 *                 description: Case description
 *               job_types:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Required job types
 *               specializations:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Required specializations
 *               requirements:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Case requirements
 *               initial_threshold:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 100
 *                 default: 70
 *               target_team_count:
 *                 type: integer
 *                 minimum: 1
 *                 default: 3
 *               ideal_team_size:
 *                 type: integer
 *                 minimum: 1
 *                 default: 8
 *     responses:
 *       201:
 *         description: Case created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/CaseScenario'
 *       400:
 *         description: Missing required fields
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions (requires alliance or admin role)
 */
router.post('/', authMiddleware, requireAllianceOrAdmin, casesController.createCase);

router.put('/:id', authMiddleware, requireAllianceOrAdmin, casesController.updateCase);
router.put('/:id/admin-message', authMiddleware, requireAdmin, casesController.updateCaseAdminMessage);
router.delete('/:id', authMiddleware, requireAdmin, casesController.deleteCase);

// Case statistics
router.get('/:id/stats', casesController.getCaseStats);
router.get('/:id/analytics', casesController.getCaseAnalytics);

// Team Members Management
router.get('/:id/team-members', casesController.getTeamMembers);
router.post('/:id/team-members', requireAllianceOrAdmin, casesController.addTeamMember);
router.put('/:id/team-members/:memberId', requireAllianceOrAdmin, casesController.updateTeamMember);
router.delete('/:id/team-members/:memberId', requireAllianceOrAdmin, casesController.removeTeamMember);

// Survey Assignments
router.post('/:id/team-members/:memberId/assign-survey', requireAllianceOrAdmin, casesController.assignSurveyToMember);
router.get('/:id/survey-assignments', casesController.getSurveyAssignments);

// Assessment Results
router.get('/:id/assessment-results', casesController.getAssessmentResults);
router.post('/:id/assessment-results', casesController.saveAssessmentResult);

// Adaptive Assessment Results - Ayrı endpoint
router.get('/:id/adaptive-assessment-results', casesController.getAdaptiveAssessmentResults);

// Team Recommendations
router.get('/:id/team-recommendations', casesController.getTeamRecommendations);
router.post('/:id/generate-teams', requireAllianceOrAdmin, casesController.generateTeams);

// Export functionality
router.get('/:id/export/excel', requireAllianceOrAdmin, casesController.exportCaseToExcel);
router.get('/:id/export/pdf', requireAllianceOrAdmin, casesController.exportCaseToPdf);

export default router;
