-- Execute no Supabase SQL Editor
-- Histórico de romaneios fechados (PDF + Excel guardados no Storage)

CREATE TABLE IF NOT EXISTS romaneios_historico (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escola        text NOT NULL,
  linha         text,
  remessa       text,
  data_romaneio text,
  total_volumes integer,
  peso_total    numeric,
  pdf_path      text,
  xlsx_path     text,
  manifest      jsonb,
  criado_por    text,
  criado_em     timestamptz DEFAULT now()
);

ALTER TABLE romaneios_historico DISABLE ROW LEVEL SECURITY;

INSERT INTO storage.buckets (id, name, public)
VALUES ('romaneios', 'romaneios', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Upload romaneios"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'romaneios');

CREATE POLICY "Leitura publica romaneios"
ON storage.objects FOR SELECT
USING (bucket_id = 'romaneios');

CREATE POLICY "Exclusao romaneios"
ON storage.objects FOR DELETE
USING (bucket_id = 'romaneios');
