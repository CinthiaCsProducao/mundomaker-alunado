-- ETAPA 2 (segurança): login com Supabase Auth
-- Execute no Supabase SQL Editor. Seguro: não altera nenhuma tabela existente.

-- Só permite criar conta de login para e-mails ativos na tabela "usuarios".
CREATE OR REPLACE FUNCTION public.bloquear_email_nao_cadastrado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.usuarios u
    WHERE lower(u.email) = lower(NEW.email) AND u.ativo = true
  ) THEN
    RAISE EXCEPTION 'E-mail não autorizado';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bloquear_email_nao_cadastrado ON auth.users;
CREATE TRIGGER trg_bloquear_email_nao_cadastrado
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.bloquear_email_nao_cadastrado();
