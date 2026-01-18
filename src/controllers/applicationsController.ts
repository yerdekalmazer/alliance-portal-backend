import { Request, Response, NextFunction } from 'express';
import { supabase, supabaseAdmin } from '../config/database';
import { ApiResponse } from '../models/types';

class ApplicationsController {
  constructor() {
    // Bind all methods to ensure 'this' context is preserved
    this.getAllApplications = this.getAllApplications.bind(this);
    this.getApplicationById = this.getApplicationById.bind(this);
    this.updateApplicationStatus = this.updateApplicationStatus.bind(this);
    this.getApplicationStats = this.getApplicationStats.bind(this);
  }

  // Get all applications (from survey_responses table)
  async getAllApplications(req: Request, res: Response, next: NextFunction) {
    try {
      const { case_id, status, page = '1', limit = '100' } = req.query as Record<string, string>;

      if (!supabaseAdmin) {
        return res.status(500).json({
          success: false,
          error: 'Service role key not configured',
          code: 'SERVICE_ROLE_MISSING'
        } as ApiResponse);
      }

      // Query survey_responses table (where applications are actually stored)
      let query = (supabaseAdmin as any)
        .from('survey_responses')
        .select(`
          *,
          cases (
            id,
            title,
            description
          )
        `, { count: 'exact' });

      // Apply filters
      if (case_id) {
        query = query.eq('case_id', case_id);
      }
      if (status) {
        query = query.eq('status', status);
      }

      // Sorting
      query = query.order('created_at', { ascending: false });

      // Pagination
      const pageNum = Math.max(1, parseInt(page) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 100));
      const from = (pageNum - 1) * limitNum;
      const to = from + limitNum - 1;
      query = query.range(from, to);

      const { data: surveyResponses, error, count } = await query;

      if (error) {
        console.error('Database error:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch applications',
          code: 'FETCH_FAILED'
        } as ApiResponse);
      }

      // Transform survey_responses to application format
      const applications = surveyResponses?.map((sr: any) => ({
        id: sr.id,
        case_id: sr.case_id,
        participant_name: sr.participant_name,
        participant_email: sr.participant_email,
        full_name: sr.participant_name, // Alias for compatibility
        score: sr.score,
        status: sr.status,
        responses: sr.responses,
        questions: sr.questions,
        technical_details: sr.technical_details,
        category_scores: sr.category_scores,
        completed_at: sr.completed_at,
        submitted_at: sr.submitted_at,
        created_at: sr.created_at,
        cases: sr.cases,
        // Additional fields
        survey_template_id: sr.survey_template_id,
        leadership_type: sr.leadership_type
      })) || [];

      console.log(`✅ Fetched ${applications.length} applications from survey_responses table`);

      res.json({
        success: true,
        data: applications,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: count || 0,
          pages: Math.ceil((count || 0) / limitNum)
        },
        message: 'Applications retrieved successfully'
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  // Get application by ID
  async getApplicationById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      if (!supabaseAdmin) {
        return res.status(500).json({
          success: false,
          error: 'Service role key not configured',
          code: 'SERVICE_ROLE_MISSING'
        } as ApiResponse);
      }

      const { data: application, error } = await (supabaseAdmin as any)
        .from('applications')
        .select(`
          *,
          cases (
            id,
            title,
            description,
            initial_threshold
          ),
          survey_responses (
            id,
            score,
            responses,
            questions,
            completed_at
          )
        `)
        .eq('id', id)
        .single();

      if (error || !application) {
        return res.status(404).json({
          success: false,
          error: 'Application not found',
          code: 'NOT_FOUND'
        } as ApiResponse);
      }

      res.json({
        success: true,
        data: application,
        message: 'Application retrieved successfully'
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  // Update application status
  async updateApplicationStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;

      if (!supabaseAdmin) {
        return res.status(500).json({
          success: false,
          error: 'Service role key not configured',
          code: 'SERVICE_ROLE_MISSING'
        } as ApiResponse);
      }

      const { data: application, error } = await (supabaseAdmin as any)
        .from('applications')
        .update({
          status,
          notes,
          reviewed_by: req.userId,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Database error:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to update application',
          code: 'UPDATE_FAILED'
        } as ApiResponse);
      }

      res.json({
        success: true,
        data: application,
        message: 'Application status updated successfully'
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  // Get application statistics
  async getApplicationStats(req: Request, res: Response, next: NextFunction) {
    try {
      const { case_id } = req.query as Record<string, string>;

      if (!supabaseAdmin) {
        return res.status(500).json({
          success: false,
          error: 'Service role key not configured',
          code: 'SERVICE_ROLE_MISSING'
        } as ApiResponse);
      }

      let query = (supabaseAdmin as any)
        .from('applications')
        .select('status, score, threshold_met');

      if (case_id) {
        query = query.eq('case_id', case_id);
      }

      const { data: applications, error } = await query;

      if (error) {
        console.error('Database error:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch application statistics',
          code: 'FETCH_FAILED'
        } as ApiResponse);
      }

      const stats = {
        total: applications.length,
        pending: applications.filter((app: any) => app.status === 'pending').length,
        reviewed: applications.filter((app: any) => app.status === 'reviewed').length,
        accepted: applications.filter((app: any) => app.status === 'accepted').length,
        rejected: applications.filter((app: any) => app.status === 'rejected').length,
        thresholdMet: applications.filter((app: any) => app.threshold_met).length,
        averageScore: applications.length > 0 
          ? Math.round(applications.reduce((sum: number, app: any) => sum + (app.score || 0), 0) / applications.length)
          : 0
      };

      res.json({
        success: true,
        data: stats,
        message: 'Application statistics retrieved successfully'
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  // Delete application
  async deleteApplication(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      if (!supabaseAdmin) {
        return res.status(500).json({
          success: false,
          error: 'Service role key not configured',
          code: 'SERVICE_ROLE_MISSING'
        } as ApiResponse);
      }

      // Check if application exists
      const { data: existingApp, error: fetchError } = await (supabaseAdmin as any)
        .from('applications')
        .select('id, participant_name')
        .eq('id', id)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          return res.status(404).json({
            success: false,
            error: 'Application not found',
            code: 'APPLICATION_NOT_FOUND'
          } as ApiResponse);
        }
        throw fetchError;
      }

      // Delete the application
      const { error: deleteError } = await (supabaseAdmin as any)
        .from('applications')
        .delete()
        .eq('id', id);

      if (deleteError) {
        console.error('Database deletion error:', deleteError);
        return res.status(500).json({
          success: false,
          error: 'Failed to delete application',
          code: 'DELETE_FAILED'
        } as ApiResponse);
      }

      console.log(`✅ Application deleted: ${existingApp.participant_name} (${id})`);

      res.json({
        success: true,
        message: 'Application deleted successfully'
      } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }
}

export const applicationsController = new ApplicationsController();
