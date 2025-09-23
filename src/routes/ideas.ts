import { Router } from 'express';
import { ideasController } from '../controllers/ideasController';
import { authMiddleware, requireAllianceOrAdmin, requireAdmin } from '../middleware/auth';

const router = Router();

// PUBLIC ENDPOINTS FIRST (no auth required)
router.get('/public/featured', ideasController.getFeaturedIdeas);
router.get('/public/categories', ideasController.getIdeaCategories);

// SPECIFIC ROUTES FIRST (before parametrized routes)
router.get('/my', authMiddleware, ideasController.getMyIdeas);
router.get('/analytics/overview', authMiddleware, requireAdmin, ideasController.getIdeasOverview);

// Ideas by Status
router.get('/status/pending', authMiddleware, requireAdmin, ideasController.getPendingIdeas);
router.get('/status/approved', authMiddleware, ideasController.getApprovedIdeas);
router.get('/status/rejected', authMiddleware, requireAdmin, ideasController.getRejectedIdeas);

// Ideas by User
router.get('/user/:userId', authMiddleware, ideasController.getIdeasByUser);

// Ideas CRUD (with parameters)
router.get('/', authMiddleware, ideasController.getAllIdeas);
router.post('/', authMiddleware, ideasController.createIdea); // Any authenticated user can submit ideas
router.get('/:id', authMiddleware, ideasController.getIdeaById);
router.put('/:id', authMiddleware, ideasController.updateIdea);
router.delete('/:id', authMiddleware, ideasController.deleteIdea);

// Ideas Management (Admin only)
router.put('/:id/status', authMiddleware, requireAdmin, ideasController.updateIdeaStatus);
router.post('/:id/approve', authMiddleware, requireAdmin, ideasController.approveIdea);
router.post('/:id/reject', authMiddleware, requireAdmin, ideasController.rejectIdea);

// Canvas Management
router.get('/:id/canvas', authMiddleware, ideasController.getIdeaCanvas);
router.post('/:id/canvas', authMiddleware, requireAllianceOrAdmin, ideasController.createCanvas);
router.put('/:id/canvas', authMiddleware, requireAllianceOrAdmin, ideasController.updateCanvas);
router.delete('/:id/canvas', authMiddleware, requireAdmin, ideasController.deleteCanvas);

// Convert Idea to Case
router.post('/:id/convert-to-case', authMiddleware, requireAllianceOrAdmin, ideasController.convertIdeaToCase);

// Idea Comments/Feedback (if needed)
router.get('/:id/comments', authMiddleware, ideasController.getIdeaComments);
router.post('/:id/comments', authMiddleware, ideasController.addIdeaComment);

// Idea Analytics (specific ID based)
router.get('/:id/analytics', authMiddleware, requireAdmin, ideasController.getIdeaAnalytics);

export default router;
