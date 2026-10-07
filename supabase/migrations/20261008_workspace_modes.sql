-- Paddl v4: owner-scoped, atomic, revision-checked backups.
-- This is backup/restore, NOT automatic multi-register transaction sync.
begin;
create table if not exists public.paddl_backups (
  owner_id uuid not null references auth.users(id) on delete cascade,
  workspace text not null check (workspace in ('SARI_SARI','MOTOR_SHOP','PHARMACY','MILK_TEA','PRODUCTION_SARI_SARI','PRODUCTION_MOTOR_SHOP','PRODUCTION_PHARMACY','PRODUCTION_MILK_TEA')),
  revision bigint not null default 1 check (revision > 0),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  updated_at timestamptz not null default now(),
  primary key (owner_id, workspace)
);
alter table public.paddl_backups drop constraint if exists paddl_backups_workspace_check;
alter table public.paddl_backups add constraint paddl_backups_workspace_check check (workspace in ('SARI_SARI','MOTOR_SHOP','PHARMACY','MILK_TEA','PRODUCTION_SARI_SARI','PRODUCTION_MOTOR_SHOP','PRODUCTION_PHARMACY','PRODUCTION_MILK_TEA'));
alter table public.paddl_backups enable row level security;
revoke all on public.paddl_backups from anon, authenticated;
grant select on public.paddl_backups to authenticated;
drop policy if exists "Owners read their backups" on public.paddl_backups;
create policy "Owners read their backups" on public.paddl_backups for select to authenticated using (owner_id = (select auth.uid()));

create or replace function public.save_paddl_backup(p_workspace text, p_expected_revision bigint, p_payload jsonb)
returns bigint language plpgsql security definer set search_path = '' as $$
declare v_owner uuid := auth.uid(); v_revision bigint;
begin
  if v_owner is null then raise exception 'Authentication required'; end if;
  if p_workspace not in ('SARI_SARI','MOTOR_SHOP','PHARMACY','MILK_TEA','PRODUCTION_SARI_SARI','PRODUCTION_MOTOR_SHOP','PRODUCTION_PHARMACY','PRODUCTION_MILK_TEA') then raise exception 'Unknown workspace'; end if;
  if p_expected_revision is null or p_expected_revision < 0 then raise exception 'Invalid revision'; end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object'
     or (case when p_payload->>'appMode' = 'PRODUCTION' then 'PRODUCTION_' else '' end) || (p_payload->>'currentShopPreset') is distinct from p_workspace
     or coalesce(p_payload->>'appMode', 'DEMO') not in ('DEMO','PRODUCTION')
     or jsonb_typeof(p_payload->'products') is distinct from 'array'
     or jsonb_typeof(p_payload->'transactions') is distinct from 'array'
     or jsonb_typeof(p_payload->'customers') is distinct from 'array'
     or jsonb_typeof(p_payload->'settings') is distinct from 'object'
     or pg_column_size(p_payload) > 10000000 then
    raise exception 'Invalid or oversized backup';
  end if;
  -- Serializes even first-time inserts for the same owner/workspace.
  perform pg_advisory_xact_lock(hashtextextended(v_owner::text || ':' || p_workspace, 0));
  select revision into v_revision from public.paddl_backups where owner_id = v_owner and workspace = p_workspace for update;
  if coalesce(v_revision, 0) <> p_expected_revision then
    raise exception 'Backup conflict: another device saved a newer version. Export this device, then restore the cloud backup before continuing.';
  end if;
  v_revision := coalesce(v_revision, 0) + 1;
  insert into public.paddl_backups(owner_id, workspace, revision, payload)
    values (v_owner, p_workspace, v_revision, p_payload)
    on conflict (owner_id, workspace) do update set revision = excluded.revision, payload = excluded.payload, updated_at = now();
  return v_revision;
end;
$$;
revoke all on function public.save_paddl_backup(text, bigint, jsonb) from public, anon;
grant execute on function public.save_paddl_backup(text, bigint, jsonb) to authenticated;

-- Retire legacy world-writable demo endpoints without deleting existing records.
do $$
declare table_name text;
begin
  foreach table_name in array array['products','customers','debt_entries','transactions','expenses','cash_drawers','store_settings','staff_users'] loop
    if to_regclass('public.' || table_name) is not null then
      execute format('revoke all on table public.%I from anon, authenticated', table_name);
    end if;
  end loop;
end $$;
commit;
