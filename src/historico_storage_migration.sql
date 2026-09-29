-- Execute no Supabase SQL Editor
-- Cria o bucket de armazenamento para o Histórico de Escolas

INSERT INTO storage.buckets (id, name, public)
VALUES ('historico-escola', 'historico-escola', true)
ON CONFLICT (id) DO NOTHING;

-- Política: qualquer pessoa autenticada pode fazer upload
CREATE POLICY "Upload historico escola"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'historico-escola');

-- Política: arquivos são públicos para leitura (download)
CREATE POLICY "Leitura publica historico escola"
ON storage.objects FOR SELECT
USING (bucket_id = 'historico-escola');
