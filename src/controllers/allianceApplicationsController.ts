import { Request, Response } from 'express';
import { supabaseAdmin, supabase } from '../config/database';

export interface AllianceApplicationData {
  organizationName: string;
  website?: string;
  profile: string;
  contactName?: string;
  contactTitle?: string;
  email: string;
  phone?: string;
  motivation: string;
  roles: string[];
  otherRole?: string;
  archetype: string;
  contribution?: string;
  confirmAccuracy: boolean;
  confirmContact: boolean;
}

export const submitAllianceApplication = async (req: Request, res: Response) => {
  try {
    const applicationData: AllianceApplicationData = req.body;

    // Validate required fields
    if (!applicationData.organizationName || !applicationData.email || !applicationData.profile) {
      return res.status(400).json({
        success: false,
        error: 'Organization name, email, and profile are required'
      });
    }

    if (!applicationData.motivation) {
      return res.status(400).json({
        success: false,
        error: 'Motivation is required'
      });
    }

    if (!applicationData.archetype || applicationData.roles.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Archetype and at least one role are required'
      });
    }

    if (!applicationData.confirmAccuracy || !applicationData.confirmContact) {
      return res.status(400).json({
        success: false,
        error: 'Both confirmation checkboxes must be checked'
      });
    }

    // Use admin if available (to bypass RLS in non-public envs), else fall back to anon
    const db: any = (supabaseAdmin as any) || (supabase as any);
    if (!db) {
      return res.status(500).json({ success: false, error: 'Database client not initialized' });
    }

    // Get client IP and user agent
    const ipAddress = req.ip || (req.connection as any).remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';

    // Insert application into database
    const { data, error } = await db
      .from('alliance_applications')
      .insert({
        organization_name: applicationData.organizationName,
        website: applicationData.website,
        profile: applicationData.profile,
        contact_name: applicationData.contactName,
        contact_title: applicationData.contactTitle,
        email: applicationData.email,
        phone: applicationData.phone,
        motivation: applicationData.motivation,
        roles: applicationData.roles,
        other_role: applicationData.otherRole,
        archetype: applicationData.archetype,
        contribution: applicationData.contribution,
        ip_address: ipAddress,
        user_agent: userAgent,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to submit application'
      });
    }

    console.log('Alliance application submitted:', {
      id: data.id,
      organization: applicationData.organizationName,
      email: applicationData.email,
      profile: applicationData.profile
    });

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      data: {
        id: data.id,
        status: (data as any).status
      }
    });

  } catch (error) {
    console.error('Alliance application submission error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

export const getAllianceApplications = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const db: any = (supabaseAdmin as any) || (supabase as any);
    if (!db) {
      return res.status(500).json({ success: false, error: 'Database client not initialized' });
    }

    let query = db
      .from('alliance_applications')
      .select('*', { count: 'exact' });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch applications'
      });
    }

    res.json({
      success: true,
      data: data || [],
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count || 0,
        totalPages: Math.ceil((count || 0) / Number(limit))
      }
    });

  } catch (error) {
    console.error('Get alliance applications error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

export const getAllianceApplicationById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const db: any = (supabaseAdmin as any) || (supabase as any);
    if (!db) {
      return res.status(500).json({ success: false, error: 'Database client not initialized' });
    }

    const { data, error } = await db
      .from('alliance_applications')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch application'
      });
    }

    if (!data) {
      return res.status(404).json({
        success: false,
        error: 'Application not found'
      });
    }

    res.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('Get alliance application error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

export const updateAllianceApplicationStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;

    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status'
      });
    }

    const db: any = (supabaseAdmin as any) || (supabase as any);
    if (!db) {
      return res.status(500).json({ success: false, error: 'Database client not initialized' });
    }

    const { data, error } = await db
      .from('alliance_applications')
      .update({
        status,
        admin_notes: adminNotes,
        reviewed_by: (req as any).user?.id,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update application'
      });
    }

    res.json({
      success: true,
      message: 'Application status updated successfully',
      data
    });

  } catch (error) {
    console.error('Update alliance application error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

export const getAllianceApplicationStats = async (req: Request, res: Response) => {
  try {
    const db: any = (supabaseAdmin as any) || (supabase as any);
    if (!db) {
      return res.status(500).json({ success: false, error: 'Database client not initialized' });
    }

    const { data, error } = await db
      .from('alliance_applications')
      .select('status');

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch statistics'
      });
    }

    const statusCounts = (data || []).reduce((acc: any, app: any) => {
      acc[app.status] = (acc[app.status] || 0) + 1;
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        total: data?.length || 0,
        pending: statusCounts.pending || 0,
        approved: statusCounts.approved || 0,
        rejected: statusCounts.rejected || 0,
        statusDistribution: statusCounts
      }
    });

  } catch (error) {
    console.error('Get alliance application stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};
