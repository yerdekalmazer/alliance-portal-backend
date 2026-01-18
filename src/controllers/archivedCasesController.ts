import { Request, Response, NextFunction } from 'express';
import { supabase, supabaseAdmin } from '../config/database';
import { ApiResponse } from '../models/types';

class ArchivedCasesController {
  constructor() {
    this.getAllArchivedCases = this.getAllArchivedCases.bind(this);
    this.getArchivedCaseById = this.getArchivedCaseById.bind(this);
    this.createArchivedCase = this.createArchivedCase.bind(this);
    this.updateArchivedCase = this.updateArchivedCase.bind(this);
    this.deleteArchivedCase = this.deleteArchivedCase.bind(this);
    this.calculateMetrics = this.calculateMetrics.bind(this);
  }

  // Get all archived cases
  async getAllArchivedCases(req: Request, res: Response, next: NextFunction) {
    try {
      console.log('📦 Fetching archived cases...');
      
      if (!supabaseAdmin) {
        console.error('❌ Service role key not configured');
        return res.status(500).json({
          success: false,
          error: 'Service role key not configured',
          code: 'SERVICE_ROLE_MISSING'
        } as ApiResponse);
      }

      console.log('✅ Service role configured, querying database...');
      
      const { data: archivedCases, error } = await (supabaseAdmin as any)
        .from('archived_cases')
        .select(`
          *,
          cases (
            id,
            title,
            description,
            job_types,
            specializations,
            requirements,
            status,
            created_at,
            updated_at
          )
        `)
        .order('archived_at', { ascending: false });

      if (error) {
        console.error('❌ Database error fetching archived cases:', error);
        console.error('   Error details:', JSON.stringify(error, null, 2));
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch archived cases',
          code: 'FETCH_FAILED',
          details: error.message || error
        } as ApiResponse);
      }
      
      console.log(`✅ Successfully fetched ${archivedCases?.length || 0} archived cases`);

