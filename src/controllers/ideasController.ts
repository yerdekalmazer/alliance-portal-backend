import { Request, Response, NextFunction } from 'express';
import { supabase, supabaseAdmin } from '../config/database';
import { ApiResponse } from '../models/types';

class IdeasController {
  // Ideas CRUD
  async getAllIdeas(req: Request, res: Response, next: NextFunction) {
    try {
      console.log('📋 Fetching all ideas with filters:', {
        query: req.query,
        user: (req as any).user
      });

      if (!supabaseAdmin) {
        return res.status(500).json({
          success: false,
          error: 'Service role key not configured',
          code: 'SERVICE_ROLE_MISSING'
        } as ApiResponse);
      }

      // Get query parameters for filtering
      const { status, category, submitted_by } = req.query;

      let query = supabaseAdmin
        .from('idea_submissions' as any)
        .select('*')
        .order('submitted_at', { ascending: false });

      // Apply filters
      if (status && ['pending', 'approved', 'rejected'].includes(status as string)) {
        query = query.eq('status', status as 'pending' | 'approved' | 'rejected');
      }
      if (category) {
        query = query.eq('category', category as string);
      }
      if (submitted_by) {
        query = query.eq('submitted_by', submitted_by as string);
      }

      const { data: ideas, error } = await query;

      if (error) {
        console.error('❌ Failed to fetch ideas:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch ideas',
          code: 'FETCH_FAILED',
          details: error.message
        } as ApiResponse);
      }

      // Map snake_case to camelCase for frontend
      const mappedIdeas = (ideas || []).map((idea: any) => ({
        id: (idea as any).id,
        title: (idea as any).title,
        description: (idea as any).description,
        category: (idea as any).category,
        problemDefinition: (idea as any).problem_definition,
        targetAudience: (idea as any).target_audience,
        expectedOutcome: (idea as any).expected_outcome,
        pmArchetype: (idea as any).pm_archetype,
        submittedBy: 'Alliance Partner', // Temporary - will be enhanced later
        submittedById: (idea as any).submitted_by,
        submittedAt: new Date((idea as any).submitted_at),
        status: (idea as any).status,
        rejectionReason: (idea as any).rejection_reason,
        stage: (idea as any).stage,
        marketSize: (idea as any).market_size,
        expectedROI: (idea as any).expected_roi,
        timeline: (idea as any).timeline,
        budget: (idea as any).budget,
        tags: (idea as any).tags || [],
        createdAt: new Date((idea as any).created_at),
        updatedAt: new Date((idea as any).updated_at)
      }));

      console.log('✅ Ideas fetched successfully:', {
        count: mappedIdeas.length,
        ideas: mappedIdeas.map(i => ({ id: i.id, title: i.title, status: i.status }))
      });

      res.json({
        success: true,
        data: mappedIdeas,
        message: 'Ideas retrieved successfully'
      } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }

  async getIdeaById(req: Request, res: Response, next: NextFunction) {
    try {
      if (!supabaseAdmin) {
        return res.status(500).json({
          success: false,
          error: 'Service role key not configured',
          code: 'SERVICE_ROLE_MISSING'
        } as ApiResponse);
      }

      const { id } = req.params;

      const { data: idea, error } = await supabaseAdmin
        .from('idea_submissions' as any)
        .select('*')
        .eq('id', id)
        .single();

      if (error || !idea) {
        return res.status(404).json({
          success: false,
          error: 'Idea not found',
          code: 'IDEA_NOT_FOUND'
        } as ApiResponse);
      }

      // Map snake_case to camelCase for frontend
      const mappedIdea = {
        id: (idea as any).id,
        title: (idea as any).title,
        description: (idea as any).description,
        category: (idea as any).category,
        problemDefinition: (idea as any).problem_definition,
        targetAudience: (idea as any).target_audience,
        expectedOutcome: (idea as any).expected_outcome,
        pmArchetype: (idea as any).pm_archetype,
        submittedBy: 'Alliance Partner', // Temporary - will be enhanced later
        submittedById: (idea as any).submitted_by,
        submittedAt: new Date((idea as any).submitted_at),
        status: (idea as any).status,
        rejectionReason: (idea as any).rejection_reason,
        stage: (idea as any).stage,
        marketSize: (idea as any).market_size,
        expectedROI: (idea as any).expected_roi,
        timeline: (idea as any).timeline,
        budget: (idea as any).budget,
        tags: (idea as any).tags || [],
        createdAt: new Date((idea as any).created_at),
        updatedAt: new Date((idea as any).updated_at)
      };

      res.json({
        success: true,
        data: mappedIdea,
        message: 'Idea retrieved successfully'
      } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }

  async createIdea(req: Request, res: Response, next: NextFunction) {
    try {
      console.log('💡 Creating new idea submission:', {
        body: req.body,
        user: (req as any).user,
        userId: (req as any).userId
      });

      const {
        title,
        description,
        category,
        problem_definition,
        target_audience,
        expected_outcome,
        pm_archetype,
        stage,
        market_size,
        expected_roi,
        timeline,
        budget,
        attachments = [],
        tags = []
      } = req.body;

      // Validate required fields
      if (!title || !description || !category) {
        return res.status(400).json({
          success: false,
          error: 'Title, description and category are required',
          code: 'MISSING_FIELDS'
        } as ApiResponse);
      }

      if (!supabaseAdmin) {
        return res.status(500).json({
          success: false,
          error: 'Service role key not configured',
          code: 'SERVICE_ROLE_MISSING'
        } as ApiResponse);
      }

      // Get user from auth middleware
      const userId = (req as any).user?.id || (req as any).userId;
      const userName = (req as any).user?.name || (req as any).user?.email || 'Unknown User';

      const ideaInsertData = {
        title,
        description,
        category,
        problem_definition,
        target_audience,
        expected_outcome,
        pm_archetype,
        stage,
        market_size,
        expected_roi,
        timeline,
        budget,
        tags,
        submitted_by: userId, // Use userId for foreign key reference
        status: 'pending'
      };

      console.log('💾 Inserting idea with data:', ideaInsertData);

      const { data: idea, error } = await supabaseAdmin
        .from('idea_submissions' as any)
        .insert(ideaInsertData)
        .select('*')
        .single();

      if (error) {
        console.error('❌ Failed to create idea:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to create idea',
          code: 'CREATE_FAILED',
          details: error.message
        } as ApiResponse);
      }

      // Map snake_case to camelCase for frontend
      const mappedIdea = {
        id: (idea as any).id,
        title: (idea as any).title,
        description: (idea as any).description,
        category: (idea as any).category,
        problemDefinition: (idea as any).problem_definition,
        targetAudience: (idea as any).target_audience,
        expectedOutcome: (idea as any).expected_outcome,
        pmArchetype: (idea as any).pm_archetype,
        submittedBy: 'Alliance Partner', // Temporary - will be enhanced later
        submittedById: (idea as any).submitted_by,
        submittedAt: new Date((idea as any).submitted_at),
        status: (idea as any).status,
        rejectionReason: (idea as any).rejection_reason,
        stage: (idea as any).stage,
        marketSize: (idea as any).market_size,
        expectedROI: (idea as any).expected_roi,
        timeline: (idea as any).timeline,
        budget: (idea as any).budget,
        tags: (idea as any).tags || [],
        createdAt: new Date((idea as any).created_at),
        updatedAt: new Date((idea as any).updated_at)
      };

      console.log('✅ Idea created successfully:', mappedIdea);

      res.status(201).json({
        success: true,
        data: mappedIdea,
        message: 'Idea submitted successfully'
      } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }

  async updateIdea(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({
        success: true,
        data: { message: 'Update idea - coming soon' },
        message: 'Feature coming soon'
      } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }

  async deleteIdea(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({
        success: true,
        message: 'Delete idea - coming soon'
      } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }

  // Ideas Management
  async updateIdeaStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status, rejection_reason } = req.body;

      // Validate status
      if (!['pending', 'approved', 'rejected'].includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'Status must be pending, approved, or rejected',
          code: 'INVALID_STATUS'
        } as ApiResponse);
      }

      // If rejected, require rejection reason
      if (status === 'rejected' && !rejection_reason) {
        return res.status(400).json({
          success: false,
          error: 'Rejection reason is required when rejecting an idea',
          code: 'MISSING_REJECTION_REASON'
        } as ApiResponse);
      }

      if (!supabaseAdmin) {
        return res.status(500).json({
          success: false,
          error: 'Service role key not configured',
          code: 'SERVICE_ROLE_MISSING'
        } as ApiResponse);
      }

      const updateData: any = {
        status,
        updated_at: new Date().toISOString()
      };

      if (status === 'rejected' && rejection_reason) {
        updateData.rejection_reason = rejection_reason;
      }

      const { data: idea, error } = await supabaseAdmin
        .from('idea_submissions' as any)
        .update(updateData)
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        return res.status(500).json({
          success: false,
          error: 'Failed to update idea status',
          code: 'UPDATE_FAILED'
        } as ApiResponse);
      }

      if (!idea) {
        return res.status(404).json({
          success: false,
          error: 'Idea not found',
          code: 'IDEA_NOT_FOUND'
        } as ApiResponse);
      }

      // Map snake_case to camelCase for frontend
      const mappedIdea = {
        id: (idea as any).id,
        title: (idea as any).title,
        description: (idea as any).description,
        category: (idea as any).category,
        problemDefinition: (idea as any).problem_definition,
        targetAudience: (idea as any).target_audience,
        expectedOutcome: (idea as any).expected_outcome,
        pmArchetype: (idea as any).pm_archetype,
        submittedBy: 'Alliance Partner', // Temporary - will be enhanced later
        submittedById: (idea as any).submitted_by,
        submittedAt: new Date((idea as any).submitted_at),
        status: (idea as any).status,
        rejectionReason: (idea as any).rejection_reason,
        stage: (idea as any).stage,
        marketSize: (idea as any).market_size,
        expectedROI: (idea as any).expected_roi,
        timeline: (idea as any).timeline,
        budget: (idea as any).budget,
        tags: (idea as any).tags || [],
        createdAt: new Date((idea as any).created_at),
        updatedAt: new Date((idea as any).updated_at)
      };

      res.json({
        success: true,
        data: mappedIdea,
        message: `Idea ${status} successfully`
      } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }

  async approveIdea(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({
        success: true,
        data: { message: 'Approve idea - coming soon' },
        message: 'Feature coming soon'
      } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }

  async rejectIdea(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({
        success: true,
        data: { message: 'Reject idea - coming soon' },
        message: 'Feature coming soon'
      } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }

  // Ideas by User
  async getIdeasByUser(req: Request, res: Response, next: NextFunction) {
    try {
      if (!supabaseAdmin) {
        return res.status(500).json({
          success: false,
          error: 'Service role key not configured',
          code: 'SERVICE_ROLE_MISSING'
        } as ApiResponse);
      }

      const { userId } = req.params;
      const { status } = req.query;

      let query = supabaseAdmin
        .from('idea_submissions' as any)
        .select('*')
        .eq('submitted_by', userId)
        .order('submitted_at', { ascending: false });

      // Apply status filter if provided
      if (status && ['pending', 'approved', 'rejected'].includes(status as string)) {
        query = query.eq('status', status as string);
      }

      const { data: ideas, error } = await query;

      if (error) {
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch user ideas',
          code: 'FETCH_FAILED'
        } as ApiResponse);
      }

      // Map snake_case to camelCase for frontend
      const mappedIdeas = (ideas || []).map((idea: any) => ({
        id: (idea as any).id,
        title: (idea as any).title,
        description: (idea as any).description,
        category: (idea as any).category,
        problemDefinition: (idea as any).problem_definition,
        targetAudience: (idea as any).target_audience,
        expectedOutcome: (idea as any).expected_outcome,
        pmArchetype: (idea as any).pm_archetype,
        submittedBy: 'Alliance Partner', // Temporary - will be enhanced later
        submittedById: (idea as any).submitted_by,
        submittedAt: new Date((idea as any).submitted_at),
        status: (idea as any).status,
        rejectionReason: (idea as any).rejection_reason,
        stage: (idea as any).stage,
        marketSize: (idea as any).market_size,
        expectedROI: (idea as any).expected_roi,
        timeline: (idea as any).timeline,
        budget: (idea as any).budget,
        tags: (idea as any).tags || [],
        createdAt: new Date((idea as any).created_at),
        updatedAt: new Date((idea as any).updated_at)
      }));

      res.json({
        success: true,
        data: mappedIdeas,
        message: 'User ideas retrieved successfully'
      } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }

  async getMyIdeas(req: Request, res: Response, next: NextFunction) {
    try {
      console.log('👤 Fetching my ideas:', {
        user: (req as any).user,
        userId: (req as any).userId,
        query: req.query
      });

      if (!supabaseAdmin) {
        return res.status(500).json({
          success: false,
          error: 'Service role key not configured',
          code: 'SERVICE_ROLE_MISSING'
        } as ApiResponse);
      }

      // Get user from auth middleware
      const userId = (req as any).user?.id || (req as any).userId;
      
      if (!userId) {
        console.log('❌ No user ID found for getMyIdeas');
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        } as ApiResponse);
      }

      const { status } = req.query;

      let query = supabaseAdmin
        .from('idea_submissions' as any)
        .select('*')
        .eq('submitted_by', userId) // Use submitted_by field which stores userId
        .order('submitted_at', { ascending: false });

      // Apply status filter if provided
      if (status && ['pending', 'approved', 'rejected'].includes(status as string)) {
        query = query.eq('status', status as string);
      }

      console.log('🔍 Query built for user:', userId);

      const { data: ideas, error } = await query;

      if (error) {
        console.error('❌ Failed to fetch my ideas:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch user ideas',
          code: 'FETCH_FAILED',
          details: error.message
        } as ApiResponse);
      }

      // Map snake_case to camelCase for frontend
      const mappedIdeas = (ideas || []).map((idea: any) => ({
        id: (idea as any).id,
        title: (idea as any).title,
        description: (idea as any).description,
        category: (idea as any).category,
        problemDefinition: (idea as any).problem_definition,
        targetAudience: (idea as any).target_audience,
        expectedOutcome: (idea as any).expected_outcome,
        pmArchetype: (idea as any).pm_archetype,
        submittedBy: 'Alliance Partner', // Temporary - will be enhanced later
        submittedById: (idea as any).submitted_by,
        submittedAt: new Date((idea as any).submitted_at),
        status: (idea as any).status,
        rejectionReason: (idea as any).rejection_reason,
        stage: (idea as any).stage,
        marketSize: (idea as any).market_size,
        expectedROI: (idea as any).expected_roi,
        timeline: (idea as any).timeline,
        budget: (idea as any).budget,
        tags: (idea as any).tags || [],
        createdAt: new Date((idea as any).created_at),
        updatedAt: new Date((idea as any).updated_at)
      }));

      console.log('✅ My ideas fetched successfully:', {
        userId,
        count: mappedIdeas.length,
        ideas: mappedIdeas.map(i => ({ id: i.id, title: i.title, status: i.status }))
      });

      res.json({
        success: true,
        data: mappedIdeas,
        message: 'My ideas retrieved successfully'
      } as ApiResponse);
    } catch (error) {
      console.error('❌ Error in getMyIdeas:', error);
      next(error);
    }
  }

  // Ideas by Status
  async getPendingIdeas(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({
        success: true,
        data: [],
        message: 'Pending ideas - coming soon'
      } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }

  async getApprovedIdeas(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({
        success: true,
        data: [],
        message: 'Approved ideas - coming soon'
      } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }

  async getRejectedIdeas(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({
        success: true,
        data: [],
        message: 'Rejected ideas - coming soon'
      } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }

  // Canvas Management
  async getIdeaCanvas(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({
        success: true,
        data: { message: 'Idea canvas - coming soon' },
        message: 'Feature coming soon'
      } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }

  async createCanvas(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({
        success: true,
        data: { message: 'Create canvas - coming soon' },
        message: 'Feature coming soon'
      } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }

  async updateCanvas(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({
        success: true,
        data: { message: 'Update canvas - coming soon' },
        message: 'Feature coming soon'
      } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }

  async deleteCanvas(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({
        success: true,
        message: 'Delete canvas - coming soon'
      } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }

  // Convert Idea to Case
  async convertIdeaToCase(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({
        success: true,
        data: { message: 'Convert idea to case - coming soon' },
        message: 'Feature coming soon'
      } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }

  // Idea Comments/Feedback
  async getIdeaComments(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({
        success: true,
        data: [],
        message: 'Idea comments - coming soon'
      } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }

  async addIdeaComment(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({
        success: true,
        data: { message: 'Add idea comment - coming soon' },
        message: 'Feature coming soon'
      } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }

  // Idea Analytics
  async getIdeaAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({
        success: true,
        data: { message: 'Idea analytics - coming soon' },
        message: 'Feature coming soon'
      } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }

  async getIdeasOverview(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({
        success: true,
        data: { message: 'Ideas overview - coming soon' },
        message: 'Feature coming soon'
      } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }

  // Public endpoints
  async getFeaturedIdeas(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({
        success: true,
        data: [],
        message: 'Featured ideas - coming soon'
      } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }

  async getIdeaCategories(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({
        success: true,
        data: [
          { id: 'technology', name: 'Teknoloji', description: 'Teknoloji tabanlı projeler' },
          { id: 'social', name: 'Sosyal', description: 'Sosyal etki projeleri' },
          { id: 'environment', name: 'Çevre', description: 'Çevre dostu projeler' },
          { id: 'education', name: 'Eğitim', description: 'Eğitim odaklı projeler' },
          { id: 'health', name: 'Sağlık', description: 'Sağlık ve yaşam kalitesi projeleri' }
        ],
        message: 'Idea categories retrieved successfully'
      } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }
}

export const ideasController = new IdeasController();
