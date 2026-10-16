-- LGPD / ECA Digital — ETAPA A (segura: não bloqueia nada que já funciona)
-- Execute inteiro no Supabase SQL Editor.

-- 1) Funções auxiliares de permissão -------------------------------------
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_active_user();
$$;

CREATE OR REPLACE FUNCTION public.has_any_perm(p text[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_admin() OR EXISTS (
    SELECT 1 FROM public.usuarios u
    WHERE lower(u.email) = lower(auth.jwt()->>'email') AND u.ativo = true
      AND EXISTS (SELECT 1 FROM unnest(p) k WHERE u.permissoes->>k = 'true')
  );
$$;

-- 2) Trilha de auditoria (LGPD art. 37) ----------------------------------
CREATE TABLE IF NOT EXISTS public.auditoria (
  id bigserial PRIMARY KEY,
  criado_em timestamptz NOT NULL DEFAULT now(),
  usuario_email text NOT NULL,
  acao text NOT NULL,
  entidade text,
  entidade_id text,
  detalhes jsonb
);
ALTER TABLE public.auditoria ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS aud_ins ON public.auditoria;
DROP POLICY IF EXISTS aud_sel ON public.auditoria;
CREATE POLICY aud_ins ON public.auditoria FOR INSERT TO authenticated
  WITH CHECK (public.is_active_user() AND lower(usuario_email) = lower(auth.jwt()->>'email'));
CREATE POLICY aud_sel ON public.auditoria FOR SELECT TO authenticated USING (public.is_admin());

-- 3) Proteção contra tentativa de adivinhar CNPJ -------------------------
CREATE TABLE IF NOT EXISTS public.tentativas_cnpj (
  id bigserial PRIMARY KEY,
  escola_id text NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tentativas_cnpj ENABLE ROW LEVEL SECURITY;  -- sem policies: só funções internas acessam

CREATE OR REPLACE FUNCTION public.cnpj_ok(p_id text, p_cnpj text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE real_cnpj text; falhas int;
BEGIN
  SELECT regexp_replace(coalesce(data->>'cnpj',''), '\D', '', 'g') INTO real_cnpj
    FROM base_escolas WHERE id::text = p_id;
  IF real_cnpj IS NULL THEN RETURN 'inexistente'; END IF;
  SELECT count(*) INTO falhas FROM tentativas_cnpj
    WHERE escola_id = p_id AND criado_em > now() - interval '15 minutes';
  IF falhas >= 5 THEN RETURN 'bloqueado'; END IF;
  IF length(real_cnpj) = 14 AND regexp_replace(coalesce(p_cnpj,''), '\D', '', 'g') = real_cnpj THEN
    RETURN 'ok';
  END IF;
  INSERT INTO tentativas_cnpj(escola_id) VALUES (p_id);
  DELETE FROM tentativas_cnpj WHERE criado_em < now() - interval '2 days';
  RETURN 'incorreto';
END $$;
REVOKE ALL ON FUNCTION public.cnpj_ok(text, text) FROM PUBLIC, anon, authenticated;

-- 4) Formulário público via funções (sem expor tabelas) ------------------
-- 4a) Dados mínimos para a tela de acesso
CREATE OR REPLACE FUNCTION public.get_escola_publica(p_id text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object('nome', data->>'nome', 'idioma', data->>'idioma', 'tipo', data->>'tipo')
  FROM base_escolas WHERE id::text = p_id;
$$;

-- 4b) Dados completos após validar o CNPJ
CREATE OR REPLACE FUNCTION public.get_escola_form(p_id text, p_cnpj text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE st text; d jsonb; sid schools.id%TYPE; proj jsonb; turmas jsonb;
BEGIN
  st := public.cnpj_ok(p_id, p_cnpj);
  IF st <> 'ok' THEN RETURN jsonb_build_object('ok', false, 'motivo', st); END IF;
  SELECT data INTO d FROM base_escolas WHERE id::text = p_id;
  SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.serie), '[]'::jsonb) INTO proj
    FROM (SELECT serie, envio_1, envio_2, envio_3 FROM projetos_escola WHERE escola_id::text = p_id) x;
  SELECT id INTO sid FROM schools WHERE escola_base_id::text = p_id LIMIT 1;
  IF sid IS NULL THEN turmas := '[]'::jsonb;
  ELSE
    SELECT coalesce(jsonb_agg(jsonb_build_object('serie', g.serie, 'turma', c.turma,
             'num_alunos', c.num_alunos, 'professor_maker', c.professor_maker) ORDER BY g.ordem, c.turma), '[]'::jsonb)
      INTO turmas
      FROM grade_classes g JOIN classes c ON c.grade_class_id = g.id WHERE g.school_id = sid;
  END IF;
  RETURN jsonb_build_object('ok', true,
    'escola', jsonb_build_object('nome', d->>'nome', 'idioma', d->>'idioma', 'tipo', d->>'tipo',
      'logradouro', d->>'logradouro', 'numero', d->>'numero', 'bairro', d->>'bairro',
      'cidade', d->>'cidade', 'uf', d->>'uf', 'cep', d->>'cep', 'telefone', d->>'telefone'),
    'projetos', proj, 'turmas', turmas);
