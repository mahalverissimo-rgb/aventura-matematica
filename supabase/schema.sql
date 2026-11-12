-- Aventura Matemágica · banco de dados (Supabase / Postgres)
-- Conta = responsável (adulto). Cada conta tem até 6 perfis de criança.
-- Da criança guardamos só o nome (apelido) e o progresso do jogo.

create table if not exists public.child_profiles (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 14),
  progress    jsonb not null default '{}'::jsonb check (pg_column_size(progress) < 32000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists child_profiles_owner_idx on public.child_profiles (owner_id);

-- Segurança: cada responsável só enxerga e altera os próprios perfis.
alter table public.child_profiles enable row level security;

drop policy if exists "ver os próprios perfis" on public.child_profiles;
create policy "ver os próprios perfis" on public.child_profiles
  for select to authenticated using (owner_id = (select auth.uid()));

drop policy if exists "criar perfis na própria conta" on public.child_profiles;
create policy "criar perfis na própria conta" on public.child_profiles
  for insert to authenticated with check (owner_id = (select auth.uid()));

drop policy if exists "alterar os próprios perfis" on public.child_profiles;
create policy "alterar os próprios perfis" on public.child_profiles
  for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

drop policy if exists "apagar os próprios perfis" on public.child_profiles;
create policy "apagar os próprios perfis" on public.child_profiles
  for delete to authenticated using (owner_id = (select auth.uid()));

revoke all on public.child_profiles from anon;
grant select, insert, update, delete on public.child_profiles to authenticated;

-- Mantém updated_at sempre correto.
create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists child_profiles_touch on public.child_profiles;
create trigger child_profiles_touch before update on public.child_profiles
  for each row execute function public.touch_updated_at();

-- No máximo 6 perfis por conta.
create or replace function public.enforce_profile_limit() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (select count(*) from public.child_profiles where owner_id = new.owner_id) >= 6 then
    raise exception 'Limite de 6 perfis por conta' using errcode = 'P0001';
  end if;
  return new;
end $$;

drop trigger if exists child_profiles_limit on public.child_profiles;
create trigger child_profiles_limit before insert on public.child_profiles
  for each row execute function public.enforce_profile_limit();

-- O responsável pode apagar a própria conta e todos os dados (LGPD / ECA Digital).
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'Não autenticado';
  end if;
  delete from auth.users where id = auth.uid();
end $$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
