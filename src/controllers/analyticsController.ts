import { Request, Response, NextFunction } from 'express';
import { supabase, supabaseAdmin } from '../config/database';
import { ApiResponse, DashboardStats } from '../models/types';

class AnalyticsController {
  async getDashboardStats(req: Request, res: Response, next: NextFunction) {
    try {
      // Get basic counts from database
      const [casesResult, usersResult] = await Promise.all([
        supabase.from('cases').select('id', { count: 'exact', head: true }),
        supabase.from('users').select('id', { count: 'exact', head: true })
      ]);

      const dashboardStats: DashboardStats = {
        totalParticipants: usersResult.count || 0,
        activeCases: casesResult.count || 0,
        categoryDistribution: {
          yonlendirilebilirTeknik: 0,
          takimLideri: 0,
          yeniBaslayan: 0,
          operasyonelYetenek: 0
        }
      };

      res.json({
        success: true,
        data: dashboardStats,
        message: 'Dashboard stats retrieved successfully'
      } as ApiResponse<DashboardStats>);

    } catch (error) {
      next(error);
    }
  }

  async getDashboardCharts(req: Request, res: Response, next: NextFunction) {
    try {
      if (!supabaseAdmin) {
        return res.status(500).json({
          success: false,
          error: 'Service role key not configured',
          code: 'SERVICE_ROLE_MISSING'
        } as ApiResponse);
      }

      // Get case statistics by job types
      const { data: cases, error: casesError } = await supabaseAdmin
        .from('cases' as any)
        .select('job_types, status, created_at');

      if (casesError) {
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch cases data',
          code: 'FETCH_FAILED'
        } as ApiResponse);
      }

      // Process chart data
      const jobTypeDistribution: { [key: string]: number } = {};
      const statusDistribution = { active: 0, completed: 0, archived: 0 };
      const monthlyActivity: { [key: string]: number } = {};

      cases?.forEach((caseItem: any) => {
        // Job types distribution
        caseItem.job_types?.forEach((jobType: string) => {
          jobTypeDistribution[jobType] = (jobTypeDistribution[jobType] || 0) + 1;
        });

        // Status distribution
        statusDistribution[caseItem.status as keyof typeof statusDistribution]++;

        // Monthly activity
        const month = new Date(caseItem.created_at).toISOString().slice(0, 7);
        monthlyActivity[month] = (monthlyActivity[month] || 0) + 1;
      });

      // Get user registration trends
      const { data: users, error: usersError } = await supabaseAdmin
        .from('users' as any)
        .select('created_at, role');

      const userTrends: { [key: string]: number } = {};
      const roleDistribution = { admin: 0, alliance: 0, user: 0 };

      users?.forEach((user: any) => {
        const month = new Date(user.created_at).toISOString().slice(0, 7);
        userTrends[month] = (userTrends[month] || 0) + 1;
        roleDistribution[user.role as keyof typeof roleDistribution]++;
      });

      const chartData = {
        jobTypeDistribution,
        statusDistribution,
        monthlyActivity,
        userTrends,
        roleDistribution,
        totalCases: cases?.length || 0,
        totalUsers: users?.length || 0
      };

      res.json({
        success: true,
        data: chartData,
        message: 'Dashboard charts data retrieved successfully'
      } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }

  // Excel Export
  async exportAnalyticsData(req: Request, res: Response, next: NextFunction) {
    try {
      const { type = 'all' } = req.query;

      if (!supabaseAdmin) {
        return res.status(500).json({
          success: false,
          error: 'Service role key not configured',
          code: 'SERVICE_ROLE_MISSING'
        } as ApiResponse);
      }

      let exportData: any = {};

      // Export cases data
      if (type === 'all' || type === 'cases') {
        const { data: cases, error: casesError } = await supabaseAdmin
          .from('cases' as any)
          .select('*');

        if (!casesError) {
          exportData.cases = cases?.map((caseItem: any) => ({
            id: caseItem.id,
            title: caseItem.title,
            description: caseItem.description,
            job_types: caseItem.job_types?.join(', '),
            specializations: caseItem.specializations?.join(', '),
            requirements: caseItem.requirements?.join(', '),
            status: caseItem.status,
            created_at: new Date(caseItem.created_at).toLocaleDateString('tr-TR'),
            updated_at: new Date(caseItem.updated_at).toLocaleDateString('tr-TR')
          }));
        }
      }

      // Export users data
      if (type === 'all' || type === 'users') {
        const { data: users, error: usersError } = await supabaseAdmin
          .from('users' as any)
          .select('id, name, email, role, created_at');

        if (!usersError) {
          exportData.users = users?.map((user: any) => ({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            created_at: new Date(user.created_at).toLocaleDateString('tr-TR')
          }));
        }
      }

      // Export analytics summary
      if (type === 'all' || type === 'summary') {
        exportData.summary = {
          total_cases: exportData.cases?.length || 0,
          total_users: exportData.users?.length || 0,
          export_date: new Date().toLocaleDateString('tr-TR'),
          export_time: new Date().toLocaleTimeString('tr-TR')
        };
      }

      res.json({
        success: true,
        data: exportData,
        message: 'Analytics data exported successfully'
      } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }

  // Cases Analytics
  async getCasesOverview(req: Request, res: Response, next: NextFunction) {
    try {
      const { data: cases, error } = await supabase
        .from('cases')
        .select('id, title, status, created_at')
        .order('created_at', { ascending: false });

      if (error) {
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch cases overview',
          code: 'FETCH_FAILED'
        } as ApiResponse);
      }

      const overview = {
        totalCases: cases?.length || 0,
        activeCases: cases?.filter(c => c.status === 'active').length || 0,
        completedCases: cases?.filter(c => c.status === 'completed').length || 0,
        archivedCases: cases?.filter(c => c.status === 'archived').length || 0,
        recentCases: cases?.slice(0, 5) || []
      };

      res.json({
        success: true,
        data: overview,
        message: 'Cases overview retrieved successfully'
      } as ApiResponse);

    } catch (error) {
      next(error);
    }
  }

