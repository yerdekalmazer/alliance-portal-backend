export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string
          role: 'admin' | 'alliance' | 'user'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          name: string
          role?: 'admin' | 'alliance' | 'user'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          role?: 'admin' | 'alliance' | 'user'
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      cases: {
        Row: {
          id: string
          title: string
          description: string
          domain: string | null
          job_types: string[]
          specializations: string[]
          requirements: string[]
          created_by: string | null
          initial_threshold: number
          target_team_count: number
          ideal_team_size: number
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description: string
          domain?: string | null
          job_types: string[]
          specializations?: string[]
          requirements?: string[]
          created_by?: string | null
          initial_threshold?: number
          target_team_count?: number
          ideal_team_size?: number
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string
          domain?: string | null
          job_types?: string[]
          specializations?: string[]
          requirements?: string[]
          created_by?: string | null
          initial_threshold?: number
          target_team_count?: number
          ideal_team_size?: number
          status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cases_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      team_members: {
        Row: {
          id: string
          case_id: string
          name: string
          email: string
          job_type: string
          role: string
          assessment_status: string
          fit_score: number | null
          reasons: string[] | null
          survey_url: string | null
          invited_at: string | null
          completed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          case_id: string
          name: string
          email: string
          job_type: string
          role: string
          assessment_status?: string
          fit_score?: number | null
          reasons?: string[] | null
          survey_url?: string | null
          invited_at?: string | null
          completed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          case_id?: string
          name?: string
          email?: string
          job_type?: string
          role?: string
          assessment_status?: string
          fit_score?: number | null
          reasons?: string[] | null
          survey_url?: string | null
          invited_at?: string | null
          completed_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          }
        ]
      }
      survey_templates: {
        Row: {
          id: string
          type: string
          category: string
          title: string
          description: string | null
          target_audience: string
          is_active: boolean
          is_dynamic: boolean
          questions: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          type: string
          category?: string
          title: string
          description?: string | null
          target_audience?: string
          is_active?: boolean
          is_dynamic?: boolean
          questions?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          type?: string
          category?: string
          title?: string
          description?: string | null
          target_audience?: string
          is_active?: boolean
          is_dynamic?: boolean
          questions?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      survey_links: {
        Row: {
          id: string
          template_id: string
          case_id: string
          title: string
          description: string | null
          target_audience: string | null
          is_active: boolean
          expires_at: string | null
          max_participants: number | null
          current_participants: number
          customizations: Json | null
          survey_templates: Json | null
          cases: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          template_id: string
          case_id: string
          title: string
          description?: string | null
          target_audience?: string | null
          is_active?: boolean
          expires_at?: string | null
          max_participants?: number | null
          current_participants?: number
          customizations?: Json | null
          survey_templates?: Json | null
          cases?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          template_id?: string
          case_id?: string
          title?: string
          description?: string | null
          target_audience?: string | null
          is_active?: boolean
          expires_at?: string | null
          max_participants?: number | null
          current_participants?: number
          customizations?: Json | null
          survey_templates?: Json | null
          cases?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_links_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "survey_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_links_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          }
        ]
      }
      survey_responses: {
        Row: {
          id: string
          survey_template_id: string | null
          case_id: string | null
          participant_id: string | null
          participant_name: string
          participant_email: string | null
          team_member_id: string | null
          responses: Json
          questions: Json | null
          score: number | null
          status: 'in_progress' | 'completed' | 'submitted'
          technical_details: Json | null
          category_scores: Json | null
          completed_at: string | null
          submitted_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          survey_template_id?: string | null
          case_id?: string | null
          participant_id?: string | null
          participant_name: string
          participant_email?: string | null
          team_member_id?: string | null
          responses?: Json
          questions?: Json | null
          score?: number | null
          status?: 'in_progress' | 'completed' | 'submitted'
          technical_details?: Json | null
          category_scores?: Json | null
          completed_at?: string | null
          submitted_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          survey_template_id?: string | null
          case_id?: string | null
          participant_id?: string | null
          participant_name?: string
          participant_email?: string | null
          team_member_id?: string | null
          responses?: Json
          questions?: Json | null
          score?: number | null
          status?: 'in_progress' | 'completed' | 'submitted'
          technical_details?: Json | null
          category_scores?: Json | null
          completed_at?: string | null
          submitted_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_responses_survey_template_id_fkey"
            columns: ["survey_template_id"]
            isOneToOne: false
            referencedRelation: "survey_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_responses_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_responses_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      applications: {
        Row: {
          id: string
          case_id: string
          participant_name: string
          participant_email: string
          survey_response_id: string | null
          status: string
          score: number | null
          threshold_met: boolean
          personal_info: Json | null
          assessment_responses: Json | null
          notes: string | null
          reviewed_by: string | null
          reviewed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          case_id: string
          participant_name: string
          participant_email: string
          survey_response_id?: string | null
          status?: string
          score?: number | null
          threshold_met?: boolean
          personal_info?: Json | null
          assessment_responses?: Json | null
          notes?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          case_id?: string
          participant_name?: string
          participant_email?: string
          survey_response_id?: string | null
          status?: string
          score?: number | null
          threshold_met?: boolean
          personal_info?: Json | null
          assessment_responses?: Json | null
          notes?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      question_bank_questions: {
        Row: {
          id: string
          type: string
          domain: string
          job_type: string
          category: string
          question: string
          options: Json | null
          correct: Json | null
          points: number
          difficulty: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          type: string
          domain: string
          job_type: string
          category: string
          question: string
          options?: Json | null
          correct?: Json | null
          points?: number
          difficulty?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          type?: string
          domain?: string
          job_type?: string
          category?: string
          question?: string
          options?: Json | null
          correct?: Json | null
          points?: number
          difficulty?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      adaptive_assessment_responses: {
        Row: {
          id: string
          case_id: string | null
          survey_link_id: string | null
          participant_name: string
          participant_email: string
          job_types: string[]
          assessment_type: string
          raw_responses: Json
          phase_scores: Json
          analysis_results: Json | null
          overall_score: number
          max_possible_score: number
          overall_percentage: number
          phase_completion_status: Json
          strongest_areas: string[] | null
          improvement_areas: string[] | null
          development_recommendations: Json | null
          progressive_development: Json | null
          status: string
          started_at: string | null
          completed_at: string | null
          submitted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          case_id?: string | null
          survey_link_id?: string | null
          participant_name: string
          participant_email: string
          job_types?: string[]
          assessment_type?: string
          raw_responses?: Json
          phase_scores?: Json
          analysis_results?: Json | null
          overall_score?: number
          max_possible_score?: number
          overall_percentage?: number
          phase_completion_status?: Json
          strongest_areas?: string[] | null
          improvement_areas?: string[] | null
          development_recommendations?: Json | null
          progressive_development?: Json | null
          status?: string
          started_at?: string | null
          completed_at?: string | null
          submitted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          case_id?: string | null
          survey_link_id?: string | null
          participant_name?: string
          participant_email?: string
          job_types?: string[]
          assessment_type?: string
          raw_responses?: Json
          phase_scores?: Json
          analysis_results?: Json | null
          overall_score?: number
          max_possible_score?: number
          overall_percentage?: number
          phase_completion_status?: Json
          strongest_areas?: string[] | null
          improvement_areas?: string[] | null
          development_recommendations?: Json | null
          progressive_development?: Json | null
          status?: string
          started_at?: string | null
          completed_at?: string | null
          submitted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "adaptive_assessment_responses_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      increment_survey_participants: {
        Args: {
          survey_id: string
        }
        Returns: void
      }
      increment_survey_link_participants: {
        Args: {
          link_id: string
        }
        Returns: void
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}