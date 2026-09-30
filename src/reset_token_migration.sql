-- Execute no Supabase SQL Editor
-- Adiciona colunas para o fluxo de redefinição de senha

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS reset_token TEXT;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS reset_expires TIMESTAMPTZ;
