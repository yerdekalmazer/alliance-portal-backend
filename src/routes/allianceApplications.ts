import { Router } from 'express';
import { 
  submitAllianceApplication, 
  getAllianceApplications, 
  getAllianceApplicationById, 
  updateAllianceApplicationStatus, 
  getAllianceApplicationStats,
  deleteAllianceApplication 
} from '../controllers/allianceApplicationsController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * /api/alliance-applications:
 *   post:
 *     summary: Submit alliance application
 *     tags: [Alliance Applications]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - organizationName
 *               - email
 *               - profile
 *               - motivation
 *               - roles
 *               - archetype
 *               - confirmAccuracy
 *               - confirmContact
 *             properties:
 *               organizationName:
 *                 type: string
 *                 example: "Tech Startup Inc"
 *               website:
 *                 type: string
 *                 example: "https://techstartup.com"
 *               profile:
 *                 type: string
 *                 example: "Teknolojik ve Kreatif Çözüm Ortağı"
 *               contactName:
 *                 type: string
 *                 example: "John Doe"
 *               contactTitle:
 *                 type: string
 *                 example: "CEO"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "john@techstartup.com"
 *               phone:
 *                 type: string
 *                 example: "+1234567890"
 *               motivation:
 *                 type: string
 *                 example: "We want to contribute to the ecosystem..."
 *               roles:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["İnovasyon Ortağı", "Mentor / Uzman"]
 *               otherRole:
 *                 type: string
 *                 example: "Custom role description"
 *               archetype:
 *                 type: string
 *                 example: "Yönlendirici"
 *               contribution:
 *                 type: string
 *                 example: "We can provide technical expertise..."
 *               confirmAccuracy:
 *                 type: boolean
 *                 example: true
 *               confirmContact:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       201:
 *         description: Application submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Application submitted successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     status:
 *                       type: string
 *                       example: "pending"
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
router.post('/', submitAllianceApplication);

/**
 * @swagger
 * /api/alliance-applications:
 *   get:
 *     summary: Get alliance applications (admin only)
 *     tags: [Alliance Applications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, reviewed, approved, rejected]
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: Applications retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/', authMiddleware, getAllianceApplications);

/**
 * @swagger
 * /api/alliance-applications/{id}:
 *   get:
 *     summary: Get alliance application by ID (admin only)
 *     tags: [Alliance Applications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Application ID
 *     responses:
 *       200:
 *         description: Application retrieved successfully
 *       404:
 *         description: Application not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/:id', authMiddleware, getAllianceApplicationById);

/**
 * @swagger
 * /api/alliance-applications/{id}/status:
 *   put:
 *     summary: Update alliance application status (admin only)
 *     tags: [Alliance Applications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Application ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, reviewed, approved, rejected]
 *                 example: "approved"
 *               adminNotes:
 *                 type: string
 *                 example: "Great application, approved for partnership"
 *     responses:
 *       200:
 *         description: Application status updated successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.put('/:id/status', authMiddleware, updateAllianceApplicationStatus);

/**
 * @swagger
 * /api/alliance-applications/stats/overview:
 *   get:
 *     summary: Get alliance application statistics (admin only)
 *     tags: [Alliance Applications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 25
 *                     pending:
 *                       type: integer
 *                       example: 10
 *                     reviewed:
 *                       type: integer
 *                       example: 8
 *                     approved:
 *                       type: integer
 *                       example: 5
 *                     rejected:
 *                       type: integer
 *                       example: 2
 *                     statusDistribution:
 *                       type: object
 *                       example: {"pending": 10, "reviewed": 8, "approved": 5, "rejected": 2}
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/stats/overview', authMiddleware, getAllianceApplicationStats);

/**
 * @swagger
 * /api/alliance-applications/{id}:
 *   delete:
 *     summary: Delete alliance application (Admin only)
 *     tags: [Alliance Applications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Application ID
 *     responses:
 *       200:
 *         description: Application deleted successfully
 *       404:
 *         description: Application not found
 *       403:
 *         description: Admin access required
 *       401:
 *         description: Unauthorized
 */
router.delete('/:id', authMiddleware, deleteAllianceApplication);

export default router;
