import { Router } from 'express';
import { caseProposalsController } from '../controllers/caseProposalsController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Submission requires auth so we can bind to the current user
router.post('/', authMiddleware, caseProposalsController.submit);

// Admin list and status update
router.get('/', authMiddleware, caseProposalsController.list);
router.put('/:id/status', authMiddleware, caseProposalsController.updateStatus);

export default router;


