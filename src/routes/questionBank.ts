import { Router } from 'express';
import { questionBankController } from '../controllers/questionBankController';
import { authMiddleware, requireAdmin } from '../middleware/auth';

const router = Router();

// Public read
router.get('/questions', questionBankController.listQuestions);

// Dynamic questions generation for surveys (public endpoint for surveys)
router.post('/generate-dynamic', (req, res, next) => questionBankController.generateDynamicQuestions(req, res, next));

// Protected write
router.post('/questions', authMiddleware, requireAdmin, questionBankController.createQuestion);
router.put('/questions/:id', authMiddleware, requireAdmin, questionBankController.updateQuestion);
router.delete('/questions/:id', authMiddleware, requireAdmin, questionBankController.deleteQuestion);

export default router;


