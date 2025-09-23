import { Router } from 'express';
import { applicationsController } from '../controllers/applicationsController';
import { authMiddleware, requireAdmin } from '../middleware/auth';

const router = Router();

// Get all applications (admin/alliance only)
router.get('/', authMiddleware, requireAdmin, applicationsController.getAllApplications);

// Get application by ID (admin/alliance only)
router.get('/:id', authMiddleware, requireAdmin, applicationsController.getApplicationById);

// Update application status (admin/alliance only)
router.put('/:id/status', authMiddleware, requireAdmin, applicationsController.updateApplicationStatus);

// Get application statistics (admin/alliance only)
router.get('/stats/overview', authMiddleware, requireAdmin, applicationsController.getApplicationStats);

export default router;