  async getCaseDetailedAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({
        success: true,
        data: { message: 'Case detailed analytics - coming soon' },
        message: 'Feature coming soon'
      } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }

  async getCasesComparison(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({
        success: true,
        data: { message: 'Cases comparison - coming soon' },
        message: 'Feature coming soon'
      } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }

  // Participants Analytics
  async getParticipantsOverview(req: Request, res: Response, next: NextFunction) {
    try {
      const { data: users, error } = await supabase
        .from('users')
        .select('id, role, created_at')
        .order('created_at', { ascending: false });

      if (error) {
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch participants overview',
          code: 'FETCH_FAILED'
        } as ApiResponse);
      }

      const overview = {
        totalParticipants: users?.length || 0,
        adminUsers: users?.filter(u => u.role === 'admin').length || 0,
        allianceUsers: users?.filter(u => u.role === 'alliance').length || 0,
        regularUsers: users?.filter(u => u.role === 'user').length || 0,
        recentUsers: users?.slice(0, 10) || []
      };

      res.json({
        success: true,
        data: overview,
        message: 'Participants overview retrieved successfully'
      } as ApiResponse);

    } catch (error) {
      next(error);
    }
  }

  async getParticipantsDistribution(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({
        success: true,
        data: { message: 'Participants distribution - coming soon' },
        message: 'Feature coming soon'
      } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }

  async getParticipantsPerformance(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({
        success: true,
        data: { message: 'Participants performance - coming soon' },
        message: 'Feature coming soon'
      } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }

  // Placeholder methods for other analytics endpoints
  async getSurveysOverview(req: Request, res: Response, next: NextFunction) {
    res.json({
      success: true,
      data: { message: 'Surveys overview - coming soon' },
      message: 'Feature coming soon'
    } as ApiResponse);
  }

  async getSurveyResponseRates(req: Request, res: Response, next: NextFunction) {
    res.json({
      success: true,
      data: { message: 'Survey response rates - coming soon' },
      message: 'Feature coming soon'
    } as ApiResponse);
  }

  async getSurveyTemplateAnalytics(req: Request, res: Response, next: NextFunction) {
    res.json({
      success: true,
      data: { message: 'Survey template analytics - coming soon' },
      message: 'Feature coming soon'
    } as ApiResponse);
  }

  async getTeamFormationAnalytics(req: Request, res: Response, next: NextFunction) {
    res.json({
      success: true,
      data: { message: 'Team formation analytics - coming soon' },
      message: 'Feature coming soon'
    } as ApiResponse);
  }

  async getTeamPerformanceAnalytics(req: Request, res: Response, next: NextFunction) {
    res.json({
      success: true,
      data: { message: 'Team performance analytics - coming soon' },
      message: 'Feature coming soon'
    } as ApiResponse);
  }

  async getTeamSuccessRates(req: Request, res: Response, next: NextFunction) {
    res.json({
      success: true,
      data: { message: 'Team success rates - coming soon' },
      message: 'Feature coming soon'
    } as ApiResponse);
  }

  async getMonthlyTrends(req: Request, res: Response, next: NextFunction) {
    res.json({
      success: true,
      data: { message: 'Monthly trends - coming soon' },
      message: 'Feature coming soon'
    } as ApiResponse);
  }

  async getWeeklyTrends(req: Request, res: Response, next: NextFunction) {
    res.json({
      success: true,
      data: { message: 'Weekly trends - coming soon' },
      message: 'Feature coming soon'
    } as ApiResponse);
  }

  async getParticipationTrends(req: Request, res: Response, next: NextFunction) {
    res.json({
      success: true,
      data: { message: 'Participation trends - coming soon' },
      message: 'Feature coming soon'
    } as ApiResponse);
  }

  async exportAnalyticsToExcel(req: Request, res: Response, next: NextFunction) {
    res.json({
      success: true,
      data: { message: 'Excel export - coming soon' },
      message: 'Feature coming soon'
    } as ApiResponse);
  }

  async exportAnalyticsToCSV(req: Request, res: Response, next: NextFunction) {
    res.json({
      success: true,
      data: { message: 'CSV export - coming soon' },
      message: 'Feature coming soon'
    } as ApiResponse);
  }

  async exportAnalyticsToPDF(req: Request, res: Response, next: NextFunction) {
    res.json({
      success: true,
      data: { message: 'PDF export - coming soon' },
      message: 'Feature coming soon'
    } as ApiResponse);
  }

  async generateCustomReport(req: Request, res: Response, next: NextFunction) {
    res.json({
      success: true,
      data: { message: 'Custom report - coming soon' },
      message: 'Feature coming soon'
    } as ApiResponse);
  }

  async getScheduledReports(req: Request, res: Response, next: NextFunction) {
    res.json({
      success: true,
      data: [],
      message: 'Scheduled reports - coming soon'
    } as ApiResponse);
  }
}

export const analyticsController = new AnalyticsController();
