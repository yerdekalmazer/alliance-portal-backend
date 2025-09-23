import { Router } from 'express';
import { adaptiveTechnicalAssessmentController } from '../controllers/adaptiveTechnicalAssessmentController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * /api/adaptive-technical-assessment/generate:
 *   post:
 *     summary: Generate adaptive technical assessment
 *     tags: [Adaptive Technical Assessment]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - case_id
 *               - job_types
 *             properties:
 *               case_id:
 *                 type: string
 *                 description: Case ID for the assessment
 *               job_types:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of job types to assess
 *     responses:
 *       200:
 *         description: Adaptive assessment generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     jobTypeGroups:
 *                       type: array
 *                       items:
 *                         type: object
 *                     config:
 *                       type: object
 *                     assessmentType:
 *                       type: string
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid request parameters
 *       500:
 *         description: Server error
 */
router.post('/generate', authMiddleware, adaptiveTechnicalAssessmentController.generateAdaptiveAssessment);

/**
 * @swagger
 * /api/adaptive-technical-assessment/analyze:
 *   post:
 *     summary: Analyze adaptive technical assessment results
 *     tags: [Adaptive Technical Assessment]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - responses
 *               - job_types
 *             properties:
 *               responses:
 *                 type: object
 *                 description: User responses to questions
 *               job_types:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of job types assessed
 *               phase_scores:
 *                 type: object
 *                 description: Phase-wise scores from frontend
 *               assessment_state:
 *                 type: object
 *                 description: Current assessment state
 *     responses:
 *       200:
 *         description: Analysis completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     overallScore:
 *                       type: number
 *                     maxScore:
 *                       type: number
 *                     overallPercentage:
 *                       type: number
 *                     jobTypeAnalysis:
 *                       type: array
 *                     adaptiveInsights:
 *                       type: array
 *                     progressiveDevelopment:
 *                       type: object
 *                     assessmentType:
 *                       type: string
 *                     config:
 *                       type: object
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid request parameters
 *       500:
 *         description: Server error
 */
router.post('/analyze', authMiddleware, adaptiveTechnicalAssessmentController.analyzeAdaptiveAssessment);

export { router as adaptiveTechnicalAssessmentRouter };







