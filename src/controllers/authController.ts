import { Request, Response, NextFunction } from 'express';
import { supabase, supabaseAdmin } from '../config/database';
import { User, LoginRequest, RegisterRequest, ApiResponse } from '../models/types';

class AuthController {
  constructor() {
    // Bind all methods to ensure 'this' context is preserved
    this.login = this.login.bind(this);
    this.register = this.register.bind(this);
    this.getProfile = this.getProfile.bind(this);
    this.updateProfile = this.updateProfile.bind(this);
    this.logout = this.logout.bind(this);
    this.refreshToken = this.refreshToken.bind(this);
    this.forgotPassword = this.forgotPassword.bind(this);
    this.resetPassword = this.resetPassword.bind(this);
    this.verifyEmail = this.verifyEmail.bind(this);
    this.resendVerification = this.resendVerification.bind(this);
    this.getAllUsers = this.getAllUsers.bind(this);
    this.updateUserRole = this.updateUserRole.bind(this);
    this.verifyToken = this.verifyToken.bind(this);
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password }: LoginRequest = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: 'E-posta ve şifre alanları zorunludur.',
          code: 'MISSING_CREDENTIALS'
        } as ApiResponse);
      }


      // Authenticate with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        // Log the actual error for debugging
        console.error('Login error from Supabase:', error);

        // Provide more specific error messages based on the error type
        let errorMessage = 'Giriş başarısız oldu';
        let errorCode = 'LOGIN_FAILED';

        if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'E-posta veya şifre hatalı. Lütfen bilgilerinizi kontrol edin.';
          errorCode = 'INVALID_CREDENTIALS';
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = 'E-posta adresiniz henüz onaylanmamış. Lütfen e-posta adresinizi onaylayın.';
          errorCode = 'EMAIL_NOT_CONFIRMED';
        } else if (error.message.includes('User not found')) {
          errorMessage = 'Bu e-posta adresi ile kayıtlı bir kullanıcı bulunamadı.';
          errorCode = 'USER_NOT_FOUND';
        } else if (error.message.includes('Too many requests')) {
          errorMessage = 'Çok fazla deneme yaptınız. Lütfen birkaç dakika sonra tekrar deneyin.';
          errorCode = 'TOO_MANY_REQUESTS';
        } else {
          // Generic error message for unknown errors
          errorMessage = 'Giriş yapılamadı. Lütfen bilgilerinizi kontrol edip tekrar deneyin.';
          errorCode = 'LOGIN_ERROR';
        }

        return res.status(401).json({
          success: false,
          error: errorMessage,
          code: errorCode
        } as ApiResponse);
      }

      // Get user details from database using service role (bypasses RLS)
      if (!supabaseAdmin) {
        return res.status(500).json({
          success: false,
          error: 'Sunucu yapılandırma hatası. Lütfen sistem yöneticisine başvurun.',
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
          error: 'Kullanıcı bilgileri veritabanında bulunamadı.',
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
        message: 'Giriş başarılı'
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
          error: 'E-posta, şifre ve isim alanları zorunludur.',
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
        // Log the actual error for debugging
        console.error('Registration error from Supabase:', error);

        // Provide more specific error messages
        let errorMessage = 'Kayıt işlemi başarısız oldu';
        let errorCode = 'REGISTRATION_FAILED';

        if (error.message.includes('already registered') || error.message.includes('already exists')) {
          errorMessage = 'Bu e-posta adresi zaten kullanılıyor. Lütfen farklı bir e-posta adresi deneyin.';
          errorCode = 'EMAIL_ALREADY_EXISTS';
        } else if (error.message.includes('Password should be at least')) {
          errorMessage = 'Şifre en az 6 karakter olmalıdır.';
          errorCode = 'WEAK_PASSWORD';
        } else if (error.message.includes('Invalid email')) {
          errorMessage = 'Geçersiz e-posta adresi. Lütfen geçerli bir e-posta adresi girin.';
          errorCode = 'INVALID_EMAIL';
        } else {
          errorMessage = error.message || 'Kayıt işlemi başarısız oldu. Lütfen tekrar deneyin.';
          errorCode = 'REGISTRATION_FAILED';
        }

        return res.status(400).json({
          success: false,
          error: errorMessage,
          code: errorCode
        } as ApiResponse);
      }

      if (!data.user) {
        return res.status(400).json({
          success: false,
          error: 'Kayıt işlemi başarısız oldu. Lütfen tekrar deneyin.',
          code: 'REGISTRATION_FAILED'
        } as ApiResponse);
      }

      // Create user in database using service role (bypasses RLS)
      if (!supabaseAdmin) {
        return res.status(500).json({
          success: false,
          error: 'Sunucu yapılandırma hatası. Lütfen sistem yöneticisine başvurun.',
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
          error: 'Kullanıcı profili oluşturulamadı. Lütfen tekrar deneyin.',
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
        message: 'Kayıt başarılı. Lütfen e-posta adresinizi kontrol edin ve doğrulayın.'
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
        message: 'Profil başarıyla alındı'
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
          error: 'Kullanıcı doğrulanmadı. Lütfen giriş yapın.',
          code: 'NOT_AUTHENTICATED'
        } as ApiResponse);
      }

      if (!name) {
        return res.status(400).json({
          success: false,
          error: 'İsim alanı zorunludur.',
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
          error: 'Profil güncellenemedi. Lütfen tekrar deneyin.',
          code: 'UPDATE_FAILED'
        } as ApiResponse);
      }

      res.json({
        success: true,
        data,
        message: 'Profil başarıyla güncellendi'
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
          error: 'Çıkış yapılamadı. Lütfen tekrar deneyin.',
          code: 'LOGOUT_FAILED'
        } as ApiResponse);
      }

      res.json({
        success: true,
        message: 'Çıkış başarılı'
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
          error: 'Yenileme anahtarı gereklidir.',
          code: 'MISSING_REFRESH_TOKEN'
        } as ApiResponse);
      }

      const { data, error } = await supabase.auth.refreshSession({
        refresh_token
      });

      if (error) {
        return res.status(401).json({
          success: false,
          error: 'Geçersiz yenileme anahtarı. Lütfen tekrar giriş yapın.',
          code: 'INVALID_REFRESH_TOKEN'
        } as ApiResponse);
      }

      res.json({
        success: true,
        data: data.session,
        message: 'Oturum başarıyla yenilendi'
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
          error: 'E-posta adresi gereklidir.',
          code: 'MISSING_EMAIL'
        } as ApiResponse);
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email);

      if (error) {
        return res.status(500).json({
          success: false,
          error: 'Şifre sıfırlama e-postası gönderilemedi. Lütfen tekrar deneyin.',
          code: 'RESET_EMAIL_FAILED'
        } as ApiResponse);
      }

      res.json({
        success: true,
        message: 'Şifre sıfırlama e-postası gönderildi'
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
          error: 'Erişim anahtarı, yenileme anahtarı ve yeni şifre gereklidir.',
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
          error: 'Geçersiz sıfırlama anahtarları. Lütfen tekrar deneyin.',
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
          error: 'Şifre güncellenemedi. Lütfen tekrar deneyin.',
          code: 'PASSWORD_UPDATE_FAILED'
        } as ApiResponse);
      }

      res.json({
        success: true,
        message: 'Şifre başarıyla güncellendi'
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
          error: 'Doğrulama anahtarı ve e-posta adresi gereklidir.',
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
          error: 'Geçersiz doğrulama anahtarı. Lütfen tekrar deneyin.',
          code: 'INVALID_VERIFICATION_TOKEN'
        } as ApiResponse);
      }

      res.json({
        success: true,
        message: 'E-posta başarıyla doğrulandı'
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
          error: 'E-posta adresi gereklidir.',
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
          error: 'Doğrulama e-postası gönderilemedi. Lütfen tekrar deneyin.',
          code: 'RESEND_FAILED'
        } as ApiResponse);
      }

      res.json({
        success: true,
        message: 'Doğrulama e-postası gönderildi'
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
          error: 'Erişim reddedildi. Yönetici yetkisi gereklidir.',
          code: 'ACCESS_DENIED'
        } as ApiResponse);
      }

      if (!supabaseAdmin) {
        return res.status(500).json({
          success: false,
          error: 'Sunucu yapılandırma hatası. Lütfen sistem yöneticisine başvurun.',
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
          error: 'Kullanıcılar getirilemedi. Lütfen tekrar deneyin.',
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
        message: 'Kullanıcılar başarıyla getirildi'
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
          error: 'Erişim reddedildi. Yönetici yetkisi gereklidir.',
          code: 'ACCESS_DENIED'
        } as ApiResponse);
      }

      const { userId } = req.params;
      const { role } = req.body;

      // Validate role
      if (!['admin', 'alliance', 'user'].includes(role)) {
        return res.status(400).json({
          success: false,
          error: 'Geçersiz rol. Admin, alliance veya user olmalıdır.',
          code: 'INVALID_ROLE'
        } as ApiResponse);
      }

      if (!supabaseAdmin) {
        return res.status(500).json({
          success: false,
          error: 'Sunucu yapılandırma hatası. Lütfen sistem yöneticisine başvurun.',
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
          error: 'Kullanıcı rolü güncellenemedi. Lütfen tekrar deneyin.',
          code: 'UPDATE_FAILED'
        } as ApiResponse);
      }

      if (!data) {
        return res.status(404).json({
          success: false,
          error: 'Kullanıcı bulunamadı.',
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
        message: 'Kullanıcı rolü başarıyla güncellendi'
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
          error: 'Geçersiz oturum anahtarı. Lütfen tekrar giriş yapın.',
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
        message: 'Oturum anahtarı geçerli'
      } as ApiResponse);

    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
