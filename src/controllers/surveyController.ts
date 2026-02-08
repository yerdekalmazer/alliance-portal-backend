import { Request, Response, NextFunction } from 'express';
import { supabase, supabaseAdmin } from '../config/database';
import { ApiResponse, SurveyTemplate, SurveyResponse, SurveyLink } from '../models/types';
import { technicalAssessmentController } from './technicalAssessmentController';
import { calculateAssessmentScore } from '../utils/surveyGeneration';

class SurveyController {
  constructor() {
    // Bind all methods to ensure 'this' context is preserved
    this.getSurveyTemplates = this.getSurveyTemplates.bind(this);
    this.getSurveyTemplateById = this.getSurveyTemplateById.bind(this);
    this.deleteSurveyTemplate = this.deleteSurveyTemplate.bind(this);
    this.createSurveyTemplate = this.createSurveyTemplate.bind(this);
    this.updateSurveyTemplate = this.updateSurveyTemplate.bind(this);
    this.getSurveyLinks = this.getSurveyLinks.bind(this);
    this.createSurveyLink = this.createSurveyLink.bind(this);
    this.getSurveyLinkById = this.getSurveyLinkById.bind(this);
    this.updateSurveyLink = this.updateSurveyLink.bind(this);
    this.deleteSurveyLink = this.deleteSurveyLink.bind(this);
    this.getSurveyResponses = this.getSurveyResponses.bind(this);
    this.getSurveyResponseById = this.getSurveyResponseById.bind(this);
    this.submitSurveyResponse = this.submitSurveyResponse.bind(this);
    this.updateSurveyResponse = this.updateSurveyResponse.bind(this);
    this.deleteSurveyResponse = this.deleteSurveyResponse.bind(this);
    this.generateDynamicSurvey = this.generateDynamicSurvey.bind(this);
    this.generateSurveyForCase = this.generateSurveyForCase.bind(this);
    this.getResponsesSummary = this.getResponsesSummary.bind(this);
    this.getTemplateAnalytics = this.getTemplateAnalytics.bind(this);
    this.getCaseSurveyAnalytics = this.getCaseSurveyAnalytics.bind(this);
    this.getPublicSurvey = this.getPublicSurvey.bind(this);
    this.submitPublicSurvey = this.submitPublicSurvey.bind(this);
    this.generateTechnicalAssessment = this.generateTechnicalAssessment.bind(this);
    this.analyzeTechnicalAssessment = this.analyzeTechnicalAssessment.bind(this);
    this.submitAdaptiveAssessmentResponse = this.submitAdaptiveAssessmentResponse.bind(this);
  }

  // Survey Templates
  async getSurveyTemplates(req: Request, res: Response, next: NextFunction) {
    try {
      console.log('🔄 getSurveyTemplates called');
      
      if (!supabaseAdmin) {
        console.log('supabaseAdmin not configured');
        return res.status(500).json({
          success: false,
          error: 'Service role key not configured',
          code: 'SERVICE_ROLE_MISSING'
        } as ApiResponse);
      }

      // Query params
      const {
        type,
        category,
        is_active,
        page = '1',
        limit = '50'
      } = req.query as Record<string, string>;

      console.log('📡 Fetching templates from database with filters:', { type, category, is_active, page, limit });

      let query = supabaseAdmin
        .from('survey_templates' as any)
        .select('*', { count: 'exact' });

      // Apply filters
      if (type) {
        query = query.eq('type', type);
      }
      if (category) {
        query = query.eq('category', category);
      }

      // Default is_active=true unless explicitly provided
      if (typeof is_active !== 'undefined') {
        query = query.eq('is_active', is_active === 'true');
      } else {
        query = query.eq('is_active', true);
      }

      // Sorting
      query = query.order('created_at', { ascending: false });

      // Pagination
      const pageNum = Math.max(1, parseInt(page) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50));
      const from = (pageNum - 1) * limitNum;
      const to = from + limitNum - 1;
      query = query.range(from, to);

      const { data: templates, error, count } = await query;

      if (error) {
        console.log('❌ Database error:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch survey templates',
          code: 'FETCH_FAILED'
        } as ApiResponse);
      }

      console.log('✅ Templates fetched successfully, count:', templates?.length || 0);
      console.log('📊 Templates data:', templates);