END $$;

-- 4c) Envio do formulário (validação e cálculos no servidor)
CREATE OR REPLACE FUNCTION public.enviar_alunado(p_id text, p_cnpj text, p_dados jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  st text; d jsonb; g jsonb; sid schools.id%TYPE; base_pk base_escolas.id%TYPE;
  tipo_base text; prog text; total int := 0; cl text; ser jsonb; t jsonb; gcid grade_classes.id%TYPE;
  i int := 0; cal text; sig text; ender text; n int;
BEGIN
  st := public.cnpj_ok(p_id, p_cnpj);
  IF st <> 'ok' THEN RETURN jsonb_build_object('ok', false, 'motivo', st); END IF;
  IF coalesce((p_dados->>'consentimento')::boolean, false) IS NOT TRUE THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'sem_consentimento');
  END IF;

  SELECT id, data INTO base_pk, d FROM base_escolas WHERE id::text = p_id;
  g := coalesce(p_dados->'dadosGerais', '{}'::jsonb);
  cal := nullif(p_dados->>'calendario_path', '');
  sig := p_dados->>'assinatura_path';
  IF sig IS NULL OR sig !~ '^[0-9a-f-]{36}\.png$' THEN RETURN jsonb_build_object('ok', false, 'motivo', 'assinatura'); END IF;
  IF cal IS NOT NULL AND cal !~ '^[0-9a-f-]{36}\.(pdf|jpg|jpeg|png)$' THEN RETURN jsonb_build_object('ok', false, 'motivo', 'calendario'); END IF;
  IF jsonb_typeof(p_dados->'series') <> 'array' OR jsonb_array_length(p_dados->'series') = 0 OR jsonb_array_length(p_dados->'series') > 40 THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'series');
  END IF;

  -- programa vem da Base de Escolas (mesma regra de programaTipo.js)
  tipo_base := lower(coalesce(d->>'tipo', ''));
  prog := CASE
    WHEN tipo_base = '' THEN ''
    WHEN tipo_base LIKE '%inventores%' AND tipo_base LIKE '%oficina%' THEN 'MakerLab Oficina Inventores do Futuro'
    WHEN tipo_base LIKE '%inventores%' THEN 'Inventores do Futuro'
    WHEN tipo_base LIKE '%oficina%' THEN 'MakerLab Oficina'
    WHEN tipo_base LIKE '%class%' THEN 'MakerLab Class'
    WHEN tipo_base LIKE '%techlab%' THEN 'Inventores do Futuro'
    WHEN tipo_base LIKE '%makerlab%' THEN 'MakerLab Class'
    ELSE d->>'tipo' END;

  FOR ser IN SELECT * FROM jsonb_array_elements(p_dados->'series') LOOP
    FOR t IN SELECT * FROM jsonb_array_elements(coalesce(ser->'turmas', '[]'::jsonb)) LOOP
      n := greatest(0, least(coalesce(nullif(t->>'num_alunos','')::int, 0), 5000));
      total := total + n;
    END LOOP;
  END LOOP;
  cl := CASE WHEN total >= 500 THEN 'Diamond' WHEN total >= 300 THEN 'Gold' WHEN total >= 100 THEN 'Silver' ELSE 'Bronze' END;

  ender := concat_ws(', ', nullif(left(g->>'logradouro',200),''), nullif(left(g->>'numero',20),''), nullif(left(g->>'complemento',100),''),
    nullif(left(g->>'bairro',100),''), nullif(left(g->>'cidade',100),''), nullif(left(g->>'estado',50),''), nullif(left(g->>'cep',20),''));

  SELECT id INTO sid FROM schools WHERE escola_base_id::text = p_id LIMIT 1;
  IF sid IS NULL THEN SELECT id INTO sid FROM schools WHERE lower(nome) = lower(trim(d->>'nome')) LIMIT 1; END IF;

  IF sid IS NULL THEN
    INSERT INTO schools(nome, endereco, telefone, responsavel_escola, data_inicio, data_recebimento, tipo_frete,
        programa, idioma_material, num_salas_maker, escola_base_id)
      VALUES (d->>'nome', ender, left(g->>'telefone',40), left(g->>'responsavel',150),
        nullif(g->>'data_inicio','')::date, nullif(g->>'data_recebimento','')::date, left(g->>'tipo_frete',50),
        prog, left(g->>'idioma_material',50), coalesce(nullif(g->>'num_salas_maker','')::int, 0), base_pk)
      RETURNING id INTO sid;
  ELSE
    UPDATE schools SET endereco = ender, telefone = left(g->>'telefone',40), responsavel_escola = left(g->>'responsavel',150),
        data_inicio = nullif(g->>'data_inicio','')::date, data_recebimento = nullif(g->>'data_recebimento','')::date,
        tipo_frete = left(g->>'tipo_frete',50), programa = prog, idioma_material = left(g->>'idioma_material',50),
        num_salas_maker = coalesce(nullif(g->>'num_salas_maker','')::int, 0), escola_base_id = base_pk
      WHERE id = sid;
    DELETE FROM classes WHERE school_id = sid;
    DELETE FROM grade_classes WHERE school_id = sid;
  END IF;

  FOR ser IN SELECT * FROM jsonb_array_elements(p_dados->'series') LOOP
    INSERT INTO grade_classes(school_id, serie, ordem, projeto)
      VALUES (sid, left(ser->>'serie',100), i, nullif(left(ser->>'projeto',200),'')) RETURNING id INTO gcid;
    i := i + 1;
    FOR t IN SELECT * FROM jsonb_array_elements(coalesce(ser->'turmas', '[]'::jsonb)) LOOP
      INSERT INTO classes(grade_class_id, school_id, turma, num_alunos, professor_maker)
        VALUES (gcid, sid, left(t->>'turma',20),
          greatest(0, least(coalesce(nullif(t->>'num_alunos','')::int, 0), 5000)),
          nullif(left(t->>'professor_maker',150),''));
    END LOOP;
  END LOOP;

  INSERT INTO alunado_history(school_id, total_alunos, cluster, responsavel_preenchimento,
      assinatura_url, calendario_url, calendario_nome, dados_snapshot)
    VALUES (sid, total, cl, left(p_dados->>'responsavel',150), sig, cal, left(p_dados->>'calendario_nome',200),
      jsonb_build_object('dadosGerais', g || jsonb_build_object('nome', d->>'nome', 'programa', prog),
        'series', p_dados->'series', 'totalAlunos', total, 'cluster', cl,
        'consentimento_em', now(), 'aviso_privacidade_versao', '2026-10'));

  RETURN jsonb_build_object('ok', true, 'total', total, 'cluster', cl, 'nome', d->>'nome');
