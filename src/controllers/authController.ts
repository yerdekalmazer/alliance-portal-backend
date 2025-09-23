import { Request, Response, NextFunction } from 'express';
import { supabase, supabaseAdmin } from '../config/database';
import { User, LoginRequest, RegisterRequest, ApiResponse } from '../models/types';

class AuthController {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password }: LoginRequest = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Email and password are required',
          code: 'MISSING_CREDENTIALS'
        } as ApiResponse);
      }


      // Authenticate with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials',
          code: 'INVALID_CREDENTIALS'
        } as ApiResponse);
      }

      // Get user details from database using service role (bypasses RLS)
      if (!supabaseAdmin) {
        return res.status(500).json({
          success: false,
          error: 'Service role key not configured',
          code: 'SERVICE_ROLE_MISSING'
        } as ApiResponse);
      }

      const { data: userData, error: userError } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (userError) {
        return res.status(404).json({
          success: false,
          error: 'User not found in database',
          code: 'USER_NOT_FOUND'
        } as ApiResponse);
      }

      res.json({
        success: true,
        data: {
          user: userData,
          token: data.session?.access_token,
          session: data.session
        },
        message: 'Login successful'
      } as ApiResponse<{ user: User; token: string; session: any }>);

    } catch (error) {
      next(error);
    }
  }

  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, name, role = 'user' }: RegisterRequest = req.body;

      if (!email || !password || !name) {
        return res.status(400).json({
          success: false,
          error: 'Email, password and name are required',
          code: 'MISSING_FIELDS'
        } as ApiResponse);
      }

      // Register with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            role
          }
        }
      });

      if (error) {
        return res.status(400).json({
          success: false,
          error: error.message,
          code: 'REGISTRATION_FAILED'
        } as ApiResponse);
      }

      if (!data.user) {
        return res.status(400).json({
          success: false,
          error: 'Registration failed',
          code: 'REGISTRATION_FAILED'
        } as ApiResponse);
      }

      // Create user in database using service role (bypasses RLS)
      if (!supabaseAdmin) {
        return res.status(500).json({
          success: false,
          error: 'Service role key not configured',
          code: 'SERVICE_ROLE_MISSING'
        } as ApiResponse);
      }

      const { data: userData, error: dbError } = await supabaseAdmin
        .from('users')
        .insert({
          id: data.user.id,
          email,
          name,
          role: role as 'admin' | 'alliance' | 'user'
        })
        .select()
        .single();

      if (dbError) {
        // Clean up auth user if database insert fails
        if (supabaseAdmin) {
          await supabaseAdmin.auth.admin.deleteUser(data.user.id);
        }
        
        return res.status(500).json({
          success: false,
          error: 'Failed to create user profile',
          code: 'PROFILE_CREATION_FAILED'
        } as ApiResponse);
      }

      res.status(201).json({
        success: true,
        data: {
          user: userData,
          token: data.session?.access_token,
          session: data.session
        },
        message: 'Registration successful. Please check your email for verification.'
      } as ApiResponse<{ user: User; session: any }>);

    } catch (error) {
      next(error);
    }
  }

  async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      
      res.json({
        success: true,
        data: user,
        message: 'Profile retrieved successfully'
      } as ApiResponse<User>);

    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.userId;
      const { name } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated',
          code: 'NOT_AUTHENTICATED'
        } as ApiResponse);
      }

      if (!name) {
        return res.status(400).json({
          success: false,
          error: 'Name is required',
          code: 'MISSING_NAME'
        } as ApiResponse);
      }

      const { data, error } = await supabase
        .from('users')
        .update({ 
          name, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        return res.status(500).json({
          success: false,
          error: 'Failed to update profile',
          code: 'UPDATE_FAILED'
        } as ApiResponse);
      }

      res.json({
        success: true,
        data,
        message: 'Profile updated successfully'
      } as ApiResponse<User>);

    } catch (error) {
      next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        return res.status(500).json({
          success: false,
          error: 'Logout failed',
          code: 'LOGOUT_FAILED'
        } as ApiResponse);
      }

      res.json({
        success: true,
        message: 'Logout successful'
      } as ApiResponse);

    } catch (error) {
      next(error);
    }
  }

  async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { refresh_token } = req.body;

      if (!refresh_token) {
        return res.status(400).json({
          success: false,
          error: 'Refresh token is required',
          code: 'MISSING_REFRESH_TOKEN'
        } as ApiResponse);
      }

      const { data, error } = await supabase.auth.refreshSession({
        refresh_token
      });

      if (error) {
        return res.status(401).json({
          success: false,
          error: 'Invalid refresh token',
          code: 'INVALID_REFRESH_TOKEN'
        } as ApiResponse);
      }

      res.json({
        success: true,
        data: data.session,
        message: 'Token refreshed successfully'
      } as ApiResponse);

    } catch (error) {
      next(error);
    }
  }

  async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          error: 'Email is required',
          code: 'MISSING_EMAIL'
        } as ApiResponse);
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email);

      if (error) {
        return res.status(500).json({
          success: false,
          error: 'Failed to send reset email',
          code: 'RESET_EMAIL_FAILED'
        } as ApiResponse);
      }

      res.json({
        success: true,
        message: 'Password reset email sent'
      } as ApiResponse);

    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { access_token, refresh_token, password } = req.body;

      if (!access_token || !refresh_token || !password) {
        return res.status(400).json({
          success: false,
          error: 'Access token, refresh token and new password are required',
          code: 'MISSING_RESET_DATA'
        } as ApiResponse);
      }

      // Set session with tokens
      const { error: sessionError } = await supabase.auth.setSession({
        access_token,
        refresh_token
      });

      if (sessionError) {
        return res.status(400).json({
          success: false,
          error: 'Invalid reset tokens',
          code: 'INVALID_RESET_TOKENS'
        } as ApiResponse);
      }

      // Update password
      const { error } = await supabase.auth.updateUser({
        password
      });

      if (error) {
        return res.status(500).json({
          success: false,
          error: 'Failed to update password',
          code: 'PASSWORD_UPDATE_FAILED'
        } as ApiResponse);
      }

      res.json({
        success: true,
        message: 'Password updated successfully'
      } as ApiResponse);

    } catch (error) {
      next(error);
    }
  }

  async verifyEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, email } = req.body;

      if (!token || !email) {
        return res.status(400).json({
          success: false,
          error: 'Token and email are required',
          code: 'MISSING_VERIFICATION_DATA'
        } as ApiResponse);
      }

      const { error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'signup'
      });

      if (error) {
        return res.status(400).json({
          success: false,
          error: 'Invalid verification token',
          code: 'INVALID_VERIFICATION_TOKEN'
        } as ApiResponse);
      }

      res.json({
        success: true,
        message: 'Email verified successfully'
      } as ApiResponse);

    } catch (error) {
      next(error);
    }
  }

  async resendVerification(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          error: 'Email is required',
          code: 'MISSING_EMAIL'
        } as ApiResponse);
      }

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email
      });

      if (error) {
        return res.status(500).json({
          success: false,
          error: 'Failed to resend verification email',
          code: 'RESEND_FAILED'
        } as ApiResponse);
      }

      res.json({
        success: true,
        message: 'Verification email sent'
      } as ApiResponse);

    } catch (error) {
      next(error);
    }
  }

  // Admin User Management Functions
  async getAllUsers(req: Request, res: Response, next: NextFunction) {
    try {
      // Check if user is admin
      const userRole = (req as any).user?.role;
      if (userRole !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Access denied. Admin role required.',
          code: 'ACCESS_DENIED'
        } as ApiResponse);
      }

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
        role, 
        page = 1, 
        limit = 100,
        sort_by = 'created_at',
        sort_order = 'desc'
      } = req.query;

      let query = supabaseAdmin
        .from('users')
        .select('id, name, email, role, created_at, updated_at', { count: 'exact' });

      // Apply search filter
      if (search) {
        query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
      }

      // Apply role filter
      if (role && ['admin', 'alliance', 'user'].includes(role as string)) {
        query = query.eq('role', role as 'admin' | 'alliance' | 'user');
      }

      // Apply sorting
      const sortOrder = sort_order === 'asc' ? { ascending: true } : { ascending: false };
      query = query.order(sort_by as string, sortOrder);

      // Apply pagination
      const pageNum = parseInt(page as string);
      const limitNum = Math.min(parseInt(limit as string), 100);
      const offset = (pageNum - 1) * limitNum;
      
      if (pageNum > 1) {
        query = query.range(offset, offset + limitNum - 1);
      } else {
        query = query.limit(limitNum);
      }

      const { data: users, error, count } = await query;

      if (error) {
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch users',
          code: 'FETCH_FAILED'
        } as ApiResponse);
      }

      res.json({
        success: true,
        data: {
          users: users || [],
          pagination: {
            page: pageNum,
            limit: limitNum,
            total: count || 0,
            totalPages: Math.ceil((count || 0) / limitNum)
          },
          filters: {
            search: search || null,
            role: role || null,
            sort_by: sort_by as string,
            sort_order: sort_order as string
          }
        },
        message: 'Users retrieved successfully'
      } as ApiResponse);

    } catch (error) {
      next(error);
    }
  }

  async updateUserRole(req: Request, res: Response, next: NextFunction) {
    try {
      // Check if user is admin
      const userRole = (req as any).user?.role;
      if (userRole !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Access denied. Admin role required.',
          code: 'ACCESS_DENIED'
        } as ApiResponse);
      }

      const { userId } = req.params;
      const { role } = req.body;

      // Validate role
      if (!['admin', 'alliance', 'user'].includes(role)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid role. Must be admin, alliance, or user',
          code: 'INVALID_ROLE'
        } as ApiResponse);
      }

      if (!supabaseAdmin) {
        return res.status(500).json({
          success: false,
          error: 'Service role key not configured',
          code: 'SERVICE_ROLE_MISSING'
        } as ApiResponse);
      }

      const { data, error } = await supabaseAdmin
        .from('users')
        .update({ 
          role: role as 'admin' | 'alliance' | 'user',
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        return res.status(500).json({
          success: false,
          error: 'Failed to update user role',
          code: 'UPDATE_FAILED'
        } as ApiResponse);
      }

      if (!data) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        } as ApiResponse);
      }

      res.json({
        success: true,
        data: {
          id: (data as any).id,
          name: (data as any).name,
          email: (data as any).email,
          role: (data as any).role,
          updated_at: (data as any).updated_at
        },
        message: 'User role updated successfully'
      } as ApiResponse);

    } catch (error) {
      next(error);
    }
  }

  async verifyToken(req: Request, res: Response, next: NextFunction) {
    try {
      // Token is already verified by authMiddleware
      // User info is available in req.user
      const user = req.user;

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Invalid token',
          code: 'INVALID_TOKEN'
        } as ApiResponse);
      }

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
          }
        },
        message: 'Token is valid'
      } as ApiResponse);

    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
