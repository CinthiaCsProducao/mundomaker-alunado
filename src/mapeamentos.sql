-- Aba Mapeamentos: mudanças planejadas para anos seguintes (ex.: nova ordem do Infantil em 2028)
create table if not exists public.mapeamentos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text,
  programa text not null default 'MakerLab Oficina',
  ano_vigencia integer not null,
  verificado_ano integer,          -- ano em que foi conferido pela última vez
  criado_por text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

alter table public.mapeamentos enable row level security;
drop policy if exists mapeamentos_all on public.mapeamentos;
create policy mapeamentos_all on public.mapeamentos for all to authenticated
  using (public.has_perm('mapeamentos')) with check (public.has_perm('mapeamentos'));

-- Registros iniciais (pode editar ou apagar na aba)
insert into public.mapeamentos (titulo, descricao, programa, ano_vigencia, criado_por) values
('Ordem de envio da Educação Infantil (G5)',
 E'Nova ordem a partir de 2028:\n1. Intro Nosso Primeiro Ateliê\n2. Casinha de Ferramentas\n3. O Canto do Passarinho\n4. Casarão Abandonado',
 'MakerLab Oficina', 2028, 'Cinthia'),
('Casinha de Ferramentas: enviar na Linha 2',
 E'Por serem ferramentas do maker, não faz sentido encerrar o ano com esse projeto, e sim iniciá-lo. Enviar na Linha 2 (alinhado com Pamella Matos, 20/10/2026). Em 2028 adequar para a Linha 1.',
 'MakerLab Oficina', 2027, 'Cinthia');

-- Registro de quem concluiu a verificação (dia e horário)
alter table public.mapeamentos add column if not exists verificado_por text;
alter table public.mapeamentos add column if not exists verificado_em timestamptz;

create table if not exists public.mapeamentos_historico (
  id bigserial primary key,
  mapeamento_id uuid not null references public.mapeamentos(id) on delete cascade,
  acao text not null,                 -- 'verificado' | 'reaberto'
  usuario_email text not null,
  usuario_nome text,
  criado_em timestamptz not null default now()
);
alter table public.mapeamentos_historico enable row level security;
drop policy if exists maph_sel on public.mapeamentos_historico;
drop policy if exists maph_ins on public.mapeamentos_historico;
create policy maph_sel on public.mapeamentos_historico for select to authenticated using (public.has_perm('mapeamentos'));
create policy maph_ins on public.mapeamentos_historico for insert to authenticated
  with check (public.has_perm('mapeamentos') and lower(usuario_email) = lower(auth.jwt()->>'email'));
