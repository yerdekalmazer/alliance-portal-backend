import { Request, Response, NextFunction } from 'express';
import { supabase, supabaseAdmin } from '../config/database';
import { ApiResponse } from '../models/types';
import multer from 'multer';
import path from 'path';

class UploadController {
  // Configure multer for file uploads
  private upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
      // Allowed file types
      const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain',
        'text/csv'
      ];

      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('File type not allowed') as any, false);
      }
    }
  });

  // Get multer middleware
  getUploadMiddleware() {
    return this.upload.array('files', 5); // Max 5 files at once
  }

  // Upload files to Supabase Storage
  async uploadFiles(req: Request, res: Response, next: NextFunction) {
    try {
      const files = req.files as Express.Multer.File[];
      
      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No files provided',
          code: 'NO_FILES'
        } as ApiResponse);
      }

      if (!supabaseAdmin) {
        return res.status(500).json({
          success: false,
          error: 'Service role key not configured',
          code: 'SERVICE_ROLE_MISSING'
        } as ApiResponse);
      }

      const uploadResults = [];
      const userId = (req as any).user?.id || 'anonymous';
      
      for (const file of files) {
        // Generate unique filename
        const timestamp = Date.now();
        const extension = path.extname(file.originalname);
        const baseName = path.basename(file.originalname, extension);
        const fileName = `${userId}/${timestamp}_${baseName}${extension}`;

        // Upload to Supabase Storage
        const { data, error } = await supabaseAdmin.storage
          .from('uploads')
          .upload(fileName, file.buffer, {
            contentType: file.mimetype,
            cacheControl: '3600',
            upsert: false
          });

        if (error) {
          console.error('Upload error:', error);
          return res.status(500).json({
            success: false,
            error: `Failed to upload file: ${file.originalname}`,
            code: 'UPLOAD_FAILED'
          } as ApiResponse);
        }

        // Get public URL
        const { data: publicData } = supabaseAdmin.storage
          .from('uploads')
          .getPublicUrl(fileName);

        uploadResults.push({
          originalName: file.originalname,
          fileName: fileName,
          size: file.size,
          mimeType: file.mimetype,
          url: publicData.publicUrl,
          storagePath: data.path
        });
      }

      res.json({
        success: true,
        data: {
          files: uploadResults,
          uploadedCount: uploadResults.length
        },
        message: `${uploadResults.length} file(s) uploaded successfully`
      } as ApiResponse);

    } catch (error) {
      next(error);
    }
  }

  // Delete file from Supabase Storage
  async deleteFile(req: Request, res: Response, next: NextFunction) {
    try {
      const { fileName } = req.params;

      if (!fileName) {
        return res.status(400).json({
          success: false,
          error: 'File name is required',
          code: 'MISSING_FILENAME'
        } as ApiResponse);
      }

      if (!supabaseAdmin) {
        return res.status(500).json({
          success: false,
          error: 'Service role key not configured',
          code: 'SERVICE_ROLE_MISSING'
        } as ApiResponse);
      }

      const { error } = await supabaseAdmin.storage
        .from('uploads')
        .remove([fileName]);

      if (error) {
        return res.status(500).json({
          success: false,
          error: 'Failed to delete file',
          code: 'DELETE_FAILED'
        } as ApiResponse);
      }

      res.json({
        success: true,
        message: 'File deleted successfully'
      } as ApiResponse);

    } catch (error) {
      next(error);
    }
  }

  // Get file info
  async getFileInfo(req: Request, res: Response, next: NextFunction) {
    try {
      const { fileName } = req.params;

      if (!fileName) {
        return res.status(400).json({
          success: false,
          error: 'File name is required',
          code: 'MISSING_FILENAME'
        } as ApiResponse);
      }

      if (!supabaseAdmin) {
        return res.status(500).json({
          success: false,
          error: 'Service role key not configured',
          code: 'SERVICE_ROLE_MISSING'
        } as ApiResponse);
      }

      // Get file info from storage
      const { data, error } = await supabaseAdmin.storage
        .from('uploads')
        .list(path.dirname(fileName), {
          search: path.basename(fileName)
        });

      if (error || !data || data.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'File not found',
          code: 'FILE_NOT_FOUND'
        } as ApiResponse);
      }

      const fileInfo = data[0];
      
      // Get public URL
      const { data: publicData } = supabaseAdmin.storage
        .from('uploads')
        .getPublicUrl(fileName);

      res.json({
        success: true,
        data: {
          name: fileInfo.name,
          size: fileInfo.metadata?.size,
          lastModified: fileInfo.updated_at,
          url: publicData.publicUrl,
          mimeType: fileInfo.metadata?.mimetype
        },
        message: 'File info retrieved successfully'
      } as ApiResponse);

    } catch (error) {
      next(error);
    }
  }

  // List user files
  async getUserFiles(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      
      if (!userId) {
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

      // List files in user directory
      const { data, error } = await supabaseAdmin.storage
        .from('uploads')
        .list(userId, {
          limit: 100,
          sortBy: { column: 'updated_at', order: 'desc' }
        });

      if (error) {
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch user files',
          code: 'FETCH_FAILED'
        } as ApiResponse);
      }

      const filesWithUrls = data?.map(file => {
        const { data: publicData } = supabaseAdmin!.storage
          .from('uploads')
          .getPublicUrl(`${userId}/${file.name}`);

        return {
          name: file.name,
          size: file.metadata?.size,
          lastModified: file.updated_at,
          url: publicData.publicUrl,
          mimeType: file.metadata?.mimetype
        };
      }) || [];

      res.json({
        success: true,
        data: {
          files: filesWithUrls,
          totalFiles: filesWithUrls.length
        },
        message: 'User files retrieved successfully'
      } as ApiResponse);

    } catch (error) {
      next(error);
    }
  }
}

export const uploadController = new UploadController();
