// Frontend'den alınan ve backend'e uyarlanmış type definitions

export type UserRole = 'alliance' | 'user' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface CaseScenario {
  id: string;
  title: string;
  description: string;
  job_types: string[];
  specializations: string[];
  requirements: string[];
  created_by: string;
  initial_threshold?: number;
  target_team_count?: number;
  ideal_team_size?: number;
  status: 'active' | 'completed' | 'archived';
  created_at: string;
  updated_at: string;
}

export type AssessmentStatus = 'not_started' | 'in_progress' | 'completed' | 'invited';

export interface TeamMember {
  id: string;
  case_id: string;
  name: string;
  email: string;
  job_type: string;
  role: string;
  assessment_status: AssessmentStatus;
  fit_score?: number;
  reasons?: string[];
  survey_url?: string;
  invited_at?: string;
  completed_at?: string;
  created_at: string;
}

export interface SurveyTemplate {
  id: string;
  type: string;
  category: string;
  title: string;
  description?: string;
  target_audience: string;
  is_active: boolean;
  is_dynamic: boolean;
  questions: SurveyQuestion[];
  created_at: string;
  updated_at: string;
}

export interface SurveyQuestion {
  id: string;
  type: 'text' | 'textarea' | 'radio' | 'checkbox' | 'rating' | 'scale' | 'date' | 'mcq';
  question: string;
  options?: string[];
  required: boolean;
  order?: number;
  category?: string;
  correct?: number | number[];
  points?: any;
}

export interface SurveyResponse {
  id: string;
  survey_template_id?: string;
  case_id?: string;
  participant_id?: string;
  participant_name: string;
  participant_email?: string;
  team_member_id?: string;
  responses: Record<string, any>;
  questions?: SurveyQuestion[];
  score?: number;
  status: 'in_progress' | 'completed' | 'submitted';
  technical_details?: any;
  category_scores?: any;
  completed_at?: Date;
  submitted_at?: Date;
  created_at: Date;
}

export interface IdeaSubmission {
  id: string;
  title: string;
  description: string;
  category: string;
  
  // Step 1: Contact Information
  contact_name?: string;
  email?: string;
  organization?: string;
  department?: string;
  position?: string;
  phone?: string;
  contribution_types?: string[]; // max 2
  
  // Step 2: Work Scope and Output Focus
  creative_output?: string; // Selected creative output type
  creative_reference?: string; // Reference link/file for creative work
  digital_product?: string; // Selected digital product type
  digital_product_reference?: string; // Reference link/file for digital product
  digital_experience?: string; // Selected digital experience type
  digital_experience_reference?: string; // Reference link/file for digital experience
  output_type?: string; // Legacy field
  
  // Step 3: Collaboration Role (Archetype)
  archetype?: 'Yönlendirici' | 'Düzenleyici' | 'Yürütücü' | 'Dönüştürücü';
  observations?: string; // Yönlendirici specific
  current_process?: string; // Düzenleyici specific
  vision_success?: string; // Yürütücü specific
  core_functions?: string; // Yürütücü specific
  innovation_proposal?: string; // Dönüştürücü specific
  
  // Step 4: Project Details and Value Layers
  project_title?: string; // Project/Idea/Concept/Proposal Title
  target_audience?: string; // Target Audience
  problem_need?: string; // Need or Problem Definition
  must_have_features?: string; // KANO Canvas: Must-Have Features
  better_features?: string; // KANO Canvas: Better/Enhancing Features
  surprise_features?: string; // KANO Canvas: Surprise Features
  archetype_specific_answer?: string; // Dynamic question answer based on archetype
  additional_notes?: string; // Additional notes/comments
  
  // Legacy fields (backward compatibility)
  problem_definition?: string;
  problem_statement?: string;
  unique_value?: string;
  partner_gains?: string;
  sustainability_plan?: string;
  expected_outcome?: string;
  pm_archetype?: string;
  contribution?: string;
  
  // Status and metadata
  submitted_by: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  stage?: string;
  market_size?: string;
  expected_roi?: string;
  timeline?: string;
  budget?: string;
  tags?: string[];
  
  // Case conversion tracking
  case_id?: string; // ID of the case created from this idea
  case_created?: boolean; // Flag indicating if a case was created from this idea
  
  submitted_at: Date;
  created_at: Date;
  updated_at: Date;
}

export interface Canvas {
  id: string;
  idea_id: string;
  title: string;
  problem_definition: string;
  solution: string;
  target_audience: string;
  requirements: string[];
  timeline: string;
  resources: string[];
  job_types: string[];
  specializations: string[];
  created_at: Date;
  updated_at: Date;
}

export interface SurveyLink {
  id: string;
  template_id: string;
  case_id?: string;
  title: string;
  description?: string;
  url: string;
  is_active: boolean;
  max_participants?: number;
  current_participants: number;
  target_audience: string;
  customizations?: any;
  expires_at?: Date;
  created_at: Date;
}

export interface AssessmentResult {
  id: string;
  participant_name: string;
  participant_email?: string;
  case_id: string;
  case_title: string;
  team_member_id?: string;
  category_id: string;
  category_name: string;
  scores: Record<string, number>;
  total_score: number;
  total_questions: number;
  technical_profile?: any;
  personal_info?: any;
  completed_at: Date;
  created_at: Date;
}

export interface TeamSurveyAssignment {
  id: string;
  case_id: string;
  team_member_id: string;
  assigned_by: string;
  survey_url: string;
  custom_message?: string;
  status: 'pending' | 'sent' | 'completed' | 'expired';
  reminders_sent: number;
  due_date?: Date;
  last_reminder_at?: Date;
  assigned_at: Date;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    hasNext?: boolean;
    hasPrev?: boolean;
  };
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

// Database Query Options
export interface QueryOptions extends PaginationOptions {
  where?: Record<string, any>;
  include?: string[];
  exclude?: string[];
}

// Authentication
export interface AuthPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  role?: UserRole;
}

// Dashboard Statistics
export interface DashboardStats {
  totalParticipants: number;
  categoryDistribution: {
    yonlendirilebilirTeknik: number;
    takimLideri: number;
    yeniBaslayan: number;
    operasyonelYetenek: number;
  };
  activeCases: number;
}

// Error Types
export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
}

// File Upload
export interface FileUpload {
  filename: string;
  mimetype: string;
  size: number;
  path: string;
  url?: string;
}

// Email
export interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    path: string;
  }>;
}
