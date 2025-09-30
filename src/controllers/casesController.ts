import { Request, Response, NextFunction } from 'express';
import { supabase, supabaseAdmin } from '../config/database';
import { CaseScenario, ApiResponse } from '../models/types';

class CasesController {
  async getAllCases(req: Request, res: Response, next: NextFunction) {
    try {
      // Use service role for now (development) - auth middleware already verified user
      if (!supabaseAdmin) {
        return res.status(500).json({
          success: false,
          error: 'Service role key not configured',
          code: 'SERVICE_ROLE_MISSING'
        } as ApiResponse);
      }

      // Get query parameters for filtering and searching
      const { 
        search, 
        status, 
        job_type, 
        specialization, 
        created_by,
        page = 1, 
        limit = 100,
        sort_by = 'created_at',
        sort_order = 'desc'
      } = req.query;

      console.log('🔍 getCases API called with params:', {
        search, status, job_type, specialization, created_by,
        page, limit, sort_by, sort_order,
        userRole: req.user?.role,
        userId: req.userId,
        userEmail: req.user?.email
      });

      // Eğer created_by parametresi varsa ama undefined/null ise uyar
      if (created_by !== undefined && !created_by) {
        console.warn('⚠️  created_by parameter is provided but empty/null:', created_by);
      }

      let query = supabaseAdmin
        .from('cases')
        .select('*', { count: 'exact' });

      // Apply search filter
      if (search) {
        query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
      }

      // Apply status filter
      if (status && ['active', 'completed', 'archived'].includes(status as string)) {
        query = query.eq('status', status as 'active' | 'completed' | 'archived');
      }

      // Apply job type filter - check if array contains the job type
      if (job_type) {
        query = query.contains('job_types', [job_type as string]);
      }

      // Apply specialization filter - check if array contains the specialization
      if (specialization) {
        query = query.contains('specializations', [specialization as string]);
      }

      // Apply created_by filter
      if (created_by) {
        query = query.eq('created_by', created_by as string);
      }

      // Apply sorting
      const sortOrder = sort_order === 'asc' ? { ascending: true } : { ascending: false };
      query = query.order(sort_by as string, sortOrder);

      // Apply pagination
      const pageNum = parseInt(page as string);
      const limitNum = Math.min(parseInt(limit as string), 100); // Max 100 items per page
      const offset = (pageNum - 1) * limitNum;
      
      if (pageNum > 1) {
        query = query.range(offset, offset + limitNum - 1);
      } else {
        query = query.limit(limitNum);
      }

      const { data: cases, error: casesError, count } = await query;

      console.log('📊 getCases query result:', {
        casesCount: cases?.length || 0,
        totalCount: count,
        error: casesError?.message,
        caseTitles: cases?.map(c => c.title) || [],
        caseCreatedBy: cases?.map(c => ({ title: c.title, created_by: c.created_by, status: c.status })) || []
      });

      if (casesError) {
        console.error('❌ getCases database error:', casesError);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch cases',
          code: 'FETCH_FAILED'
        } as ApiResponse);
      }

