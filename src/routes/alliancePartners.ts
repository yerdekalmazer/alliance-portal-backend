import { Router } from 'express';
import { alliancePartnersController } from '../controllers/alliancePartnersController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     AlliancePartner:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         email:
 *           type: string
 *           format: email
 *         full_name:
 *           type: string
 *         phone:
 *           type: string
 *           nullable: true
 *         organization:
 *           type: string
 *           nullable: true
 *         position:
 *           type: string
 *           nullable: true
 *         expertise:
 *           type: array
 *           items:
 *             type: string
 *         status:
 *           type: string
 *           enum: [active, inactive, suspended]
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *         last_login_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         profile_completed:
 *           type: boolean
 *         auth_user_id:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         notes:
 *           type: string
 *           nullable: true
 *         contact_preference:
 *           type: string
 *           enum: [email, phone, both]
 *     
 *     CreateAlliancePartnerRequest:
 *       type: object
 *       required:
 *         - fullName
 *         - email
 *         - password
 *       properties:
 *         fullName:
 *           type: string
 *           minLength: 2
 *           maxLength: 100
 *         email:
 *           type: string
 *           format: email
 *         password:
 *           type: string
 *           minLength: 6
 *         phone:
 *           type: string
 *           nullable: true
 *         organization:
 *           type: string
 *           nullable: true
 *         position:
 *           type: string
 *           nullable: true
 *         expertise:
 *           type: array
 *           items:
 *             type: string
 *         status:
 *           type: string
 *           enum: [active, inactive, suspended]
 *           default: active
 *         notes:
 *           type: string
 *           nullable: true
 *         contactPreference:
 *           type: string
 *           enum: [email, phone, both]
 *           default: email
 * 
 *     UpdateAlliancePartnerRequest:
 *       type: object
 *       properties:
 *         fullName:
 *           type: string
 *           minLength: 2
 *           maxLength: 100
 *         email:
 *           type: string
 *           format: email
 *         password:
 *           type: string
 *           minLength: 6
 *         phone:
 *           type: string
 *           nullable: true
 *         organization:
 *           type: string
 *           nullable: true
 *         position:
 *           type: string
 *           nullable: true
 *         expertise:
 *           type: array
 *           items:
 *             type: string
 *         status:
 *           type: string
 *           enum: [active, inactive, suspended]
 *         notes:
 *           type: string
 *           nullable: true
 *         contactPreference:
 *           type: string
 *           enum: [email, phone, both]
 */

/**
 * @swagger
 * /api/alliance-partners:
 *   get:
 *     summary: Get all alliance partners (Admin only)
 *     tags: [Alliance Partners]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, suspended]
 *         description: Filter partners by status
 *       - in: query
 *         name: organization
 *         schema:
 *           type: string
 *         description: Filter partners by organization (partial match)
 *     responses:
 *       200:
 *         description: Alliance partners retrieved successfully
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
 *                         $ref: '#/components/schemas/AlliancePartner'
 *       403:
 *         description: Admin access required
 *       401:
 *         description: Unauthorized
 */
router.get('/', authMiddleware, alliancePartnersController.getAllPartners);

/**
 * @swagger
 * /api/alliance-partners/stats:
 *   get:
 *     summary: Get alliance partner statistics (Admin only)
 *     tags: [Alliance Partners]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Alliance partner statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         totalPartners:
 *                           type: integer
 *                         activePartners:
 *                           type: integer
 *                         inactivePartners:
 *                           type: integer
 *                         suspendedPartners:
 *                           type: integer
 *                         organizationCount:
 *                           type: integer
 *                         statusDistribution:
 *                           type: object
 *       403:
 *         description: Admin access required
 *       401:
 *         description: Unauthorized
 */
router.get('/stats', authMiddleware, alliancePartnersController.getPartnerStats);

/**
 * @swagger
 * /api/alliance-partners:
 *   post:
 *     summary: Create new alliance partner (Admin only)
 *     tags: [Alliance Partners]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateAlliancePartnerRequest'
 *     responses:
 *       201:
 *         description: Alliance partner created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/AlliancePartner'
 *       400:
 *         description: Invalid input or missing required fields
 *       403:
 *         description: Admin access required
 *       401:
 *         description: Unauthorized
 */
router.post('/', authMiddleware, alliancePartnersController.createPartner);

/**
 * @swagger
 * /api/alliance-partners/{partnerId}:
 *   get:
 *     summary: Get alliance partner by ID (Admin or self)
 *     tags: [Alliance Partners]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: partnerId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Alliance Partner ID
 *     responses:
 *       200:
 *         description: Alliance partner retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/AlliancePartner'
 *       404:
 *         description: Alliance partner not found
 *       403:
 *         description: Insufficient permissions
 *       401:
 *         description: Unauthorized
 */
router.get('/:partnerId', authMiddleware, alliancePartnersController.getPartnerById);

/**
 * @swagger
 * /api/alliance-partners/{partnerId}:
 *   put:
 *     summary: Update alliance partner (Admin or self)
 *     tags: [Alliance Partners]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: partnerId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Alliance Partner ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateAlliancePartnerRequest'
 *     responses:
 *       200:
 *         description: Alliance partner updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/AlliancePartner'
 *       400:
 *         description: Invalid input
 *       403:
 *         description: Insufficient permissions
 *       401:
 *         description: Unauthorized
 */
router.put('/:partnerId', authMiddleware, alliancePartnersController.updatePartner);

/**
 * @swagger
 * /api/alliance-partners/{partnerId}:
 *   delete:
 *     summary: Delete alliance partner (Admin only)
 *     tags: [Alliance Partners]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: partnerId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Alliance Partner ID
 *     responses:
 *       200:
 *         description: Alliance partner deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       404:
 *         description: Alliance partner not found
 *       403:
 *         description: Admin access required
 *       401:
 *         description: Unauthorized
 */
router.delete('/:partnerId', authMiddleware, alliancePartnersController.deletePartner);

export default router;

