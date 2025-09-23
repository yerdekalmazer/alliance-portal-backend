import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/database';
import { User } from '../models/types';

interface AlliancePartner {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  organization?: string;
  position?: string;
  expertise: string[];
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
  updated_at: string;
  last_login_at?: string;
  profile_completed: boolean;
  auth_user_id?: string;
  notes?: string;
  contact_preference: 'email' | 'phone' | 'both';
}

interface CreateAlliancePartnerRequest {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
  organization?: string;
  position?: string;
  expertise?: string[];
  status?: string;
  notes?: string;
  contactPreference?: string;
}

interface UpdateAlliancePartnerRequest {
  fullName?: string;
  email?: string;
  password?: string;
  phone?: string;
  organization?: string;
  position?: string;
  expertise?: string[];
  status?: string;
  notes?: string;
  contactPreference?: string;
}

class AlliancePartnersController {
  // Get all alliance partners
  async getAllPartners(req: Request, res: Response, next: NextFunction) {
    try {
      // Check if user has admin permissions
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Admin access required',
          code: 'INSUFFICIENT_PERMISSIONS'
        });
      }

      const { status, organization } = req.query;
      
      if (!supabaseAdmin) {
        return res.status(500).json({
          success: false,
          error: 'Service role key not configured',
          code: 'SERVICE_ROLE_MISSING'
        });
      }

      let query = supabaseAdmin
        .from('alliance_partners' as any)
        .select('*')
        .order('created_at', { ascending: false });

      // Apply filters
      if (status) {
        query = query.eq('status', status);
      }
      if (organization) {
        query = query.ilike('organization', `%${organization}%`);
      }

      const { data: partners, error } = await query;

      if (error) {
        console.error('Error fetching alliance partners:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch alliance partners',
          code: 'FETCH_PARTNERS_FAILED'
        });
      }

      res.json({
        success: true,
        data: partners,
        message: `Retrieved ${partners?.length || 0} alliance partners`
      });

    } catch (error) {
      console.error('Error in getAllPartners:', error);
      next(error);
    }
  }

  // Get alliance partner by ID
  async getPartnerById(req: Request, res: Response, next: NextFunction) {
    try {
      const { partnerId } = req.params;

      if (!supabaseAdmin) {
        return res.status(500).json({
          success: false,
          error: 'Service role key not configured',
          code: 'SERVICE_ROLE_MISSING'
        });
      }

      // Check if user has admin permissions or is the partner themselves
      if (!req.user || req.user.role !== 'admin') {
        // Check if it's the partner themselves accessing their data
        const { data: partnerCheck } = await supabaseAdmin
          .from('alliance_partners' as any)
          .select('auth_user_id')
          .eq('id', partnerId)
          .single();

        if (!partnerCheck || (partnerCheck as any).auth_user_id !== req.user!.id) {
          return res.status(403).json({
            success: false,
            error: 'Insufficient permissions',
            code: 'INSUFFICIENT_PERMISSIONS'
          });
        }
      }

      const { data: partner, error } = await supabaseAdmin
        .from('alliance_partners' as any)
        .select('*')
        .eq('id', partnerId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({
            success: false,
            error: 'Alliance partner not found',
            code: 'PARTNER_NOT_FOUND'
          });
        }

        console.error('Error fetching alliance partner:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch alliance partner',
          code: 'FETCH_PARTNER_FAILED'
        });
      }

      res.json({
        success: true,
        data: partner,
        message: 'Alliance partner retrieved successfully'
      });

    } catch (error) {
      console.error('Error in getPartnerById:', error);
      next(error);
    }
  }

  // Create new alliance partner (Admin only)
  async createPartner(req: Request, res: Response, next: NextFunction) {
    try {
      // Check admin permissions
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Admin access required',
          code: 'INSUFFICIENT_PERMISSIONS'
        });
      }

      if (!supabaseAdmin) {
        return res.status(500).json({
          success: false,
          error: 'Service role key not configured',
          code: 'SERVICE_ROLE_MISSING'
        });
      }

      const {
        fullName,
        email,
        password,
        phone,
        organization,
        position,
        expertise = [],
        status = 'active',
        notes,
        contactPreference = 'email'
      }: CreateAlliancePartnerRequest = req.body;

      // Validate required fields
      if (!fullName || !email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Full name, email, and password are required',
          code: 'MISSING_REQUIRED_FIELDS'
        });
      }

      // Validate status
      if (!['active', 'inactive', 'suspended'].includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid status. Must be active, inactive, or suspended',
          code: 'INVALID_STATUS'
        });
      }

      // Create user in Supabase Auth with alliance role
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          name: fullName,
          role: 'alliance' // Auth user role will be alliance
        }
      });

      if (authError) {
        console.error('Auth creation error:', authError);
        return res.status(400).json({
          success: false,
          error: authError.message || 'Failed to create alliance partner authentication',
          code: 'AUTH_CREATION_FAILED'
        });
      }

      if (!authData.user) {
        return res.status(400).json({
          success: false,
          error: 'Failed to create alliance partner authentication',
          code: 'AUTH_CREATION_FAILED'
        });
      }

      // Create corresponding user record in users table with alliance role
      const { error: userError } = await supabaseAdmin
        .from('users')
        .insert({
          id: authData.user.id,
          email,
          name: fullName,
          role: 'alliance'
        });

      if (userError) {
        console.error('User creation error:', userError);
        // Don't fail the request if user table insert fails, but log it
      }

      // Create alliance partner profile in alliance_partners table
      const { data: partnerData, error: dbError } = await supabaseAdmin
        .from('alliance_partners' as any)
        .insert({
          email,
          full_name: fullName,
          phone,
          organization,
          position,
          expertise,
          status,
          notes,
          contact_preference: contactPreference,
          profile_completed: true,
          auth_user_id: authData.user.id
        })
        .select()
        .single();

      if (dbError) {
        console.error('Database creation error:', dbError);
        
        // Clean up auth user if database insert fails
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        
        return res.status(500).json({
          success: false,
          error: 'Failed to create alliance partner profile',
          code: 'PROFILE_CREATION_FAILED'
        });
      }

      res.status(201).json({
        success: true,
        data: partnerData,
        message: 'Alliance partner created successfully'
      });

    } catch (error) {
      console.error('Error in createPartner:', error);
      next(error);
    }
  }

  // Update alliance partner (Admin or self)
  async updatePartner(req: Request, res: Response, next: NextFunction) {
    try {
      const { partnerId } = req.params;
      
      if (!supabaseAdmin) {
        return res.status(500).json({
          success: false,
          error: 'Service role key not configured',
          code: 'SERVICE_ROLE_MISSING'
        });
      }
      
      // Check if user has admin permissions or is updating their own data
      let isOwner = false;
      if (!req.user || req.user.role !== 'admin') {
        // Check if it's the partner themselves
        const { data: partnerCheck } = await supabaseAdmin
          .from('alliance_partners' as any)
          .select('auth_user_id')
          .eq('id', partnerId)
          .single();

        if (!partnerCheck || (partnerCheck as any).auth_user_id !== req.user!.id) {
          return res.status(403).json({
            success: false,
            error: 'Insufficient permissions',
            code: 'INSUFFICIENT_PERMISSIONS'
          });
        }
        isOwner = true;
      }

      const {
        fullName,
        email,
        password,
        phone,
        organization,
        position,
        expertise,
        status,
        notes,
        contactPreference
      }: UpdateAlliancePartnerRequest = req.body;

      // Build update object
      const updateData: any = {};

      if (fullName) updateData.full_name = fullName;
      if (email) updateData.email = email;
      if (phone !== undefined) updateData.phone = phone;
      if (organization !== undefined) updateData.organization = organization;
      if (position !== undefined) updateData.position = position;
      if (expertise) updateData.expertise = expertise;
      if (contactPreference && ['email', 'phone', 'both'].includes(contactPreference)) {
        updateData.contact_preference = contactPreference;
      }

      // Only admin can update status and notes
      if (req.user!.role === 'admin') {
        if (status && ['active', 'inactive', 'suspended'].includes(status)) {
          updateData.status = status;
        }
        if (notes !== undefined) {
          updateData.notes = notes;
        }
      }

      // Get current partner data for auth user ID
      const { data: currentPartner, error: fetchError } = await supabaseAdmin
        .from('alliance_partners' as any)
        .select('auth_user_id')
        .eq('id', partnerId)
        .single();

      if (fetchError) {
        console.error('Fetch partner error:', fetchError);
        return res.status(404).json({
          success: false,
          error: 'Alliance partner not found',
          code: 'PARTNER_NOT_FOUND'
        });
      }

      // Update password in Supabase Auth if provided
      if (password && (currentPartner as any).auth_user_id) {
        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
          (currentPartner as any).auth_user_id,
          { password }
        );

        if (authError) {
          console.error('Auth update error:', authError);
          return res.status(400).json({
            success: false,
            error: authError.message || 'Failed to update password',
            code: 'PASSWORD_UPDATE_FAILED'
          });
        }
      }

      // Update alliance partner profile in database
      const { data: partnerData, error: dbError } = await supabaseAdmin
        .from('alliance_partners' as any)
        .update(updateData)
        .eq('id', partnerId)
        .select()
        .single();

      if (dbError) {
        console.error('Database update error:', dbError);
        return res.status(500).json({
          success: false,
          error: 'Failed to update alliance partner profile',
          code: 'PROFILE_UPDATE_FAILED'
        });
      }

      res.json({
        success: true,
        data: partnerData,
        message: 'Alliance partner updated successfully'
      });

    } catch (error) {
      console.error('Error in updatePartner:', error);
      next(error);
    }
  }

  // Delete alliance partner (Admin only)
  async deletePartner(req: Request, res: Response, next: NextFunction) {
    try {
      const { partnerId } = req.params;

      // Check admin permissions
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Admin access required',
          code: 'INSUFFICIENT_PERMISSIONS'
        });
      }

      if (!supabaseAdmin) {
        return res.status(500).json({
          success: false,
          error: 'Service role key not configured',
          code: 'SERVICE_ROLE_MISSING'
        });
      }

      // Get partner data including auth_user_id
      const { data: existingPartner, error: fetchError } = await supabaseAdmin
        .from('alliance_partners' as any)
        .select('id, auth_user_id')
        .eq('id', partnerId)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          return res.status(404).json({
            success: false,
            error: 'Alliance partner not found',
            code: 'PARTNER_NOT_FOUND'
          });
        }
        throw fetchError;
      }

      // Delete from Supabase Auth if auth_user_id exists
      if ((existingPartner as any).auth_user_id) {
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser((existingPartner as any).auth_user_id);
        
        if (authError) {
          console.error('Auth deletion error:', authError);
          // Continue with partner deletion even if auth deletion fails
        }

        // Also delete from users table
        const { error: userError } = await supabaseAdmin
          .from('users')
          .delete()
          .eq('id', (existingPartner as any).auth_user_id);

        if (userError) {
          console.error('User deletion error:', userError);
          // Continue with partner deletion even if user deletion fails
        }
      }

      // Delete alliance partner profile from database
      const { error: dbError } = await supabaseAdmin
        .from('alliance_partners' as any)
        .delete()
        .eq('id', partnerId);

      if (dbError) {
        console.error('Database deletion error:', dbError);
        return res.status(500).json({
          success: false,
          error: 'Failed to delete alliance partner profile',
          code: 'PROFILE_DELETION_FAILED'
        });
      }

      res.json({
        success: true,
        message: 'Alliance partner deleted successfully'
      });

    } catch (error) {
      console.error('Error in deletePartner:', error);
      next(error);
    }
  }

  // Get alliance partner statistics (Admin only)
  async getPartnerStats(req: Request, res: Response, next: NextFunction) {
    try {
      // Check admin permissions
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Admin access required',
          code: 'INSUFFICIENT_PERMISSIONS'
        });
      }

      if (!supabaseAdmin) {
        return res.status(500).json({
          success: false,
          error: 'Service role key not configured',
          code: 'SERVICE_ROLE_MISSING'
        });
      }

      // Get status distribution
      const { data: statusStats, error: statusError } = await supabaseAdmin
        .from('alliance_partners' as any)
        .select('status');

      if (statusError) {
        throw statusError;
      }

      // Get organization distribution
      const { data: orgStats, error: orgError } = await supabaseAdmin
        .from('alliance_partners' as any)
        .select('organization')
        .not('organization', 'is', null);

      if (orgError) {
        throw orgError;
      }

      // Calculate statistics
      const statusDistribution = (statusStats as any[]).reduce((acc: any, partner: any) => {
        acc[partner.status] = (acc[partner.status] || 0) + 1;
        return acc;
      }, {});

      const organizationCount = new Set((orgStats as any[]).map((p: any) => p.organization).filter(Boolean)).size;

      const totalPartners = statusStats.length;
      const activePartners = statusDistribution.active || 0;
      const inactivePartners = statusDistribution.inactive || 0;
      const suspendedPartners = statusDistribution.suspended || 0;

      res.json({
        success: true,
        data: {
          totalPartners,
          activePartners,
          inactivePartners,
          suspendedPartners,
          organizationCount,
          statusDistribution
        },
        message: 'Alliance partner statistics retrieved successfully'
      });

    } catch (error) {
      console.error('Error in getPartnerStats:', error);
      next(error);
    }
  }
}

export const alliancePartnersController = new AlliancePartnersController();