      res.json({
        success: true,
        data: templates,
        message: 'Survey templates retrieved successfully',
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limitNum)
        }
      } as ApiResponse<any[]>);
    } catch (error) {
      next(error);
    }
  }

  async getSurveyTemplateById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      if (!supabaseAdmin) {
        return res.status(500).json({
          success: false,
          error: 'Service role key not configured',
          code: 'SERVICE_ROLE_MISSING'
        } as ApiResponse);
      }

      const { data: template, error } = await supabaseAdmin
        .from('survey_templates' as any)
        .select('*')
        .eq('id', id)
        .single();

      if (error || !template) {
        return res.status(404).json({
          success: false,
          error: 'Survey template not found',
          code: 'TEMPLATE_NOT_FOUND'
        } as ApiResponse);
      }

      res.json({
        success: true,
        data: template,
        message: 'Survey template retrieved successfully'
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }



  async deleteSurveyTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      if (!supabaseAdmin) {
        return res.status(500).json({
          success: false,
          error: 'Service role key not configured',
          code: 'SERVICE_ROLE_MISSING'
        } as ApiResponse);
      }

      // Check if template has associated survey links
      const { data: linkedSurveys, error: linkError } = await supabaseAdmin
        .from('survey_links')
        .select('id')
        .eq('template_id', id)
        .limit(1);

      if (linkError) {
        console.error('Database error:', linkError);
        return res.status(500).json({
          success: false,
          error: 'Failed to check template dependencies',
          code: 'CHECK_FAILED'
        } as ApiResponse);
      }

      if (linkedSurveys && linkedSurveys.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'Cannot delete template with existing survey links',
          code: 'TEMPLATE_IN_USE'
        } as ApiResponse);
      }

      // Check if the template exists
      const { data: existingTemplate, error: fetchError } = await supabaseAdmin
        .from('survey_templates')
        .select('id')
        .eq('id', id)
        .single();

      if (fetchError || !existingTemplate) {
        return res.status(404).json({
          success: false,
          error: 'Survey template not found',
          code: 'TEMPLATE_NOT_FOUND'
        } as ApiResponse);
      }

      // Delete the template
      const { error: deleteError } = await supabaseAdmin
        .from('survey_templates')
        .delete()
        .eq('id', id);

      if (deleteError) {
        console.error('Database error:', deleteError);
        return res.status(500).json({
          success: false,
          error: 'Failed to delete survey template',
          code: 'DELETE_FAILED'
        } as ApiResponse);
      }

      res.json({
        success: true,
        message: 'Survey template deleted successfully'
      } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }

  async createSurveyTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        title,
        description,
        type,
        category,
        target_audience,
        is_active = true,
        is_dynamic = false,
        questions = []
      } = req.body;

      if (!title || !description || !type) {
        return res.status(400).json({
          success: false,
          error: 'Title, description and type are required',
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

      const { data: template, error } = await supabaseAdmin
        .from('survey_templates')
        .insert({
          title,
          description,
          type,
          category,
          target_audience,
          is_active,
          is_dynamic,
          questions
        })
        .select()
        .single();

      if (error) {
        console.error('Database error:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to create survey template',
          code: 'CREATE_FAILED'
        } as ApiResponse);
      }

      res.status(201).json({
        success: true,
        data: template,
        message: 'Survey template created successfully'
      } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }

  async updateSurveyTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const {
        title,
        description,
        type,
        category,
        target_audience,
        is_active,
        is_dynamic,
        questions
      } = req.body;

      if (!supabaseAdmin) {
        return res.status(500).json({
          success: false,
          error: 'Service role key not configured',
          code: 'SERVICE_ROLE_MISSING'
        } as ApiResponse);
      }

      const { data: template, error } = await supabaseAdmin
        .from('survey_templates')
        .update({
          title,
          description,
          type,
          category,
          target_audience,
          is_active,
          is_dynamic,
          questions,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Database error:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to update survey template',
          code: 'UPDATE_FAILED'
        } as ApiResponse);
      }

      if (!template) {
        return res.status(404).json({
          success: false,
          error: 'Survey template not found',
          code: 'TEMPLATE_NOT_FOUND'
        } as ApiResponse);
      }

      res.json({
        success: true,
        data: template,
        message: 'Survey template updated successfully'
      } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }


  // Survey Links
  async getSurveyLinks(req: Request, res: Response, next: NextFunction) {
    try {
      if (!supabaseAdmin) {
        return res.status(500).json({
          success: false,
          error: 'Service role key not configured',
          code: 'SERVICE_ROLE_MISSING'
        } as ApiResponse);
      }

      // Get query parameters for filtering
      const { 
        case_id, 
        template_id, 
        is_active,
        page = 1, 
        limit = 100,
        sort_by = 'created_at',
        sort_order = 'desc'
      } = req.query;

      let query = supabaseAdmin
        .from('survey_links')
        .select(`
          *
        `, { count: 'exact' });

      // Apply filters
      if (case_id) {
        query = query.eq('case_id', case_id as string);
      }

      if (template_id) {
        query = query.eq('template_id', template_id as string);
      }

      if (is_active !== undefined) {
        query = query.eq('is_active', is_active === 'true');
      }

      // Filter out expired links by default unless specifically requested
      query = query.or('expires_at.is.null,expires_at.gt.' + new Date().toISOString());

      // Apply sorting
      const validSortFields = ['created_at', 'title', 'current_participants'];
      const sortField = validSortFields.includes(sort_by as string) ? sort_by : 'created_at';
      const sortDirection = sort_order === 'asc' ? true : false;
      
      query = query.order(sortField as string, { ascending: sortDirection });

      // Apply pagination
      const pageNum = Math.max(1, parseInt(page as string) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 100));
      const offset = (pageNum - 1) * limitNum;

      query = query.range(offset, offset + limitNum - 1);

      const { data: surveyLinks, error, count } = await query;

      if (error) {
        console.error('Database error:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch survey links',
          code: 'FETCH_FAILED'
        } as ApiResponse);
      }

      res.json({
        success: true,
        data: surveyLinks,
        message: 'Survey links retrieved successfully',
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limitNum)
        }
      } as ApiResponse<any[]>);
    } catch (error) {
      next(error);
    }
  }

  async createSurveyLink(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        template_id,
        case_id,
        title,
        description,
        max_participants,
        target_audience,
        customizations,
        expires_at,
        url // Frontend'den gelen URL'yi de al ama ignore et
      } = req.body;

      if (!template_id || !title || !target_audience) {
        return res.status(400).json({
          success: false,
          error: 'Template ID, title, and target audience are required',
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

      // Use frontend URL if provided, otherwise generate unique URL slug
      let urlSlug;
      if (url && typeof url === 'string' && url.trim()) {
        // Extract the slug part from frontend URL (e.g., from "/#/s/survey-123" get "survey-123")
        const urlMatch = url.match(/\/s\/([^/?#]+)/);
        urlSlug = urlMatch ? urlMatch[1] : `survey-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;
      } else {
        urlSlug = `survey-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;
      }

      // Verify template exists
      const { data: template, error: templateError } = await supabaseAdmin
        .from('survey_templates')
        .select('id')
        .eq('id', template_id)
        .single();

      if (templateError || !template) {
        return res.status(404).json({
          success: false,
          error: 'Survey template not found',
          code: 'TEMPLATE_NOT_FOUND'
        } as ApiResponse);
      }

      // Verify case exists if case_id is provided
      if (case_id) {
        const { data: caseData, error: caseError } = await supabaseAdmin
          .from('cases')
          .select('id')
          .eq('id', case_id)
          .single();

        if (caseError || !caseData) {
          return res.status(404).json({
            success: false,
            error: 'Case not found',
            code: 'CASE_NOT_FOUND'
          } as ApiResponse);
        }
      }

      // Check if template is dynamic and pre-generate questions
      const { data: templateData, error: templateDataError } = await supabaseAdmin
        .from('survey_templates')
        .select('*')
        .eq('id', template_id)
        .single();

      let finalCustomizations = customizations;

      if (templateData?.type === 'adaptive-technical-assessment') {
        // Import adaptive controller instance to generate questions
        const { adaptiveTechnicalAssessmentController } = require('./adaptiveTechnicalAssessmentController');
        
        try {
          // Generate questions once for this survey link
          const mockReq = {
            body: {
              case_id,
              job_types: customizations?.job_types || ['Frontend Developer']
            }
          };
          
          // Create mock response object to capture data
          let generatedData: any;
          const mockRes = {
            json: (data: any) => {
              generatedData = data;
            }
          };
          
          // Generate questions
          await adaptiveTechnicalAssessmentController.generateAdaptiveAssessment(mockReq, mockRes, () => {});
          
          if (generatedData?.success && generatedData?.data) {
            // Store generated questions in customizations
            finalCustomizations = {
              ...customizations,
              preGeneratedQuestions: generatedData.data.jobTypeGroups,
              leadershipQuestions: generatedData.data.leadershipQuestions, // Liderlik sorularını da kaydet
              assessmentConfig: generatedData.data.config,
              isPreGenerated: true
            };
          }
        } catch (error) {
          console.error('❌ Error pre-generating questions:', error);
        }
      } else if (templateData?.is_dynamic && case_id) {
        // Handle other dynamic templates (initial-assessment, application-initial-assessment, technical-assessment)
        console.log('🔀 Dynamic template detected, generating questions...');
        console.log('📊 Template type:', templateData.type);
        console.log('📊 Template is_dynamic:', templateData.is_dynamic);
        
        try {
          // Import survey generation utility
          const { generateDynamicSurveyQuestions } = require('../utils/surveyGeneration');
          
          // Fetch case data to generate questions
          const { data: caseData, error: caseError } = await supabaseAdmin
            .from('cases')
            .select('*')
            .eq('id', case_id)
            .single();
          
          if (caseError || !caseData) {
            console.error('❌ Could not fetch case data for dynamic question generation:', caseError);
          } else {
            console.log('✅ Case data fetched for question generation');
            console.log('📊 Case job_types:', (caseData as any).job_types);
            console.log('📊 Case domain:', (caseData as any).domain);
            
            // Convert database format to CaseScenario format
            const caseScenario = {
              id: caseData.id,
              title: (caseData as any).title || '',
              jobTypes: (caseData as any).job_types || [],
              specializations: (caseData as any).specializations || [],
              domain: (caseData as any).domain || ''
            };
            
            // Generate dynamic questions
            const generatedQuestions = generateDynamicSurveyQuestions(templateData, caseScenario);
            console.log(`✅ Generated ${generatedQuestions.length} dynamic questions`);
            
            // Store generated questions in customizations
            finalCustomizations = {
              ...customizations,
              generatedQuestions: generatedQuestions,
              isDynamicGenerated: true,
              caseId: case_id,
              generatedAt: new Date().toISOString()
            };
            
            console.log('✅ Dynamic questions stored in customizations');
          }
        } catch (error) {
          console.error('❌ Error generating dynamic questions:', error);
          console.error('Error details:', error instanceof Error ? error.message : String(error));
        }
      }

      // Create survey link
      const { data: surveyLink, error } = await supabaseAdmin
        .from('survey_links')
        .insert({
          template_id,
          case_id,
          title,
          description,
          url: urlSlug,
          max_participants,
          current_participants: 0,
          target_audience,
          customizations: finalCustomizations,
          expires_at: expires_at ? new Date(expires_at).toISOString() : null,
          is_active: true
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Survey link creation failed:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to create survey link',
          code: 'CREATE_FAILED'
        } as ApiResponse);
      }

      console.log('✅ Survey link created:', {
        id: surveyLink.id,
        url: (surveyLink as any).url,
        title: surveyLink.title
      });

      res.status(201).json({
        success: true,
        data: surveyLink,
        message: 'Survey link created successfully'
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async getSurveyLinkById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      if (!supabaseAdmin) {
        return res.status(500).json({
          success: false,
          error: 'Service role key not configured',
          code: 'SERVICE_ROLE_MISSING'
        } as ApiResponse);
      }

      // Get survey link with related template data
      const { data: surveyLink, error } = await supabaseAdmin
        .from('survey_links')
        .select(`
          *,
          survey_templates (
            id,
            type,
            category,
            title,
            description,
            target_audience,
            questions
          )
        `)
        .eq('id', id)
        .single();

      if (error || !surveyLink) {
        return res.status(404).json({
          success: false,
          error: 'Survey link not found',
          code: 'SURVEY_LINK_NOT_FOUND'
        } as ApiResponse);
      }

      // Check if link is expired
      if ((surveyLink as any).expires_at && new Date((surveyLink as any).expires_at) < new Date()) {
        return res.status(410).json({
          success: false,
          error: 'Survey link has expired',
          code: 'SURVEY_EXPIRED'
        } as ApiResponse);
      }

      // Check if link is active
      if (!surveyLink.is_active) {
        return res.status(410).json({
          success: false,
          error: 'Survey link is not active',
          code: 'SURVEY_INACTIVE'
        } as ApiResponse);
      }

      // Check participant limit
      if ((surveyLink as any).max_participants && (surveyLink as any).current_participants >= (surveyLink as any).max_participants) {
        return res.status(410).json({
          success: false,
          error: 'Survey has reached maximum participants',
          code: 'SURVEY_FULL'
        } as ApiResponse);
      }

      res.json({
        success: true,
        data: surveyLink,
        message: 'Survey link retrieved successfully'
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async updateSurveyLink(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const {
        title,
        description,
        is_active,
        max_participants,
        target_audience,
        customizations,
        expires_at
      } = req.body;

      if (!supabaseAdmin) {
        return res.status(500).json({
          success: false,
          error: 'Service role key not configured',
          code: 'SERVICE_ROLE_MISSING'
        } as ApiResponse);
      }

      const updateData: any = {};

      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (is_active !== undefined) updateData.is_active = is_active;
      if (max_participants !== undefined) updateData.max_participants = max_participants;
      if (target_audience !== undefined) updateData.target_audience = target_audience;
      if (customizations !== undefined) updateData.customizations = customizations;
      if (expires_at !== undefined) {
        updateData.expires_at = expires_at ? new Date(expires_at).toISOString() : null;
      }

      const { data: updatedSurveyLink, error } = await supabaseAdmin
        .from('survey_links')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Database error:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to update survey link',
          code: 'UPDATE_FAILED'
        } as ApiResponse);
      }

      if (!updatedSurveyLink) {
        return res.status(404).json({
          success: false,
          error: 'Survey link not found',
          code: 'SURVEY_LINK_NOT_FOUND'
        } as ApiResponse);
      }

      res.json({
        success: true,
        data: updatedSurveyLink,
        message: 'Survey link updated successfully'
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async deleteSurveyLink(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      if (!supabaseAdmin) {
        return res.status(500).json({
          success: false,
          error: 'Service role key not configured',
          code: 'SERVICE_ROLE_MISSING'
        } as ApiResponse);
      }

      // First check if the survey link exists
      const { data: existingSurveyLink, error: fetchError } = await supabaseAdmin
        .from('survey_links')
        .select('id')
        .eq('id', id)
        .single();

      if (fetchError || !existingSurveyLink) {
        return res.status(404).json({
          success: false,
          error: 'Survey link not found',
          code: 'SURVEY_LINK_NOT_FOUND'
        } as ApiResponse);
      }

      // Delete associated survey responses first (cascade behavior)
      await supabaseAdmin
        .from('survey_responses')
        .delete()
        .eq('survey_link_id', id);

      // Delete the survey link
      const { error: deleteError } = await supabaseAdmin
        .from('survey_links')
        .delete()
        .eq('id', id);

      if (deleteError) {
        console.error('Database error:', deleteError);
        return res.status(500).json({
          success: false,
          error: 'Failed to delete survey link',
          code: 'DELETE_FAILED'
        } as ApiResponse);
      }

      res.json({
        success: true,
        message: 'Survey link deleted successfully'
      } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }

  // Survey Responses
  async getSurveyResponses(req: Request, res: Response, next: NextFunction) {
    try {
      if (!supabaseAdmin) {
        return res.status(500).json({
          success: false,
          error: 'Service role key not configured',
          code: 'SERVICE_ROLE_MISSING'
        } as ApiResponse);
      }

      // Get query parameters for filtering
      const { 
        case_id, 
        survey_template_id, 
        participant_email,
        status,
        page = 1, 
        limit = 100,
        sort_by = 'created_at',
        sort_order = 'desc'
      } = req.query;

      let query = supabaseAdmin
        .from('survey_responses')
        .select('*', { count: 'exact' });

      // Apply filters
      if (case_id) {
        query = query.eq('case_id', case_id as string);
      }

      if (survey_template_id) {
        query = query.eq('survey_template_id', survey_template_id as string);
      }

      if (participant_email) {
        query = query.eq('participant_email', participant_email as string);
      }

      if (status && ['in_progress', 'completed', 'submitted'].includes(status as string)) {
        query = query.eq('status', status as 'in_progress' | 'completed' | 'submitted');
      }

      // Apply sorting
      const validSortFields = ['created_at', 'completed_at', 'score', 'participant_name'];
      const sortField = validSortFields.includes(sort_by as string) ? sort_by : 'created_at';
      const sortDirection = sort_order === 'asc' ? true : false;
      
      query = query.order(sortField as string, { ascending: sortDirection });

      // Apply pagination
      const pageNum = Math.max(1, parseInt(page as string) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 100));
      const offset = (pageNum - 1) * limitNum;

      query = query.range(offset, offset + limitNum - 1);

      const { data: responses, error, count } = await query;

      if (error) {
        console.error('Database error:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch survey responses',
          code: 'FETCH_FAILED'
        } as ApiResponse);
      }

      res.json({
        success: true,
        data: responses,
        message: 'Survey responses retrieved successfully',
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limitNum)
        }
      } as ApiResponse<any[]>);
    } catch (error) {
      next(error);
    }
  }

  async getSurveyResponseById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      if (!supabaseAdmin) {
        return res.status(500).json({
          success: false,
          error: 'Service role key not configured',
          code: 'SERVICE_ROLE_MISSING'
        } as ApiResponse);
      }

      const { data: response, error } = await supabaseAdmin
        .from('survey_responses')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !response) {
        return res.status(404).json({
          success: false,
          error: 'Survey response not found',
          code: 'RESPONSE_NOT_FOUND'
        } as ApiResponse);
      }

      res.json({
        success: true,
        data: response,
        message: 'Survey response retrieved successfully'
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async submitSurveyResponse(req: Request, res: Response, next: NextFunction) {
    try {
      console.log('📨 Survey response submission started:', {
        body: req.body,
        headers: {
          'content-type': req.headers['content-type'],
          'user-agent': req.headers['user-agent']?.substring(0, 50)
        }
      });

      const {
        survey_template_id,
        case_id,
        participant_name,
        participant_email,
        team_member_id,
        responses,
        questions,
        technical_details,
        category_scores
      } = req.body;

      console.log('🔍 Survey submission data extracted:', {
        survey_template_id,
        case_id,
        participant_name,
        participant_email,
        hasResponses: !!responses,
        responseCount: responses ? Object.keys(responses).length : 0,
        hasQuestions: !!questions,
        questionCount: questions ? questions.length : 0
      });

      // Adaptive Technical Assessment için özel metoda yönlendir
      if (survey_template_id === 'adaptive-technical-assessment') {
        console.log('🧠 Redirecting to adaptive assessment method');
        return await surveyController.submitAdaptiveAssessmentResponse(req, res, next);
      }

      if (!survey_template_id || !participant_name || !participant_email || !responses) {
        console.error('❌ Missing required fields:', {
          survey_template_id: !!survey_template_id,
          participant_name: !!participant_name,
          participant_email: !!participant_email,
          responses: !!responses
        });
        return res.status(400).json({
          success: false,
          error: 'Survey template ID, participant name, email and responses are required',
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

      // IMPROVED: Calculate score using the same function as frontend
      let score = 0;
      let calculatedCategoryScores: Record<string, number> = {};
      let leadershipTypeScores: Record<string, number> = {};
      let dominantLeadershipType = 'operasyonel-yetenek';
      let detailedBreakdown: any[] = [];

      // Use questions if provided, otherwise we'll have basic scoring
      if (questions && questions.length > 0) {
        console.log('📊 Using improved scoring with questions:', questions.length);
        const scoreResult = calculateAssessmentScore(responses, questions);
        // Normalize score to 100
        const normalizedScore = (scoreResult.totalScore / scoreResult.maxPossibleScore) * 100;
        score = Math.round(normalizedScore);
        calculatedCategoryScores = scoreResult.categoryScores;
        leadershipTypeScores = scoreResult.leadershipTypeScores;
        dominantLeadershipType = scoreResult.dominantLeadershipType;
        detailedBreakdown = scoreResult.detailedBreakdown;
        
        console.log('📊 IMPROVED Score calculation completed:', {
          rawScore: scoreResult.totalScore,
          maxPossibleScore: scoreResult.maxPossibleScore,
          normalizedScore: score,
          categoryScores: calculatedCategoryScores,
          leadershipTypeScores,
          dominantLeadershipType,
          breakdownCount: detailedBreakdown.length
        });
      } else {
        // Fallback to simple scoring if no questions provided
        console.log('⚠️ No questions provided, using simple scoring');
        let totalScore = 0;
        let maxScore = 0;

        if (responses && typeof responses === 'object') {
          Object.values(responses).forEach((response: any) => {
            if (response.points) {
              totalScore += response.points;
              maxScore += response.maxPoints || response.points;
            }
          });
        }

        score = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

        console.log('📊 Simple score calculation completed:', {
          totalScore,
          maxScore,
          finalScore: score,
          responseCount: responses ? Object.keys(responses).length : 0
        });
      }

      // Prepare insert data with improved scoring
      const insertData = {
        survey_template_id,
        case_id,
        participant_id: req.user?.id, // From auth middleware if available
        participant_name,
        participant_email,
        team_member_id,
        responses,
        questions,
        score,
        status: 'completed' as 'completed', // Type assertion for TypeScript
        technical_details: technical_details || {
          breakdown: detailedBreakdown,
          leadershipScores: leadershipTypeScores,
          dominantLeadershipType: dominantLeadershipType
        },
        category_scores: category_scores || calculatedCategoryScores,
        // leadership_type: dominantLeadershipType, // TODO: Uncomment after running migration 022
        completed_at: new Date().toISOString(),
        submitted_at: new Date().toISOString()
      };

      console.log('💾 Inserting survey response to database:', {
        survey_template_id: insertData.survey_template_id,
        case_id: insertData.case_id,
        participant_name: insertData.participant_name,
        participant_email: insertData.participant_email,
        score: insertData.score,
        status: insertData.status,
        hasResponses: !!insertData.responses,
        hasQuestions: !!insertData.questions
      });

      // Insert survey response
      const { data: surveyResponse, error } = await supabaseAdmin
        .from('survey_responses')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('❌ Database insertion failed:', {
          error: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          insertData: {
            survey_template_id: insertData.survey_template_id,
            case_id: insertData.case_id,
            participant_email: insertData.participant_email
          }
        });
        return res.status(500).json({
          success: false,
          error: 'Failed to submit survey response',
          code: 'SUBMIT_FAILED',
          details: error.message
        } as ApiResponse);
      }

      console.log('✅ Survey response inserted successfully:', {
        id: surveyResponse.id,
        score: surveyResponse.score,
        participant_name: surveyResponse.participant_name,
        case_id: surveyResponse.case_id
      });

      // Update survey link participant count if applicable
      if (case_id) {
        await supabaseAdmin.rpc('increment_survey_participants' as any, { 
          survey_id: case_id 
        });
      }

      res.status(201).json({
        success: true,
        data: surveyResponse,
        message: 'Survey response submitted successfully'
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async updateSurveyResponse(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const {
        responses,
        questions,
        technical_details,
        category_scores,
        status = 'in_progress'
      } = req.body;

      if (!supabaseAdmin) {
        return res.status(500).json({
          success: false,
          error: 'Service role key not configured',
          code: 'SERVICE_ROLE_MISSING'
        } as ApiResponse);
      }

      // Calculate score from updated responses
      let totalScore = 0;
      let maxScore = 0;

      if (responses && typeof responses === 'object') {
        Object.values(responses).forEach((response: any) => {
          if (response.points) {
            totalScore += response.points;
            maxScore += response.maxPoints || response.points;
          }
        });
      }

      const score = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

      const updateData: any = {};

      if (responses !== undefined) updateData.responses = responses;
      if (questions !== undefined) updateData.questions = questions;
      if (technical_details !== undefined) updateData.technical_details = technical_details;
      if (category_scores !== undefined) updateData.category_scores = category_scores;
      if (status !== undefined) updateData.status = status;
      
      updateData.score = score;
      
      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }
      if (status === 'submitted') {
        updateData.submitted_at = new Date().toISOString();
      }

      const { data: updatedResponse, error } = await supabaseAdmin
        .from('survey_responses')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Database error:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to update survey response',
          code: 'UPDATE_FAILED'
        } as ApiResponse);
      }

      if (!updatedResponse) {
        return res.status(404).json({
          success: false,
          error: 'Survey response not found',
          code: 'RESPONSE_NOT_FOUND'
        } as ApiResponse);
      }

      res.json({
        success: true,
        data: updatedResponse,
        message: 'Survey response updated successfully'
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async deleteSurveyResponse(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      if (!supabaseAdmin) {
        return res.status(500).json({
          success: false,
          error: 'Service role key not configured',
          code: 'SERVICE_ROLE_MISSING'
        } as ApiResponse);
      }

      // First check if the response exists
      const { data: existingResponse, error: fetchError } = await supabaseAdmin
        .from('survey_responses')
        .select('case_id')
        .eq('id', id)
        .single();

      if (fetchError || !existingResponse) {
        return res.status(404).json({
          success: false,
          error: 'Survey response not found',
          code: 'RESPONSE_NOT_FOUND'
        } as ApiResponse);
      }

      // Delete the response
      const { error: deleteError } = await supabaseAdmin
        .from('survey_responses')
        .delete()
        .eq('id', id);

      if (deleteError) {
        console.error('Database error:', deleteError);
        return res.status(500).json({
          success: false,
          error: 'Failed to delete survey response',
          code: 'DELETE_FAILED'
        } as ApiResponse);
      }

      // Update survey link participant count if applicable
      if (existingResponse.case_id) {
        await supabaseAdmin.rpc('decrement_survey_participants' as any, { 
          survey_id: existingResponse.case_id 
        });
      }

      res.json({
        success: true,
        message: 'Survey response deleted successfully'
      } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }

  // Dynamic Survey Generation
  async generateDynamicSurvey(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({
        success: true,
        data: { message: 'Generate dynamic survey - coming soon' },
        message: 'Feature coming soon'
      } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }

  async generateSurveyForCase(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({
        success: true,
        data: { message: 'Generate survey for case - coming soon' },
        message: 'Feature coming soon'
      } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }

  // Survey Analytics
  async getResponsesSummary(req: Request, res: Response, next: NextFunction) {
    try {
      if (!supabaseAdmin) {
        return res.status(500).json({
          success: false,
          error: 'Service role key not configured',
          code: 'SERVICE_ROLE_MISSING'
        } as ApiResponse);
      }

      const { case_id, survey_template_id, date_from, date_to } = req.query;

      // Base query for survey responses
      let query = supabaseAdmin
        .from('survey_responses')
        .select('*');

      // Apply filters
      if (case_id) {
        query = query.eq('case_id', case_id as string);
      }

      if (survey_template_id) {
        query = query.eq('survey_template_id', survey_template_id as string);
      }

      if (date_from) {
        query = query.gte('created_at', new Date(date_from as string).toISOString());
      }

      if (date_to) {
        query = query.lte('created_at', new Date(date_to as string).toISOString());
      }

      const { data: responses, error } = await query;

      if (error) {
        console.error('Database error:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch survey responses',
          code: 'FETCH_FAILED'
        } as ApiResponse);
      }

      // Calculate summary statistics
      const totalResponses = responses?.length || 0;
      const completedResponses = responses?.filter(r => r.status === 'completed').length || 0;
      const inProgressResponses = responses?.filter(r => r.status === 'in_progress').length || 0;

      // Score statistics
      const completedScores = responses?.filter(r => r.status === 'completed' && r.score !== null).map(r => r.score || 0) || [];
      const averageScore = completedScores.length > 0 ? 
        Math.round(completedScores.reduce((a, b) => (a || 0) + (b || 0), 0) / completedScores.length) : 0;

      const maxScore = completedScores.length > 0 ? Math.max(...completedScores) : 0;
      const minScore = completedScores.length > 0 ? Math.min(...completedScores) : 0;

      // Participation by date
      const participationByDate = responses?.reduce((acc: any, response) => {
        const date = new Date(response.created_at).toISOString().split('T')[0];
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {}) || {};

      // Score distribution
      const scoreRanges = {
        '0-20': 0,
        '21-40': 0,
        '41-60': 0,
        '61-80': 0,
        '81-100': 0
      };

      completedScores.forEach(score => {
        if (score !== null) {
          if (score <= 20) scoreRanges['0-20']++;
          else if (score <= 40) scoreRanges['21-40']++;
          else if (score <= 60) scoreRanges['41-60']++;
          else if (score <= 80) scoreRanges['61-80']++;
          else scoreRanges['81-100']++;
        }
      });

      const summary = {
        overview: {
          totalResponses,
          completedResponses,
          inProgressResponses,
          completionRate: totalResponses > 0 ? Math.round((completedResponses / totalResponses) * 100) : 0
        },
        scores: {
          averageScore,
          maxScore,
          minScore,
          totalScored: completedScores.length
        },
        distribution: {
          scoreRanges,
          participationByDate
        },
        trends: {
          recentActivity: responses?.filter(r => {
            const responseDate = new Date(r.created_at);
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            return responseDate >= sevenDaysAgo;
          }).length || 0
        }
      };

      res.json({
        success: true,
        data: summary,
        message: 'Survey responses summary retrieved successfully'
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async getTemplateAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({
        success: true,
        data: { message: 'Template analytics - coming soon' },
        message: 'Feature coming soon'
      } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }

  async getCaseSurveyAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({
        success: true,
        data: { message: 'Case survey analytics - coming soon' },
        message: 'Feature coming soon'
      } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }

  // =====================================================
  // ASSESSMENT CALCULATION METHODS
  // =====================================================

  /**
   * Calculate simple application assessment based on case threshold
   */
  private calculateApplicationAssessment(
    score: number, 
    responses: Record<string, any>, 
    params: {
      threshold: number;
      caseTitle: string;
      caseDomain: string;
    }
  ): {
    thresholdMet: boolean;
    recommendedStatus: 'pending' | 'reviewed' | 'accepted' | 'rejected';
    classification: 'qualified' | 'ramp-ready';
    evaluationNotes: string;
    strengthAreas: string[];
    developmentAreas: string[];
  } {
    const { threshold, caseTitle, caseDomain } = params;
    
    console.log('🔍 Basit assessment başlatılıyor:', { score, threshold, caseTitle });

    let classification: 'qualified' | 'ramp-ready';
    let recommendedStatus: 'pending' | 'reviewed' | 'accepted' | 'rejected';
    let evaluationNotes: string;
    const strengthAreas: string[] = [];
    const developmentAreas: string[] = [];

    // Basit 2 seviyeli sınıflandırma - sadece case threshold'una göre
    if (score >= threshold) {
      classification = 'qualified';
      recommendedStatus = 'accepted';
      evaluationNotes = `Tebrikler! ${score}/100 puan ile qualified statüsünde değerlendirildiniz. Case için belirlenen ${threshold} puan eşiğini geçtiniz.`;
      strengthAreas.push('Threshold geçme başarısı', 'Teknik yeterlilik');
    } else {
      classification = 'ramp-ready';
      recommendedStatus = 'pending';
      evaluationNotes = `${score}/100 puan ile başlangıç rampası eğitimine uygun bulundunuz. Case threshold'u ${threshold} puan olup, eğitim sonrası tekrar değerlendirileceksiniz.`;
      strengthAreas.push('Eğitim potansiyeli');
      developmentAreas.push('Threshold geçme hedefi');
    }

    // Experience level analysis from personal info
    const experienceLevel = this.analyzeExperienceLevel(responses);
    if (experienceLevel.isExperienced) {
      strengthAreas.push('Sektör deneyimi');
    } else if (experienceLevel.isEntry) {
      if (classification === 'qualified') {
        strengthAreas.push('Hızlı öğrenme potansiyeli');
      } else {
        developmentAreas.push('Deneyim kazanma');
      }
    }

    // Location analysis for Konya-based projects
    const locationInfo = this.analyzeLocationPreference(responses);
    if (locationInfo.isKonyaBased) {
      strengthAreas.push('Konya lokasyonu uygunluğu');
    } else if (locationInfo.canRelocate) {
      strengthAreas.push('Lokasyon esnekliği');
    } else {
      developmentAreas.push('Lokasyon kısıtı');
    }

    // Availability status
    const availability = this.analyzeAvailability(responses);
    if (availability.isFullyAvailable) {
      strengthAreas.push('Tam zamanlı uygunluk');
    } else if (availability.isPartiallyAvailable) {
      developmentAreas.push('Zaman kısıtları');
    }

    console.log('📊 Basit assessment tamamlandı:', { 
      classification, 
      recommendedStatus, 
      thresholdMet: score >= threshold,
      strengthAreas: strengthAreas.length,
      developmentAreas: developmentAreas.length 
    });

    return {
      thresholdMet: score >= threshold,
      recommendedStatus,
      classification,
      evaluationNotes,
      strengthAreas,
      developmentAreas
    };
  }

  /**
   * Analyze experience level from responses
   */
  private analyzeExperienceLevel(responses: Record<string, any>): {
    isExperienced: boolean;
    isEntry: boolean;
    years: string;
  } {
    const experienceResponse = responses['personal-experience-years'] || '';
    
    if (experienceResponse.includes('5-8') || experienceResponse.includes('8+')) {
      return { isExperienced: true, isEntry: false, years: experienceResponse };
    } else if (experienceResponse.includes('0-1') || experienceResponse.includes('Yeni')) {
      return { isExperienced: false, isEntry: true, years: experienceResponse };
    } else {
      return { isExperienced: false, isEntry: false, years: experienceResponse };
    }
  }

  /**
   * Analyze location preference from responses
   */
  private analyzeLocationPreference(responses: Record<string, any>): {
    isKonyaBased: boolean;
    canRelocate: boolean;
    preferenceText: string;
  } {
    const locationResponse = responses['personal-location-konya'] || '';
    
    if (locationResponse.includes('Evet, Konya')) {
      return { isKonyaBased: true, canRelocate: true, preferenceText: locationResponse };
    } else if (locationResponse.includes('gelebilirim')) {
      return { isKonyaBased: false, canRelocate: true, preferenceText: locationResponse };
    } else {
      return { isKonyaBased: false, canRelocate: false, preferenceText: locationResponse };
    }
  }

  /**
   * Analyze work availability from responses
   */
  private analyzeAvailability(responses: Record<string, any>): {
    isFullyAvailable: boolean;
    isPartiallyAvailable: boolean;
    statusText: string;
  } {
    const workStatusResponse = responses['personal-work-status'] || '';
    
    if (workStatusResponse.includes('Aktif olarak çalışmıyorum') || workStatusResponse.includes('Öğrenciyim')) {
      return { isFullyAvailable: true, isPartiallyAvailable: false, statusText: workStatusResponse };
    } else if (workStatusResponse.includes('Part-time') || workStatusResponse.includes('Freelancer')) {
      return { isFullyAvailable: false, isPartiallyAvailable: true, statusText: workStatusResponse };
    } else {
      return { isFullyAvailable: false, isPartiallyAvailable: false, statusText: workStatusResponse };
    }
  }

  /**
   * Send notification emails after application creation
   */
  private async sendApplicationNotifications(
    application: any, 
    assessment: any, 
    params: {
      caseName: string;
      applicantEmail: string;
      applicantName: string;
    }
  ): Promise<void> {
    try {
      const { caseName, applicantEmail, applicantName } = params;

      console.log('📧 Bildirim e-postaları gönderiliyor...');

      // Applicant email content
      const applicantEmailContent = this.generateApplicantEmail(assessment, caseName, applicantName);
      
      // Admin email content  
      const adminEmailContent = this.generateAdminEmail(application, assessment, caseName);

      // TODO: Implement actual email sending service
      // For now, log the emails
      console.log('📧 Başvurucu e-postası:', {
        to: applicantEmail,
        subject: `Alliance Portal - ${caseName} Başvurunuz Alındı`,
        content: applicantEmailContent
      });

      console.log('📧 Yönetici e-postası:', {
        to: 'admin@alliance.com', // TODO: Get from config
        subject: `Yeni Başvuru: ${applicantName} - ${caseName}`,
        content: adminEmailContent
      });

      // Update application with notification status
      if (supabaseAdmin) {
        await supabaseAdmin
          .from('applications' as any)
          .update({
            notes: (application.notes || '') + '\n\n[Sistem] Bildirim e-postaları gönderildi.'
          })
          .eq('id', application.id);
      }

      console.log('✅ Bildirim e-postaları başarıyla gönderildi');

    } catch (error) {
      console.error('❌ E-posta gönderme hatası:', error);
    }
  }

  /**
   * Generate email content for applicant
   */
  private generateApplicantEmail(assessment: any, caseName: string, applicantName: string): string {
    const statusText = assessment.classification === 'qualified' 
      ? 'Tebrikler! Qualified statüsünde değerlendirildiniz.' 
      : 'Başlangıç rampası eğitimine uygun bulundunuz.';

    return `
Merhaba ${applicantName},

${caseName} için yaptığınız başvuru değerlendirildi.

📊 Değerlendirme Sonucu:
${statusText}

📈 Puanınız: ${assessment.score || 'N/A'}/100
📝 Değerlendirme: ${assessment.evaluationNotes}

💪 Güçlü Yönleriniz:
${assessment.strengthAreas?.map((area: string) => `• ${area}`).join('\n') || 'Belirtilmedi'}

🎯 Odaklanma Alanlarınız:
${assessment.developmentAreas?.map((area: string) => `• ${area}`).join('\n') || 'Belirtilmedi'}

${assessment.classification === 'qualified' 
  ? 'Doğrudan case ekibine dahil olmanız için gerekli süreçler başlatılacaktır.' 
  : 'Başlangıç rampası eğitimi için tarafınızla iletişime geçilecektir.'}

Saygılarımızla,
Alliance Portal Ekibi
    `;
  }

  /**
   * Generate email content for admin
   */
  private generateAdminEmail(application: any, assessment: any, caseName: string): string {
    const statusIcon = assessment.classification === 'qualified' ? '🏆' : '📈';
    const statusText = assessment.classification === 'qualified' ? 'QUALIFIED' : 'BAŞLANGIÇ RAMPASI';
    
    return `
${statusIcon} Yeni Başvuru: ${caseName}

👤 Başvurucu: ${application.participant_name}
📧 E-posta: ${application.participant_email}
📊 Puan: ${application.score}/100
🏷️ Sınıflandırma: ${statusText}
📋 Sistem Önerisi: ${assessment.recommendedStatus}

📝 Değerlendirme Notları:
${assessment.evaluationNotes}

💪 Güçlü Yönler: ${assessment.strengthAreas?.join(', ') || 'Belirtilmedi'}
🎯 Odaklanma Alanları: ${assessment.developmentAreas?.join(', ') || 'Yok'}

🔍 Detaylar:
• Başvuru ID: ${application.id}
• Anket Yanıt ID: ${application.survey_response_id}
• Threshold Geçti: ${assessment.thresholdMet ? 'Evet' : 'Hayır'}

${assessment.classification === 'qualified' 
  ? '✅ Bu aday doğrudan case ekibine alınabilir.'
  : '📚 Bu aday başlangıç rampası eğitimine dahil edilebilir.'}

Admin panelinden detaylı inceleme yapabilirsiniz.
    `;
  }

  // Public Survey Access
  async getPublicSurvey(req: Request, res: Response, next: NextFunction) {
    try {
      const { linkId } = req.params;
      console.log('🔍 getPublicSurvey called with linkId:', linkId);

      if (!supabaseAdmin) {
        return res.status(500).json({
          success: false,
          error: 'Service role key not configured',
          code: 'SERVICE_ROLE_MISSING'
        } as ApiResponse);
      }

      // Get survey link with template data (public access - no auth required)
      const { data: surveyLink, error } = await supabaseAdmin
        .from('survey_links')
        .select(`
          *,
          survey_templates (
            id,
            type,
            category,
            title,
            description,
            target_audience,
            questions,
            is_dynamic
          ),
          cases (
            id,
            title,
            description
          )
        `)
        .eq('url', linkId)
        .eq('is_active', true)
        .single();

      if (error || !surveyLink) {
        return res.status(404).json({
          success: false,
          error: 'Survey not found or not accessible',
          code: 'SURVEY_NOT_FOUND'
        } as ApiResponse);
      }

      // Check if link is expired
      if ((surveyLink as any).expires_at && new Date((surveyLink as any).expires_at) < new Date()) {
        return res.status(410).json({
          success: false,
          error: 'Survey has expired',
          code: 'SURVEY_EXPIRED'
        } as ApiResponse);
      }

      // Check participant limit
      if ((surveyLink as any).max_participants && (surveyLink as any).current_participants >= (surveyLink as any).max_participants) {
        return res.status(410).json({
          success: false,
          error: 'Survey has reached maximum participants',
          code: 'SURVEY_FULL'
        } as ApiResponse);
      }

      // Handle dynamic surveys - use customizations if available
      let questions = (surveyLink as any).survey_templates?.questions || [];
      
      const customizations = surveyLink.customizations as any;
      // Check for generated questions (generatedQuestions from createSurveyLink)
      if (customizations?.generatedQuestions && Array.isArray(customizations.generatedQuestions) && customizations.generatedQuestions.length > 0) {
        console.log('🎯 Dinamik anket tespit edildi (generatedQuestions), customizations\'dan sorular alınıyor...');
        questions = customizations.generatedQuestions;
        console.log(`✅ ${questions.length} dinamik soru yüklendi`);
      }
      // Fallback to old dynamicQuestions key for backwards compatibility
      else if (customizations?.dynamicQuestions && Array.isArray(customizations.dynamicQuestions) && customizations.dynamicQuestions.length > 0) {
        console.log('🎯 Dinamik anket tespit edildi (dynamicQuestions), customizations\'dan sorular alınıyor...');
        questions = customizations.dynamicQuestions;
        console.log(`✅ ${questions.length} dinamik soru yüklendi`);
      }

      // Remove sensitive data before sending to public
      const publicSurveyData = {
        id: (surveyLink as any).id,
        title: surveyLink.title,
        description: surveyLink.description,
        target_audience: (surveyLink as any).target_audience,
        current_participants: (surveyLink as any).current_participants,
        max_participants: (surveyLink as any).max_participants,
        template: (surveyLink as any).survey_templates ? {
          id: (surveyLink as any).survey_templates.id,
          type: (surveyLink as any).survey_templates.type,
          category: (surveyLink as any).survey_templates.category,
          title: (surveyLink as any).survey_templates.title,
          description: (surveyLink as any).survey_templates.description,
          questions: questions, // Use dynamic questions if available
          is_dynamic: (surveyLink as any).survey_templates.is_dynamic
        } : null,
        case: surveyLink.cases ? {
          id: surveyLink.cases.id,
          title: surveyLink.cases.title,
          description: surveyLink.cases.description
        } : null,
        customizations: surveyLink.customizations
      };

      res.json({
        success: true,
        data: publicSurveyData,
        message: 'Public survey retrieved successfully'
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async submitPublicSurvey(req: Request, res: Response, next: NextFunction) {
    try {
      const { linkId } = req.params;
      const {
        participant_name,
        participant_email,
        responses,
        technical_details,
        category_scores
      } = req.body;

      if (!participant_name || !participant_email || !responses) {
        return res.status(400).json({
          success: false,
          error: 'Participant name, email and responses are required',
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

      // First get the survey link and verify it's accessible
      const { data: surveyLink, error: linkError } = await supabaseAdmin
        .from('survey_links')
        .select(`
          id,
          template_id,
          case_id,
          is_active,
          expires_at,
          max_participants,
          current_participants,
          survey_templates (
            id,
            questions
          )
        `)
        .eq('url', linkId)
        .eq('is_active', true)
        .single();

      if (linkError || !surveyLink) {
        return res.status(404).json({
          success: false,
          error: 'Survey not found or not accessible',
          code: 'SURVEY_NOT_FOUND'
        } as ApiResponse);
      }

      // Check if link is expired
      if ((surveyLink as any).expires_at && new Date((surveyLink as any).expires_at) < new Date()) {
        return res.status(410).json({
          success: false,
          error: 'Survey has expired',
          code: 'SURVEY_EXPIRED'
        } as ApiResponse);
      }

      // Check participant limit
      if ((surveyLink as any).max_participants && (surveyLink as any).current_participants >= (surveyLink as any).max_participants) {
        return res.status(410).json({
          success: false,
          error: 'Survey has reached maximum participants',
          code: 'SURVEY_FULL'
        } as ApiResponse);
      }

      // Calculate score from responses - Special handling for application-initial-assessment
      let totalScore = 0;
      let maxScore = 0;

      // Check if this is an application-initial-assessment survey
      const { data: templateData } = await supabaseAdmin
        .from('survey_templates')
        .select('type')
        .eq('id', (surveyLink as any).template_id!)
        .single();

      const isApplicationAssessment = templateData?.type === 'application-initial-assessment';

      if (responses && typeof responses === 'object') {
        Object.entries(responses).forEach(([questionId, response]: [string, any]) => {
          if (response.points) {
            // For application-initial-assessment, only count domain questions (not personal info)
            if (isApplicationAssessment) {
              // Personal info questions typically don't have category or have category 'personal'
              const isPersonalInfo = response.category === 'personal' || 
                                   response.category === 'kişisel' ||
                                   questionId.includes('name') ||
                                   questionId.includes('email') ||
                                   questionId.includes('phone') ||
                                   questionId.includes('location') ||
                                   questionId.includes('experience') ||
                                   questionId.includes('kişisel');

              if (!isPersonalInfo) {
                // Only count domain/assessment questions
                totalScore += response.points;
                maxScore += response.maxPoints || response.points;
                console.log(`📊 Domain question scored: ${questionId} = ${response.points}/${response.maxPoints || response.points}`);
              } else {
                console.log(`ℹ️ Personal info question skipped: ${questionId}`);
              }
            } else {
              // For other surveys, count all questions
              totalScore += response.points;
              maxScore += response.maxPoints || response.points;
            }
          }
        });
      }

      const score = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
      
      if (isApplicationAssessment) {
        console.log(`📊 Application Assessment Scoring: ${totalScore}/${maxScore} = ${score}% (only domain questions counted)`);
      } else {
        console.log(`📊 Regular Survey Scoring: ${totalScore}/${maxScore} = ${score}%`);
      }

      // Check for duplicate submission (same email for same survey)
      const { data: existingResponse } = await supabaseAdmin
        .from('survey_responses')
        .select('id')
        .eq('survey_template_id', (surveyLink as any).template_id!)
        .eq('participant_email', participant_email)
        .eq('case_id', (surveyLink as any).case_id!)
        .single();

      if (existingResponse) {
        return res.status(409).json({
          success: false,
          error: 'You have already submitted a response for this survey',
          code: 'DUPLICATE_SUBMISSION'
        } as ApiResponse);
      }

      // Insert survey response
      const { data: surveyResponse, error } = await supabaseAdmin
        .from('survey_responses')
        .insert({
          survey_template_id: (surveyLink as any).template_id,
          case_id: (surveyLink as any).case_id,
          participant_name,
          participant_email,
          responses,
          questions: (surveyLink as any).customizations?.isDynamic && (surveyLink as any).customizations?.dynamicQuestions 
            ? (surveyLink as any).customizations.dynamicQuestions 
            : (surveyLink as any).survey_templates?.questions,
          score,
          status: 'completed',
          technical_details,
          category_scores,
          completed_at: new Date().toISOString(),
          submitted_at: new Date().toISOString()
        })
        .select('id, score, status, completed_at')
        .single();

      if (error) {
        console.error('Database error:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to submit survey response',
          code: 'SUBMIT_FAILED'
        } as ApiResponse);
      }

      // Update survey link participant count
      await supabaseAdmin.rpc('increment_survey_link_participants' as any, { 
        link_id: (surveyLink as any).id 
      });

      // Create application for application-initial-assessment surveys
      if (((surveyLink as any).survey_templates as any)?.type === 'application-initial-assessment') {
        console.log('🎯 Başvuru ve İlk Değerlendirme anketi tespit edildi, başvuru oluşturuluyor...');
        
        // Get case data for threshold check
        const { data: caseData } = await supabaseAdmin
          .from('cases')
          .select('initial_threshold, title, domain')
          .eq('id', (surveyLink as any).case_id || '')
          .single();

        const threshold = (caseData as any)?.initial_threshold || 70;
        
        // Basit 2 seviyeli değerlendirme sistemi
        const assessment = this.calculateApplicationAssessment(score, responses, {
          threshold,
          caseTitle: (caseData as any)?.title || '',
          caseDomain: (caseData as any)?.domain || ''
        });

        // Extract personal info from responses
        const personalInfo: any = {};
        if (responses) {
          Object.entries(responses).forEach(([key, value]: [string, any]) => {
            if (key.includes('personal-') || key.includes('name') || key.includes('email') || key.includes('phone') || key.includes('location') || key.includes('experience')) {
              personalInfo[key] = value;
            }
          });
        }

        // Create application with detailed assessment
        const { data: application, error: applicationError } = await (supabaseAdmin as any)
          .from('applications')
          .insert({
            case_id: (surveyLink as any).case_id,
            participant_name,
            participant_email,
            survey_response_id: surveyResponse.id,
            status: assessment.recommendedStatus,
            score,
            threshold_met: assessment.thresholdMet,
            personal_info: personalInfo,
            assessment_responses: responses,
            notes: assessment.evaluationNotes
          })
          .select()
          .single();

        if (applicationError) {
          console.error('❌ Application creation failed:', applicationError);
        } else {
          console.log('✅ Application created successfully:', application.id);
          console.log('📊 Assessment result:', assessment);
          
          // Send notification emails
          await this.sendApplicationNotifications(application, assessment, {
            caseName: (caseData as any)?.title || 'Case',
            applicantEmail: participant_email,
            applicantName: participant_name
          });
        }
      }

      res.status(201).json({
        success: true,
        data: surveyResponse,
        message: 'Survey response submitted successfully'
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  // Technical Assessment Methods
  async generateTechnicalAssessment(req: Request, res: Response, next: NextFunction) {
    return technicalAssessmentController.generateTechnicalAssessment(req, res, next);
  }

  async analyzeTechnicalAssessment(req: Request, res: Response, next: NextFunction) {
    return technicalAssessmentController.analyzeTechnicalAssessment(req, res, next);
  }

  // Adaptive Technical Assessment için özel metod
  async submitAdaptiveAssessmentResponse(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        survey_template_id,
        case_id,
        participant_name,
        participant_email,
        responses,
        survey_link_id,
        status = 'completed',
        completed_at
      } = req.body;

      console.log('🎯 Processing Adaptive Technical Assessment Response:', {
        survey_template_id,
        case_id,
        participant_name,
        participant_email,
        hasResponses: !!responses,
        survey_link_id
      });

      if (!survey_template_id || !participant_name || !participant_email || !responses) {
        return res.status(400).json({
          success: false,
          error: 'Survey template ID, participant name, email and responses are required',
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

      // Adaptive assessment için verileri parse et
      const {
        rawAnswers = {},
        phaseScores = {},
        analysisResults = {},
        summary = {},
        metadata = {}
      } = responses;

      console.log('📊 Adaptive Assessment Data:', {
        rawAnswersCount: Object.keys(rawAnswers).length,
        phaseScoresCount: Object.keys(phaseScores).length,
        hasAnalysisResults: !!analysisResults,
        hasSummary: !!summary,
        jobTypes: metadata?.jobTypes || []
      });

      // Skorları hesapla
      let totalScore = summary?.totalScore || 0;
      let maxPossibleScore = summary?.maxPossibleScore || 0;
      let overallPercentage = summary?.completionPercentage || 0;

      // Phase scores'dan skorları hesapla (fallback)
      if (totalScore === 0 && phaseScores) {
        Object.values(phaseScores).forEach((scoreData: any) => {
          if (scoreData.score && scoreData.maxScore) {
            totalScore += scoreData.score;
            maxPossibleScore += scoreData.maxScore;
          }
        });
        overallPercentage = maxPossibleScore > 0 ? Math.round((totalScore / maxPossibleScore) * 100) : 0;
      }

      // Phase completion status'u oluştur
      const phaseCompletionStatus = {
        basic: metadata?.phaseCompletionStatus?.basic || true,
        advanced: metadata?.phaseCompletionStatus?.advanced || false,
        leadership: metadata?.phaseCompletionStatus?.leadership || true,
        character: metadata?.phaseCompletionStatus?.character || true
      };

      // Güçlü ve gelişim alanları
      const strongestAreas = summary?.strongestAreas || [];
      const improvementAreas = summary?.improvementAreas || [];

      // Development recommendations ve progressive development
      const developmentRecommendations = analysisResults?.jobTypeAnalysis || {};
      const progressiveDevelopment = analysisResults?.progressiveDevelopment || {
        short_term: [],
        medium_term: [],
        long_term: []
      };

      // Adaptive assessment response'ı kaydet
      const { data: adaptiveResponse, error } = await supabaseAdmin
        .from('adaptive_assessment_responses')
        .insert({
          case_id,
          survey_link_id,
          participant_name,
          participant_email,
          job_types: metadata?.jobTypes || [],
          assessment_type: 'adaptive-technical-assessment',
          raw_responses: rawAnswers,
          phase_scores: phaseScores,
          analysis_results: analysisResults,
          overall_score: totalScore,
          max_possible_score: maxPossibleScore,
          overall_percentage: overallPercentage,
          phase_completion_status: phaseCompletionStatus,
          strongest_areas: strongestAreas,
          improvement_areas: improvementAreas,
          development_recommendations: developmentRecommendations,
          progressive_development: progressiveDevelopment,
          status: status,
          completed_at: completed_at || new Date().toISOString(),
          submitted_at: new Date().toISOString()
        })
        .select('*')
        .single();

      if (error) {
        console.error('❌ Database error while saving adaptive assessment:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to save adaptive assessment response',
          code: 'ADAPTIVE_SAVE_FAILED',
          details: error.message
        } as ApiResponse);
      }

      console.log('✅ Adaptive Assessment Response saved successfully:', {
        id: adaptiveResponse.id,
        participantName: adaptiveResponse.participant_name,
        overallPercentage: adaptiveResponse.overall_percentage,
        jobTypes: adaptiveResponse.job_types
      });

      res.status(201).json({
        success: true,
        data: {
          id: adaptiveResponse.id,
          overall_percentage: adaptiveResponse.overall_percentage,
          overall_score: adaptiveResponse.overall_score,
          max_possible_score: adaptiveResponse.max_possible_score,
          status: adaptiveResponse.status,
          completed_at: adaptiveResponse.completed_at
        },
        message: 'Adaptive Technical Assessment response saved successfully'
      } as ApiResponse<any>);

    } catch (error) {
      console.error('❌ Error in submitAdaptiveAssessmentResponse:', error);
      next(error);
    }
  }
}

export const surveyController = new SurveyController();
