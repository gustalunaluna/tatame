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
          demonstracao: boolean;
          created_at: string;
          updated_at: string;
          nickname: string;
          bio: string;
          handle: string | null;
          perfil_jogo: Json;
          questionario_em: string | null;
          treinos_por_semana: number | null;
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
          demonstracao?: boolean;
          created_at?: string;
          updated_at?: string;
          nickname?: string;
          bio?: string;
          handle?: string | null;
          perfil_jogo?: Json;
          questionario_em?: string | null;
          treinos_por_semana?: number | null;
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
          demonstracao?: boolean;
          created_at?: string;
          updated_at?: string;
          nickname?: string;
          bio?: string;
          handle?: string | null;
          perfil_jogo?: Json;
          questionario_em?: string | null;
          treinos_por_semana?: number | null;
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
      exames_de_faixa: {
        Row: {
          id: string;
          user_id: string;
          faixa_alvo: string;
          escopo: string;
          semente: number;
          perguntas: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          faixa_alvo: string;
          escopo?: string;
          semente: number;
          perguntas?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          faixa_alvo?: string;
          escopo?: string;
          semente?: number;
          perguntas?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      lutas: {
        Row: {
          id: string;
          user_id: string;
          data: string;
          evento: string;
          oficial: boolean;
          oponente: string;
          oponente_faixa: string | null;
          categoria: string;
          resultado: string;
          metodo: string | null;
          golpe: string;
          tempo_seg: number | null;
          notas: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          data: string;
          evento?: string;
          oficial?: boolean;
          oponente?: string;
          oponente_faixa?: string | null;
          categoria?: string;
          resultado: string;
          metodo?: string | null;
          golpe?: string;
          tempo_seg?: number | null;
          notas?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          data?: string;
          evento?: string;
          oficial?: boolean;
          oponente?: string;
          oponente_faixa?: string | null;
          categoria?: string;
          resultado?: string;
          metodo?: string | null;
          golpe?: string;
          tempo_seg?: number | null;
          notas?: string;
          created_at?: string;
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
      /* --- a área de dieta (migração 041) ------------------------------- */
      perfil_da_dieta: {
        Row: {
          user_id: string;
          altura_cm: number | null;
          sexo: string | null;
          objetivo: string;
          meta_kcal: number | null;
          meta_proteina_g: number | null;
          meta_carboidrato_g: number | null;
          meta_gordura_g: number | null;
          meta_agua_ml: number | null;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          altura_cm?: number | null;
          sexo?: string | null;
          objetivo?: string;
          meta_kcal?: number | null;
          meta_proteina_g?: number | null;
          meta_carboidrato_g?: number | null;
          meta_gordura_g?: number | null;
          meta_agua_ml?: number | null;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          altura_cm?: number | null;
          sexo?: string | null;
          objetivo?: string;
          meta_kcal?: number | null;
          meta_proteina_g?: number | null;
          meta_carboidrato_g?: number | null;
          meta_gordura_g?: number | null;
          meta_agua_ml?: number | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      pesagens: {
        Row: {
          id: string;
          user_id: string;
          data: string;
          peso_kg: number;
          gordura_pct: number | null;
          nota: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          data: string;
          peso_kg: number;
          gordura_pct?: number | null;
          nota?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          data?: string;
          peso_kg?: number;
          gordura_pct?: number | null;
          nota?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      refeicoes: {
        Row: {
          id: string;
          user_id: string;
          data: string;
          momento: string;
          alimento: string;
          porcao: string;
          kcal: number;
          proteina_g: number;
          carboidrato_g: number;
          gordura_g: number;
          created_at: string;
          cardapio_item_id: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          data: string;
          momento?: string;
          alimento: string;
          porcao?: string;
          kcal?: number;
          proteina_g?: number;
          carboidrato_g?: number;
          gordura_g?: number;
          created_at?: string;
          cardapio_item_id?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          data?: string;
          momento?: string;
          alimento?: string;
          porcao?: string;
          kcal?: number;
          proteina_g?: number;
          carboidrato_g?: number;
          gordura_g?: number;
          created_at?: string;
          cardapio_item_id?: string | null;
        };
        Relationships: [];
      };
      cardapio_itens: {
        Row: {
          id: string;
          user_id: string;
          momento: string;
          alimento: string;
          porcao: string;
          kcal: number;
          proteina_g: number;
          carboidrato_g: number;
          gordura_g: number;
          ordem: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          momento?: string;
          alimento: string;
          porcao?: string;
          kcal?: number;
          proteina_g?: number;
          carboidrato_g?: number;
          gordura_g?: number;
          ordem?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          momento?: string;
          alimento?: string;
          porcao?: string;
          kcal?: number;
          proteina_g?: number;
          carboidrato_g?: number;
          gordura_g?: number;
          ordem?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      consumo_de_agua: {
        Row: {
          user_id: string;
          data: string;
          ml: number;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          data: string;
          ml?: number;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          data?: string;
          ml?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      /** O que a pessoa mais registra na dieta — ver migração 041. */
      alimentos_recentes: {
        Args: { p_limite?: number };
        Returns: {
          alimento: string;
          porcao: string;
          kcal: number;
          proteina_g: number;
          carboidrato_g: number;
          gordura_g: number;
          usos: number;
        }[];
      };
      achievement_stats: {
        Args: Record<string, never>;
        Returns: { total: number; unlocked: number }[];
      };
      /** Exportação LGPD art. 18, V — ver migração 036. */
      meus_dados: {
        Args: Record<string, never>;
        Returns: Json;
      };
      /** Exclusão LGPD art. 18, VI / App Store 5.1.1(v) — ver migração 036. */
      excluir_minha_conta: {
        Args: Record<string, never>;
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
