-- Romaneio público (QR code): só os romaneios que você publicar ficam acessíveis, por um código aleatório.

alter table public.romaneios_historico add column if not exists token_publico uuid unique;
alter table public.romaneios_historico add column if not exists publicado_em timestamptz;
alter table public.romaneios_historico add column if not exists publicado_por text;

-- Dados mínimos do romaneio publicado (quem tem o código)
create or replace function public.romaneio_publico(p_token uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('escola', escola, 'remessa', remessa, 'pdf_path', pdf_path)
  from romaneios_historico where token_publico = p_token and p_token is not null;
$$;
grant execute on function public.romaneio_publico(uuid) to anon, authenticated;

-- Permite gerar o link temporário do PDF só para arquivos publicados
create or replace function public.romaneio_publicado(p_nome text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from romaneios_historico where pdf_path = p_nome and token_publico is not null);
$$;
grant execute on function public.romaneio_publicado(text) to anon, authenticated;

drop policy if exists st_rom_pub_sel on storage.objects;
create policy st_rom_pub_sel on storage.objects for select to anon
  using (bucket_id = 'romaneios' and public.romaneio_publicado(name));
