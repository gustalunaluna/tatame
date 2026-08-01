export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          user_id: string;
          goal_start: string;
          seeded: boolean;
          created_at: string;
          updated_at: string;
          nickname: string;
          bio: string;
          handle: string | null;
          perfil_jogo: Json;
          questionario_em: string | null;
          verificado: boolean;
          birth_date: string | null;
          photo_url: string;
          belt: string;
          degrees: number;
          master: string;
          gym: string;
          fights_won: number;
          fights_lost: number;
          instrutor: boolean;
        };
        Insert: {
          user_id: string;
          goal_start?: string;
          seeded?: boolean;
          created_at?: string;
          updated_at?: string;
          nickname?: string;
          bio?: string;
          handle?: string | null;
          perfil_jogo?: Json;
          questionario_em?: string | null;
          verificado?: boolean;
          birth_date?: string | null;
          photo_url?: string;
          belt?: string;
          degrees?: number;
          master?: string;
          gym?: string;
          fights_won?: number;
          fights_lost?: number;
          instrutor?: boolean;
        };
        Update: {
          user_id?: string;
          goal_start?: string;
          seeded?: boolean;
          created_at?: string;
          updated_at?: string;
          nickname?: string;
          bio?: string;
          handle?: string | null;
          perfil_jogo?: Json;
          questionario_em?: string | null;
          verificado?: boolean;
          birth_date?: string | null;
          photo_url?: string;
          belt?: string;
          degrees?: number;
          master?: string;
          gym?: string;
          fights_won?: number;
          fights_lost?: number;
          instrutor?: boolean;
        };
        Relationships: [];
      };
      trainings: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          type: string;
          duration_min: number;
          rolls: number;
          partners: string;
          techniques: string;
          notes: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date: string;
          type: string;
          duration_min?: number;
          rolls?: number;
          partners?: string;
          techniques?: string;
          notes?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          date?: string;
          type?: string;
          duration_min?: number;
          rolls?: number;
          partners?: string;
          techniques?: string;
          notes?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      techniques: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          category: string;
          notes: string;
          video_url: string;
          mastery: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          category: string;
          notes?: string;
          video_url?: string;
          mastery?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          category?: string;
          notes?: string;
          video_url?: string;
          mastery?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      plan_weeks: {
        Row: {
          id: string;
          user_id: string;
          week: number;
          focus: string;
          items: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          week: number;
          focus: string;
          items?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          week?: number;
          focus?: string;
          items?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      weak_points: {
        Row: {
          id: string;
          user_id: string;
          label: string;
          score: number;
          history: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          label: string;
          score?: number;
          history?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          label?: string;
          score?: number;
          history?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      analyses: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          title: string;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date: string;
          title: string;
          content?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          date?: string;
          title?: string;
          content?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      achievements: {
        Row: {
          id: string;
          user_id: string;
          key: string;
          title: string;
          description: string;
          tier: string;
          category: string;
          sort_order: number;
          unlocked: boolean;
          unlocked_date: string | null;
          target: number | null;
          progress: number;
          featured: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          key: string;
          title: string;
          description?: string;
          tier: string;
          category?: string;
          sort_order?: number;
          unlocked?: boolean;
          unlocked_date?: string | null;
          target?: number | null;
          progress?: number;
          featured?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          key?: string;
          title?: string;
          description?: string;
          tier?: string;
          category?: string;
          sort_order?: number;
          unlocked?: boolean;
          unlocked_date?: string | null;
          target?: number | null;
          progress?: number;
          featured?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      achievement_stats: {
        Args: Record<string, never>;
        Returns: { total: number; unlocked: number }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
