-- Execute no Supabase SQL Editor
-- Biblioteca de POPs (PDF e Word) por área

CREATE TABLE IF NOT EXISTS pops_documentos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo        text NOT NULL,
  area          text NOT NULL,
  descricao     text,
  nome_arquivo  text NOT NULL,
  arquivo_path  text NOT NULL,
  extensao      text,
  tamanho       bigint,
  enviado_por   text,
  criado_em     timestamptz DEFAULT now()
);

ALTER TABLE pops_documentos DISABLE ROW LEVEL SECURITY;

INSERT INTO storage.buckets (id, name, public)
VALUES ('pops', 'pops', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Upload pops"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'pops');

CREATE POLICY "Leitura pops"
ON storage.objects FOR SELECT
USING (bucket_id = 'pops');

CREATE POLICY "Exclusao pops"
ON storage.objects FOR DELETE
USING (bucket_id = 'pops');