      res.json({
        success: true,
        data: {
          cases: cases || [],
          pagination: {
            page: pageNum,
            limit: limitNum,
            total: count || 0,
            totalPages: Math.ceil((count || 0) / limitNum)
          },
          filters: {
            search: search || null,
            status: status || null,
            job_type: job_type || null,
            specialization: specialization || null,
            created_by: created_by || null,
            sort_by: sort_by as string,
            sort_order: sort_order as string
          }
        },
        message: 'Cases retrieved successfully'
      } as ApiResponse);

    } catch (error) {
      next(error);
    }
  }

  async getCaseById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.userId;
      const userRole = req.user?.role;

      if (!userId || !userRole) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated',
          code: 'NOT_AUTHENTICATED'
        } as ApiResponse);
      }

      if (!supabaseAdmin) {
        return res.status(500).json({
          success: false,
          error: 'Service role key not configured',
          code: 'SERVICE_ROLE_MISSING'
        } as ApiResponse);
      }

      // First get the case to check ownership/access rights
      const { data: caseData, error: caseError } = await supabaseAdmin
        .from('cases')
        .select('*')
        .eq('id', id)
        .single();

      if (caseError || !caseData) {
        return res.status(404).json({
          success: false,
          error: 'Case not found',
          code: 'CASE_NOT_FOUND'
        } as ApiResponse);
      }

      // Check access rights:
      // 1. Admin and alliance can see all cases
      // 2. Case owner can see their own case
      // 3. Anyone can see active cases (public visibility)
      const isAdmin = userRole === 'admin';
      const isAlliance = userRole === 'alliance';
      const isCaseOwner = caseData.created_by === userId;
      const isActiveCase = caseData.status === 'active';

      if (!isAdmin && !isAlliance && !isCaseOwner && !isActiveCase) {
        return res.status(403).json({
          success: false,
          error: 'Access denied - insufficient permissions',
          code: 'ACCESS_DENIED'
        } as ApiResponse);
      }

      console.log(`🔍 Case access granted: ${req.user?.email} accessing case ${caseData.title}`, {
        userRole,
        isCaseOwner,
        isActiveCase,
        caseStatus: caseData.status
      });

      res.json({
        success: true,
        data: caseData,
        message: 'Case retrieved successfully'
      } as ApiResponse<CaseScenario>);

    } catch (error) {
      next(error);
    }
  }

  async createCase(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.userId;
      const {
        title,
        description,
        domain,
        job_types = [],
        specializations = [],
        requirements = [],
        initial_threshold = 70,
        team_requirements = [],
        idea_id
      } = req.body;

      if (!title || !description) {
        return res.status(400).json({
          success: false,
          error: 'Title and description are required',
          code: 'MISSING_FIELDS'
        } as ApiResponse);
      }

      // Use service role for case creation (bypasses RLS)
      if (!supabaseAdmin) {
        return res.status(500).json({
          success: false,
          error: 'Service role key not configured',
          code: 'SERVICE_ROLE_MISSING'
        } as ApiResponse);
      }

      const { data, error } = await supabaseAdmin
        .from('cases')
        .insert({
          title,
          description,
          domain,
          job_types,
          specializations,
          requirements,
          team_requirements,
          created_by: userId,
          initial_threshold,
          idea_id
        })
        .select()
        .single();

      if (error) {
        return res.status(500).json({
          success: false,
          error: 'Failed to create case',
          code: 'CREATE_FAILED'
        } as ApiResponse);
      }

      res.status(201).json({
        success: true,
        data,
        message: 'Case created successfully'
      } as ApiResponse<CaseScenario>);

    } catch (error) {
      next(error);
    }
  }

  async updateCase(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Use service role for case update (bypasses RLS)
      if (!supabaseAdmin) {
        return res.status(500).json({
          success: false,
          error: 'Service role key not configured',
          code: 'SERVICE_ROLE_MISSING'
        } as ApiResponse);
      }

      const { data, error } = await supabaseAdmin
        .from('cases')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error || !data) {
        return res.status(404).json({
          success: false,
          error: 'Case not found or update failed',
          code: 'UPDATE_FAILED'
        } as ApiResponse);
      }

      res.json({
        success: true,
        data,
        message: 'Case updated successfully'
      } as ApiResponse<CaseScenario>);

    } catch (error) {
      next(error);
    }
  }

  async deleteCase(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      console.log(`🗑️ Attempting to delete case: ${id}`);

      // Check if service role is configured
      if (!supabaseAdmin) {
        console.error('❌ Service role key not configured');
        return res.status(500).json({
          success: false,
          error: 'Service role key not configured',
          code: 'SERVICE_ROLE_MISSING'
        } as ApiResponse);
      }

      // First check if the case exists
      const { data: existingCase, error: fetchError } = await supabaseAdmin
        .from('cases')
        .select('id, title, created_by')
        .eq('id', id)
        .single();

      if (fetchError) {
        console.error('❌ Error fetching case:', fetchError);
        if (fetchError.code === 'PGRST116') {
          return res.status(404).json({
            success: false,
            error: 'Case not found',
            code: 'CASE_NOT_FOUND'
          } as ApiResponse);
        }
        throw fetchError;
      }

      if (!existingCase) {
        return res.status(404).json({
          success: false,
          error: 'Case not found',
          code: 'CASE_NOT_FOUND'
        } as ApiResponse);
      }

      console.log(`🗑️ Deleting case: ${existingCase.title} (${id})`);

      // Use a transaction to ensure all related data is deleted properly
      const { error: deleteError } = await supabaseAdmin
        .from('cases')
        .delete()
        .eq('id', id);

      if (deleteError) {
        console.error('❌ Database error during case deletion:', deleteError);
        return res.status(500).json({
          success: false,
          error: 'Failed to delete case',
          code: 'DELETE_FAILED',
          details: deleteError.message
        } as ApiResponse);
      }

      console.log(`✅ Case deleted successfully: ${existingCase.title}`);

      res.json({
        success: true,
        message: 'Case deleted successfully'
      } as ApiResponse);

    } catch (error) {
      console.error('❌ Error in deleteCase:', error);
      next(error);
    }
  }

  // Test endpoint to verify service role configuration
  async testServiceRole(req: Request, res: Response, next: NextFunction) {
    try {
      if (!supabaseAdmin) {
        return res.status(500).json({
          success: false,
          error: 'Service role key not configured',
          code: 'SERVICE_ROLE_MISSING'
        } as ApiResponse);
      }

      // Test a simple query to verify service role works
      const { data, error } = await supabaseAdmin
        .from('cases')
        .select('count(*)')
        .limit(1);

      if (error) {
        console.error('❌ Service role test failed:', error);
        return res.status(500).json({
          success: false,
          error: 'Service role test failed',
          code: 'SERVICE_ROLE_TEST_FAILED',
          details: error.message
        } as ApiResponse);
      }

      res.json({
        success: true,
        message: 'Service role is working correctly',
        data: { count: data }
      } as ApiResponse);

    } catch (error) {
      console.error('❌ Error in testServiceRole:', error);
      next(error);
    }
  }

  // Placeholder methods - to be implemented
  async getCaseStats(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      if (!supabaseAdmin) {
        return res.status(500).json({
          success: false,
          error: 'Service role key not configured',
          code: 'SERVICE_ROLE_MISSING'
        } as ApiResponse);
      }

      // Get case basic info
      const { data: caseData, error: caseError } = await supabaseAdmin
        .from('cases')
        .select('*')
        .eq('id', id)
        .single();

      if (caseError || !caseData) {
        return res.status(404).json({
          success: false,
          error: 'Case not found',
          code: 'CASE_NOT_FOUND'
        } as ApiResponse);
      }

      // Get team members count
      const { count: teamMembersCount } = await supabaseAdmin
        .from('team_members')
        .select('*', { count: 'exact', head: true })
        .eq('case_id', id);

      // Get team members by status
      const { data: teamMembers } = await supabaseAdmin
        .from('team_members')
        .select('assessment_status')
        .eq('case_id', id);

      const teamStats = teamMembers?.reduce((acc: any, member) => {
        acc[member.assessment_status] = (acc[member.assessment_status] || 0) + 1;
        return acc;
      }, {}) || {};

      // Get survey responses count
      const { count: responsesCount } = await supabaseAdmin
        .from('survey_responses')
        .select('*', { count: 'exact', head: true })
        .eq('case_id', id);

      // Get survey responses by status
      const { data: responses } = await supabaseAdmin
        .from('survey_responses')
        .select('status, score, submitted_at, completed_at')
        .eq('case_id', id);

      const responseStats = responses?.reduce((acc: any, response) => {
        acc[response.status] = (acc[response.status] || 0) + 1;
        return acc;
      }, {}) || {};

      // Calculate average score
      const completedResponses = responses?.filter(r => r.status === 'completed' && r.score !== null) || [];
      const averageScore = completedResponses.length > 0 ? 
        Math.round(completedResponses.reduce((sum, r) => sum + (r.score || 0), 0) / completedResponses.length) : 0;

      // Get survey links count
      const { count: surveyLinksCount } = await supabaseAdmin
        .from('survey_links')
        .select('*', { count: 'exact', head: true })
        .eq('case_id', id)
        .eq('is_active', true);

      // Calculate progress percentage
      const targetTeamSize = caseData.ideal_team_size || 8;
      const teamProgress = Math.min(100, Math.round(((teamMembersCount || 0) / targetTeamSize) * 100));

      const stats = {
        case: {
          id: caseData.id,
          title: caseData.title,
          status: caseData.status,
          created_at: caseData.created_at,
          target_team_count: caseData.target_team_count,
          ideal_team_size: caseData.ideal_team_size,
          initial_threshold: caseData.initial_threshold
        },
        team: {
          total_members: teamMembersCount || 0,
          completed: teamStats.completed || 0,
          in_progress: teamStats.in_progress || 0,
          not_started: teamStats.not_started || 0,
          invited: teamStats.invited || 0,
          progress_percentage: teamProgress
        },
        assessments: {
          total_responses: responsesCount || 0,
          completed: responseStats.completed || 0,
          in_progress: responseStats.in_progress || 0,
          average_score: averageScore,
          completion_rate: (responsesCount || 0) > 0 ? 
            Math.round(((responseStats.completed || 0) / (responsesCount || 1)) * 100) : 0
        },
        surveys: {
          active_links: surveyLinksCount || 0
        },
        timeline: {
          days_since_creation: Math.floor((new Date().getTime() - new Date(caseData.created_at).getTime()) / (1000 * 60 * 60 * 24)),
          last_activity: responses && responses.length > 0 ? 
            Math.max(...responses.map(r => new Date(r.submitted_at || r.completed_at || 0).getTime())) : null
        }
      };

      res.json({
        success: true,
        data: stats,
        message: 'Case statistics retrieved successfully'
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async getCaseAnalytics(req: Request, res: Response, next: NextFunction) {
    res.json({
      success: true,
      data: { message: 'Case analytics - coming soon' },
      message: 'Feature coming soon'
    } as ApiResponse);
  }

  async getTeamMembers(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      if (!supabaseAdmin) {
        return res.status(500).json({
          success: false,
          error: 'Service role key not configured',
          code: 'SERVICE_ROLE_MISSING'
        } as ApiResponse);
      }

      // Get team members for the case
      const { data: teamMembers, error } = await supabaseAdmin
        .from('team_members')
        .select(`
          *,
          users (
            id,
            name,
            email
          )
        `)
        .eq('case_id', id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Database error:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch team members',
          code: 'FETCH_FAILED'
        } as ApiResponse);
      }

      res.json({
        success: true,
        data: teamMembers || [],
        message: 'Team members retrieved successfully'
      } as ApiResponse<any[]>);
    } catch (error) {
      next(error);
    }
  }

  async addTeamMember(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params; // case_id
      const {
        participant_id,
        participant_name,
        participant_email,
        role,
        fit_score,
        reasons,
        status = 'pending'
      } = req.body;

      if (!participant_name || !participant_email || !role) {
        return res.status(400).json({
          success: false,
          error: 'Participant name, email and role are required',
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

      // Check if case exists
      const { data: caseData, error: caseError } = await supabaseAdmin
        .from('cases')
        .select('id')
        .eq('id', id)
        .single();

      if (caseError || !caseData) {
        return res.status(404).json({
          success: false,
          error: 'Case not found',
          code: 'CASE_NOT_FOUND'
        } as ApiResponse);
      }

      // Check if member already exists for this case
      const { data: existingMember } = await supabaseAdmin
        .from('team_members')
        .select('id')
        .eq('case_id', id)
        .eq('email', participant_email)
        .single();

      if (existingMember) {
        console.log(`🔄 Member already exists, updating: ${participant_email}`);
        
        // Update existing member instead of throwing error
        const { data: updatedMember, error: updateError } = await supabaseAdmin
          .from('team_members')
          .update({
            name: participant_name,
            job_type: role,
            role: role,
            fit_score: fit_score || 0,
            reasons: reasons || [],
            assessment_status: status === 'pending' ? 'not_started' : status === 'approved' ? 'completed' : 'not_started'
          })
          .eq('id', existingMember.id)
          .select()
          .single();

        if (updateError) {
          console.error('Database update error:', updateError);
          return res.status(500).json({
            success: false,
            error: 'Failed to update team member',
            code: 'UPDATE_FAILED'
          } as ApiResponse);
        }

        return res.status(200).json({
          success: true,
          data: updatedMember,
          message: 'Team member updated successfully'
        } as ApiResponse);
      }

      // Add team member
      const { data: teamMember, error } = await supabaseAdmin
        .from('team_members')
        .insert({
          case_id: id,
          name: participant_name,
          email: participant_email,
          job_type: role, // Using role as job_type for now
          role: role,
          fit_score: fit_score || 0,
          reasons: reasons || [],
          assessment_status: status === 'pending' ? 'not_started' : status === 'approved' ? 'completed' : 'not_started'
        })
        .select()
        .single();

      if (error) {
        console.error('Database error:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to add team member',
          code: 'CREATE_FAILED'
        } as ApiResponse);
      }

      res.status(201).json({
        success: true,
        data: teamMember,
        message: 'Team member added successfully'
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async updateTeamMember(req: Request, res: Response, next: NextFunction) {
    res.json({
      success: true,
      data: { message: 'Update team member - coming soon' },
      message: 'Feature coming soon'
    } as ApiResponse);
  }

  async removeTeamMember(req: Request, res: Response, next: NextFunction) {
    res.json({
      success: true,
      message: 'Remove team member - coming soon'
    } as ApiResponse);
  }

  async assignSurveyToMember(req: Request, res: Response, next: NextFunction) {
    res.json({
      success: true,
      data: { message: 'Assign survey - coming soon' },
      message: 'Feature coming soon'
    } as ApiResponse);
  }

  async getSurveyAssignments(req: Request, res: Response, next: NextFunction) {
    res.json({
      success: true,
      data: [],
      message: 'Survey assignments feature coming soon'
    } as ApiResponse);
  }

  async getAssessmentResults(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params; // case_id
      const { 
        participant_email,
        status,
        page = 1, 
        limit = 20 
      } = req.query;

      if (!supabaseAdmin) {
        return res.status(500).json({
          success: false,
          error: 'Service role key not configured',
          code: 'SERVICE_ROLE_MISSING'
        } as ApiResponse);
      }

      // Get assessment results from both survey_responses and adaptive_assessment_responses
      console.log('🔍 Fetching assessment results for case:', id);

      // Get regular survey responses
      const surveyQuery = supabaseAdmin
        .from('survey_responses')
        .select('*')
        .eq('case_id', id);

      if (participant_email) {
        surveyQuery.eq('participant_email', participant_email as string);
      }

      if (status && ['in_progress', 'completed', 'submitted'].includes(status as string)) {
        surveyQuery.eq('status', status as 'in_progress' | 'completed' | 'submitted');
      }

      const { data: surveyResponses, error: surveyError } = await surveyQuery;

      // Get adaptive assessment responses
      const adaptiveQuery = supabaseAdmin
        .from('adaptive_assessment_responses')
        .select('*')
        .eq('case_id', id);

      if (participant_email) {
        adaptiveQuery.eq('participant_email', participant_email as string);
      }

      if (status && ['completed', 'submitted'].includes(status as string)) {
        adaptiveQuery.eq('status', status as 'completed' | 'submitted');
      }

      const { data: adaptiveResponses, error: adaptiveError } = await adaptiveQuery;

      if (surveyError) {
        console.error('Survey responses error:', surveyError);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch survey responses',
          code: 'SURVEY_FETCH_FAILED'
        } as ApiResponse);
      }

      if (adaptiveError) {
        console.error('Adaptive responses error:', adaptiveError);
        // Don't fail completely, just log the error
        console.warn('⚠️ Could not fetch adaptive responses, continuing with survey responses only');
      }

      // Convert adaptive responses to survey response format for consistency
      const normalizedAdaptiveResponses = (adaptiveResponses || []).map(adaptive => ({
        id: adaptive.id,
        survey_template_id: null,
        case_id: adaptive.case_id,
        participant_id: null,
        participant_name: adaptive.participant_name,
        participant_email: adaptive.participant_email,
        team_member_id: null,
        responses: adaptive.raw_responses || {},
        questions: [], // Adaptive questions are embedded in analysis
        score: adaptive.overall_score || 0,
        status: adaptive.status,
        technical_details: adaptive.analysis_results,
        category_scores: adaptive.phase_scores,
        completed_at: adaptive.completed_at,
        submitted_at: adaptive.submitted_at,
        created_at: adaptive.created_at,
        // Mark as adaptive assessment for frontend identification
        assessment_type: 'adaptive-technical-assessment',
        job_types: adaptive.job_types,
        overall_percentage: adaptive.overall_percentage,
        strongest_areas: adaptive.strongest_areas,
        improvement_areas: adaptive.improvement_areas
      }));

      // Combine all results
      const allResults = [
        ...(surveyResponses || []),
        ...normalizedAdaptiveResponses
      ];

      // Apply pagination to combined results
      const pageNum = Math.max(1, parseInt(page as string) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 100));
      const offset = (pageNum - 1) * limitNum;
      
      // Sort by created_at descending
      const sortedResults = allResults.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      const paginatedResults = sortedResults.slice(offset, offset + limitNum);
      const totalCount = allResults.length;

      console.log(`✅ Assessment results fetched:`, {
        surveyResponses: surveyResponses?.length || 0,
        adaptiveResponses: adaptiveResponses?.length || 0,
        total: totalCount,
        returned: paginatedResults.length
      });

      const assessmentResults = paginatedResults;
      const error = null;
      const count = totalCount;

      if (error) {
        console.error('Database error:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch assessment results',
          code: 'FETCH_FAILED'
        } as ApiResponse);
      }

      // Calculate summary statistics
      const totalResults = count || 0;
      const completedResults = assessmentResults?.filter(r => r.status === 'completed').length || 0;
      const averageScore = completedResults > 0 ? 
        Math.round(assessmentResults!
          .filter(r => r.status === 'completed' && r.score !== null)
          .reduce((sum, r) => sum + (r.score || 0), 0) / completedResults) : 0;

      res.json({
        success: true,
        data: assessmentResults || [],
        message: 'Assessment results retrieved successfully',
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalResults,
          totalPages: Math.ceil(totalResults / limitNum)
        },
        summary: {
          totalResults,
          completedResults,
          averageScore,
          completionRate: totalResults > 0 ? Math.round((completedResults / totalResults) * 100) : 0
        }
      } as ApiResponse<any[]>);
    } catch (error) {
      next(error);
    }
  }

  // Adaptive Assessment Results - Sadece adaptive_assessment_responses tablosundan
  async getAdaptiveAssessmentResults(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params; // case_id
      const { 
        participant_email,
        status,
        page = 1, 
        limit = 100 
      } = req.query;

      console.log('🧠 Fetching adaptive assessment results for case:', id);

      if (!supabaseAdmin) {
        return res.status(500).json({
          success: false,
          error: 'Service role key not configured',
          code: 'SERVICE_ROLE_MISSING'
        } as ApiResponse);
      }

      // Get adaptive assessment responses
      let query = supabaseAdmin
        .from('adaptive_assessment_responses')
        .select('*')
        .eq('case_id', id);

      if (participant_email) {
        query = query.eq('participant_email', participant_email as string);
      }

      if (status && ['completed', 'submitted'].includes(status as string)) {
        query = query.eq('status', status as 'completed' | 'submitted');
      }

      // Apply sorting and pagination
      query = query.order('created_at', { ascending: false });

      const pageNum = Math.max(1, parseInt(page as string) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 100));
      const offset = (pageNum - 1) * limitNum;

      query = query.range(offset, offset + limitNum - 1);

      const { data: adaptiveResults, error } = await query;

      if (error) {
        console.error('❌ Adaptive assessment results fetch error:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch adaptive assessment results',
          code: 'ADAPTIVE_FETCH_FAILED'
        } as ApiResponse);
      }

      console.log('✅ Adaptive assessment results fetched:', {
        count: adaptiveResults?.length || 0,
        caseId: id
      });

      res.json({
        success: true,
        data: adaptiveResults || [],
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: adaptiveResults?.length || 0
        }
      } as ApiResponse<any[]>);
    } catch (error) {
      console.error('❌ Error in getAdaptiveAssessmentResults:', error);
      next(error);
    }
  }

  async saveAssessmentResult(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params; // case_id
      const {
        survey_template_id,
        participant_name,
        participant_email,
        responses,
        questions,
        technical_details,
        category_scores
      } = req.body;

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

      // Check if case exists
      const { data: caseData, error: caseError } = await supabaseAdmin
        .from('cases')
        .select('id, initial_threshold')
        .eq('id', id)
        .single();

      if (caseError || !caseData) {
        return res.status(404).json({
          success: false,
          error: 'Case not found',
          code: 'CASE_NOT_FOUND'
        } as ApiResponse);
      }

      // Calculate score from responses
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

      // Check for duplicate submission
      const { data: existingResult } = await supabaseAdmin
        .from('survey_responses')
        .select('id')
        .eq('case_id', id)
        .eq('survey_template_id', survey_template_id)
        .eq('participant_email', participant_email)
        .single();

      let assessmentResult;

      if (existingResult) {
        // Update existing result
        const { data: updatedResult, error: updateError } = await supabaseAdmin
          .from('survey_responses')
          .update({
            responses,
            questions,
            score,
            status: 'completed',
            technical_details,
            category_scores,
            completed_at: new Date().toISOString(),
            submitted_at: new Date().toISOString()
          })
          .eq('id', existingResult.id)
          .select()
          .single();

        if (updateError) {
          console.error('Database error:', updateError);
          return res.status(500).json({
            success: false,
            error: 'Failed to update assessment result',
            code: 'UPDATE_FAILED'
          } as ApiResponse);
        }

        assessmentResult = updatedResult;
      } else {
        // Insert new result
        const { data: newResult, error: insertError } = await supabaseAdmin
          .from('survey_responses')
          .insert({
            survey_template_id,
            case_id: id,
            participant_id: req.userId, // From auth middleware
            participant_name,
            participant_email,
            responses,
            questions,
            score,
            status: 'completed',
            technical_details,
            category_scores,
            completed_at: new Date().toISOString(),
            submitted_at: new Date().toISOString()
          })
          .select()
          .single();

        if (insertError) {
          console.error('Database error:', insertError);
          return res.status(500).json({
            success: false,
            error: 'Failed to save assessment result',
            code: 'SAVE_FAILED'
          } as ApiResponse);
        }

        assessmentResult = newResult;
      }

      // Check if participant qualifies based on threshold
      const threshold = caseData.initial_threshold || 70;
      const qualified = score >= threshold;

      // Auto-add to team if qualified
      if (qualified) {
        const { data: existingMember } = await supabaseAdmin
          .from('team_members')
          .select('id')
          .eq('case_id', id)
          .eq('email', participant_email)
          .single();

        if (!existingMember) {
          await supabaseAdmin
            .from('team_members')
            .insert({
              case_id: id,
              name: participant_name,
              email: participant_email,
              job_type: 'Participant', // Default job type
              role: 'Participant', // Default role
              fit_score: score,
              reasons: [`Assessment score: ${score}%`],
              assessment_status: qualified ? 'completed' : 'not_started'
            });
        }
      }

      res.status(201).json({
        success: true,
        data: {
          ...assessmentResult,
          qualified,
          threshold
        },
        message: 'Assessment result saved successfully'
      } as ApiResponse<any>);
    } catch (error) {
      next(error);
    }
  }

  async getTeamRecommendations(req: Request, res: Response, next: NextFunction) {
    res.json({
      success: true,
      data: [],
      message: 'Team recommendations feature coming soon'
    } as ApiResponse);
  }

  async generateTeams(req: Request, res: Response, next: NextFunction) {
    res.json({
      success: true,
      data: { message: 'Generate teams - coming soon' },
      message: 'Feature coming soon'
    } as ApiResponse);
  }

  async exportCaseToExcel(req: Request, res: Response, next: NextFunction) {
    res.json({
      success: true,
      data: { message: 'Excel export - coming soon' },
      message: 'Feature coming soon'
    } as ApiResponse);
  }

  // Update case admin message (Admin only)
  async updateCaseAdminMessage(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Access denied - admin required',
          code: 'ACCESS_DENIED'
        } as ApiResponse);
      }

      const { id } = req.params;
      const { admin_message_title, admin_message_description } = req.body;

      if (!admin_message_title || !admin_message_description) {
        return res.status(400).json({
          success: false,
          error: 'Message title and description are required',
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

      // Update the case with admin message
      const { data: updatedCase, error } = await supabaseAdmin
        .from('cases' as any)
        .update({
          admin_message_title,
          admin_message_description,
          admin_message_created_at: new Date().toISOString(),
          admin_message_created_by: req.userId
        } as any)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('❌ Failed to update case admin message:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to update case admin message',
          code: 'UPDATE_FAILED'
        } as ApiResponse);
      }

      console.log('✅ Case admin message updated successfully:', {
        caseId: id,
        title: admin_message_title,
        updatedBy: req.user.email
      });

      res.json({
        success: true,
        data: updatedCase,
        message: 'Case admin message updated successfully'
      } as ApiResponse);

    } catch (error) {
      console.error('❌ Error in updateCaseAdminMessage:', error);
      next(error);
    }
  }

  async exportCaseToPdf(req: Request, res: Response, next: NextFunction) {
    res.json({
      success: true,
      data: { message: 'PDF export - coming soon' },
      message: 'Feature coming soon'
    } as ApiResponse);
  }
}

export const casesController = new CasesController();
