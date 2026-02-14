import { Request, Response, NextFunction } from 'express';
import { supabase, supabaseAdmin } from '../config/database';
import { ApiResponse } from '../models/types';

class ApplicationsController {
  constructor() {
    // Bind all methods to ensure 'this' context is preserved
    this.getAllApplications = this.getAllApplications.bind(this);
    this.getApplicationById = this.getApplicationById.bind(this);
    this.createApplication = this.createApplication.bind(this);
    this.updateApplicationStatus = this.updateApplicationStatus.bind(this);
    this.getApplicationStats = this.getApplicationStats.bind(this);
  }

  // Create application (e.g. from Excel import)
  async createApplication(req: Request, res: Response, next: NextFunction) {
    try {
      const body = req.body as any;

      if (!supabaseAdmin) {
        return res.status(500).json({
          success: false,
          error: 'Service role key not configured',
          code: 'SERVICE_ROLE_MISSING'
        } as ApiResponse);
      }

      const case_id = body.case_id;
      const participant_name = body.participant_name;
      const participant_email = body.participant_email;

      if (!case_id || !participant_name || !participant_email) {
        return res.status(400).json({
          success: false,
          error: 'case_id, participant_name and participant_email are required',
          code: 'VALIDATION_ERROR'
        } as ApiResponse);
      }

      const insertPayload: Record<string, unknown> = {
        case_id,
        participant_name,
        participant_email,
        status: body.status || 'pending',
        score: body.score ?? null,
        threshold_met: body.threshold_met ?? false,
        personal_info: body.personal_info ?? {},
        assessment_responses: body.assessment_responses ?? {},
        notes: body.notes ?? null,
        updated_at: new Date().toISOString()
      };

      const { data: created, error } = await (supabaseAdmin as any)
        .from('applications')
        .insert(insertPayload)
        .select()
        .single();

      if (error) {
        console.error('Create application error:', error);
        return res.status(500).json({
          success: false,
          error: error.message || 'Failed to create application',
          code: 'CREATE_FAILED'
        } as ApiResponse);
      }

      console.log('Application created:', created?.id, participant_name);

      res.status(201).json({
        success: true,
        data: created
      } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }

  // Get all applications (from both survey_responses and adaptive_assessment_responses tables)
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

      // 1. Query survey_responses table (regular survey applications)
      let surveyQuery = (supabaseAdmin as any)
        .from('survey_responses')
        .select(`
          *,
          cases (
            id,
            title,
            description
          )
        `);

      if (case_id) {
        surveyQuery = surveyQuery.eq('case_id', case_id);
      }
      if (status) {
        surveyQuery = surveyQuery.eq('status', status);
      }

      const { data: surveyResponses, error: surveyError } = await surveyQuery;

      if (surveyError) {
        console.error('❌ Survey responses fetch error:', surveyError);
      }

      // 2. Query adaptive_assessment_responses table (adaptive assessments)
      let adaptiveQuery = (supabaseAdmin as any)
        .from('adaptive_assessment_responses')
        .select(`
          *,
          cases (
            id,
            title,
            description
          )
        `);

      if (case_id) {
        adaptiveQuery = adaptiveQuery.eq('case_id', case_id);
      }
      if (status) {
        adaptiveQuery = adaptiveQuery.eq('status', status);
      }

      const { data: adaptiveResponses, error: adaptiveError } = await adaptiveQuery;

      if (adaptiveError) {
        console.error('❌ Adaptive responses fetch error:', adaptiveError);
      }

      // 3. Query applications table (Excel import / manual entries)
      let directQuery = (supabaseAdmin as any)
        .from('applications')
        .select('*');

      if (case_id) {
        directQuery = directQuery.eq('case_id', case_id);
      }
      if (status) {
        directQuery = directQuery.eq('status', status);
      }

      const { data: directApplications, error: directError } = await directQuery;

      if (directError) {
        console.error('❌ Applications table fetch error:', directError);
      }

      // Transform applications table to same format
      const directAppsFormatted = (directApplications || []).map((app: any) => ({
        id: app.id,
        case_id: app.case_id,
        participant_name: app.participant_name,
        participant_email: app.participant_email,
        full_name: app.participant_name,
        score: app.score ?? 0,
        status: app.status,
        threshold_met: app.threshold_met ?? false,
        personal_info: app.personal_info,
        assessment_responses: app.assessment_responses,
        notes: app.notes,
        created_at: app.created_at,
        updated_at: app.updated_at,
        assessment_type: 'excel-import'
      }));

      // Transform survey_responses to application format
      const surveyApplications = surveyResponses?.map((sr: any) => ({
        id: sr.id,
        case_id: sr.case_id,
        participant_name: sr.participant_name,
        participant_email: sr.participant_email,
        full_name: sr.participant_name,
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
        survey_template_id: sr.survey_template_id,
        leadership_type: sr.leadership_type,
        assessment_type: 'survey',
        threshold_met: sr.threshold_met
      })) || [];

      // Transform adaptive_assessment_responses to application format
      const adaptiveApplications = adaptiveResponses?.map((ar: any) => ({
        id: ar.id,
        case_id: ar.case_id,
        participant_name: ar.participant_name,
        participant_email: ar.participant_email,
        full_name: ar.participant_name,
        score: ar.overall_percentage || 0, // Use percentage as score
        status: ar.status,
        responses: ar.raw_responses,
        questions: [], // Adaptive doesn't have static questions
        technical_details: ar.analysis_results,
        category_scores: ar.phase_scores,
        completed_at: ar.completed_at,
        submitted_at: ar.submitted_at,
        created_at: ar.created_at,
        cases: ar.cases,
        survey_template_id: 'adaptive-technical-assessment',
        assessment_type: 'adaptive-technical-assessment',
        overall_percentage: ar.overall_percentage,
        raw_adaptive_data: {
          phase_scores: ar.phase_scores,
          analysis_results: ar.analysis_results,
          phase_completion_status: ar.phase_completion_status,
          strongest_areas: ar.strongest_areas,
          improvement_areas: ar.improvement_areas
        },
        threshold_met: (ar.overall_percentage || 0) >= 50 // Assume 50% threshold
      })) || [];

      // Combine all three sources and sort by created_at
      const allApplications = [...surveyApplications, ...adaptiveApplications, ...directAppsFormatted]
        .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

      // Apply pagination after combining
      const pageNum = Math.max(1, parseInt(page) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 100));
      const from = (pageNum - 1) * limitNum;
      const to = from + limitNum;
      const paginatedApplications = allApplications.slice(from, to);

      console.log(`✅ Fetched ${surveyApplications.length} survey responses + ${adaptiveApplications.length} adaptive assessments = ${allApplications.length} total applications`);

      res.json({
        success: true,
        data: paginatedApplications,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: allApplications.length,
          pages: Math.ceil(allApplications.length / limitNum)
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

      // 1. Try applications table
      const { data: appData, error: appError } = await (supabaseAdmin as any)
        .from('applications')
        .select('id')
        .eq('id', id)
        .single();

      if (!appError && appData) {
        const { error: deleteError } = await (supabaseAdmin as any)
          .from('applications')
          .delete()
          .eq('id', id);

        if (deleteError) {
          console.error('Database deletion error (applications):', deleteError);
          throw deleteError;
        }

        return res.json({
          success: true,
          message: 'Application deleted successfully'
        } as ApiResponse);
      }

      // 2. Try survey_responses table
      const { data: surveyData, error: surveyError } = await (supabaseAdmin as any)
        .from('survey_responses')
        .select('id')
        .eq('id', id)
        .single();

      if (!surveyError && surveyData) {
        const { error: deleteError } = await (supabaseAdmin as any)
          .from('survey_responses')
          .delete()
          .eq('id', id);

        if (deleteError) {
          console.error('Database deletion error (survey_responses):', deleteError);
          throw deleteError;
        }

        return res.json({
          success: true,
          message: 'Application deleted successfully'
        } as ApiResponse);
      }

      // 3. Try adaptive_assessment_responses table
      const { data: adaptiveData, error: adaptiveError } = await (supabaseAdmin as any)
        .from('adaptive_assessment_responses')
        .select('id')
        .eq('id', id)
        .single();

      if (!adaptiveError && adaptiveData) {
        const { error: deleteError } = await (supabaseAdmin as any)
          .from('adaptive_assessment_responses')
          .delete()
          .eq('id', id);

        if (deleteError) {
          console.error('Database deletion error (adaptive_assessment_responses):', deleteError);
          throw deleteError;
        }

        return res.json({
          success: true,
          message: 'Application deleted successfully'
        } as ApiResponse);
      }

      // If we get here, it wasn't found in any table
      return res.status(404).json({
        success: false,
        error: 'Application not found',
        code: 'APPLICATION_NOT_FOUND'
      } as ApiResponse);

    } catch (error) {
      next(error);
    }
  }
}

export const applicationsController = new ApplicationsController();
