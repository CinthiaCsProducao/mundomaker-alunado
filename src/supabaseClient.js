// Cliente único do Supabase, compartilhado por todo o sistema.
// Ter um só cliente garante que a sessão de login (Supabase Auth) vale para todas as telas.
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);
