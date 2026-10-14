-- Execute no Supabase SQL Editor (apenas a estrutura; sem dados de famílias)
-- Aba Famílias: escolas TechLab, alunos/responsáveis e lista de chamada

CREATE TABLE IF NOT EXISTS familias_escolas (
  id     text PRIMARY KEY,
  nome   text NOT NULL,
  dados  jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS familias_alunos (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escola_id          text NOT NULL REFERENCES familias_escolas(id) ON DELETE CASCADE,
  aluno              text NOT NULL,
  responsavel        text,
  telefone           text,
  email              text,
  turma              text,
  plano              text,
  mensalidade        numeric,
  desconto           numeric,
  valor_pago         numeric,
  em_aberto          numeric,
  status_pgto        text,
  tipo               text,
  observacoes        text,
  previsao_2s        text,
  status             text NOT NULL DEFAULT 'Ativo',
  motivo_desistencia text,
  criado_em          timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS familias_chamada (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id  uuid NOT NULL REFERENCES familias_alunos(id) ON DELETE CASCADE,
  ano       integer NOT NULL,
  mes       integer NOT NULL,
  s1        text,
  s2        text,
  s3        text,
  s4        text,
  s5        text,
  obs       text,
  UNIQUE (aluno_id, ano, mes)
);

ALTER TABLE familias_escolas  DISABLE ROW LEVEL SECURITY;
ALTER TABLE familias_alunos   DISABLE ROW LEVEL SECURITY;
ALTER TABLE familias_chamada  DISABLE ROW LEVEL SECURITY;
