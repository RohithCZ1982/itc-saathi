// src/types/supabase.ts
// Database types matching the schema in supabase/migrations/001_initial_schema.sql
// Regenerate after connecting to a live project: npm run db:types

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          business_name: string | null
          gstin: string | null
          role: 'contractor' | 'accountant' | 'admin'
          language: 'en' | 'hi'
          dark_mode: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          business_name?: string | null
          gstin?: string | null
          role?: 'contractor' | 'accountant' | 'admin'
          language?: 'en' | 'hi'
          dark_mode?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          full_name?: string | null
          business_name?: string | null
          gstin?: string | null
          role?: 'contractor' | 'accountant' | 'admin'
          language?: 'en' | 'hi'
          dark_mode?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          id: string
          user_id: string
          file_url: string
          file_name: string
          file_size: number
          mime_type: string
          status: 'pending' | 'processing' | 'extracted' | 'verified' | 'claimed' | 'rejected' | 'reconciled'
          extracted_data: Json | null
          manual_overrides: Json | null
          gstr2b_matched: boolean
          gstr2b_match_date: string | null
          claim_id: string | null
          uploaded_at: string
          processed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          file_url: string
          file_name: string
          file_size: number
          mime_type: string
          status?: 'pending' | 'processing' | 'extracted' | 'verified' | 'claimed' | 'rejected' | 'reconciled'
          extracted_data?: Json | null
          manual_overrides?: Json | null
          gstr2b_matched?: boolean
          gstr2b_match_date?: string | null
          claim_id?: string | null
          uploaded_at?: string
          processed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          status?: 'pending' | 'processing' | 'extracted' | 'verified' | 'claimed' | 'rejected' | 'reconciled'
          extracted_data?: Json | null
          manual_overrides?: Json | null
          gstr2b_matched?: boolean
          gstr2b_match_date?: string | null
          claim_id?: string | null
          processed_at?: string | null
          updated_at?: string
        }
        Relationships: [
          { foreignKeyName: 'invoices_user_id_fkey'; columns: ['user_id']; referencedRelation: 'profiles'; referencedColumns: ['id'] }
        ]
      }
      itc_claims: {
        Row: {
          id: string
          user_id: string
          period: string
          status: 'draft' | 'ready' | 'filed' | 'adjusted'
          invoice_ids: string[]
          total_cgst: number
          total_sgst: number
          total_igst: number
          total_itc: number
          blocked_itc: number
          net_itc: number
          gstr3b_data: Json
          created_at: string
          updated_at: string
          filed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          period: string
          status?: 'draft' | 'ready' | 'filed' | 'adjusted'
          invoice_ids?: string[]
          total_cgst?: number
          total_sgst?: number
          total_igst?: number
          total_itc?: number
          blocked_itc?: number
          net_itc?: number
          gstr3b_data?: Json
          created_at?: string
          updated_at?: string
          filed_at?: string | null
        }
        Update: {
          status?: 'draft' | 'ready' | 'filed' | 'adjusted'
          invoice_ids?: string[]
          total_cgst?: number
          total_sgst?: number
          total_igst?: number
          total_itc?: number
          blocked_itc?: number
          net_itc?: number
          gstr3b_data?: Json
          updated_at?: string
          filed_at?: string | null
        }
        Relationships: [
          { foreignKeyName: 'itc_claims_user_id_fkey'; columns: ['user_id']; referencedRelation: 'profiles'; referencedColumns: ['id'] }
        ]
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
