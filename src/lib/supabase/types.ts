/**
 * The generated Supabase Database type, hand-maintained to match
 * supabase/migrations/0001_schema.sql.
 *
 * Regenerate against a live project with:
 *   npx supabase gen types typescript --project-id <project-ref> > src/lib/supabase/types.ts
 *
 * `Relationships` is required by supabase-js: without it the client cannot infer
 * table names and every `.from(...)` call resolves to `never`.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type ProfileRow = {
  user_id: string;
  username: string | null;
  bio: string | null;
  avatar: string | null;
  created_at: string;
  updated_at: string;
};

export type AssignmentRow = {
  id: string;
  user_id: string;
  title: string;
  course: string;
  description: string | null;
  due_date: string | null;
  priority: string | null;
  status: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type NoteFolderRow = {
  id: string;
  user_id: string;
  name: string;
  /** epoch ms (bigint) */
  created_at: number;
  updated_at: string;
  deleted_at: string | null;
};

export type NoteRow = {
  id: string;
  user_id: string;
  content: string;
  /** epoch ms (bigint) */
  last_modified: number;
  pinned: boolean;
  folder_id: string | null;
  /** epoch ms (bigint) */
  created_at: number;
  updated_at: string;
  deleted_at: string | null;
};

export type TransactionRow = {
  id: string;
  user_id: string;
  type: string;
  /**
   * Postgres numeric has no single TS counterpart. Supabase's generator emits
   * `number`, but over PostgREST the wire value is a string, so the repository
   * parses it with toNumber() at the boundary.
   */
  amount: number;
  category: string;
  description: string;
  date: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type SubscriptionRow = {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  category: string;
  start_date: string | null;
  last_processed: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type ScheduleClassRow = {
  id: string;
  user_id: string;
  name: string;
  room: string;
  day: string;
  start_time: string;
  end_time: string;
  color_theme: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type CashflowSettingsRow = {
  user_id: string;
  currency: string;
  updated_at: string;
};

type Table<Row, RequiredInsert extends keyof Row> = {
  Row: Row;
  Insert: Partial<Row> & Pick<Row, RequiredInsert>;
  Update: Partial<Row>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<ProfileRow, 'user_id'>;
      assignments: Table<AssignmentRow, 'id' | 'user_id'>;
      note_folders: Table<NoteFolderRow, 'id' | 'user_id'>;
      notes: Table<NoteRow, 'id' | 'user_id'>;
      transactions: Table<TransactionRow, 'id' | 'user_id'>;
      subscriptions: Table<SubscriptionRow, 'id' | 'user_id'>;
      schedule_classes: Table<ScheduleClassRow, 'id' | 'user_id'>;
      cashflow_settings: Table<CashflowSettingsRow, 'user_id'>;
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};

/** Row shape for a table. */
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

/** Insert shape for a table, with the key columns still required. */
export type TableInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];

/** Update shape for a table — every column optional. */
export type TableUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];