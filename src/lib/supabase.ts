import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env.local file and ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.'
  );
}

// Client for authentication and regular operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Admin client for operations requiring service role key
export const supabaseAdmin = supabaseServiceRoleKey 
  ? createClient(supabaseUrl, supabaseServiceRoleKey)
  : createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      students: {
        Row: {
          id: string;
          name: string;
          grade: number;
          year: number;
          subjects: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          grade: number;
          year: number;
          subjects: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          grade?: number;
          year?: number;
          subjects?: string[];
          created_at?: string;
          updated_at?: string;
        };
      };
      payments: {
        Row: {
          id: string;
          student_id: string;
          month: string;
          amount: number;
          late_fee: number;
          total_amount: number;
          payment_method: string;
          reference: string | null;
          paid_at: string | null;
          is_paid: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          month: string;
          amount: number;
          late_fee?: number;
          total_amount: number;
          payment_method?: string;
          reference?: string | null;
          paid_at?: string | null;
          is_paid?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string;
          month?: string;
          amount?: number;
          late_fee?: number;
          total_amount?: number;
          payment_method?: string;
          reference?: string | null;
          paid_at?: string | null;
          is_paid?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      fee_settings: {
        Row: {
          id: string;
          grade: number;
          monthly_fee: number;
          registration_fee: number;
          late_fee_rate: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          grade: number;
          monthly_fee: number;
          registration_fee?: number;
          late_fee_rate?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          grade?: number;
          monthly_fee?: number;
          registration_fee?: number;
          late_fee_rate?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
};