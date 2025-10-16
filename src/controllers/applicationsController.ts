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

  // Get all applications
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

      let query = (supabaseAdmin as any)
        .from('applications')
        .select(`
          *,
          cases (
            id,
            title,
            description
          ),
          survey_responses (
            id,
            score,
            completed_at
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

      const { data: applications, error, count } = await query;

      if (error) {
        console.error('Database error:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch applications',
          code: 'FETCH_FAILED'
        } as ApiResponse);
      }

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
}

export const applicationsController = new ApplicationsController();
