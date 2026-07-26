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
      agent_api_keys: {
        Row: {
          created_at: string
          creator_id: string
          id: string
          key_hash: string
          key_prefix: string
          label: string
          last_used_at: string | null
          revoked: boolean
        }
        Insert: {
          created_at?: string
          creator_id: string
          id?: string
          key_hash: string
          key_prefix: string
          label?: string
          last_used_at?: string | null
          revoked?: boolean
        }
        Update: {
          created_at?: string
          creator_id?: string
          id?: string
          key_hash?: string
          key_prefix?: string
          label?: string
          last_used_at?: string | null
          revoked?: boolean
        }
        Relationships: []
      }
      agent_runs: {
        Row: {
          agent_id: string | null
          created_at: string
          creator_id: string
          id: string
          message: string | null
          source: string
          status: string
          story_id: string | null
        }
        Insert: {
          agent_id?: string | null
          created_at?: string
          creator_id: string
          id?: string
          message?: string | null
          source?: string
          status?: string
          story_id?: string | null
        }
        Update: {
          agent_id?: string | null
          created_at?: string
          creator_id?: string
          id?: string
          message?: string | null
          source?: string
          status?: string
          story_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_runs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "creator_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_runs_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_runs_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "story_analytics"
            referencedColumns: ["story_id"]
          },
          {
            foreignKeyName: "agent_runs_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "trending_stories"
            referencedColumns: ["story_id"]
          },
        ]
      }
      coin_transactions: {
        Row: {
          amount: number
          counterparty_id: string | null
          created_at: string
          id: string
          kind: string
          note: string | null
          story_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          counterparty_id?: string | null
          created_at?: string
          id?: string
          kind: string
          note?: string | null
          story_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          counterparty_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          note?: string | null
          story_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          body: string
          created_at: string
          id: string
          story_slug: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          story_slug: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          story_slug?: string
          user_id?: string
        }
        Relationships: []
      }
      creator_agents: {
        Row: {
          auto_publish: boolean
          cadence: string
          category: string
          created_at: string
          creator_id: string
          enabled: boolean
          id: string
          journey_id: string | null
          last_run_at: string | null
          monetization: Database["public"]["Enums"]["story_monetization"]
          name: string
          tip_enabled: boolean
          tone: string
          topic: string
          unlock_price: number
          updated_at: string
        }
        Insert: {
          auto_publish?: boolean
          cadence?: string
          category?: string
          created_at?: string
          creator_id: string
          enabled?: boolean
          id?: string
          journey_id?: string | null
          last_run_at?: string | null
          monetization?: Database["public"]["Enums"]["story_monetization"]
          name?: string
          tip_enabled?: boolean
          tone?: string
          topic?: string
          unlock_price?: number
          updated_at?: string
        }
        Update: {
          auto_publish?: boolean
          cadence?: string
          category?: string
          created_at?: string
          creator_id?: string
          enabled?: boolean
          id?: string
          journey_id?: string | null
          last_run_at?: string | null
          monetization?: Database["public"]["Enums"]["story_monetization"]
          name?: string
          tip_enabled?: boolean
          tone?: string
          topic?: string
          unlock_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_agents_journey_id_fkey"
            columns: ["journey_id"]
            isOneToOne: false
            referencedRelation: "journeys"
            referencedColumns: ["id"]
          },
        ]
      }
      journeys: {
        Row: {
          cover: string | null
          created_at: string
          creator_id: string | null
          description: string | null
          id: string
          slug: string
          started_at: string
          title: string
          updated_at: string
        }
        Insert: {
          cover?: string | null
          created_at?: string
          creator_id?: string | null
          description?: string | null
          id?: string
          slug: string
          started_at?: string
          title: string
          updated_at?: string
        }
        Update: {
          cover?: string | null
          created_at?: string
          creator_id?: string | null
          description?: string | null
          id?: string
          slug?: string
          started_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      media_assets: {
        Row: {
          created_at: string
          filename: string | null
          id: string
          kind: string
          path: string
          size_bytes: number | null
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          filename?: string | null
          id?: string
          kind: string
          path: string
          size_bytes?: number | null
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          filename?: string | null
          id?: string
          kind?: string
          path?: string
          size_bytes?: number | null
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          banned: boolean
          bio: string | null
          coin_balance: number
          created_at: string
          display_name: string | null
          id: string
          is_pro: boolean
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          banned?: boolean
          bio?: string | null
          coin_balance?: number
          created_at?: string
          display_name?: string | null
          id: string
          is_pro?: boolean
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          banned?: boolean
          bio?: string | null
          coin_balance?: number
          created_at?: string
          display_name?: string | null
          id?: string
          is_pro?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          adsense_client: string | null
          adsense_enabled: boolean
          adsense_global_enabled: boolean
          adsense_slot: string | null
          id: string
          media_allowed_types: string
          media_bucket_public: boolean
          media_max_mb: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          adsense_client?: string | null
          adsense_enabled?: boolean
          adsense_global_enabled?: boolean
          adsense_slot?: string | null
          id?: string
          media_allowed_types?: string
          media_bucket_public?: boolean
          media_max_mb?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          adsense_client?: string | null
          adsense_enabled?: boolean
          adsense_global_enabled?: boolean
          adsense_slot?: string | null
          id?: string
          media_allowed_types?: string
          media_bucket_public?: boolean
          media_max_mb?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      stories: {
        Row: {
          ai_generated: boolean
          category: string | null
          content: Json
          cover: string | null
          created_at: string
          creator_id: string | null
          difficulty: string | null
          id: string
          journey_id: string | null
          monetization: Database["public"]["Enums"]["story_monetization"]
          promoted: boolean
          promoted_until: string | null
          published: boolean
          reading_minutes: number
          short_description: string | null
          slug: string
          tags: string[]
          tip_enabled: boolean
          title: string
          unlock_price: number
          updated_at: string
          view_count: number
        }
        Insert: {
          ai_generated?: boolean
          category?: string | null
          content?: Json
          cover?: string | null
          created_at?: string
          creator_id?: string | null
          difficulty?: string | null
          id?: string
          journey_id?: string | null
          monetization?: Database["public"]["Enums"]["story_monetization"]
          promoted?: boolean
          promoted_until?: string | null
          published?: boolean
          reading_minutes?: number
          short_description?: string | null
          slug: string
          tags?: string[]
          tip_enabled?: boolean
          title: string
          unlock_price?: number
          updated_at?: string
          view_count?: number
        }
        Update: {
          ai_generated?: boolean
          category?: string | null
          content?: Json
          cover?: string | null
          created_at?: string
          creator_id?: string | null
          difficulty?: string | null
          id?: string
          journey_id?: string | null
          monetization?: Database["public"]["Enums"]["story_monetization"]
          promoted?: boolean
          promoted_until?: string | null
          published?: boolean
          reading_minutes?: number
          short_description?: string | null
          slug?: string
          tags?: string[]
          tip_enabled?: boolean
          title?: string
          unlock_price?: number
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "stories_journey_id_fkey"
            columns: ["journey_id"]
            isOneToOne: false
            referencedRelation: "journeys"
            referencedColumns: ["id"]
          },
        ]
      }
      story_search_events: {
        Row: {
          created_at: string
          id: string
          query: string
          searcher_id: string | null
          story_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          query: string
          searcher_id?: string | null
          story_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          query?: string
          searcher_id?: string | null
          story_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "story_search_events_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_search_events_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "story_analytics"
            referencedColumns: ["story_id"]
          },
          {
            foreignKeyName: "story_search_events_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "trending_stories"
            referencedColumns: ["story_id"]
          },
        ]
      }
      story_unlocks: {
        Row: {
          created_at: string
          id: string
          price_paid: number
          story_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          price_paid?: number
          story_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          price_paid?: number
          story_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_unlocks_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_unlocks_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "story_analytics"
            referencedColumns: ["story_id"]
          },
          {
            foreignKeyName: "story_unlocks_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "trending_stories"
            referencedColumns: ["story_id"]
          },
        ]
      }
      story_views: {
        Row: {
          created_at: string
          id: string
          session_key: string | null
          story_id: string
          viewer_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          session_key?: string | null
          story_id: string
          viewer_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          session_key?: string | null
          story_id?: string
          viewer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "story_views_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_views_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "story_analytics"
            referencedColumns: ["story_id"]
          },
          {
            foreignKeyName: "story_views_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "trending_stories"
            referencedColumns: ["story_id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      writer_requests: {
        Row: {
          created_at: string
          id: string
          message: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      story_analytics: {
        Row: {
          ai_generated: boolean | null
          comment_count: number | null
          creator_id: string | null
          published: boolean | null
          searches_7d: number | null
          slug: string | null
          story_id: string | null
          tip_count: number | null
          tip_revenue: number | null
          title: string | null
          unlock_count: number | null
          unlock_revenue: number | null
          view_count: number | null
          views_30d: number | null
          views_7d: number | null
        }
        Relationships: []
      }
      trending_stories: {
        Row: {
          comments_7d: number | null
          score: number | null
          searches_7d: number | null
          slug: string | null
          story_id: string | null
          tips_7d: number | null
          unlocks_7d: number | null
          views_7d: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_story_view:
        | { Args: { _story_id: string }; Returns: undefined }
        | {
            Args: { _session_key?: string; _story_id: string }
            Returns: undefined
          }
    }
    Enums: {
      app_role: "reader" | "writer" | "admin" | "manager"
      story_monetization: "free" | "tips" | "locked"
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
      app_role: ["reader", "writer", "admin", "manager"],
      story_monetization: ["free", "tips", "locked"],
    },
  },
} as const
