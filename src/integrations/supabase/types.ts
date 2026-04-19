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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      plants: {
        Row: {
          created_at: string
          establishment_level: Database["public"]["Enums"]["establishment_level"]
          exposure: Database["public"]["Enums"]["plant_exposure"]
          family_id: string | null
          id: string
          image_url: string | null
          last_watered_date: string | null
          location: Database["public"]["Enums"]["plant_location"]
          name: string
          next_watering_date: string | null
          pot_size: Database["public"]["Enums"]["pot_size"]
          rain_delay_until: string | null
          updated_at: string
          watering_frequency_days: number
          watering_volume: number
        }
        Insert: {
          created_at?: string
          establishment_level?: Database["public"]["Enums"]["establishment_level"]
          exposure?: Database["public"]["Enums"]["plant_exposure"]
          family_id?: string | null
          id?: string
          image_url?: string | null
          last_watered_date?: string | null
          location?: Database["public"]["Enums"]["plant_location"]
          name: string
          next_watering_date?: string | null
          pot_size?: Database["public"]["Enums"]["pot_size"]
          rain_delay_until?: string | null
          updated_at?: string
          watering_frequency_days?: number
          watering_volume?: number
        }
        Update: {
          created_at?: string
          establishment_level?: Database["public"]["Enums"]["establishment_level"]
          exposure?: Database["public"]["Enums"]["plant_exposure"]
          family_id?: string | null
          id?: string
          image_url?: string | null
          last_watered_date?: string | null
          location?: Database["public"]["Enums"]["plant_location"]
          name?: string
          next_watering_date?: string | null
          pot_size?: Database["public"]["Enums"]["pot_size"]
          rain_delay_until?: string | null
          updated_at?: string
          watering_frequency_days?: number
          watering_volume?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          city: string | null
          created_at: string
          display_name: string | null
          family_id: string | null
          id: string
          updated_at: string
          zip: string | null
        }
        Insert: {
          city?: string | null
          created_at?: string
          display_name?: string | null
          family_id?: string | null
          id: string
          updated_at?: string
          zip?: string | null
        }
        Update: {
          city?: string | null
          created_at?: string
          display_name?: string | null
          family_id?: string | null
          id?: string
          updated_at?: string
          zip?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_family_id: { Args: never; Returns: string }
    }
    Enums: {
      establishment_level: "infant" | "young" | "mature" | "unsure"
      plant_exposure: "indoor" | "porch" | "outdoor"
      plant_location: "indoor" | "outdoor"
      pot_size: "small" | "medium" | "large"
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
      establishment_level: ["infant", "young", "mature", "unsure"],
      plant_exposure: ["indoor", "porch", "outdoor"],
      plant_location: ["indoor", "outdoor"],
      pot_size: ["small", "medium", "large"],
    },
  },
} as const
