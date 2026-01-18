import { Router } from 'express';
import { archivedCasesController } from '../controllers/archivedCasesController';
import { authMiddleware, requireAdmin, requireAllianceOrAdmin } from '../middleware/auth';

const router = Router();

// Get all archived cases (public)
router.get('/', archivedCasesController.getAllArchivedCases);

// Get archived case by ID
router.get('/:id', archivedCasesController.getArchivedCaseById);

// Create archived case (when completing a case)
router.post('/', authMiddleware, requireAllianceOrAdmin, archivedCasesController.createArchivedCase);

// Update archived case
router.put('/:id', authMiddleware, requireAllianceOrAdmin, archivedCasesController.updateArchivedCase);

// Delete archived case
router.delete('/:id', authMiddleware, requireAdmin, archivedCasesController.deleteArchivedCase);

export default router;