      res.json({
        success: true,
        data: archivedCases || [],
        message: 'Archived cases retrieved successfully'
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  // Get archived case by ID
  async getArchivedCaseById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      if (!supabaseAdmin) {
        return res.status(500).json({
          success: false,
          error: 'Service role key not configured',
          code: 'SERVICE_ROLE_MISSING'
        } as ApiResponse);
      }

      const { data: archivedCase, error } = await (supabaseAdmin as any)
        .from('archived_cases')
        .select(`
          *,
          cases (
            id,
            title,
            description,
            job_types,
            specializations,
            requirements,
            status,
            created_at,
            updated_at
          )
        `)
        .eq('id', id)
        .single();

      if (error || !archivedCase) {
        return res.status(404).json({
          success: false,
          error: 'Archived case not found',
          code: 'NOT_FOUND'
        } as ApiResponse);
      }

      res.json({
        success: true,
        data: archivedCase,
        message: 'Archived case retrieved successfully'
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  // Create archived case (when completing a case)
  async createArchivedCase(req: Request, res: Response, next: NextFunction) {
    try {
      const { case_id } = req.body;

      if (!case_id) {
        return res.status(400).json({
          success: false,
          error: 'case_id is required',
          code: 'VALIDATION_ERROR'
        } as ApiResponse);
      }

      if (!supabaseAdmin) {
        return res.status(500).json({
          success: false,
          error: 'Service role key not configured',
          code: 'SERVICE_ROLE_MISSING'
        } as ApiResponse);
      }

      // Check if case exists and is not already archived
      const { data: existingCase, error: caseError } = await (supabaseAdmin as any)
        .from('cases')
        .select('*')
        .eq('id', case_id)
        .single();

      if (caseError || !existingCase) {
        return res.status(404).json({
          success: false,
          error: 'Case not found',
          code: 'NOT_FOUND'
        } as ApiResponse);
      }

      // Check if already archived
      const { data: existing } = await (supabaseAdmin as any)
        .from('archived_cases')
        .select('id')
        .eq('case_id', case_id)
        .single();

      if (existing) {
        return res.status(400).json({
          success: false,
          error: 'Case is already archived',
          code: 'ALREADY_ARCHIVED'
        } as ApiResponse);
      }

      // Calculate metrics automatically
      const metrics = await this.calculateMetrics(case_id);

      // Create archived case
      const archivedData = {
        case_id,
        archived_at: new Date().toISOString(),
        team_size: metrics.team_size,
        performance_score: metrics.performance_score,
        application_count: metrics.application_count,
        client_satisfaction: req.body.client_satisfaction || metrics.performance_score,
        duration: req.body.duration || parseInt((existingCase as any).estimated_duration) || 0,
        notes: req.body.notes || '',
        project_files: req.body.project_files || [],
        project_outputs: req.body.project_outputs || metrics.project_outputs,
        lessons_learned: req.body.lessons_learned || [],
        deliverables: req.body.deliverables || existingCase.specializations || [],
        technologies_used: req.body.technologies_used || existingCase.specializations || [],
        tags: req.body.tags || [
          ...((existingCase as any).job_types || []),
          ...((existingCase as any).specializations || []),
          (existingCase as any).difficulty
        ],
        team_members: req.body.team_members || metrics.team_members
      };

      const { data: archivedCase, error } = await (supabaseAdmin as any)
        .from('archived_cases')
        .insert(archivedData)
        .select()
        .single();

      if (error) {
        console.error('Failed to create archived case:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to create archived case',
          code: 'CREATE_FAILED'
        } as ApiResponse);
      }

      // Update case status to 'archived'
      await (supabaseAdmin as any)
        .from('cases')
        .update({ status: 'archived', updated_at: new Date().toISOString() })
        .eq('id', case_id);

      res.status(201).json({
        success: true,
        data: archivedCase,
        message: 'Case archived successfully'
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  // Update archived case
  async updateArchivedCase(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const updates = req.body;

      if (!supabaseAdmin) {
        return res.status(500).json({
          success: false,
          error: 'Service role key not configured',
          code: 'SERVICE_ROLE_MISSING'
        } as ApiResponse);
      }

      const { data: archivedCase, error } = await (supabaseAdmin as any)
        .from('archived_cases')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error || !archivedCase) {
        return res.status(404).json({
          success: false,
          error: 'Archived case not found or update failed',
          code: 'UPDATE_FAILED'
        } as ApiResponse);
      }

      res.json({
        success: true,
        data: archivedCase,
        message: 'Archived case updated successfully'
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  // Delete archived case
  async deleteArchivedCase(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      if (!supabaseAdmin) {
        return res.status(500).json({
          success: false,
          error: 'Service role key not configured',
          code: 'SERVICE_ROLE_MISSING'
        } as ApiResponse);
      }

      const { error } = await (supabaseAdmin as any)
        .from('archived_cases')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Failed to delete archived case:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to delete archived case',
          code: 'DELETE_FAILED'
        } as ApiResponse);
      }

      res.json({
        success: true,
        message: 'Archived case deleted successfully'
      } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }

  // Helper: Calculate metrics for a case
  private async calculateMetrics(case_id: string) {
    if (!supabaseAdmin) {
      return {
        team_size: 0,
        performance_score: 0,
        application_count: 0,
        project_outputs: [],
        team_members: []
      };
    }

    // Get applications (from survey_responses)
    const { data: applications } = await supabaseAdmin
      .from('survey_responses')
      .select('*')
      .eq('case_id', case_id);

    const apps = applications || [];
    const applicationCount = apps.length;

    // Calculate average score
    const avgScore = apps.length > 0
      ? Math.round(apps.reduce((sum: number, app: any) => sum + (app.score || 0), 0) / apps.length)
      : 0;

    // Get unique participants
    const uniqueParticipants = Array.from(
      new Set(apps.filter((app: any) => app.participant_name).map((app: any) => app.participant_name))
    );

    return {
      team_size: uniqueParticipants.length,
      performance_score: avgScore,
      application_count: applicationCount,
      project_outputs: [
        `${applicationCount} başvuru tamamlandı`,
        `Ortalama skor: ${avgScore}/100`,
        `Takım büyüklüğü: ${uniqueParticipants.length} kişi`
      ],
      team_members: uniqueParticipants
    };
  }
}

export const archivedCasesController = new ArchivedCasesController();
