export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      business_cases: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          project_id: string
          status: Database["public"]["Enums"]["business_case_status"]
          type: Database["public"]["Enums"]["business_case_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          project_id: string
          status?: Database["public"]["Enums"]["business_case_status"]
          type?: Database["public"]["Enums"]["business_case_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          project_id?: string
          status?: Database["public"]["Enums"]["business_case_status"]
          type?: Database["public"]["Enums"]["business_case_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_cases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_plan_rows: {
        Row: {
          cash_plan_id: string
          category: Database["public"]["Enums"]["cash_row_category"]
          created_at: string
          id: string
          monthly_values: Json
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          cash_plan_id: string
          category: Database["public"]["Enums"]["cash_row_category"]
          created_at?: string
          id?: string
          monthly_values?: Json
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          cash_plan_id?: string
          category?: Database["public"]["Enums"]["cash_row_category"]
          created_at?: string
          id?: string
          monthly_values?: Json
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_plan_rows_cash_plan_id_fkey"
            columns: ["cash_plan_id"]
            isOneToOne: false
            referencedRelation: "cash_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_plans: {
        Row: {
          business_case_id: string
          created_at: string
          currency: string
          id: string
          initial_cash: number
          months: number
          start_month: string
          updated_at: string
        }
        Insert: {
          business_case_id: string
          created_at?: string
          currency?: string
          id?: string
          initial_cash?: number
          months?: number
          start_month?: string
          updated_at?: string
        }
        Update: {
          business_case_id?: string
          created_at?: string
          currency?: string
          id?: string
          initial_cash?: number
          months?: number
          start_month?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_plans_business_case_id_fkey"
            columns: ["business_case_id"]
            isOneToOne: false
            referencedRelation: "business_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      memos: {
        Row: {
          business_case_id: string
          competition: string | null
          created_at: string
          finances: string | null
          gtm: string | null
          id: string
          market: string | null
          problem: string | null
          risks: string | null
          solution: string | null
          updated_at: string
        }
        Insert: {
          business_case_id: string
          competition?: string | null
          created_at?: string
          finances?: string | null
          gtm?: string | null
          id?: string
          market?: string | null
          problem?: string | null
          risks?: string | null
          solution?: string | null
          updated_at?: string
        }
        Update: {
          business_case_id?: string
          competition?: string | null
          created_at?: string
          finances?: string | null
          gtm?: string | null
          id?: string
          market?: string | null
          problem?: string | null
          risks?: string | null
          solution?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "memos_business_case_id_fkey"
            columns: ["business_case_id"]
            isOneToOne: false
            referencedRelation: "business_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          id: string
          name: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          id: string
          name?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      scenario_rows: {
        Row: {
          category: string
          created_at: string
          id: string
          monthly_values: Json
          name: string
          scenario_id: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          monthly_values?: Json
          name: string
          scenario_id: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          monthly_values?: Json
          name?: string
          scenario_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scenario_rows_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      scenarios: {
        Row: {
          cash_plan_id: string
          created_at: string
          id: string
          name: string
          parameters: Json
          type: string
          updated_at: string
        }
        Insert: {
          cash_plan_id: string
          created_at?: string
          id?: string
          name: string
          parameters?: Json
          type: string
          updated_at?: string
        }
        Update: {
          cash_plan_id?: string
          created_at?: string
          id?: string
          name?: string
          parameters?: Json
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scenarios_cash_plan_id_fkey"
            columns: ["cash_plan_id"]
            isOneToOne: false
            referencedRelation: "cash_plans"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      business_case_status: "draft" | "active" | "archived"
      business_case_type:
        | "saas"
        | "marketplace"
        | "ecommerce"
        | "ai"
        | "service"
        | "custom"
      cash_row_category: "revenue" | "cost" | "headcount" | "other"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      business_case_status: ["draft", "active", "archived"],
      business_case_type: [
        "saas",
        "marketplace",
        "ecommerce",
        "ai",
        "service",
        "custom",
      ],
      cash_row_category: ["revenue", "cost", "headcount", "other"],
    },
  },
} as const
