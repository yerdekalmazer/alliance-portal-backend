import { Request, Response, NextFunction } from 'express';
import { supabase, supabaseAdmin } from '../config/database';
import { User, UserRole } from '../models/types';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
      userId?: string;
    }
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    // Skip authentication for OPTIONS requests (CORS preflight)
    if (req.method === 'OPTIONS') {
      return next();
    }

    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: 'Authorization header missing',
        code: 'NO_AUTH_HEADER'
      });
    }

    const token = authHeader.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No token provided',
        code: 'NO_TOKEN'
      });
    }

    // Verify token with Supabase
    console.log(`🔍 Auth: Verifying token for ${req.method} ${req.path}`, {
      tokenStart: token.substring(0, 20) + '...',
      tokenLength: token.length
    });
    
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      console.error('❌ Auth: Token verification failed:', { error: error?.message, hasUser: !!user });
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
        code: 'INVALID_TOKEN'
      });
    }
    
    console.log(`✅ Auth: Token verified for user ${user.email}`);

    // Get user details from database using service role (bypasses RLS)
    if (!supabaseAdmin) {
      return res.status(500).json({
        success: false,
        error: 'Service role key not configured',
        code: 'SERVICE_ROLE_MISSING'
      });
    }

    // First try to find user in admins table
    const { data: adminData, error: adminError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (adminData && !adminError) {
      // Found in users table (admin)
      console.log(`✅ Auth: Admin user found: ${adminData.email}`);
      req.user = adminData as User;
      req.userId = user.id;
      console.log(`🎯 Auth: Setting admin req.user:`, {
        id: adminData.id,
        email: adminData.email,
        role: adminData.role,
        path: req.path
      });
      return next();
    }

    // If not found in users, try alliance_partners table
    const { data: allianceData, error: allianceError } = await supabaseAdmin
      .from('alliance_partners' as any)
      .select('*')
      .eq('auth_user_id', user.id)
      .single();

    if (allianceData && !allianceError) {
      // Found in alliance_partners table - format it like User object
      console.log(`✅ Auth: Alliance partner found: ${(allianceData as any).email}`);
      const formattedUser: User = {
        id: (allianceData as any).auth_user_id,
        email: (allianceData as any).email,
        name: (allianceData as any).full_name,
        role: 'alliance' as UserRole,
        created_at: (allianceData as any).created_at,
        updated_at: (allianceData as any).updated_at
      };
      req.user = formattedUser;
      req.userId = user.id;
      console.log(`🎯 Auth: Setting alliance req.user:`, {
        id: formattedUser.id,
        email: formattedUser.email,
        role: formattedUser.role,
        path: req.path
      });
      return next();
    }

    // User not found in either table
    console.error('❌ Auth: User not found in any table:', {
      userId: user.id,
      email: user.email,
      adminError: adminError?.message,
      allianceError: allianceError?.message
    });
    return res.status(401).json({
      success: false,
      error: 'User not found in database',
      code: 'USER_NOT_FOUND'
    });
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({
      success: false,
      error: 'Authentication failed',
      code: 'AUTH_FAILED'
    });
  }
}

// Role-based authorization middleware
export function requireRole(roles: UserRole | UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    console.log(`🔍 RequireRole: Checking req.user for ${req.method} ${req.path}:`, {
      hasUser: !!req.user,
      userEmail: req.user?.email,
      userRole: req.user?.role
    });
    
    if (!req.user) {
      console.error('❌ Auth: No user in request object');
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
        code: 'NOT_AUTHENTICATED'
      });
    }

    const userRoles = Array.isArray(roles) ? roles : [roles];
    console.log(`🔍 Auth: Checking role for ${req.user.email}`, {
      requiredRoles: userRoles,
      currentRole: req.user.role,
      path: req.path
    });
    
    if (!userRoles.includes(req.user.role)) {
      console.error(`❌ Auth: Insufficient permissions for ${req.user.email}:`, {
        required: userRoles,
        current: req.user.role,
        path: req.path
      });
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: userRoles,
        current: req.user.role
      });
    }

    console.log(`✅ Auth: Role check passed for ${req.user.email} (${req.user.role})`);
    next();
  };
}

// Admin only middleware
export const requireAdmin = requireRole('admin');

// Alliance or admin middleware
export const requireAllianceOrAdmin = requireRole(['alliance', 'admin']);
