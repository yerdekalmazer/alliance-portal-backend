import { Router } from 'express';
import { uploadController } from '../controllers/uploadController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// All upload routes require authentication
router.use(authMiddleware);

/**
 * @swagger
 * /api/upload:
 *   post:
 *     summary: Upload files
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Files to upload (max 5 files, 10MB each)
 *     responses:
 *       200:
 *         description: Files uploaded successfully
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
 *                         files:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               originalName:
 *                                 type: string
 *                               fileName:
 *                                 type: string
 *                               size:
 *                                 type: number
 *                               mimeType:
 *                                 type: string
 *                               url:
 *                                 type: string
 *                               storagePath:
 *                                 type: string
 *                         uploadedCount:
 *                           type: number
 *       400:
 *         description: Bad request (no files, invalid file type, etc.)
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Upload failed
 */
router.post('/', uploadController.getUploadMiddleware(), uploadController.uploadFiles);

/**
 * @swagger
 * /api/upload/my-files:
 *   get:
 *     summary: Get current user's uploaded files
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User files retrieved successfully
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
 *                         files:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               name:
 *                                 type: string
 *                               size:
 *                                 type: number
 *                               lastModified:
 *                                 type: string
 *                               url:
 *                                 type: string
 *                               mimeType:
 *                                 type: string
 *                         totalFiles:
 *                           type: number
 *       401:
 *         description: Unauthorized
 */
router.get('/my-files', uploadController.getUserFiles);

/**
 * @swagger
 * /api/upload/{fileName}:
 *   get:
 *     summary: Get file information
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: fileName
 *         required: true
 *         schema:
 *           type: string
 *         description: File name/path in storage
 *     responses:
 *       200:
 *         description: File info retrieved successfully
 *       404:
 *         description: File not found
 *       401:
 *         description: Unauthorized
 */
router.get('/info/:fileName', uploadController.getFileInfo);

/**
 * @swagger
 * /api/upload/{fileName}:
 *   delete:
 *     summary: Delete a file
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: fileName
 *         required: true
 *         schema:
 *           type: string
 *         description: File name/path in storage
 *     responses:
 *       200:
 *         description: File deleted successfully
 *       404:
 *         description: File not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Delete failed
 */
router.delete('/delete/:fileName', uploadController.deleteFile);

export default router;
