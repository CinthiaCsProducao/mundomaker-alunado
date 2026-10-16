-- LGPD / ECA Digital — ETAPA C (BLOQUEIO). Rode SOMENTE depois de:
--   1) rodar lgpd_etapa_a.sql  2) publicar o código novo no Vercel e testar o formulário e o login.
-- Para desfazer em emergência, veja o final deste arquivo.

-- 0) Remove políticas antigas das tabelas abaixo (para não sobrar nenhuma "liberada para todos")
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname, tablename FROM pg_policies
           WHERE schemaname = 'public'
             AND tablename IN ('usuarios','base_escolas','projetos_escola','schools','grade_classes','classes',
                               'alunado_history','cortes_conferencia','ciclos','romaneios','romaneios_historico')
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- 1) usuarios: cada pessoa lê só o próprio registro; administrador gerencia todos
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY usr_sel ON public.usuarios FOR SELECT TO authenticated
  USING (lower(email) = lower(auth.jwt()->>'email') OR public.is_admin());
CREATE POLICY usr_ins ON public.usuarios FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY usr_upd ON public.usuarios FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY usr_del ON public.usuarios FOR DELETE TO authenticated USING (public.is_admin());
UPDATE public.usuarios SET senha = NULL;   -- apaga as senhas antigas (hash). O login agora é só pelo Supabase Auth.

-- 2) Base de Escolas (contatos, contratos): só quem tem a permissão Base Escolas
ALTER TABLE public.base_escolas ENABLE ROW LEVEL SECURITY;
CREATE POLICY be_all ON public.base_escolas FOR ALL TO authenticated
  USING (public.has_perm('baseEscolas')) WITH CHECK (public.has_perm('baseEscolas'));

-- 3) Tabelas operacionais: leitura para equipe ativa; escrita para quem trabalha com escolas
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['projetos_escola','schools','grade_classes','classes','alunado_history','cortes_conferencia','ciclos'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.is_active_user())', t || '_sel', t);
    EXECUTE format($f$CREATE POLICY %I ON public.%I FOR ALL TO authenticated
      USING (public.has_any_perm(ARRAY['escolas','inspiramaker','projecao','baseEscolas','historico']))
      WITH CHECK (public.has_any_perm(ARRAY['escolas','inspiramaker','projecao','baseEscolas','historico']))$f$, t || '_wr', t);
  END LOOP;
END $$;

-- 4) Romaneios: equipe ativa
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['romaneios','romaneios_historico'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.is_active_user()) WITH CHECK (public.is_active_user())', t || '_all', t);
  END LOOP;
END $$;

-- 5) Arquivos: todos os buckets passam a ser privados
UPDATE storage.buckets SET public = false WHERE id IN ('calendars','signatures','historico-escola','romaneios','pops');
UPDATE storage.buckets SET file_size_limit = 10485760, allowed_mime_types = ARRAY['application/pdf','image/jpeg','image/png'] WHERE id = 'calendars';
UPDATE storage.buckets SET file_size_limit = 1048576,  allowed_mime_types = ARRAY['image/png'] WHERE id = 'signatures';

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' LOOP
    EXECUTE format('DROP POLICY %I ON storage.objects', r.policyname);
  END LOOP;
END $$;

-- Formulário público: só pode ENVIAR (nunca ler/alterar) com nome aleatório (uuid)
CREATE POLICY st_cal_ins ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'calendars' AND name ~ '^[0-9a-f-]{36}\.(pdf|jpg|jpeg|png)$');
CREATE POLICY st_sig_ins ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'signatures' AND name ~ '^[0-9a-f-]{36}\.png$');

-- Equipe: leitura por permissão
CREATE POLICY st_cs_sel ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id IN ('calendars','signatures') AND public.has_any_perm(ARRAY['escolas','inspiramaker','projecao','baseEscolas','historico']));
CREATE POLICY st_hist_all ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'historico-escola' AND public.has_perm('baseEscolas'))
  WITH CHECK (bucket_id = 'historico-escola' AND public.has_perm('baseEscolas'));
CREATE POLICY st_rom_all ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'romaneios' AND public.is_active_user())
  WITH CHECK (bucket_id = 'romaneios' AND public.is_active_user());
CREATE POLICY st_pops_sel ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'pops' AND EXISTS (SELECT 1 FROM public.pops_documentos d WHERE d.arquivo_path = name AND public.pops_area_ok(d.area)));
CREATE POLICY st_pops_wr ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'pops' AND public.is_admin()) WITH CHECK (bucket_id = 'pops' AND public.is_admin());

-- ===== EMERGÊNCIA (só se algo quebrar e você precisar voltar já) =====
-- ALTER TABLE public.<tabela> DISABLE ROW LEVEL SECURITY;   -- reabre a tabela
-- UPDATE storage.buckets SET public = true WHERE id = '<bucket>';