END $$;

GRANT EXECUTE ON FUNCTION public.get_escola_publica(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_escola_form(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enviar_alunado(text, text, jsonb) TO anon, authenticated;

-- 5) Direitos do titular (LGPD art. 18): exportar e anonimizar ----------
CREATE OR REPLACE FUNCTION public.lgpd_exportar_aluno(p_origem text, p_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r jsonb;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Somente administrador'; END IF;
  IF p_origem = 'techlab' THEN
    SELECT jsonb_build_object('aluno', to_jsonb(a), 'mensalidades', coalesce((SELECT jsonb_agg(to_jsonb(m)) FROM familias_mensalidades m WHERE m.aluno_id = a.id), '[]'::jsonb))
      INTO r FROM familias_alunos a WHERE a.id = p_id;
  ELSIF p_origem = 'cursomaker' THEN
    SELECT to_jsonb(a) INTO r FROM cm_alunos a WHERE a.id = p_id;
  ELSE RAISE EXCEPTION 'origem inválida'; END IF;
  INSERT INTO auditoria(usuario_email, acao, entidade, entidade_id) VALUES (auth.jwt()->>'email', 'lgpd_exportar', p_origem, p_id::text);
  RETURN r;
END $$;

CREATE OR REPLACE FUNCTION public.lgpd_anonimizar_aluno(p_origem text, p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Somente administrador'; END IF;
  IF p_origem = 'techlab' THEN
    UPDATE familias_alunos SET aluno = 'ANONIMIZADO', responsavel = NULL, telefone = NULL, email = NULL,
      observacoes = NULL, motivo_desistencia = NULL WHERE id = p_id;
  ELSIF p_origem = 'cursomaker' THEN
    UPDATE cm_alunos SET nome = 'ANONIMIZADO', nascimento = NULL, escola_estuda = NULL, responsavel = NULL, cpf = NULL,
      telefone = NULL, email = NULL, endereco = NULL, observacoes = NULL WHERE id = p_id;
  ELSE RAISE EXCEPTION 'origem inválida'; END IF;
  INSERT INTO auditoria(usuario_email, acao, entidade, entidade_id) VALUES (auth.jwt()->>'email', 'lgpd_anonimizar', p_origem, p_id::text);
END $$;
REVOKE ALL ON FUNCTION public.lgpd_exportar_aluno(text, uuid), public.lgpd_anonimizar_aluno(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lgpd_exportar_aluno(text, uuid), public.lgpd_anonimizar_aluno(text, uuid) TO authenticated;

-- 6) Fim das senhas próprias na tabela usuarios (login só pelo Supabase Auth)
ALTER TABLE public.usuarios ALTER COLUMN senha DROP NOT NULL;

-- 7) Cadastro de professor pelo Curso Maker (sem precisar de acesso direto à tabela usuarios)
CREATE OR REPLACE FUNCTION public.criar_usuario_professor(p_email text, p_nome text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_perm('cursoMaker') THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  INSERT INTO usuarios(email, nome, ativo, permissoes)
  VALUES (lower(trim(p_email)), trim(p_nome), true,
    '{"historico":false,"escolas":false,"inspiramaker":false,"projecao":false,"baseEscolas":false,"familias":false,"cursoMaker":false,"cmProfessor":true,"admin":false,"popsAreas":[],"chamadaEscolas":[]}'::jsonb);
END $$;
REVOKE ALL ON FUNCTION public.criar_usuario_professor(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.criar_usuario_professor(text, text) TO authenticated;
