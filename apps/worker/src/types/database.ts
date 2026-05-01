// Mirror of apps/web/src/lib/supabase/database.types.ts
// Update both files when the schema changes.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type JobStatus = "pending" | "processing" | "complete" | "failed" | "expired";
export type JobClassification = "instant" | "moderate" | "heavy";
export type UserTier = "anonymous" | "free" | "pro";

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          tier: UserTier;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          tier?: UserTier;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          tier?: UserTier;
          updated_at?: string;
        };
      };
      jobs: {
        Row: {
          id: string;
          user_id: string | null;
          repo_url: string;
          repo_owner: string;
          repo_name: string;
          status: JobStatus;
          classification: JobClassification;
          features: Json;
          file_count: number | null;
          commit_count: number | null;
          error_message: string | null;
          queue_position: number | null;
          notify_email: string | null;
          created_at: string;
          started_at: string | null;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          repo_url: string;
          repo_owner: string;
          repo_name: string;
          status?: JobStatus;
          classification?: JobClassification;
          features?: Json;
          file_count?: number | null;
          commit_count?: number | null;
          error_message?: string | null;
          queue_position?: number | null;
          notify_email?: string | null;
          created_at?: string;
          started_at?: string | null;
          completed_at?: string | null;
        };
        Update: {
          status?: JobStatus;
          classification?: JobClassification;
          file_count?: number | null;
          commit_count?: number | null;
          error_message?: string | null;
          queue_position?: number | null;
          notify_email?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
        };
      };
      results: {
        Row: {
          job_id: string;
          graph_json: Json;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          job_id: string;
          graph_json: Json;
          expires_at?: string;
          created_at?: string;
        };
        Update: {
          graph_json?: Json;
          expires_at?: string;
        };
      };
      usage: {
        Row: {
          user_id: string;
          date: string;
          count: number;
        };
        Insert: {
          user_id: string;
          date?: string;
          count?: number;
        };
        Update: {
          count?: number;
        };
      };
    };
    Functions: {
      increment_usage: {
        Args: { p_user_id: string };
        Returns: number;
      };
      get_usage_today: {
        Args: { p_user_id: string };
        Returns: number;
      };
      delete_expired_results: {
        Args: Record<string, never>;
        Returns: void;
      };
    };
  };
}
